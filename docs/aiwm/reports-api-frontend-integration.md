# Reports API - Tài liệu tích hợp Frontend

**Service:** AIWM
**Module:** Reports
**Base URL:** `http://localhost:3305` (development) hoặc URL production
**Authentication:** Bearer Token (JWT)
**Version:** 1.0
**Last Updated:** 2025-12-03

---

## 📋 Tổng quan

Module Reports cung cấp 3 API endpoints để hiển thị dashboard monitoring và báo cáo cho AIWM platform. Tất cả endpoints đều yêu cầu JWT authentication.

**3 Endpoints chính:**
1. `GET /reports/overview` - Tổng quan toàn platform (dashboard chính)
2. `GET /reports/system-overview` - Tổng quan hạ tầng hệ thống (nodes, resources)
3. `GET /reports/ai-workload-overview` - Tổng quan AI workload (models, agents, deployments)

---

## 🔐 Authentication

Tất cả API đều yêu cầu JWT token trong header:

```http
Authorization: Bearer <your-jwt-token>
```

**Error Response khi không có token:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## 📊 API 1: Platform Overview

### Endpoint
```
GET /reports/overview
```

### Mục đích
Hiển thị tổng quan **toàn bộ platform** với metrics cao nhất, phù hợp cho:
- Dashboard trang chủ
- Executive summary
- Quick health check

### Request
```bash
curl -X GET "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer <token>"
```

### Response Structure

```typescript
{
  timestamp: string;           // ISO 8601 timestamp của lúc tạo report
  infrastructure: {            // Metrics về hạ tầng
    nodes: { ... },
    resources: { ... },
    hardware: { ... }
  };
  workload: {                  // Metrics về AI workload
    models: { ... },
    deployments: { ... },
    agents: { ... },
    executions: { ... }
  };
  activity: {                  // Metrics về hoạt động (24h gần nhất)
    period: string,
    apiRequests: number,
    inferenceRequests: number,
    agentTasks: number,
    avgResponseTime: number,
    successRate: number
  };
  health: {                    // Tình trạng sức khỏe hệ thống
    systemHealth: number,
    alerts: { ... },
    issues: Array<Issue>
  }
}
```

