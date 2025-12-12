# Node Installation & Notification Enhancement

**Document Version:** 1.0
**Service:** AIWM (AI Workload Manager)
**Feature Type:** Enhancement
**Priority:** High
**Target Release:** v2.0
**Date:** 2025-12-11

---

## 📋 Executive Summary

This document outlines the required enhancements to the Node Management workflow to support:
1. **Automated Worker Installation** - Generate production-ready systemd installation scripts for Ubuntu
2. **Real-time Status Updates** - Automatic node status transitions when worker connects
3. **Event-Driven Notifications** - Integration with NOTI service for user notifications via WebSocket

---

## 🎯 Business Requirements

### Current State Issues

Based on workflow testing (2025-12-11), the following issues were identified:

1. **Installation Script Incomplete**
   - Current script contains only TODOs
   - No actual installation steps
   - Missing binary download logic
   - No systemd service creation

2. **No Status Automation**
   - Node status remains "pending" after worker connects
   - Manual status update required
   - No automated state machine

3. **No User Notifications**
   - Users cannot track node installation progress
   - No real-time updates on connection events
   - Missing integration with notification system

### Target State

1. **Production-Ready Installation**
   - Full systemd-based installation for Ubuntu 22.04 LTS
   - Automated binary download from configured release URL
   - Service auto-start and health monitoring

2. **Automated Status Lifecycle**
   ```
   pending → installing → online → offline/maintenance
   ```

3. **Event-Driven Notifications**
   - Node registered → Notify user
   - Worker connected → Notify user + Update status
   - Worker disconnected → Notify user + Update status
   - Installation failed → Notify user with error details

---

## 🏗️ Technical Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AIWM Service (Port 3305)                  │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Node Module     │         │ Configuration    │         │
│  │  - generateToken │────────▶│ Module           │         │
│  │  - Installation  │         │ - RELEASE_URL    │         │
│  │    Script Gen    │         │ - DOCS_URL       │         │
│  └────────┬─────────┘         └──────────────────┘         │
│           │                                                  │
│           │ Emit Events                                     │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────┐          │
│  │         Event Emitter / Message Queue         │          │
│  └────────────────┬─────────────────────────────┘          │
│                   │                                          │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    │ HTTP POST /events
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  NOTI Service (Port 3XXX)                    │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Event Handler   │────────▶│  WebSocket       │         │
│  │  - node.connected│         │  Broadcaster     │         │
│  │  - node.offline  │         │                  │         │
│  └──────────────────┘         └────────┬─────────┘         │
│                                         │                    │
└─────────────────────────────────────────┼────────────────────┘
                                          │
                                          │ WS Event
                                          ▼
                                  ┌──────────────┐
                                  │   User UI    │
                                  │   Dashboard  │
                                  └──────────────┘
```

---

## 🔧 Technical Requirements

### 1. Configuration Module Enhancement

**File:** `services/aiwm/src/modules/configuration/configuration.module.ts`

**New Environment Variables:**
```typescript
// .env additions
RELEASE_BASE_URL=https://releases.x-or.cloud/aio-worker
DOCS_BASE_URL=https://docs.x-or.cloud
NOTI_SERVICE_URL=http://localhost:3XXX
DEFAULT_DAEMON_VERSION=v1.0.0
```

**Configuration Schema:**
```typescript
export interface AioWorkerConfig {
  releaseBaseUrl: string;
  docsBaseUrl: string;
  defaultVersion: string;
  checksums: {
    [version: string]: {
      'linux-amd64': string;
    }
  };
}
```

---

### 2. Generate Token API Enhancement

**File:** `services/aiwm/src/modules/node/node.dto.ts`

**Enhanced Request DTO:**
```typescript
export class GenerateTokenDto {
  @IsOptional()
  @IsNumber()
  @Min(3600)
  @Max(31536000)
  expiresIn?: number = 31536000; // Default: 1 year

  @IsOptional()
  @IsEnum(['linux'])
  osType?: 'linux' = 'linux'; // Only Ubuntu for now

  @IsOptional()
  @IsEnum(['systemd'])
  installMethod?: 'systemd' = 'systemd'; // Preferred for OS control

