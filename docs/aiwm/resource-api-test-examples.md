# Resource API Test Examples

**Base URL:** `http://localhost:3003`

## Prerequisites

### 1. Get Authentication Token
```bash
# Login to get JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@x-or.cloud",
    "password": "your_password"
  }'

# Save token to variable
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Seed Demo Data (Optional)
```bash
# Run seed script to insert 10 demo resources
export MONGODB_URI=mongodb://localhost:27017
npx ts-node services/aiwm/src/scripts/seed-resources.ts
```

---

## CRUD Operations

### Create Resource - Virtual Machine

```bash
curl -X POST http://localhost:3003/resources \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Ubuntu VM",
    "description": "Ubuntu 22.04 for testing",
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
        "ipAddress": "192.168.100.50",
        "netmask": "255.255.255.0",
        "gateway": "192.168.100.1",
        "vlanId": 100
      },
      "cloudInit": {
        "hostname": "test-vm-01",
        "username": "ubuntu",
        "sshPublicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
      }
    }
  }'
```

### Create Resource - Application Container (PostgreSQL)

```bash
curl -X POST http://localhost:3003/resources \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test PostgreSQL",
    "description": "PostgreSQL 16 database",
    "resourceType": "application-container",
    "nodeId": "673e7a1f5c9d8e001234abcd",
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
          "hostPath": "/data/postgres/test-db",
          "containerPath": "/var/lib/postgresql/data"
        }
      ],
      "environment": {
        "POSTGRES_USER": "testuser",
        "POSTGRES_PASSWORD": "testpass123",
        "POSTGRES_DB": "testdb"
      },
      "networkMode": "bridge"
    }
  }'
```

### List All Resources with Statistics

```bash
# List all (default: page=1, limit=10)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/resources

# Expected Response:
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 10
  },
  "statistics": {
    "total": 10,
    "byStatus": {
      "running": 6,
      "stopped": 2,
      "deploying": 1,
      "queued": 1,
      "failed": 1,
      "stopping": 0,
      "error": 0
    },
    "byType": {
      "virtual-machine": 5,
      "application-container": 5,
      "inference-container": 0
    }
  }
}
```

### List with Filters

```bash
# Filter by resource type
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3003/resources?resourceType=virtual-machine"

# Filter by status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3003/resources?status=running"

# Filter by node ID
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3003/resources?nodeId=673e7a1f5c9d8e001234abcd"

# Combine filters with pagination
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3003/resources?resourceType=virtual-machine&status=running&page=1&limit=5"
```

### Get Resource by ID

```bash
RESOURCE_ID="674a1b2c3d4e5f6a7b8c9d0e"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/resources/$RESOURCE_ID
```

### Update Resource

```bash
RESOURCE_ID="674a1b2c3d4e5f6a7b8c9d0e"

# Update description and status (for demo purposes)
curl -X PATCH http://localhost:3003/resources/$RESOURCE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "status": "running"
  }'
```

### Delete Resource (Soft Delete)

```bash
RESOURCE_ID="674a1b2c3d4e5f6a7b8c9d0e"

curl -X DELETE http://localhost:3003/resources/$RESOURCE_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Lifecycle Operations (Mock Responses)

### Start Resource

```bash
RESOURCE_ID="674a1b2c3d4e5f6a7b8c9d0e"

curl -X POST http://localhost:3003/resources/$RESOURCE_ID/start \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "success": true,
  "message": "Start requested",
  "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
  "action": "start",
  "timestamp": "2025-12-03T12:00:00.000Z",
  "note": "V1: Mock response. Actual start will be implemented in V2."
}
```

### Stop Resource

```bash
curl -X POST http://localhost:3003/resources/$RESOURCE_ID/stop \
  -H "Authorization: Bearer $TOKEN"
```

### Restart Resource

```bash
curl -X POST http://localhost:3003/resources/$RESOURCE_ID/restart \
  -H "Authorization: Bearer $TOKEN"
```

---

## Monitoring Operations (Mock Data)

