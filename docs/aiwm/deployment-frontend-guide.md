# Deployment Management - Frontend Integration Guide

## Overview

Deployment API quản lý việc triển khai (deploy) các AI models lên GPU nodes. Mỗi deployment đại diện cho một model đang chạy trên một node cụ thể.

**Base URL**: `http://localhost:3305/deployments`

**Authentication**: Tất cả endpoints yêu cầu JWT token trong header `Authorization: Bearer <token>`

---

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Data Models](#data-models)
3. [Field Descriptions](#field-descriptions)
4. [Status Lifecycle](#status-lifecycle)
5. [UI Components Guide](#ui-components-guide)
6. [Example Requests](#example-requests)
7. [Error Handling](#error-handling)

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
      "_id": "6931aef7c5c2890c91c4c5f1",
      "name": "Qwen2.5-7B - Production",
      "description": "Production deployment of Qwen2.5-7B on qwen25-7b container",
      "modelId": "69314a0657aa749a4bc4c5f2",
      "nodeId": "6931711bd436a16167c4c5f1",
      "status": "running",
      "containerId": "999e628dab4604e40c3954f0e247a07a9651f414a09ce4a7d90701ba5992a2c3",
      "containerName": "qwen25-7b",
      "dockerImage": "qwen25-7b:latest",
      "containerPort": 3901,
      "gpuDevice": "1",
      "endpoint": "http://localhost:3901",
      "lastHealthCheck": "2025-12-04T08:15:00.000Z",
      "errorMessage": null,
      "createdAt": "2025-12-04T08:00:00.000Z",
      "updatedAt": "2025-12-04T08:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 4
  },
  "statistics": {
    "total": 4
  }
}
```

---

### 2. Get Deployment by ID

**GET** `/deployments/:id`

Lấy chi tiết một deployment.

**Path Parameters:**
- `id` (string, required): Deployment ID (MongoDB ObjectId)

**Response:**
```json
{
  "_id": "6931aef7c5c2890c91c4c5f1",
  "name": "Qwen2.5-7B - Production",
  "description": "Production deployment of Qwen2.5-7B on qwen25-7b container",
  "modelId": "69314a0657aa749a4bc4c5f2",
  "nodeId": "6931711bd436a16167c4c5f1",
  "status": "running",
  "containerId": "999e628dab4604e40c3954f0e247a07a9651f414a09ce4a7d90701ba5992a2c3",
  "containerName": "qwen25-7b",
  "dockerImage": "qwen25-7b:latest",
  "containerPort": 3901,
  "gpuDevice": "1",
  "endpoint": "http://localhost:3901",
  "lastHealthCheck": "2025-12-04T08:15:00.000Z",
  "errorMessage": null,
  "metadata": {
    "resourceId": "6931ab42a23108ec94c4c5f1"
  },
  "createdAt": "2025-12-04T08:00:00.000Z",
  "updatedAt": "2025-12-04T08:15:00.000Z"
}
```

---

### 3. Create Deployment

**POST** `/deployments`

Tạo deployment mới. Deployment sẽ được tạo với status `queued`.

**Request Body:**
```json
{
  "name": "GPT-4 Mini - Testing",
  "description": "Testing deployment of GPT-4 Mini model",
  "modelId": "69314a0657aa749a4bc4c5f2",
  "nodeId": "6931711bd436a16167c4c5f1",
  "gpuDevice": "0",
  "dockerImage": "vllm/vllm-openai:latest",
  "containerPort": 8000
}
```

**Response:** (201 Created)
```json
{
  "_id": "693xxx...",
  "name": "GPT-4 Mini - Testing",
  "description": "Testing deployment of GPT-4 Mini model",
  "modelId": "69314a0657aa749a4bc4c5f2",
  "nodeId": "6931711bd436a16167c4c5f1",
  "status": "queued",
  "gpuDevice": "0",
  "dockerImage": "vllm/vllm-openai:latest",
  "containerPort": 8000,
  "createdAt": "2025-12-04T09:00:00.000Z",
  "updatedAt": "2025-12-04T09:00:00.000Z"
}
```

---

### 4. Update Deployment

**PUT** `/deployments/:id`

Cập nhật deployment. Chỉ cho phép cập nhật một số fields nhất định.

**Path Parameters:**
- `id` (string, required): Deployment ID

**Request Body:** (All fields optional)
```json
{
  "name": "GPT-4 Mini - Production",
  "description": "Updated description",
  "status": "running",
  "endpoint": "http://192.168.1.100:8000"
}
```

**Response:**
```json
{
  "_id": "693xxx...",
  "name": "GPT-4 Mini - Production",
  "description": "Updated description",
  "status": "running",
  "endpoint": "http://192.168.1.100:8000",
  "updatedAt": "2025-12-04T09:30:00.000Z"
}
```

---

### 5. Delete Deployment

**DELETE** `/deployments/:id`

Soft delete deployment. Không thể xóa deployment đang running hoặc deploying.

**Path Parameters:**
- `id` (string, required): Deployment ID

**Response:**
```json
{
  "_id": "693xxx...",
  "deletedAt": "2025-12-04T10:00:00.000Z"
}
```

---

### 6. Start Deployment

**POST** `/deployments/:id/start`

Khởi động deployment. Status sẽ chuyển từ `queued` hoặc `stopped` sang `deploying`.

**Path Parameters:**
- `id` (string, required): Deployment ID

**Response:**
```json
{
  "_id": "693xxx...",
  "status": "deploying",
  "updatedAt": "2025-12-04T10:15:00.000Z"
}
```

---

### 7. Stop Deployment

**POST** `/deployments/:id/stop`

Dừng deployment đang chạy. Status sẽ chuyển từ `running` sang `stopping`.

**Path Parameters:**
- `id` (string, required): Deployment ID

**Response:**
```json
{
  "_id": "693xxx...",
  "status": "stopping",
  "updatedAt": "2025-12-04T10:30:00.000Z"
}
```

---

## Data Models

### Deployment Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string | auto | MongoDB ObjectId |
| `name` | string | yes | Tên deployment (max 100 chars) |
| `description` | string | yes | Mô tả deployment (max 500 chars) |
| `modelId` | string | yes | ID của model được deploy |
| `nodeId` | string | yes | ID của node chạy deployment |
| `status` | string | yes | Trạng thái deployment |
| `containerId` | string | no | Docker container ID (sau khi deploy) |
| `containerName` | string | no | Tên container |
| `dockerImage` | string | no | Docker image được sử dụng |
| `containerPort` | number | no | Port của container (1024-65535) |
| `gpuDevice` | string | no | GPU device IDs (VD: "0" hoặc "0,1") |
| `endpoint` | string | no | API endpoint URL |
| `errorMessage` | string | no | Thông báo lỗi (nếu failed/error) |
| `lastHealthCheck` | string | no | Timestamp health check cuối |
| `metadata` | object | no | Metadata bổ sung |
| `createdAt` | string | auto | Timestamp tạo |
| `updatedAt` | string | auto | Timestamp cập nhật cuối |

---

## Field Descriptions

### Core Fields

#### `name` (string, required)
- **Mô tả**: Tên deployment, thường theo format "{Model Name} - {Environment}"
- **Validation**: 1-100 ký tự
- **UI Component**: Text input
- **Examples**:
  - "Qwen2.5-7B - Production"
  - "YOLOv8 - Testing"
  - "Whisper v3 - Staging"

#### `description` (string, required)
- **Mô tả**: Mô tả chi tiết về deployment
- **Validation**: 1-500 ký tự
- **UI Component**: Textarea
- **Examples**:
  - "Production deployment of Qwen2.5-7B for customer chat service"
  - "Testing deployment on GPU 2 for performance benchmarking"

#### `modelId` (string, required)
- **Mô tả**: MongoDB ObjectId của model cần deploy
- **Validation**: Valid ObjectId format
- **UI Component**: Dropdown/Select (fetch từ `/models` API)
- **Example**: "69314a0657aa749a4bc4c5f2"

#### `nodeId` (string, required)
- **Mô tả**: MongoDB ObjectId của GPU node
- **Validation**: Valid ObjectId format
- **UI Component**: Dropdown/Select (fetch từ `/nodes` API)
- **Filter**: Chỉ hiển thị nodes có status = "online"
- **Example**: "6931711bd436a16167c4c5f1"

### Container Fields

#### `containerId` (string, optional)
- **Mô tả**: Docker container ID (64 chars hex)
- **Set by**: Backend sau khi deploy thành công
- **UI Component**: Read-only text (monospace font)
- **Example**: "999e628dab4604e40c3954f0e247a07a9651f414a09ce4a7d90701ba5992a2c3"

#### `containerName` (string, optional)
- **Mô tả**: Tên container, thường là tên model
- **UI Component**: Read-only text
- **Example**: "qwen25-7b"

#### `dockerImage` (string, optional)
- **Mô tả**: Docker image sử dụng cho deployment
- **Validation**: Valid image format
- **UI Component**: Text input with suggestions
- **Examples**:
  - "vllm/vllm-openai:latest"
  - "nvcr.io/nvidia/tritonserver:24.01"
  - "qwen25-7b:latest"

#### `containerPort` (number, optional)
- **Mô tả**: Port của container để expose API
- **Validation**: 1024-65535
- **UI Component**: Number input
- **Default**: 8000
- **Examples**: 3901, 8000, 8080

### GPU Configuration

#### `gpuDevice` (string, optional)
- **Mô tả**: GPU device IDs để allocate cho deployment
- **Format**:
  - Single GPU: "0", "1", "2", "3"
  - Multiple GPUs: "0,1", "2,3", "0,1,2,3"
- **UI Component**: Multi-select checkbox hoặc text input
- **Get available GPUs**: Query từ `/nodes/:id` để xem `gpuDevices` của node
- **Examples**:
  - "0" - Use GPU 0
  - "0,1" - Use GPU 0 and 1
  - "2,3" - Use GPU 2 and 3

### Network Fields

#### `endpoint` (string, optional)
- **Mô tả**: API endpoint URL để gọi model
- **Set by**: Backend sau khi deploy, hoặc manual config
- **Format**: `http://{node-ip}:{port}/v1/models/{model-name}`
- **UI Component**: Read-only text với copy button
- **Examples**:
  - "http://localhost:3901"
  - "http://192.168.1.100:8000/v1/models/qwen25-7b"

### Health & Error Fields

#### `lastHealthCheck` (string, optional)
- **Mô tả**: Timestamp của health check gần nhất
- **Format**: ISO 8601 datetime
- **UI Component**: Relative time display (VD: "2 minutes ago")
- **Example**: "2025-12-04T08:15:00.000Z"

#### `errorMessage` (string, optional)
- **Mô tả**: Chi tiết lỗi khi status = failed/error
- **UI Component**: Alert box màu đỏ
- **Examples**:
  - "Failed to allocate GPU memory"
  - "Container failed to start: port already in use"
  - "Model file not found on node"

---

## Status Lifecycle

### Status Values

| Status | Color | Icon | Description | Valid Transitions |
|--------|-------|------|-------------|-------------------|
| `queued` | gray | ⏳ | Đang chờ deploy | → deploying |
| `deploying` | blue | 🔄 | Đang deploy | → running, failed |
| `running` | green | ✅ | Đang chạy bình thường | → stopping, error |
| `stopping` | yellow | ⏸️ | Đang dừng | → stopped |
| `stopped` | gray | ⏹️ | Đã dừng | → deploying |
| `failed` | red | ❌ | Deploy thất bại | → deploying |
| `error` | red | ⚠️ | Lỗi runtime | → stopping |

### Status Flow Diagram

```
[Create] → queued
             ↓
    [POST /start] → deploying
                      ↓
                   running ←→ error
                      ↓          ↓
             [POST /stop] → stopping
                              ↓
                          stopped
                              ↓
                    [POST /start] → deploying
```

### Status-based Actions

**Khi status = `queued`**:
- ✅ Cho phép: Start, Edit, Delete
- ❌ Không cho phép: Stop

**Khi status = `deploying`**:
- ✅ Cho phép: View logs, Cancel (→ stopped)
- ❌ Không cho phép: Start, Edit, Delete

**Khi status = `running`**:
- ✅ Cho phép: Stop, View logs, View metrics, Test endpoint
- ❌ Không cho phép: Start, Delete

**Khi status = `stopped`**:
- ✅ Cho phép: Start, Edit, Delete
- ❌ Không cho phép: Stop

**Khi status = `failed` hoặc `error`**:
- ✅ Cho phép: Retry (→ deploying), View logs, Delete
- ❌ Không cho phép: Stop

---

## UI Components Guide

### 1. Deployment List Page

**Layout**: Table view với columns:

| Column | Width | Content |
|--------|-------|---------|
| Name | 25% | Deployment name + description (truncated) |
| Model | 15% | Model name (link to model detail) |
| Node | 15% | Node name (link to node detail) |
| Status | 10% | Status badge với color/icon |
| GPU | 10% | GPU devices allocated |
| Endpoint | 15% | Endpoint URL với copy button |
| Actions | 10% | Start/Stop/Delete buttons |

**Filters**:
- Status dropdown: All, Running, Stopped, Failed
- Model dropdown: All models
- Node dropdown: All nodes
- Search: Name/Description text search

**Example Code**:
```jsx
<Table>
  <TableRow>
    <TableCell>
      <div>
        <strong>{deployment.name}</strong>
        <div className="text-sm text-gray-500">
          {deployment.description.substring(0, 60)}...
        </div>
      </div>
    </TableCell>
    <TableCell>
      <Link to={`/models/${deployment.modelId}`}>
        {modelName}
      </Link>
    </TableCell>
    <TableCell>
      <Link to={`/nodes/${deployment.nodeId}`}>
        {nodeName}
      </Link>
    </TableCell>
    <TableCell>
      <StatusBadge status={deployment.status} />
    </TableCell>
    <TableCell>
      <GPUBadge devices={deployment.gpuDevice} />
    </TableCell>
    <TableCell>
      <EndpointDisplay
        endpoint={deployment.endpoint}
        copyable
      />
    </TableCell>
    <TableCell>
      <ActionButtons deployment={deployment} />
    </TableCell>
  </TableRow>
</Table>
```

---

### 2. Create Deployment Form

**Form Fields**:

```jsx
<Form>
  {/* Basic Info */}
  <Section title="Basic Information">
    <TextInput
      label="Deployment Name *"
      name="name"
      placeholder="e.g., Qwen2.5-7B - Production"
      maxLength={100}
      required
    />

    <Textarea
      label="Description *"
      name="description"
      placeholder="Describe the purpose of this deployment"
      maxLength={500}
      rows={3}
      required
    />
  </Section>

  {/* Model & Node Selection */}
  <Section title="Deployment Target">
    <Select
      label="Model *"
      name="modelId"
      placeholder="Select a model to deploy"
      options={models}
      required
    />

    <Select
      label="GPU Node *"
      name="nodeId"
      placeholder="Select a node"
      options={onlineNodes}
      filterBy={(node) => node.status === 'online'}
      required
    />
  </Section>

  {/* GPU Configuration */}
  <Section title="GPU Configuration">
    <GPUSelector
      label="GPU Devices"
      name="gpuDevice"
      nodeId={selectedNodeId}
      availableGPUs={nodeGPUs}
      placeholder="Select GPU devices (e.g., 0,1)"
    />
  </Section>

  {/* Container Configuration */}
  <Section title="Container Configuration (Optional)">
    <TextInput
      label="Docker Image"
      name="dockerImage"
      placeholder="e.g., vllm/vllm-openai:latest"
      suggestions={[
        'vllm/vllm-openai:latest',
        'nvcr.io/nvidia/tritonserver:24.01'
      ]}
    />

    <NumberInput
      label="Container Port"
      name="containerPort"
      placeholder="8000"
      min={1024}
      max={65535}
      defaultValue={8000}
    />
  </Section>

  <FormActions>
    <Button type="submit" variant="primary">
      Create Deployment
    </Button>
    <Button type="button" variant="secondary" onClick={onCancel}>
      Cancel
    </Button>
  </FormActions>
</Form>
```

---

### 3. Deployment Detail Page

**Sections**:

**a) Overview Section**
```jsx
<Card>
  <CardHeader>
    <Title>{deployment.name}</Title>
    <StatusBadge status={deployment.status} />
  </CardHeader>
  <CardBody>
    <InfoRow label="Description" value={deployment.description} />
    <InfoRow label="Model" value={<ModelLink modelId={deployment.modelId} />} />
    <InfoRow label="Node" value={<NodeLink nodeId={deployment.nodeId} />} />
    <InfoRow label="Created" value={<RelativeTime time={deployment.createdAt} />} />
    <InfoRow label="Last Updated" value={<RelativeTime time={deployment.updatedAt} />} />
  </CardBody>
</Card>
```

**b) Container Info Section**
```jsx
<Card>
  <CardHeader>Container Information</CardHeader>
  <CardBody>
    <InfoRow label="Container ID" value={
      <CodeBlock copyable>{deployment.containerId}</CodeBlock>
    } />
    <InfoRow label="Container Name" value={deployment.containerName} />
    <InfoRow label="Docker Image" value={deployment.dockerImage} />
    <InfoRow label="Port" value={deployment.containerPort} />
  </CardBody>
</Card>
```

**c) GPU Allocation Section**
```jsx
<Card>
  <CardHeader>GPU Allocation</CardHeader>
  <CardBody>
    <GPUList devices={deployment.gpuDevice?.split(',')} />
  </CardBody>
</Card>
```

**d) Network Section**
```jsx
<Card>
  <CardHeader>Network & Endpoint</CardHeader>
  <CardBody>
    <InfoRow label="API Endpoint" value={
      <EndpointDisplay
        endpoint={deployment.endpoint}
        copyable
        testable
      />
    } />
    <TestEndpointButton endpoint={deployment.endpoint} />
  </CardBody>
</Card>
```

