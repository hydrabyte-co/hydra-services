# Agent Framework Deployment Plan

## Tổng quan

Document này mô tả chi tiết kiến trúc và kế hoạch triển khai **Agent Framework** - hệ thống cho phép triển khai và quản lý AI agents với 2 deployment modes: **Autonomous** và **Managed**.

**Tình trạng:** 🟡 Planning (chưa implement)

---

## Kiến trúc tổng quan

### Agent Types

#### 1. Autonomous Agent
- **Định nghĩa:** Agent được người dùng tự cài đặt và vận hành trên infrastructure của họ
- **Use case:** User muốn control hoàn toàn môi trường, bảo mật dữ liệu, custom setup
- **Deployment:** User tự download và chạy agent binary trên Ubuntu server
- **Connection:** Agent tự kết nối về AIWM controller để lấy config và nhận instructions

#### 2. Managed Agent
- **Định nghĩa:** Agent được AIWM tự động triển khai và quản lý trên Node cluster
- **Use case:** User muốn deployment tự động, không cần lo infrastructure
- **Deployment:** AIWM tự động deploy agent lên available Node trong cluster
- **Connection:** Tự động setup, không cần user intervention

### Agent Implementations

Có 2 phiên bản agent implementation:

#### 1. Claude Code Agent (`xora-cc-agent`)
- **Base:** `@anthropic-ai/claude-code` SDK
- **Repo:** `/Users/dzung/Code/xor/xora/xora-cc-agent`
- **Features:**
  - Full coding capabilities
  - Built-in tools: Bash, Read, Write, Edit, Glob, Grep, WebSearch, TodoWrite, Task, AskUserQuestion
  - MCP (Model Context Protocol) support
  - Multi-platform: Discord, Telegram integration
  - Session persistence (conversation memory)
  - Hot reload configuration from AIWM
  - Context management (auto-truncate at 150k tokens)

**Tech Stack:**
```json
{
  "@anthropic-ai/claude-code": "^1.0.120",
  "discord.js": "^14.14.1",
  "node-telegram-bot-api": "^0.66.0",
  "dotenv": "^16.3.1"
}
```

**Config Structure (.env):**
```bash
# Agent Identity
AGENT_NAME=multi-platform-agent

# AIWM Integration
AIWM_ENABLED=false
AIWM_BASE_URL=https://api.x-or.cloud/dev/aiwm
AIWM_AGENT_ID=
AIWM_AGENT_SECRET=

# Claude SDK
# Note: ANTHROPIC_API_KEY có thể được override bởi deployment config từ AIWM
ANTHROPIC_API_KEY=xxx
CLAUDE_MODEL=claude-3-5-haiku-latest
CLAUDE_MAX_TURNS=100
CLAUDE_PERMISSION_MODE=bypassPermissions
CLAUDE_RESUME=true

# Discord (optional)
# Note: Có thể được override bởi agent.settings từ AIWM
DISCORD_TOKEN=xxx
DISCORD_CHANNEL_ID=xxx
DISCORD_BOT_ID=xxx

# Telegram (optional)
# Note: Có thể được override bởi agent.settings từ AIWM
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_GROUP_ID=xxx
TELEGRAM_BOT_USERNAME=xxx

# Tools
ALLOWED_TOOLS=Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,TodoWrite,Task,AskUserQuestion

# MCP Servers (optional)
MCP_CONFIG_FILE=./mcp-servers.json
```

#### 2. Vercel AI SDK Agent
- **Base:** Vercel AI SDK
- **Location:** Portal demo tại `AgentPlaygroundPage`
- **Features:**
  - Modern streaming chat interface
  - Tool calling support
  - Multi-model support (OpenAI, Anthropic, etc.)
  - Simpler, more lightweight than Claude Code agent

**Note:** Vercel AI SDK agent chưa được document chi tiết - cần rà soát thêm.

---

## Database Schema Changes

### 1. Agent Schema Updates

**Current schema:** `services/aiwm/src/modules/agent/agent.schema.ts`

✅ **Đã có đầy đủ fields cần thiết:**
- `type`: 'managed' | 'autonomous'
- `secret`: hashed secret (select: false)
- `settings`: flat structure với prefixes (discord_, telegram_, claude_, auth_)
- `lastConnectedAt`: tracking connection
- `lastHeartbeatAt`: tracking heartbeat
- `connectionCount`: số lần connect
- `allowedToolIds`: whitelist tools
- `deploymentId`: for managed agents
- `nodeId`: for autonomous agents on specific node

**Không cần thay đổi schema - đã đầy đủ!**

### 2. Connection Module (MỚI - cần tạo)

**⚠️ DEPRECATED:** Ban đầu plan có Connection Module riêng, nhưng sau khi review Agent schema, nhận thấy `settings` field đã cover đủ nhu cầu với flat structure + prefixes.

**Decision:** KHÔNG TẠO Connection Module riêng. Sử dụng `agent.settings` với naming convention:
- `discord_token`: Discord bot token
- `discord_channelIds`: array of Discord channel IDs
- `discord_botId`: Discord bot user ID
- `telegram_token`: Telegram bot token
- `telegram_groupIds`: array of Telegram group IDs
- `telegram_botUsername`: Telegram bot username

**Lý do:**
- Đơn giản hóa architecture
- Tránh complexity của 1-to-many relationship
- Agent settings đã có sẵn trong 1 document
- Dễ query và update hơn

