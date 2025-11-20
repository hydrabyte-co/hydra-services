#!/bin/bash

##############################################################################
# AIWM Worker - Installation Script (runs on worker node)
# This script is executed remotely by deploy.sh
##############################################################################

set -e

# Configuration (will be loaded from deploy-config.sh or use defaults)
DEPLOY_DIR="${DEPLOY_DIR:-/opt/aiwm-worker}"
SERVICE_USER="${SERVICE_USER:-aiwm-worker}"
BACKUP_ENABLED="${BACKUP_ENABLED:-true}"
BACKUP_DIR="${BACKUP_DIR:-${DEPLOY_DIR}/backup}"
NODE_VERSION="${NODE_VERSION:-20}"

# Colors
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
RESET="\033[0m"

log_info() {
    echo -e "${GREEN}[INFO]${RESET} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${RESET} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${RESET} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${RESET} $1"
}

##############################################################################
# Check if running as root or with sudo
##############################################################################
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

log_info "Starting AIWM Worker installation..."

##############################################################################
# Step 1: Install Node.js if needed
##############################################################################
log_step "Checking Node.js installation..."

if ! command -v node &> /dev/null; then
    log_warn "Node.js not found, installing..."

    # Detect OS
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        OS=$(uname -s)
    fi

    case $OS in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
            apt-get install -y nodejs
            ;;
        centos|rhel|fedora)
            curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
            yum install -y nodejs
            ;;
        *)
            log_error "Unsupported OS: $OS"
            log_error "Please install Node.js ${NODE_VERSION}+ manually"
            exit 1
            ;;
    esac

    log_info "Node.js installed successfully"
else
    NODE_CURRENT=$(node -v)
    log_info "Node.js already installed: ${NODE_CURRENT}"
fi

##############################################################################
# Step 2: Create service user
##############################################################################
log_step "Creating service user..."

if ! id "${SERVICE_USER}" &>/dev/null; then
    useradd -r -s /bin/false -d "${DEPLOY_DIR}" "${SERVICE_USER}"
    log_info "User ${SERVICE_USER} created"
else
    log_info "User ${SERVICE_USER} already exists"
fi

##############################################################################
# Step 3: Create directory structure
##############################################################################
log_step "Creating directory structure..."

mkdir -p "${DEPLOY_DIR}"
mkdir -p "${DEPLOY_DIR}/logs"

if [ "$BACKUP_ENABLED" = "true" ]; then
    mkdir -p "${BACKUP_DIR}"
fi

log_info "Directories created"

##############################################################################
# Step 4: Backup existing installation
##############################################################################
if [ -f "${DEPLOY_DIR}/main.js" ] && [ "$BACKUP_ENABLED" = "true" ]; then
    log_step "Backing up existing installation..."

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"

    tar czf "${BACKUP_FILE}" -C "${DEPLOY_DIR}" main.js .env 2>/dev/null || true
    log_info "Backup created: ${BACKUP_FILE}"

    # Keep only last N days of backups
    find "${BACKUP_DIR}" -name "backup_*.tar.gz" -mtime +${BACKUP_KEEP_DAYS:-7} -delete 2>/dev/null || true
fi

##############################################################################
# Step 5: Copy application files
##############################################################################
log_step "Installing application files..."

# Copy main.js
cp main.js "${DEPLOY_DIR}/"
chmod 755 "${DEPLOY_DIR}/main.js"
log_info "Copied main.js"

# Copy .env template if not exists
if [ ! -f "${DEPLOY_DIR}/.env" ] && [ -f ".env.template" ]; then
    cp .env.template "${DEPLOY_DIR}/.env"
    log_warn ".env template created at ${DEPLOY_DIR}/.env"
    log_warn "Please configure NODE_ID and NODE_TOKEN before starting"
fi

##############################################################################
# Step 6: Set ownership and permissions
##############################################################################
log_step "Setting ownership and permissions..."

chown -R "${SERVICE_USER}:${SERVICE_USER}" "${DEPLOY_DIR}"
chmod 750 "${DEPLOY_DIR}"
chmod 600 "${DEPLOY_DIR}/.env" 2>/dev/null || true
chmod 755 "${DEPLOY_DIR}/main.js"

log_info "Permissions set"

##############################################################################
# Step 7: Install systemd service
##############################################################################
log_step "Installing systemd service..."

cp aiwm-worker.service /etc/systemd/system/

# Replace placeholders in service file
sed -i "s|{{DEPLOY_DIR}}|${DEPLOY_DIR}|g" /etc/systemd/system/aiwm-worker.service
sed -i "s|{{SERVICE_USER}}|${SERVICE_USER}|g" /etc/systemd/system/aiwm-worker.service

systemctl daemon-reload
log_info "Systemd service installed"

##############################################################################
# Step 8: Add user to docker group (if Docker exists)
##############################################################################
if command -v docker &> /dev/null; then
    log_step "Adding user to docker group..."

    if getent group docker > /dev/null 2>&1; then
        usermod -aG docker "${SERVICE_USER}" || log_warn "Could not add user to docker group"
        log_info "User added to docker group"
    fi
fi

##############################################################################
# Step 9: Optional - Check GPU
##############################################################################
if command -v nvidia-smi &> /dev/null; then
    log_info "NVIDIA GPU detected:"
    nvidia-smi --query-gpu=index,name,memory.total --format=csv,noheader | head -n 5
else
    log_warn "nvidia-smi not found. GPU detection will be skipped."
fi

##############################################################################
# Installation Complete
##############################################################################
log_info "=========================================="
log_info "✅ Installation completed successfully!"
log_info "=========================================="
log_info ""
log_info "Application installed to: ${DEPLOY_DIR}"
log_info "Service user: ${SERVICE_USER}"
log_info "Systemd service: aiwm-worker.service"
log_info ""
log_info "Next steps:"
log_info "1. Configure ${DEPLOY_DIR}/.env with NODE_ID and NODE_TOKEN"
log_info "2. Start service: sudo systemctl start aiwm-worker"
log_info "3. Enable auto-start: sudo systemctl enable aiwm-worker"
log_info "4. Check status: sudo systemctl status aiwm-worker"
log_info "5. View logs: sudo journalctl -u aiwm-worker -f"
log_info ""

exit 0