**e) Health & Monitoring Section**
```jsx
<Card>
  <CardHeader>Health & Monitoring</CardHeader>
  <CardBody>
    <InfoRow
      label="Last Health Check"
      value={<RelativeTime time={deployment.lastHealthCheck} />}
    />
    {deployment.errorMessage && (
      <Alert variant="error">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{deployment.errorMessage}</AlertDescription>
      </Alert>
    )}
  </CardBody>
</Card>
```

**f) Actions Section**
```jsx
<Card>
  <CardHeader>Actions</CardHeader>
  <CardBody>
    <ButtonGroup>
      {deployment.status === 'running' && (
        <Button onClick={handleStop} variant="warning">
          Stop Deployment
        </Button>
      )}
      {['stopped', 'queued', 'failed'].includes(deployment.status) && (
        <Button onClick={handleStart} variant="primary">
          Start Deployment
        </Button>
      )}
      {['stopped', 'failed'].includes(deployment.status) && (
        <Button onClick={handleDelete} variant="danger">
          Delete Deployment
        </Button>
      )}
    </ButtonGroup>
  </CardBody>
</Card>
```

---

### 4. Status Badge Component

```jsx
const StatusBadge = ({ status }) => {
  const config = {
    queued: { color: 'gray', icon: '⏳', text: 'Queued' },
    deploying: { color: 'blue', icon: '🔄', text: 'Deploying' },
    running: { color: 'green', icon: '✅', text: 'Running' },
    stopping: { color: 'yellow', icon: '⏸️', text: 'Stopping' },
    stopped: { color: 'gray', icon: '⏹️', text: 'Stopped' },
    failed: { color: 'red', icon: '❌', text: 'Failed' },
    error: { color: 'red', icon: '⚠️', text: 'Error' },
  };

  const { color, icon, text } = config[status] || config.queued;

  return (
    <span className={`badge badge-${color}`}>
      <span className="icon">{icon}</span>
      <span className="text">{text}</span>
    </span>
  );
};
```