---

## Configuration Updates

### ConfigKey Enum

**File:** `services/aiwm/src/modules/configuration/enums/config-key.enum.ts`

**Cần thêm:**
```typescript
export enum ConfigKey {
  // ... existing keys ...

  // Agent Download & Deployment
  AGENT_DOWNLOAD_BASE_URL = 'agent.download.baseUrl',
  // Example: 'https://cdn.x-or.cloud/agents'
  // Agents will download from: {baseUrl}/xora-cc-agent-latest.tar.gz
}
```

**Giải thích:**
- `AGENT_DOWNLOAD_BASE_URL`: CDN URL để download agent binary (public)
- Version management: tạm thời chỉ có `latest`, sau này sẽ có `v1.0.0`, `v1.1.0`...

---

## API Endpoints

### Agent Lifecycle APIs

#### 1. Generate Credentials & Installation Script

**Endpoint:** `POST /agents/:id/regenerate-credentials`

**Description:** Generate new secret và installation script cho autonomous agent

**Authorization:** User JWT (organization.owner or organization.editor)

**Response:**
```typescript
{
  agentId: string;
  secret: string; // Plain text - show only once!
  envConfig: string; // Pre-formatted .env snippet
  installScript: string; // Full bash installation script
}
```

**envConfig example:**
```bash
AIWM_BASE_URL=https://api.x-or.cloud/dev/aiwm
AIWM_AGENT_ID=6940db70d67065262c2e17ed
AIWM_AGENT_SECRET=624577f0190d1d1dd016f4d799769dd82faad2de180319b41df99550fb373c83
```

**installScript example:** See "Installation Script Template" section below

**Implementation:**
- Generate random 64-char hex secret
- Hash secret (bcrypt) và save vào `agent.secret`
- Đọc `AGENT_DOWNLOAD_BASE_URL` từ Configuration
- Build installation script từ template
- Return credentials (secret chỉ hiện 1 lần)

#### 2. Agent Connect

**Endpoint:** `POST /agents/:id/connect`

**Description:** Agent authentication và retrieve full config

**Authorization:** Agent secret (in body)

**Request:**
```typescript
{
  secret: string; // Plain text secret
}
```

**Response:**
```typescript
{
  // JWT Token (same structure as IAM)
  accessToken: string;
  expiresIn: number; // 86400 (24h)
  refreshToken: null;
  refreshExpiresIn: 0;
  tokenType: 'bearer';

  // MCP Servers (HTTP transport format for Claude Code SDK)
  mcpServers: {
    'cbm-tools': {
      type: 'http',
      url: 'http://localhost:3305/mcp',
      headers: { Authorization: 'Bearer ...' }
    }
  };

  // Instruction
  instruction: {
    id: string;
    systemPrompt: string;
    guidelines: string[];
  };

  // Agent settings (discord, telegram, claude configs)
  settings: Record<string, unknown>;

  // Deployment (cho managed agents only)
  deployment?: {
    id: string;
    provider: 'anthropic' | 'openai' | 'local';
    model: string; // 'claude-3-5-sonnet-20241022'
    baseAPIEndpoint: string; // Proxy endpoint
    apiEndpoint: string; // Provider endpoint
  };
}
```

**JWT Payload:**
```typescript
{
  sub: agentId, // Agent MongoDB _id
  username: `agent:${agentId}`,
  status: agent.status, // 'active', 'inactive', 'busy', 'suspended'
  roles: [agent.role], // Single role from agent.role field (e.g., 'organization.viewer')
  orgId: agent.orgId,
  groupId: agent.groupId || '',
  agentId: agentId,
  userId: '', // Empty for agent tokens
  type: 'agent',
  iat: timestamp,
  exp: timestamp + 86400 // 24h
}
```

**Implementation:**
- Verify secret (bcrypt compare với `agent.secret`)
- Generate JWT token với agent context
- Load instruction từ `agent.instructionId`
- Load deployment từ `agent.deploymentId` (if managed)
- Build MCP servers config
- Update `agent.lastConnectedAt` và increment `agent.connectionCount`
- Return full config

#### 3. Agent Heartbeat

**Endpoint:** `POST /agents/:id/heartbeat`

**Description:** Agent gửi heartbeat để báo status

**Authorization:** Agent JWT (Bearer token)

**Request:**
```typescript
{
  status: 'online' | 'busy' | 'idle';
  metrics?: {
    conversationCount?: number;
    messageCount?: number;
    uptime?: number; // seconds
    memoryUsage?: number; // MB
  };
}
```

**Response:**
```typescript
{
  acknowledged: true;
  nextHeartbeat: number; // seconds (default: 60)
}
```

**Implementation:**
- Verify agent JWT
- Update `agent.lastHeartbeatAt`
- Update `agent.status` nếu cần
- Store metrics vào `agent.metadata` (optional)

#### 4. Agent Disconnect

**Endpoint:** `POST /agents/:id/disconnect`

**Description:** Graceful shutdown - agent báo trước khi tắt

**Authorization:** Agent JWT (Bearer token)

**Request:**
```typescript
{
  reason?: string; // 'shutdown' | 'restart' | 'error'
}
```

**Response:**
```typescript
{
  acknowledged: true;
}
```