  @IsOptional()
  @IsString()
  daemonVersion?: string; // If not provided, use DEFAULT_DAEMON_VERSION
}
```

**Enhanced Response DTO:**
```typescript
export class GenerateTokenResponseDto {
  @IsString()
  token: string;

  @IsDate()
  expiresAt: Date;

  @IsString()
  installScript: string;

  @IsString()
  installMethod: string; // 'systemd'

  @IsString()
  daemonVersion: string; // 'v1.0.0'

  @IsString()
  downloadUrl: string; // Full URL to binary

  @IsString()
  checksum: string; // SHA256 checksum

  @IsString()
  documentationUrl: string; // Installation guide URL
}
```

---

### 3. Installation Script Generator

**File:** `services/aiwm/src/modules/node/generators/systemd-script.generator.ts`

**Template Structure:**
```bash
#!/bin/bash
# AIO Worker Node Installation Script
# Generated: 2025-12-11T12:00:00.000Z
# Node: gpu-worker-01
# Node ID: 69396100cd71623c7bbfbfee
# Version: v1.0.0
# OS: Ubuntu 22.04 LTS

set -e  # Exit on error

echo "=========================================="
echo "  AIO Worker Node Installation"
echo "=========================================="
echo ""

# Configuration
export AIO_NODE_TOKEN="eyJhbGci..."
export AIO_CONTROLLER_ENDPOINT="ws://localhost:3305/ws/node"
export AIO_NODE_ID="69396100cd71623c7bbfbfee"
export AIO_VERSION="v1.0.0"
export DOWNLOAD_URL="https://releases.x-or.cloud/aio-worker/v1.0.0/linux-amd64"
export CHECKSUM="sha256:abc123..."

echo "Configuration:"
echo "  Node ID: $AIO_NODE_ID"
echo "  Controller: $AIO_CONTROLLER_ENDPOINT"
echo "  Version: $AIO_VERSION"
echo ""

# Check prerequisites
echo "Checking prerequisites..."
if ! command -v systemctl &> /dev/null; then
    echo "Error: systemd is required but not found"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "Error: curl is required but not found"
    exit 1
fi

# Download binary
echo "Downloading AIO Worker daemon..."
sudo mkdir -p /usr/local/bin
sudo curl -L "$DOWNLOAD_URL" -o /usr/local/bin/aio-worker
sudo chmod +x /usr/local/bin/aio-worker

# Verify checksum
echo "Verifying download integrity..."
DOWNLOADED_CHECKSUM=$(sha256sum /usr/local/bin/aio-worker | awk '{print $1}')
EXPECTED_CHECKSUM="${CHECKSUM#sha256:}"
if [ "$DOWNLOADED_CHECKSUM" != "$EXPECTED_CHECKSUM" ]; then
    echo "Error: Checksum mismatch!"
    echo "  Expected: $EXPECTED_CHECKSUM"
    echo "  Got: $DOWNLOADED_CHECKSUM"
    exit 1
fi

# Create systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/aio-worker.service > /dev/null <<'SYSTEMD_EOF'
[Unit]
Description=AIO Worker Node Daemon
Documentation=https://docs.x-or.cloud/aio-worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Environment="AIO_NODE_TOKEN=TOKEN_PLACEHOLDER"
Environment="AIO_CONTROLLER_ENDPOINT=ENDPOINT_PLACEHOLDER"
Environment="AIO_NODE_ID=NODE_ID_PLACEHOLDER"
ExecStart=/usr/local/bin/aio-worker start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/aio-worker
WorkingDirectory=/var/lib/aio-worker

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

# Replace placeholders
sudo sed -i "s|TOKEN_PLACEHOLDER|$AIO_NODE_TOKEN|g" /etc/systemd/system/aio-worker.service
sudo sed -i "s|ENDPOINT_PLACEHOLDER|$AIO_CONTROLLER_ENDPOINT|g" /etc/systemd/system/aio-worker.service
sudo sed -i "s|NODE_ID_PLACEHOLDER|$AIO_NODE_ID|g" /etc/systemd/system/aio-worker.service

# Create working directory
sudo mkdir -p /var/lib/aio-worker
sudo chown root:root /var/lib/aio-worker

