# Deployment Management - Frontend Integration Guide

## Overview

Deployment API quản lý việc triển khai (deploy) các AI models lên GPU nodes thông qua inference containers. Mỗi deployment liên kết:
- **Model**: AI model cần deploy (LLM, Vision, Voice, etc.)
- **Node**: GPU server vật lý nơi container chạy
- **Resource**: Inference container (Docker) đang chạy model

**Base URL**: `http://localhost:3002/deployments`

**Authentication**: Tất cả endpoints yêu cầu JWT token trong header `Authorization: Bearer <token>`

---

## 🔄 Schema Changes (v2.0)

### ⚠️ BREAKING CHANGES

**IDs giờ là STRING thay vì ObjectId:**
```json
// OLD (v1.0)
{
  "modelId": { "$oid": "69314a0657aa749a4bc4c5f2" },
  "nodeId": { "$oid": "6931711bd436a16167c4c5f1" }
}

// NEW (v2.0)
{
  "modelId": "69314a0657aa749a4bc4c5f2",
  "nodeId": "6931711bd436a16167c4c5f1",
  "resourceId": "6931ab42a23108ec94c4c5f1"  // NEW field
}
```

**Container info REMOVED from schema:**

Các trường sau đã bị XÓA khỏi Deployment schema:
- ❌ `containerId`
- ❌ `containerName`
- ❌ `dockerImage`
- ❌ `containerPort`
- ❌ `gpuDevice`
- ❌ `endpoint`

**Lý do**: Container info giờ được lấy động từ Resource document, đảm bảo data luôn đồng bộ.

