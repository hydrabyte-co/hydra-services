# Node Management Workflow - Enterprise Production Guide

**Document Version:** 1.0
**Service:** AIWM (AI Workload Manager)
**Environment:** Local Development (localhost)
**Date:** 2025-12-10

---

## 📋 Overview

This guide provides the **complete production workflow** for enterprises to manage GPU compute nodes in the Kaisar AI Ops platform.

**Workflow Steps:**
1. ✅ **Authentication** - Login to IAM service
2. ✅ **Node Registration** - Declare new nodes in the system
3. ✅ **Token Generation** - Generate JWT tokens and installation scripts
4. ✅ **Worker Installation** - Deploy node daemon on compute nodes
5. ✅ **Real-time Monitoring** - Track node status via WebSocket
6. ✅ **Lifecycle Management** - Maintenance, updates, decommissioning

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│       Local Development Environment (localhost)         │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │  IAM Service │    │ AIWM Service │                  │
│  │  (Port 3000) │    │  (Port 3305) │                  │
│  └──────┬───────┘    └──────┬───────┘                  │
│         │                    │                          │
│    1. Login               2. Manage Nodes              │
│    Get JWT                   via REST API              │
│                              & WebSocket               │
└─────────────────────────────┬───────────────────────────┘
                              │
                    JWT Token + WebSocket
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    Worker Nodes (GPU)                    │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │ GPU Node #1  │    │ GPU Node #2  │                  │
│  │ - Daemon     │    │ - Daemon     │    ...          │
│  │ - Docker     │    │ - Docker     │                  │
│  │ - GPU Driver │    │ - GPU Driver │                  │
│  └──────────────┘    └──────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Phase 1: Authentication

### Step 1.1: Login to IAM Service

Authenticate with the IAM service to obtain a JWT token:

```bash
curl --location 'https://api.x-or.cloud/dev/iam-v2/auth/login' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "username": ".env.ADMIN_USERNAME",
    "password": ".env.ADMIN_PASSWORD!"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTFlYmEwODUxN2Y5MTc5NDNhZTFmYTEiLCJ1c2VybmFtZSI6ImFkbWluQHZ0di52biIsInN0YXR1cyI6ImFjdGl2ZSIsInJvbGVzIjpbIm9yZ2FuaXphdGlvbi5vd25lciJdLCJvcmdJZCI6IjY5MWViOWU2NTE3ZjkxNzk0M2FlMWY5ZCIsImdyb3VwSWQiOiIiLCJhZ2VudElkIjoiIiwiYXBwSWQiOiIiLCJpYXQiOjE3MzM4MzIwMDAsImV4cCI6MTczMzgzNTYwMH0...",
  "user": {
    "id": "691eba08517f917943ae1fa1",
    "username": "...",
    "status": "active",
    "roles": ["organization.owner"]
  }
}
```

**Save the token for subsequent requests:**
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Token Details:**
- **Expires in**: 1 hour (3600 seconds)
- **Roles**: `organization.owner` (full access)
- **Organization ID**: `691eb9e6517f917943ae1f9d`

---

## 📝 Phase 2: Node Registration

### Step 2.1: Register New GPU Node

Register a new compute node in the AIWM system:

```bash
curl -X POST http://localhost:3305/nodes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gpu-worker-01",
    "role": ["worker"],
    "status": "pending",
    "isLocal": false
  }'
```

**Request Body Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Unique node name (e.g., `gpu-worker-01`) |
| `role` | string[] | ✅ | Node roles: `["worker"]`, `["controller"]`, `["proxy"]`, `["storage"]` |
| `status` | string | ✅ | Initial status: `"pending"` |
| `isLocal` | boolean | ❌ | `true` if node is on local network, `false` for remote |
| `vpnIp` | string | ❌ | VPN IP address if using VPN |