### Response Example

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
      "failed": 0
    },
    "hardware": {
      "cpuUtilization": 45.2,
      "ramUtilization": 67.5,
      "gpuUtilization": 67.8,
      "diskUtilization": 0,
      "gpusActive": 8,
      "gpusTotal": 12
    }
  },
  "workload": {
    "models": {
      "total": 23,
      "active": 15,
      "inactive": 5,
      "downloading": 3
    },
    "deployments": {
      "total": 12,
      "running": 10,
      "stopped": 2
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
    "issues": []
  }
}
```

### Field Descriptions

#### `infrastructure` - Thông tin hạ tầng

| Field | Type | Đơn vị | Mô tả | Cách hiển thị |
|-------|------|--------|-------|---------------|
| `nodes.total` | number | nodes | Tổng số nodes trong hệ thống | Text hoặc counter |
| `nodes.online` | number | nodes | Số nodes đang online | Badge xanh lá |
| `nodes.offline` | number | nodes | Số nodes offline | Badge đỏ |
| `nodes.maintenance` | number | nodes | Số nodes đang bảo trì | Badge vàng |
| `nodes.byRole.controller` | number | nodes | Số nodes role Controller | Pie chart segment |
| `nodes.byRole.worker` | number | nodes | Số nodes role Worker (chạy workload) | Pie chart segment |
| `nodes.byRole.proxy` | number | nodes | Số nodes role Proxy | Pie chart segment |
| `nodes.byRole.storage` | number | nodes | Số nodes role Storage (Object Storage) | Pie chart segment |
| `resources.total` | number | resources | Tổng số resources (VMs, Containers) | Counter |
| `resources.running` | number | resources | Số resources đang chạy | Badge xanh |
| `resources.stopped` | number | resources | Số resources đã dừng | Badge xám |
| `resources.deploying` | number | resources | Số resources đang deploy | Badge vàng, spinner |
| `resources.failed` | number | resources | Số resources deploy thất bại | Badge đỏ |
| `hardware.cpuUtilization` | number | % (0-100) | Mức sử dụng CPU trung bình của nodes online | Progress bar, gauge |
| `hardware.ramUtilization` | number | % (0-100) | Mức sử dụng RAM trung bình của nodes online | Progress bar |
| `hardware.gpuUtilization` | number | % (0-100) | Mức sử dụng GPU trung bình của tất cả GPUs | Progress bar |
| `hardware.diskUtilization` | number | % (0-100) | **Luôn = 0** (chưa track), có thể ẩn | *(ẩn hoặc N/A)* |
| `hardware.gpusActive` | number | GPUs | Số GPU đang active (utilization > 10%) | Counter với icon |
| `hardware.gpusTotal` | number | GPUs | Tổng số GPU trong hệ thống | Counter |

#### `workload` - AI Workload

| Field | Type | Đơn vị | Mô tả | Cách hiển thị |
|-------|------|--------|-------|---------------|
| `models.total` | number | models | Tổng số AI models đã đăng ký | Counter |
| `models.active` | number | models | Số models đang active (sẵn sàng dùng) | Badge xanh |
| `models.inactive` | number | models | Số models inactive | Badge xám |
| `models.downloading` | number | models | Số models đang download weights | Badge vàng, spinner |
| `deployments.total` | number | deployments | Tổng số model deployments | Counter |
| `deployments.running` | number | deployments | Số deployments đang chạy | Badge xanh |
| `deployments.stopped` | number | deployments | Số deployments đã dừng | Badge xám |
| `agents.total` | number | agents | Tổng số AI agents | Counter |
| `agents.active` | number | agents | Số agents active (sẵn sàng nhận task) | Badge xanh |
| `agents.busy` | number | agents | Số agents đang xử lý task | Badge vàng, spinner |
| `agents.inactive` | number | agents | Số agents inactive | Badge xám |
| `executions.total` | number | executions | Tổng số agent executions trong period | Counter |
| `executions.completed` | number | executions | Số executions hoàn thành | Badge xanh |
| `executions.running` | number | executions | Số executions đang chạy | Badge vàng |
| `executions.failed` | number | executions | Số executions thất bại | Badge đỏ |

#### `activity` - Hoạt động 24h gần nhất

| Field | Type | Đơn vị | Mô tả | Cách hiển thị |
|-------|------|--------|-------|---------------|
| `period` | string | - | Period của metrics (mặc định "24h") | Text label |
| `apiRequests` | number | requests | Tổng số API requests trong 24h | Counter, line chart |
| `inferenceRequests` | number | requests | Số inference requests (gọi model) | Counter |
| `agentTasks` | number | tasks | Số agent tasks được thực thi | Counter |
| `avgResponseTime` | number | ms | Thời gian response trung bình | Text với đơn vị ms |
| `successRate` | number | % (0-100) | Tỷ lệ thành công của requests | Progress bar, badge |

**Lưu ý:** Hiện tại `activity` metrics đang **hardcoded** (chưa có dữ liệu thực), sẽ được implement sau.

#### `health` - Sức khỏe hệ thống

| Field | Type | Đơn vị | Mô tả | Cách hiển thị |
|-------|------|--------|-------|---------------|
| `systemHealth` | number | score (0-100) | Điểm sức khỏe hệ thống (100 là tốt nhất) | Gauge, progress circle |
| `alerts.critical` | number | alerts | Số cảnh báo mức critical | Badge đỏ, blink |
| `alerts.warning` | number | alerts | Số cảnh báo mức warning | Badge vàng |
| `alerts.info` | number | alerts | Số thông tin informational | Badge xanh dương |
| `issues` | Array | - | Danh sách issues chi tiết (xem Issue type) | List, expandable |

**System Health Score Calculation:**
```
systemHealth = 100 - (critical × 10) - (warning × 2)
```
- Mỗi critical issue: -10 điểm
- Mỗi warning issue: -2 điểm
- Tối thiểu = 0

**Issue Type:**
```typescript
{
  severity: 'critical' | 'warning' | 'info',
  type: string,              // e.g., 'node.offline', 'node.gpu.temperature'
  message: string,           // Human-readable message
  nodeId?: string            // ID của node liên quan (nếu có)
}
```

---

## 🖥️ API 2: System Overview

### Endpoint
```
GET /reports/system-overview
```

### Mục đích
Hiển thị chi tiết về **hạ tầng hệ thống** (nodes, resources), phù hợp cho:
- Dashboard Infrastructure
- Node monitoring page
- Resource management view

### Request
```bash
curl -X GET "http://localhost:3305/reports/system-overview" \
  -H "Authorization: Bearer <token>"
