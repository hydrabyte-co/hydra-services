# Virtual Machine Management API - Frontend Integration Guide

**Service:** AIWM
**Module:** Resources (Virtual Machine)
**Base URL:** `http://localhost:3305` (development)
**Authentication:** Bearer Token (JWT)
**Version:** 1.0 (V1 - Metadata only, mock actions)
**Date:** 2025-12-03

---

## 📋 Tổng quan

API quản lý Virtual Machines (VMs) sử dụng KVM/libvirt. Frontend có thể tạo, quản lý lifecycle, monitoring và snapshot VMs.

**⚠️ Lưu ý V1:**
- CRUD operations hoạt động đầy đủ với database
- Lifecycle actions (start/stop/restart) trả về **mock responses**
- Monitoring data (logs/metrics/console) là **mock data**
- Snapshots là **mock data**
- **V2 sẽ tích hợp thật với worker nodes**

---

## 🎯 Use Cases - Khi nào dùng VM?

| Use Case | Mô tả | Ví dụ |
|----------|-------|-------|
| **Development Environment** | Môi trường dev/test isolated | Dev VM với GPU, SSH access |
| **GPU Workloads** | Training, rendering, simulation | ML training VM với 4x A100 GPUs |
| **Windows Applications** | Chạy Windows apps | Windows Server 2022 VM |
| **Legacy Software** | Software yêu cầu specific OS | CentOS 7 cho legacy apps |
| **Persistent Workloads** | Long-running services cần persistent disk | Database server, file server |

**Khi nào KHÔNG nên dùng VM:**
- Microservices (dùng Container)
- Stateless applications (dùng Container)
- Model inference (dùng Inference Container)

---

## 🔐 Authentication

```http
Authorization: Bearer <your-jwt-token>
```

---

## 📊 API Endpoints Overview

| Method | Endpoint | Purpose | V1 Status |
|--------|----------|---------|-----------|
| **CRUD Operations** ||||
| POST | `/resources` | Tạo VM mới | ✅ Fully functional |
| GET | `/resources` | List VMs (với filter) | ✅ Fully functional |
| GET | `/resources/:id` | Get VM details | ✅ Fully functional |
| PATCH | `/resources/:id` | Update VM config | ✅ Fully functional |
| DELETE | `/resources/:id` | Soft delete VM | ✅ Fully functional |
| **Lifecycle** ||||
| POST | `/resources/:id/start` | Start VM | ⚠️ Mock response |
| POST | `/resources/:id/stop` | Stop VM | ⚠️ Mock response |
| POST | `/resources/:id/restart` | Restart VM | ⚠️ Mock response |
| **Monitoring** ||||
| GET | `/resources/:id/status` | Get VM status | ⚠️ From DB only |
| GET | `/resources/:id/logs` | Get VM logs | ⚠️ Mock data |
| GET | `/resources/:id/metrics` | Get CPU/RAM/GPU metrics | ⚠️ Mock data |
| GET | `/resources/:id/console` | Get VNC console URL | ⚠️ Mock URL |
| **Snapshots** ||||
| POST | `/resources/:id/snapshots` | Create snapshot | ⚠️ Mock data |
| GET | `/resources/:id/snapshots` | List snapshots | ⚠️ Mock data |
| POST | `/resources/:id/snapshots/:snapshotId/restore` | Restore snapshot | ⚠️ Mock response |
| DELETE | `/resources/:id/snapshots/:snapshotId` | Delete snapshot | ⚠️ Mock response |

---

## 🆕 API 1: Create Virtual Machine

### Endpoint
```
POST /resources
```

### Request Body

