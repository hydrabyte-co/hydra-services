# Container Management API - Frontend Integration Guide

**Service:** AIWM
**Module:** Resources (Application Container & Inference Container)
**Base URL:** `http://localhost:3305` (development)
**Authentication:** Bearer Token (JWT)
**Version:** 1.0 (V1 - Metadata only, mock actions)
**Date:** 2025-12-03

---

## 📋 Tổng quan

API quản lý 2 loại containers:
1. **Application Container** - Docker containers cho user applications (Postgres, Nginx, Redis...)
2. **Inference Container** - Specialized containers cho AI model inference

**⚠️ Lưu ý V1:**
- CRUD operations hoạt động đầy đủ với database
- Lifecycle actions (start/stop/restart/exec) trả về **mock responses**
- Monitoring data (logs/metrics) là **mock data**
- **V2 sẽ tích hợp thật với Docker/Podman trên worker nodes**

---

## 🎯 Use Cases

### Application Container

| Use Case | Mô tả | Example |
|----------|-------|---------|
| **Databases** | PostgreSQL, MySQL, MongoDB | `postgres:16-alpine` |
| **Web Servers** | Nginx, Apache, Caddy | `nginx:alpine` |
| **Caching** | Redis, Memcached | `redis:7-alpine` |
| **Message Queues** | RabbitMQ, Kafka | `rabbitmq:management` |
| **Development Tools** | Code servers, Jupyter | `jupyter/tensorflow-notebook` |
| **Monitoring** | Prometheus, Grafana | `grafana/grafana:latest` |

### Inference Container

| Use Case | Mô tả | Example |
|----------|-------|---------|
| **LLM Inference** | Serve language models | Triton + LLaMA 3.1 |
| **Vision Models** | Image classification, detection | TensorFlow Serving + YOLO |
| **Voice Models** | Speech-to-text, TTS | Whisper large-v3 |
| **Embedding Models** | Sentence transformers | FastEmbed server |

---

## 📊 Container Types Comparison

| Feature | Application Container | Inference Container |
|---------|----------------------|---------------------|
| **Purpose** | General apps | AI model serving |
| **Image Source** | Docker Hub, GHCR, Private | Custom inference images |
| **GPU Support** | Optional | Usually required |
| **Port Mapping** | Flexible | Fixed container port |
| **Volume Mounts** | Full support | Model path only |
| **Health Check** | Optional | Required |
| **Model Path** | N/A | Required (S3/local) |

---

## 🔐 Authentication

```http
Authorization: Bearer <your-jwt-token>
```

---

## 📦 PART 1: APPLICATION CONTAINER

### API 1: Create Application Container

#### Endpoint
```
POST /resources
```

#### Request Body

```typescript
{
  name: string;                          // Container name
  description?: string;                  // Description
  resourceType: 'application-container'; // Fixed value
  nodeId: string;                        // Node ID to run container
  config: {
    type: 'application-container';       // Config discriminator
    registry: 'docker-hub' | 'ghcr' | 'private';
    imageName: string;                   // Image name
    imageTag?: string;                   // Image tag (default: latest)
    registryAuth?: {                     // For private registry
      username?: string,
      password?: string,
      token?: string
    },
    containerPorts?: [                   // Port mappings
      {
        containerPort: number,
        hostPort?: number,               // Auto-assign if not specified
        protocol?: 'tcp' | 'udp'
      }
    ],
    cpuCores?: number;                   // CPU limit
    ramLimit?: number;                   // RAM limit (GB)
    gpuDeviceIds?: string[];             // Optional GPU
    volumes?: [                          // Volume mounts
      {
        hostPath: string,
        containerPath: string,
        readOnly?: boolean
      }
    ],
    environment?: {                      // Environment variables
      [key: string]: string
    },
    networkMode?: 'bridge' | 'host' | 'none'
  }
}
```

#### Example: PostgreSQL Database

