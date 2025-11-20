#!/bin/bash

##############################################################################
# AIWM Worker - Automated Deployment Script
#
# Usage:
#   ./deploy.sh <worker-host> <ssh-user> [node-id] [node-token]
#
# Examples:
#   ./deploy.sh 192.168.1.100 ubuntu
#   ./deploy.sh gpu-worker-01 root gpu-node-01 eyJhbGc...
##############################################################################

set -e  # Exit on error

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load configuration
source "${SCRIPT_DIR}/deploy-config.sh"

# Parse arguments
WORKER_HOST="$1"
SSH_USER="$2"
NODE_ID="${3:-}"
NODE_TOKEN="${4:-}"

if [ -z "$WORKER_HOST" ] || [ -z "$SSH_USER" ]; then
    log_error "Usage: $0 <worker-host> <ssh-user> [node-id] [node-token]"
    exit 1
fi

log_info "=========================================="
log_info "AIWM Worker Deployment Script"
log_info "=========================================="
log_info "Target Host: ${WORKER_HOST}"
log_info "SSH User: ${SSH_USER}"
log_info "Deploy Directory: ${DEPLOY_DIR}"
log_info "=========================================="

##############################################################################
# Step 1: Build Worker
##############################################################################
log_step "Step 1: Building aiwm-worker..."

cd "${SCRIPT_DIR}/../.." || exit 1  # Go to monorepo root

if ! npx nx build aiwm-worker; then
    log_error "Build failed!"
    exit 1
fi

log_info "Build successful!"

BUILD_DIR="${SCRIPT_DIR}/../../dist/services/aiwm-worker"

if [ ! -f "${BUILD_DIR}/main.js" ]; then
    log_error "Build output not found: ${BUILD_DIR}/main.js"
    exit 1
fi

##############################################################################
# Step 2: Prepare deployment package
##############################################################################
log_step "Step 2: Preparing deployment package..."

TEMP_DIR=$(mktemp -d)
mkdir -p "${TEMP_DIR}/aiwm-worker"

# Copy build output
cp "${BUILD_DIR}/main.js" "${TEMP_DIR}/aiwm-worker/"
log_info "Copied main.js"

# Copy .env template if exists
if [ -f "${SCRIPT_DIR}/.env" ]; then
    cp "${SCRIPT_DIR}/.env" "${TEMP_DIR}/aiwm-worker/.env.template"
    log_info "Copied .env template"
fi

# Copy systemd service file
cp "${SCRIPT_DIR}/aiwm-worker.service" "${TEMP_DIR}/aiwm-worker/"
log_info "Copied systemd service file"

# Copy install script
cp "${SCRIPT_DIR}/install.sh" "${TEMP_DIR}/aiwm-worker/"
chmod +x "${TEMP_DIR}/aiwm-worker/install.sh"
log_info "Copied install script"

# Create package
cd "${TEMP_DIR}"
tar czf aiwm-worker-package.tar.gz aiwm-worker/
log_info "Created deployment package"

##############################################################################
# Step 3: Upload to worker node
##############################################################################
log_step "Step 3: Uploading package to ${WORKER_HOST}..."

# Test SSH connection
if ! ssh -o ConnectTimeout=5 "${SSH_USER}@${WORKER_HOST}" "echo 'Connection OK'" &>/dev/null; then
    log_error "Cannot connect to ${WORKER_HOST}"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

log_info "SSH connection verified"

# Upload package
if ! scp "${TEMP_DIR}/aiwm-worker-package.tar.gz" "${SSH_USER}@${WORKER_HOST}:/tmp/"; then
    log_error "Failed to upload package"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

log_info "Package uploaded successfully"

# Cleanup temp
rm -rf "${TEMP_DIR}"

##############################################################################
# Step 4: Install on worker node
##############################################################################
log_step "Step 4: Installing on worker node..."

ssh "${SSH_USER}@${WORKER_HOST}" bash << 'REMOTE_SCRIPT'
set -e

source /tmp/aiwm-worker/deploy-config.sh || true

# Colors
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

log_remote() {
    echo -e "${GREEN}[REMOTE]${RESET} $1"
}

log_remote "Extracting package..."
cd /tmp
tar xzf aiwm-worker-package.tar.gz

