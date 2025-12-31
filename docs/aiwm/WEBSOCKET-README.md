# WebSocket Chat Documentation

Tài liệu tổng hợp cho hệ thống WebSocket Chat của AIWM.

## 📚 Danh Sách Tài Liệu

### 🎯 Cho Frontend Developers
- **[Frontend Chat Integration](./FRONTEND-CHAT-INTEGRATION.md)** - Hướng dẫn tích hợp WebSocket vào UI
  - Cài đặt và kết nối
  - React/Vue component examples
  - Events reference đầy đủ
  - Best practices
  - Troubleshooting

### 🔧 Cho Backend Developers
- **[Agent WebSocket Integration](./AGENT-WEBSOCKET-INTEGRATION.md)** - Hướng dẫn agent kết nối WebSocket
  - Agent authentication
  - Auto-join conversation
  - Message handling
  - Production deployment

- **[Chat WebSocket Architecture](./CHAT-WEBSOCKET-ARCHITECTURE.md)** - Kiến trúc hệ thống
  - System design
  - Data flow
  - Scaling strategy
  - Redis Pub/Sub

### 🐛 Cho DevOps/Debug
- **[WebSocket Debug Logs](./WEBSOCKET-DEBUG-LOGS.md)** - Hướng dẫn debug chi tiết
  - Log format và prefixes
  - Debugging scenarios
  - Common problems & solutions
  - Filtering commands

- **[WebSocket Log Cheatsheet](./WEBSOCKET-LOG-CHEATSHEET.md)** - Quick reference
  - Critical checks
  - Common grep commands
  - Debugging patterns
  - Red flags

### 🚀 Cho Deploy/Infrastructure
- **[Nginx Load Balancer Config](./NGINX-WEBSOCKET-LOADBALANCER.md)** - Nginx configuration
  - Sticky sessions
  - WebSocket headers
  - Load balancing strategy
  - Health checks

## 🎯 Quick Start

### Frontend Developer
1. Đọc [FRONTEND-CHAT-INTEGRATION.md](./FRONTEND-CHAT-INTEGRATION.md)
2. Copy React/Vue component example
3. Implement theo flow: Connect → Join → Send/Receive
4. Test với browser console trước

### Backend Developer (Agent)
1. Đọc [AGENT-WEBSOCKET-INTEGRATION.md](./AGENT-WEBSOCKET-INTEGRATION.md)
2. Copy test client từ `/sktclient/`
3. Test local với `npm run lcl`
4. Deploy agent lên production

### DevOps/SysAdmin
1. Đọc [NGINX-WEBSOCKET-LOADBALANCER.md](./NGINX-WEBSOCKET-LOADBALANCER.md)
2. Configure Nginx với sticky sessions
3. Setup Redis for Pub/Sub
4. Monitor logs theo [WEBSOCKET-LOG-CHEATSHEET.md](./WEBSOCKET-LOG-CHEATSHEET.md)

## 🔑 Key Concepts

### URLs
- **Development:** `http://localhost:3305/ws`
- **Production:** `https://api.x-or.cloud/ws`

### Authentication
```typescript
const socket = io(WS_URL, {
  auth: { token: JWT_TOKEN }, // From login API
  transports: ['websocket'],
});
```

### Basic Flow
```
1. User/Agent connects → emit 'connect' event
2. Join conversation → emit 'conversation:join'
3. Send message → emit 'message:send'
4. Receive message → on 'message:new'
5. Leave → emit 'conversation:leave'
6. Disconnect → emit 'disconnect'
```

### Events Summary

**Client → Server:**
- `conversation:join` - Join a conversation
- `conversation:leave` - Leave conversation
- `message:send` - Send message
- `typing:start` - Start typing
- `typing:stop` - Stop typing

**Server → Client:**
- `connect` - Connected successfully
- `disconnect` - Disconnected
- `message:new` - New message received
- `message:sent` - Message sent confirmation
- `presence:update` - User/Agent online/offline
- `typing:start` - Someone is typing
- `typing:stop` - Stopped typing

## 🐛 Troubleshooting Quick Links

**Connection Issues:**
- ❌ Authentication error → Check JWT token valid
- ❌ 404 Not Found → Check URL has `/ws` at end
- ❌ 502 Bad Gateway → Backend not running
- ❌ Frequent disconnects → Network issues or Nginx timeout