```bash
curl -X POST "http://localhost:3305/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PostgreSQL Production DB",
    "description": "Main PostgreSQL database for production",
    "resourceType": "application-container",
    "nodeId": "675a1b2c3d4e5f6a7b8c9d0e",
    "config": {
      "type": "application-container",
      "registry": "docker-hub",
      "imageName": "postgres",
      "imageTag": "16-alpine",
      "containerPorts": [
        {
          "containerPort": 5432,
          "hostPort": 5432,
          "protocol": "tcp"
        }
      ],
      "cpuCores": 4,
      "ramLimit": 8,
      "volumes": [
        {
          "hostPath": "/data/postgres/prod",
          "containerPath": "/var/lib/postgresql/data",
          "readOnly": false
        }
      ],
      "environment": {
        "POSTGRES_USER": "admin",
        "POSTGRES_PASSWORD": "secure-password-here",
        "POSTGRES_DB": "production"
      },
      "networkMode": "bridge"
    }
  }'
```

#### Example: Nginx Web Server

```json
{
  "name": "Nginx Reverse Proxy",
  "description": "Nginx as reverse proxy and load balancer",
  "resourceType": "application-container",
  "nodeId": "675a1b2c3d4e5f6a7b8c9d0e",
  "config": {
    "type": "application-container",
    "registry": "docker-hub",
    "imageName": "nginx",
    "imageTag": "alpine",
    "containerPorts": [
      { "containerPort": 80, "hostPort": 80 },
      { "containerPort": 443, "hostPort": 443 }
    ],
    "cpuCores": 2,
    "ramLimit": 2,
    "volumes": [
      {
        "hostPath": "/etc/nginx/conf.d",
        "containerPath": "/etc/nginx/conf.d",
        "readOnly": true
      },
      {
        "hostPath": "/var/log/nginx",
        "containerPath": "/var/log/nginx"
      }
    ],
    "networkMode": "host"
  }
}
```

#### Example: Redis Cache

```json
{
  "name": "Redis Cache",
  "description": "Redis for session storage and caching",
  "resourceType": "application-container",
  "nodeId": "675a1b2c3d4e5f6a7b8c9d0e",
  "config": {
    "type": "application-container",
    "registry": "docker-hub",
    "imageName": "redis",
    "imageTag": "7-alpine",
    "containerPorts": [
      { "containerPort": 6379, "hostPort": 6379 }
    ],
    "cpuCores": 2,
    "ramLimit": 4,
    "volumes": [
      {
        "hostPath": "/data/redis",
        "containerPath": "/data"
      }
    ],
    "environment": {
      "REDIS_PASSWORD": "redis-secure-password"
    }
  }
}
```

### Field Descriptions - Application Container

| Field | Type | Required | Mô tả | UI Component | Default |
|-------|------|----------|-------|--------------|---------|
| **Basic** ||||||
| `name` | string | ✅ | Container name | Text input | - |
| `description` | string | ❌ | Description | Textarea | - |
| `nodeId` | string | ✅ | Node chạy container | Select dropdown | - |
| **Image** ||||||
| `registry` | enum | ✅ | Registry source | Radio buttons | `docker-hub` |
| `imageName` | string | ✅ | Image name | Text input với search | - |
| `imageTag` | string | ❌ | Image tag | Text input | `latest` |
| `registryAuth` | object | If private | Auth credentials | Collapsible section | - |
| **Ports** ||||||
| `containerPorts` | array | ❌ | Port mappings | Dynamic list | `[]` |
| `containerPorts[].containerPort` | number | ✅ | Container port | Number input | - |
| `containerPorts[].hostPort` | number | ❌ | Host port | Number input | Auto-assign |
| `containerPorts[].protocol` | enum | ❌ | Protocol | Select | `tcp` |
| **Resources** ||||||
| `cpuCores` | number | ❌ | CPU cores limit | Number / Slider | No limit |
| `ramLimit` | number | ❌ | RAM limit (GB) | Number / Slider | No limit |
| `gpuDeviceIds` | array | ❌ | GPU devices | Multi-select | `[]` |
| **Storage** ||||||
| `volumes` | array | ❌ | Volume mounts | Dynamic list | `[]` |
| `volumes[].hostPath` | string | ✅ | Host directory | Text / File browser | - |
| `volumes[].containerPath` | string | ✅ | Container mount point | Text input | - |
| `volumes[].readOnly` | boolean | ❌ | Read-only mount | Checkbox | `false` |
| **Config** ||||||
| `environment` | object | ❌ | Environment vars | Key-value pairs editor | `{}` |
| `networkMode` | enum | ❌ | Network mode | Radio buttons | `bridge` |