```typescript
{
  name: string;                    // Tên VM (max 100 chars)
  description?: string;            // Mô tả (max 500 chars)
  resourceType: 'virtual-machine'; // Fixed value
  nodeId: string;                  // ID của node sẽ chạy VM
  config: {
    type: 'virtual-machine';       // Config discriminator
    osImage: string;               // OS image (enum)
    vcpus: number;                 // Số vCPUs (1-128)
    ramMB: number;                 // RAM in MB (min 512)
    diskGB: number;                // Disk size in GB (min 10)
    gpuConfig?: {                  // Optional GPU
      enabled: boolean,
      mode: 'passthrough' | 'mig',
      deviceIds?: string[],        // For passthrough
      migProfile?: string          // For MIG mode
    },
    networkConfig: {               // Required network config
      mode: 'bridge-vlan',         // Fixed for V1
      ipMode: 'static' | 'dhcp',
      ipAddress?: string,          // Required if static
      netmask?: string,            // Required if static
      gateway?: string,            // Required if static
      vlanId?: number              // Optional VLAN
    },
    cloudInit?: {                  // Optional cloud-init
      hostname?: string,
      sshPublicKey?: string,
      username?: string,           // Default: ubuntu
      password?: string
    }
  }
}
```

### Example Request

```bash
curl -X POST "http://localhost:3305/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dev VM Ubuntu 22.04",
    "description": "Development VM with GPU passthrough",
    "resourceType": "virtual-machine",
    "nodeId": "675a1b2c3d4e5f6a7b8c9d0e",
    "config": {
      "type": "virtual-machine",
      "osImage": "ubuntu-22.04",
      "vcpus": 8,
      "ramMB": 32768,
      "diskGB": 100,
      "gpuConfig": {
        "enabled": true,
        "mode": "passthrough",
        "deviceIds": ["GPU-0", "GPU-1"]
      },
      "networkConfig": {
        "mode": "bridge-vlan",
        "ipMode": "static",
        "ipAddress": "192.168.100.10",
        "netmask": "255.255.255.0",
        "gateway": "192.168.100.1",
        "vlanId": 100
      },
      "cloudInit": {
        "hostname": "dev-vm-01",
        "sshPublicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC...",
        "username": "ubuntu"
      }
    }
  }'
```

### Response

```json
{
  "_id": "675b2c3d4e5f6a7b8c9d0e0f",
  "name": "Dev VM Ubuntu 22.04",
  "description": "Development VM with GPU passthrough",
  "resourceType": "virtual-machine",
  "nodeId": "675a1b2c3d4e5f6a7b8c9d0e",
  "status": "queued",
  "config": {
    "type": "virtual-machine",
    "osImage": "ubuntu-22.04",
    "vcpus": 8,
    "ramMB": 32768,
    "diskGB": 100,
    "gpuConfig": {
      "enabled": true,
      "mode": "passthrough",
      "deviceIds": ["GPU-0", "GPU-1"]
    },
    "networkConfig": {
      "mode": "bridge-vlan",
      "ipMode": "static",
      "ipAddress": "192.168.100.10",
      "netmask": "255.255.255.0",
      "gateway": "192.168.100.1",
      "vlanId": 100
    },
    "cloudInit": {
      "hostname": "dev-vm-01",
      "sshPublicKey": "ssh-rsa AAAAB3...",
      "username": "ubuntu"
    }
  },
  "owner": {
    "userId": "675a1b2c3d4e5f6a7b8c9d0d",
    "orgId": "675a1b2c3d4e5f6a7b8c9d0c"
  },
  "createdBy": "675a1b2c3d4e5f6a7b8c9d0d",
  "createdAt": "2025-12-03T10:00:00.000Z",
  "updatedAt": "2025-12-03T10:00:00.000Z"
}
```

### Field Descriptions - Config

