# Nginx Configuration for WebSocket Load Balancing

## Overview

When running multiple AIWM instances behind Nginx, WebSocket connections require special configuration to ensure:
1. **Sticky Sessions**: Same client always connects to same backend instance
2. **WebSocket Upgrade**: Proper HTTP → WebSocket protocol upgrade
3. **Connection Persistence**: Long-lived connections don't timeout

---

## Required Nginx Configuration

### 1. Complete Nginx Config Example

```nginx
# Upstream definition for AIWM instances
upstream aiwm_backend {
    # IP Hash for sticky sessions - same client IP → same backend
    ip_hash;

    # Your 3 AIWM instances
    server 127.0.0.1:3003 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3004 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3005 max_fails=3 fail_timeout=30s;

    # Keep connections alive to backend
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name api.x-or.cloud;

    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # WebSocket-specific location for /dev/aiwm/chat
    location /dev/aiwm/chat {
        proxy_pass http://aiwm_backend;

        # WebSocket upgrade headers (CRITICAL)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Preserve client information
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings for long-lived connections
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;

        # Buffering settings (disable for WebSocket)
        proxy_buffering off;
        proxy_cache off;

        # Enable keepalive to backend
        proxy_set_header Connection "";
    }

    # Regular HTTP/REST API endpoints for AIWM
    location /dev/aiwm {
        proxy_pass http://aiwm_backend;

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Standard timeouts (shorter than WebSocket)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## Critical Configuration Points

### 1. **Sticky Sessions with `ip_hash`**

```nginx
upstream aiwm_backend {
    ip_hash;  # CRITICAL: Same client IP → same backend
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
    server 127.0.0.1:3005;
}
```

**Why Needed:**
- WebSocket connections are stateful
- Socket.IO rooms and session data are stored in-memory on each instance
- Without sticky sessions, reconnections might go to different instances
- This would lose conversation context and socket room memberships

**Alternatives to `ip_hash`:**
```nginx
# Option 2: Hash based on custom header (better for clients behind NAT)
upstream aiwm_backend {
    hash $http_x_session_id consistent;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
    server 127.0.0.1:3005;
}