### Registry Options

| Registry | Value | Icon | Authentication Required | Image Format |
|----------|-------|------|------------------------|--------------|
| **Docker Hub** | `docker-hub` | 🐳 | Only for private images | `postgres`, `nginx:alpine` |
| **GitHub Container Registry** | `ghcr` | 🐙 | Yes (Personal token) | `ghcr.io/owner/image:tag` |
| **Private Registry** | `private` | 🔒 | Yes (Username/password) | `registry.example.com/image:tag` |

### Network Modes

| Mode | Value | Use Case | IP Address | Port Binding |
|------|-------|----------|------------|--------------|
| **Bridge** | `bridge` | Default, isolated network | Container IP (172.17.x.x) | Map to host port |
| **Host** | `host` | Direct host network access | Host IP | Share host ports |
| **None** | `none` | No network (for security) | No network | No ports |

### Common Environment Variables

#### PostgreSQL
```typescript
{
  POSTGRES_USER: "admin",
  POSTGRES_PASSWORD: "***",
  POSTGRES_DB: "production",
  POSTGRES_INITDB_ARGS: "--encoding=UTF8"
}
```

#### MySQL
```typescript
{
  MYSQL_ROOT_PASSWORD: "***",
  MYSQL_DATABASE: "app_db",
  MYSQL_USER: "app_user",
  MYSQL_PASSWORD: "***"
}
```

#### Redis
```typescript
{
  REDIS_PASSWORD: "***",
  REDIS_MAXMEMORY: "4gb",
  REDIS_MAXMEMORY_POLICY: "allkeys-lru"
}
```

### UI Form - Application Container

```
┌─ Create Application Container ────────────────────────┐
│ Basic Information                                      │
│ ├─ Name: [PostgreSQL Production DB_______________]    │
│ ├─ Description: [Main database for...___________]     │
│ └─ Node: [worker-01 ▼]                                │
│                                                        │
│ Container Image                                        │
│ ├─ Registry: ● Docker Hub  ○ GitHub  ○ Private       │
│ ├─ Image: [postgres_______________________] [Search]  │
│ └─ Tag: [16-alpine] (leave empty for 'latest')       │
│                                                        │
│ Port Mappings                         [+ Add Port]    │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Container Port: [5432] → Host Port: [5432]      │   │
│ │ Protocol: [TCP ▼]                     [Remove]  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                        │
│ Resources                                              │
│ ├─ CPU Cores: [4 ━━●───────] (no limit if empty)     │
│ ├─ RAM Limit: [8 GB ━━●─────] (no limit if empty)    │
│ └─ GPU: [ ] Enable GPU [Select Devices ▼]            │
│                                                        │
│ Volume Mounts                         [+ Add Volume]  │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Host: [/data/postgres/prod______________]       │   │
│ │ Container: [/var/lib/postgresql/data____]       │   │
│ │ [✓] Read-Only                         [Remove]  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                        │
│ Environment Variables                 [+ Add Var]     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ POSTGRES_USER    = [admin__________]   [Remove] │   │
│ │ POSTGRES_PASSWORD= [●●●●●●●●______]   [Remove]  │   │
│ │ POSTGRES_DB      = [production_____]   [Remove] │   │
│ └─────────────────────────────────────────────────┘   │
│                                                        │
│ Network                                                │
│ └─ Mode: ● Bridge  ○ Host  ○ None                    │
│                                                        │
│ [Cancel]                           [Create Container] │
└────────────────────────────────────────────────────────┘
```

---

## 🤖 PART 2: INFERENCE CONTAINER

### API 2: Create Inference Container

#### Endpoint
```
POST /resources
```

#### Request Body

```typescript
{
  name: string;
  description?: string;
  resourceType: 'inference-container';
  nodeId: string;
  config: {
    type: 'inference-container';
    modelId: string;                     // Model ID from Model module
    modelPath: string;                   // S3 or local path to model
    dockerImage: string;                 // Inference server image
    containerPort: number;               // Inference endpoint port
    gpuDeviceIds: string[];              // Required GPU devices
    gpuMemoryLimit?: number;             // GPU memory limit (MB)
    cpuCores?: number;
    ramLimit?: number;
    environment?: {
      [key: string]: string
    },
    healthCheckPath?: string;            // Health check endpoint
  }
}
```

