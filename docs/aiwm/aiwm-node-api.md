# Node API Documentation - Frontend Integration Guide

## Overview

Node API quản lý các GPU worker node trong hệ thống Hydra. API này cung cấp đầy đủ các endpoint để tạo, quản lý, giám sát và xóa các node.

**Base URL:** `http://localhost:3305`
**Authentication:** Bearer Token (JWT)

---

## Table of Contents

1. [Entity Description](#entity-description)
2. [API Endpoints](#api-endpoints)
3. [Common Response Formats](#common-response-formats)
4. [Error Handling](#error-handling)
5. [Integration Examples](#integration-examples)

---

## Entity Description

### Node Entity

```typescript
interface Node {
  // Identifiers
  _id: string;                    // MongoDB Object ID (primary key)
  name: string;                   // Tên node do user đặt

  // Configuration
  role: NodeRole[];               // Vai trò của node
  status: NodeStatus;             // Trạng thái hiện tại
  isLocal: boolean;               // Node chạy local hay remote
  vpnIp?: string;                 // IP của VPN nếu có

  // Connection Status
  websocketConnected: boolean;    // WebSocket có đang kết nối không
  lastHeartbeat: Date;            // Lần heartbeat cuối cùng
  lastSeenAt?: Date;              // Lần xuất hiện cuối cùng

  // Hardware Info (populated sau khi worker register)
  hostname?: string;              // Tên máy
  ipAddress?: string;             // IP local
  publicIpAddress?: string;       // IP public
  os?: string;                    // Hệ điều hành
  cpuCores?: number;              // Số CPU core
  cpuModel?: string;              // Model CPU
  ramTotal?: number;              // Tổng RAM (GB)
  ramFree?: number;               // RAM còn trống (GB)
  diskTotal?: number;             // Tổng disk (GB)
  daemonVersion?: string;         // Version của worker daemon
  containerRuntime?: string;      // Docker, containerd, etc.

  // GPU Info
  gpuDevices?: GPUDevice[];       // Danh sách GPU

  // Metrics (updated theo heartbeat)
  uptimeSeconds?: number;         // Thời gian uptime (giây)
  cpuUsage?: number;              // % CPU đang dùng
  ramUsage?: number;              // % RAM đang dùng
  lastMetricsAt?: Date;           // Lần update metrics cuối

  // Token Info
  tokenMetadata?: {
    tokenGeneratedAt?: Date;      // Thời điểm tạo token
    tokenExpiresAt?: Date;        // Thời điểm token hết hạn
    tokenLastUsed?: Date;         // Lần dùng token cuối
  };

  // Ownership & Audit (từ BaseSchema)
  owner: {
    orgId?: string;               // Organization ID
    groupId?: string;             // Group ID
    agentId?: string;             // Agent ID
    appId?: string;               // App ID
  };
  createdBy: string;              // User ID của người tạo
  updatedBy?: string;             // User ID của người update
  deletedAt?: Date;               // Soft delete timestamp
  metadata?: Record<string, any>; // Custom metadata

  // Timestamps
  createdAt: Date;                // Ngày tạo
  updatedAt: Date;                // Ngày update
}
```

### GPUDevice

```typescript
interface GPUDevice {
  deviceId: string;      // ID của GPU (ví dụ: "GPU-0", "GPU-1")
  model: string;         // Model GPU (ví dụ: "NVIDIA A100")
  memoryTotal: number;   // Tổng VRAM (GB)
  memoryFree: number;    // VRAM còn trống (GB)
  utilization: number;   // % GPU đang dùng (0-100)
  temperature: number;   // Nhiệt độ GPU (°C)
}
```

### Enums

#### NodeRole

```typescript
enum NodeRole {
  CONTROLLER = 'controller',  // Node điều khiển
  WORKER = 'worker',          // Node worker (GPU)
  PROXY = 'proxy',            // Node proxy
  STORAGE = 'storage'         // Node storage
}
```

#### NodeStatus

```typescript
enum NodeStatus {
  PENDING = 'pending',           // Vừa tạo, chờ cài đặt
  INSTALLING = 'installing',     // Đang cài đặt worker daemon
  ONLINE = 'online',             // Đang hoạt động
  OFFLINE = 'offline',           // Không kết nối
  MAINTENANCE = 'maintenance'    // Đang bảo trì
}
```

### Status Lifecycle

```
┌─────────┐
│ pending │ ◄─── Tạo mới qua Portal
└────┬────┘
     │ Worker connects via WebSocket
     ▼
┌────────────┐
│ installing │ ◄─── Worker đang gửi thông tin đăng ký
└────┬───────┘
     │ Registration complete
     ▼
┌────────┐
│ online │ ◄─── Node hoạt động bình thường
└───┬─┬──┘
    │ │
    │ └──────► maintenance (manual update)
    │
    └──────────► offline (disconnect/timeout)
```

---

## API Endpoints

### 1. Create Node

Tạo node mới với trạng thái `pending`.

**Endpoint:** `POST /nodes`
**Auth Required:** Yes

**Request Body:**

```typescript
{
  name: string;           // Tên node (bắt buộc)
  role: NodeRole[];       // Vai trò (bắt buộc)
  isLocal?: boolean;      // Local hay không (mặc định: false)
  vpnIp?: string;         // VPN IP nếu có
}
```

**Example Request:**

```json
{
  "name": "GPU-Worker-Production-01",
  "role": ["worker"],
  "isLocal": false,
  "vpnIp": "10.0.1.100"
}
```

**Response:** `201 Created`

```json
{
  "_id": "673e7a1f5c9d8e001234abcd",
  "name": "GPU-Worker-Production-01",
  "role": ["worker"],
  "status": "pending",
  "isLocal": false,
  "vpnIp": "10.0.1.100",
  "websocketConnected": false,
  "lastHeartbeat": "2025-11-22T10:00:00.000Z",
  "owner": {
    "orgId": "68dd05b175d9e3c17bf97f60"
  },
  "createdBy": "68dcf365f6a92c0d4911b619",
  "createdAt": "2025-11-22T10:00:00.000Z",
  "updatedAt": "2025-11-22T10:00:00.000Z"
}
```

**Frontend Usage:**

```typescript
const createNode = async (data: CreateNodeDto) => {
  const response = await fetch('http://localhost:3305/nodes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to create node');
  }

  return await response.json();
};
```

---

### 2. Generate Node Token

Tạo JWT token và installation script cho worker node. **Chỉ gọi sau khi tạo node thành công.**

**Endpoint:** `POST /nodes/:id/token`
**Auth Required:** Yes

**Path Parameters:**
- `id` (string): Node ID

**Request Body:**

```typescript
{
  expiresIn?: number;  // Token hết hạn sau bao nhiêu giây (mặc định: 31536000 = 1 năm)
}
```

**Example Request:**

```json
{
  "expiresIn": 31536000
}
```

**Response:** `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzNlN2ExZjVjOWQ4ZTAwMTIzNGFiY2QiLCJ0eXBlIjoibm9kZSIsIm5vZGVJZCI6IjY3M2U3YTFmNWM5ZDhlMDAxMjM0YWJjZCIsImlhdCI6MTczMjI3MDgwMCwiZXhwIjoxNzYzODA2ODAwfQ.xyz123",
  "expiresAt": "2026-11-22T10:00:00.000Z",
  "installScript": "#!/bin/bash\n# Hydra Node Installation Script\n# Generated: 2025-11-22T10:00:00.000Z\n# Node: GPU-Worker-Production-01\n# Node ID: 673e7a1f5c9d8e001234abcd\n\necho \"Installing Hydra Node Daemon...\"\n\n# Configuration\nexport HYDRA_NODE_TOKEN=\"eyJhbGci...\"\nexport HYDRA_CONTROLLER_ENDPOINT=\"ws://localhost:3305\"\nexport HYDRA_NODE_ID=\"673e7a1f5c9d8e001234abcd\"\n\n# TODO: Add actual installation steps\n# 1. Download daemon binary\n# 2. Install systemd service\n# 3. Configure daemon with token\n# 4. Start service\n\necho \"Installation complete!\"\necho \"Node ID: 673e7a1f5c9d8e001234abcd\"\necho \"Controller: ws://localhost:3305\"\n"
}
```

**Frontend Usage:**

```typescript
const generateToken = async (nodeId: string, expiresIn: number = 31536000) => {
  const response = await fetch(`http://localhost:3305/nodes/${nodeId}/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ expiresIn })
  });

  if (!response.ok) {
    throw new Error('Failed to generate token');
  }

  return await response.json();
};

// Download installation script
const downloadInstallScript = (installScript: string, nodeId: string) => {
  const blob = new Blob([installScript], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `install-node-${nodeId}.sh`;
  a.click();
  URL.revokeObjectURL(url);
};
```

---

### 3. Get All Nodes

Lấy danh sách tất cả các node với phân trang.

**Endpoint:** `GET /nodes`
**Auth Required:** Yes

**Query Parameters:**
- `page` (number, optional): Số trang (mặc định: 1)
- `limit` (number, optional): Số item mỗi trang (mặc định: 10)

**Response:** `200 OK`

```json
{
  "data": [
    {
      "_id": "673e7a1f5c9d8e001234abcd",
      "name": "GPU-Worker-Production-01",
      "role": ["worker"],
      "status": "online",
      "isLocal": false,
      "vpnIp": "10.0.1.100",
      "websocketConnected": true,
      "lastHeartbeat": "2025-11-22T10:05:00.000Z",
      "hostname": "gpu-server-01",
      "ipAddress": "192.168.1.100",
      "publicIpAddress": "203.0.113.10",
      "os": "Ubuntu 22.04 LTS",
      "cpuCores": 32,
      "cpuModel": "AMD EPYC 7742",
      "ramTotal": 256,
      "ramFree": 140,
      "ramUsage": 45.3,
      "cpuUsage": 32.5,
      "diskTotal": 2048,
      "gpuDevices": [
        {
          "deviceId": "GPU-0",
          "model": "NVIDIA A100",
          "memoryTotal": 80,
          "memoryFree": 60,
          "utilization": 25,
          "temperature": 45
        },
        {
          "deviceId": "GPU-1",
          "model": "NVIDIA A100",
          "memoryTotal": 80,
          "memoryFree": 75,
          "utilization": 6,
          "temperature": 38
        }
      ],
      "daemonVersion": "1.0.0",
      "containerRuntime": "docker",
      "uptimeSeconds": 86400,
      "createdAt": "2025-11-22T10:00:00.000Z",
      "updatedAt": "2025-11-22T10:05:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

**Frontend Usage:**

```typescript
interface PaginationParams {
  page?: number;
  limit?: number;
}

const getNodes = async (params: PaginationParams = {}) => {
  const queryParams = new URLSearchParams({
    page: String(params.page || 1),
    limit: String(params.limit || 10)
  });

  const response = await fetch(`http://localhost:3305/nodes?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch nodes');
  }

  return await response.json();
};
```

---

### 4. Get Node by ID

Lấy thông tin chi tiết của một node.

**Endpoint:** `GET /nodes/:id`
**Auth Required:** Yes

**Path Parameters:**
- `id` (string): Node ID

**Response:** `200 OK`

```json
{
  "_id": "673e7a1f5c9d8e001234abcd",
  "name": "GPU-Worker-Production-01",
  "role": ["worker"],
  "status": "online",
  "isLocal": false,
  "vpnIp": "10.0.1.100",
  "websocketConnected": true,
  "lastHeartbeat": "2025-11-22T10:05:00.000Z",
  "lastSeenAt": "2025-11-22T10:05:00.000Z",
  "hostname": "gpu-server-01",
  "ipAddress": "192.168.1.100",
  "publicIpAddress": "203.0.113.10",
  "os": "Ubuntu 22.04 LTS",
  "cpuCores": 32,
  "cpuModel": "AMD EPYC 7742",
  "ramTotal": 256,
  "ramFree": 140,
  "ramUsage": 45.3,
  "cpuUsage": 32.5,
  "diskTotal": 2048,
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
  "daemonVersion": "1.0.0",
  "containerRuntime": "docker",
  "uptimeSeconds": 86400,
  "tokenMetadata": {
    "tokenGeneratedAt": "2025-11-22T10:00:30.000Z",
    "tokenExpiresAt": "2026-11-22T10:00:30.000Z"
  },
  "owner": {
    "orgId": "68dd05b175d9e3c17bf97f60"
  },
  "createdBy": "68dcf365f6a92c0d4911b619",
  "createdAt": "2025-11-22T10:00:00.000Z",
  "updatedAt": "2025-11-22T10:05:00.000Z"
}
```

**Frontend Usage:**

```typescript
const getNodeById = async (nodeId: string) => {
  const response = await fetch(`http://localhost:3305/nodes/${nodeId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Node not found');
    }
    throw new Error('Failed to fetch node');
  }

  return await response.json();
};
```

---

### 5. Update Node

Cập nhật thông tin node.

**Endpoint:** `PUT /nodes/:id`
**Auth Required:** Yes

**Path Parameters:**
- `id` (string): Node ID

**Request Body:**

```typescript
{
  name?: string;              // Tên mới
  role?: NodeRole[];          // Vai trò mới
  status?: NodeStatus;        // Trạng thái mới
  isLocal?: boolean;          // Local flag
  vpnIp?: string;             // VPN IP
  websocketConnected?: boolean;
  lastHeartbeat?: Date;
  cpuCores?: number;
  ramTotal?: number;
  ramFree?: number;
  gpuDevices?: GPUDevice[];
  // ... các field khác
}
```

**Example Request:**

```json
{
  "name": "GPU-Worker-Production-01-Updated",
  "status": "maintenance"
}
```

**Response:** `200 OK`

```json
{
  "_id": "673e7a1f5c9d8e001234abcd",
  "name": "GPU-Worker-Production-01-Updated",
  "role": ["worker"],
  "status": "maintenance",
  "isLocal": false,
  "vpnIp": "10.0.1.100",
  "websocketConnected": true,
  "updatedAt": "2025-11-22T10:10:00.000Z"
}
```

**Frontend Usage:**

```typescript
const updateNode = async (nodeId: string, data: Partial<Node>) => {
  const response = await fetch(`http://localhost:3305/nodes/${nodeId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to update node');
  }

  return await response.json();
};
```

---

### 6. Delete Node

Xóa node (soft delete).

**Endpoint:** `DELETE /nodes/:id`
**Auth Required:** Yes

**Path Parameters:**
- `id` (string): Node ID

**Response:** `200 OK`

```json
{
  "message": "Node deleted successfully"
}
```

**Frontend Usage:**

```typescript
const deleteNode = async (nodeId: string) => {
  const response = await fetch(`http://localhost:3305/nodes/${nodeId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete node');
  }

  return await response.json();
};
```

---

## Common Response Formats

### Success Response

```typescript
{
  data?: any;           // Response data
  message?: string;     // Success message
  total?: number;       // Total items (for pagination)
  page?: number;        // Current page (for pagination)
  limit?: number;       // Items per page (for pagination)
}
```

### Error Response

```typescript
{
  statusCode: number;   // HTTP status code
  message: string;      // Error message
  error?: string;       // Error type
  timestamp: string;    // ISO timestamp
  path: string;         // Request path
}
```

**Example:**

```json
{
  "statusCode": 404,
  "message": "Node with ID 673e7a1f5c9d8e001234abcd not found",
  "error": "Not Found",
  "timestamp": "2025-11-22T10:00:00.000Z",
  "path": "/nodes/673e7a1f5c9d8e001234abcd"
}
```

---

## Error Handling

### HTTP Status Codes

- `200 OK` - Request thành công
- `201 Created` - Tạo resource thành công
- `400 Bad Request` - Request body không hợp lệ
- `401 Unauthorized` - Thiếu hoặc token không hợp lệ
- `403 Forbidden` - Không có quyền truy cập
- `404 Not Found` - Node không tồn tại
- `500 Internal Server Error` - Lỗi server

### Common Error Messages

```typescript
// 400 Bad Request
{
  "statusCode": 400,
  "message": [
    "name must be a string",
    "role must be an array"
  ],
  "error": "Bad Request"
}

// 401 Unauthorized
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}

// 404 Not Found
{
  "statusCode": 404,
  "message": "Node with ID 673e7a1f5c9d8e001234abcd not found",
  "error": "Not Found"
}
```

---

## Integration Examples

### Complete Node Creation Flow

```typescript
// Bước 1: Tạo node
const newNode = await createNode({
  name: "GPU-Worker-Production-01",
  role: ["worker"],
  isLocal: false
});

console.log('Node created:', newNode._id);

// Bước 2: Generate token
const tokenData = await generateToken(newNode._id);

console.log('Token:', tokenData.token);
console.log('Expires at:', tokenData.expiresAt);

// Bước 3: Download installation script
downloadInstallScript(tokenData.installScript, newNode._id);

// Bước 4: Hiển thị hướng dẫn cho user
alert(`
  Node created successfully!

  Next steps:
  1. Download the installation script (install-node-${newNode._id}.sh)
  2. Transfer it to your worker machine
  3. Run: chmod +x install-node-${newNode._id}.sh && ./install-node-${newNode._id}.sh
  4. Wait for node status to change to 'online'
`);

// Bước 5: Poll để check status
const checkNodeStatus = async () => {
  const node = await getNodeById(newNode._id);
  console.log('Node status:', node.status);

  if (node.status === 'online') {
    alert('Node is now online and ready!');
  } else if (node.status === 'pending' || node.status === 'installing') {
    // Poll lại sau 5 giây
    setTimeout(checkNodeStatus, 5000);
  }
};

setTimeout(checkNodeStatus, 5000);
```

### Node List with Real-time Updates

```typescript
interface NodesListState {
  nodes: Node[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
}

const NodesList: React.FC = () => {
  const [state, setState] = useState<NodesListState>({
    nodes: [],
    total: 0,
    page: 1,
    limit: 10,
    loading: false
  });

  // Load nodes
  const loadNodes = async (page: number = 1, limit: number = 10) => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await getNodes({ page, limit });
      setState({
        nodes: response.data,
        total: response.total,
        page: response.page,
        limit: response.limit,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load nodes:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Refresh every 10 seconds
  useEffect(() => {
    loadNodes(state.page, state.limit);

    const interval = setInterval(() => {
      loadNodes(state.page, state.limit);
    }, 10000);

    return () => clearInterval(interval);
  }, [state.page, state.limit]);

  return (
    <div>
      {state.loading ? (
        <div>Loading...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>GPU</th>
              <th>CPU</th>
              <th>RAM</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {state.nodes.map(node => (
              <tr key={node._id}>
                <td>{node.name}</td>
                <td>
                  <StatusBadge status={node.status} />
                </td>
                <td>
                  {node.gpuDevices?.length || 0} GPU
                  {node.gpuDevices?.map(gpu => (
                    <div key={gpu.deviceId}>
                      {gpu.model} ({gpu.utilization}%)
                    </div>
                  ))}
                </td>
                <td>{node.cpuUsage?.toFixed(1)}%</td>
                <td>{node.ramUsage?.toFixed(1)}%</td>
                <td>
                  {node.lastSeenAt ?
                    formatDistanceToNow(new Date(node.lastSeenAt)) + ' ago' :
                    'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination
        current={state.page}
        total={state.total}
        pageSize={state.limit}
        onChange={(page) => loadNodes(page, state.limit)}
      />
    </div>
  );
};
```

### Node Detail with Auto-refresh

```typescript
const NodeDetail: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const [node, setNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);

  const loadNode = async () => {
    try {
      const data = await getNodeById(nodeId);
      setNode(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load node:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNode();

    // Auto-refresh every 5 seconds
    const interval = setInterval(loadNode, 5000);

    return () => clearInterval(interval);
  }, [nodeId]);

  if (loading) return <div>Loading...</div>;
  if (!node) return <div>Node not found</div>;

  return (
    <div>
      <h1>{node.name}</h1>

      <div className="status">
        <StatusBadge status={node.status} />
        {node.websocketConnected && <span>🟢 Connected</span>}
      </div>

      <div className="info">
        <h2>System Info</h2>
        <p>OS: {node.os}</p>
        <p>Hostname: {node.hostname}</p>
        <p>IP: {node.ipAddress} / {node.publicIpAddress}</p>
        <p>Uptime: {formatDuration(node.uptimeSeconds || 0)}</p>
      </div>

      <div className="resources">
        <h2>Resources</h2>
        <div>
          <h3>CPU</h3>
          <p>Model: {node.cpuModel}</p>
          <p>Cores: {node.cpuCores}</p>
          <ProgressBar value={node.cpuUsage || 0} max={100} />
        </div>

        <div>
          <h3>RAM</h3>
          <p>Total: {node.ramTotal} GB</p>
          <p>Free: {node.ramFree} GB</p>
          <ProgressBar value={node.ramUsage || 0} max={100} />
        </div>

        <div>
          <h3>GPUs</h3>
          {node.gpuDevices?.map(gpu => (
            <div key={gpu.deviceId}>
              <h4>{gpu.model} ({gpu.deviceId})</h4>
              <p>VRAM: {gpu.memoryFree}/{gpu.memoryTotal} GB</p>
              <p>Utilization: {gpu.utilization}%</p>
              <p>Temperature: {gpu.temperature}°C</p>
              <ProgressBar value={gpu.utilization} max={100} />
            </div>
          ))}
        </div>
      </div>

      <div className="actions">
        <button onClick={() => updateNode(nodeId, { status: 'maintenance' })}>
          Set Maintenance
        </button>
        <button onClick={() => deleteNode(nodeId)}>
          Delete Node
        </button>
      </div>
    </div>
  );
};
```

### Status Badge Component

```typescript
const StatusBadge: React.FC<{ status: NodeStatus }> = ({ status }) => {
  const statusConfig = {
    pending: { color: 'gray', icon: '⏳', text: 'Pending' },
    installing: { color: 'blue', icon: '🔧', text: 'Installing' },
    online: { color: 'green', icon: '✓', text: 'Online' },
    offline: { color: 'red', icon: '✗', text: 'Offline' },
    maintenance: { color: 'orange', icon: '🔧', text: 'Maintenance' }
  };

  const config = statusConfig[status] || statusConfig.offline;

  return (
    <span
      className={`badge badge-${config.color}`}
      style={{
        backgroundColor: config.color,
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px'
      }}
    >
      {config.icon} {config.text}
    </span>
  );
};
```

---

## TypeScript Definitions

```typescript
// types/node.ts

export enum NodeRole {
  CONTROLLER = 'controller',
  WORKER = 'worker',
  PROXY = 'proxy',
  STORAGE = 'storage'
}

export enum NodeStatus {
  PENDING = 'pending',
  INSTALLING = 'installing',
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance'
}

export interface GPUDevice {
  deviceId: string;
  model: string;
  memoryTotal: number;
  memoryFree: number;
  utilization: number;
  temperature: number;
}

export interface TokenMetadata {
  tokenGeneratedAt?: Date;
  tokenExpiresAt?: Date;
  tokenLastUsed?: Date;
}

export interface NodeOwner {
  orgId?: string;
  groupId?: string;
  agentId?: string;
  appId?: string;
}

export interface Node {
  _id: string;
  name: string;
  role: NodeRole[];
  status: NodeStatus;
  isLocal: boolean;
  vpnIp?: string;
  websocketConnected: boolean;
  lastHeartbeat: Date;
  lastSeenAt?: Date;
  hostname?: string;
  ipAddress?: string;
  publicIpAddress?: string;
  os?: string;
  cpuCores?: number;
  cpuModel?: string;
  ramTotal?: number;
  ramFree?: number;
  diskTotal?: number;
  gpuDevices?: GPUDevice[];
  daemonVersion?: string;
  containerRuntime?: string;
  uptimeSeconds?: number;
  cpuUsage?: number;
  ramUsage?: number;
  lastMetricsAt?: Date;
  tokenMetadata?: TokenMetadata;
  owner: NodeOwner;
  createdBy: string;
  updatedBy?: string;
  deletedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNodeDto {
  name: string;
  role: NodeRole[];
  isLocal?: boolean;
  vpnIp?: string;
}

export interface UpdateNodeDto {
  name?: string;
  role?: NodeRole[];
  status?: NodeStatus;
  isLocal?: boolean;
  vpnIp?: string;
}

export interface GenerateTokenDto {
  expiresIn?: number;
}

export interface GenerateTokenResponse {
  token: string;
  expiresAt: Date;
  installScript: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## Best Practices

### 1. Polling Strategy

```typescript
// Sử dụng exponential backoff cho polling
class NodePoller {
  private intervalId?: NodeJS.Timeout;
  private delay = 5000; // Start with 5 seconds
  private maxDelay = 60000; // Max 60 seconds

  start(nodeId: string, onUpdate: (node: Node) => void) {
    const poll = async () => {
      try {
        const node = await getNodeById(nodeId);
        onUpdate(node);

        // Reset delay on success
        this.delay = 5000;
      } catch (error) {
        console.error('Polling error:', error);

        // Increase delay on error
        this.delay = Math.min(this.delay * 2, this.maxDelay);
      }

      this.intervalId = setTimeout(poll, this.delay);
    };

    poll();
  }

  stop() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
    }
  }
}
```

### 2. Error Handling

```typescript
const handleApiError = (error: any) => {
  if (error.response) {
    // Server responded with error
    const { statusCode, message } = error.response.data;

    switch (statusCode) {
      case 401:
        // Redirect to login
        window.location.href = '/login';
        break;
      case 403:
        alert('You do not have permission to perform this action');
        break;
      case 404:
        alert('Node not found');
        break;
      default:
        alert(message || 'An error occurred');
    }
  } else if (error.request) {
    // Request made but no response
    alert('Cannot connect to server. Please check your network connection.');
  } else {
    // Other errors
    alert('An unexpected error occurred');
  }
};
```

### 3. Caching Strategy

```typescript
// Simple cache với TTL
class NodeCache {
  private cache = new Map<string, { data: Node; timestamp: number }>();
  private ttl = 5000; // 5 seconds

  get(nodeId: string): Node | null {
    const cached = this.cache.get(nodeId);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(nodeId);
      return null;
    }

    return cached.data;
  }

  set(nodeId: string, data: Node) {
    this.cache.set(nodeId, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}
```

---

## Notes

1. **Authentication**: Tất cả API đều yêu cầu JWT token trong header `Authorization: Bearer <token>`

2. **Pagination**: Sử dụng query parameters `page` và `limit` cho các endpoint list

3. **Status Updates**: Status của node tự động update khi worker daemon kết nối/ngắt kết nối

4. **Real-time Data**: Hardware metrics (CPU, RAM, GPU) được update theo heartbeat (mỗi 30 giây)

5. **Token Expiration**: Token mặc định hết hạn sau 1 năm, có thể customize khi generate

6. **Soft Delete**: DELETE endpoint chỉ soft delete (set `deletedAt`), không xóa vĩnh viễn

7. **WebSocket**: Worker daemon kết nối qua WebSocket để gửi heartbeat và metrics, frontend chỉ dùng REST API