**Response (201 Created):**
```json
{
  "_id": "692abc12345f67890abcdef1",
  "name": "gpu-worker-01",
  "role": ["worker"],
  "status": "pending",
  "isLocal": false,
  "websocketConnected": false,
  "lastHeartbeat": "2025-12-10T10:00:00.000Z",
  "owner": {
    "orgId": "691eb9e6517f917943ae1f9d",
    "userId": "691eba08517f917943ae1fa1",
    "groupId": "",
    "agentId": "",
    "appId": ""
  },
  "createdBy": "691eba08517f917943ae1fa1",
  "updatedBy": "691eba08517f917943ae1fa1",
  "createdAt": "2025-12-10T10:00:00.000Z",
  "updatedAt": "2025-12-10T10:00:00.000Z"
}
```

**Save the Node ID:**
```bash
export NODE_ID="692abc12345f67890abcdef1"
```

---

### Step 2.2: Verify Node Registration

Check that the node was created successfully:

```bash
# Get specific node
curl -X GET http://localhost:3305/nodes/$NODE_ID \
  -H "Authorization: Bearer $TOKEN"

# List all nodes
curl -X GET "http://localhost:3305/nodes?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**List Response (with pagination & statistics):**
```json
{
  "data": [
    {
      "_id": "692abc12345f67890abcdef1",
      "name": "gpu-worker-01",
      "role": ["worker"],
      "status": "pending",
      "isLocal": false,
      "websocketConnected": false,
      "createdAt": "2025-12-10T10:00:00.000Z",
      "updatedAt": "2025-12-10T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "statistics": {
    "total": 1,
    "byStatus": {
      "pending": 1
    }
  }
}
```

---

## 🔐 Phase 3: Token Generation & Installation Script

### Step 3.1: Generate JWT Token for Node

Generate an authentication token and installation script for the worker node:

```bash
curl -X POST http://localhost:3305/nodes/$NODE_ID/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expiresIn": 31536000
  }'
```

**Request Parameters:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `expiresIn` | number | 31536000 | Token expiration in seconds (default: 1 year) |

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTJhYmMxMjM0NWY2Nzg5MGFiY2RlZjEiLCJ0eXBlIjoibm9kZSIsIm5vZGVJZCI6IjY5MmFiYzEyMzQ1ZjY3ODkwYWJjZGVmMSIsImlhdCI6MTczMzgzMjAwMCwiZXhwIjoxNzY1MzY4MDAwfQ.XYZ123...",
  "expiresAt": "2026-12-10T10:00:00.000Z",
  "installScript": "#!/bin/bash\n# Hydra Node Installation Script\n# Generated: 2025-12-10T10:00:00.000Z\n# Node: gpu-worker-01\n# Node ID: 692abc12345f67890abcdef1\n\necho \"Installing Hydra Node Daemon...\"\n\n# Configuration\nexport AIOPS_NODE_TOKEN=\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"\nexport AIOPS_CONTROLLER_ENDPOINT=\"ws://localhost:3305/ws/node\"\nexport AIOPS_NODE_ID=\"692abc12345f67890abcdef1\"\n\n# Installation steps will be added here\necho \"Installation complete!\"\necho \"Node ID: 692abc12345f67890abcdef1\"\necho \"Controller: ws://localhost:3305/ws/node\"\n"
}
```

---

### Step 3.2: Save Installation Script

Save the installation script to a file:

```bash
# Create install script
cat > install-gpu-worker-01.sh << 'EOF'
#!/bin/bash
# Hydra Node Installation Script
# Generated: 2025-12-10T10:00:00.000Z
# Node: gpu-worker-01
# Node ID: 692abc12345f67890abcdef1

echo "==========================================="
echo "  Hydra Node Daemon Installation"
echo "==========================================="
echo ""

# Configuration
export AIOPS_NODE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export AIOPS_CONTROLLER_ENDPOINT="ws://localhost:3305/ws/node"
export AIOPS_NODE_ID="692abc12345f67890abcdef1"

echo "Configuration:"
echo "  Node ID: $AIOPS_NODE_ID"
echo "  Controller: $AIOPS_CONTROLLER_ENDPOINT"
echo ""

# TODO: Implement actual installation steps
# 1. Download daemon binary
# 2. Install systemd service
# 3. Configure daemon with token
# 4. Start service

echo "Installation complete!"
EOF

chmod +x install-gpu-worker-01.sh
```

