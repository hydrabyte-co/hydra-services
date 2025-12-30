# Nginx Load Balancer Configuration for WebSocket

## Current Status
✅ Direct connection to backend works: `ws://localhost:3350/chat`
❌ Connection through Nginx fails: `wss://api.x-or.cloud/dev/aiwm/chat`

## Problem Analysis

### Backend Listening At:
- Path: `/chat`
- Ports: 3350, 3351, 3352

### Client Connecting To:
- URL: `wss://api.x-or.cloud/dev/aiwm/chat`
- Path: `/dev/aiwm/chat`

### Nginx Must Do:
1. Accept request at `/dev/aiwm/chat/`
2. **Rewrite path** from `/dev/aiwm/chat/` to `/chat/`
3. Forward to backend with sticky sessions

## Required Nginx Configuration

### File: `/etc/nginx/conf.d/upstream.conf` (or similar)

```nginx
# Upstream for WebSocket with sticky sessions
upstream api-aiwm-ws {
    ip_hash;  # CRITICAL: Sticky sessions
    server 172.16.2.100:3350 max_fails=3 fail_timeout=30s;
    server 172.16.2.100:3351 max_fails=3 fail_timeout=30s;
    server 172.16.2.100:3352 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

# Upstream for regular HTTP/REST API
upstream api-aiwm {
    server 172.16.2.100:3350 max_fails=3 fail_timeout=30s;
    server 172.16.2.100:3351 max_fails=3 fail_timeout=30s;
    server 172.16.2.100:3352 max_fails=3 fail_timeout=30s;
    keepalive 64;
}
```

### File: `/etc/nginx/sites-available/api.x-or.cloud`

```nginx
server {
    listen 443 ssl http2;
    server_name api.x-or.cloud;

    # SSL config (existing)
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # ========================================
    # WebSocket endpoint - MUST come BEFORE /dev/aiwm/
    # ========================================
    location /dev/aiwm/chat/ {
        access_log /var/log/nginx/api.x-or.cloud/path-dev-aiwm-ws.access.log;
        error_log  /var/log/nginx/api.x-or.cloud/path-dev-aiwm-ws.error.log;

        # CRITICAL: Rewrite /dev/aiwm/chat/ to /chat/
        # The trailing slash in both location and proxy_pass is REQUIRED
        proxy_pass http://api-aiwm-ws/chat/;
        #          ^^^^^^^^^^^^^^^^^^^^^^
        #          This rewrites the path

        # WebSocket upgrade headers (MANDATORY)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Preserve client info
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Long timeouts for WebSocket (7 days = 604800 seconds)
        proxy_connect_timeout 604800s;
        proxy_send_timeout 604800s;
        proxy_read_timeout 604800s;

        # Disable buffering (REQUIRED for real-time)
        proxy_buffering off;
        proxy_cache off;

        # DO NOT include CORS config here
        # Socket.IO handles its own CORS
    }

    # ========================================
    # Regular REST API endpoints
    # ========================================
    location /dev/aiwm/ {
        access_log /var/log/nginx/api.x-or.cloud/path-dev-aiwm-v2.access.log;
        error_log  /var/log/nginx/api.x-or.cloud/path-dev-aiwm-v2.error.log;

        include /etc/nginx/cors-01.conf;
        proxy_pass http://api-aiwm/;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## Critical Points Explained

### 1. Location Order (VERY IMPORTANT)

```nginx
# CORRECT - More specific first
location /dev/aiwm/chat/ { ... }  # ✅ Checked first
location /dev/aiwm/ { ... }       # ✅ Checked second

# WRONG - Less specific first
location /dev/aiwm/ { ... }       # ❌ Matches everything, including /dev/aiwm/chat/
location /dev/aiwm/chat/ { ... }  # ❌ Never reached!
```

### 2. Path Rewriting with Trailing Slash

```nginx
# Example Request: wss://api.x-or.cloud/dev/aiwm/chat/socket.io/?EIO=4&transport=websocket