#### Example: Whisper Large V3 (Speech-to-Text)

```bash
curl -X POST "http://localhost:3305/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Whisper Large V3 Inference",
    "description": "Speech-to-text model for transcription service",
    "resourceType": "inference-container",
    "nodeId": "675a1b2c3d4e5f6a7b8c9d0e",
    "config": {
      "type": "inference-container",
      "modelId": "67891234abcd5678ef901234",
      "modelPath": "s3://models/whisper-large-v3.tar.gz",
      "dockerImage": "nvcr.io/nvidia/tritonserver:24.01",
      "containerPort": 8000,
      "gpuDeviceIds": ["GPU-0"],
      "gpuMemoryLimit": 16384,
      "cpuCores": 4,
      "ramLimit": 16,
      "environment": {
        "MODEL_NAME": "whisper-large-v3",
        "MODEL_REPOSITORY": "/models",
        "LOG_LEVEL": "INFO"
      },
      "healthCheckPath": "/v2/health/ready"
    }
  }'
```

#### Example: LLaMA 3.1 70B (LLM Inference)

```json
{
  "name": "LLaMA 3.1 70B Inference",
  "description": "Large language model inference server",
  "resourceType": "inference-container",
  "nodeId": "675a1b2c3d4e5f6a7b8c9d0e",
  "config": {
    "type": "inference-container",
    "modelId": "67891234abcd5678ef901235",
    "modelPath": "s3://models/llama-3.1-70b.safetensors",
    "dockerImage": "vllm/vllm-openai:latest",
    "containerPort": 8000,
    "gpuDeviceIds": ["GPU-0", "GPU-1", "GPU-2", "GPU-3"],
    "gpuMemoryLimit": 81920,
    "cpuCores": 16,
    "ramLimit": 64,
    "environment": {
      "MODEL_NAME": "llama-3.1-70b",
      "TENSOR_PARALLEL_SIZE": "4",
      "MAX_MODEL_LEN": "4096",
      "GPU_MEMORY_UTILIZATION": "0.95"
    },
    "healthCheckPath": "/health"
  }
}
```

### Field Descriptions - Inference Container

| Field | Type | Required | Mô tả | UI Component |
|-------|------|----------|-------|--------------|
| **Basic** |||||
| `name` | string | ✅ | Container name | Auto-generated from model name |
| `description` | string | ❌ | Description | Textarea |
| `nodeId` | string | ✅ | Node with GPU | Select (filter nodes with GPU) |
| **Model** |||||
| `modelId` | string | ✅ | Model ID | Select from Model list |
| `modelPath` | string | ✅ | Model file path | Auto-filled from Model |
| `dockerImage` | string | ✅ | Inference image | Select from templates |
| `containerPort` | number | ✅ | Service port | Number input (default 8000) |
| **GPU** |||||
| `gpuDeviceIds` | array | ✅ | GPU devices | Multi-select (required ≥1) |
| `gpuMemoryLimit` | number | ❌ | GPU memory (MB) | Number input |
| **Resources** |||||
| `cpuCores` | number | ❌ | CPU cores | Number input |
| `ramLimit` | number | ❌ | RAM (GB) | Number input |
| **Advanced** |||||
| `environment` | object | ❌ | Env vars | Key-value editor |
| `healthCheckPath` | string | ❌ | Health endpoint | Text input (default `/health`) |

### Inference Server Images

| Server | Docker Image | Supported Models | Features |
|--------|-------------|------------------|----------|
| **NVIDIA Triton** | `nvcr.io/nvidia/tritonserver:24.01` | TensorFlow, PyTorch, ONNX | Multi-model, dynamic batching |
| **vLLM** | `vllm/vllm-openai:latest` | LLMs (LLaMA, GPT, Mistral) | Fast inference, OpenAI API |
| **TensorRT-LLM** | `nvcr.io/nvidia/tensorrt-llm:24.01` | Optimized LLMs | Highest performance |
| **TensorFlow Serving** | `tensorflow/serving:latest-gpu` | TensorFlow models | Production-ready |
| **TorchServe** | `pytorch/torchserve:latest-gpu` | PyTorch models | Easy deployment |
| **FastAPI Custom** | `custom/inference-server:latest` | Any | Custom logic |

