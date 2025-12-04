# Reports API - Test Examples & Sample Responses

**Service:** AIWM
**Module:** Reports
**Date:** 2025-12-03
**Purpose:** Curl examples và sample responses thực tế để test API

---

## 🔑 Setup - Lấy JWT Token

Trước tiên cần login để lấy JWT token:

```bash
# Login với user admin
TOKEN=$(curl -s -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@x-or.cloud",
    "password": "your-password"
  }' | jq -r '.accessToken')

echo "Token: $TOKEN"
```

Hoặc sử dụng token có sẵn:

```bash
# Set token manually
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📊 Test 1: Platform Overview

### Request

```bash
curl -X GET "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
```

### Expected Response

```json
{
  "timestamp": "2025-12-03T10:15:30.123Z",
  "infrastructure": {
    "nodes": {
      "total": 5,
      "online": 4,
      "offline": 1,
      "maintenance": 0,
      "byRole": {
        "controller": 1,
        "worker": 3,
        "storage": 1
      }
    },
    "resources": {
      "total": 12,
      "running": 8,
      "stopped": 3,
      "deploying": 1,
      "failed": 0
    },
    "hardware": {
      "cpuUtilization": 42.5,
      "ramUtilization": 65.8,
      "gpuUtilization": 78.3,
      "diskUtilization": 0,
      "gpusActive": 4,
      "gpusTotal": 6
    }
  },
  "workload": {
    "models": {
      "total": 8,
      "active": 5,
      "inactive": 2,
      "downloading": 1
    },
    "deployments": {
      "total": 4,
      "running": 3,
      "stopped": 1
    },
    "agents": {
      "total": 3,
      "active": 2,
      "busy": 1,
      "inactive": 0
    },
    "executions": {
      "total": 45,
      "completed": 38,
      "running": 5,
      "failed": 2
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
    "systemHealth": 96,
    "alerts": {
      "critical": 0,
      "warning": 2,
      "info": 3
    },
    "issues": [
      {
        "severity": "warning",
        "type": "node.offline",
        "message": "Node worker-03 is offline",
        "nodeId": "675a1b2c3d4e5f6a7b8c9d0e"
      },
      {
        "severity": "warning",
        "type": "node.gpu.temperature",
        "message": "Node worker-gpu-01 GPU-0 temperature high (82°C)",
        "nodeId": "675a1b2c3d4e5f6a7b8c9d0f"
      }
    ]
  }
}
```

### Test Scenarios

#### 1. Extract key metrics
```bash
# Get total nodes
curl -s "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer $TOKEN" | jq '.infrastructure.nodes.total'

# Get system health score
curl -s "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer $TOKEN" | jq '.health.systemHealth'

# Check critical alerts
curl -s "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer $TOKEN" | jq '.health.alerts.critical'
```

#### 2. Check if any nodes offline
```bash
curl -s "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq -r 'if .infrastructure.nodes.offline > 0 then "⚠️  \(.infrastructure.nodes.offline) nodes offline" else "✅ All nodes online" end'
```

#### 3. Get hardware utilization summary
```bash
curl -s "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.infrastructure.hardware | "CPU: \(.cpuUtilization)%, RAM: \(.ramUtilization)%, GPU: \(.gpuUtilization)%"'
```

---

## 🖥️ Test 2: System Overview

### Request

```bash
curl -X GET "http://localhost:3305/reports/system-overview" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
```

### Expected Response

```json
{
  "timestamp": "2025-12-03T10:15:35.456Z",
  "summary": {
    "nodes": {
      "total": 5,
      "online": 4,
      "offline": 1,
      "byRole": {
        "controller": {
          "total": 1,
          "online": 1
        },
        "worker": {
          "total": 3,
          "online": 2
        },
        "storage": {
          "total": 1,
          "online": 1
        }
      }
    },
    "resources": {
      "total": 12,
      "running": 8,
      "stopped": 3,
      "byType": {
        "virtualMachine": 5,
        "applicationContainer": 4,
        "inferenceContainer": 3
      }
    },
    "utilization": {
      "cpu": 42.5,
      "ram": 65.8,
      "disk": 0,
      "gpu": 78.3,
      "gpusActive": 4,
      "gpusTotal": 6
    }
  },
  "nodes": [
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d0e",
      "name": "controller-01",
      "role": ["controller"],
      "status": "online",
      "websocketConnected": true,
      "lastHeartbeat": "2025-12-03T10:15:30.000Z",
      "cpuUsage": 15.2,
      "ramUsage": 8192,
      "ramTotal": 16384,
      "diskTotal": 102400,
      "gpuCount": 0,
      "uptime": 2592000
    },
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d0f",
      "name": "worker-gpu-01",
      "role": ["worker"],
      "status": "online",
      "websocketConnected": true,
      "lastHeartbeat": "2025-12-03T10:15:32.000Z",
      "cpuUsage": 45.8,
      "ramUsage": 49152,
      "ramTotal": 65536,
      "diskTotal": 512000,
      "gpuCount": 4,
      "uptime": 1296000
    },
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d10",
      "name": "worker-gpu-02",
      "role": ["worker"],
      "status": "online",
      "websocketConnected": true,
      "lastHeartbeat": "2025-12-03T10:15:28.000Z",
      "cpuUsage": 62.3,
      "ramUsage": 32768,
      "ramTotal": 65536,
      "diskTotal": 512000,
      "gpuCount": 2,
      "uptime": 864000
    },
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d11",
      "name": "worker-03",
      "role": ["worker"],
      "status": "offline",
      "websocketConnected": false,
      "lastHeartbeat": "2025-12-03T09:45:12.000Z",
      "cpuUsage": 0,
      "ramTotal": 32768,
      "diskTotal": 256000,
      "gpuCount": 0,
      "uptime": 432000
    },
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d12",
      "name": "storage-01",
      "role": ["storage"],
      "status": "online",
      "websocketConnected": true,
      "lastHeartbeat": "2025-12-03T10:15:25.000Z",
      "cpuUsage": 8.5,
      "ramUsage": 4096,
      "ramTotal": 8192,
      "diskTotal": 2048000,
      "gpuCount": 0,
      "uptime": 3456000
    }
  ]
}
```

### Test Scenarios

#### 1. List all online nodes
```bash
curl -s "http://localhost:3305/reports/system-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.nodes[] | select(.status == "online") | {name, role, cpuUsage, gpuCount}'
```

#### 2. Find nodes with high CPU usage (>80%)
```bash
curl -s "http://localhost:3305/reports/system-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.nodes[] | select(.cpuUsage > 80) | {name, cpuUsage, status}'
```

#### 3. Get total GPU count across all nodes
```bash
curl -s "http://localhost:3305/reports/system-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '[.nodes[].gpuCount] | add'
```

#### 4. Find offline nodes
```bash
curl -s "http://localhost:3305/reports/system-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.nodes[] | select(.status == "offline") | {name, lastHeartbeat}'
```

#### 5. Calculate average RAM usage percentage
```bash
curl -s "http://localhost:3305/reports/system-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '[.nodes[] | select(.ramUsage and .ramTotal) | (.ramUsage / .ramTotal * 100)] | add / length'
```

#### 6. Group nodes by role
```bash
curl -s "http://localhost:3305/reports/system-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq 'group_by(.nodes[].role[0]) | map({role: .[0].role[0], count: length})'
```

#### 7. Format node uptime to human readable
```bash
curl -s "http://localhost:3305/reports/system-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.nodes[] | {name, uptime_days: (.uptime / 86400 | floor)}'
```

---

## 🤖 Test 3: AI Workload Overview

### Request

```bash
curl -X GET "http://localhost:3305/reports/ai-workload-overview" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
```

### Expected Response

```json
{
  "timestamp": "2025-12-03T10:15:40.789Z",
  "models": {
    "total": 8,
    "active": 5,
    "inactive": 2,
    "downloading": 1,
    "byType": {
      "llm": 4,
      "vision": 2,
      "embedding": 1,
      "voice": 1
    },
    "byDeploymentType": {
      "selfHosted": 5,
      "apiBased": 3
    }
  },
  "deployments": {
    "total": 4,
    "running": 3,
    "stopped": 1,
    "deploying": 0,
    "failed": 0
  },
  "agents": {
    "total": 3,
    "active": 2,
    "busy": 1,
    "inactive": 0,
    "performance": {
      "totalTasks": 156,
      "completedTasks": 148,
      "failedTasks": 8,
      "successRate": 94.87,
      "avgResponseTime": 1850
    }
  },
  "executions": {
    "total": 45,
    "completed": 38,
    "running": 5,
    "failed": 2,
    "pending": 0
  }
}
```

### Test Scenarios

#### 1. Check model distribution by type
```bash
curl -s "http://localhost:3305/reports/ai-workload-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.models.byType'
```

#### 2. Get agent success rate
```bash
curl -s "http://localhost:3305/reports/ai-workload-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.agents.performance.successRate'
```

#### 3. Check if any deployments failed
```bash
curl -s "http://localhost:3305/reports/ai-workload-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq -r 'if .deployments.failed > 0 then "⚠️  \(.deployments.failed) failed deployments" else "✅ No failed deployments" end'
```

#### 4. Calculate execution success rate
```bash
curl -s "http://localhost:3305/reports/ai-workload-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '(.executions.completed / .executions.total * 100 | floor)'
```

#### 5. Get models downloading
```bash
curl -s "http://localhost:3305/reports/ai-workload-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.models.downloading'
```

#### 6. Summary của AI workload
```bash
curl -s "http://localhost:3305/reports/ai-workload-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '{
    models: .models.total,
    deployments_running: .deployments.running,
    agents_active: .agents.active,
    success_rate: .agents.performance.successRate
  }'
