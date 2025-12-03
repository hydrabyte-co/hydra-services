# Resource Management Module - Proposal

**Author:** Backend Dev Team
**Date:** 2025-12-03
**Status:** ✅ Approved - Ready for Implementation (V1 Demo/Portal Preview)

---

## TL;DR - Executive Summary

**Yêu cầu:** Mở rộng khả năng quản lý tài nguyên trên worker node:
1. ✅ **API Inference Containers** (Hiện tại: Deployment module)
2. 🆕 **Virtual Machines** (libvirt/KVM)
3. 🆕 **User Application Containers** (từ public/private registry)

**Giải pháp đề xuất:** Tạo **Resource Management Module** thống nhất

**Version 1 Scope (Demo/Portal Preview):**
- ✅ CRUD API cho VM & Container (chỉ metadata, chưa deploy thực tế)
- ✅ Support cả Container và VM trong cùng 1 module
- ✅ UI configuration cho GPU (Passthrough/MIG), Network (Bridge to VLAN, IP/DHCP), Storage
- ⏸️ Worker implementation → Comment TODO (làm sau)
- ⏸️ Quotas → Bỏ qua V1

**Timeline:** 1-2 tuần (V1 - API Only)
**Complexity:** Medium (giảm từ Medium-High do bỏ worker implementation)
**LOC Estimate:** ~1500 lines (giảm từ ~3000 do chỉ làm API layer)

---

## 1. Hiện Trạng

### Deployment Module (Current)

**Mục đích:** Deploy AI models dưới dạng containers
**Phạm vi:** CHỈ AI inference containers (Triton/vLLM)

**Schema hiện tại:**
```typescript
class Deployment {
  modelId: ObjectId;          // Gắn chặt với Model
  nodeId: ObjectId;           // GPU node
  containerId: string;        // Docker container
  dockerImage: string;        // Fixed to inference images
  gpuDevice: string;          // GPU allocation
  status: string;             // queued → deploying → running → stopped
}
```

**Limitations:**
- ❌ Không deploy được user applications (nginx, postgres, redis, ...)
- ❌ Không quản lý được VM
- ❌ Tight coupling với Model entity
- ❌ Không linh hoạt cho các use case khác

---

## 2. Thiết Kế Đề Xuất

### 2.1. Resource Types

```typescript
enum ResourceType {
  INFERENCE_CONTAINER    // AI model inference (current)
  APPLICATION_CONTAINER  // User apps (NEW)
  VIRTUAL_MACHINE       // VMs (NEW)
}
```

### 2.2. Unified Resource Schema

**Key Insight:** Sử dụng **discriminated union** cho config

```typescript
class Resource {
  // Common fields
  name: string;
  resourceType: ResourceType;
  nodeId: ObjectId;
  status: string;

  // Type-specific config (discriminated union)
  config: InferenceContainerConfig
        | ApplicationContainerConfig
        | VirtualMachineConfig;

  // Runtime info
  runtime: {
    id: string;              // Container ID / VM ID
    endpoint: string;
    allocatedGPU: string[];
    allocatedCPU: number;
    allocatedRAM: number;
  };
}
```

### 2.3. Configuration Types

#### Inference Container (AI Models)
```typescript
interface InferenceContainerConfig {
  type: 'inference-container';
  modelId: ObjectId;
  modelPath: string;
  dockerImage: string;
  containerPort: number;
  gpuDeviceIds: string[];
  healthCheckPath: string;
}
```

#### Application Container (User Apps)
```typescript
interface ApplicationContainerConfig {
  type: 'application-container';
  registry: 'docker-hub' | 'ghcr' | 'private';
  imageName: string;
  imageTag: string;
  registryAuth?: {
    username: string;
    password: string;
  };
  containerPorts: PortMapping[];
  volumes: VolumeMount[];
  environment: Record<string, string>;
}
```

#### Virtual Machine (VMs)
```typescript
interface VirtualMachineConfig {
  type: 'virtual-machine';

  // VM Image (V1: Enum với OS phổ biến, V2: Image repository)
  osImage: 'ubuntu-22.04' | 'ubuntu-20.04' | 'centos-8' | 'centos-7' |
           'windows-server-2022' | 'windows-server-2019' | 'debian-12' | 'debian-11';

  // Resource allocation
  vcpus: number;
  ramMB: number;
  diskGB: number;              // V1: Chỉ input size, storage path fixed trên node

  // GPU configuration (V1: Chỉ lưu config, chưa deploy thực tế)
  gpuConfig?: {
    enabled: boolean;
    mode: 'passthrough' | 'mig';  // User choice
    deviceIds?: string[];          // For passthrough
    migProfile?: string;           // For MIG (e.g., '1g.5gb', '2g.10gb')
  };

  // Network configuration (V1: Bridge to VLAN - pre-configured by admin)
  networkConfig: {
    mode: 'bridge-vlan';          // Fixed option
    ipMode: 'static' | 'dhcp';    // User choice
    ipAddress?: string;           // Required if ipMode='static'
    netmask?: string;             // Required if ipMode='static'
    gateway?: string;             // Required if ipMode='static'
    vlanId?: number;              // Optional, default VLAN
  };

  // Cloud-init (simplified for V1)
  cloudInit?: {
    hostname?: string;
    sshPublicKey?: string;        // Single SSH key for simplicity
    username?: string;            // Default: ubuntu/administrator
    password?: string;            // Initial password
  };
}
```