### Common Environment Variables - Inference

#### vLLM (LLMs)
```typescript
{
  MODEL_NAME: "llama-3.1-70b",
  TENSOR_PARALLEL_SIZE: "4",      // Number of GPUs
  MAX_MODEL_LEN: "4096",          // Context length
  GPU_MEMORY_UTILIZATION: "0.95", // GPU memory usage
  DTYPE: "auto"                   // float16, bfloat16, auto
}
```

#### Triton Inference Server
```typescript
{
  MODEL_NAME: "whisper-large-v3",
  MODEL_REPOSITORY: "/models",
  LOG_LEVEL: "INFO",
  STRICT_MODEL_CONFIG: "false",
  BACKEND: "pytorch"              // pytorch, tensorflow, onnx
}
```

### UI Form - Inference Container

```
┌─ Create Inference Container ──────────────────────────┐
│ Select Model                                           │
│ └─ Model: [Whisper Large V3 ▼]                        │
│    Speech-to-text · 1.5B parameters · GPU Required    │
│    Model Path: s3://models/whisper-large-v3.tar.gz    │
│                                                        │
│ Deployment Configuration                               │
│ ├─ Name: [Whisper Large V3 Inference_________]        │
│ ├─ Node: [worker-gpu-01 ▼] (4x NVIDIA A100 available)│
│ └─ Inference Server: [NVIDIA Triton Server 24.01 ▼]  │
│                                                        │
│ GPU Allocation                                         │
│ ├─ Devices: [☑ GPU-0] [ ] GPU-1 [ ] GPU-2 [ ] GPU-3 │
│ └─ Memory Limit: [16384 MB] (16 GB per GPU)          │
│                                                        │
│ Resources                                              │
│ ├─ CPU Cores: [4]                                     │
│ └─ RAM: [16 GB]                                       │
│                                                        │
│ Network                                                │
│ └─ Container Port: [8000] (default for most servers)  │
│                                                        │
│ Advanced Settings                     [▶ Expand]      │
│                                                        │
│ [Cancel]                         [Deploy Inference →] │
└────────────────────────────────────────────────────────┘
```

---

## 📋 API 3: List Containers

### Endpoint
```
GET /resources?resourceType=application-container
GET /resources?resourceType=inference-container
```

### Example Response - Application Container

```json
{
  "data": [
    {
      "_id": "675b2c3d4e5f6a7b8c9d0e0f",
      "name": "PostgreSQL Production DB",
      "description": "Main PostgreSQL database",
      "resourceType": "application-container",
      "nodeId": "675a1b2c3d4e5f6a7b8c9d0e",
      "status": "running",
      "config": {
        "type": "application-container",
        "registry": "docker-hub",
        "imageName": "postgres",
        "imageTag": "16-alpine",
        "containerPorts": [
          { "containerPort": 5432, "hostPort": 5432 }
        ],
        "cpuCores": 4,
        "ramLimit": 8
      },
      "runtime": {
        "id": "container-abc123def456",
        "endpoint": "192.168.100.5:5432",
        "allocatedCPU": 4,
        "allocatedRAM": 8,
        "startedAt": "2025-12-03T10:00:00.000Z"
      },
      "createdAt": "2025-12-03T09:00:00.000Z"
    }
  ],
  "pagination": { "total": 25, "page": 1, "limit": 10 }
}
```

### UI Layout - Container List