```

### Response Structure

```typescript
{
  timestamp: string;
  summary: {
    nodes: {
      total: number,
      online: number,
      offline: number,
      byRole: {
        [role: string]: {
          total: number,
          online: number
        }
      }
    },
    resources: {
      total: number,
      running: number,
      stopped: number,
      byType: {
        [type: string]: number
      }
    },
    utilization: {
      cpu: number,
      ram: number,
      disk: number,
      gpu: number,
      gpusActive: number,
      gpusTotal: number
    }
  },
  nodes: Array<NodeDetail>
}
```

### Response Example

```json
{
  "timestamp": "2025-12-03T10:00:00.000Z",
  "summary": {
    "nodes": {
      "total": 12,
      "online": 10,
      "offline": 2,
      "byRole": {
        "controller": {
          "total": 2,
          "online": 2
        },
        "worker": {
          "total": 8,
          "online": 7
        },
        "proxy": {
          "total": 1,
          "online": 1
        },
        "storage": {
          "total": 1,
          "online": 0
        }
      }
    },
    "resources": {
      "total": 45,
      "running": 25,
      "stopped": 15,
      "byType": {
        "virtualMachine": 15,
        "applicationContainer": 20,
        "inferenceContainer": 10
      }
    },
    "utilization": {
      "cpu": 45.2,
      "ram": 67.5,
      "disk": 0,
      "gpu": 67.8,
      "gpusActive": 8,
      "gpusTotal": 12
    }
  },
  "nodes": [
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d0e",
      "name": "worker-gpu-01",
      "role": ["worker"],
      "status": "online",
      "websocketConnected": true,
      "lastHeartbeat": "2025-12-03T09:59:30.000Z",
      "cpuUsage": 45,
      "ramUsage": 128000,
      "ramTotal": 256000,
      "diskTotal": 500000,
      "gpuCount": 2,
      "uptime": 1296000
    },
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d0f",
      "name": "controller-01",
      "role": ["controller"],
      "status": "online",
      "websocketConnected": true,
      "lastHeartbeat": "2025-12-03T09:59:45.000Z",
      "cpuUsage": 12,
      "ramUsage": 32000,
      "ramTotal": 64000,
      "diskTotal": 200000,
      "gpuCount": 0,
      "uptime": 2592000
    }
  ]
}
```

### Field Descriptions

#### `summary` - Tổng hợp metrics

| Field | Type | Đơn vị | Mô tả | Cách hiển thị |
|-------|------|--------|-------|---------------|
| `nodes.total` | number | nodes | Tổng số nodes | Counter |
| `nodes.online` | number | nodes | Số nodes online | Badge xanh |
| `nodes.offline` | number | nodes | Số nodes offline | Badge đỏ |
| `nodes.byRole[role].total` | number | nodes | Tổng nodes theo từng role | Bar chart |
| `nodes.byRole[role].online` | number | nodes | Nodes online theo từng role | Stacked bar |
| `resources.total` | number | resources | Tổng số resources | Counter |
| `resources.running` | number | resources | Resources đang chạy | Badge xanh |
| `resources.stopped` | number | resources | Resources đã dừng | Badge xám |
| `resources.byType[type]` | number | resources | Phân bố theo loại resource | Pie chart |
| `utilization.cpu` | number | % | CPU utilization trung bình | Progress bar |
| `utilization.ram` | number | % | RAM utilization trung bình | Progress bar |
| `utilization.disk` | number | % | **Luôn = 0** (chưa track) | *(ẩn)* |
| `utilization.gpu` | number | % | GPU utilization trung bình | Progress bar |
| `utilization.gpusActive` | number | GPUs | Số GPU active | Counter |
| `utilization.gpusTotal` | number | GPUs | Tổng số GPU | Counter |

**Resource Types:**
- `virtualMachine` - Virtual Machines (VMs)
- `applicationContainer` - Application Containers (Docker, Podman)
- `inferenceContainer` - Inference Containers (Model serving)

#### `nodes` - Danh sách chi tiết nodes

**NodeDetail Type:**

| Field | Type | Đơn vị | Mô tả | Cách hiển thị |
|-------|------|--------|-------|---------------|
| `_id` | string | - | MongoDB ObjectId của node | Hidden hoặc debug |
| `name` | string | - | Tên node (ví dụ: "worker-gpu-01") | **Text chính**, bold |
| `role` | string[] | - | Array roles của node | Badges (multi) |
| `status` | string | - | Status: "online", "offline", "maintenance", "pending", "installing" | Badge với màu |
| `websocketConnected` | boolean | - | Node có kết nối WebSocket không | Icon tick/cross |
| `lastHeartbeat` | string | ISO date | Thời điểm heartbeat cuối cùng | Time ago ("2m ago") |
| `cpuUsage` | number | % (0-100) | Mức sử dụng CPU hiện tại | Progress bar mini |
| `ramUsage` | number | MB | RAM đang dùng (tính từ ramTotal - ramFree) | Text hoặc bar |
| `ramTotal` | number | MB | Tổng RAM | Text |
| `diskTotal` | number | MB | Tổng dung lượng disk | Text |
| `gpuCount` | number | GPUs | Số GPU của node | Icon + number |
| `uptime` | number | seconds | Thời gian node đã chạy | Format "15d 2h" |

**Status Colors:**
- `online` → Badge xanh lá
- `offline` → Badge đỏ
- `maintenance` → Badge vàng
- `pending` → Badge xám
- `installing` → Badge xanh dương

**Uptime Formatting:**
```javascript
// Example: 1296000 seconds = 15 days
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}
```

**RAM Usage Calculation:**
```javascript
const ramUsagePercent = (ramUsage / ramTotal) * 100;
```

**Lưu ý:** `ramUsage` có thể là `undefined` nếu node chưa report metrics.

---

## 🤖 API 3: AI Workload Overview

### Endpoint
```
GET /reports/ai-workload-overview
```

### Mục đích
Hiển thị chi tiết về **AI workload** (models, deployments, agents), phù hợp cho:
- AI Workload Dashboard
- Model management view
- Agent monitoring page

### Request
```bash
curl -X GET "http://localhost:3305/reports/ai-workload-overview" \
  -H "Authorization: Bearer <token>"