log_remote "Running install script..."
cd aiwm-worker
chmod +x install.sh
sudo ./install.sh

log_remote "Cleaning up..."
cd /tmp
rm -rf aiwm-worker aiwm-worker-package.tar.gz

log_remote "Installation complete!"
REMOTE_SCRIPT

##############################################################################
# Step 5: Configure .env (if credentials provided)
##############################################################################
if [ -n "$NODE_ID" ] && [ -n "$NODE_TOKEN" ]; then
    log_step "Step 5: Configuring credentials..."

    ssh "${SSH_USER}@${WORKER_HOST}" sudo bash << EOF
cat > ${DEPLOY_DIR}/.env << 'ENVEOF'
# Worker Configuration
NODE_ENV=production
LOG_LEVEL=${LOG_LEVEL}

# Controller Connection
CONTROLLER_URL=http://${CONTROLLER_HOST}:${CONTROLLER_PORT}
CONTROLLER_WS_URL=${CONTROLLER_WS_URL}
NODE_TOKEN=${NODE_TOKEN}

# Node Information
NODE_ID=${NODE_ID}
NODE_NAME=${WORKER_HOST}

# Intervals
HEARTBEAT_INTERVAL=${HEARTBEAT_INTERVAL}
METRICS_INTERVAL=${METRICS_INTERVAL}

# Docker Configuration
DOCKER_SOCKET=${DOCKER_SOCKET}

# GPU Detection
NVIDIA_SMI_PATH=${NVIDIA_SMI_PATH}
ENVEOF

chmod 600 ${DEPLOY_DIR}/.env
chown ${SERVICE_USER}:${SERVICE_USER} ${DEPLOY_DIR}/.env
EOF

    log_info "Credentials configured"
else
    log_warn "NODE_ID or NODE_TOKEN not provided"
    log_warn "Please configure ${DEPLOY_DIR}/.env manually on worker node"
fi

##############################################################################
# Step 6: Start service
##############################################################################
log_step "Step 6: Starting service..."

ssh "${SSH_USER}@${WORKER_HOST}" sudo bash << 'EOF'
systemctl daemon-reload
systemctl enable aiwm-worker
systemctl restart aiwm-worker
sleep 2
systemctl status aiwm-worker --no-pager || true
EOF

##############################################################################
# Step 7: Verify deployment
##############################################################################
log_step "Step 7: Verifying deployment..."

sleep 3

# Check service status
SERVICE_STATUS=$(ssh "${SSH_USER}@${WORKER_HOST}" "sudo systemctl is-active aiwm-worker" || echo "inactive")

if [ "$SERVICE_STATUS" = "active" ]; then
    log_info "✅ Service is running"
else
    log_error "❌ Service is not running"
    log_error "Check logs: ssh ${SSH_USER}@${WORKER_HOST} 'sudo journalctl -u aiwm-worker -n 50'"
    exit 1
fi

# Check logs for connection
log_info "Checking connection logs..."
ssh "${SSH_USER}@${WORKER_HOST}" "sudo journalctl -u aiwm-worker --since '30 seconds ago' -n 20 --no-pager" | grep -E "(Connected|registered|ERROR|WARN)" || true

##############################################################################
# Deployment Complete
##############################################################################
log_info "=========================================="
log_info "✅ Deployment Completed Successfully!"
log_info "=========================================="
log_info ""
log_info "Next steps:"
log_info "1. Verify connection: ssh ${SSH_USER}@${WORKER_HOST} 'sudo systemctl status aiwm-worker'"
log_info "2. View logs: ssh ${SSH_USER}@${WORKER_HOST} 'sudo journalctl -u aiwm-worker -f'"
log_info "3. Check node status on controller: curl http://${CONTROLLER_HOST}:${CONTROLLER_PORT}/api/nodes/${NODE_ID}"
log_info ""

if [ -z "$NODE_ID" ] || [ -z "$NODE_TOKEN" ]; then
    log_warn "⚠️  Don't forget to configure NODE_ID and NODE_TOKEN in ${DEPLOY_DIR}/.env"
    log_warn "Then restart: ssh ${SSH_USER}@${WORKER_HOST} 'sudo systemctl restart aiwm-worker'"
fi

exit 0