# Config:
location /dev/aiwm/chat/ {
    proxy_pass http://backend/chat/;
}

# How it works:
# 1. Nginx matches: /dev/aiwm/chat/
# 2. Nginx removes: /dev/aiwm/chat/
# 3. Remaining path: socket.io/?EIO=4&transport=websocket
# 4. Nginx prepends: /chat/
# 5. Final URL: http://backend/chat/socket.io/?EIO=4&transport=websocket
# ✅ Backend receives correct path!
```

**Without trailing slashes:**
```nginx
# WRONG
location /dev/aiwm/chat {
    proxy_pass http://backend/chat;  # No trailing slash
}

# Request: /dev/aiwm/chat/socket.io/
# Proxied: http://backend/chat/socket.io/  (might work)
# BUT inconsistent behavior, avoid this!
```

### 3. Sticky Sessions (ip_hash)

```nginx
upstream api-aiwm-ws {
    ip_hash;  # ✅ REQUIRED
    server 172.16.2.100:3350;
    server 172.16.2.100:3351;
    server 172.16.2.100:3352;
}
```

**Why needed:**
- Socket.IO stores connection state in memory on each instance
- Without sticky sessions, reconnections go to different instances
- Would lose conversation context and room memberships
- With `ip_hash`, same client IP always goes to same backend

### 4. WebSocket Upgrade Headers

```nginx
proxy_http_version 1.1;                      # ✅ REQUIRED
proxy_set_header Upgrade $http_upgrade;      # ✅ REQUIRED
proxy_set_header Connection "upgrade";       # ✅ REQUIRED
```

**Without these:**
- WebSocket handshake fails
- Client gets 400 Bad Request or timeout
- Connection cannot be upgraded from HTTP to WebSocket

### 5. Long Timeouts

```nginx
proxy_connect_timeout 604800s;  # 7 days
proxy_send_timeout 604800s;     # 7 days
proxy_read_timeout 604800s;     # 7 days
```

**Why 7 days:**
- WebSocket connections are long-lived (can last hours/days)
- Default Nginx timeout is 60s → kills WebSocket after 1 minute
- Set to max expected session duration

### 6. Disable Buffering

```nginx
proxy_buffering off;  # ✅ REQUIRED
proxy_cache off;      # ✅ REQUIRED
```

**Why:**
- WebSocket is bidirectional real-time protocol
- Buffering adds latency and breaks real-time updates
- Caching makes no sense for WebSocket data

## Step-by-Step Deployment

### Step 1: Backup Current Config
```bash
sudo cp /etc/nginx/sites-available/api.x-or.cloud \
        /etc/nginx/sites-available/api.x-or.cloud.backup.$(date +%Y%m%d)

sudo cp /etc/nginx/conf.d/upstream.conf \
        /etc/nginx/conf.d/upstream.conf.backup.$(date +%Y%m%d)
```

### Step 2: Update Upstream Config
```bash
sudo nano /etc/nginx/conf.d/upstream.conf

# Add or update:
upstream api-aiwm-ws {
    ip_hash;
    server 172.16.2.100:3350 max_fails=3 fail_timeout=30s;
    server 172.16.2.100:3351 max_fails=3 fail_timeout=30s;
    server 172.16.2.100:3352 max_fails=3 fail_timeout=30s;
    keepalive 64;
}
```

### Step 3: Update Site Config
```bash
sudo nano /etc/nginx/sites-available/api.x-or.cloud

# Add BEFORE the existing "location /dev/aiwm/" block:
    location /dev/aiwm/chat/ {
        access_log /var/log/nginx/api.x-or.cloud/path-dev-aiwm-ws.access.log;
        error_log  /var/log/nginx/api.x-or.cloud/path-dev-aiwm-ws.error.log;

        proxy_pass http://api-aiwm-ws/chat/;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 604800s;
        proxy_send_timeout 604800s;
        proxy_read_timeout 604800s;

        proxy_buffering off;
        proxy_cache off;
    }