```

### Response Structure

```typescript
{
  timestamp: string;
  models: {
    total: number,
    active: number,
    inactive: number,
    downloading: number,
    byType: {
      [type: string]: number
    },
    byDeploymentType: {
      selfHosted: number,
      apiBased: number
    }
  },
  deployments: {
    total: number,
    running: number,
    stopped: number,
    deploying: number,
    failed: number
  },
  agents: {
    total: number,
    active: number,
    busy: number,
    inactive: number,
    performance: {
      totalTasks: number,
      completedTasks: number,
      failedTasks: number,
      successRate: number,
      avgResponseTime: number
    }
  },
  executions: {
    total: number,
    completed: number,
    running: number,
    failed: number,
    pending: number
  }
}
```

### Response Example

```json
{
  "timestamp": "2025-12-03T10:00:00.000Z",
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
    },
    "byDeploymentType": {
      "selfHosted": 15,
      "apiBased": 8
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
    "inactive": 1,
    "performance": {
      "totalTasks": 1245,
      "completedTasks": 1189,
      "failedTasks": 56,
      "successRate": 95.5,
      "avgResponseTime": 2300
    }
  },
  "executions": {
    "total": 145,
    "completed": 120,
    "running": 15,
    "failed": 10,
    "pending": 0
  }
}
```

### Field Descriptions

#### `models` - AI Models

| Field | Type | Đơn vị | Mô tả | Cách hiển thị |
|-------|------|--------|-------|---------------|
| `total` | number | models | Tổng số models đã đăng ký | Counter, card header |
| `active` | number | models | Models active (ready to use) | Badge xanh |
| `inactive` | number | models | Models inactive | Badge xám |
| `downloading` | number | models | Models đang download weights | Badge vàng, spinner |
| `byType[type]` | number | models | Số lượng models theo loại | Pie chart hoặc bar |
| `byDeploymentType.selfHosted` | number | models | Models tự host (chạy trên infra) | Badge/segment |
| `byDeploymentType.apiBased` | number | models | Models dùng API (OpenAI, Claude...) | Badge/segment |

**Model Types:**
- `llm` - Large Language Models (GPT, LLaMA, Mistral...)
- `vision` - Vision Models (CLIP, YOLO, SAM...)
- `embedding` - Embedding Models (sentence transformers...)
- `voice` - Voice/Audio Models (Whisper, TTS...)
- *(Có thể có thêm types khác)*

**Model Status Logic:**
- `active` - Model đã download xong, sẵn sàng deploy
- `inactive` - Model đã đăng ký nhưng chưa dùng
- `downloading` - Model đang download weights từ HuggingFace/registry

#### `deployments` - Model Deployments

| Field | Type | Đơn vị | Mô tả | Cách hiển thị |
|-------|------|--------|-------|---------------|
| `total` | number | deployments | Tổng số deployments | Counter |
| `running` | number | deployments | Deployments đang chạy (serving) | Badge xanh |
| `stopped` | number | deployments | Deployments đã dừng | Badge xám |
| `deploying` | number | deployments | Deployments đang khởi động | Badge vàng, spinner |
| `failed` | number | deployments | Deployments thất bại | Badge đỏ |

**Deployment Lifecycle:**
1. `deploying` - Đang pull image, start container
2. `running` - Container running, model serving
3. `stopped` - Container stopped
4. `failed` - Lỗi khi deploy

#### `agents` - AI Agents

| Field | Type | Đơn vị | Mô tả | Cách hiển thị |
|-------|------|--------|-------|---------------|
| `total` | number | agents | Tổng số agents | Counter |
| `active` | number | agents | Agents active (idle, ready) | Badge xanh |
| `busy` | number | agents | Agents đang xử lý tasks | Badge vàng, spinner |
| `inactive` | number | agents | Agents inactive/disabled | Badge xám |
| `performance.totalTasks` | number | tasks | Tổng số tasks đã thực thi | Counter |
| `performance.completedTasks` | number | tasks | Số tasks hoàn thành | Badge xanh |
| `performance.failedTasks` | number | tasks | Số tasks thất bại | Badge đỏ |
| `performance.successRate` | number | % (0-100) | Tỷ lệ thành công | Progress bar, gauge |
| `performance.avgResponseTime` | number | ms | Thời gian xử lý trung bình | Text với đơn vị |

**Agent Status:**
- `active` - Agent sẵn sàng nhận task mới (idle)
- `busy` - Agent đang xử lý task
- `inactive` - Agent bị disable hoặc offline

**Success Rate Calculation:**
```javascript
successRate = (completedTasks / totalTasks) * 100
```

#### `executions` - Agent Executions

| Field | Type | Đơn vị | Mô tả | Cách hiển thị |
|-------|------|--------|-------|---------------|
| `total` | number | executions | Tổng số executions trong period | Counter |
| `completed` | number | executions | Executions hoàn thành | Badge xanh |
| `running` | number | executions | Executions đang chạy | Badge vàng, spinner |
| `failed` | number | executions | Executions thất bại | Badge đỏ |
| `pending` | number | executions | Executions chờ xử lý | Badge xám |

**Execution Lifecycle:**
1. `pending` - Task đã tạo, chờ agent nhận
2. `running` - Agent đang xử lý
3. `completed` - Hoàn thành thành công
4. `failed` - Thất bại (timeout, error...)

---

## 🎨 UI/UX Recommendations

### 1. Refresh Rate
- **Dashboard trang chủ:** Refresh mỗi 30 giây (auto-refresh)
- **Chi tiết nodes:** Refresh mỗi 10 giây
- **AI Workload:** Refresh mỗi 15 giây

### 2. Loading States
```javascript
// Hiển thị skeleton/shimmer khi đang load
<Skeleton active />