```
┌─ Application Containers ──────────────────────────────┐
│ [+ New Container]  Filter: [All Types ▼] [Running ▼] │
├───────────────────────────────────────────────────────┤
│ ✅ PostgreSQL Production DB           [⋮ Actions ▼]  │
│    postgres:16-alpine · 4 CPU · 8 GB RAM             │
│    192.168.100.5:5432 [📋]  · Running for 3h         │
│    Node: worker-01                                    │
├───────────────────────────────────────────────────────┤
│ ✅ Redis Cache                         [⋮ Actions ▼]  │
│    redis:7-alpine · 2 CPU · 4 GB RAM                 │
│    192.168.100.6:6379 [📋]  · Running for 5d         │
│    Node: worker-01                                    │
├───────────────────────────────────────────────────────┤
│ ⏹️ Nginx Reverse Proxy                 [⋮ Actions ▼]  │
│    nginx:alpine · 2 CPU · 2 GB RAM                   │
│    Stopped 1h ago                                     │
│    Node: worker-02                                    │
└───────────────────────────────────────────────────────┘

┌─ Inference Containers ────────────────────────────────┐
│ [+ New Inference]  Filter: [All Models ▼] [Running ▼]│
├───────────────────────────────────────────────────────┤
│ ✅ Whisper Large V3 Inference          [⋮ Actions ▼]  │
│    Triton Server · 1x GPU-0 · 4 CPU · 16 GB          │
│    192.168.100.10:8000 [📋]  · Running for 2h        │
│    Model: Whisper Large V3 (1.5B params)              │
│    Node: worker-gpu-01                                │
├───────────────────────────────────────────────────────┤
│ 🔄 LLaMA 3.1 70B Inference            [⋮ Actions ▼]  │
│    vLLM · 4x GPUs · 16 CPU · 64 GB                   │
│    Deploying... 45%                                   │
│    Model: LLaMA 3.1 70B (70B params)                  │
│    Node: worker-gpu-02                                │
└───────────────────────────────────────────────────────┘
```

---

## 🎬 API 4: Container Lifecycle & Monitoring

### 4.1 Start / Stop / Restart

Same as VM endpoints:
```bash
POST /resources/:id/start
POST /resources/:id/stop
POST /resources/:id/restart
```

### 4.2 Execute Command (Containers Only)

```bash
POST /resources/:id/exec
Content-Type: application/json

{
  "command": "ls -la /var/log",
  "workingDir": "/app"
}
```

**Response (V1 - Mock):**
```json
{
  "resourceId": "675b2c3d4e5f6a7b8c9d0e0f",
  "command": "ls -la /var/log",
  "exitCode": 0,
  "stdout": "total 48\ndrwxr-xr-x 5 root root 4096 Dec  3 10:00 .\n...",
  "stderr": "",
  "executedAt": "2025-12-03T12:00:00.000Z"
}
```

**UI - Container Shell:**
```
┌─ Container Shell: PostgreSQL Production DB ───────────┐
│ $ █                                                    │
│                                                        │
│ Commands History:                                      │
│ $ ls /var/lib/postgresql/data                         │
│ base  global  pg_hba.conf  pg_ident.conf  ...        │
│                                                        │
│ $ psql -U admin -d production                         │
│ psql (16.1)                                           │
│ Type "help" for help.                                  │
│                                                        │
│ production=#                                           │
└────────────────────────────────────────────────────────┘
```

### 4.3 Get Logs

```bash
GET /resources/:id/logs
```

**Response:**
```json
{
  "resourceId": "675b2c3d4e5f6a7b8c9d0e0f",
  "logs": [
    {
      "timestamp": "2025-12-03T10:00:00.000Z",
      "stream": "stdout",
      "message": "PostgreSQL Database directory appears to contain a database; Skipping initialization"
    },
    {
      "timestamp": "2025-12-03T10:00:05.000Z",
      "stream": "stdout",
      "message": "2025-12-03 10:00:05.123 UTC [1] LOG:  listening on IPv4 address \"0.0.0.0\", port 5432"
    },
    {
      "timestamp": "2025-12-03T10:00:10.000Z",
      "stream": "stdout",
      "message": "2025-12-03 10:00:10.456 UTC [1] LOG:  database system is ready to accept connections"
    }
  ]
}
```

### 4.4 Get Metrics

Same response format as VM, but container-specific metrics.

---

## 🎨 UI Components

### Container Card Component

```tsx
interface ContainerCardProps {
  container: Container;
  onAction: (action: string, id: string) => void;
}

function ContainerCard({ container, onAction }: ContainerCardProps) {
  const isInference = container.resourceType === 'inference-container';

  return (
    <Card
      title={
        <Space>
          <Badge status={statusColor[container.status]} />
          {container.name}
        </Space>
      }
      extra={
        <Dropdown menu={{
          items: [
            { key: 'start', label: 'Start', disabled: container.status === 'running' },
            { key: 'stop', label: 'Stop', disabled: container.status === 'stopped' },
            { key: 'restart', label: 'Restart' },
            { key: 'logs', label: 'View Logs' },
            { key: 'shell', label: 'Open Shell', disabled: isInference },
            { type: 'divider' },
            { key: 'delete', label: 'Delete', danger: true },
          ],
          onClick: ({ key }) => onAction(key, container._id)
        }}>
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      }
    >
      {isInference ? (
        <InferenceInfo container={container} />
      ) : (
        <ApplicationInfo container={container} />
      )}
    </Card>
  );
}
```

