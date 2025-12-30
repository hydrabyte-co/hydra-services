# WebSocket Debug Logs Guide

This document explains the enhanced debug logging for WebSocket chat functionality.

## Log Format

All logs follow this format with prefixes for easy filtering:

```
[PREFIX] Description | key1=value1 | key2=value2 | ...
```

## Log Prefixes

### 🔌 Connection Logs

#### `[REDIS-ADAPTER]` - Redis Adapter Status
```
[REDIS-ADAPTER] Connecting to Redis: redis://172.16.2.100:6379
[REDIS-ADAPTER] ✅ Redis adapter connected successfully
[REDIS-ADAPTER] WebSocket events will be synced across all instances
[REDIS-ADAPTER] ✅ Socket.IO using Redis adapter for horizontal scaling
```

**What to check:**
- ✅ Success: Redis connected, load balancer will work
- ❌ Error: Redis failed, WebSocket won't work across instances
- ⚠️ Warning: Using in-memory adapter, only 1 instance supported

#### `[WS-CONNECT]` - Client Connection
```
[WS-CONNECT] Agent connected | socketId=abc123 | agentId=69520162...
[WS-CONNECT] User connected | socketId=xyz789 | userId=691eba08...
```

**Fields:**
- `socketId`: Socket.IO connection ID
- `agentId`: Agent ID (for agents)
- `userId`: User ID (for users)

#### `[WS-DISCONNECT]` - Client Disconnection
```
[WS-DISCONNECT] Agent disconnected | socketId=abc123 | agentId=69520162... | conversationId=695247765...
[WS-DISCONNECT] User disconnected | socketId=xyz789 | userId=691eba08... | conversationId=695247765...
```

**What to check:**
- If agent disconnects frequently → check connection stability
- If `conversationId=none` → client wasn't in any conversation

### 💬 Conversation Logs

#### `[WS-JOIN]` - Join Conversation
```
[WS-JOIN] Agent auto-joined | agentId=69520162... | conversationId=695247765... | roomSize=1
[WS-JOIN] user joined | userId=691eba08... | conversationId=695247765... | roomSize=2
```

**Fields:**
- `conversationId`: Conversation ID
- `roomSize`: **Number of clients in room** (critical for debugging!)
  - Should be 2 for agent + user
  - If roomSize=1 when user joins → agent not in room!

#### `[WS-LEAVE]` - Leave Conversation
```
[WS-LEAVE] user left | userId=691eba08... | conversationId=695247765... | roomSize=1
```

### 📨 Message Logs

#### `[WS-MSG-SEND]` - Message Created
```
[WS-MSG-SEND] Message created | msgId=6953840f... | userId=691eba08... | role=user | conversationId=695247765... | content="Hello! How are you?..."
[WS-MSG-SEND] Message created | msgId=695383821... | agentId=69520162... | role=assistant | conversationId=695247765... | content="I'm doing great, th..."
```

**Fields:**
- `msgId`: Message ID
- `userId` or `agentId`: Sender ID
- `role`: `user` | `assistant` | `system`
- `conversationId`: Conversation ID
- `content`: First 20 chars of message (truncated for privacy)

#### `[WS-BROADCAST]` - Broadcasting Message
```
[WS-BROADCAST] Broadcasting to room | room=conversation:695247765... | roomSize=2 | msgId=6953840f...
```

**Critical field:**
- `roomSize`: **Must match expected participants!**
  - If user sends message but `roomSize=1` → agent not in room!
  - If `roomSize=0` → nobody will receive the message!

## Debugging Scenarios

### ✅ Successful Flow (Agent + User Chat)

```
# 1. Agent connects
[REDIS-ADAPTER] ✅ Redis adapter connected successfully
[WS-CONNECT] Agent connected | socketId=abc123 | agentId=69520162...
[WS-JOIN] Agent auto-joined | agentId=69520162... | conversationId=695247765... | roomSize=1

# 2. User connects
[WS-CONNECT] User connected | socketId=xyz789 | userId=691eba08...

# 3. User joins conversation
[WS-JOIN] user joined | userId=691eba08... | conversationId=695247765... | roomSize=2
                                                                           ^^^^^^^^^^^^
                                                                           Both in room!

# 4. User sends message
[WS-MSG-SEND] Message created | msgId=6953840f... | userId=691eba08... | role=user | content="Hello..."
[WS-BROADCAST] Broadcasting to room | room=conversation:695247765... | roomSize=2 | msgId=6953840f...
                                                                         ^^^^^^^^^^^^
                                                                         Will reach agent!

# 5. Agent receives and replies
[WS-MSG-SEND] Message created | msgId=695383821... | agentId=69520162... | role=assistant | content="Hi there..."
[WS-BROADCAST] Broadcasting to room | room=conversation:695247765... | roomSize=2 | msgId=695383821...
                                                                         ^^^^^^^^^^^^
                                                                         Will reach user!
```