---

### Step 3.3: Token Metadata

The system automatically stores token metadata in MongoDB:

```json
{
  "_id": "692abc12345f67890abcdef1",
  "name": "gpu-worker-01",
  "tokenMetadata": {
    "tokenGeneratedAt": "2025-12-10T10:00:00.000Z",
    "tokenExpiresAt": "2026-12-10T10:00:00.000Z"
  },
  "updatedAt": "2025-12-10T10:00:00.000Z",
  "updatedBy": "691eba08517f917943ae1fa1"
}
```

**Benefits:**
- Track when tokens were generated
- Monitor token expiration
- Audit token usage
- Plan token rotation

---

## 📦 Phase 4: Worker Node Installation

### Step 4.1: Deploy Script to Worker Node

Copy the installation script to the target GPU worker node:

```bash
# Option 1: SCP (SSH Copy)
scp install-gpu-worker-01.sh user@gpu-worker-01:/tmp/

# Option 2: SSH + Heredoc
ssh user@gpu-worker-01 'cat > /tmp/install-node.sh' < install-gpu-worker-01.sh
```

---

### Step 4.2: Run Installation Script

SSH to the worker node and execute the script:

```bash
# SSH to worker
ssh user@gpu-worker-01

# Run installation
cd /tmp
sudo ./install-gpu-worker-01.sh
```

**Expected Output:**
```
===========================================
  Hydra Node Daemon Installation
===========================================

Configuration:
  Node ID: 692abc12345f67890abcdef1
  Controller: ws://localhost:3305/ws/node

Installation complete!
```

---

### Step 4.3: Verify Daemon Service

Check that the daemon service is running:

```bash
# Check service status
sudo systemctl status hydra-node-daemon

# View daemon logs
sudo journalctl -u hydra-node-daemon -f

# Check process
ps aux | grep hydra-node
```

**Expected Status:**
```
● hydra-node-daemon.service - Hydra Node Daemon
   Loaded: loaded (/etc/systemd/system/hydra-node-daemon.service; enabled)
   Active: active (running) since Wed 2025-12-10 10:00:00 UTC
```

---

## 🔌 Phase 5: WebSocket Connection & Monitoring

### Step 5.1: WebSocket Connection Flow

Once the daemon starts, it establishes a WebSocket connection:

```
Worker Node                          AIWM Controller
    │                                     │
    │  1. Connect to WS                  │
    │     ws://localhost:3305/ws/node
    ├───────────────────────────────────>│
    │     Authorization: Bearer <token>  │
    │                                     │
    │  2. Controller validates token     │
    │                                     ├── Verify JWT signature
    │                                     ├── Extract nodeId from token
    │                                     ├── Query MongoDB for node
    │                                     ├── Check node.status != 'inactive'
    │                                     │
    │  3. CONNECTION_ACK (success)       │
    │<───────────────────────────────────┤
    │     {                              │
    │       "status": "success",         │
    │       "nodeId": "692abc...",       │
    │       "controllerId": "main"       │
    │     }                              │
    │                                     │
    │  4. Update node status             │
    │                                     ├── node.status = "online"
    │                                     ├── node.websocketConnected = true
    │                                     ├── node.lastSeenAt = now()
    │                                     │
    │  5. Connection established ✓       │
    │                                     │
```

**MongoDB Update:**
```json
{
  "_id": "692abc12345f67890abcdef1",
  "status": "online",
  "websocketConnected": true,
  "lastHeartbeat": "2025-12-10T10:05:00.000Z",
  "lastSeenAt": "2025-12-10T10:05:00.000Z"
}
```

---

### Step 5.2: Node Registration Message

After connection, worker sends system information:

**Message: `node.register`**
```json
{
  "type": "node.register",
  "messageId": "uuid-1234-5678",
  "timestamp": "2025-12-10T10:05:10.000Z",
  "data": {
    "hostname": "gpu-worker-01.local",
    "ipAddress": "192.168.1.100",
    "publicIpAddress": "203.0.113.45",
    "os": "Ubuntu 22.04 LTS",
    "cpuCores": 32,
    "cpuModel": "Intel Xeon E5-2690 v4",
    "ramTotal": 137438953472,
    "diskTotal": 1099511627776,
    "gpuDevices": [
      {
        "deviceId": "GPU-0",
        "model": "NVIDIA A100-SXM4-80GB",
        "memoryTotal": 85899345920,
        "memoryFree": 85899345920,
        "utilization": 0,
        "temperature": 35
      }
    ],
    "daemonVersion": "1.0.0",
    "uptimeSeconds": 3600,
    "containerRuntime": "docker 24.0.7"
  }
}
```

**Controller Response: `register.ack`**
```json
{
  "type": "register.ack",
  "messageId": "uuid-8765-4321",
  "timestamp": "2025-12-10T10:05:11.000Z",
  "data": {
    "status": "success",
    "nodeId": "692abc12345f67890abcdef1",
    "registeredAt": "2025-12-10T10:05:11.000Z",
    "controllerInfo": {
      "controllerId": "controller-main",
      "heartbeatInterval": 30000,
      "metricsInterval": 60000,
      "timezone": "UTC"
    },
    "pendingCommands": []
  }
}
```

**MongoDB Update:**
```json
{
  "_id": "692abc12345f67890abcdef1",
  "status": "installing",
  "hostname": "gpu-worker-01.local",
  "ipAddress": "192.168.1.100",
  "publicIpAddress": "203.0.113.45",
  "os": "Ubuntu 22.04 LTS",
  "cpuCores": 32,
  "cpuModel": "Intel Xeon E5-2690 v4",
  "ramTotal": 137438953472,
  "diskTotal": 1099511627776,
  "gpuDevices": [
    {
      "deviceId": "GPU-0",
      "model": "NVIDIA A100-SXM4-80GB",
      "memoryTotal": 85899345920,
      "memoryFree": 85899345920,
      "utilization": 0,
      "temperature": 35
    }
  ],
  "daemonVersion": "1.0.0",
  "containerRuntime": "docker 24.0.7"
}
```

---

### Step 5.3: Heartbeat Monitoring

Worker sends periodic heartbeat (every 30 seconds):

**Message: `telemetry.heartbeat`**
```json
{
  "type": "telemetry.heartbeat",
  "messageId": "uuid-9101-1121",
  "timestamp": "2025-12-10T10:05:40.000Z",
  "data": {
    "status": "online",
    "uptimeSeconds": 3630,
    "cpuUsage": 25.5,
    "ramUsage": 45.2,
    "activeDeployments": 0,
    "gpuStatus": [
      {
        "deviceId": "GPU-0",
        "utilization": 0,
        "memoryUsed": 0,
        "temperature": 36
      }
    ]
  }
}
```

**MongoDB Update:**
```json
{
  "_id": "692abc12345f67890abcdef1",
  "status": "online",
  "uptimeSeconds": 3630,
  "cpuUsage": 25.5,
  "ramUsage": 45.2,
  "lastHeartbeat": "2025-12-10T10:05:40.000Z",
  "lastSeenAt": "2025-12-10T10:05:40.000Z",
  "gpuDevices": [
    {
      "deviceId": "GPU-0",
      "model": "NVIDIA A100-SXM4-80GB",
      "memoryTotal": 85899345920,
      "memoryFree": 85899345920,
      "utilization": 0,
      "temperature": 36
    }
  ]
}
```

---

### Step 5.4: Metrics Collection

Worker sends detailed metrics (every 60 seconds):

