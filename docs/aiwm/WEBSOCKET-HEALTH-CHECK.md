# WebSocket Health Check Endpoints

## Overview

HTTP endpoints to verify WebSocket gateway is running and accessible. Useful for Nginx proxy verification and monitoring.

## Endpoints

### 1. GET /ws - Service Info

Returns information about the WebSocket service.

**Request:**
```bash
curl http://localhost:3305/ws
```

**Response:**
```json
{
  "service": "AIWM WebSocket Gateway",
  "status": "running",
  "namespace": "/ws",
  "endpoint": "Connect via Socket.IO client",
  "socketPath": "/ws/socket.io/",
  "features": [
    "Real-time chat",
    "Agent auto-join",
    "Typing indicators",
    "Presence tracking"
  ],
  "timestamp": "2025-12-30T12:00:00.000Z"
}
```

### 2. GET /ws/health - Detailed Health

Returns detailed health information.

**Request:**
```bash
curl http://localhost:3305/ws/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "websocket-gateway",
  "uptime": 3600.5,
  "memory": {
    "rss": 123456789,
    "heapTotal": 12345678,
    "heapUsed": 1234567,
    "external": 123456,
    "arrayBuffers": 12345
  },
  "timestamp": "2025-12-30T12:00:00.000Z"
}
```

## Use Cases

### 1. Verify Backend is Running

```bash
# Quick check
curl -f http://localhost:3305/ws || echo "Backend not running"

# With output
curl http://localhost:3305/ws | jq .
```

### 2. Nginx Proxy Verification

Before configuring Nginx, verify the backend endpoint works:

```bash
# Direct backend test
curl http://localhost:3305/ws

# Through Nginx (after config)
curl https://api.x-or.cloud/dev/aiwm/ws

# Both should return same JSON response
```

**Expected:**
```json
{
  "service": "AIWM WebSocket Gateway",
  "status": "running",
  ...
}
```

**If 404:**
- Backend not running
- ChatModule not loaded
- Wrong port

**If 502 through Nginx:**
- Nginx can't reach backend
- Check upstream configuration
- Check backend ports

### 3. Monitoring / Health Checks

Use in monitoring systems:

```bash
# Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /ws/health
    port: 3305
  initialDelaySeconds: 30
  periodSeconds: 10

# Docker healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3305/ws/health || exit 1

# Monitoring script
while true; do
  if ! curl -sf http://localhost:3305/ws/health > /dev/null; then
    echo "WebSocket gateway is down!"
    # Send alert
  fi
  sleep 60
done
```

### 4. Load Balancer Health Check

Configure Nginx upstream health checks:

```nginx
upstream api-aiwm-ws {
    server 172.16.2.100:3350 max_fails=3 fail_timeout=30s;
    server 172.16.2.100:3351 max_fails=3 fail_timeout=30s;
    server 172.16.2.100:3352 max_fails=3 fail_timeout=30s;

    # Active health check (nginx-plus)
    # health_check uri=/ws/health interval=10s;
}
```

### 5. Deployment Verification

After deploying new code:

```bash
# 1. Deploy code
pm2 restart core.aiwm.api00

# 2. Wait for startup
sleep 5

# 3. Verify health
curl http://localhost:3305/ws/health | jq '.status'

# Should output: "healthy"

# 4. Check all instances
for port in 3350 3351 3352; do
  echo "Instance :$port"
  curl -s http://localhost:$port/ws | jq '.status'
done
```

## Testing with sktclient

Updated test scripts automatically check these endpoints:

```bash
cd ~/Code/xor/sktclient

# Test local backend
npm run lcl

# Test production
npm run prd YOUR_TOKEN
```

## Nginx Configuration

After adding health check endpoint, update Nginx config:

```nginx
# Test if backend is reachable
location /dev/aiwm/ws {
    # Regular HTTP request (GET /ws)
    proxy_pass http://api-aiwm/ws;
}

# WebSocket connection (GET /ws/socket.io/)
location /dev/aiwm/ws/ {
    proxy_pass http://api-aiwm-ws/ws/;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # ... other WebSocket config
}
```

**Note:** Location `/dev/aiwm/ws` (without trailing slash) handles regular HTTP GET, while `/dev/aiwm/ws/` (with trailing slash) handles WebSocket upgrade.

## Troubleshooting

### Endpoint returns 404

**Possible causes:**
1. ChatModule not loaded
2. ChatController not registered
3. Backend not started

**Debug:**
```bash
# Check backend logs
pm2 logs core.aiwm.api00 | grep -i "chat"

# Should see:
# [ChatGateway] Chat WebSocket Gateway initialized

# Check routes
curl http://localhost:3305/ | jq .
# Should show service info
```

### Endpoint returns 500

**Possible causes:**
1. Memory/resource issues
2. Service crashed
3. Dependencies failed

**Debug:**
```bash
# Check memory
curl http://localhost:3305/ws/health | jq '.memory'

# Check uptime
curl http://localhost:3305/ws/health | jq '.uptime'

# Check logs for errors
pm2 logs core.aiwm.api00 --err
```

### Through Nginx returns 502

**Possible causes:**
1. Nginx can't reach backend
2. Wrong upstream port
3. Backend crashed

**Debug:**
```bash
# Test direct backend
curl http://localhost:3305/ws

# Check Nginx upstream
sudo nginx -T | grep -A 5 "upstream api-aiwm"

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## API Documentation

These endpoints are documented in Swagger/OpenAPI:

```
http://localhost:3305/api-docs
```

Look for:
- **WebSocket** tag
- `GET /ws` - Service info
- `GET /ws/health` - Health check

## Summary

**Before Nginx config:**
```bash
curl http://localhost:3305/ws
# ✅ Should return JSON with "status": "running"
```

**After Nginx config:**
```bash
curl https://api.x-or.cloud/dev/aiwm/ws
# ✅ Should return same JSON
```

**WebSocket connection:**
```bash
wscat -c wss://api.x-or.cloud/dev/aiwm/ws
# ✅ Should connect and show socket ID
```

This ensures:
1. Backend is running ✅
2. Nginx can reach backend ✅
3. Path routing is correct ✅
4. WebSocket upgrade works ✅