**Implementation:**
- Verify agent JWT
- Update `agent.status` = 'inactive'
- Log disconnect reason

#### 5. Get Agent Config (Reload)

**Endpoint:** `GET /agents/:id/config`

**Description:** Agent lấy config mới nhất (hot reload without restart)

**Authorization:** Agent JWT (Bearer token)

**Response:** Same as connect response (without new JWT)

**Implementation:**
- Verify agent JWT
- Return latest instruction, settings, deployment info
- Agent sẽ reload config mà không cần restart

---

## Installation Script Template

### Overview

Installation script được generate tự động khi admin gọi `POST /agents/:id/regenerate-credentials`.

Script sẽ:
1. Install NVM + Node.js 24
2. Download agent binary từ CDN
3. Extract và setup
4. Create systemd service hoặc PM2 process
5. Start agent automatically

### Script Template

```bash
#!/bin/bash
# ============================================
# Agent Installation Script
# ============================================
# Auto-generated for Agent: {agentName}
# Generated at: {timestamp}
# AIWM Controller: {aiwmBaseUrl}
# ============================================

set -e  # Exit on any error

# ===== CONFIGURATION =====
AGENT_ID="{agentId}"
AGENT_SECRET="{secret}"
CONTROLLER_URL="{aiwmBaseUrl}"
DOWNLOAD_URL="{downloadBaseUrl}/xora-cc-agent-latest.tar.gz"
INSTALL_DIR="/opt/xora-agent"
SERVICE_NAME="xora-agent"
PROCESS_MANAGER="${PROCESS_MANAGER:-systemd}"  # systemd or pm2

# ===== COLOR OUTPUT =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ===== SYSTEM CHECKS =====
print_info "Checking system requirements..."

# Check OS
if [[ ! -f /etc/lsb-release ]] && [[ ! -f /etc/debian_version ]]; then
    print_error "This script only supports Ubuntu/Debian systems"
    exit 1
fi

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_error "Please do NOT run this script as root"
    exit 1
fi

# ===== INSTALL NVM & NODE.JS =====
print_info "Installing NVM (Node Version Manager)..."

# Check if NVM already installed
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    print_warn "NVM already installed, skipping..."
else
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

    # Load NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Install Node.js 24
print_info "Installing Node.js 24..."
nvm install 24
nvm use 24

# Verify installation
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
print_info "Node.js version: $NODE_VERSION"
print_info "npm version: $NPM_VERSION"

# ===== CREATE INSTALL DIRECTORY =====
print_info "Creating installation directory: $INSTALL_DIR"
sudo mkdir -p $INSTALL_DIR
sudo chown $USER:$USER $INSTALL_DIR

# ===== DOWNLOAD AGENT BINARY =====
print_info "Downloading agent from: $DOWNLOAD_URL"
cd /tmp
wget -O xora-agent.tar.gz "$DOWNLOAD_URL"

print_info "Extracting agent files..."
tar -xzf xora-agent.tar.gz -C $INSTALL_DIR
rm xora-agent.tar.gz

# ===== CREATE .ENV FILE =====
print_info "Creating .env configuration..."

cat > $INSTALL_DIR/.env <<EOF
# ===== AIWM INTEGRATION =====
AIWM_ENABLED=true
AIWM_BASE_URL=$CONTROLLER_URL
AIWM_AGENT_ID=$AGENT_ID
AIWM_AGENT_SECRET=$AGENT_SECRET

# ===== LOGGING =====
LOG_LEVEL=info
LOG_FILE=./logs/agent.log

# ===== Other configurations will be loaded from AIWM =====
# Instruction, tools, Discord/Telegram settings are managed centrally
EOF

chmod 600 $INSTALL_DIR/.env

# ===== INSTALL DEPENDENCIES =====
print_info "Installing dependencies..."
cd $INSTALL_DIR
npm install --production

# ===== SETUP PROCESS MANAGER =====
if [[ "$PROCESS_MANAGER" == "pm2" ]]; then
    print_info "Setting up PM2 process manager..."

    # Install PM2 globally
    npm install -g pm2

    # Create PM2 ecosystem file
    cat > $INSTALL_DIR/ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: './dist/index.js',
    cwd: '$INSTALL_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

    # Start with PM2
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup | tail -n 1 | bash

    print_info "PM2 configured and started"

else
    print_info "Setting up systemd service..."

    # Create systemd service file
    sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null <<EOF
[Unit]
Description=Xora AI Agent
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) $INSTALL_DIR/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Load NVM environment
Environment="PATH=$HOME/.nvm/versions/node/v24.*/bin:/usr/local/bin:/usr/bin:/bin"
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd, enable and start service
    sudo systemctl daemon-reload
    sudo systemctl enable $SERVICE_NAME
    sudo systemctl start $SERVICE_NAME

    print_info "Systemd service configured and started"
fi

# ===== VERIFY INSTALLATION =====
sleep 5
print_info "Verifying installation..."

if [[ "$PROCESS_MANAGER" == "pm2" ]]; then
    pm2 status $SERVICE_NAME
else
    sudo systemctl status $SERVICE_NAME --no-pager
fi

# ===== INSTALLATION COMPLETE =====
echo ""
echo "============================================"
print_info "✓ Agent installation completed successfully!"
echo "============================================"
echo ""
echo "Agent ID: $AGENT_ID"
echo "Installation Directory: $INSTALL_DIR"
echo "Process Manager: $PROCESS_MANAGER"
echo ""

if [[ "$PROCESS_MANAGER" == "pm2" ]]; then
    echo "Useful commands:"
    echo "  pm2 status              # View agent status"
    echo "  pm2 logs $SERVICE_NAME  # View logs"
    echo "  pm2 restart $SERVICE_NAME  # Restart agent"
    echo "  pm2 stop $SERVICE_NAME  # Stop agent"
else
    echo "Useful commands:"
    echo "  sudo systemctl status $SERVICE_NAME   # View agent status"
    echo "  sudo journalctl -u $SERVICE_NAME -f  # View logs"
    echo "  sudo systemctl restart $SERVICE_NAME  # Restart agent"
    echo "  sudo systemctl stop $SERVICE_NAME     # Stop agent"
fi

echo ""
print_warn "IMPORTANT: Agent secret has been saved to $INSTALL_DIR/.env"
print_warn "Keep this file secure and do NOT share it!"
echo ""
```