# Enable and start service
echo "Starting AIO Worker service..."
sudo systemctl daemon-reload
sudo systemctl enable aio-worker.service
sudo systemctl start aio-worker.service

# Wait for service to start
sleep 3

# Check service status
if sudo systemctl is-active --quiet aio-worker.service; then
    echo ""
    echo "=========================================="
    echo "  Installation Complete!"
    echo "=========================================="
    echo ""
    echo "Service Status: Active"
    echo "Node ID: $AIO_NODE_ID"
    echo "Controller: $AIO_CONTROLLER_ENDPOINT"
    echo ""
    echo "Check logs with:"
    echo "  sudo journalctl -u aio-worker.service -f"
    echo ""
    echo "Check status with:"
    echo "  sudo systemctl status aio-worker.service"
    echo ""
else
    echo ""
    echo "Error: Service failed to start"
    echo "Check logs with: sudo journalctl -u aio-worker.service -n 50"
    exit 1
fi
```

---

### 4. WebSocket Connection Handler Enhancement

**File:** `services/aiwm/src/modules/node/node-websocket.gateway.ts`

**Current Flow:**
```typescript
handleConnection(client: Socket) {
  // 1. Validate JWT token
  // 2. Extract nodeId from token
  // 3. Query MongoDB for node
  // 4. Send CONNECTION_ACK
  // ❌ Status remains "pending"
}
```

**Enhanced Flow:**
```typescript
async handleConnection(client: Socket) {
  // 1. Validate JWT token
  const nodeId = this.extractNodeIdFromToken(token);

  // 2. Query MongoDB for node
  const node = await this.nodeModel.findById(nodeId);

  if (!node) {
    return client.emit('error', { message: 'Node not found' });
  }

  // 3. Update node status to "installing" → "online"
  await this.nodeModel.updateOne(
    { _id: nodeId },
    {
      $set: {
        status: 'online',
        websocketConnected: true,
        lastSeenAt: new Date(),
        connectionEstablishedAt: new Date(),
      }
    }
  );

  // 4. Send CONNECTION_ACK
  client.emit('connection_ack', {
    status: 'success',
    nodeId: node._id,
    controllerId: 'main',
  });

  // 5. ✅ Emit event to NOTI service
  await this.notifyNodeConnected(node);
}

private async notifyNodeConnected(node: Node) {
  try {
    await this.httpService.post(
      `${this.configService.get('NOTI_SERVICE_URL')}/events`,
      {
        type: 'node.connected',
        timestamp: new Date().toISOString(),
        data: {
          nodeId: node._id,
          nodeName: node.name,
          status: 'online',
          owner: node.owner,
        }
      }
    ).toPromise();
  } catch (error) {
    this.logger.error(`Failed to notify NOTI service: ${error.message}`);
    // Don't fail the connection if notification fails
  }
}
```

---

### 5. Event Types for NOTI Service

**Event Schema:**
```typescript
// Node Registration Event
{
  type: 'node.registered',
  timestamp: '2025-12-11T12:00:00.000Z',
  data: {
    nodeId: '69396100cd71623c7bbfbfee',
    nodeName: 'gpu-worker-01',
    status: 'pending',
    owner: {
      orgId: '691eb9e6517f917943ae1f9d',
      userId: '691eba08517f917943ae1fa1'
    }
  }
}

// Worker Connected Event
{
  type: 'node.connected',
  timestamp: '2025-12-11T12:05:00.000Z',
  data: {
    nodeId: '69396100cd71623c7bbfbfee',
    nodeName: 'gpu-worker-01',
    status: 'online',
    ipAddress: '192.168.1.100',
    gpuDevices: [
      {
        model: 'NVIDIA A100-SXM4-80GB',
        memoryTotal: 85899345920
      }
    ],
    owner: {
      orgId: '691eb9e6517f917943ae1f9d',
      userId: '691eba08517f917943ae1fa1'
    }
  }
}