---

## Example Requests

### cURL Examples

**1. List all deployments**
```bash
curl -X GET "http://localhost:3305/deployments?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**2. Get deployment by ID**
```bash
curl -X GET "http://localhost:3305/deployments/6931aef7c5c2890c91c4c5f1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**3. Create new deployment**
```bash
curl -X POST "http://localhost:3305/deployments" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Qwen2.5-7B - Production",
    "description": "Production deployment for customer chat",
    "modelId": "69314a0657aa749a4bc4c5f2",
    "nodeId": "6931711bd436a16167c4c5f1",
    "gpuDevice": "0",
    "dockerImage": "vllm/vllm-openai:latest",
    "containerPort": 8000
  }'
```

**4. Update deployment**
```bash
curl -X PUT "http://localhost:3305/deployments/6931aef7c5c2890c91c4c5f1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Qwen2.5-7B - Production v2",
    "description": "Updated deployment"
  }'
```

**5. Start deployment**
```bash
curl -X POST "http://localhost:3305/deployments/6931aef7c5c2890c91c4c5f1/start" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**6. Stop deployment**
```bash
curl -X POST "http://localhost:3305/deployments/6931aef7c5c2890c91c4c5f1/stop" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**7. Delete deployment**
```bash
curl -X DELETE "http://localhost:3305/deployments/6931aef7c5c2890c91c4c5f1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Error Handling

### Common Error Codes

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Bad Request | Invalid input data (validation failed) |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | User không có quyền (RBAC) |
| 404 | Not Found | Deployment/Model/Node không tồn tại |
| 409 | Conflict | Cannot perform action (e.g., delete running deployment) |
| 500 | Internal Server Error | Server error |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "modelId",
      "message": "modelId must be a valid MongoDB ObjectId"
    }
  ]
}
```

