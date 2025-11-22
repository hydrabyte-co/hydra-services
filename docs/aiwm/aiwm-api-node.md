# AIWM Service - Node API Documentation

## Overview

The Node API manages GPU worker nodes in the Hydra distributed computing platform. It handles node registration, authentication, monitoring, and lifecycle management.

**Base URL:** 
- `http://localhost:3305` (Local)
- `https://api.x-or.cloud/dev/aiwm` (Production)
**Namespace (WebSocket):** `/ws/node`

## Table of Contents

1. [Node Registration Flow](#node-registration-flow)
2. [Status Lifecycle](#status-lifecycle)
3. [Data Types](#data-types)
4. [REST API Endpoints](#rest-api-endpoints)
5. [WebSocket Events](#websocket-events)
6. [Error Codes](#error-codes)
7. [Best Practices](#best-practices)

---

## Node Registration Flow

The new registration flow is Portal-first, where users create nodes through the web interface before installing worker daemons:

```
┌─────────────┐
│   Portal    │
│  (User UI)  │
└──────┬──────┘
       │ 1. Create Node
       ▼
┌─────────────────────┐
│  POST /nodes        │
│  Status: "pending"  │
└──────┬──────────────┘
       │ 2. Returns: { _id, name, ... }
       ▼
┌──────────────────────┐
│ POST /nodes/:id/token│
│ Returns: Token +     │
│ Installation Script  │
└──────┬───────────────┘
       │ 3. User receives token
       ▼
┌─────────────────────┐
│  Worker Machine     │
│  (Run install.sh)   │
└──────┬──────────────┘
       │ 4. Daemon starts
       ▼
┌─────────────────────┐
│  WebSocket Connect  │
│  (JWT Token Auth)   │
└──────┬──────────────┘
       │ 5. Status: "installing"
       ▼
┌─────────────────────┐
│  NODE_REGISTER      │
│  (Send system info) │
└──────┬──────────────┘
       │ 6. Status: "online"
       ▼
┌─────────────────────┐
│  Heartbeat Loop     │
│  (Every 30s)        │
└─────────────────────┘
```

### Key Points:

1. **Portal Creation First**: Node created via REST API with status `pending`
2. **Token Generation**: User generates JWT token for worker authentication
3. **Worker Installation**: User runs installation script with embedded token
4. **WebSocket Connection**: Worker connects using JWT token (contains node's `_id`)
5. **Registration**: Worker sends system information via WebSocket
6. **Online Status**: Node becomes `online` after successful registration

---

## Status Lifecycle

### Status Enum

```typescript
enum NodeStatus {
  PENDING = 'pending',       // Created in Portal, awaiting installation
  INSTALLING = 'installing', // Worker connected, registering system info
  ONLINE = 'online',         // Fully operational
  OFFLINE = 'offline',       // Disconnected or shutdown
  MAINTENANCE = 'maintenance' // Under maintenance
}
```

### Status Transitions

```
pending → installing → online → offline
                ↓         ↓
                └─────→ maintenance
```

**Transition Rules:**

- `pending` → `installing`: When worker connects via WebSocket and sends `NODE_REGISTER`
- `installing` → `online`: When registration completes and heartbeat starts
- `online` → `offline`: When worker disconnects or heartbeat timeout
- `online` → `maintenance`: Manual update via API
- `maintenance` → `online`: Manual update via API

---

## Data Types

### Node Schema

```typescript
interface Node {
  _id: ObjectId;              // MongoDB ID (primary identifier)
  name: string;               // Node name
  role: string[];             // ['controller', 'worker', 'proxy', 'storage']
  status: NodeStatus;         // Current status
  isLocal: boolean;           // Is local node
  vpnIp?: string;             // VPN IP address
  websocketConnected: boolean;// WebSocket connection status
  lastHeartbeat: Date;        // Last heartbeat timestamp

  // Hardware Information (populated during registration)
  gpuDevices?: GPUDevice[];   // GPU devices
  cpuCores?: number;          // Number of CPU cores
  cpuModel?: string;          // CPU model name
  ramTotal?: number;          // Total RAM in GB
  ramFree?: number;           // Free RAM in GB
  diskTotal?: number;         // Total disk space in GB
  hostname?: string;          // System hostname
  ipAddress?: string;         // Local IP address
  publicIpAddress?: string;   // Public IP address
  os?: string;                // Operating system
  daemonVersion?: string;     // Worker daemon version
  containerRuntime?: string;  // Container runtime (docker, containerd, etc.)
  uptimeSeconds?: number;     // System uptime in seconds

  // Metrics (updated via heartbeat)
  cpuUsage?: number;          // CPU usage percentage
  ramUsage?: number;          // RAM usage percentage

  // Token Metadata
  tokenMetadata?: {
    tokenGeneratedAt?: Date;
    tokenExpiresAt?: Date;
    tokenLastUsed?: Date;
  };

  // Timestamps
  lastSeenAt?: Date;          // Last seen timestamp
  lastMetricsAt?: Date;       // Last metrics update

  // BaseSchema fields
  owner: {
    orgId?: string;
    groupId?: string;
    agentId?: string;
    appId?: string;
  };
  createdBy: string;
  updatedBy?: string;
  deletedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### GPUDevice

```typescript
interface GPUDevice {
  deviceId: string;      // GPU device ID
  model: string;         // GPU model name
  memoryTotal: number;   // Total VRAM in GB
  memoryFree: number;    // Free VRAM in GB
  utilization: number;   // GPU utilization percentage (0-100)
  temperature: number;   // GPU temperature in Celsius
}
```

---

## REST API Endpoints

### 1. Create Node

Creates a new node in `pending` status.

**Endpoint:** `POST /nodes`

**Request Body:**

```json
{
  "name": "GPU-Worker-01",
  "role": ["worker"],
  "isLocal": false,
  "vpnIp": "10.0.1.5"
}
```

**Response:** `201 Created`

```json
{
  "_id": "673e7a1f5c9d8e001234abcd",
  "name": "GPU-Worker-01",
  "role": ["worker"],
  "status": "pending",
  "isLocal": false,
  "vpnIp": "10.0.1.5",
  "websocketConnected": false,
  "lastHeartbeat": "2025-11-21T10:00:00.000Z",
  "owner": {
    "orgId": "68dd05b175d9e3c17bf97f60"
  },
  "createdBy": "68dcf365f6a92c0d4911b619",
  "createdAt": "2025-11-21T10:00:00.000Z",
  "updatedAt": "2025-11-21T10:00:00.000Z"
}
```

**curl Example:**

```bash
curl -X POST http://localhost:3305/nodes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPU-Worker-01",
    "role": ["worker"],
    "isLocal": false,
    "vpnIp": "10.0.1.5"
  }'
```

---

### 2. Generate Node Token

Generates JWT token and installation script for worker authentication.

**Endpoint:** `POST /nodes/:id/token`

**Request Body:**

```json
{
  "expiresIn": 31536000  // Token expiration in seconds (default: 1 year)
}
```

**Response:** `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-11-21T10:00:00.000Z",
  "installScript": "#!/bin/bash\n# Hydra Node Installation Script\n# Generated: 2025-11-21T10:00:00.000Z\n# Node: GPU-Worker-01\n# Node ID: 673e7a1f5c9d8e001234abcd\n\necho \"Installing Hydra Node Daemon...\"\n\n# Configuration\nexport HYDRA_NODE_TOKEN=\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"\nexport HYDRA_CONTROLLER_ENDPOINT=\"ws://localhost:3305\"\nexport HYDRA_NODE_ID=\"673e7a1f5c9d8e001234abcd\"\n\n# TODO: Add actual installation steps\n# 1. Download daemon binary\n# 2. Install systemd service\n# 3. Configure daemon with token\n# 4. Start service\n\necho \"Installation complete!\"\necho \"Node ID: 673e7a1f5c9d8e001234abcd\"\necho \"Controller: ws://localhost:3305\"\n"
}
```

**curl Example:**

```bash
curl -X POST http://localhost:3305/nodes/673e7a1f5c9d8e001234abcd/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expiresIn": 31536000
  }'
```

**Usage:**

```bash
# Save installation script
curl -X POST http://localhost:3305/nodes/673e7a1f5c9d8e001234abcd/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 31536000}' | jq -r '.installScript' > install.sh

# Make executable and run on worker machine
chmod +x install.sh
./install.sh
```

---

### 3. Get All Nodes

Retrieves list of all nodes with pagination.

**Endpoint:** `GET /nodes`

**Query Parameters:**

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

**Response:** `200 OK`

```json
{
  "data": [
    {
      "_id": "673e7a1f5c9d8e001234abcd",
      "name": "GPU-Worker-01",
      "role": ["worker"],
      "status": "online",
      "isLocal": false,
      "vpnIp": "10.0.1.5",
      "websocketConnected": true,
      "lastHeartbeat": "2025-11-21T10:05:00.000Z",
      "cpuCores": 32,
      "cpuModel": "AMD EPYC 7742",
      "ramTotal": 256,
      "ramUsage": 45.2,
      "gpuDevices": [
        {
          "deviceId": "GPU-0",
          "model": "NVIDIA A100",
          "memoryTotal": 80,
          "memoryFree": 60,
          "utilization": 25,
          "temperature": 45
        }
      ],
      "createdAt": "2025-11-21T10:00:00.000Z",
      "updatedAt": "2025-11-21T10:05:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

**curl Example:**

```bash
curl -X GET "http://localhost:3305/nodes?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4. Get Node by ID

Retrieves a single node by its ID.

**Endpoint:** `GET /nodes/:id`

**Response:** `200 OK`

```json
{
  "_id": "673e7a1f5c9d8e001234abcd",
  "name": "GPU-Worker-01",
  "role": ["worker"],
  "status": "online",
  "isLocal": false,
  "vpnIp": "10.0.1.5",
  "websocketConnected": true,
  "lastHeartbeat": "2025-11-21T10:05:00.000Z",
  "cpuCores": 32,
  "cpuModel": "AMD EPYC 7742",
  "ramTotal": 256,
  "ramUsage": 45.2,
  "gpuDevices": [
    {
      "deviceId": "GPU-0",
      "model": "NVIDIA A100",
      "memoryTotal": 80,
      "memoryFree": 60,
      "utilization": 25,
      "temperature": 45
    }
  ],
  "tokenMetadata": {
    "tokenGeneratedAt": "2025-11-21T10:00:00.000Z",
    "tokenExpiresAt": "2026-11-21T10:00:00.000Z"
  },
  "owner": {
    "orgId": "68dd05b175d9e3c17bf97f60"
  },
  "createdBy": "68dcf365f6a92c0d4911b619",
  "createdAt": "2025-11-21T10:00:00.000Z",
  "updatedAt": "2025-11-21T10:05:00.000Z"
}
```

**curl Example:**

```bash
curl -X GET http://localhost:3305/nodes/673e7a1f5c9d8e001234abcd \
  -H "Authorization: Bearer $TOKEN"
```

---

### 5. Update Node

Updates node information.

**Endpoint:** `PUT /nodes/:id`

**Request Body:**

```json
{
  "name": "GPU-Worker-01-Updated",
  "status": "maintenance"
}
```

**Response:** `200 OK`

```json
{
  "_id": "673e7a1f5c9d8e001234abcd",
  "name": "GPU-Worker-01-Updated",
  "role": ["worker"],
  "status": "maintenance",
  "updatedAt": "2025-11-21T10:10:00.000Z"
}
```

**curl Example:**

```bash
curl -X PUT http://localhost:3305/nodes/673e7a1f5c9d8e001234abcd \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPU-Worker-01-Updated",
    "status": "maintenance"
  }'
```

---

### 6. Delete Node

Soft deletes a node.

**Endpoint:** `DELETE /nodes/:id`

**Response:** `200 OK`

```json
{
  "message": "Node deleted successfully"
}
```

**curl Example:**

```bash
curl -X DELETE http://localhost:3305/nodes/673e7a1f5c9d8e001234abcd \
  -H "Authorization: Bearer $TOKEN"
```

---

## WebSocket Events

### Connection Flow

1. **Worker Connects** with JWT token in auth header
2. **CONNECTION_ACK** sent by server (success or error)
3. **NODE_REGISTER** sent by worker with system information
4. **REGISTER_ACK** sent by server
5. **TELEMETRY_HEARTBEAT** sent by worker every 30 seconds
6. **TELEMETRY_METRICS** sent by worker every 60 seconds

### Connection

**Client → Server:** WebSocket connection to `ws://localhost:3305/ws/node`

**Auth Header:**
```javascript
{
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Server → Client: CONNECTION_ACK**

Success:
```json
{
  "type": "CONNECTION_ACK",
  "messageId": "uuid-v4",
  "timestamp": "2025-11-21T10:00:00.000Z",
  "status": "success",
  "nodeId": "673e7a1f5c9d8e001234abcd",
  "controllerId": "controller-main",
  "serverVersion": "1.0.0"
}
```

Error:
```json
{
  "type": "CONNECTION_ACK",
  "messageId": "uuid-v4",
  "timestamp": "2025-11-21T10:00:00.000Z",
  "status": "error",
  "error": {
    "code": "NODE_NOT_FOUND",
    "message": "Node ID not found in database",
    "timestamp": "2025-11-21T10:00:00.000Z"
  }
}
```

### NODE_REGISTER

**Client → Server:**

```json
{
  "type": "NODE_REGISTER",
  "messageId": "uuid-v4",
  "timestamp": "2025-11-21T10:00:00.000Z",
  "data": {
    "hostname": "gpu-server-01",
    "ipAddress": "192.168.1.100",
    "publicIpAddress": "203.0.113.10",
    "os": "Ubuntu 22.04 LTS",
    "cpuCores": 32,
    "cpuModel": "AMD EPYC 7742",
    "ramTotal": 256,
    "diskTotal": 2048,
    "gpuDevices": [
      {
        "deviceId": "GPU-0",
        "model": "NVIDIA A100",
        "memoryTotal": 80,
        "memoryFree": 80,
        "utilization": 0,
        "temperature": 35
      }
    ],
    "daemonVersion": "1.0.0",
    "uptimeSeconds": 3600,
    "containerRuntime": "docker"
  }
}
```

**Server → Client: REGISTER_ACK**

```json
{
  "type": "REGISTER_ACK",
  "messageId": "uuid-v4",
  "timestamp": "2025-11-21T10:00:01.000Z",
  "data": {
    "status": "success",
    "nodeId": "673e7a1f5c9d8e001234abcd",
    "registeredAt": "2025-11-21T10:00:01.000Z",
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

### TELEMETRY_HEARTBEAT

**Client → Server:** (Every 30 seconds)

```json
{
  "type": "TELEMETRY_HEARTBEAT",
  "messageId": "uuid-v4",
  "timestamp": "2025-11-21T10:00:30.000Z",
  "data": {
    "status": "online",
    "uptimeSeconds": 3630,
    "cpuUsage": 45.2,
    "ramUsage": 62.8,
    "activeDeployments": 2,
    "gpuStatus": [
      {
        "deviceId": "GPU-0",
        "utilization": 85,
        "temperature": 72
      }
    ]
  }
}
```

### TELEMETRY_METRICS

**Client → Server:** (Every 60 seconds)

```json
{
  "type": "TELEMETRY_METRICS",
  "messageId": "uuid-v4",
  "timestamp": "2025-11-21T10:01:00.000Z",
  "data": {
    "timestamp": "2025-11-21T10:01:00.000Z",
    "cpu": {
      "usage": 45.2,
      "cores": 32,
      "temperature": 55
    },
    "memory": {
      "total": 256,
      "used": 160,
      "free": 96,
      "usage": 62.5
    },
    "disk": {
      "total": 2048,
      "used": 1024,
      "free": 1024,
      "usage": 50.0
    },
    "network": {
      "bytesIn": 1000000,
      "bytesOut": 500000
    },
    "gpus": [
      {
        "deviceId": "GPU-0",
        "model": "NVIDIA A100",
        "memoryTotal": 80,
        "memoryUsed": 20,
        "memoryFree": 60,
        "utilization": 85,
        "temperature": 72,
        "powerUsage": 250
      }
    ]
  }
}
```

---

## Error Codes

### REST API Errors

- `400 Bad Request`: Invalid request body or parameters
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Node not found
- `500 Internal Server Error`: Server error

### WebSocket Error Codes

- `NODE_NOT_FOUND`: Node ID not found in database
- `NODE_INACTIVE`: Node is disabled or banned
- `INVALID_TOKEN`: Invalid JWT token
- `TOKEN_EXPIRED`: JWT token has expired
- `REGISTRATION_FAILED`: Node registration failed
- `INTERNAL_ERROR`: Internal server error

---

## Best Practices

### 1. Node Creation Workflow

```bash
# Step 1: Create node via Portal API
NODE_ID=$(curl -s -X POST http://localhost:3305/nodes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPU-Worker-01",
    "role": ["worker"]
  }' | jq -r '._id')

# Step 2: Generate token and save installation script
curl -X POST http://localhost:3305/nodes/$NODE_ID/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 31536000}' | jq -r '.installScript' > install.sh

# Step 3: Transfer and run on worker machine
scp install.sh user@worker-machine:/tmp/
ssh user@worker-machine 'chmod +x /tmp/install.sh && /tmp/install.sh'
```

### 2. Monitoring Node Status

```bash
# Check node status
curl -s http://localhost:3305/nodes/$NODE_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.status'

# List all online nodes
curl -s "http://localhost:3305/nodes?status=online" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {name, status, lastHeartbeat}'
```

### 3. Token Security

- **Token Expiration**: Use reasonable expiration times (default: 1 year)
- **Token Storage**: Store tokens securely on worker machines
- **Token Rotation**: Regenerate tokens periodically
- **Token Revocation**: Delete node to revoke all tokens

### 4. WebSocket Reconnection

Workers should implement exponential backoff for reconnection:

```javascript
let reconnectDelay = 1000; // Start with 1 second
const maxReconnectDelay = 60000; // Max 60 seconds

socket.on('disconnect', () => {
  setTimeout(() => {
    socket.connect();
    reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
  }, reconnectDelay);
});

socket.on('connect', () => {
  reconnectDelay = 1000; // Reset on successful connection
});
```

### 5. Heartbeat Monitoring

- **Heartbeat Interval**: 30 seconds (configured in `REGISTER_ACK`)
- **Timeout Detection**: Controller marks node as `offline` if no heartbeat for 90 seconds
- **Recovery**: Node automatically transitions back to `online` when heartbeat resumes

### 6. Metrics Collection

- **Metrics Interval**: 60 seconds
- **Storage**: Currently updates timestamp only (TODO: implement time-series storage)
- **Future**: Metrics will be stored in time-series database for historical analysis

---

## Complete Example Workflow

```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:3305"
TOKEN="your-jwt-token-here"

echo "=== Creating Node ==="
NODE_RESPONSE=$(curl -s -X POST $API_URL/nodes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPU-Worker-Production-01",
    "role": ["worker"],
    "isLocal": false
  }')

NODE_ID=$(echo $NODE_RESPONSE | jq -r '._id')
echo "Node created with ID: $NODE_ID"

echo -e "\n=== Generating Token ==="
TOKEN_RESPONSE=$(curl -s -X POST $API_URL/nodes/$NODE_ID/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 31536000}')

echo "Token generated, expires at: $(echo $TOKEN_RESPONSE | jq -r '.expiresAt')"

echo -e "\n=== Saving Installation Script ==="
echo $TOKEN_RESPONSE | jq -r '.installScript' > install-node-$NODE_ID.sh
chmod +x install-node-$NODE_ID.sh
echo "Installation script saved to: install-node-$NODE_ID.sh"

echo -e "\n=== Node Details ==="
curl -s $API_URL/nodes/$NODE_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n=== Instructions ==="
echo "1. Transfer install-node-$NODE_ID.sh to worker machine"
echo "2. Run: ./install-node-$NODE_ID.sh"
echo "3. Worker will connect and register automatically"
echo "4. Check status: curl $API_URL/nodes/$NODE_ID -H 'Authorization: Bearer $TOKEN'"
```

---

## Appendix: Migration Notes

### Changes from Old Design

1. **Removed `nodeId` field**: Now using MongoDB `_id` as primary identifier
2. **New status enum**: Added `pending` and `installing` states
3. **Portal-first flow**: Nodes created via Portal before worker installation
4. **Token generation**: New `/nodes/:id/token` endpoint
5. **Connection validation**: Fixed to allow `pending` nodes to connect
6. **Hardware info optional**: Fields like `cpuCores`, `ramTotal` are now optional (populated during registration)

### Database Migration

If migrating from old design:

```javascript
// MongoDB migration script
db.nodes.updateMany(
  { nodeId: { $exists: true } },
  [
    {
      $set: {
        // nodeId field removed, _id is used instead
        status: {
          $cond: {
            if: { $eq: ["$status", "offline"] },
            then: "pending",
            else: "$status"
          }
        }
      }
    },
    {
      $unset: "nodeId"
    }
  ]
);
```
