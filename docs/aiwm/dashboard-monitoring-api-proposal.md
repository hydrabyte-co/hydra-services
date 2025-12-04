# Reports & Monitoring API - Proposal

**Service:** AIWM
**Module:** Reports
**Date:** 2025-12-03
**Status:** 🚀 **APPROVED** - Ready for Implementation
**Purpose:** Real-time monitoring, reporting, và dashboard APIs cho Portal

---

## 📋 TL;DR - Executive Summary

**Yêu cầu:** API endpoints để cung cấp dữ liệu cho 3 loại dashboard:
1. **Overview Dashboard** - Tổng quan toàn bộ AIWM platform
2. **Infrastructure Dashboard** - Chi tiết về nodes, services, resources
3. **AI Workload Dashboard** - Chi tiết về models, deployments, agents, executions

**Scope:**
- ✅ 15-20 REST API endpoints
- ✅ Real-time metrics aggregation
- ✅ Time-series data support
- ✅ Statistics và trends
- ✅ Health monitoring

**Timeline:** 4-5 ngày implementation
**Complexity:** Medium

---

## 🎯 Dashboard Requirements Analysis

### Based on Existing AIWM Modules:

**Core Entities:**
1. **Node** - Infrastructure nodes (controller, worker, proxy, storage)
2. **Resource** - VMs and Containers
3. **Model** - AI/ML models (self-hosted & API-based)
4. **Deployment** - Model deployments on GPU nodes
5. **Tool** - Tools for agents
6. **Instruction** - System instructions
7. **Agent** - AI agents
8. **Execution** - Execution workflows
9. **Conversation** - Agent conversations
10. **Message** - Conversation messages
11. **Configuration** - System configurations

---

## 🎨 Dashboard Design (3 Levels)

### Level 1: Overview Dashboard (Tổng quan)

**Mục đích:** Hiển thị tổng quan high-level về toàn bộ platform

**Metrics cần hiển thị:**
```
┌─────────────────────────────────────────────────────────────┐
│  AIWM Platform Overview Dashboard                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 Infrastructure                                           │
│  • Nodes: 12 total (10 online, 2 offline)                  │
│  • Resources: 45 (25 running, 15 stopped, 5 deploying)     │
│  • GPU Utilization: 67% avg (8/12 GPUs active)             │
│                                                              │
│  🤖 AI Workloads                                            │
│  • Models: 23 (15 active, 5 inactive, 3 downloading)       │
│  • Deployments: 12 (10 running, 2 stopped)                 │
│  • Agents: 8 (5 active, 2 busy, 1 inactive)                │
│  • Executions: 145 (120 completed, 15 running, 10 failed)  │
│                                                              │
│  📈 Activity (Last 24h)                                     │
│  • API Requests: 12.5K                                      │
│  • Inference Requests: 3.2K                                 │
│  • Agent Tasks: 89                                          │
│  • Average Response Time: 234ms                             │
│                                                              │
│  ⚠️ Alerts & Health                                         │
│  • Critical: 0                                              │
│  • Warning: 2 (Node GPU temp high, Storage 85% full)       │
│  • System Health: 95%                                       │
└─────────────────────────────────────────────────────────────┘
```

**API Endpoint:**
- `GET /dashboard/overview` - Tổng quan tất cả metrics

---

### Level 2: Infrastructure Dashboard (Chi tiết hạ tầng)

**Mục đích:** Giám sát chi tiết nodes, services, resources

**2.1. Nodes Overview**
```
┌─────────────────────────────────────────────────────────────┐
│  Nodes Infrastructure                                        │
├─────────────────────────────────────────────────────────────┤
│  Total Nodes: 12                                            │
│  • Online: 10                                               │
│  • Offline: 2                                               │
│  • Maintenance: 0                                           │
│                                                              │
│  By Role:                                                   │
│  • Controller: 2 (2 online)                                 │
│  • Worker: 8 (7 online, 1 offline)                          │
│  • Proxy: 1 (1 online)                                      │
│  • Storage: 1 (1 online)                                    │
│                                                              │
│  Resource Utilization:                                      │
│  • CPU: 45% avg                                             │
│  • RAM: 67% avg                                             │
│  • GPU: 78% avg (8/12 GPUs in use)                         │
│  • Disk: 62% avg                                            │
└─────────────────────────────────────────────────────────────┘
```