---

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Data Models](#data-models)
3. [Field Descriptions](#field-descriptions)
4. [Endpoint Resolution](#endpoint-resolution)
5. [Status Lifecycle](#status-lifecycle)
6. [UI Components Guide](#ui-components-guide)
7. [Example Requests](#example-requests)
8. [Error Handling](#error-handling)
9. [Migration Guide](#migration-guide)

---

## API Endpoints

### 1. List Deployments

**GET** `/deployments`

Query tất cả deployments với pagination.

**Query Parameters:**
- `page` (number, optional): Số trang, mặc định = 1
- `limit` (number, optional): Số items mỗi trang, mặc định = 10

**Response:**
```json
{
  "data": [
    {
      "_id": "6931c308b3ed8cd22dc4c5f1",
      "name": "Qwen2.5-7B - Production",
      "description": "Production deployment of Qwen2.5-7B on qwen25-7b container",
      "modelId": "69314a0657aa749a4bc4c5f2",
      "nodeId": "6931711bd436a16167c4c5f1",
      "resourceId": "6931ab42a23108ec94c4c5f1",
      "status": "running",
      "lastHealthCheck": "2025-12-04T17:21:12.992Z",
      "errorMessage": null,
      "createdAt": "2025-12-04T17:21:12.992Z",
      "updatedAt": "2025-12-04T17:21:12.992Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 4
  },
  "statistics": {
    "total": 4,
    "byStatus": {
      "running": 4,
      "stopped": 0
    }
  }
}
```

---

### 2. Get Deployment by ID

**GET** `/deployments/:id`

Lấy chi tiết một deployment.

**Path Parameters:**
- `id` (string, required): Deployment ID

**Response:**
```json
{
  "_id": "6931c308b3ed8cd22dc4c5f1",
  "name": "Qwen2.5-7B - Production",
  "description": "Production deployment of Qwen2.5-7B on qwen25-7b container",
  "modelId": "69314a0657aa749a4bc4c5f2",
  "nodeId": "6931711bd436a16167c4c5f1",
  "resourceId": "6931ab42a23108ec94c4c5f1",
  "status": "running",
  "lastHealthCheck": "2025-12-04T17:21:12.992Z",
  "errorMessage": null,
  "owner": {
    "userId": "692ff5fa3371dad36b287ec4",
    "orgId": "692ff5fa3371dad36b287ec5"
  },
  "createdAt": "2025-12-04T17:21:12.992Z",
  "updatedAt": "2025-12-04T17:21:12.992Z"
}
```

---

### 3. Create Deployment

**POST** `/deployments`

Tạo deployment mới.

**Request Body:**
```json
{
  "name": "Whisper-v3 - Staging",
  "description": "Staging deployment for voice recognition",
  "modelId": "69314a0657aa749a4bc4c5f3",
  "nodeId": "6931711bd436a16167c4c5f1",
  "resourceId": "6931ab43a23108ec94c4c5f4",
  "status": "queued"
}
```

**Required Fields:**
- ✅ `name` (string, 1-100 chars): Tên deployment
- ✅ `description` (string, 1-500 chars): Mô tả
- ✅ `modelId` (string): Model ID (ObjectId as string)
- ✅ `nodeId` (string): Node ID (ObjectId as string)
- ✅ `resourceId` (string): Resource ID - inference-container (ObjectId as string)

**Optional Fields:**
- `status` (enum): Default = `'queued'`

**Validation Rules:**
- Model must exist and `status = 'active'`
- Node must exist and `status = 'online'`
- Resource must exist and `resourceType = 'inference-container'`

**Response:** (201 Created)
```json
{
  "_id": "6931c309b3ed8cd22dc4c5f5",
  "name": "Whisper-v3 - Staging",
  "description": "Staging deployment for voice recognition",
  "modelId": "69314a0657aa749a4bc4c5f3",
  "nodeId": "6931711bd436a16167c4c5f1",
  "resourceId": "6931ab43a23108ec94c4c5f4",
  "status": "queued",
  "createdAt": "2025-12-04T17:30:00.000Z",
  "updatedAt": "2025-12-04T17:30:00.000Z"
}
```

---

### 4. Update Deployment

**PUT** `/deployments/:id`

Cập nhật deployment.

**Path Parameters:**
- `id` (string, required): Deployment ID

**Request Body:**
```json
{
  "name": "Whisper-v3 - Production",
  "status": "running"
}
```

**Updatable Fields:**
- `name` (string)
- `description` (string)
- `status` (enum) - phải tuân theo [Status Lifecycle](#status-lifecycle)
- `errorMessage` (string)
- `lastHealthCheck` (datetime)

**⚠️ NOT Updatable:**
- `modelId`, `nodeId`, `resourceId` - Không thể thay đổi sau khi tạo

**Response:** (200 OK)
```json
{
  "_id": "6931c309b3ed8cd22dc4c5f5",
  "name": "Whisper-v3 - Production",
  "status": "running",
  "updatedAt": "2025-12-04T17:35:00.000Z"
}
```

---

### 5. Delete Deployment

**DELETE** `/deployments/:id`

Soft delete deployment.

**Path Parameters:**
- `id` (string, required): Deployment ID

**Restrictions:**
- ❌ Không thể delete deployment đang `running` hoặc `deploying`
- ✅ Phải stop trước khi delete

**Response:** (200 OK)
```json
{
  "message": "Deployment deleted successfully"
}
```

---

### 6. Start Deployment

**POST** `/deployments/:id/start`

Bắt đầu deployment (chuyển từ `stopped`/`failed` → `deploying`).

**Path Parameters:**
- `id` (string, required): Deployment ID

**Valid Transitions:**
- `stopped` → `deploying`
- `failed` → `deploying`

**Response:** (200 OK)
```json
{
  "_id": "6931c309b3ed8cd22dc4c5f5",
  "status": "deploying",
  "updatedAt": "2025-12-04T17:40:00.000Z"
}
```

---

### 7. Stop Deployment

**POST** `/deployments/:id/stop`

Dừng deployment đang chạy (chuyển `running` → `stopping`).

**Path Parameters:**
- `id` (string, required): Deployment ID

**Valid Transitions:**
- `running` → `stopping`

**Response:** (200 OK)
```json
{
  "_id": "6931c309b3ed8cd22dc4c5f5",
  "status": "stopping",
  "updatedAt": "2025-12-04T17:45:00.000Z"
}
```

---

### 8. Get API Spec

**GET** `/deployments/:id/api-spec`

Lấy OpenAPI specification từ model inference endpoint.

**Path Parameters:**
- `id` (string, required): Deployment ID

**How it works:**
1. Resolve endpoint từ `resourceId` + `nodeId`
2. Fetch `{endpoint}/openapi.json`
3. Return OpenAPI spec

**Response:** (200 OK)
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Qwen2.5-7B Inference API",
    "version": "1.0.0"
  },
  "paths": {
    "/v1/chat/completions": {
      "post": { ... }
    }
  }
}
```

**Error Cases:**
- `400`: Deployment not running
- `404`: OpenAPI spec not found
- `502`: Endpoint unreachable
- `504`: Request timeout

---

### 9. Proxy Inference

**ALL** `/deployments/:id/inference/*`

Proxy tất cả HTTP requests đến model inference endpoint.

**Example:**
```bash
POST /deployments/6931c308b3ed8cd22dc4c5f1/inference/v1/chat/completions
→ Proxied to http://172.16.3.20:3901/v1/chat/completions
```

**How it works:**
1. Resolve endpoint từ `resourceId` + `nodeId`
2. Extract path sau `/inference`
3. Forward request đến `{endpoint}{path}`
4. Stream response về client

**Supported Methods:**
- GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD

**Request Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-7b",
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.7
  }' \
  http://localhost:3002/deployments/6931c308b3ed8cd22dc4c5f1/inference/v1/chat/completions
```

**Response:** (200 OK - Streamed from inference endpoint)
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    }
  }]
}
```

---

## Data Models

### Deployment Schema (v2.0)

```typescript
interface Deployment {
  _id: string;                    // MongoDB ObjectId
  name: string;                   // Deployment name (1-100 chars)
  description: string;            // Description (1-500 chars)

  // Reference IDs (stored as strings)
  modelId: string;                // Model ID
  nodeId: string;                 // Node ID
  resourceId: string;             // Resource ID (inference-container)

  // Status
  status: DeploymentStatus;       // Enum: queued, deploying, running, stopping, stopped, failed, error

  // Health monitoring
  lastHealthCheck?: Date;         // Last successful health check
  errorMessage?: string;          // Error details if failed

  // BaseSchema fields
  owner: {
    userId: string;
    orgId: string;
  };
  createdBy: string;
  updatedBy: string;
  deletedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

type DeploymentStatus =
  | 'queued'      // Waiting for deployment
  | 'deploying'   // Currently being deployed
  | 'running'     // Successfully running
  | 'stopping'    // Being stopped
  | 'stopped'     // Stopped by user
  | 'failed'      // Deployment failed
  | 'error';      // Runtime error
```

---

## Field Descriptions

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | Tên deployment (1-100 chars). VD: "Qwen2.5-7B - Production" |
| `description` | string | ✅ Yes | Mô tả deployment (1-500 chars) |
| `modelId` | string | ✅ Yes | ID của Model (ObjectId as string) |
| `nodeId` | string | ✅ Yes | ID của Node (ObjectId as string) |
| `resourceId` | string | ✅ Yes | ID của Resource - inference-container (ObjectId as string) |
| `status` | enum | ✅ Yes | Trạng thái deployment (default: `queued`) |

### Health Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lastHealthCheck` | datetime | ❌ No | Timestamp của health check gần nhất |
| `errorMessage` | string | ❌ No | Chi tiết lỗi nếu status = `failed` hoặc `error` |

### ❌ Removed Fields (v2.0)

Các trường sau **KHÔNG CÒN** trong schema:

| Removed Field | Reason |
|---------------|--------|
| `containerId` | Lấy từ `Resource.runtime.id` |
| `containerName` | Lấy từ `Resource.name` |
| `dockerImage` | Lấy từ `Resource.config.imageName + imageTag` |
| `containerPort` | Lấy từ `Resource.config.containerPorts[0].hostPort` |
| `gpuDevice` | Lấy từ `Resource.runtime.allocatedGPU` |
| `endpoint` | Build động từ `Node.ipAddress` + `Resource.containerPorts[0].hostPort` |

---

## Endpoint Resolution

### 🔄 Dynamic Endpoint Building

Trong v2.0, endpoint được build **động** thay vì lưu trữ trong DB:

```typescript
// Backend logic
async function getDeploymentEndpoint(deploymentId: string): Promise<string> {
  // 1. Get deployment
  const deployment = await Deployment.findById(deploymentId);

  // 2. Get resource (inference-container)
  const resource = await Resource.findById(deployment.resourceId);

  // 3. Get node (GPU server)
  const node = await Node.findById(deployment.nodeId);

  // 4. Extract port from resource (first port mapping)
  const hostPort = resource.config.containerPorts[0].hostPort;

  // 5. Build endpoint URL
  const endpoint = `http://${node.ipAddress}:${hostPort}`;

  return endpoint; // "http://172.16.3.20:3901"
}
```

### Frontend Implementation

**Option 1: Fetch endpoint khi cần**
```typescript
// Fetch deployment + resolve endpoint
async function getDeploymentEndpoint(deploymentId: string) {
  // Call proxy endpoint to get OpenAPI spec
  // Endpoint resolution happens on backend
  const apiSpec = await fetch(
    `/deployments/${deploymentId}/api-spec`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  // Endpoint is resolved internally, no need to build on frontend
}
```

**Option 2: Fetch related documents**
```typescript
// Nếu cần hiển thị endpoint trên UI
async function getDeploymentDetails(deploymentId: string) {
  const deployment = await fetch(`/deployments/${deploymentId}`);
  const resource = await fetch(`/resources/${deployment.resourceId}`);
  const node = await fetch(`/nodes/${deployment.nodeId}`);

  // Build endpoint for display
  const hostPort = resource.config.containerPorts[0].hostPort;
  const endpoint = `http://${node.ipAddress}:${hostPort}`;

  return { deployment, resource, node, endpoint };
}
```

**⚠️ Recommended Approach:**

Sử dụng **proxy endpoints** (`/inference/*`, `/api-spec`) thay vì build endpoint trực tiếp trên frontend. Backend sẽ handle endpoint resolution tự động.

---

## Status Lifecycle

### Status Flow Diagram

```
┌─────────┐
│ queued  │ ← Initial state when deployment is created
└────┬────┘
     │ start
     ▼
┌───────────┐
│ deploying │ ← Container is being started
└─────┬─────┘
      │
      ├─── success ──→ ┌─────────┐
      │                │ running │ ← Container is running
      │                └────┬────┘
      │                     │ stop
      └── failure ──→ ┌────▼─────┐
                      │ stopping │ ← Container is stopping
                      └────┬─────┘
                           │
                           ▼
                      ┌─────────┐
                      │ stopped │ ← Container stopped
                      └────┬────┘
                           │ start (retry)
                           └──────────────→ deploying

┌────────┐
│ failed │ ← Deployment failed
└───┬────┘
    │ start (retry)
    └──────────────→ deploying

┌───────┐
│ error │ ← Runtime error occurred
└───┬───┘
    │ restart
    └──────────────→ deploying
```

### Valid Status Transitions

| From | To | Action | Description |
|------|----|----|-------------|
| `queued` | `deploying` | start | Bắt đầu deploy |
| `queued` | `failed` | - | Deploy thất bại |
| `queued` | `stopped` | cancel | Hủy deploy |
| `deploying` | `running` | - | Deploy thành công |
| `deploying` | `failed` | - | Deploy thất bại |
| `deploying` | `error` | - | Lỗi runtime |
| `running` | `stopping` | stop | User dừng deployment |
| `running` | `error` | - | Runtime error |
| `stopping` | `stopped` | - | Đã dừng thành công |
| `stopping` | `error` | - | Lỗi khi dừng |
| `stopped` | `deploying` | start | Restart deployment |
| `failed` | `deploying` | start | Retry deployment |
| `error` | `deploying` | restart | Restart sau lỗi |
| `error` | `stopped` | stop | Force stop |

### Status Validation

**Backend tự động validate** status transitions. Nếu transition không hợp lệ → `400 Bad Request`:

```json
{
  "statusCode": 400,
  "message": "Invalid status transition from 'running' to 'queued'. Allowed transitions: stopping, error",
  "error": "Bad Request"
}
```

---

## UI Components Guide

### 1. Deployment List Page

**Components:**
- **Table/Grid**: Hiển thị danh sách deployments
- **Filters**: Filter theo status, model, node
- **Search**: Tìm kiếm theo name
- **Pagination**: Page navigation

**Table Columns:**
| Column | Field | Display |
|--------|-------|---------|
| Name | `name` | Text + Link to detail |
| Model | `modelId` | Fetch Model name via API |
| Node | `nodeId` | Fetch Node name via API |
| Status | `status` | Badge with color |
| Last Health | `lastHealthCheck` | Relative time (e.g., "5 mins ago") |
| Actions | - | Start/Stop/Delete buttons |

**Status Badge Colors:**
```typescript
const statusColors = {
  queued: 'gray',
  deploying: 'blue',
  running: 'green',
  stopping: 'orange',
  stopped: 'gray',
  failed: 'red',
  error: 'red'
};
```

---

### 2. Deployment Detail Page

**Sections:**

#### A. Overview Card
- **Name**: Display + Edit button
- **Description**: Display + Edit button
- **Status**: Badge with last updated time
- **Actions**: Start/Stop/Delete buttons (disabled based on status)

#### B. Configuration Info
Fetch thông tin từ các related documents:

```typescript
// Fetch related data
const deployment = await fetch(`/deployments/${id}`);
const model = await fetch(`/models/${deployment.modelId}`);
const node = await fetch(`/nodes/${deployment.nodeId}`);
const resource = await fetch(`/resources/${deployment.resourceId}`);

// Display info
const info = {
  model: {
    name: model.name,
    type: model.type,
    framework: model.framework
  },
  node: {
    name: node.name,
    ipAddress: node.ipAddress,
    gpuDevices: node.gpuDevices
  },
  container: {
    name: resource.name,
    imageName: resource.config.imageName,
    imageTag: resource.config.imageTag,
    containerPorts: resource.config.containerPorts,
    allocatedGPU: resource.runtime.allocatedGPU
  },
  endpoint: `http://${node.ipAddress}:${resource.config.containerPorts[0].hostPort}`
};
```

**Display Fields:**
| Section | Field | Source |
|---------|-------|--------|
| Model Info | Name, Type, Framework | `models/{modelId}` |
| Node Info | Name, IP Address, GPU Count | `nodes/{nodeId}` |
| Container Info | Name, Image, Port, GPU | `resources/{resourceId}` |
| Endpoint | Full URL | Built from Node IP + Resource port |

#### C. Health Monitor
- **Last Health Check**: Display timestamp
- **Error Message**: Display if `status = failed/error`
- **Refresh Button**: Manually trigger health check

#### D. Actions Section

**Button States:**

| Status | Start | Stop | Delete |
|--------|-------|------|--------|
| `queued` | ✅ Enabled | ❌ Disabled | ✅ Enabled |
| `deploying` | ❌ Disabled | ❌ Disabled | ❌ Disabled |
| `running` | ❌ Disabled | ✅ Enabled | ❌ Disabled |
| `stopping` | ❌ Disabled | ❌ Disabled | ❌ Disabled |
| `stopped` | ✅ Enabled | ❌ Disabled | ✅ Enabled |
| `failed` | ✅ Enabled (Retry) | ❌ Disabled | ✅ Enabled |
| `error` | ✅ Enabled (Restart) | ✅ Enabled | ❌ Disabled |

---

### 3. Create Deployment Form

**Form Fields:**

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| Name | Text input | Required, 1-100 chars | |
| Description | Textarea | Required, 1-500 chars | |
| Model | Dropdown | Required | Fetch from `/models?status=active` |
| Node | Dropdown | Required | Fetch from `/nodes?status=online` |
| Resource | Dropdown | Required | Fetch from `/resources?resourceType=inference-container&nodeId={nodeId}` |

**Dropdown Data Fetch:**
```typescript
// Model dropdown
const models = await fetch('/models?status=active');
// Show: model.name (model.type - model.framework)

// Node dropdown
const nodes = await fetch('/nodes?status=online');
// Show: node.name (node.ipAddress - {gpuCount} GPUs)

// Resource dropdown (filter by selected node)
const resources = await fetch(`/resources?resourceType=inference-container&nodeId=${selectedNodeId}`);
// Show: resource.name (GPU: {allocatedGPU}, Port: {hostPort})
```

**Form Submission:**
```typescript
const formData = {
  name: 'My Deployment',
  description: 'Production deployment',
  modelId: '69314a0657aa749a4bc4c5f2',
  nodeId: '6931711bd436a16167c4c5f1',
  resourceId: '6931ab42a23108ec94c4c5f1',
  status: 'queued'  // Default
};

const response = await fetch('/deployments', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(formData)
});
```

---

### 4. Inference Testing UI

**Component**: Test inference endpoint trực tiếp từ UI

```typescript
// Use proxy endpoint
const testInference = async (deploymentId: string, prompt: string) => {
  const response = await fetch(
    `/deployments/${deploymentId}/inference/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'model-name',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    }
  );

  return response.json();
};
```

**UI Elements:**
- **Input**: Textarea cho prompt
- **Submit Button**: Send request
- **Response Display**: JSON viewer hoặc formatted text
- **Latency Meter**: Show response time
- **API Spec Button**: Link to OpenAPI spec

---

## Example Requests

### 1. List All Deployments

```bash
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3002/deployments?page=1&limit=10'
```

### 2. Get Deployment Details

```bash
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3002/deployments/6931c308b3ed8cd22dc4c5f1'
```

### 3. Create New Deployment

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-Neo - Production",
    "description": "Production deployment for customer service",
    "modelId": "69314a0657aa749a4bc4c5f6",
    "nodeId": "6931711bd436a16167c4c5f1",
    "resourceId": "6931ab42a23108ec94c4c5f5"
  }' \
  'http://localhost:3002/deployments'
```

### 4. Update Deployment

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-Neo - Production v2",
    "description": "Updated deployment configuration"
  }' \
  'http://localhost:3002/deployments/6931c308b3ed8cd22dc4c5f1'
```

### 5. Start Deployment

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3002/deployments/6931c308b3ed8cd22dc4c5f1/start'
```

### 6. Stop Deployment

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3002/deployments/6931c308b3ed8cd22dc4c5f1/stop'
```

### 7. Delete Deployment

```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3002/deployments/6931c308b3ed8cd22dc4c5f1'
```

### 8. Get API Spec

```bash
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3002/deployments/6931c308b3ed8cd22dc4c5f1/api-spec'
```

### 9. Proxy Inference Request

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-7b",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is artificial intelligence?"}
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }' \
  'http://localhost:3002/deployments/6931c308b3ed8cd22dc4c5f1/inference/v1/chat/completions'
```

---

## Error Handling

### Common Error Codes

| Status Code | Error | Description | Solution |
|-------------|-------|-------------|----------|
| `400` | Bad Request | Invalid input data hoặc status transition | Check request body và status flow |
| `401` | Unauthorized | Missing hoặc invalid JWT token | Add valid token to Authorization header |
| `403` | Forbidden | User không có quyền truy cập | Check RBAC permissions |
| `404` | Not Found | Deployment không tồn tại | Verify deployment ID |
| `409` | Conflict | Cannot delete running deployment | Stop deployment trước |
| `502` | Bad Gateway | Inference endpoint unreachable | Check node/container status |
| `504` | Gateway Timeout | Inference request timeout | Retry hoặc check endpoint health |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Invalid status transition from 'running' to 'queued'",
  "error": "Bad Request",
  "timestamp": "2025-12-04T17:50:00.000Z",
  "path": "/deployments/6931c308b3ed8cd22dc4c5f1"
}
```

### Frontend Error Handling

```typescript
try {
  const response = await fetch('/deployments', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();

    switch (error.statusCode) {
      case 400:
        showToast('error', `Validation error: ${error.message}`);
        break;
      case 401:
        redirectToLogin();
        break;
      case 403:
        showToast('error', 'You do not have permission to perform this action');
        break;
      case 404:
        showToast('error', 'Deployment not found');
        break;
      case 502:
        showToast('error', 'Inference endpoint is not reachable');
        break;
      default:
        showToast('error', 'An unexpected error occurred');
    }
  }
} catch (err) {
  showToast('error', 'Network error. Please try again.');
}
```

---

## Migration Guide

### Migrating from v1.0 to v2.0

#### 1. Update Data Fetching

**OLD (v1.0):**
```typescript
// Container info stored in deployment
const deployment = await fetch(`/deployments/${id}`);
const endpoint = deployment.endpoint;
const port = deployment.containerPort;
const gpu = deployment.gpuDevice;
```

**NEW (v2.0):**
```typescript
// Fetch related documents
const deployment = await fetch(`/deployments/${id}`);
const resource = await fetch(`/resources/${deployment.resourceId}`);
const node = await fetch(`/nodes/${deployment.nodeId}`);

// Build info from resource + node
const port = resource.config.containerPorts[0].hostPort;
const gpu = resource.runtime.allocatedGPU;
const endpoint = `http://${node.ipAddress}:${port}`;
```

#### 2. Update Create Form

**Add `resourceId` field:**
```typescript
// OLD
{ modelId, nodeId }

// NEW
{ modelId, nodeId, resourceId }  // resourceId is required
```

#### 3. Use Proxy Endpoints

**Thay vì build endpoint trên frontend:**
```typescript
// OLD - Build endpoint manually
const endpoint = `http://${node.ipAddress}:${port}`;
fetch(`${endpoint}/v1/chat/completions`);

// NEW - Use proxy endpoint
fetch(`/deployments/${id}/inference/v1/chat/completions`);
```

#### 4. Remove ObjectId Conversions

**IDs giờ là strings:**
```typescript
// OLD
const modelId = new ObjectId(deployment.modelId);

// NEW
const modelId = deployment.modelId; // Already a string
```

#### 5. Handle Missing Fields

**Check for removed fields:**
```typescript
// These fields no longer exist
deployment.containerId     // ❌ Removed
deployment.containerName   // ❌ Removed
deployment.dockerImage     // ❌ Removed
deployment.containerPort   // ❌ Removed
deployment.gpuDevice       // ❌ Removed
deployment.endpoint        // ❌ Removed

// Get from resource instead
resource.runtime.id                           // Container ID
resource.name                                 // Container name
resource.config.imageName + ':' + imageTag    // Docker image
resource.config.containerPorts[0].hostPort    // Port
resource.runtime.allocatedGPU                 // GPU devices
```

---

## Developer Notes

### Performance Considerations

1. **Endpoint Resolution**: Endpoint được resolve động, có thể cache nếu cần:
   ```typescript
   // Cache endpoint for 5 minutes
   const cachedEndpoint = await cache.get(`deployment:${id}:endpoint`, async () => {
     return await deploymentService.getDeploymentEndpoint(id);
   }, { ttl: 300 });
   ```

2. **Batch Fetching**: Khi list deployments, fetch related documents in batches:
   ```typescript
   const deployments = await fetch('/deployments?page=1&limit=10');
   const modelIds = deployments.data.map(d => d.modelId);
   const models = await fetch(`/models?ids=${modelIds.join(',')}`);
   ```

3. **Real-time Updates**: Subscribe to deployment status changes:
   ```typescript
   // WebSocket subscription
   socket.on('deployment:status', (data) => {
     updateDeploymentStatus(data.deploymentId, data.status);
   });
   ```

### Security Notes

- ✅ All endpoints require JWT authentication
- ✅ RBAC permissions enforced on all operations
- ✅ Sensitive headers stripped in proxy requests
- ✅ Request validation on all inputs
- ✅ Status transition validation prevents invalid states

### API Versioning

Current version: **v2.0**

Breaking changes from v1.0:
- IDs changed from ObjectId to string
- Container fields removed from schema
- resourceId field added
- Endpoint resolution changed to dynamic

---

## Support

**API Documentation**: http://localhost:3002/api-docs

**Example Data**:
- 4 seeded deployments available
- Models: Qwen2.5-7B, VBD-LLaMA2, YOLOv8, Whisper-v3
- All deployments running on node `6931711bd436a16167c4c5f1`

**Troubleshooting**:
1. Check deployment status via GET `/deployments/:id`
2. Verify resource + node exist and are online
3. Test inference endpoint via `/deployments/:id/api-spec`
4. Check logs for detailed error messages
