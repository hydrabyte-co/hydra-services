# WebSocket Path Change: /chat → /ws

## Change Summary

Changed WebSocket namespace from `/chat` to `/ws` for better semantics and future extensibility.

## Rationale

- **`/ws`** = Generic WebSocket endpoint, can handle multiple real-time features
- **`/chat`** = Too specific, limits to chat only
- **Future-proof**: Can add other WebSocket features (notifications, presence, etc.) under `/ws`

## Changes Made

### Backend
**File:** `services/aiwm/src/modules/chat/chat.gateway.ts`

```typescript
// Before:
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})

// After:
@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: '*', credentials: true },
})
```

### Nginx Configuration
**File:** `/etc/nginx/sites-available/api.x-or.cloud`

```nginx
# Before:
location /dev/aiwm/chat/ {
    proxy_pass http://api-aiwm-ws/chat/;
    # ... WebSocket config
}

# After:
location /dev/aiwm/ws/ {
    proxy_pass http://api-aiwm-ws/ws/;

    # WebSocket upgrade headers
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Long timeout (7 days)
    proxy_connect_timeout 604800s;
    proxy_send_timeout 604800s;
    proxy_read_timeout 604800s;

    # Disable buffering
    proxy_buffering off;
    proxy_cache off;
}
```

### Client Code

```javascript
// Before:
const socket = io('https://api.x-or.cloud/dev/aiwm/chat', {
  auth: { token: 'YOUR_TOKEN' }
});

// After:
const socket = io('https://api.x-or.cloud/dev/aiwm/ws', {
  auth: { token: 'YOUR_TOKEN' }
});
```

## Deployment Steps

### 1. Build Backend
```bash
cd /Users/dzung/Code/hydra-byte/hydra-services
npx nx build aiwm
```

### 2. Upload to Server
```bash
scp -r dist/services/aiwm root@YOUR_SERVER:/usr/workspace/repos/core-service/dist/services/
```

### 3. Update Nginx Config on Server
```bash
# Edit config
sudo nano /etc/nginx/sites-available/api.x-or.cloud

# Change:
# location /dev/aiwm/chat/ {
#     proxy_pass http://api-aiwm-ws/chat/;

# To:
# location /dev/aiwm/ws/ {
#     proxy_pass http://api-aiwm-ws/ws/;

# Test config
sudo nginx -t

# Reload
sudo nginx -s reload
```

### 4. Restart Backend Instances
```bash
pm2 restart core.aiwm.api00
pm2 restart core.aiwm.api01
pm2 restart core.aiwm.api02
```

### 5. Verify Logs
```bash
# Should see:
pm2 logs core.aiwm.api00 --lines 50 | grep "Chat WebSocket Gateway initialized"

# Nginx logs:
sudo tail -f /var/log/nginx/api.x-or.cloud/aiwm-ws-chat.access.log
```

### 6. Test Connection
```bash
cd ~/Code/xor/sktclient

# Test production
npm run test:prd -- YOUR_JWT_TOKEN

# Should see:
# ✅ WebSocket CONNECTED successfully!
```

## Updated URLs

| Component | Old URL | New URL |
|-----------|---------|---------|
| **Production** | `wss://api.x-or.cloud/dev/aiwm/chat` | `wss://api.x-or.cloud/dev/aiwm/ws` |
| **Backend Direct** | `ws://localhost:3350/chat` | `ws://localhost:3350/ws` |
| **Socket.IO Path** | `/chat/socket.io/` | `/ws/socket.io/` |

## Test Cases

### ✅ Should Work
```bash
# 1. Direct backend
curl http://localhost:3350/ws/socket.io/?EIO=4&transport=polling

# 2. Through Nginx
curl https://api.x-or.cloud/dev/aiwm/ws/socket.io/?EIO=4&transport=polling

# 3. WebSocket client
wscat -c "wss://api.x-or.cloud/dev/aiwm/ws" -H "Authorization: Bearer TOKEN"
```

### ❌ Should 404
```bash
# Old paths should no longer work
curl https://api.x-or.cloud/dev/aiwm/chat/socket.io/  # 404
```

## Breaking Changes

**All existing WebSocket clients must update their connection URL:**

```diff
- io('https://api.x-or.cloud/dev/aiwm/chat', { auth: { token } })
+ io('https://api.x-or.cloud/dev/aiwm/ws', { auth: { token } })
```

## Rollback Plan

If needed to rollback:

1. **Revert Backend:**
   ```typescript
   namespace: '/chat'  // Change back in chat.gateway.ts
   ```

2. **Rebuild and Deploy**

3. **Revert Nginx:**
   ```nginx
   location /dev/aiwm/chat/ {
       proxy_pass http://api-aiwm-ws/chat/;
   ```

4. **Reload Nginx + Restart PM2**

## Related Documentation

- Agent Integration Guide: `docs/aiwm/AGENT-WEBSOCKET-INTEGRATION.md` (needs update)
- Nginx Config: `docs/aiwm/NGINX-LB-WEBSOCKET-CONFIG.md` (needs update)
- JWT Fix: `docs/aiwm/WEBSOCKET-JWT-FIX.md`

## Checklist

- [x] Backend code updated (`chat.gateway.ts`)
- [x] Backend built successfully
- [ ] Nginx config updated on server
- [ ] Backend deployed to server
- [ ] PM2 instances restarted
- [ ] Connection tested and working
- [ ] Documentation updated
- [ ] All clients updated to new URL