### Form Validation

```typescript
const appContainerSchema = z.object({
  name: z.string().min(1).max(100),
  nodeId: z.string(),
  config: z.object({
    type: z.literal('application-container'),
    registry: z.enum(['docker-hub', 'ghcr', 'private']),
    imageName: z.string().min(1),
    imageTag: z.string().optional(),
    containerPorts: z.array(z.object({
      containerPort: z.number().min(1).max(65535),
      hostPort: z.number().min(1).max(65535).optional(),
      protocol: z.enum(['tcp', 'udp']).optional()
    })).optional(),
    volumes: z.array(z.object({
      hostPath: z.string().min(1),
      containerPath: z.string().min(1),
      readOnly: z.boolean().optional()
    })).optional(),
    environment: z.record(z.string()).optional()
  })
});

const inferenceContainerSchema = z.object({
  name: z.string().min(1).max(100),
  nodeId: z.string(),
  config: z.object({
    type: z.literal('inference-container'),
    modelId: z.string(),
    modelPath: z.string(),
    dockerImage: z.string(),
    containerPort: z.number(),
    gpuDeviceIds: z.array(z.string()).min(1, "At least one GPU required")
  })
});
```

---

## 📝 Best Practices

### 1. Container Naming

```typescript
// Auto-generate names from image
function suggestContainerName(imageName: string, imageTag?: string): string {
  const tag = imageTag && imageTag !== 'latest' ? `-${imageTag}` : '';
  return `${imageName}${tag}-${Date.now().toString(36)}`;
}

// Examples:
// postgres:16-alpine → postgres-16-alpine-abc123
// nginx → nginx-xyz789
```

### 2. Port Conflict Detection

```typescript
async function checkPortAvailability(nodeId: string, port: number) {
  const containers = await fetchContainers({ nodeId, status: 'running' });
  const usedPorts = containers.flatMap(c =>
    c.config.containerPorts?.map(p => p.hostPort) ?? []
  );

  if (usedPorts.includes(port)) {
    throw new Error(`Port ${port} already in use on this node`);
  }
}
```

### 3. Resource Validation

```typescript
async function validateResources(nodeId: string, cpuCores?: number, ramLimit?: number, gpuDeviceIds?: string[]) {
  const node = await fetchNode(nodeId);

  if (cpuCores && cpuCores > node.cpuCores) {
    throw new Error(`Node only has ${node.cpuCores} CPU cores available`);
  }

  if (ramLimit && ramLimit > node.ramTotal / 1024) {
    throw new Error(`Node only has ${node.ramTotal / 1024} GB RAM available`);
  }

  if (gpuDeviceIds && gpuDeviceIds.length > 0) {
    const availableGPUs = node.gpuDevices?.map(g => g.deviceId) ?? [];
    const invalidGPUs = gpuDeviceIds.filter(id => !availableGPUs.includes(id));

    if (invalidGPUs.length > 0) {
      throw new Error(`Invalid GPU devices: ${invalidGPUs.join(', ')}`);
    }
  }
}
```

### 4. Image Search Integration

```typescript
// Integrate with Docker Hub API
async function searchDockerImages(query: string) {
  const response = await fetch(
    `https://hub.docker.com/v2/search/repositories/?query=${query}&page_size=25`
  );
  const data = await response.json();

  return data.results.map(repo => ({
    name: repo.repo_name,
    description: repo.short_description,
    stars: repo.star_count,
    official: repo.is_official
  }));
}
```

---

## ⚠️ V1 Limitations

1. **Mock Actions** - Start/stop/restart/exec chỉ update DB
2. **No Real Deployment** - Containers không thực sự được deploy
3. **Mock Logs** - Logs là fake data
4. **No Real-time Stats** - Metrics là mock data
5. **No Image Validation** - Không verify image existence trước khi create

---

**Last Updated:** 2025-12-03
**Version:** 1.0 (V1 - Metadata Only)
**Status:** ✅ Ready for Frontend Integration