// Worker Disconnected Event
{
  type: 'node.disconnected',
  timestamp: '2025-12-11T13:00:00.000Z',
  data: {
    nodeId: '69396100cd71623c7bbfbfee',
    nodeName: 'gpu-worker-01',
    status: 'offline',
    disconnectReason: 'heartbeat_timeout',
    lastSeenAt: '2025-12-11T12:58:00.000Z',
    owner: {
      orgId: '691eb9e6517f917943ae1f9d',
      userId: '691eba08517f917943ae1fa1'
    }
  }
}

// Installation Failed Event
{
  type: 'node.installation_failed',
  timestamp: '2025-12-11T12:02:00.000Z',
  data: {
    nodeId: '69396100cd71623c7bbfbfee',
    nodeName: 'gpu-worker-01',
    error: {
      code: 'CHECKSUM_MISMATCH',
      message: 'Downloaded binary checksum does not match',
      details: {
        expected: 'abc123...',
        actual: 'def456...'
      }
    },
    owner: {
      orgId: '691eb9e6517f917943ae1f9d',
      userId: '691eba08517f917943ae1fa1'
    }
  }
}
```

---

## 🔄 State Machine

### Node Status Lifecycle

```
┌──────────┐
│ pending  │ ← Initial state after registration
└────┬─────┘
     │ Worker starts installation
     │
     ▼
┌──────────┐
│installing│ ← Worker downloads binary & starts service
└────┬─────┘
     │
     ├─────────────────┐
     │ Success         │ Failure
     ▼                 ▼
┌──────────┐      ┌──────────┐
│  online  │      │  error   │
└────┬─────┘      └──────────┘
     │
     ├──────────┬─────────────┐
     │          │             │
     │ Timeout  │ Manual      │ Disconnect
     ▼          ▼             ▼