```

---

## 🔄 Test 4: Continuous Monitoring (Watch Mode)

### Watch overview mỗi 10 giây

```bash
watch -n 10 "curl -s 'http://localhost:3305/reports/overview' \
  -H 'Authorization: Bearer $TOKEN' | \
  jq '{
    nodes: .infrastructure.nodes,
    health: .health.systemHealth,
    alerts: .health.alerts
  }'"
```

### Watch system utilization

```bash
watch -n 5 "curl -s 'http://localhost:3305/reports/system-overview' \
  -H 'Authorization: Bearer $TOKEN' | \
  jq '.summary.utilization'"
```

### Monitor nodes realtime

```bash
watch -n 3 "curl -s 'http://localhost:3305/reports/system-overview' \
  -H 'Authorization: Bearer $TOKEN' | \
  jq '.nodes[] | {name, status, cpuUsage, gpuCount}'"
```

---

## 📈 Test 5: Performance Testing

### Measure response time

```bash
time curl -s "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer $TOKEN" \
  -o /dev/null
```

### Concurrent requests test

```bash
# Test với 10 concurrent requests
seq 1 10 | xargs -P10 -I{} curl -s "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer $TOKEN" \
  -o /dev/null -w "Request {}: %{time_total}s\n"
```

### Response size

```bash
curl -s "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer $TOKEN" | \
  wc -c | awk '{print $1/1024 " KB"}'
