#!/bin/bash

##############################################################################
# AIWM Worker Deployment Configuration
# Chỉnh sửa các giá trị này trước khi deploy
##############################################################################

# Controller Configuration
export CONTROLLER_HOST="10.10.0.100"
export CONTROLLER_PORT="3003"
export CONTROLLER_WS_URL="ws://${CONTROLLER_HOST}:${CONTROLLER_PORT}/ws/node"

# Deployment Configuration
export DEPLOY_DIR="/opt/aiwm-worker"
export SERVICE_USER="aiwm-worker"
export NODE_VERSION="20"  # Node.js version to install

# Service Configuration
export HEARTBEAT_INTERVAL="30000"  # 30 seconds
export METRICS_INTERVAL="60000"    # 60 seconds
export LOG_LEVEL="info"            # debug, info, warn, error

# Optional: GPU Configuration
export NVIDIA_SMI_PATH="/usr/bin/nvidia-smi"

# Optional: Docker Configuration
export DOCKER_SOCKET="/var/run/docker.sock"

# Backup Configuration
export BACKUP_ENABLED="true"
export BACKUP_DIR="${DEPLOY_DIR}/backup"
export BACKUP_KEEP_DAYS="7"

# Colors for output
export COLOR_RESET="\033[0m"
export COLOR_GREEN="\033[0;32m"
export COLOR_YELLOW="\033[0;33m"
export COLOR_RED="\033[0;31m"
export COLOR_BLUE="\033[0;34m"

# Logging functions
log_info() {
    echo -e "${COLOR_GREEN}[INFO]${COLOR_RESET} $1"
}

log_warn() {
    echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET} $1"
}

log_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"
}

log_step() {
    echo -e "${COLOR_BLUE}[STEP]${COLOR_RESET} $1"
}