```

### Step 4: Test Config Syntax
```bash
sudo nginx -t

# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 5: Reload Nginx
```bash
sudo nginx -s reload

# Or if reload doesn't work:
sudo systemctl reload nginx
```

### Step 6: Check Logs
```bash
# Watch WebSocket access logs
sudo tail -f /var/log/nginx/api.x-or.cloud/path-dev-aiwm-ws.access.log

# Watch error logs
sudo tail -f /var/log/nginx/api.x-or.cloud/path-dev-aiwm-ws.error.log
```

## Testing

### Test 1: Direct Backend (Already Working)
```bash
wscat -c "ws://localhost:3350/chat/socket.io/?EIO=4&transport=websocket" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Connected
```

### Test 2: Through Nginx (Should Work After Config)
```bash
wscat -c "wss://api.x-or.cloud/dev/aiwm/chat/socket.io/?EIO=4&transport=websocket" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Connected
```

### Test 3: Client Connection
```javascript
const io = require('socket.io-client');

const socket = io('wss://api.x-or.cloud/dev/aiwm/chat', {
  auth: { token: 'YOUR_JWT_TOKEN' },
  transports: ['websocket'],
  reconnection: true,
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
});
```

## Troubleshooting

### Issue 1: Still Getting 404
**Check:**
```bash
# Verify location block order
sudo grep -A 5 "location /dev/aiwm" /etc/nginx/sites-available/api.x-or.cloud

# Should show /dev/aiwm/chat/ BEFORE /dev/aiwm/
```

### Issue 2: Still Getting 502
**Check:**
```bash
# Backend running?
curl http://localhost:3350/chat/socket.io/?EIO=4&transport=polling

# Should return JSON with sid
```

### Issue 3: Connection Drops After 60s
**Check timeouts:**
```bash
sudo grep -A 15 "location /dev/aiwm/chat" /etc/nginx/sites-available/api.x-or.cloud | grep timeout

# Should show 604800s (7 days)
```

### Issue 4: Different Backend on Each Reconnect
**Check sticky sessions:**
```bash
sudo grep -B 2 -A 5 "upstream api-aiwm-ws" /etc/nginx/conf.d/upstream.conf

# Should have "ip_hash;" directive
```

### Issue 5: Authentication Still Failing
**Not Nginx issue**, check backend logs:
```bash
pm2 logs core.aiwm.api00 | grep -i "authentication\|jwt\|invalid"
```

## Verification Checklist

After configuration:

- [ ] `sudo nginx -t` passes
- [ ] Nginx reloaded successfully
- [ ] `/dev/aiwm/chat/` location comes BEFORE `/dev/aiwm/`
- [ ] `proxy_pass` has trailing slash: `http://api-aiwm-ws/chat/`
- [ ] Upstream has `ip_hash` for sticky sessions
- [ ] WebSocket upgrade headers present
- [ ] Timeouts set to 604800s (7 days)
- [ ] Buffering disabled
- [ ] wscat test connects successfully
- [ ] Client application connects successfully
- [ ] No CORS errors in browser console
- [ ] Messages send/receive correctly

## Summary

**Key differences from regular HTTP proxying:**

| Aspect | HTTP/REST | WebSocket |
|--------|-----------|-----------|
| Upgrade headers | Not needed | **REQUIRED** |
| Timeouts | 60s | **7 days (604800s)** |
| Buffering | Can enable | **MUST disable** |
| Sticky sessions | Optional | **REQUIRED** (without Redis adapter) |
| Path rewrite | Use rewrite or proxy_pass | **Trailing slash in proxy_pass** |
| CORS | Include cors config | **DO NOT include** (Socket.IO handles it) |

**Most common mistakes:**
1. ❌ Forgetting trailing slash in `proxy_pass`
2. ❌ Wrong location block order
3. ❌ Missing upgrade headers
4. ❌ Short timeouts (60s)
5. ❌ No sticky sessions
6. ❌ Including CORS config for WebSocket endpoint