**2.2. Node Details (per node)**
```
Node: worker-gpu-01
Status: online
Roles: [worker]
WebSocket: connected
Last Heartbeat: 2s ago

Hardware:
• CPU: AMD EPYC 7543 (32 cores) - Usage: 45%
• RAM: 256 GB - Usage: 128 GB (50%)
• Disk: 2 TB SSD - Usage: 1.2 TB (60%)
• GPUs: 2x NVIDIA A100 80GB
  - GPU-0: 78% util, 65GB used, 75°C
  - GPU-1: 45% util, 32GB used, 68°C

Services Running:
• Worker Service: running (uptime: 15d 3h)
• Proxy Service: running (uptime: 15d 3h)

Resources on Node:
• VMs: 3 (2 running, 1 stopped)
• Containers: 8 (6 running, 2 stopped)
• Deployments: 2 (2 running)
```

**2.3. Resources Overview**
```
┌─────────────────────────────────────────────────────────────┐
│  Resources (VMs & Containers)                                │
├─────────────────────────────────────────────────────────────┤
│  Total: 45                                                  │
│                                                              │
│  By Type:                                                   │
│  • Virtual Machines: 15 (10 running, 3 stopped, 2 deploying)│
│  • Application Containers: 20 (15 running, 5 stopped)       │
│  • Inference Containers: 10 (10 running)                    │
│                                                              │
│  By Status:                                                 │
│  • Running: 25                                              │
│  • Stopped: 15                                              │
│  • Deploying: 5                                             │
│  • Failed: 0                                                │
│                                                              │
│  Resource Allocation:                                       │
│  • Total vCPUs allocated: 256                               │
│  • Total RAM allocated: 512 GB                              │
│  • Total Disk allocated: 4.5 TB                             │
│  • GPUs allocated: 8 (passthrough: 5, MIG: 3)               │
└─────────────────────────────────────────────────────────────┘
```

**API Endpoints:**
- `GET /dashboard/infrastructure/nodes` - Nodes overview + list
- `GET /dashboard/infrastructure/nodes/:id` - Node details
- `GET /dashboard/infrastructure/resources` - Resources overview + list
- `GET /dashboard/infrastructure/resources/:id` - Resource details

---

### Level 3: AI Workload Dashboard (Chi tiết AI workloads)

**Mục đích:** Giám sát models, deployments, agents, executions

**3.1. Models Overview**
```
┌─────────────────────────────────────────────────────────────┐
│  AI Models Registry                                          │
├─────────────────────────────────────────────────────────────┤
│  Total Models: 23                                           │
│                                                              │
│  By Type:                                                   │
│  • LLM: 12 (10 active, 2 inactive)                          │
│  • Vision: 5 (3 active, 2 inactive)                         │
│  • Embedding: 4 (2 active, 2 inactive)                      │
│  • Voice: 2 (2 active)                                      │
│                                                              │
│  By Deployment Type:                                        │
│  • Self-hosted: 15 (12 active, 3 downloading)               │
│  • API-based: 8 (8 active)                                  │
│                                                              │
│  By Status:                                                 │
│  • Active: 15                                               │
│  • Inactive: 5                                              │
│  • Downloading: 3                                           │
│  • Failed: 0                                                │
│                                                              │
│  Storage:                                                   │
│  • Total model size: 450 GB                                 │
└─────────────────────────────────────────────────────────────┘
```