---

## 3. API Design

### REST API Endpoints

**Note (V1):** Tất cả endpoints sẽ được implement đầy đủ. Lifecycle & monitoring endpoints sẽ return mock success response.

```typescript
// CRUD Operations (V1: Fully functional)
POST   /resources              // Create resource → Save to DB
GET    /resources              // List resources → Query from DB
GET    /resources/:id          // Get details → Query from DB
PATCH  /resources/:id          // Update config → Update DB
DELETE /resources/:id          // Delete (soft) → Update deletedAt

// Lifecycle Operations (V1: Mock response, actual implementation in V2)
POST   /resources/:id/start    // V1: Return { success: true, message: "Start requested" }
POST   /resources/:id/stop     // V1: Return { success: true, message: "Stop requested" }
POST   /resources/:id/restart  // V1: Return { success: true, message: "Restart requested" }

// Monitoring (V1: Mock data response)
GET    /resources/:id/status   // V1: Return mock status based on DB status field
GET    /resources/:id/logs     // V1: Return mock logs array
GET    /resources/:id/metrics  // V1: Return mock metrics (CPU, RAM, GPU usage)
GET    /resources/:id/console  // V1: Return mock VNC/console URL (VMs only)

// Snapshots - VMs only (V1: Mock response)
POST   /resources/:id/snapshots                      // V1: Return { success: true, snapshotId: "mock-snapshot-..." }
GET    /resources/:id/snapshots                      // V1: Return mock snapshots array
POST   /resources/:id/snapshots/:snapshotId/restore  // V1: Return { success: true, message: "Restore requested" }
DELETE /resources/:id/snapshots/:snapshotId          // V1: Return { success: true }

// Container-specific (V1: Mock response)
POST   /resources/:id/exec     // Execute command in container → V1: Mock response
```

### Example: Create PostgreSQL Container

```json
POST /resources
{
  "name": "PostgreSQL Database",
  "resourceType": "application-container",
  "nodeId": "673e7a1f5c9d8e001234abcd",
  "config": {
    "type": "application-container",
    "registry": "docker-hub",
    "imageName": "postgres",
    "imageTag": "16-alpine",
    "containerPorts": [{
      "containerPort": 5432,
      "hostPort": 5432
    }],
    "volumes": [{
      "hostPath": "/data/postgres",
      "containerPath": "/var/lib/postgresql/data"
    }],
    "environment": {
      "POSTGRES_USER": "admin",
      "POSTGRES_PASSWORD": "secret",
      "POSTGRES_DB": "myapp"
    }
  }
}
```

### Example: Create Ubuntu VM (V1 - Simplified)

```json
POST /resources
{
  "name": "Dev VM Ubuntu 22.04",
  "description": "Development VM with GPU passthrough",
  "resourceType": "virtual-machine",
  "nodeId": "673e7a1f5c9d8e001234abcd",
  "config": {
    "type": "virtual-machine",
    "osImage": "ubuntu-22.04",
    "vcpus": 8,
    "ramMB": 32768,
    "diskGB": 100,
    "gpuConfig": {
      "enabled": true,
      "mode": "passthrough",
      "deviceIds": ["GPU-0"]
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
      "username": "ubuntu",
      "sshPublicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC...",
      "password": "initial-password-123"
    }
  }
}
```

**Response:**
```json
{
  "_id": "674a1b2c3d4e5f6a7b8c9d0e",
  "name": "Dev VM Ubuntu 22.04",
  "resourceType": "virtual-machine",
  "status": "queued",
  "config": { ... },
  "runtime": null,
  "owner": {
    "orgId": "673e7a1f5c9d8e001234abcd",
    "userId": "673e7a1f5c9d8e001234abce"
  },
  "createdAt": "2025-12-03T10:30:00.000Z",
  "updatedAt": "2025-12-03T10:30:00.000Z"
}
```

**Note (V1):** Status sẽ ở `queued` vì worker chưa deploy thực tế. Để demo, có thể manual update status qua PATCH endpoint.

---

### Example: Start VM (V1 - Mock Response)

```bash
POST /resources/674a1b2c3d4e5f6a7b8c9d0e/start
```

**Response (V1 - Mock):**
```json
{
  "success": true,
  "message": "VM start requested",
  "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
  "action": "start",
  "timestamp": "2025-12-03T10:35:00.000Z",
  "note": "V1: Mock response. Actual VM start will be implemented in V2."
}
```