**Message Not Received:**
1. Check [WEBSOCKET-LOG-CHEATSHEET.md](./WEBSOCKET-LOG-CHEATSHEET.md) → Look for `roomSize`
2. If `roomSize=0` → Nobody in room!
3. If `roomSize=1` → Only sender, recipient not joined
4. Check Redis adapter connected: `[REDIS-ADAPTER] ✅`

**Performance Issues:**
- Too many messages → Use virtual scrolling
- Memory leak → Check cleanup `useEffect` return
- Lag → Check network latency, consider pagination

## 📊 Architecture Overview

```
Frontend (React/Vue)
    ↓ Socket.IO Client
Nginx Load Balancer (Sticky Sessions)
    ↓
AIWM Instances (3x) ← Redis Pub/Sub → Sync events
    ↓
MongoDB (Messages/Conversations)
```

### Key Features
- ✅ **Horizontal Scaling** - Multiple instances with Redis
- ✅ **Sticky Sessions** - Nginx ip_hash for WebSocket
- ✅ **Auto-Reconnection** - Client reconnects automatically
- ✅ **JWT Auth** - Secure authentication
- ✅ **Real-time** - WebSocket only (no polling)
- ✅ **Presence** - Online/offline tracking
- ✅ **Typing Indicators** - Real-time typing status

## 🔬 Testing Tools

### Browser Console Test
```javascript
const socket = io('https://api.x-or.cloud/ws', {
  auth: { token: 'YOUR_TOKEN' },
  transports: ['websocket'],
});

socket.on('connect', () => console.log('✅ Connected'));
socket.on('message:new', (msg) => console.log('📨', msg));

socket.emit('conversation:join', { conversationId: 'XXX' });
socket.emit('message:send', { role: 'user', content: 'Test' });
```

### Test Clients
- **Local:** `cd /sktclient && npm run lcl`
- **Production:** `cd /sktclient && npm run prd YOUR_TOKEN`
- **Agent Demo:** `cd /sktclient && npm run demo`

### Monitoring
```bash
# Watch WebSocket events
pm2 logs | grep -E "\[WS-"

# Check Redis adapter
pm2 logs | grep REDIS-ADAPTER

# Monitor room sizes
pm2 logs | grep roomSize

# Track specific conversation
pm2 logs | grep "conversationId=XXX"
```

## 📞 Support & Resources

### Documentation
- API Swagger: `https://api.x-or.cloud/api-docs`
- Postman Collection: `/docs/postman/`
- Code Examples: `/services/aiwm/src/modules/chat/`

### Debug Tools
- Log Cheatsheet: [WEBSOCKET-LOG-CHEATSHEET.md](./WEBSOCKET-LOG-CHEATSHEET.md)
- Debug Guide: [WEBSOCKET-DEBUG-LOGS.md](./WEBSOCKET-DEBUG-LOGS.md)

### Contact
- Backend Team: For WebSocket API questions
- Frontend Team: For UI integration help
- DevOps Team: For infrastructure/deployment

## 🎓 Learning Path

### Beginner
1. Read [FRONTEND-CHAT-INTEGRATION.md](./FRONTEND-CHAT-INTEGRATION.md) basic section
2. Copy React/Vue example
3. Test in browser console
4. Implement simple chat UI

### Intermediate
1. Understand events reference completely
2. Implement typing indicators
3. Handle reconnection gracefully
4. Add offline message queue

### Advanced
1. Read [CHAT-WEBSOCKET-ARCHITECTURE.md](./CHAT-WEBSOCKET-ARCHITECTURE.md)
2. Understand Redis Pub/Sub mechanism
3. Optimize performance with virtual scrolling
4. Implement custom protocols on top of Socket.IO

## 🔄 Update History

- **2025-12-30**: Enhanced debug logging with `[PREFIX]` format
- **2025-12-30**: Added Redis adapter status indicators
- **2025-12-30**: Created comprehensive frontend integration guide
- **2025-12-30**: Fixed `roomSize` access error with safe checks
- **2025-12-30**: WebSocket path changed from `/chat` to `/ws`

---

**Note:** Tất cả tài liệu trong thư mục này đều được cập nhật đồng bộ. Nếu có thay đổi về API hoặc architecture, vui lòng update tất cả các file liên quan.