**3.2. Deployments Overview**
```
┌─────────────────────────────────────────────────────────────┐
│  Model Deployments                                           │
├─────────────────────────────────────────────────────────────┤
│  Total Deployments: 12                                      │
│                                                              │
│  By Status:                                                 │
│  • Running: 10                                              │
│  • Stopped: 2                                               │
│  • Deploying: 0                                             │
│  • Failed: 0                                                │
│                                                              │
│  Usage Stats (Last 24h):                                    │
│  • Total Requests: 3,245                                    │
│  • Average Latency: 234ms                                   │
│  • Success Rate: 98.5%                                      │
│  • Token Usage: 2.5M tokens                                 │
│                                                              │
│  Resource Usage:                                            │
│  • GPUs in use: 8/12                                        │
│  • Average GPU utilization: 67%                             │
│  • Total VRAM used: 450 GB                                  │
└─────────────────────────────────────────────────────────────┘
```

**3.3. Agents Overview**
```
┌─────────────────────────────────────────────────────────────┐
│  AI Agents                                                   │
├─────────────────────────────────────────────────────────────┤
│  Total Agents: 8                                            │
│                                                              │
│  By Status:                                                 │
│  • Active: 5                                                │
│  • Busy: 2                                                  │
│  • Inactive: 1                                              │
│                                                              │
│  Performance (All time):                                    │
│  • Total Tasks: 1,245                                       │
│  • Completed: 1,189 (95.5%)                                 │
│  • Failed: 56 (4.5%)                                        │
│  • Average Response Time: 2.3s                              │
│                                                              │
│  Recent Activity (Last 24h):                                │
│  • Tasks Executed: 89                                       │
│  • Conversations: 34                                        │
│  • Messages: 456                                            │
└─────────────────────────────────────────────────────────────┘
```

**3.4. Executions Overview**
```
┌─────────────────────────────────────────────────────────────┐
│  Execution Workflows                                         │
├─────────────────────────────────────────────────────────────┤
│  Total Executions: 145                                      │
│                                                              │
│  By Status:                                                 │
│  • Completed: 120 (82.8%)                                   │
│  • Running: 15 (10.3%)                                      │
│  • Failed: 10 (6.9%)                                        │
│  • Pending: 0                                               │
│                                                              │
│  By Type:                                                   │
│  • Model Download: 25                                       │
│  • Deployment Create: 45                                    │
│  • Multi-step: 75                                           │
│                                                              │
│  Performance:                                               │
│  • Average Duration: 5m 23s                                 │
│  • Success Rate: 92.4%                                      │
│  • Retry Rate: 12.3%                                        │
└─────────────────────────────────────────────────────────────┘
```

**API Endpoints:**
- `GET /dashboard/workload/models` - Models overview + stats
- `GET /dashboard/workload/deployments` - Deployments overview + stats
- `GET /dashboard/workload/deployments/:id/metrics` - Deployment metrics
- `GET /dashboard/workload/agents` - Agents overview + stats
- `GET /dashboard/workload/agents/:id/performance` - Agent performance
- `GET /dashboard/workload/executions` - Executions overview + stats

---

## 📊 API Endpoint Design

### 1. Overview Dashboard APIs

#### 1.1. GET /dashboard/overview

**Purpose:** Tổng quan toàn bộ platform

**Response:**
```json
{
  "timestamp": "2025-12-03T10:00:00.000Z",
  "infrastructure": {
    "nodes": {
      "total": 12,
      "online": 10,
      "offline": 2,
      "maintenance": 0,
      "byRole": {
        "controller": 2,
        "worker": 8,
        "proxy": 1,
        "storage": 1
      }
    },
    "resources": {
      "total": 45,
      "running": 25,
      "stopped": 15,
      "deploying": 5,
      "failed": 0,
      "byType": {
        "vm": 15,
        "appContainer": 20,
        "inferenceContainer": 10
      }
    },
    "hardware": {
      "cpuUtilization": 45,
      "ramUtilization": 67,
      "gpuUtilization": 67,
      "diskUtilization": 62,
      "gpusActive": 8,
      "gpusTotal": 12
    }
  },
  "workload": {
    "models": {
      "total": 23,
      "active": 15,
      "inactive": 5,
      "downloading": 3,
      "byType": {
        "llm": 12,
        "vision": 5,
        "embedding": 4,
        "voice": 2
      }
    },
    "deployments": {
      "total": 12,
      "running": 10,
      "stopped": 2,
      "deploying": 0,
      "failed": 0
    },
    "agents": {
      "total": 8,
      "active": 5,
      "busy": 2,
      "inactive": 1
    },
    "executions": {
      "total": 145,
      "completed": 120,
      "running": 15,
      "failed": 10
    }
  },
  "activity": {
    "period": "24h",
    "apiRequests": 12500,
    "inferenceRequests": 3200,
    "agentTasks": 89,
    "avgResponseTime": 234,
    "successRate": 98.5
  },
  "health": {
    "systemHealth": 95,
    "alerts": {
      "critical": 0,
      "warning": 2,
      "info": 5
    },
    "issues": [
      {
        "severity": "warning",
        "type": "node.gpu.temperature",
        "message": "Node worker-gpu-01 GPU-0 temperature high (82°C)",
        "nodeId": "675a1b2c3d4e5f6a7b8c9d0e"
      },
      {
        "severity": "warning",
        "type": "node.storage.usage",
        "message": "Node storage-01 disk usage 85%",
        "nodeId": "675a1b2c3d4e5f6a7b8c9d0f"
      }
    ]
  }
}
```