---

### Example: Get VM Logs (V1 - Mock Response)

```bash
GET /resources/674a1b2c3d4e5f6a7b8c9d0e/logs
```

**Response (V1 - Mock):**
```json
{
  "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
  "logs": [
    {
      "timestamp": "2025-12-03T10:30:00.000Z",
      "level": "info",
      "message": "[Mock] VM booting..."
    },
    {
      "timestamp": "2025-12-03T10:30:15.000Z",
      "level": "info",
      "message": "[Mock] Cloud-init running..."
    },
    {
      "timestamp": "2025-12-03T10:30:30.000Z",
      "level": "info",
      "message": "[Mock] VM ready. SSH available at 192.168.100.10:22"
    }
  ],
  "note": "V1: Mock logs. Actual logs from libvirt will be implemented in V2."
}
```

---

### Example: Get VM Metrics (V1 - Mock Response)

```bash
GET /resources/674a1b2c3d4e5f6a7b8c9d0e/metrics
```

**Response (V1 - Mock):**
```json
{
  "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
  "timestamp": "2025-12-03T10:40:00.000Z",
  "metrics": {
    "cpu": {
      "cores": 8,
      "usagePercent": 45.2
    },
    "memory": {
      "totalMB": 32768,
      "usedMB": 12800,
      "usagePercent": 39.1
    },
    "disk": {
      "totalGB": 100,
      "usedGB": 25,
      "usagePercent": 25.0
    },
    "gpu": {
      "enabled": true,
      "deviceId": "GPU-0",
      "usagePercent": 78.5,
      "memoryUsedMB": 14500,
      "memoryTotalMB": 16384
    },
    "network": {
      "rxBytes": 1048576000,
      "txBytes": 524288000
    }
  },
  "note": "V1: Mock metrics. Actual metrics from libvirt/docker will be implemented in V2."
}
```

---

### Example: Create VM Snapshot (V1 - Mock Response)

```bash
POST /resources/674a1b2c3d4e5f6a7b8c9d0e/snapshots
Content-Type: application/json

{
  "name": "Before GPU Driver Update",
  "description": "Snapshot before updating NVIDIA drivers"
}
```

**Response (V1 - Mock):**
```json
{
  "success": true,
  "snapshot": {
    "id": "snapshot-mock-" + Date.now(),
    "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
    "name": "Before GPU Driver Update",
    "description": "Snapshot before updating NVIDIA drivers",
    "createdAt": "2025-12-03T10:45:00.000Z",
    "diskSizeGB": 25
  },
  "note": "V1: Mock snapshot. Actual libvirt snapshot will be implemented in V2."
}
```

---

### Example: List VM Snapshots (V1 - Mock Response)

```bash
GET /resources/674a1b2c3d4e5f6a7b8c9d0e/snapshots
```

**Response (V1 - Mock):**
```json
{
  "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
  "snapshots": [
    {
      "id": "snapshot-mock-1733220000000",
      "name": "Initial Setup",
      "description": "Fresh VM after OS installation",
      "createdAt": "2025-12-03T09:00:00.000Z",
      "diskSizeGB": 15
    },
    {
      "id": "snapshot-mock-1733223600000",
      "name": "Before GPU Driver Update",
      "description": "Snapshot before updating NVIDIA drivers",
      "createdAt": "2025-12-03T10:45:00.000Z",
      "diskSizeGB": 25
    }
  ],
  "note": "V1: Mock snapshots. Actual libvirt snapshots will be implemented in V2."
}
```

---

## 4. WebSocket Protocol Extensions

**Note (V1):** WebSocket message types được define sẵn trong schema nhưng handlers sẽ return comment TODO.

### New Message Types (Defined but TODO in V1)

```typescript
// VM Commands (Controller → Worker) - TODO: V2 implementation
'vm.create'         // TODO: LibvirtService.createVM()
'vm.start'          // TODO: LibvirtService.startVM()
'vm.stop'           // TODO: LibvirtService.stopVM()
'vm.snapshot'       // TODO: LibvirtService.snapshotVM()
'vm.console'        // TODO: LibvirtService.getConsoleAccess()

// Container Commands (Controller → Worker) - TODO: V2 implementation
'container.pull'    // TODO: DockerService.pullImage()
'container.create'  // TODO: DockerService.createContainer()
'container.start'   // TODO: DockerService.startContainer()
'container.stop'    // TODO: DockerService.stopContainer()
'container.logs'    // TODO: DockerService.getLogs()
'container.exec'    // TODO: DockerService.execCommand()

// Events (Worker → Controller) - TODO: V2 implementation
'vm.status'                 // TODO: Status updates from libvirt
'container.status'          // TODO: Status updates from docker
'container.logs.stream'     // TODO: Real-time log streaming
```