### Error Handling in UI

```jsx
const handleCreateDeployment = async (data) => {
  try {
    const response = await api.post('/deployments', data);
    toast.success('Deployment created successfully!');
    navigate(`/deployments/${response.data._id}`);
  } catch (error) {
    if (error.response?.status === 400) {
      // Validation errors
      const details = error.response.data.details || [];
      details.forEach(detail => {
        setFieldError(detail.field, detail.message);
      });
    } else if (error.response?.status === 404) {
      toast.error('Model or Node not found');
    } else if (error.response?.status === 403) {
      toast.error('You do not have permission to create deployments');
    } else {
      toast.error('Failed to create deployment. Please try again.');
    }
  }
};
```

---

## Notes for Frontend Developers

### 1. Real-time Status Updates

Deployments có lifecycle với nhiều status transitions. Nên implement polling hoặc WebSocket để cập nhật status real-time:

```jsx
useEffect(() => {
  const interval = setInterval(() => {
    if (['deploying', 'stopping'].includes(deployment.status)) {
      refetchDeployment();
    }
  }, 5000); // Poll every 5 seconds

  return () => clearInterval(interval);
}, [deployment.status]);
```

### 2. GPU Availability Check

Trước khi tạo deployment, nên check GPU availability của node:

```jsx
const getAvailableGPUs = async (nodeId) => {
  const node = await api.get(`/nodes/${nodeId}`);
  const allGPUs = node.data.gpuDevices || [];

  // Get GPUs already in use by other deployments
  const deployments = await api.get(`/deployments?nodeId=${nodeId}`);
  const usedGPUs = deployments.data.data
    .filter(d => d.status === 'running')
    .flatMap(d => d.gpuDevice?.split(',') || []);

  return allGPUs.filter(gpu => !usedGPUs.includes(gpu.deviceId));
};
```