---

### 2. Infrastructure Dashboard APIs

#### 2.1. GET /dashboard/infrastructure/nodes

**Purpose:** Nodes overview và danh sách

**Query Parameters:**
- `status` - Filter by status (online, offline, maintenance)
- `role` - Filter by role (controller, worker, proxy, storage)
- `limit`, `page` - Pagination

**Response:**
```json
{
  "summary": {
    "total": 12,
    "online": 10,
    "offline": 2,
    "maintenance": 0,
    "byRole": {
      "controller": { "total": 2, "online": 2 },
      "worker": { "total": 8, "online": 7 },
      "proxy": { "total": 1, "online": 1 },
      "storage": { "total": 1, "online": 1 }
    },
    "resources": {
      "cpuUtilization": 45,
      "ramUtilization": 67,
      "gpuUtilization": 67,
      "diskUtilization": 62
    }
  },
  "nodes": [
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d0e",
      "name": "worker-gpu-01",
      "role": ["worker"],
      "status": "online",
      "websocketConnected": true,
      "lastHeartbeat": "2025-12-03T09:59:58.000Z",
      "hardware": {
        "cpuModel": "AMD EPYC 7543",
        "cpuCores": 32,
        "cpuUsage": 45,
        "ramTotal": 256,
        "ramUsage": 128,
        "diskTotal": 2000,
        "diskUsage": 1200,
        "gpus": [
          {
            "deviceId": "GPU-0",
            "model": "NVIDIA A100 80GB",
            "memoryTotal": 80,
            "memoryFree": 15,
            "utilization": 78,
            "temperature": 75
          }
        ]
      },
      "resources": {
        "vms": 3,
        "containers": 8,
        "deployments": 2
      },
      "uptime": 1296000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 12
  }
}
```

#### 2.2. GET /dashboard/infrastructure/nodes/:id

**Purpose:** Chi tiết 1 node

**Response:**
```json
{
  "_id": "675a1b2c3d4e5f6a7b8c9d0e",
  "name": "worker-gpu-01",
  "role": ["worker"],
  "status": "online",
  "websocketConnected": true,
  "lastHeartbeat": "2025-12-03T09:59:58.000Z",
  "hardware": {
    "cpuModel": "AMD EPYC 7543",
    "cpuCores": 32,
    "cpuUsage": 45,
    "ramTotal": 256,
    "ramUsage": 128,
    "diskTotal": 2000,
    "diskUsage": 1200,
    "gpus": [
      {
        "deviceId": "GPU-0",
        "model": "NVIDIA A100 80GB",
        "memoryTotal": 80,
        "memoryFree": 15,
        "utilization": 78,
        "temperature": 75
      },
      {
        "deviceId": "GPU-1",
        "model": "NVIDIA A100 80GB",
        "memoryTotal": 80,
        "memoryFree": 48,
        "utilization": 45,
        "temperature": 68
      }
    ]
  },
  "services": [
    {
      "name": "Worker Service",
      "status": "running",
      "uptime": 1296000,
      "pid": 12345
    },
    {
      "name": "Proxy Service",
      "status": "running",
      "uptime": 1296000,
      "pid": 12346
    }
  ],
  "resources": {
    "vms": [
      {
        "_id": "...",
        "name": "Ubuntu GPU Server",
        "status": "running",
        "cpuUsage": 45,
        "ramUsage": 64
      }
    ],
    "containers": [
      {
        "_id": "...",
        "name": "PostgreSQL Database",
        "status": "running",
        "cpuUsage": 15,
        "ramUsage": 8
      }
    ],
    "deployments": [
      {
        "_id": "...",
        "name": "Llama 3.1 8B - Production",
        "status": "running",
        "gpuUsage": 78,
        "vramUsage": 65
      }
    ]
  },
  "metrics": {
    "period": "1h",
    "cpuHistory": [45, 48, 52, 47, 45],
    "ramHistory": [128, 130, 135, 128, 128],
    "gpuHistory": [78, 80, 75, 78, 78],
    "networkIn": 125.5,
    "networkOut": 89.3
  }
}
```