### Script Execution

**User chạy script:**
```bash
# Download script
wget -O install-agent.sh https://api.x-or.cloud/dev/aiwm/agents/{agentId}/install-script

# Make executable
chmod +x install-agent.sh

# Run installation
./install-agent.sh

# Or specify PM2 instead of systemd
PROCESS_MANAGER=pm2 ./install-agent.sh
```

**Script sẽ tự động:**
1. ✅ Install NVM + Node.js 24
2. ✅ Download agent binary
3. ✅ Create `.env` với AIWM credentials
4. ✅ Install dependencies
5. ✅ Setup systemd service or PM2
6. ✅ Start agent
7. ✅ Verify running status

---

## Agent Runtime Behavior

### Startup Flow (Autonomous Agent)

```
1. Agent starts
   ↓
2. Load .env file
   ↓
3. Check AIWM_ENABLED=true?
   ├─ YES → Continue with AIWM mode
   └─ NO  → Use local config (instruction.md, .env)
   ↓
4. POST /agents/:id/connect { secret }
   ↓
5. Receive config:
   - JWT token
   - Instruction (systemPrompt)
   - Settings (Discord/Telegram tokens, Claude config)
   - MCP servers
   - Deployment info (if managed)
   ↓
6. Initialize Agent SDK:
   - Setup Claude Code SDK with instruction
   - Connect to Discord/Telegram (if configured)
   - Register MCP servers
   - Load allowed tools
   ↓
7. Start heartbeat loop (every 60s)
   ↓
8. Ready to receive requests
```

### Heartbeat & Token Refresh

```
Every 60 seconds:
  POST /agents/:id/heartbeat
    { status: 'online', metrics: {...} }

Every 23 hours:
  POST /agents/:id/connect { secret }
  - Refresh JWT token (expires every 24h)
  - Reload config (hot reload)
```

### Hot Reload (without restart)

```
User triggers: /reload command in Discord/Telegram
  ↓
Agent calls: GET /agents/:id/config
  ↓
Receives latest:
  - instruction
  - settings
  - deployment
  ↓
Agent reloads:
  - Update systemPrompt
  - Update Discord/Telegram config
  - No restart needed!
```

### Graceful Shutdown

```
User stops agent (systemctl stop / pm2 stop)
  ↓
Agent catches SIGTERM signal
  ↓
POST /agents/:id/disconnect { reason: 'shutdown' }
  ↓
Cleanup:
  - Close Discord/Telegram connections
  - Save session state
  - Exit cleanly
```

---

## Implementation Plan

### Phase 1: Core Infrastructure ✅ (Complete)

**Status:** ✅ Complete

- ✅ Agent schema với `type`, `secret`, `settings`, connection tracking
- ✅ Agent CRUD APIs
- ✅ Configuration module với ConfigKey enum
- ✅ JWT authentication infrastructure (IAM service)
- ✅ Added `ConfigKey.AGENT_DOWNLOAD_BASE_URL` to enum
- ✅ Created seed script: `scripts/seed-agent-download-config.js`
- ✅ Verified build passes

**Files modified:**
- `services/aiwm/src/modules/configuration/enums/config-key.enum.ts` - Added AGENT_DOWNLOAD_BASE_URL

**Files created:**
- `scripts/seed-agent-download-config.js` - Seed script for agent download config

**How to seed:**
```bash
mongosh mongodb://172.16.3.20:27017/core_aiwm scripts/seed-agent-download-config.js
```

### Phase 2: Agent Lifecycle APIs ✅ (Complete)

**Status:** ✅ Complete