# Option 3: Cookie-based sticky sessions (requires nginx-plus or lua)
# sticky cookie srv_id expires=1h domain=.x-or.cloud path=/;
```

### 2. **WebSocket Upgrade Headers**

```nginx
location /dev/aiwm/chat {
    # These 3 lines are MANDATORY for WebSocket
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

**What This Does:**
- `proxy_http_version 1.1`: WebSocket requires HTTP/1.1 (not HTTP/2)
- `Upgrade $http_upgrade`: Pass WebSocket upgrade request to backend
- `Connection "upgrade"`: Tell backend to upgrade connection

**Without these headers:**
- WebSocket handshake will fail
- Client gets 400 Bad Request or connection timeout

### 3. **Timeout Configuration**

```nginx
# For WebSocket connections (long-lived)
proxy_connect_timeout 7d;  # 7 days
proxy_send_timeout 7d;
proxy_read_timeout 7d;

# For regular HTTP (short-lived)
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

**Why Long Timeouts:**
- WebSocket connections can stay open for hours/days
- Default Nginx timeout is 60s - will kill WebSocket connections
- Set to 7 days (or your desired max session time)

### 4. **Disable Buffering**

```nginx
proxy_buffering off;
proxy_cache off;
```

**Why:**
- WebSocket is bidirectional real-time protocol
- Buffering adds latency and breaks real-time communication
- Caching makes no sense for WebSocket data

---

## Testing the Configuration

### 1. Test Nginx Config Syntax
```bash
sudo nginx -t
```

### 2. Reload Nginx
```bash
sudo nginx -s reload
# or
sudo systemctl reload nginx
```

### 3. Test WebSocket Connection
```bash
# Test with wscat
npm install -g wscat

wscat -c "wss://api.x-or.cloud/dev/aiwm/chat" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should see:
# Connected (press CTRL+C to quit)
```

### 4. Test Sticky Sessions
```bash
# Connect multiple times from same IP
# Check Nginx logs to verify same backend is used

# View access logs
sudo tail -f /var/log/nginx/access.log

# Should show consistent upstream server for same client IP
```

### 5. Monitor Backend Distribution
```bash
# Check which backend each connection goes to
sudo tail -f /var/log/nginx/access.log | grep "dev/aiwm/chat"

# Add to nginx.conf to log upstream server:
log_format upstreamlog '$remote_addr - $upstream_addr [$time_local] '
                       '"$request" $status';
access_log /var/log/nginx/access.log upstreamlog;
```

---

## Common Issues and Solutions

### Issue 1: WebSocket Connection Drops After 60 Seconds
**Cause:** Default Nginx timeout (60s)
**Solution:** Increase timeouts as shown above (7d for WebSocket)

### Issue 2: Client Connects to Different Backend Each Time
**Cause:** Missing sticky sessions
**Solution:** Add `ip_hash` to upstream block

### Issue 3: 400 Bad Request on WebSocket Handshake
**Cause:** Missing upgrade headers
**Solution:** Add WebSocket upgrade headers (Upgrade, Connection)

### Issue 4: Behind Corporate Proxy/NAT - ip_hash Doesn't Work
**Cause:** All clients appear to come from same IP
**Solution:** Use hash based on custom header:
```nginx
upstream aiwm_backend {
    hash $http_x_session_id consistent;
    server 127.0.0.1:3003;
}
```

Then client must send consistent X-Session-Id header.

### Issue 5: Connection Works But Events Not Received
**Cause:** Buffering is enabled
**Solution:** Add `proxy_buffering off;`

---

## Advanced: Redis Adapter for True Horizontal Scaling

If you need to scale beyond sticky sessions (clients can connect to any instance), use Redis adapter:

### 1. Install Redis Adapter in AIWM

```bash
cd services/aiwm
npm install @socket.io/redis-adapter redis
```

### 2. Update Chat Gateway

```typescript
// services/aiwm/src/modules/chat/chat.gateway.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

async onModuleInit() {
  // Setup Redis adapter
  const pubClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  this.server.adapter(createAdapter(pubClient, subClient));

  this.logger.log('Socket.IO Redis adapter enabled for horizontal scaling');
}
```

### 3. Remove ip_hash from Nginx

```nginx
upstream aiwm_backend {
    # No ip_hash needed with Redis adapter
    # Round-robin load balancing works fine
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
    server 127.0.0.1:3005;
}
```

**Benefits:**
- True horizontal scaling - any instance can handle any client
- Better load distribution
- More resilient to instance failures

**Trade-offs:**
- Requires Redis infrastructure
- Slightly higher latency (network hop to Redis)
- More complex setup

---

## Recommended Configuration for Production

### Current Setup (Without Redis):
```nginx
upstream aiwm_backend {
    ip_hash;  # Sticky sessions
    server 127.0.0.1:3003 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3004 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3005 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name api.x-or.cloud;

    location /dev/aiwm/chat {
        proxy_pass http://aiwm_backend;

        # WebSocket essentials
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts (7 days)
        proxy_connect_timeout 604800s;
        proxy_send_timeout 604800s;
        proxy_read_timeout 604800s;

        # Disable buffering
        proxy_buffering off;
        proxy_cache off;
    }
}
```

This is the **minimum required configuration** for your setup to work correctly.

---

## Health Check Endpoints

Add health check endpoints for monitoring:

```nginx
location /dev/aiwm/health {
    proxy_pass http://aiwm_backend;
    access_log off;  # Don't log health checks
}
```

Then monitor with:
```bash
# Check if all backends are healthy
for port in 3003 3004 3005; do
  echo "Instance :$port"
  curl -s "http://localhost:$port/health" | jq .
done
```

---

## Summary Checklist

✅ **Must Have (Minimum):**
- [ ] `ip_hash` in upstream block (sticky sessions)
- [ ] `proxy_http_version 1.1`
- [ ] `proxy_set_header Upgrade $http_upgrade`
- [ ] `proxy_set_header Connection "upgrade"`
- [ ] Long timeouts (7d for WebSocket)
- [ ] `proxy_buffering off`

✅ **Recommended:**
- [ ] `max_fails` and `fail_timeout` for backend health
- [ ] Separate location blocks for WebSocket vs REST API
- [ ] Health check endpoints
- [ ] Access logging with upstream server tracking

✅ **Optional (Advanced):**
- [ ] Redis adapter for true horizontal scaling
- [ ] Custom session hash instead of ip_hash
- [ ] Connection rate limiting
- [ ] WebSocket-specific error pages

---

## Support

If issues persist:
1. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
2. Check AIWM logs: `pm2 logs aiwm`
3. Test direct connection to instance (bypass Nginx): `wscat -c ws://localhost:3003/chat`
4. Verify SSL certificates are valid
5. Check firewall rules for WebSocket ports