#### 2.3. GET /dashboard/infrastructure/resources

**Purpose:** Resources overview

**Query Parameters:**
- `resourceType` - Filter by type (vm, app-container, inference-container)
- `status` - Filter by status
- `nodeId` - Filter by node
- `limit`, `page` - Pagination

**Response:** (Similar structure to nodes)

---

### 3. AI Workload Dashboard APIs

#### 3.1. GET /dashboard/workload/models

**Purpose:** Models overview và statistics

**Response:**
```json
{
  "summary": {
    "total": 23,
    "active": 15,
    "inactive": 5,
    "downloading": 3,
    "failed": 0,
    "byType": {
      "llm": 12,
      "vision": 5,
      "embedding": 4,
      "voice": 2
    },
    "byDeploymentType": {
      "selfHosted": 15,
      "apiBased": 8
    },
    "storage": {
      "totalSize": 450
    }
  },
  "models": [
    {
      "_id": "...",
      "name": "Llama-3.1-8B",
      "type": "llm",
      "deploymentType": "self-hosted",
      "status": "active",
      "size": 16,
      "deployments": 2,
      "lastUsed": "2025-12-03T09:45:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 23
  }
}
```

#### 3.2. GET /dashboard/workload/deployments

**Purpose:** Deployments overview

**Response:**
```json
{
  "summary": {
    "total": 12,
    "running": 10,
    "stopped": 2,
    "deploying": 0,
    "failed": 0,
    "usage": {
      "period": "24h",
      "totalRequests": 3245,
      "avgLatency": 234,
      "successRate": 98.5,
      "tokenUsage": 2500000
    },
    "resources": {
      "gpusInUse": 8,
      "gpusTotal": 12,
      "avgGpuUtilization": 67,
      "totalVramUsed": 450
    }
  },
  "deployments": [
    {
      "_id": "...",
      "name": "Llama 3.1 8B - Production",
      "modelName": "Llama-3.1-8B",
      "status": "running",
      "nodeId": "...",
      "nodeName": "worker-gpu-01",
      "gpuUsage": 78,
      "vramUsage": 65,
      "requests24h": 1234,
      "avgLatency": 198,
      "uptime": 864000
    }
  ]
}
```

#### 3.3. GET /dashboard/workload/deployments/:id/metrics

**Purpose:** Chi tiết metrics của deployment

**Query Parameters:**
- `period` - Time period (1h, 24h, 7d, 30d)
- `interval` - Data interval (1m, 5m, 1h)