**V1 Handler Example:**
```typescript
// services/aiwm-worker/src/modules/handlers/vm.handler.ts
async handleVmCreate(command: VmCreateCommand): Promise<CommandResult> {
  // TODO: V2 - Implement actual VM creation via libvirt
  // For now, just return success to allow API testing
  return {
    status: 'success',
    result: {
      vmId: 'vm-mock-' + Date.now(),
      message: 'TODO: Implement LibvirtService.createVM()'
    }
  };
}
```

---

## 5. Worker Implementation

**Note (V1):** Worker services sẽ được tạo với skeleton code và TODO comments. Không implement logic thực tế.

### New Services Required (V1: Skeleton Only)

**1. DockerService** (Container Management) - TODO in V1
- File: `services/aiwm-worker/src/modules/docker/docker.service.ts`
- Package: `dockerode` (install nhưng chưa dùng)
- Chức năng (V2):
  - TODO: Pull images from registries
  - TODO: Create/start/stop containers
  - TODO: Stream logs
  - TODO: Volume management

**V1 Implementation:**
```typescript
@Injectable()
export class DockerService {
  constructor() {
    // TODO: Initialize dockerode client
  }

  async pullImage(imageName: string): Promise<void> {
    // TODO: V2 - Implement image pulling
    throw new Error('TODO: DockerService.pullImage() - V2 implementation');
  }

  async createContainer(config: any): Promise<string> {
    // TODO: V2 - Implement container creation
    throw new Error('TODO: DockerService.createContainer() - V2 implementation');
  }
}
```

**2. LibvirtService** (VM Management) - TODO in V1
- File: `services/aiwm-worker/src/modules/libvirt/libvirt.service.ts`
- Package: `libvirt` (npm) (install nhưng chưa dùng)
- Chức năng (V2):
  - TODO: Create/start/stop VMs
  - TODO: GPU passthrough configuration
  - TODO: Snapshot management
  - TODO: Network bridge setup

**V1 Implementation:**
```typescript
@Injectable()
export class LibvirtService {
  constructor() {
    // TODO: Connect to libvirt daemon
  }

  async createVM(config: any): Promise<string> {
    // TODO: V2 - Implement VM creation
    throw new Error('TODO: LibvirtService.createVM() - V2 implementation');
  }

  async startVM(vmId: string): Promise<void> {
    // TODO: V2 - Implement VM start
    throw new Error('TODO: LibvirtService.startVM() - V2 implementation');
  }
}
```

**3. ResourceManagerService** (Orchestration) - Minimal in V1
- File: `services/aiwm-worker/src/modules/resource/resource-manager.service.ts`
- Chức năng (V1):
  - ✅ Route commands to appropriate service (but services throw TODO)
  - ⏸️ Track resource allocation → V2
  - ⏸️ Prevent over-allocation → V2
  - ⏸️ Conflict detection → V2

---

## 6. Database Schema

### Resource Collection

```javascript
{
  _id: ObjectId("..."),
  name: "PostgreSQL DB",
  resourceType: "application-container",
  nodeId: ObjectId("..."),
  status: "running",

  config: {
    type: "application-container",
    registry: "docker-hub",
    imageName: "postgres",
    imageTag: "16-alpine",
    ...
  },

  runtime: {
    id: "container-abc123",
    endpoint: "http://192.168.1.100:5432",
    allocatedCPU: 2,
    allocatedRAM: 4,
    startedAt: ISODate("...")
  },

  owner: { orgId: "...", userId: "..." },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Indexes

```typescript
resources.createIndex({ resourceType: 1, status: 1 });
resources.createIndex({ nodeId: 1 });
resources.createIndex({ 'runtime.id': 1 });
```

---

## 7. Migration Strategy

### Backward Compatibility

**Strategy:** Keep Deployment module, map internally to Resource

```typescript
@Injectable()
export class DeploymentService {
  constructor(private resourceService: ResourceService) {}