**Tasks:**
1. ✅ Design API endpoints (documented above)
2. ✅ Implement `POST /agents/:id/regenerate-credentials` - [agent.service.ts:604-621](services/aiwm/src/modules/agent/agent.service.ts#L604-L621)
   - Generate random 64-char hex secret
   - Hash and save to DB using bcrypt
   - Build full installation script (~250 lines) with NVM + Node.js + systemd/PM2
   - Load download URL from ConfigKey.AGENT_DOWNLOAD_BASE_URL
   - Return credentials + envConfig + installScript
3. ✅ Implement `POST /agents/:id/connect` - [agent.service.ts:282-442](services/aiwm/src/modules/agent/agent.service.ts#L282-L442)
   - Verify secret using bcrypt.compare()
   - Generate agent JWT with proper payload (uses agent.role field)
   - Load instruction, deployment, MCP config
   - Update lastConnectedAt and increment connectionCount
   - Return full config (accessToken + instruction + tools + mcpServers + deployment)
4. ✅ Implement `POST /agents/:id/heartbeat` - [agent.service.ts:546-570](services/aiwm/src/modules/agent/agent.service.ts#L546-L570)
   - Update lastHeartbeatAt timestamp
   - Accept status and optional metrics
   - Return success response
5. ✅ Implement `GET /agents/:id/config` - [agent.service.ts:176-276](services/aiwm/src/modules/agent/agent.service.ts#L176-L276)
   - For managed agents (requires user JWT)
   - Return latest instruction + tools + MCP servers
   - No new JWT issued (uses user's token)
   - Enable hot reload of agent configuration
6. ✅ Implement `POST /agents/:id/disconnect` - [agent.service.ts:576-602](services/aiwm/src/modules/agent/agent.service.ts#L576-L602)
   - Clear lastConnectedAt to indicate disconnected state
   - Log disconnect event with reason
   - Return success response

**Files modified:**
- `services/aiwm/src/modules/agent/agent.controller.ts` - Added disconnect endpoint
- `services/aiwm/src/modules/agent/agent.service.ts` - Added disconnect() method, updated buildInstallScript() to full production version
- `services/aiwm/src/modules/agent/agent.dto.ts` - Added AgentDisconnectDto

**Build verification:** ✅ `npx nx build aiwm` passes successfully

**Key implementation details:**
- Installation script uses String.raw template to handle bash special characters
- buildInstallScript() is async to load CDN URL from configuration
- JWT roles come from agent.role field (NOT agent.settings.auth_roles)
- Both autonomous and managed agents can use connect() endpoint
- Managed agents get deployment info populated in connect response

### Phase 3: Installation Script Template ✅ (Complete)

**Status:** ✅ Complete (implemented inline in Phase 2)

**Tasks:**
1. ✅ Create installation script template - [agent.service.ts:726-956](services/aiwm/src/modules/agent/agent.service.ts#L726-L956)
   - Implemented as inline String.raw template in `buildInstallScript()` method
   - Template variables: agentId, secret, AIWM base URL, download URL, agent name, timestamp
   - ~250 lines of production-ready bash script
2. ✅ Implement template rendering logic
   - Integrated directly in `buildInstallScript()` method
   - Uses String.raw for bash special character handling
   - Loads download URL dynamically from ConfigKey.AGENT_DOWNLOAD_BASE_URL
3. ⏳ Test script trên Ubuntu 22.04 VM (manual testing by user)
   - Verify NVM installation
   - Verify Node.js 24 installation
   - Verify agent download & extraction
   - Verify systemd service creation
   - Verify PM2 setup (optional)

**Implementation approach:**
- Inline template approach instead of separate template file
- Simpler to maintain (single source of truth)
- Dynamic variable substitution using template literals
- Full bash script features:
  - NVM + Node.js 24 installation
  - Agent binary download from CDN
  - systemd service setup (default)
  - PM2 support (alternative)
  - .env file generation
  - Error handling and verification
  - Color output for better UX

**Note:** Manual testing on Ubuntu VM will be performed by user to verify script functionality.

### Phase 4: Agent Build & Release Pipeline ✅ (Complete)

**Status:** ✅ Complete

**Tasks:**
1. ✅ Setup agent build pipeline (`xora-cc-agent`)
   - Updated `npm run build:prod` (TypeScript + obfuscation via javascript-obfuscator)
   - Updated create-release.sh to generate both versioned and latest tarballs
   - Package naming: `xora-cc-agent-v{version}.tar.gz` + `xora-cc-agent-latest.tar.gz`
   - Generates SHA256 checksums for verification
   - Includes dist/, package.json, workspace/, .env.example
2. ✅ Upload to CDN script
   - Created upload-to-cdn.sh with multi-CDN support
   - Supports: AWS S3, S3-compatible (MinIO, DO Spaces), Cloudflare R2
   - Automated upload with public ACL
   - Environment variables for configuration (CDN_TYPE, CDN_BUCKET, CDN_PATH, CDN_ENDPOINT)
   - Upload both versioned and latest packages
3. ✅ AGENT_DOWNLOAD_BASE_URL configuration
   - Already added in Phase 1: ConfigKey.AGENT_DOWNLOAD_BASE_URL
   - Seed script: `scripts/seed-agent-download-config.js`
   - Default value: `https://cdn.x-or.cloud/agents`

**Files created/modified:**
- ✅ `xora-cc-agent/scripts/create-release.sh` - Updated for xora-cc-agent naming, creates versioned + latest tarballs
- ✅ `xora-cc-agent/scripts/upload-to-cdn.sh` - New script for automated CDN upload

**Usage:**

Build release:
```bash
cd xora-cc-agent
npm run release              # Build and create tarballs
npm run release:check        # Dry run (check only)
```

Upload to CDN:
```bash
# AWS S3
export CDN_TYPE=s3
export CDN_BUCKET=hydrabyte-agents
export CDN_PATH=agents
export CDN_REGION=us-east-1
./scripts/upload-to-cdn.sh

# S3-compatible (MinIO, DigitalOcean Spaces)
export CDN_TYPE=s3
export CDN_BUCKET=hydrabyte-agents
export CDN_PATH=agents
export CDN_ENDPOINT=https://nyc3.digitaloceanspaces.com
export CDN_REGION=us-east-1
./scripts/upload-to-cdn.sh

# Cloudflare R2
export CDN_TYPE=cloudflare-r2
export CDN_BUCKET=hydrabyte-agents
export CDN_PATH=agents
./scripts/upload-to-cdn.sh

# Custom/Manual
export CDN_TYPE=custom
./scripts/upload-to-cdn.sh  # Shows manual upload instructions
```

**Output files:**
- `release/xora-cc-agent-v1.0.0.tar.gz` - Versioned package
- `release/xora-cc-agent-v1.0.0.tar.gz.sha256` - Checksum
- `release/xora-cc-agent-latest.tar.gz` - Latest package (used by installation scripts)
- `release/xora-cc-agent-latest.tar.gz.sha256` - Checksum

**Public CDN URLs (after upload):**
- Versioned: `https://cdn.x-or.cloud/agents/xora-cc-agent-v1.0.0.tar.gz`
- Latest: `https://cdn.x-or.cloud/agents/xora-cc-agent-latest.tar.gz` ← Installation script uses this

### Phase 5: Agent SDK Updates (xora-cc-agent) 🔨

**Status:** 📝 Documentation Ready

**Documentation:**
- ✅ Created comprehensive integration guide: [`xora-cc-agent/docs/AIWM-INTEGRATION-GUIDE.md`](../../../xora/xora-cc-agent/docs/AIWM-INTEGRATION-GUIDE.md)
- Covers all API endpoints với detailed request/response examples
- Includes architecture flow diagrams
- Contains implementation checklists cho từng sub-phase
- Error handling strategies
- Token management guide
- Testing procedures

**Tasks:**
1. ⏳ AIWM Connection (Phase 5.1)
   - Implement `AIWMService` class
   - Implement `POST /agents/:id/connect` call
   - Parse response và save JWT token
   - Error handling với retry logic
   - **Files**: `src/services/aiwm.service.ts`

2. ⏳ Configuration Application (Phase 5.2)
   - Parse instruction object (systemPrompt + guidelines)
   - Parse settings object (claude_*, discord_*, telegram_*)
   - Merge với .env config (AIWM overrides)
   - Apply to Claude SDK
   - Setup MCP servers from config
   - Setup Discord/Telegram with merged config
   - **Files**: `src/services/aiwm.service.ts`, `src/config/config.service.ts`

3. ⏳ Heartbeat Loop (Phase 5.3)
   - Implement `HeartbeatService` class
   - Background interval: every 60 seconds
   - Track metrics: uptime, message count, memory usage
   - Make `POST /agents/:id/heartbeat` with metrics
   - Handle errors without crashing
   - **Files**: `src/services/heartbeat.service.ts`

4. ⏳ Token Refresh (Phase 5.4)
   - Implement `TokenManager` class
   - Calculate token expiry time
   - Schedule refresh every 23 hours
   - Call connect() again to get new token
   - Handle refresh errors with backoff
   - **Files**: `src/services/token-manager.service.ts`

5. ⏳ Hot Reload (Phase 5.5)
   - Implement `/reload` command handler in Discord/Telegram
   - Make `GET /agents/:id/config` request
   - Parse new instruction và settings
   - Apply to Claude SDK (update system prompt)
   - If Discord/Telegram config changed → reconnect
   - Send confirmation message
   - **Files**: `src/commands/reload.command.ts`

6. ⏳ Graceful Shutdown (Phase 5.6)
   - Register SIGTERM and SIGINT handlers
   - Stop heartbeat loop
   - Call `POST /agents/:id/disconnect` with reason
   - Save session state
   - Close Discord/Telegram connections
   - Exit cleanly
   - **Files**: `src/index.ts`

**Implementation Guide:**
- Read `xora-cc-agent/docs/AIWM-INTEGRATION-GUIDE.md` for complete specifications
- Follow implementation checklists in guide (Phase 5.1-5.7)
- Reference API endpoint details for request/response formats
- Use error handling strategies documented
- Follow token management best practices

**Testing:**
- Manual testing steps in guide
- Test connection with real AIWM backend
- Test all error scenarios
- Test fallback to .env mode (AIWM_ENABLED=false)

**Estimated time:** 3-4 days

---

### Phase 5B: Vercel AI SDK Agent Updates (xora-vercel-agent) 🔨

**Status:** 📝 Documentation Ready

**Documentation:**
- ✅ Created comprehensive integration guide: [`xora-vercel-agent/docs/AIWM-INTEGRATION-GUIDE.md`](../../../xora/xora-vercel-agent/docs/AIWM-INTEGRATION-GUIDE.md)
- Covers all API endpoints với detailed request/response examples
- **Key differences from Claude Code SDK agent**:
  - Multi-provider support (Anthropic, OpenAI, Groq, Google, etc.)
  - Custom MCP client implementation (not native)
  - Hot reload với provider switching capability
  - Vercel AI SDK specific configuration (temperature, maxTokens, topP)
- Includes architecture flow diagrams
- Contains implementation checklists cho từng sub-phase
- Error handling strategies
- Token management guide (including MCP client token updates)
- Testing procedures for multi-provider support

**Key Differences from xora-cc-agent:**

| Feature | xora-cc-agent | xora-vercel-agent |
|---------|---------------|-------------------|
| AI SDK | Claude Code SDK | Vercel AI SDK |
| Model Support | Claude only | Multi-provider |
| Tool System | Built-in tools | Custom tool definitions |
| MCP Support | Native MCP client | Custom MCP client |
| Hot Reload | Instruction + settings only | Instruction + settings + **provider/model switch** |
| Deployment Config | Optional (for managed agents) | **Required** (specifies provider/model) |

**Tasks:**
1. ⏳ AIWM Connection (Phase 5B.1)
   - Implement `AIWMService` class (similar to 5.1)
   - **CRITICAL**: Parse deployment config (provider, model, baseAPIEndpoint)
   - Initialize AI provider from deployment config
   - **Files**: `src/services/aiwm.service.ts`

2. ⏳ Configuration Application (Phase 5B.2)
   - Parse instruction, settings như Phase 5.2
   - **CRITICAL**: Configure Vercel AI SDK based on deployment
     - Support multiple providers: Anthropic, OpenAI, Groq, Google
     - Use baseAPIEndpoint from AIWM (proxy through AIWM)
     - Apply vercel_* settings (temperature, maxTokens, topP)
   - Custom MCP client implementation
     - No native MCP support trong Vercel AI SDK
     - Implement HTTP client to call MCP servers
     - Convert MCP tools to Vercel AI SDK tool format
   - **Files**: `src/services/aiwm.service.ts`, `src/services/mcp-client.ts`, `src/config/ai-provider.ts`

3. ⏳ Heartbeat Loop (Phase 5B.3)
   - Same as Phase 5.3

4. ⏳ Token Refresh (Phase 5B.4)
   - Extends from Phase 5.4
   - **CRITICAL**: Update MCP client token after refresh
     - Call `mcpClient.updateToken(newToken)`
     - Verify MCP calls work with new token
   - **Files**: `src/services/token-manager.service.ts`

5. ⏳ Hot Reload with Provider Switching (Phase 5B.5)
   - Extends from Phase 5.5
   - **CRITICAL**: Support provider/model switching
     - Parse new deployment config
     - Detect if provider or model changed
     - Reconfigure AI SDK with new provider/model
     - Log provider switch: "Switching from anthropic/claude-3-5-haiku → openai/gpt-4-turbo"
   - Notify user of successful provider switch
   - Test switching between: Anthropic ↔ OpenAI ↔ Groq
   - **Files**: `src/commands/reload.command.ts`, `src/config/ai-provider.ts`

6. ⏳ Graceful Shutdown (Phase 5B.6)
   - Same as Phase 5.6

**Implementation Guide:**
- Read `xora-vercel-agent/docs/AIWM-INTEGRATION-GUIDE.md` for complete specifications
- Follow implementation checklists in guide (Phase 5B.1-5B.7)
- Pay special attention to deployment config handling
- Implement robust provider switching logic
- Test with multiple AI providers

**Testing:**
- Test multi-provider support (Anthropic, OpenAI, Groq)
- Test hot reload with provider switching
- Test MCP integration with custom client
- Test token refresh updates MCP client
- Test fallback when deployment config missing
- Test error handling for unsupported providers

**Estimated time:** 4-5 days (more complex than Claude Code agent)

---

### Phase 6: Testing & Documentation 🔨

**Tasks:**
1. ⏳ E2E testing
   - Test autonomous agent deployment on Ubuntu VM
   - Test agent connection flow
   - Test heartbeat & token refresh
   - Test hot reload
   - Test graceful shutdown
2. ⏳ Write API documentation
   - Update `docs/aiwm/API-AGENT.md`
   - Add connection flow diagrams
3. ⏳ Write user guide
   - `docs/aiwm/AGENT-DEPLOYMENT-GUIDE.md`
   - Step-by-step setup for autonomous agents

**Estimated time:** 1-2 days

### Phase 7: Managed Agent Deployment (Future) ⏳

**Tasks:**
1. ⏳ Node cluster management
   - Auto-select available Node
   - Deploy agent container/process
2. ⏳ Container orchestration
   - Docker image build
   - Kubernetes deployment (optional)
3. ⏳ Auto-scaling
   - Monitor load
   - Scale agents up/down

**Estimated time:** 1-2 weeks (future phase)

---

## Total Estimated Time

**MVP (Autonomous Agent only):**
- Phase 2: 2-3 days
- Phase 3: 1-2 days
- Phase 4: 1 day
- Phase 5: 2-3 days
- Phase 6: 1-2 days

**Total: 7-11 days (1.5-2 weeks)**

---

## API Documentation Updates

Sau khi implement, cần update:

**File:** `docs/aiwm/API-AGENT.md`

**Sections to add:**
- Agent Lifecycle APIs
  - POST /agents/:id/regenerate-credentials
  - POST /agents/:id/connect
  - POST /agents/:id/heartbeat
  - POST /agents/:id/disconnect
  - GET /agents/:id/config
  - GET /agents/:id/install-script (optional: return script only)

**Request/Response examples với curl:**
```bash
# Regenerate credentials
curl -X POST https://api.x-or.cloud/dev/aiwm/agents/{agentId}/regenerate-credentials \
  -H "Authorization: Bearer {userJWT}" | jq

# Agent connect
curl -X POST https://api.x-or.cloud/dev/aiwm/agents/{agentId}/connect \
  -H "Content-Type: application/json" \
  -d '{"secret":"624577f0190d1d1dd016f4d799769dd82faad2de180319b41df99550fb373c83"}' | jq

# Heartbeat
curl -X POST https://api.x-or.cloud/dev/aiwm/agents/{agentId}/heartbeat \
  -H "Authorization: Bearer {agentJWT}" \
  -d '{"status":"online","metrics":{"uptime":3600}}' | jq
```

---

## Security Considerations

### 1. Secret Management
- ✅ Secret stored as bcrypt hash (select: false)
- ✅ Plain text secret only shown once in response
- ✅ Secret transmitted over HTTPS only
- ⚠️ User responsible for securing `.env` file on their server

### 2. JWT Token
- ✅ Agent JWT expires after 24h (force refresh)
- ✅ JWT includes agentId, orgId, roles for RBAC
- ✅ Agent can only access tools in `allowedToolIds`

### 3. Installation Script
- ✅ Script verifies system (Ubuntu/Debian only)
- ✅ Script does NOT run as root
- ✅ Script downloads from trusted CDN only
- ⚠️ User should verify script before running

### 4. Network Security
- ✅ All API calls over HTTPS
- ✅ Agent authenticate với secret before getting JWT
- ✅ Heartbeat validates JWT on every call

---

## Deployment Checklist

### For Developers

**Before deployment:**
- [ ] Implement all Phase 2-6 tasks
- [ ] Write unit tests cho agent service methods
- [ ] Write E2E tests cho agent lifecycle flow
- [ ] Update API documentation
- [ ] Test installation script trên clean Ubuntu VM
- [ ] Build và upload agent binary to CDN
- [ ] Add `AGENT_DOWNLOAD_BASE_URL` config to AIWM

### For Operators

**Setup CDN:**
- [ ] Create CDN bucket (public read, private write)
- [ ] Upload `xora-cc-agent-latest.tar.gz`
- [ ] Verify download link accessible
- [ ] Add CORS headers nếu cần

**Configure AIWM:**
- [ ] Add config: `agent.download.baseUrl` = `https://cdn.x-or.cloud/agents`
- [ ] Verify endpoint: `GET /configurations?key=agent.download.baseUrl`

**Test autonomous deployment:**
- [ ] Create test agent: `POST /agents`
- [ ] Generate credentials: `POST /agents/:id/regenerate-credentials`
- [ ] Run installation script trên Ubuntu VM
- [ ] Verify agent connects: check `lastConnectedAt`
- [ ] Verify heartbeat: check `lastHeartbeatAt` updates every 60s
- [ ] Test hot reload: update instruction → agent `/reload`
- [ ] Test graceful shutdown: `systemctl stop xora-agent`

---

## Appendix

### A. Agent Directory Structure (After Installation)

```
/opt/xora-agent/
├── dist/                    # Compiled JS (obfuscated)
│   ├── index.js            # Entry point
│   └── ...
├── node_modules/            # Dependencies
├── logs/                    # Log files
│   └── agent.log
├── workspace/               # Agent workspace (optional)
├── .env                     # Configuration (contains secret!)
├── package.json
├── package-lock.json
└── ecosystem.config.js      # PM2 config (if using PM2)
```

### B. Systemd Service File

```ini
[Unit]
Description=Xora AI Agent
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/xora-agent
ExecStart=/home/ubuntu/.nvm/versions/node/v24.12.0/bin/node /opt/xora-agent/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=xora-agent

Environment="PATH=/home/ubuntu/.nvm/versions/node/v24.12.0/bin:/usr/local/bin:/usr/bin:/bin"
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

### C. PM2 Ecosystem File

```javascript
module.exports = {
  apps: [{
    name: 'xora-agent',
    script: './dist/index.js',
    cwd: '/opt/xora-agent',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### D. MCP Servers Config Format

**Response từ `POST /agents/:id/connect`:**
```json
{
  "mcpServers": {
    "cbm-tools": {
      "type": "http",
      "url": "http://localhost:3305/mcp",
      "headers": {
        "Authorization": "Bearer eyJhbGci..."
      }
    }
  }
}
```

**Agent sẽ transform thành `mcp-servers.json`:**
```json
{
  "mcpServers": {
    "cbm-tools": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-client-axios"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3305/mcp",
        "MCP_AUTH_HEADER": "Bearer eyJhbGci..."
      }
    }
  }
}
```

**Or direct HTTP transport (Claude Code SDK):**
Agent sẽ trực tiếp register HTTP MCP server:
```typescript
const mcpClient = new MCPClient({
  transport: 'http',
  url: 'http://localhost:3305/mcp',
  headers: {
    'Authorization': 'Bearer eyJhbGci...'
  }
});
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-24 | backend-dev | Initial draft - complete planning |

---

## References

- [Agent Schema](../../services/aiwm/src/modules/agent/agent.schema.ts)
- [Agent DTOs](../../services/aiwm/src/modules/agent/agent.dto.ts)
- [xora-cc-agent README](/Users/dzung/Code/xor/xora/xora-cc-agent/README.md)
- [xora-cc-agent .env.example](/Users/dzung/Code/xor/xora/xora-cc-agent/.env.example)
- [Claude Code SDK](https://github.com/anthropics/claude-code)