**Response:**
```json
{
  "deploymentId": "...",
  "name": "Llama 3.1 8B - Production",
  "period": "24h",
  "interval": "1h",
  "metrics": {
    "requests": {
      "total": 1234,
      "successful": 1215,
      "failed": 19,
      "history": [45, 52, 48, 51, ...]
    },
    "latency": {
      "avg": 198,
      "p50": 180,
      "p95": 345,
      "p99": 567,
      "history": [198, 205, 195, 202, ...]
    },
    "throughput": {
      "requestsPerSecond": 1.5,
      "tokensPerSecond": 45.6,
      "history": [1.5, 1.6, 1.4, 1.5, ...]
    },
    "gpu": {
      "utilization": 78,
      "vramUsage": 65,
      "temperature": 75,
      "history": {
        "utilization": [78, 80, 75, 78, ...],
        "vramUsage": [65, 67, 64, 65, ...],
        "temperature": [75, 77, 74, 75, ...]
      }
    },
    "errors": [
      {
        "timestamp": "2025-12-03T09:30:00.000Z",
        "type": "timeout",
        "message": "Request timeout after 30s",
        "count": 5
      }
    ]
  }
}
```

#### 3.4. GET /dashboard/workload/agents

**Purpose:** Agents overview

**Response:**
```json
{
  "summary": {
    "total": 8,
    "active": 5,
    "busy": 2,
    "inactive": 1,
    "performance": {
      "totalTasks": 1245,
      "completed": 1189,
      "failed": 56,
      "successRate": 95.5,
      "avgResponseTime": 2300
    },
    "activity24h": {
      "tasksExecuted": 89,
      "conversations": 34,
      "messages": 456
    }
  },
  "agents": [
    {
      "_id": "...",
      "agentId": "agent-001",
      "name": "Code Assistant",
      "status": "active",
      "totalTasks": 345,
      "completedTasks": 332,
      "failedTasks": 13,
      "avgResponseTime": 1800,
      "lastTask": "2025-12-03T09:55:00.000Z"
    }
  ]
}
```

#### 3.5. GET /dashboard/workload/agents/:id/performance

**Purpose:** Chi tiết performance của agent

**Response:**
```json
{
  "agentId": "agent-001",
  "name": "Code Assistant",
  "performance": {
    "allTime": {
      "totalTasks": 345,
      "completed": 332,
      "failed": 13,
      "successRate": 96.2,
      "avgResponseTime": 1800
    },
    "last24h": {
      "tasks": 15,
      "completed": 14,
      "failed": 1,
      "avgResponseTime": 1650
    },
    "last7d": {
      "tasks": 89,
      "completed": 86,
      "failed": 3,
      "avgResponseTime": 1720
    }
  },
  "timeline": {
    "period": "24h",
    "interval": "1h",
    "tasks": [2, 3, 1, 2, 0, 1, ...],
    "responseTime": [1650, 1700, 1580, 1720, ...]
  },
  "recentTasks": [
    {
      "taskId": "...",
      "type": "code_generation",
      "status": "completed",
      "duration": 1650,
      "timestamp": "2025-12-03T09:55:00.000Z"
    }
  ]
}
```

#### 3.6. GET /dashboard/workload/executions

**Purpose:** Executions overview

**Response:**
```json
{
  "summary": {
    "total": 145,
    "completed": 120,
    "running": 15,
    "failed": 10,
    "pending": 0,
    "byType": {
      "modelDownload": 25,
      "deploymentCreate": 45,
      "multiStep": 75
    },
    "performance": {
      "avgDuration": 323,
      "successRate": 92.4,
      "retryRate": 12.3
    }
  },
  "executions": [
    {
      "_id": "...",
      "name": "Deploy Llama 3.1 8B",
      "type": "deployment.create",
      "status": "running",
      "progress": 67,
      "currentStep": "Starting container",
      "startedAt": "2025-12-03T09:50:00.000Z",
      "estimatedCompletion": "2025-12-03T10:05:00.000Z"
    }
  ]
}
```

---

## 🎯 API Endpoint Summary

### Overview (1 endpoint)
- `GET /dashboard/overview` - Platform overview

### Infrastructure (4 endpoints)
- `GET /dashboard/infrastructure/nodes` - Nodes overview + list
- `GET /dashboard/infrastructure/nodes/:id` - Node details
- `GET /dashboard/infrastructure/resources` - Resources overview + list
- `GET /dashboard/infrastructure/resources/:id` - Resource details