  async create(dto: CreateDeploymentDto, context: RequestContext) {
    // Map Deployment → Resource
    const resourceDto: CreateResourceDto = {
      resourceType: ResourceType.INFERENCE_CONTAINER,
      config: {
        type: 'inference-container',
        modelId: dto.modelId,
        dockerImage: dto.dockerImage,
        ...
      }
    };

    return this.resourceService.create(resourceDto, context);
  }
}
```

**Benefits:**
- ✅ Existing Deployment API continues to work
- ✅ No breaking changes
- ✅ Gradual migration path

---

## 8. Implementation Phases (Updated for V1)

### ✅ V1 Scope: API-Only Implementation (1-2 Weeks)

### Phase 1: Foundation & API (Week 1)
**Goal:** CRUD API + Lifecycle/Monitoring APIs với mock responses

- [ ] Create Resource module structure
- [ ] Define schema với discriminated union
  - [ ] InferenceContainerConfig (existing from Deployment)
  - [ ] ApplicationContainerConfig (new)
  - [ ] VirtualMachineConfig (new - simplified với osImage enum)
- [ ] REST API endpoints - CRUD (Fully functional)
  - [ ] POST /resources (create → save to DB)
  - [ ] GET /resources (list with filters)
  - [ ] GET /resources/:id (get by ID)
  - [ ] PATCH /resources/:id (update config)
  - [ ] DELETE /resources/:id (soft delete)
- [ ] REST API endpoints - Lifecycle (Mock responses)
  - [ ] POST /resources/:id/start (return mock success)
  - [ ] POST /resources/:id/stop (return mock success)
  - [ ] POST /resources/:id/restart (return mock success)
- [ ] REST API endpoints - Monitoring (Mock data)
  - [ ] GET /resources/:id/status (mock status)
  - [ ] GET /resources/:id/logs (mock logs array)
  - [ ] GET /resources/:id/metrics (mock CPU/RAM/GPU metrics)
  - [ ] GET /resources/:id/console (mock VNC URL for VMs)
- [ ] REST API endpoints - Snapshots (Mock responses)
  - [ ] POST /resources/:id/snapshots (create snapshot → mock)
  - [ ] GET /resources/:id/snapshots (list snapshots → mock array)
  - [ ] POST /resources/:id/snapshots/:id/restore (restore → mock success)
  - [ ] DELETE /resources/:id/snapshots/:id (delete → mock success)
- [ ] REST API endpoints - Container specific (Mock)
  - [ ] POST /resources/:id/exec (execute command → mock output)
- [ ] DTOs validation
  - [ ] CreateResourceDto với conditional validation
  - [ ] UpdateResourceDto
  - [ ] Resource filters (by type, status, nodeId)
  - [ ] CreateSnapshotDto, ExecCommandDto
- [ ] Add DTOs to `libs/shared`
- [ ] Swagger documentation (TẤT CẢ endpoints với examples)

**Files:**
```
services/aiwm/src/modules/resource/
├── resource.schema.ts          // Resource entity với discriminated config
├── resource.service.ts         // Extends BaseService
├── resource.controller.ts      // REST endpoints
├── resource.dto.ts            // CreateResourceDto, UpdateResourceDto
├── resource.module.ts         // NestJS module
└── enums/
    ├── resource-type.enum.ts  // INFERENCE_CONTAINER, APPLICATION_CONTAINER, VM
    ├── os-image.enum.ts       // ubuntu-22.04, centos-8, windows-server-2022...
    └── gpu-mode.enum.ts       // passthrough, mig
```

### Phase 2: Worker Skeleton & Demo Data (Week 2)
**Goal:** Worker handlers với TODO, seed data cho demo Portal

- [ ] Update WebSocket message types (define only)
  - [ ] vm.create, vm.start, vm.stop
  - [ ] container.create, container.start, container.stop
- [ ] Worker skeleton services
  - [ ] DockerService (skeleton with TODO)
  - [ ] LibvirtService (skeleton with TODO)
  - [ ] ResourceManagerService (routing only)
- [ ] Worker handlers return mock success
- [ ] Seed script để insert demo resources vào DB
- [ ] Test API endpoints với curl/Postman
- [ ] API documentation hoàn chỉnh

**Files:**
```
services/aiwm-worker/src/modules/
├── docker/
│   ├── docker.service.ts      // Skeleton với TODO comments
│   └── docker.module.ts
├── libvirt/
│   ├── libvirt.service.ts     // Skeleton với TODO comments
│   └── libvirt.module.ts
└── resource/
    └── resource-manager.service.ts  // Route commands (throw TODO)