| Field | Type | Required | Mô tả | UI Component | Validation |
|-------|------|----------|-------|--------------|------------|
| **Basic Info** ||||||
| `name` | string | ✅ | Tên VM | Text input | Max 100 chars |
| `description` | string | ❌ | Mô tả VM | Textarea | Max 500 chars |
| `nodeId` | string | ✅ | Node chạy VM | Select dropdown (list nodes) | Must exist |
| **OS & Resources** ||||||
| `osImage` | enum | ✅ | OS Image | Select/Radio (8 options) | See OS Images table |
| `vcpus` | number | ✅ | Số vCPUs | Number input / Slider | 1-128 |
| `ramMB` | number | ✅ | RAM (MB) | Number input (convert to GB) | Min 512 MB |
| `diskGB` | number | ✅ | Disk (GB) | Number input | Min 10 GB |
| **GPU (Optional)** ||||||
| `gpuConfig.enabled` | boolean | ❌ | Enable GPU | Checkbox/Switch | - |
| `gpuConfig.mode` | enum | If enabled | GPU mode | Radio buttons | `passthrough` or `mig` |
| `gpuConfig.deviceIds` | string[] | If passthrough | GPU devices | Multi-select | From node's available GPUs |
| `gpuConfig.migProfile` | string | If MIG | MIG profile | Select dropdown | See MIG Profiles table |
| **Network** ||||||
| `networkConfig.mode` | string | ✅ | Network mode | Disabled input | Fixed `bridge-vlan` |
| `networkConfig.ipMode` | enum | ✅ | IP mode | Radio buttons | `static` or `dhcp` |
| `networkConfig.ipAddress` | string | If static | Static IP | Text input | Valid IPv4 |
| `networkConfig.netmask` | string | If static | Netmask | Text input | Valid netmask |
| `networkConfig.gateway` | string | If static | Gateway | Text input | Valid IPv4 |
| `networkConfig.vlanId` | number | ❌ | VLAN ID | Number input | 1-4094 |
| **Cloud-Init (Optional)** ||||||
| `cloudInit.hostname` | string | ❌ | Hostname | Text input | Valid hostname |
| `cloudInit.sshPublicKey` | string | ❌ | SSH public key | Textarea | Valid SSH key format |
| `cloudInit.username` | string | ❌ | Username | Text input | Default `ubuntu` |
| `cloudInit.password` | string | ❌ | Initial password | Password input | Min 8 chars recommended |

### OS Images (osImage enum)

| Value | Display Name | Icon | Recommended For |
|-------|--------------|------|-----------------|
| `ubuntu-22.04` | Ubuntu 22.04 LTS (Jammy) | 🐧 | General purpose, modern apps |
| `ubuntu-20.04` | Ubuntu 20.04 LTS (Focal) | 🐧 | Stability, long-term support |
| `centos-8` | CentOS 8 | 🎩 | Enterprise apps, RHEL compatibility |
| `centos-7` | CentOS 7 | 🎩 | Legacy enterprise apps |
| `debian-12` | Debian 12 (Bookworm) | 🌀 | Stability, security |
| `debian-11` | Debian 11 (Bullseye) | 🌀 | Production servers |
| `windows-server-2022` | Windows Server 2022 | 🪟 | Windows apps, Active Directory |
| `windows-server-2019` | Windows Server 2019 | 🪟 | Legacy Windows apps |

### MIG Profiles (migProfile)

| Profile | GPU Instances | Memory | Use Case |
|---------|---------------|--------|----------|
| `1g.5gb` | 1 | 5 GB | Small inference, testing |
| `1g.10gb` | 1 | 10 GB | Medium inference |
| `2g.10gb` | 2 | 10 GB | Multi-tenant inference |
| `3g.20gb` | 3 | 20 GB | Large models |
| `4g.20gb` | 4 | 20 GB | Very large models |
| `7g.40gb` | 7 | 40 GB | Full GPU (A100 80GB) |

**Note:** MIG chỉ available trên NVIDIA A100/A30/H100 GPUs

### UI Recommendations

#### Form Layout