**Message: `telemetry.metrics`**
```json
{
  "type": "telemetry.metrics",
  "messageId": "uuid-1314-1516",
  "timestamp": "2025-12-10T10:06:00.000Z",
  "data": {
    "cpu": {
      "usage": 25.5,
      "loadAvg": [2.1, 1.9, 1.8],
      "processes": 245
    },
    "memory": {
      "total": 137438953472,
      "used": 62171734016,
      "free": 75267219456,
      "buffers": 5368709120,
      "cached": 10737418240
    },
    "disk": {
      "total": 1099511627776,
      "used": 549755813888,
      "free": 549755813888,
      "ioRead": 1048576,
      "ioWrite": 2097152
    },
    "network": {
      "bytesIn": 1048576000,
      "bytesOut": 524288000,
      "packetsIn": 10000,
      "packetsOut": 8000
    },
    "gpu": [
      {
        "deviceId": "GPU-0",
        "utilization": 0,
        "memoryTotal": 85899345920,
        "memoryUsed": 0,
        "memoryFree": 85899345920,
        "temperature": 36,
        "powerUsage": 55,
        "powerLimit": 400,
        "fanSpeed": 30,
        "processes": []
      }
    ]
  }
}
```

---

### Step 5.5: Verify Node is Online

Check node status via API:

```bash
curl -X GET http://localhost:3305/nodes/$NODE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Node Online):**
```json
{
  "_id": "692abc12345f67890abcdef1",
  "name": "gpu-worker-01",
  "role": ["worker"],
  "status": "online",
  "isLocal": false,
  "websocketConnected": true,
  "lastHeartbeat": "2025-12-10T10:05:40.000Z",
  "lastSeenAt": "2025-12-10T10:05:40.000Z",
  "lastMetricsAt": "2025-12-10T10:06:00.000Z",
  "hostname": "gpu-worker-01.local",
  "ipAddress": "192.168.1.100",
  "publicIpAddress": "203.0.113.45",
  "os": "Ubuntu 22.04 LTS",
  "cpuCores": 32,
  "cpuModel": "Intel Xeon E5-2690 v4",
  "cpuUsage": 25.5,
  "ramTotal": 137438953472,
  "ramUsage": 45.2,
  "diskTotal": 1099511627776,
  "uptimeSeconds": 3630,
  "gpuDevices": [
    {
      "deviceId": "GPU-0",
      "model": "NVIDIA A100-SXM4-80GB",
      "memoryTotal": 85899345920,
      "memoryFree": 85899345920,
      "utilization": 0,
      "temperature": 36
    }
  ],
  "daemonVersion": "1.0.0",
  "containerRuntime": "docker 24.0.7",
  "tokenMetadata": {
    "tokenGeneratedAt": "2025-12-10T10:00:00.000Z",
    "tokenExpiresAt": "2026-12-10T10:00:00.000Z"
  },
  "createdAt": "2025-12-10T10:00:00.000Z",
  "updatedAt": "2025-12-10T10:05:40.000Z",
  "createdBy": "691eba08517f917943ae1fa1",
  "updatedBy": "691eba08517f917943ae1fa1"
}
```

✅ **Success Indicators:**
- `status`: `"online"`
- `websocketConnected`: `true`
- `lastHeartbeat`: Recent timestamp (< 1 minute ago)
- `gpuDevices`: Array with GPU information

---

## 📊 Phase 6: Dashboard Monitoring

### Step 6.1: List All Nodes

```bash
curl -X GET "http://localhost:3305/nodes?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "_id": "692abc12345f67890abcdef1",
      "name": "gpu-worker-01",
      "status": "online",
      "websocketConnected": true,
      "cpuUsage": 25.5,
      "ramUsage": 45.2,
      "gpuDevices": [
        {
          "deviceId": "GPU-0",
          "model": "NVIDIA A100-SXM4-80GB",
          "utilization": 0,
          "temperature": 36
        }
      ],
      "lastHeartbeat": "2025-12-10T10:05:40.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "statistics": {
    "total": 1,
    "byStatus": {
      "online": 1
    }
  }
}
```

---

### Step 6.2: Filter Nodes by Status

```bash
# Online nodes only
curl -X GET "http://localhost:3305/nodes?filter[status]=online" \
  -H "Authorization: Bearer $TOKEN"

# Offline nodes
curl -X GET "http://localhost:3305/nodes?filter[status]=offline" \
  -H "Authorization: Bearer $TOKEN"

# Pending nodes (not yet connected)
curl -X GET "http://localhost:3305/nodes?filter[status]=pending" \
  -H "Authorization: Bearer $TOKEN"