### 3. Validation Rules

Implement validation trước khi submit form:

```jsx
const validateDeployment = (data) => {
  const errors = {};

  if (!data.name || data.name.length < 1 || data.name.length > 100) {
    errors.name = 'Name must be 1-100 characters';
  }

  if (!data.description || data.description.length < 1 || data.description.length > 500) {
    errors.description = 'Description must be 1-500 characters';
  }

  if (!data.modelId) {
    errors.modelId = 'Model is required';
  }

  if (!data.nodeId) {
    errors.nodeId = 'Node is required';
  }

  if (data.containerPort && (data.containerPort < 1024 || data.containerPort > 65535)) {
    errors.containerPort = 'Port must be between 1024-65535';
  }

  return errors;
};
```

### 4. Status Color Scheme

Recommended colors for status badges:

```css
.badge-gray { background: #6b7280; color: white; }
.badge-blue { background: #3b82f6; color: white; }
.badge-green { background: #10b981; color: white; }
.badge-yellow { background: #f59e0b; color: white; }
.badge-red { background: #ef4444; color: white; }
```

---

## Summary

**Key Points**:
- 7 endpoints cho deployment management (CRUD + start/stop)
- Status lifecycle: queued → deploying → running → stopping → stopped
- Link Model + Node + Container info
- GPU allocation tracking
- Health monitoring với lastHealthCheck
- Soft delete (không xóa vật lý)

**Next Steps**:
1. Implement deployment list page với table view
2. Implement create deployment form với model/node selection
3. Implement deployment detail page với all sections
4. Add real-time status updates (polling/WebSocket)
5. Add GPU availability checking
6. Implement action buttons (start/stop/delete) với proper permissions

**Related APIs**:
- Models API: `/models` - Để select model khi tạo deployment
- Nodes API: `/nodes` - Để select node và check GPU availability
- Resources API: `/resources` - Để xem container info chi tiết