```

---

## 🧪 Test 6: Error Scenarios

### Test without token (401)

```bash
curl -X GET "http://localhost:3305/reports/overview" \
  -H "Content-Type: application/json"

# Expected: {"statusCode":401,"message":"Unauthorized"}
```

### Test with invalid token (401)

```bash
curl -X GET "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer invalid-token-here"

# Expected: {"statusCode":401,"message":"Unauthorized"}
```

### Test with expired token (401)

```bash
# Sử dụng token đã expired
curl -X GET "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token"

# Expected: {"statusCode":401,"message":"Unauthorized"}
```

---

## 📊 Test 7: Data Validation

### Verify response structure

```bash
# Check if all required fields exist in overview
curl -s "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq 'has("timestamp") and has("infrastructure") and has("workload") and has("health")'

# Should return: true
```

### Validate timestamp format

```bash
curl -s "http://localhost:3305/reports/overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq -r '.timestamp | fromdateiso8601'

# Should print Unix timestamp
```

### Check for null/undefined values

```bash
curl -s "http://localhost:3305/reports/system-overview" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.nodes[] | select(.ramUsage == null) | {name, status}'

# Lists nodes without ramUsage data
```

---

## 🎯 Test 8: Integration Test Script

Complete test script để validate tất cả endpoints:

```bash
#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3305"
TOKEN="$1"

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Usage: $0 <jwt-token>${NC}"
  exit 1