services/aiwm/src/scripts/
└── seed-resources.ts          // Insert demo VMs & Containers
```

### ⏸️ V2 Scope: Actual Deployment (Future)

### Phase 3: Container Support (V2 - Week 3-4)
- [ ] Implement DockerService với dockerode
- [ ] Container command handlers (actual deployment)
- [ ] Test với nginx, postgres, redis

### Phase 4: VM Support (V2 - Week 5-6)
- [ ] Implement LibvirtService với libvirt
- [ ] VM command handlers (actual deployment)
- [ ] Cloud-init integration
- [ ] GPU passthrough/MIG implementation
- [ ] Network bridge configuration

### Phase 5: Polish (V2 - Week 7)
- [ ] Resource allocation tracking
- [ ] Conflict detection (GPU over-allocation)
- [ ] End-to-end testing
- [ ] Performance optimization

---

## 9. Technical Considerations

### 9.1. GPU Management

**Challenges:**
- Track GPU allocation across all resource types
- Prevent over-allocation
- Support GPU passthrough for VMs (requires IOMMU)
- Future: Support fractional GPU (MIG)

**Solution:**
- ResourceTrackerService tracks all allocations
- Validate before resource creation
- Return clear error if GPU not available

### 9.2. Networking

**Container Networking:**
- Bridge mode (default)
- Host mode (for performance)
- Custom networks

**VM Networking:**
- Requires pre-configured bridges on worker node
- Support NAT, bridge, macvtap modes
- Cloud-init for network configuration

### 9.3. Storage

**Container Volumes:**
- Host path mounts
- Named volumes (Docker)
- Future: NFS, Ceph

**VM Disks:**
- qcow2 images (default)
- raw images
- Additional disks
- Future: Snapshots, thin provisioning

### 9.4. Security

**Container Isolation:**
- User namespaces
- Network isolation
- Validate images before pull
- Rate limiting per user/org

**VM Isolation:**
- Full hardware virtualization
- Secure GPU passthrough
- VNC password protection

### 9.5. Dependencies

**Worker Node Requirements:**

**For Containers:**
- Docker Engine OR containerd
- GPU drivers (nvidia-docker2 for GPU containers)

**For VMs:**
- libvirt-daemon
- QEMU/KVM kernel modules
- Network bridges configured
- IOMMU enabled (for GPU passthrough)

---

## 10. MVP Scope (Updated for V1)

### ✅ V1 Must Have (API-Only for Portal Demo)
- ✅ REST API cho Resource CRUD (fully functional với DB)
- ✅ Resource schema với 3 types: INFERENCE_CONTAINER, APPLICATION_CONTAINER, VIRTUAL_MACHINE
- ✅ DTO validation với conditional rules
- ✅ Support GPU config (passthrough/MIG) - chỉ lưu metadata
- ✅ Support network config (bridge-vlan, static IP/DHCP) - chỉ lưu metadata
- ✅ OS Image enum (Ubuntu, CentOS, Windows, Debian) - chỉ lưu metadata
- ✅ **Lifecycle API endpoints** (start/stop/restart) - mock success response
- ✅ **Monitoring API endpoints** (status/logs/metrics/console) - mock data response
- ✅ **Snapshot API endpoints** (create/list/restore/delete) - mock response
- ✅ **Container exec API** - mock response
- ✅ Swagger documentation đầy đủ cho TẤT CẢ endpoints
- ✅ Seed script để insert demo data
- ✅ Worker skeleton services (DockerService, LibvirtService) với TODO comments

### ⏸️ V2 Should Have (Actual Deployment)
- ⏳ DockerService implementation với dockerode
- ⏳ LibvirtService implementation với libvirt
- ⏳ GPU passthrough/MIG thực tế
- ⏳ Network bridge configuration thực tế
- ⏳ VM image download và management
- ⏳ Container registry authentication
- ⏳ Volume management
- ⏳ VM snapshots

### 🔜 V3 Nice to Have (Advanced Features)
- 🔜 vGPU support (NVIDIA GRID)
- 🔜 VM live migration
- 🔜 Resource quotas per user/org
- 🔜 Auto-scaling
- 🔜 Resource usage monitoring
- 🔜 Cost estimation

---

## 11. Questions for Discussion - ✅ ANSWERED

### 11.1. Priority ✅
**Question:** Start with containers first, then VMs? Or both in parallel?

**Answer:** Start với cả 2 (containers + VMs) cùng lúc, nhưng V1 chỉ cần API để query/insert metadata. Deployment thực tế để V2.

**Implementation:** Phase 1 sẽ làm CRUD API cho cả APPLICATION_CONTAINER và VIRTUAL_MACHINE, seed demo data để hiển thị trên Portal.

---

### 11.2. GPU Management ✅
**Question:** Support GPU passthrough for VMs? Support GPU sharing (MIG)?

**Answer:** Cho phép người dùng chọn cả hai options (passthrough hoặc MIG) trong UI, nhưng V1 chỉ lưu config vào DB. Worker implementation để comment TODO cho V2.

**Implementation:**
```typescript
gpuConfig?: {
  enabled: boolean;
  mode: 'passthrough' | 'mig';
  deviceIds?: string[];      // For passthrough
  migProfile?: string;       // For MIG (e.g., '1g.5gb')
}
```

---

### 11.3. Networking ✅
**Question:** Pre-configure network bridges on nodes? Support custom networking? Static IP allocation?

**Answer:**
- Anh sẽ cấu hình sẵn network bridges ở chế độ VLAN trên nodes
- V1 API sẽ có option cho user chọn IP mode: static hoặc DHCP
- Nếu static, user nhập IP address, netmask, gateway
- VLAN ID là optional (có default VLAN)

**Implementation:**
```typescript
networkConfig: {
  mode: 'bridge-vlan';          // Fixed
  ipMode: 'static' | 'dhcp';    // User choice
  ipAddress?: string;           // If static
  netmask?: string;             // If static
  gateway?: string;             // If static
  vlanId?: number;              // Optional
}
```

---

### 11.4. Storage ✅
**Question:** Support persistent volumes? NFS/Ceph integration? VM image repository?

**Answer:**
- Storage path sẽ quy hoạch cố định trên node (không cần config chi tiết)
- User chỉ cần nhập disk size (GB)
- VM Images: V1 sẽ dùng enum với các OS phổ biến (Ubuntu, CentOS, Windows Server, Debian)
- Image repository management để làm sau (V2)

**Implementation:**
```typescript
// V1: Simple enum
osImage: 'ubuntu-22.04' | 'ubuntu-20.04' | 'centos-8' | 'centos-7' |
         'windows-server-2022' | 'windows-server-2019' | 'debian-12' | 'debian-11';