### Get Resource Status

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/resources/$RESOURCE_ID/status

# Expected Response:
{
  "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
  "status": "running",
  "runtime": {
    "id": "vm-mock-ubuntu-gpu",
    "endpoint": "192.168.100.10:22",
    "allocatedGPU": ["GPU-0"],
    "allocatedCPU": 16,
    "allocatedRAM": 64,
    "startedAt": "2025-11-26T10:00:00.000Z"
  },
  "lastHealthCheck": "2025-12-03T11:55:00.000Z",
  "note": "V1: Status from DB. Real-time status from worker will be implemented in V2."
}
```

### Get Resource Logs

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/resources/$RESOURCE_ID/logs

# Expected Response:
{
  "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
  "logs": [
    {
      "timestamp": "2025-12-03T11:00:00.000Z",
      "level": "info",
      "message": "[Mock] Demo Ubuntu GPU Server initializing..."
    },
    {
      "timestamp": "2025-12-03T11:00:15.000Z",
      "level": "info",
      "message": "[Mock] Allocating resources (virtual-machine)..."
    },
    {
      "timestamp": "2025-12-03T11:00:30.000Z",
      "level": "info",
      "message": "[Mock] Demo Ubuntu GPU Server ready"
    },
    {
      "timestamp": "2025-12-03T11:00:45.000Z",
      "level": "info",
      "message": "[Mock] SSH available at 192.168.100.10:22"
    }
  ],
  "note": "V1: Mock logs. Actual logs from libvirt/docker will be implemented in V2."
}
```

### Get Resource Metrics

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/resources/$RESOURCE_ID/metrics

# Expected Response:
{
  "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
  "timestamp": "2025-12-03T12:00:00.000Z",
  "metrics": {
    "cpu": {
      "cores": 16,
      "usagePercent": 45.2
    },
    "memory": {
      "totalMB": 65536,
      "usedMB": 26214,
      "usagePercent": 40.0
    },
    "disk": {
      "totalGB": 500,
      "usedGB": 125,
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

### Get VM Console Access

```bash
# Only works for VMs
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/resources/$RESOURCE_ID/console

# Expected Response:
{
  "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
  "type": "vnc",
  "url": "vnc://192.168.100.156:5900",
  "password": "mock-vnc-pass-9d0e",
  "note": "V1: Mock VNC URL. Actual VNC access will be implemented in V2."
}
```

---

## Snapshot Operations (VMs Only - Mock Responses)

### Create Snapshot

```bash
curl -X POST http://localhost:3003/resources/$RESOURCE_ID/snapshots \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Before System Update",
    "description": "Snapshot before updating system packages"
  }'

# Expected Response:
{
  "success": true,
  "snapshot": {
    "id": "snapshot-mock-1733230800000",
    "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
    "name": "Before System Update",
    "description": "Snapshot before updating system packages",
    "createdAt": "2025-12-03T12:00:00.000Z",
    "diskSizeGB": 125
  },
  "note": "V1: Mock snapshot. Actual libvirt snapshot will be implemented in V2."
}
```

### List Snapshots

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/resources/$RESOURCE_ID/snapshots

# Expected Response:
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
      "name": "After Updates",
      "description": "VM after installing system updates",
      "createdAt": "2025-12-03T10:45:00.000Z",
      "diskSizeGB": 18
    }
  ],
  "note": "V1: Mock snapshots. Actual libvirt snapshots will be implemented in V2."
}
```

### Restore Snapshot

```bash
SNAPSHOT_ID="snapshot-mock-1733220000000"

curl -X POST http://localhost:3003/resources/$RESOURCE_ID/snapshots/$SNAPSHOT_ID/restore \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "success": true,
  "message": "Snapshot restore requested",
  "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
  "snapshotId": "snapshot-mock-1733220000000",
  "timestamp": "2025-12-03T12:00:00.000Z",
  "note": "V1: Mock restore. Actual snapshot restore will be implemented in V2."
}
```

### Delete Snapshot

```bash
curl -X DELETE http://localhost:3003/resources/$RESOURCE_ID/snapshots/$SNAPSHOT_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Container-Specific Operations