# Maintenance nodes
curl -X GET "http://localhost:3305/nodes?filter[status]=maintenance" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Step 6.3: Sort and Paginate

```bash
# Sort by newest first
curl -X GET "http://localhost:3305/nodes?sort=-createdAt&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Sort by name
curl -X GET "http://localhost:3305/nodes?sort=name" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔧 Phase 7: Node Lifecycle Management

### Step 7.1: Update Node Metadata

**Update node name:**
```bash
curl -X PUT http://localhost:3305/nodes/$NODE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gpu-worker-01-production"
  }'
```

**Add additional role:**
```bash
curl -X PUT http://localhost:3305/nodes/$NODE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": ["worker", "storage"]
  }'
```

---

### Step 7.2: Change Node Status

**Put node in maintenance mode:**
```bash
curl -X PUT http://localhost:3305/nodes/$NODE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "maintenance"
  }'
```

**Bring node back online:**
```bash
curl -X PUT http://localhost:3305/nodes/$NODE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "online"
  }'
```

---

### Step 7.3: Regenerate Token

If token expires or is compromised:

```bash
curl -X POST http://localhost:3305/nodes/$NODE_ID/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expiresIn": 31536000
  }'
```

**Update worker configuration with new token:**
```bash
# SSH to worker
ssh user@gpu-worker-01

# Update token in daemon config
sudo nano /etc/hydra/node-daemon.conf

# Restart daemon
sudo systemctl restart hydra-node-daemon
```

---

### Step 7.4: Decommission Node

**Soft delete (recommended):**
```bash
curl -X DELETE http://localhost:3305/nodes/$NODE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "message": "Node deleted successfully"
}
```

**Effect:**
- Node marked as deleted (`isDeleted: true`)
- Node hidden from normal queries
- Data preserved for audit
- WebSocket connection terminated
- Token invalidated

**MongoDB State:**
```json
{
  "_id": "692abc12345f67890abcdef1",
  "status": "offline",
  "isDeleted": true,
  "deletedAt": "2025-12-10T11:00:00.000Z",
  "updatedBy": "691eba08517f917943ae1fa1"
}
```

---

## 🚨 Troubleshooting

### Issue 1: Worker Cannot Connect

**Symptoms:**
- Node status stuck at `"pending"`
- No heartbeat messages
- `websocketConnected: false`

**Diagnostics:**
```bash
# On worker node - check daemon logs
sudo journalctl -u hydra-node-daemon -n 100

# Check network connectivity
telnet localhost 3305

# Verify service is running
curl http://localhost:3305/health

# Check token validity
curl -X GET http://localhost:3305/nodes/$NODE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Solutions:**

1. **Token expired**: Regenerate token (Step 7.3)
2. **Firewall blocking WSS**: Open port 443 for outbound connections
3. **DNS issue**: Add DNS entry to `/etc/hosts`
4. **SSL certificate issue**: Update CA certificates

---

### Issue 2: Heartbeat Timeout

**Symptoms:**
- Node shows `"online"` but `lastHeartbeat` is old (> 2 minutes)
- Node shows `"offline"` but daemon is running

**Diagnostics:**
```bash
# Check daemon is running
sudo systemctl status hydra-node-daemon

# Check WebSocket connection
sudo journalctl -u hydra-node-daemon -f | grep -i "websocket"

# Check local service connectivity
curl -I http://localhost:3305/health
```

**Solutions:**

1. **Network latency**: Check for high latency/packet loss
2. **Daemon crashed**: Restart daemon (`systemctl restart hydra-node-daemon`)
3. **Controller issue**: Check AIWM service health

---

### Issue 3: GPU Not Detected

**Symptoms:**
- `gpuDevices: []` or `gpuDevices` missing
- GPU metrics show 0

**Diagnostics:**
```bash
# Check GPU is visible
nvidia-smi

# Check CUDA version
nvcc --version

# Check Docker has GPU access
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi

# Check daemon logs
sudo journalctl -u hydra-node-daemon -f | grep -i gpu
```