```
┌─ Create Virtual Machine ──────────────────────────────┐
│ Basic Information                                      │
│ ├─ Name: [________________________]                    │
│ ├─ Description: [____________________]                 │
│ └─ Node: [Select Node ▼]                              │
│                                                        │
│ Operating System                                       │
│ └─ [Ubuntu 22.04] [Ubuntu 20.04] [CentOS 8] ...      │
│                                                        │
│ Resources                                              │
│ ├─ vCPUs: [8 ━━━━━━━●──] (1-128)                     │
│ ├─ RAM: [32 GB ━━━━●────] (512 MB - 1 TB)            │
│ └─ Disk: [100 GB ━━●──────] (10 GB - 10 TB)          │
│                                                        │
│ GPU Configuration                   [✓] Enable GPU    │
│ ├─ Mode: ○ Passthrough  ○ MIG                        │
│ └─ Devices: [☑ GPU-0] [☑ GPU-1] [ ] GPU-2           │
│                                                        │
│ Network                                                │
│ ├─ IP Mode: ○ Static  ○ DHCP                         │
│ ├─ IP Address: [192.168.100.10]                      │
│ ├─ Netmask: [255.255.255.0]                          │
│ ├─ Gateway: [192.168.100.1]                          │
│ └─ VLAN ID: [100] (optional)                         │
│                                                        │
│ Cloud-Init (Advanced)              [▶ Expand]         │
│                                                        │
│ [Cancel]                           [Create VM →]      │
└────────────────────────────────────────────────────────┘
```

#### Validation Messages

```typescript
const validationRules = {
  name: {
    required: "VM name is required",
    maxLength: "Name cannot exceed 100 characters"
  },
  vcpus: {
    min: "Minimum 1 vCPU required",
    max: "Maximum 128 vCPUs allowed"
  },
  ramMB: {
    min: "Minimum 512 MB RAM required",
    pattern: "Must be a number"
  },
  diskGB: {
    min: "Minimum 10 GB disk required"
  },
  gpuConfig: {
    deviceIds: {
      required: "At least one GPU device required for passthrough mode"
    },
    migProfile: {
      required: "MIG profile required for MIG mode"
    }
  },
  networkConfig: {
    ipAddress: {
      required: "IP address required for static mode",
      pattern: "Invalid IP address format"
    }
  }
};
```

---

## 📋 API 2: List Virtual Machines

### Endpoint
```
GET /resources?resourceType=virtual-machine
```

### Query Parameters

| Parameter | Type | Required | Mô tả | Example |
|-----------|------|----------|-------|---------|
| `resourceType` | string | ✅ | Filter by type | `virtual-machine` |
| `status` | string | ❌ | Filter by status | `running` |
| `nodeId` | string | ❌ | Filter by node | `675a...` |
| `page` | number | ❌ | Page number | `1` |
| `limit` | number | ❌ | Items per page | `20` |
| `sortBy` | string | ❌ | Sort field | `createdAt` |
| `sortOrder` | string | ❌ | Sort direction | `desc` |

### Example Request