┌──────────┐┌──────────┐┌──────────┐
│ offline  ││maintenance││inactive  │
└──────────┘└──────────┘└──────────┘
```

### Status Transitions

| From | To | Trigger | Auto/Manual | Notification |
|------|----|---------|-----------| -------------|
| `pending` | `installing` | Worker starts | Auto | ✅ node.installation_started |
| `installing` | `online` | WS connected | Auto | ✅ node.connected |
| `installing` | `error` | Install failed | Auto | ✅ node.installation_failed |
| `online` | `offline` | Heartbeat timeout | Auto | ✅ node.disconnected |
| `online` | `maintenance` | Admin action | Manual | ✅ node.maintenance_mode |
| `maintenance` | `online` | Admin action | Manual | ✅ node.resumed |
| `*` | `inactive` | Soft delete | Manual | ✅ node.decommissioned |

---

## 📝 Implementation Tasks

### Phase 1: Configuration & Script Generation (Priority: High)

- [ ] **Task 1.1:** Add configuration module for release URLs
  - Add environment variables to `.env.example`
  - Create `AioWorkerConfig` interface
  - Implement configuration service

- [ ] **Task 1.2:** Implement systemd script generator
  - Create `SystemdScriptGenerator` class
  - Implement template with security hardening
  - Add checksum verification logic

- [ ] **Task 1.3:** Update Generate Token DTO
  - Add optional parameters (osType, installMethod, version)
  - Update response DTO with downloadUrl, checksum, docs

- [ ] **Task 1.4:** Update Generate Token Service
  - Integrate with configuration service
  - Generate complete installation script
  - Return enhanced response with all metadata

### Phase 2: Status Automation (Priority: High)

- [ ] **Task 2.1:** Enhance WebSocket connection handler
  - Update node status on connection
  - Set `websocketConnected = true`
  - Update `lastSeenAt` timestamp

- [ ] **Task 2.2:** Implement heartbeat monitoring
  - Schedule periodic checks for offline nodes
  - Auto-update status to "offline" on timeout
  - Emit disconnection events

- [ ] **Task 2.3:** Add status validation middleware
  - Prevent invalid state transitions
  - Add business logic guards
  - Log all status changes

### Phase 3: Event Integration (Priority: Medium)

- [ ] **Task 3.1:** Define event schemas
  - Create TypeScript interfaces for all events
  - Document event payloads
  - Add validation

- [ ] **Task 3.2:** Implement event emitter
  - Create `NodeEventService`
  - Emit events on all status changes
  - Add retry logic for failed notifications

- [ ] **Task 3.3:** Integrate with NOTI service
  - HTTP POST to `/events` endpoint
  - Handle NOTI service failures gracefully
  - Add circuit breaker pattern

### Phase 4: Testing & Documentation (Priority: Medium)

- [ ] **Task 4.1:** Unit tests
  - Test script generator with various configs
  - Test status transitions
  - Test event emission

- [ ] **Task 4.2:** Integration tests
  - Test full workflow with mock worker
  - Test NOTI service integration
  - Test error scenarios

- [ ] **Task 4.3:** Update documentation
  - Update API documentation
  - Create installation guide
  - Add troubleshooting section

---

## 🧪 Test Scenarios

### Scenario 1: Successful Installation & Connection

**Steps:**
1. User registers node → Status: `pending`
2. User generates token & downloads script
3. User runs script on Ubuntu worker
4. Script downloads binary, verifies checksum → Status: `installing`
5. Script creates systemd service and starts it
6. Worker connects to WebSocket → Status: `online`
7. User receives notification: "Node gpu-worker-01 is now online"

**Expected Events:**
- `node.registered`
- `node.installation_started`
- `node.connected`

### Scenario 2: Installation Failure - Checksum Mismatch

**Steps:**
1-4. Same as Scenario 1
5. Checksum verification fails
6. Script exits with error
7. User receives notification: "Node installation failed: Checksum mismatch"

**Expected Events:**
- `node.registered`
- `node.installation_started`
- `node.installation_failed`

### Scenario 3: Worker Disconnection

**Steps:**
1-6. Same as Scenario 1
7. Worker process crashes or network disconnects
8. Heartbeat timeout (2 minutes) → Status: `offline`
9. User receives notification: "Node gpu-worker-01 went offline"

**Expected Events:**
- `node.registered`
- `node.connected`
- `node.disconnected`

---

## 🚧 Known Limitations & Future Enhancements

### Current Scope Limitations

1. **OS Support:** Ubuntu 22.04 LTS only
   - Future: RHEL, CentOS, Debian

2. **Install Method:** systemd only
   - Future: Docker, Kubernetes, manual

3. **Architecture:** AMD64 only
   - Future: ARM64 support

4. **Binary Source:** Static URL
   - Future: Support private registries, S3

### Future Enhancements

1. **Auto-Update Mechanism**
   - Daemon checks for updates
   - Rolling update support
   - Version pinning

2. **Health Monitoring**
   - GPU health checks
   - Container health
   - Resource usage alerts

3. **Advanced Deployment**
   - Kubernetes operator
   - Ansible playbooks
   - Terraform modules

---

## 📊 Success Metrics

### Key Performance Indicators (KPIs)

1. **Installation Success Rate:** Target > 95%
2. **Time to Connect:** Target < 60 seconds
3. **Notification Delivery Rate:** Target > 99%
4. **Event Processing Latency:** Target < 500ms
5. **Worker Uptime:** Target > 99.9%

### Monitoring & Alerting

- Track installation failures by error type
- Monitor WebSocket connection stability
- Alert on NOTI service delivery failures
- Dashboard for node fleet health

---

## 🔒 Security Considerations

1. **Binary Verification**
   - SHA256 checksum mandatory
   - HTTPS for all downloads
   - Signed releases (future)

2. **Service Isolation**
   - systemd security settings enabled
   - Private tmp directory
   - Read-only system protection

3. **Token Security**
   - Long expiration (1 year) acceptable for stable infra
   - Rotation mechanism for compromised tokens
   - Token scoped to specific node ID

4. **Event Security**
   - NOTI service authentication
   - Event payload validation
   - Rate limiting on event emission

---

## 📚 References

### Related Documents

- [Node Management Workflow](../workflows/01-NODE-MANAGEMENT.md)
- [AIWM Service README](../../services/aiwm/README.md)
- [Test Results](../../docs/TEST-RESULTS-PHASE2.md)

### External Documentation

- [systemd Service Documentation](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [WebSocket Security Best Practices](https://owasp.org/www-community/Web_Sockets)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)

---

**Document Status:** Draft
**Next Review:** After implementation
**Owner:** AIWM Development Team
**Last Updated:** 2025-12-11