**Solutions:**

1. **Driver not installed**: Install NVIDIA drivers
   ```bash
   sudo apt-get install nvidia-driver-535
   sudo reboot
   ```

2. **Docker GPU runtime missing**: Install nvidia-docker2
   ```bash
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
   curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
     sudo tee /etc/apt/sources.list.d/nvidia-docker.list
   sudo apt-get update
   sudo apt-get install -y nvidia-docker2
   sudo systemctl restart docker
   ```

3. **Daemon lacks GPU access**: Run daemon with GPU access

---

## 📈 Monitoring Best Practices

### 1. Key Metrics to Monitor

**Node Health:**
- ✅ `status == "online"` - Node is active
- ✅ `websocketConnected == true` - Connected to controller
- ✅ `lastHeartbeat` < 1 minute ago - Receiving updates
- ✅ `cpuUsage` < 90% - CPU not overloaded
- ✅ `ramUsage` < 90% - Memory not exhausted

**GPU Health:**
- ✅ `gpuDevices[].temperature` < 85°C - GPU not overheating
- ✅ `gpuDevices[].utilization` - GPU usage patterns
- ✅ `gpuDevices[].memoryFree` > 10% - Memory available

---

### 2. Alert Conditions

**Critical:**
- Node status changes to `"offline"`
- No heartbeat for > 2 minutes
- GPU temperature > 85°C
- GPU memory exhausted

**Warning:**
- CPU usage > 80% for > 5 minutes
- RAM usage > 80% for > 5 minutes
- GPU temperature > 75°C
- Disk usage > 90%

---

### 3. Scheduled Maintenance

**Daily:**
- Review node statistics
- Check for offline nodes
- Verify token expiration dates

**Weekly:**
- Review metrics trends
- Update worker daemons if needed
- Rotate tokens for high-security environments

**Monthly:**
- Audit node inventory
- Archive old metrics data
- Review capacity planning

---

## 🔒 Security Best Practices

### 1. Token Management

✅ **DO:**
- Use long expiration (1 year) for stable nodes
- Regenerate tokens periodically (quarterly)
- Store tokens securely on worker nodes
- Audit token generation in logs

❌ **DON'T:**
- Share tokens between nodes
- Store tokens in version control
- Use expired tokens
- Expose tokens in logs

---

### 2. Network Security

✅ **DO:**
- Use WSS (WebSocket Secure) in production
- Restrict WebSocket port to known IPs
- Use VPN for remote workers (`vpnIp` field)
- Enable firewall on controller

❌ **DON'T:**
- Use plain WS in production
- Expose WebSocket to public internet
- Disable SSL certificate validation
- Allow unrestricted access

---

### 3. Access Control

✅ **DO:**
- Require `organization.owner` role for node management
- Track all actions via audit trail (`createdBy`, `updatedBy`)
- Use RBAC for multi-tenant isolation
- Review permissions regularly

❌ **DON'T:**
- Grant node management to all users
- Skip authentication checks
- Ignore audit logs
- Share admin credentials

---

## 📚 Next Steps

After completing Node Management, proceed to:

1. **[Resource Management](02-RESOURCE-MANAGEMENT.md)** - Allocate GPU resources for workloads
2. **[Model Registry](03-MODEL-MANAGEMENT.md)** - Register AI models
3. **[Deployment Management](04-DEPLOYMENT-MANAGEMENT.md)** - Deploy models to nodes
4. **[Agent Management](05-AGENT-MANAGEMENT.md)** - Create AI agents
5. **[Execution Monitoring](06-EXECUTION-MONITORING.md)** - Track workload execution

---

## 📞 Support

**Documentation:**
- AIWM README: `/services/aiwm/README.md`
- API Documentation: `http://localhost:3305/api-docs`

**System Health:**
- IAM Health: `http://localhost:3000/health`
- AIWM Health: `http://localhost:3305/health`

**Issues:**
- GitHub: (Add your repository URL)
- Support Email: support@x-or.cloud

---

**Document End - Node Management Workflow Complete ✅**