```bash
curl -X GET "http://localhost:3305/resources?resourceType=virtual-machine&status=running&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Response

```json
{
  "data": [
    {
      "_id": "675b2c3d4e5f6a7b8c9d0e0f",
      "name": "Dev VM Ubuntu 22.04",
      "description": "Development VM with GPU",
      "resourceType": "virtual-machine",
      "nodeId": "675a1b2c3d4e5f6a7b8c9d0e",
      "status": "running",
      "config": {
        "type": "virtual-machine",
        "osImage": "ubuntu-22.04",
        "vcpus": 8,
        "ramMB": 32768,
        "diskGB": 100,
        "gpuConfig": {
          "enabled": true,
          "mode": "passthrough",
          "deviceIds": ["GPU-0", "GPU-1"]
        },
        "networkConfig": {
          "ipMode": "static",
          "ipAddress": "192.168.100.10"
        }
      },
      "runtime": {
        "id": "vm-675b2c3d",
        "endpoint": "192.168.100.10:22",
        "allocatedGPU": ["GPU-0", "GPU-1"],
        "allocatedCPU": 8,
        "allocatedRAM": 32,
        "startedAt": "2025-12-03T10:05:00.000Z"
      },
      "lastHealthCheck": "2025-12-03T10:30:00.000Z",
      "createdAt": "2025-12-03T10:00:00.000Z",
      "updatedAt": "2025-12-03T10:05:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  },
  "statistics": {
    "byStatus": {
      "queued": 2,
      "deploying": 1,
      "running": 10,
      "stopped": 2,
      "failed": 0
    }
  }
}
```

### Field Descriptions - Response

| Field | Type | Mô tả | UI Display |
|-------|------|-------|------------|
| **Basic Info** ||||
| `_id` | string | MongoDB ObjectId | Hidden (use for API calls) |
| `name` | string | Tên VM | **Primary text**, bold |
| `description` | string | Mô tả | Secondary text, gray |
| `resourceType` | string | Luôn `virtual-machine` | Badge "VM" |
| `status` | enum | Trạng thái hiện tại | Badge với màu (xem Status table) |
| **Config Summary** ||||
| `config.osImage` | string | OS đang dùng | Icon + text (Ubuntu logo) |
| `config.vcpus` | number | Số vCPUs | `8 vCPUs` |
| `config.ramMB` | number | RAM in MB | Convert to GB: `32 GB` |
| `config.diskGB` | number | Disk size | `100 GB` |
| `config.gpuConfig.enabled` | boolean | Có GPU không | Icon GPU nếu true |
| `config.gpuConfig.deviceIds` | string[] | GPU devices | `2x GPU` hoặc list |
| `config.networkConfig.ipAddress` | string | IP address | `192.168.100.10` với copy button |
| **Runtime Info** ||||
| `runtime.id` | string | VM ID trong libvirt | Tooltip hoặc details |
| `runtime.endpoint` | string | SSH endpoint | `192.168.100.10:22` với copy |
| `runtime.allocatedGPU` | string[] | GPUs đã allocate | `GPU-0, GPU-1` |
| `runtime.allocatedCPU` | number | vCPUs allocated | Match config.vcpus |
| `runtime.allocatedRAM` | number | RAM allocated (GB) | `32 GB` |
| `runtime.startedAt` | date | Thời điểm start | Time ago: `2h ago` |
| `runtime.stoppedAt` | date | Thời điểm stop | Time ago (nếu stopped) |
| **Health** ||||
| `lastHealthCheck` | date | Health check cuối | Time ago: `5m ago` |
| `errorMessage` | string | Error (nếu có) | Alert/tooltip màu đỏ |
| **Metadata** ||||
| `createdAt` | date | Thời điểm tạo | `Dec 3, 2025 10:00 AM` |
| `updatedAt` | date | Lần update cuối | Time ago: `30m ago` |

### Status Colors & Icons

| Status | Color | Icon | Meaning | Actions Available |
|--------|-------|------|---------|-------------------|
| `queued` | Gray | ⏳ | Chờ deploy | Start, Delete |
| `deploying` | Blue | 🔄 | Đang deploy | View logs |
| `running` | Green | ✅ | Đang chạy | Stop, Restart, Console, Snapshot |
| `stopping` | Orange | ⏸️ | Đang dừng | View logs |
| `stopped` | Gray | ⏹️ | Đã dừng | Start, Delete, Snapshot |
| `failed` | Red | ❌ | Deploy thất bại | View error, Delete |
| `error` | Red | ⚠️ | Runtime error | Stop, Restart, View logs |

### UI Layout - VM List

```
┌─ Virtual Machines ────────────────────────────────────────┐
│ [+ New VM]  [🔄 Refresh]    Filter: [All Statuses ▼]     │
├───────────────────────────────────────────────────────────┤
│ ✅ Dev VM Ubuntu 22.04                    [⋮ Actions ▼]   │
│    Ubuntu 22.04 · 8 vCPUs · 32 GB RAM · 100 GB · 2x GPU  │
│    192.168.100.10 [📋 Copy]  · Running for 2h            │
│    Node: worker-gpu-01                                    │
├───────────────────────────────────────────────────────────┤
│ ⏹️ Production VM CentOS 8                 [⋮ Actions ▼]   │
│    CentOS 8 · 16 vCPUs · 64 GB RAM · 500 GB              │
│    192.168.100.20  · Stopped 1d ago                       │
│    Node: worker-02                                        │
├───────────────────────────────────────────────────────────┤
│ [< Previous]  Page 1 of 2  [Next >]                      │
└───────────────────────────────────────────────────────────┘
```

---

## 🎬 API 3: VM Lifecycle Operations

### 3.1 Start VM

```bash
POST /resources/:id/start
```

**Response (V1 - Mock):**
```json
{
  "success": true,
  "message": "VM start command sent successfully",
  "taskId": "task-675b2c3d4e5f6a7b8c9d0e10"
}
```

### 3.2 Stop VM

```bash
POST /resources/:id/stop
```

**Response (V1 - Mock):**
```json
{
  "success": true,
  "message": "VM stop command sent successfully"
}
```

### 3.3 Restart VM

```bash
POST /resources/:id/restart
```

**Response (V1 - Mock):**
```json
{
  "success": true,
  "message": "VM restart command sent successfully"
}
```

### UI Behavior

```typescript
// Example: Handle start VM
async function handleStartVM(vmId: string) {
  try {
    // Optimistic UI update
    setVMStatus(vmId, 'deploying');

    const response = await fetch(`/resources/${vmId}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      notification.success({ message: 'VM starting...' });

      // Poll status every 5s
      const interval = setInterval(async () => {
        const status = await fetchVMStatus(vmId);
        setVMStatus(vmId, status.status);

        if (status.status === 'running') {
          clearInterval(interval);
          notification.success({ message: 'VM started successfully' });
        }
      }, 5000);
    }
  } catch (error) {
    notification.error({ message: 'Failed to start VM' });
  }
}
```

---

## 📊 API 4: VM Monitoring

### 4.1 Get Status

```bash
GET /resources/:id/status
```

**Response:**
```json
{
  "resourceId": "675b2c3d4e5f6a7b8c9d0e0f",
  "status": "running",
  "runtime": {
    "id": "vm-675b2c3d",
    "endpoint": "192.168.100.10:22",
    "startedAt": "2025-12-03T10:05:00.000Z",
    "uptime": 7200
  },
  "health": "healthy",
  "lastCheck": "2025-12-03T12:05:00.000Z"
}
```

### 4.2 Get Logs (V1 - Mock)

```bash
GET /resources/:id/logs
```

**Response:**
```json
{
  "resourceId": "675b2c3d4e5f6a7b8c9d0e0f",
  "logs": [
    {
      "timestamp": "2025-12-03T10:05:00.000Z",
      "level": "info",
      "message": "VM started successfully"
    },
    {
      "timestamp": "2025-12-03T10:05:10.000Z",
      "level": "info",
      "message": "Network interface eth0 configured with IP 192.168.100.10"
    }
  ]
}
```

**UI Display:**
```
┌─ VM Logs ─────────────────────────────────────────┐
│ [Auto-refresh: ON ▼]  [Download Logs]             │
├───────────────────────────────────────────────────┤
│ [10:05:00] INFO  VM started successfully          │
│ [10:05:10] INFO  Network configured 192.168.100.10│
│ [10:05:15] INFO  Cloud-init completed              │
│ [10:05:20] INFO  SSH service ready                │
└───────────────────────────────────────────────────┘
```

### 4.3 Get Metrics (V1 - Mock)

```bash
GET /resources/:id/metrics
```

**Response:**
```json
{
  "resourceId": "675b2c3d4e5f6a7b8c9d0e0f",
  "timestamp": "2025-12-03T12:05:00.000Z",
  "metrics": {
    "cpu": {
      "usage": 45.2,
      "cores": 8
    },
    "memory": {
      "used": 24576,
      "total": 32768,
      "usagePercent": 75.0
    },
    "disk": {
      "used": 45,
      "total": 100,
      "usagePercent": 45.0
    },
    "gpu": [
      {
        "deviceId": "GPU-0",
        "utilization": 82.5,
        "memoryUsed": 12288,
        "memoryTotal": 16384,
        "temperature": 68
      },
      {
        "deviceId": "GPU-1",
        "utilization": 78.3,
        "memoryUsed": 10240,
        "memoryTotal": 16384,
        "temperature": 65
      }
    ],
    "network": {
      "rxBytes": 1048576000,
      "txBytes": 524288000
    }
  }
}
```

**UI Display:**
```
┌─ VM Metrics ──────────────────────────────────────┐
│ CPU Usage              [━━━━━━━●─] 45.2% (8 cores)│
│ Memory Usage           [━━━━━━━━━━●] 75% (24/32 GB)│
│ Disk Usage             [━━━━━●────] 45% (45/100 GB)│
│                                                    │
│ GPU-0                  [━━━━━━━━━●] 82.5% · 68°C  │
│   Memory: 12/16 GB                                 │
│                                                    │
│ GPU-1                  [━━━━━━━━●─] 78.3% · 65°C  │
│   Memory: 10/16 GB                                 │
│                                                    │
│ Network: ↓ 1.0 GB  ↑ 500 MB                       │
└────────────────────────────────────────────────────┘
```

### 4.4 Get Console Access (V1 - Mock)

```bash
GET /resources/:id/console
```

**Response:**
```json
{
  "resourceId": "675b2c3d4e5f6a7b8c9d0e0f",
  "consoleType": "vnc",
  "url": "wss://aiwm.example.com/console/vm-675b2c3d?token=xyz123",
  "expiresAt": "2025-12-03T13:05:00.000Z"
}
```

**UI Integration:**
```html
<!-- Embed noVNC viewer -->
<iframe
  src="wss://aiwm.example.com/console/vm-675b2c3d?token=xyz123"
  width="100%"
  height="600px"
  title="VM Console">
</iframe>
```

---

## 📸 API 5: VM Snapshots

### 5.1 Create Snapshot

```bash
POST /resources/:id/snapshots
Content-Type: application/json

{
  "name": "Before GPU Driver Update",
  "description": "Snapshot before updating NVIDIA drivers"
}
```

**Response (V1 - Mock):**
```json
{
  "snapshotId": "snapshot-675b2c3d4e5f6a7b8c9d0e11",
  "name": "Before GPU Driver Update",
  "description": "Snapshot before updating NVIDIA drivers",
  "createdAt": "2025-12-03T12:00:00.000Z",
  "size": 52428800,
  "status": "completed"
}
```

### 5.2 List Snapshots

```bash
GET /resources/:id/snapshots
```

**Response:**
```json
{
  "resourceId": "675b2c3d4e5f6a7b8c9d0e0f",
  "snapshots": [
    {
      "snapshotId": "snapshot-001",
      "name": "Before GPU Driver Update",
      "description": "Snapshot before updating NVIDIA drivers",
      "createdAt": "2025-12-03T12:00:00.000Z",
      "size": 52428800,
      "status": "completed"
    },
    {
      "snapshotId": "snapshot-002",
      "name": "Clean Install",
      "description": "Right after OS installation",
      "createdAt": "2025-12-02T10:00:00.000Z",
      "size": 15728640,
      "status": "completed"
    }
  ]
}
```

**UI Display:**
```
┌─ Snapshots ───────────────────────────────────────┐
│ [+ Create Snapshot]                                │
├───────────────────────────────────────────────────┤
│ 📸 Before GPU Driver Update                       │
│    50 MB · Created Dec 3, 2025 12:00 PM           │
│    [Restore] [Delete]                             │
├───────────────────────────────────────────────────┤
│ 📸 Clean Install                                  │
│    15 MB · Created Dec 2, 2025 10:00 AM           │
│    [Restore] [Delete]                             │
└───────────────────────────────────────────────────┘
```

### 5.3 Restore Snapshot

```bash
POST /resources/:id/snapshots/:snapshotId/restore
```

**Response:**
```json
{
  "success": true,
  "message": "Snapshot restore initiated",
  "estimatedTime": 300
}
```

**UI Warning:**
```
⚠️ Warning: Restoring Snapshot

This will revert the VM to the state at:
"Before GPU Driver Update" (Dec 3, 2025 12:00 PM)

All changes after this snapshot will be lost.

[Cancel]  [Confirm Restore]
```

---

## 🎨 UI/UX Best Practices

### 1. Create VM Form

**Step-by-step wizard:**
```
Step 1: Basic Info (Name, Description, Node)
Step 2: OS Selection (Visual grid with logos)
Step 3: Resources (Sliders with real-time cost estimate)
Step 4: GPU Config (Show available GPUs from selected node)
Step 5: Network (Auto-fill if DHCP, manual if static)
Step 6: Cloud-Init (Collapsible advanced section)
Step 7: Review & Create
```

### 2. Status Polling

```typescript
// Poll every 10s for deploying/stopping VMs
useEffect(() => {
  if (vm.status === 'deploying' || vm.status === 'stopping') {
    const interval = setInterval(async () => {
      const updated = await fetchVMStatus(vm._id);
      setVM(updated);
    }, 10000);

    return () => clearInterval(interval);
  }
}, [vm.status]);
```

### 3. Action Confirmations

```typescript
const dangerousActions = ['stop', 'restart', 'delete', 'restore-snapshot'];

function confirmAction(action: string, vmName: string) {
  Modal.confirm({
    title: `${action.toUpperCase()} VM`,
    content: `Are you sure you want to ${action} "${vmName}"?`,
    okText: 'Confirm',
    okType: 'danger',
    onOk: () => performAction(action)
  });
}
```

### 4. Error Handling

```typescript
if (vm.errorMessage) {
  return (
    <Alert
      type="error"
      message="VM Error"
      description={vm.errorMessage}
      action={
        <Button size="small" onClick={() => handleViewLogs(vm._id)}>
          View Logs
        </Button>
      }
    />
  );
}
```

---

## 📝 Notes & Limitations

### V1 Limitations

1. **Mock Lifecycle Actions** - Start/stop/restart chỉ update database status, không deploy thật
2. **Mock Monitoring** - Logs/metrics/console là fake data
3. **Mock Snapshots** - Snapshot operations không tạo snapshot thật
4. **No Real-time Updates** - Cần polling để update status

### Data Validation

```typescript
// Frontend validation
const vmSchema = {
  name: z.string().min(1).max(100),
  vcpus: z.number().min(1).max(128),
  ramMB: z.number().min(512),
  diskGB: z.number().min(10),
  networkConfig: z.object({
    ipMode: z.enum(['static', 'dhcp']),
    ipAddress: z.string().ip().optional(),
  }).refine(data => {
    if (data.ipMode === 'static') {
      return !!data.ipAddress;
    }
    return true;
  }, "IP address required for static mode")
};
```

### Performance

- **Create VM:** < 200ms (DB only)
- **List VMs:** < 500ms (với 100 VMs)
- **Get Details:** < 100ms
- **Mock Actions:** < 100ms

---

**Last Updated:** 2025-12-03
**Version:** 1.0 (V1 - Metadata Only)
**Status:** ✅ Ready for Frontend Integration