fi

echo "Testing Reports API..."
echo "====================="

# Test 1: Platform Overview
echo -e "\n${YELLOW}Test 1: GET /reports/overview${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE_URL/reports/overview" \
  -H "Authorization: Bearer $TOKEN")

if [ "$STATUS" -eq 200 ]; then
  echo -e "${GREEN}✓ Platform Overview: OK${NC}"
else
  echo -e "${RED}✗ Platform Overview: FAILED (Status: $STATUS)${NC}"
  exit 1
fi

# Test 2: System Overview
echo -e "\n${YELLOW}Test 2: GET /reports/system-overview${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE_URL/reports/system-overview" \
  -H "Authorization: Bearer $TOKEN")

if [ "$STATUS" -eq 200 ]; then
  echo -e "${GREEN}✓ System Overview: OK${NC}"
else
  echo -e "${RED}✗ System Overview: FAILED (Status: $STATUS)${NC}"
  exit 1
fi

# Test 3: AI Workload Overview
echo -e "\n${YELLOW}Test 3: GET /reports/ai-workload-overview${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE_URL/reports/ai-workload-overview" \
  -H "Authorization: Bearer $TOKEN")

if [ "$STATUS" -eq 200 ]; then
  echo -e "${GREEN}✓ AI Workload Overview: OK${NC}"
else
  echo -e "${RED}✗ AI Workload Overview: FAILED (Status: $STATUS)${NC}"
  exit 1
fi

# Test 4: Unauthorized request
echo -e "\n${YELLOW}Test 4: Unauthorized request${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE_URL/reports/overview")

if [ "$STATUS" -eq 401 ]; then
  echo -e "${GREEN}✓ Unauthorized: OK (correctly rejected)${NC}"
else
  echo -e "${RED}✗ Unauthorized: FAILED (Expected 401, got $STATUS)${NC}"
  exit 1
fi

# Test 5: Response time check
echo -e "\n${YELLOW}Test 5: Response time check${NC}"
TIME=$(curl -s -o /dev/null -w "%{time_total}" \
  "$BASE_URL/reports/overview" \
  -H "Authorization: Bearer $TOKEN")

echo "Response time: ${TIME}s"
if (( $(echo "$TIME < 1.0" | bc -l) )); then
  echo -e "${GREEN}✓ Response time: OK (<1s)${NC}"
else
  echo -e "${YELLOW}⚠ Response time: SLOW (>1s)${NC}"
fi

echo -e "\n${GREEN}=====================${NC}"
echo -e "${GREEN}All tests passed!${NC}"
```

**Chạy script:**

```bash
chmod +x test-reports-api.sh
./test-reports-api.sh "your-jwt-token-here"
```

---

## 📝 Notes

### Empty Data Scenarios

Nếu chưa có data (nodes, models, agents), API vẫn trả về structure đầy đủ với values = 0:

```json
{
  "timestamp": "2025-12-03T10:00:00.000Z",
  "infrastructure": {
    "nodes": {
      "total": 0,
      "online": 0,
      "offline": 0,
      "maintenance": 0,
      "byRole": {}
    },
    "resources": {
      "total": 0,
      "running": 0,
      "stopped": 0,
      "deploying": 0,
      "failed": 0
    },
    "hardware": {
      "cpuUtilization": 0,
      "ramUtilization": 0,
      "gpuUtilization": 0,
      "diskUtilization": 0,
      "gpusActive": 0,
      "gpusTotal": 0
    }
  },
  ...
}
```

### Known Limitations

1. **diskUtilization** luôn = 0 (chưa track trong schema)
2. **activity section** hiện tại hardcoded (chưa có dữ liệu thực)
3. **ramUsage** có thể undefined nếu node chưa report metrics
4. **lastHeartbeat** có thể cũ nếu node offline

### Timezone

Tất cả timestamps đều UTC. Frontend cần convert:

```javascript
const localTime = new Date(timestamp).toLocaleString();
```

---

**Last Updated:** 2025-12-03
**Version:** 1.0