diskGB: number;  // User input disk size only
```

---

### 11.5. Quotas ✅
**Question:** Enforce resource quotas per user/org? Hard limits or soft limits?

**Answer:** Chưa cần làm chức năng quotas trong V1. Để V3 sau khi đã có actual deployment và monitoring.

---

## 12. Risks & Mitigation (Updated for V1)

| Risk | Impact | Likelihood | Mitigation (V1) |
|------|--------|------------|-----------------|
| ~~Libvirt complexity~~ | ~~High~~ | ~~Medium~~ | ✅ **V1 Resolution:** Worker chỉ có skeleton code, không implement thực tế → Risk eliminated |
| ~~GPU passthrough issues~~ | ~~Medium~~ | ~~High~~ | ✅ **V1 Resolution:** Chỉ lưu config, không deploy → Risk eliminated |
| Breaking existing Deployment API | High | Low | ✅ Facade pattern maintains compatibility (still applicable) |
| ~~Worker node setup complexity~~ | ~~Medium~~ | ~~Medium~~ | ✅ **V1 Resolution:** Không cần setup worker dependencies → Risk eliminated |
| ~~Resource conflict~~ | ~~High~~ | ~~Medium~~ | ✅ **V1 Resolution:** Không có actual allocation → Risk eliminated |
| **New Risk:** Schema design errors | Medium | Low | **Mitigation:** Thorough DTO validation, Swagger testing, seed data verification |
| **New Risk:** Frontend integration delay | Low | Medium | **Mitigation:** Complete Swagger docs, example requests, seed data for testing |

---

## 13. Benefits

### Technical Benefits
- ✅ **Unified management** cho tất cả resource types
- ✅ **Extensible** - dễ thêm resource types mới
- ✅ **Type-safe** với discriminated unions
- ✅ **Backward compatible** với Deployment API
- ✅ **Scalable** cho multi-node deployments

### Business Benefits
- ✅ **More use cases** - không chỉ AI inference
- ✅ **Better resource utilization** - track all resources
- ✅ **User flexibility** - deploy any app/VM
- ✅ **Competitive advantage** - comprehensive platform

---

## 14. Metrics for Success

### Technical Metrics
- Resource creation success rate > 95%
- API response time < 200ms (p95)
- Worker command execution < 30s (containers), < 2min (VMs)
- Zero resource allocation conflicts

### Business Metrics
- Number of application containers deployed
- Number of VMs deployed
- GPU utilization across all resource types
- User satisfaction with resource management

---

## 15. Next Steps - APPROVED FOR V1

### ✅ Week 1: Foundation & API (Approved)

**Tasks:**
1. Create Resource module in `services/aiwm/src/modules/resource/`
   - resource.schema.ts (unified schema với discriminated configs)
   - resource.service.ts (extends BaseService)
   - resource.controller.ts (REST API với Swagger)
   - resource.dto.ts (CreateResourceDto, UpdateResourceDto với validation)
   - resource.module.ts
   - enums/ (resource-type, os-image, gpu-mode)

2. Add shared DTOs to `libs/shared/`
   - VirtualMachineConfig interface
   - ApplicationContainerConfig interface
   - Update existing InferenceContainerConfig

3. REST API implementation
   - POST /resources (create với validation)
   - GET /resources (list với filters: type, status, nodeId)
   - GET /resources/:id (get by ID)
   - PATCH /resources/:id (update config)
   - DELETE /resources/:id (soft delete)

4. Swagger documentation
   - Complete API specs
   - Example requests/responses
   - Error responses

**Deliverables:**
- ✅ Working CRUD API (fully functional với DB)
- ✅ Lifecycle APIs (mock responses)
- ✅ Monitoring APIs (mock data)
- ✅ Snapshot APIs (mock responses)
- ✅ Swagger UI accessible với TẤT CẢ endpoints documented
- ✅ Build passes (`npx nx build aiwm`)
- ✅ All endpoints testable via Swagger UI

---

### ✅ Week 2: Worker Skeleton & Demo Data (Approved)

**Tasks:**
1. Worker skeleton services in `services/aiwm-worker/`
   - DockerService (skeleton với TODO comments)
   - LibvirtService (skeleton với TODO comments)
   - ResourceManagerService (routing với error TODO)

2. Update WebSocket message types (define only)
   - vm.create, vm.start, vm.stop, vm.delete
   - container.create, container.start, container.stop, container.delete

3. Seed script
   - `services/aiwm/src/scripts/seed-resources.ts`
   - Insert 5-10 demo VMs (các OS khác nhau)
   - Insert 5-10 demo Containers (nginx, postgres, redis, etc.)
   - Các status khác nhau (queued, running, stopped)

4. Testing
   - Test all API endpoints với curl
   - Verify Swagger UI
   - Verify seed data hiển thị đúng

**Deliverables:**
- ✅ Worker skeleton services (throw TODO)
- ✅ Seed data in database
- ✅ API documentation complete
- ✅ Ready for Portal integration

---

### Documentation Deliverables (V1)
- [x] API proposal document (this file)
- [ ] API documentation (REST endpoints) - generated from Swagger
- [ ] README for Resource module
- [ ] Seed data documentation (how to use)

---

## 16. Conclusion

### ✅ APPROVED - V1 Implementation Starting

**Decision:** Proceed with Resource Management Module - V1 (API-Only)

**Rationale:**

1. **Clear business value** - Portal có thể demo VM & Container management UI ngay
2. **Technically sound** - Extensible, type-safe design với discriminated union
3. **Reduced scope** - 1-2 tuần cho V1 (API only), không risk từ worker implementation
4. **Low risk** - Backward compatible, API-first approach cho phép frontend tích hợp song song
5. **Practical approach** - Seed data cho demo, actual deployment để V2 khi ready

**V1 Scope Confirmed:**
- ✅ CRUD API cho Resource (VM + Container)
- ✅ Metadata-only (không deploy thực tế)
- ✅ GPU config (passthrough/MIG) - UI ready
- ✅ Network config (bridge-vlan, IP/DHCP) - UI ready
- ✅ OS Image enum - UI ready
- ✅ Seed script cho demo data
- ✅ Worker skeleton với TODO comments

**Timeline:** 1-2 tuần
**LOC Estimate:** ~1500 lines (API layer only)
**Risk Level:** Low (no actual deployment complexity)

### Alternative Considered

**Option B:** Expand Deployment module
- ❌ Rejected vì:
  - Schema becomes bloated
  - Hard to maintain
  - Violates single responsibility

**Option C:** Separate modules for each type
- ❌ Rejected vì:
  - Code duplication
  - Inconsistent APIs
  - Hard to track resources holistically

---

**Document Status:** ✅ APPROVED - V1 Implementation
**Next Action:** Start Week 1 implementation (Resource module CRUD API)
**Contact:** Backend Dev Team

**Implementation Start Date:** 2025-12-03
**Expected Completion:** 2025-12-17 (2 weeks)

---

## Appendix A: V1 vs V2 Feature Matrix

| Feature | V1 (API-Only) | V2 (Actual Deployment) |
|---------|---------------|------------------------|
| Resource CRUD API | ✅ Yes (DB operations) | ✅ Yes |
| Swagger Documentation | ✅ Yes (all endpoints) | ✅ Yes |
| VM metadata storage | ✅ Yes | ✅ Yes |
| Container metadata storage | ✅ Yes | ✅ Yes |
| GPU config (UI) | ✅ Yes (metadata only) | ✅ Yes (actual passthrough/MIG) |
| Network config (UI) | ✅ Yes (metadata only) | ✅ Yes (actual bridge setup) |
| OS Image selection | ✅ Yes (enum) | ✅ Yes (actual download) |
| **Lifecycle APIs** (start/stop/restart) | ✅ Yes (mock response) | ✅ Yes (actual execution) |
| **Status API** | ✅ Yes (mock data) | ✅ Yes (real status from worker) |
| **Logs API** | ✅ Yes (mock logs) | ✅ Yes (real logs streaming) |
| **Metrics API** | ✅ Yes (mock metrics) | ✅ Yes (real CPU/RAM/GPU metrics) |
| **Console API** (VMs) | ✅ Yes (mock VNC URL) | ✅ Yes (real VNC/console access) |
| **Snapshot APIs** (create/list/restore) | ✅ Yes (mock response) | ✅ Yes (actual libvirt snapshots) |
| **Container exec API** | ✅ Yes (mock output) | ✅ Yes (actual command execution) |
| Seed demo data | ✅ Yes | ❌ No (use real data) |
| DockerService | ⏸️ Skeleton + TODO | ✅ Full implementation |
| LibvirtService | ⏸️ Skeleton + TODO | ✅ Full implementation |
| Worker handlers | ⏸️ Mock response + TODO | ✅ Actual deployment |
| Resource allocation tracking | ❌ No | ✅ Yes |
| Conflict detection | ❌ No | ✅ Yes |
| Resource quotas | ❌ No | ⏸️ V3 |