### AI Workload (7 endpoints)
- `GET /dashboard/workload/models` - Models overview + stats
- `GET /dashboard/workload/deployments` - Deployments overview + stats
- `GET /dashboard/workload/deployments/:id/metrics` - Deployment metrics (time-series)
- `GET /dashboard/workload/agents` - Agents overview + stats
- `GET /dashboard/workload/agents/:id/performance` - Agent performance
- `GET /dashboard/workload/executions` - Executions overview + stats
- `GET /dashboard/workload/executions/:id` - Execution details

### Health & Alerts (3 endpoints)
- `GET /dashboard/health` - System health overview
- `GET /dashboard/alerts` - Active alerts
- `GET /dashboard/alerts/history` - Alert history

**Total:** 15 endpoints

---

## 🏗️ Implementation Plan

### Day 1: Foundation & Overview Dashboard
- [ ] Create DashboardModule structure
- [ ] DashboardService với aggregation logic
- [ ] `GET /dashboard/overview` endpoint
- [ ] Health & alerts logic
- [ ] Build và test

### Day 2: Infrastructure Dashboard
- [ ] Nodes overview endpoint
- [ ] Node details endpoint
- [ ] Resources overview endpoint
- [ ] Hardware metrics aggregation
- [ ] Build và test

### Day 3: AI Workload Dashboard (Part 1)
- [ ] Models overview endpoint
- [ ] Deployments overview endpoint
- [ ] Deployment metrics endpoint (time-series)
- [ ] Build và test

### Day 4: AI Workload Dashboard (Part 2)
- [ ] Agents overview endpoint
- [ ] Agent performance endpoint
- [ ] Executions overview endpoint
- [ ] Build và test

### Day 5: Polish & Documentation
- [ ] Swagger documentation
- [ ] API test examples
- [ ] Performance optimization
- [ ] Implementation summary

---

## 📊 Data Aggregation Strategy

### Real-time Data (từ DB)
- Node status, heartbeat, hardware metrics
- Resource status, counts
- Model, deployment, agent status
- Execution status

### Computed Metrics
- Averages (CPU, RAM, GPU utilization)
- Success rates, error rates
- Throughput, latency percentiles

### Time-series Data
- Store metrics history trong separate collection
- Aggregate với different intervals (1m, 5m, 1h, 1d)
- Retention policy (keep 1h data for 7 days, 1d data for 90 days)

### Caching Strategy
- Cache overview metrics (TTL: 30s)
- Cache node/resource lists (TTL: 1m)
- Real-time metrics không cache

---

## 🎨 Response Format Standards

### Common Response Structure
```json
{
  "timestamp": "2025-12-03T10:00:00.000Z",
  "summary": { ... },
  "data": [ ... ],
  "pagination": { ... },
  "metadata": { ... }
}
```

### Metrics Time-series Format
```json
{
  "period": "24h",
  "interval": "1h",
  "dataPoints": 24,
  "metrics": {
    "name": "cpu_utilization",
    "values": [45, 48, 52, ...],
    "timestamps": ["2025-12-03T00:00:00Z", ...]
  }
}
```

---

## 📝 Questions for Clarification

1. **Time-series Data Storage:**
   - Có cần store historical metrics không? (CPU, GPU history)
   - Nếu có: retention policy là bao lâu? (7 days, 30 days?)

2. **Real-time Updates:**
   - Dashboard có cần WebSocket real-time updates không?
   - Hay polling từ frontend đủ? (refresh mỗi 30s-1m)

3. **Metrics Granularity:**
   - Intervals cần support: 1m, 5m, 1h, 1d?
   - Periods cần support: 1h, 24h, 7d, 30d?

4. **Custom Dashboards:**
   - User có cần tạo custom dashboard không?
   - Hay chỉ cần predefined dashboards?

5. **Export/Reports:**
   - Có cần export metrics to CSV/PDF không?
   - Có cần scheduled reports không?

---

## ✅ Next Steps

1. **Anh review proposal này**
2. **Trả lời các questions trên**
3. **Approve để start implementation**
4. **4-5 ngày hoàn thành tất cả endpoints**

---

**Proposal Status:** 📋 **AWAITING REVIEW**
**Estimated Completion:** 4-5 days after approval
**Complexity:** Medium