// Hiển thị previous data + loading indicator khi refresh
<Spin spinning={isRefreshing}>
  <DashboardContent data={data} />
</Spin>
```

### 3. Error Handling
```javascript
// Nếu API error, hiển thị previous data + error toast
if (error) {
  notification.error({
    message: 'Failed to refresh data',
    description: 'Using cached data. Will retry in 30s.',
  });
}
```

### 4. Empty States
```javascript
// Nếu chưa có data
if (nodes.total === 0) {
  return <Empty description="No nodes registered yet" />;
}
```

### 5. Color Coding

**Status Colors (Ant Design tokens):**
- ✅ `online` / `running` / `active` / `completed` → `green` (#52c41a)
- ⏸️ `stopped` / `inactive` → `default` (gray)
- ⚠️ `deploying` / `busy` / `downloading` → `warning` (#faad14)
- ❌ `offline` / `failed` → `error` (#ff4d4f)
- 🔧 `maintenance` → `processing` (#1890ff)

**Utilization Colors:**
- 0-60% → Green
- 60-80% → Orange
- 80-100% → Red

### 6. Chart Recommendations

**API 1 - Overview Dashboard:**
- Infrastructure nodes: Donut chart (byRole)
- Hardware utilization: Multi-progress bars hoặc gauge
- Activity trends: Line chart (time series)
- Health score: Circular progress với màu

**API 2 - System Overview:**
- Nodes by role: Horizontal bar chart
- Resources by type: Pie chart
- Nodes list: Table với mini progress bars

**API 3 - AI Workload:**
- Models by type: Bar chart hoặc pie
- Agent performance: Line chart (success rate over time)
- Executions status: Stacked bar chart

---

## 🔄 Polling Strategy

```javascript
// Example với React Query
import { useQuery } from '@tanstack/react-query';

