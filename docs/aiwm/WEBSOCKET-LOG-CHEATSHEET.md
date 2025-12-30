# WebSocket Logs Quick Reference

## 🎯 Critical Checks

### 1. Redis Adapter Status (First thing to check!)
```
✅ GOOD:
[REDIS-ADAPTER] ✅ Redis adapter connected successfully
[REDIS-ADAPTER] ✅ Socket.IO using Redis adapter for horizontal scaling

❌ BAD:
[REDIS-ADAPTER] ❌ Failed to connect: ECONNREFUSED
[REDIS-ADAPTER] ⚠️  Falling back to in-memory adapter
```

### 2. Room Size (Second thing to check!)
```
✅ GOOD:
[WS-JOIN] user joined | conversationId=XXX | roomSize=2  ← Agent + User

❌ BAD:
[WS-BROADCAST] Broadcasting | roomSize=0  ← Nobody in room!
[WS-BROADCAST] Broadcasting | roomSize=1  ← Only sender, no recipient!
```

## 📋 Log Prefixes Quick Reference

| Prefix | What | When |
|--------|------|------|
| `[REDIS-ADAPTER]` | Redis Pub/Sub status | Startup |
| `[WS-CONNECT]` | Client connected | Agent/User connects |
| `[WS-DISCONNECT]` | Client disconnected | Agent/User disconnects |
| `[WS-JOIN]` | Joined conversation | Join room event |
| `[WS-LEAVE]` | Left conversation | Leave room event |
| `[WS-MSG-SEND]` | Message created | Message sent |
| `[WS-BROADCAST]` | Broadcasting to room | Sending to others |

## 🔍 Common Grep Commands

```bash
# Quick health check
pm2 logs | grep -E "\[REDIS-ADAPTER\].*✅|\[WS-BROADCAST\].*roomSize"

# Track specific conversation
pm2 logs | grep "conversationId=695247765"

# See who's in the room
pm2 logs | grep "\[WS-JOIN\]" | tail -10

# Check broadcast status
pm2 logs | grep "\[WS-BROADCAST\]" | tail -10

# Monitor connections
pm2 logs | grep -E "\[WS-CONNECT\]|\[WS-DISCONNECT\]"

# Full chat flow for debugging
pm2 logs | grep -E "\[WS-JOIN\]|\[WS-MSG-SEND\]|\[WS-BROADCAST\]"
```

## 🐛 Debugging Patterns

### Pattern 1: User message not reaching Agent

**Look for:**
```
[WS-MSG-SEND] ... | userId=XXX | content="..."
[WS-BROADCAST] ... | roomSize=1  ← Problem here!
```

**Root cause:** Agent not in room

**Fix:** Check agent joined same conversationId

---

### Pattern 2: Messages work then stop

**Look for:**
```
[WS-DISCONNECT] Agent disconnected | agentId=XXX
[WS-CONNECT] Agent connected | socketId=YYY  ← New socket!
```

**Root cause:** Agent reconnecting to different instance

**Fix:** Check Redis adapter working, check network stability

---

### Pattern 3: Nothing works

**Look for:**
```
[REDIS-ADAPTER] ❌ Failed to connect
```

**Root cause:** Redis not accessible

**Fix:**
1. Check Redis: `redis-cli -h 172.16.2.100 ping`
2. Check .env has REDIS_URL
3. Restart all instances

---

## 📊 Expected Log Flow

### Successful Agent → User Message

```
1. [WS-CONNECT] Agent connected | agentId=XXX
2. [WS-JOIN] Agent auto-joined | conversationId=YYY | roomSize=1
3. [WS-CONNECT] User connected | userId=ZZZ
4. [WS-JOIN] user joined | conversationId=YYY | roomSize=2  ← Both in room!
5. [WS-MSG-SEND] Message created | agentId=XXX | content="Hello..."
6. [WS-BROADCAST] Broadcasting | roomSize=2 | msgId=AAA  ← Will reach user!
```

### Successful User → Agent Message

```
1. [WS-MSG-SEND] Message created | userId=ZZZ | content="Hi..."
2. [WS-BROADCAST] Broadcasting | roomSize=2 | msgId=BBB  ← Will reach agent!
```

## 🎨 Log Color Coding (Mental Model)

- `✅` = Good news, everything working
- `⚠️` = Warning, might cause problems
- `❌` = Error, definitely broken
- `roomSize=0` = 🔴 Nobody listening
- `roomSize=1` = 🟡 Only sender
- `roomSize=2+` = 🟢 Has recipients

## 💡 Pro Tips

1. **Always check Redis first** - If Redis adapter fails, nothing else matters
2. **Watch roomSize** - It tells you exactly who's listening
3. **Track conversationId** - Both participants must join same ID
4. **Look for disconnects** - Frequent reconnects = network/instance issues
5. **Use grep -E** for multiple patterns in one command

## 🚨 Red Flags

| Log Pattern | Problem | Severity |
|-------------|---------|----------|
| Redis adapter ❌ | No cross-instance sync | 🔴 Critical |
| roomSize=0 when broadcasting | Nobody listening | 🔴 Critical |
| Frequent disconnects | Unstable connection | 🟡 High |
| roomSize=1 when 2 expected | Participant missing | 🟡 High |
| No [WS-BROADCAST] after [WS-MSG-SEND] | Message not sent | 🔴 Critical |

## 📞 Quick Diagnosis

**Problem:** Agent not receiving user messages

```bash
# Step 1: Check Redis
pm2 logs | grep REDIS-ADAPTER | tail -5

# Step 2: Check both joined same conversation
pm2 logs | grep "WS-JOIN.*conversationId" | tail -10

# Step 3: Check room size when broadcasting
pm2 logs | grep "WS-BROADCAST.*roomSize" | tail -5

# Step 4: Check for disconnects
pm2 logs | grep "WS-DISCONNECT.*agent" | tail -10
```

One of these will show the problem!