### Execute Command in Container

```bash
# Only works for containers
curl -X POST http://localhost:3003/resources/$RESOURCE_ID/exec \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "ps aux",
    "workingDir": "/app"
  }'

# Expected Response:
{
  "resourceId": "674a1b2c3d4e5f6a7b8c9d0e",
  "command": "ps aux",
  "workingDir": "/app",
  "output": "[Mock] Executing: ps aux\n[Mock] Output from container...\n[Mock] Command completed successfully",
  "exitCode": 0,
  "timestamp": "2025-12-03T12:00:00.000Z",
  "note": "V1: Mock execution. Actual docker exec will be implemented in V2."
}
```

---

## Statistics Examples

### Get Statistics for All Resources

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3003/resources?page=1&limit=100"

# Focus on statistics field:
{
  "statistics": {
    "total": 10,
    "byStatus": {
      "queued": 1,
      "deploying": 1,
      "running": 6,
      "stopping": 0,
      "stopped": 2,
      "failed": 1,
      "error": 0
    },
    "byType": {
      "inference-container": 0,
      "application-container": 5,
      "virtual-machine": 5
    }
  }
}
```

### Get Statistics for Specific Type

```bash
# Only VMs
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3003/resources?resourceType=virtual-machine"

# Statistics will show only VM data:
{
  "statistics": {
    "total": 5,
    "byStatus": {
      "queued": 1,
      "deploying": 1,
      "running": 2,
      "stopped": 1,
      ...
    },
    "byType": {
      "virtual-machine": 5
    }
  }
}
```

### Get Statistics by Node

```bash
# Resources on specific node
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3003/resources?nodeId=673e7a1f5c9d8e001234abcd"
```

---

## Quick Test Script

```bash
#!/bin/bash
# Quick test script for Resource API

# Set variables
export TOKEN="your_jwt_token_here"
BASE_URL="http://localhost:3003"

echo "1. List all resources with statistics..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/resources" | jq '.statistics'

echo "\n2. Get running VMs..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/resources?resourceType=virtual-machine&status=running" | jq '.data[].name'

echo "\n3. Create test resource..."
RESOURCE_ID=$(curl -s -X POST "$BASE_URL/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test VM",
    "resourceType": "virtual-machine",
    "nodeId": "673e7a1f5c9d8e001234abcd",
    "config": {
      "type": "virtual-machine",
      "osImage": "ubuntu-22.04",
      "vcpus": 2,
      "ramMB": 4096,
      "diskGB": 50,
      "networkConfig": {
        "mode": "bridge-vlan",
        "ipMode": "dhcp"
      }
    }
  }' | jq -r '._id')

echo "Created resource: $RESOURCE_ID"

echo "\n4. Get resource details..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/resources/$RESOURCE_ID" | jq '.name, .status'

echo "\n5. Start resource (mock)..."
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/resources/$RESOURCE_ID/start" | jq '.message'

echo "\n6. Get metrics (mock)..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/resources/$RESOURCE_ID/metrics" | jq '.metrics.cpu'

echo "\nDone!"
```

---

## Notes

- **V1 Implementation:** All lifecycle, monitoring, and snapshot operations return mock responses
- **Authentication:** All endpoints require valid JWT token in Authorization header
- **Swagger UI:** Available at `http://localhost:3003/api-docs` for interactive testing
- **Statistics:** Automatically calculated for filtered results
- **Filters:** Can combine multiple filters (resourceType, status, nodeId) with pagination

---

## Troubleshooting

### 401 Unauthorized
```bash
# Your token may have expired, get a new one:
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@x-or.cloud", "password": "your_password"}'
```

### 404 Not Found
```bash
# Check if service is running on correct port:
curl http://localhost:3003/health
```

### No Demo Data
```bash
# Run seed script:
npx ts-node services/aiwm/src/scripts/seed-resources.ts
```