### ❌ Problem: Agent Not Receiving Messages

**Symptoms:**
```
# User sends message but agent doesn't receive it
[WS-MSG-SEND] Message created | msgId=6953840f... | userId=691eba08...
[WS-BROADCAST] Broadcasting to room | roomSize=1 | msgId=6953840f...
                                       ^^^^^^^^^^^
                                       Only 1 client in room!
```

**Possible Causes:**

1. **Agent disconnected before user joined**
```
# Agent disconnect
[WS-DISCONNECT] Agent disconnected | socketId=abc123 | agentId=69520162...

# Agent reconnects to different instance (load balancer)
[WS-CONNECT] Agent connected | socketId=abc456 | agentId=69520162...
[WS-JOIN] Agent auto-joined | conversationId=695247765... | roomSize=1

# User still on old instance
[WS-JOIN] user joined | conversationId=695247765... | roomSize=1
                                                       ^^^^^^^^^^^
                                                       Different instance!
```

**Solution:** Check Redis adapter is working!

2. **Agent not joining room properly**
```
# Agent connects but doesn't join
[WS-CONNECT] Agent connected | socketId=abc123 | agentId=69520162...
# Missing: [WS-JOIN] Agent auto-joined...

# User joins
[WS-JOIN] user joined | conversationId=695247765... | roomSize=1
```

**Solution:** Check agent auto-join logic.

### ❌ Problem: Redis Adapter Not Working

**Symptoms:**
```
[REDIS-ADAPTER] ❌ Failed to connect: ECONNREFUSED
[REDIS-ADAPTER] ⚠️  Falling back to in-memory adapter (single instance only)
[REDIS-ADAPTER] ⚠️  WebSocket will NOT work properly with load balancer!
```

**Impact:**
- Agent connects to instance A
- User connects to instance B
- Messages don't cross instances!

**Solution:**
1. Check Redis is running: `redis-cli -h 172.16.2.100 ping`
2. Check REDIS_URL in .env
3. Restart all instances with correct .env

## Filtering Logs

Use grep to filter specific events:

```bash
# All WebSocket events
pm2 logs core.aiwm.api00 | grep "\[WS-"

# Connection events only
pm2 logs core.aiwm.api00 | grep "\[WS-CONNECT\]\|\[WS-DISCONNECT\]"

# Join/Leave events
pm2 logs core.aiwm.api00 | grep "\[WS-JOIN\]\|\[WS-LEAVE\]"

# Message events
pm2 logs core.aiwm.api00 | grep "\[WS-MSG\]\|\[WS-BROADCAST\]"

# Redis adapter status
pm2 logs core.aiwm.api00 | grep "\[REDIS-ADAPTER\]"

# Specific conversation
pm2 logs core.aiwm.api00 | grep "conversationId=695247765"

# Specific user/agent
pm2 logs core.aiwm.api00 | grep "userId=691eba08"
pm2 logs core.aiwm.api00 | grep "agentId=69520162"
```

## Key Metrics to Monitor

1. **Room Size After Join** → Should match expected participants
2. **Room Size When Broadcasting** → Must be > 0 for messages to deliver
3. **Redis Adapter Status** → Must be ✅ for load balancer to work
4. **Disconnect/Reconnect Frequency** → High frequency indicates connection issues

## Troubleshooting Checklist

When messages aren't being delivered:

- [ ] Check Redis adapter connected successfully
- [ ] Check both agent and user joined same `conversationId`
- [ ] Check `roomSize` when broadcasting (should be 2 for agent+user)
- [ ] Check agent not disconnecting/reconnecting frequently
- [ ] Check all 3 instances using same Redis server
- [ ] Check message actually created (has `msgId`)
- [ ] Check broadcast log appears after message created