function useOverviewData() {
  return useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: async () => {
      const res = await fetch('/reports/overview', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30s
    staleTime: 20000,       // Consider stale after 20s
    retry: 3,               // Retry 3 times on error
  });
}
```

---

## 📝 Lưu ý quan trọng

### 1. Metrics chưa implement
- ⚠️ **`activity` section** trong `/reports/overview` hiện tại đang **hardcoded**
- ⚠️ **`diskUtilization`** luôn = 0 (schema chưa track disk usage)
- Frontend nên ẩn hoặc hiển thị "N/A" cho các metrics này

### 2. Timestamp
- Tất cả timestamps đều là ISO 8601 format (UTC)
- Frontend cần convert sang local timezone
```javascript
new Date(timestamp).toLocaleString()
```

### 3. Organization Scope
- Tất cả data đã được filter theo `orgId` của user
- User chỉ thấy data của organization mình

### 4. Missing Fields
- Một số fields có thể `undefined` nếu node chưa report metrics
- Frontend cần handle với fallback values:
```javascript
const cpuUsage = node.cpuUsage ?? 0;
const ramUsage = node.ramUsage ?? 'N/A';
```

### 5. Performance
- API response size: ~10-50KB (tùy số lượng nodes)
- Response time: < 500ms với ~100 nodes
- Nên implement pagination nếu nodes > 100

---

## 🧪 Testing với curl

### Test Overview API
```bash
# Replace <token> với JWT token thực
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
```

### Test System Overview API
```bash
curl -X GET "http://localhost:3305/reports/system-overview" \
  -H "Authorization: Bearer $TOKEN" | jq '.nodes | length'
```

### Test AI Workload API
```bash
curl -X GET "http://localhost:3305/reports/ai-workload-overview" \
  -H "Authorization: Bearer $TOKEN" | jq '.agents.performance'
```

---

## 📞 Support

Nếu có vấn đề hoặc câu hỏi về API, liên hệ:
- Backend team: [Slack channel]
- API Documentation: http://localhost:3305/api-docs (Swagger UI)

---

**Last Updated:** 2025-12-03
**Version:** 1.0
**Status:** ✅ Ready for Integration
