# Typing Event Migration Guide

## 📋 Overview

Đã nâng cấp typing events để phân biệt rõ ràng giữa **agent typing** và **user typing**.

## 🔄 Changes Summary

### Backend Changes (AIWM Service)

**File: `services/aiwm/src/modules/chat/chat.gateway.ts`**

- ✅ Cập nhật logic emit events dựa trên sender type
- ✅ Agent typing → emit `agent:typing`
- ✅ User typing → emit `user:typing`
- ✅ Thêm debug log `[WS-TYPING]` để dễ debug
- ✅ Cập nhật documentation trong code comments

### Frontend Documentation Updates

**File: `docs/aiwm/FRONTEND-CHAT-INTEGRATION.md`**

- ✅ Cập nhật Events Reference với event names mới
- ✅ Cập nhật useChat hook với `isAgentTyping` state và `sendTyping()` function
- ✅ Cập nhật React Chat Component với typing indicator
- ✅ Thêm debounce pattern cho typing events
- ✅ Thêm auto-cleanup cho typing timeout

---

## 📤 Client Implementation

### 1. EMIT (Gửi) - KHÔNG ĐỔI

Cả agent và user đều **giữ nguyên** cách emit:

```typescript
// Agent hoặc User emit (KHÔNG ĐỔI)
socket.emit('message:typing', {
  conversationId: '695247765cedd121b96885c6',
  isTyping: true  // hoặc false
});
```

### 2. LISTEN (Nhận) - CÓ THAY ĐỔI

#### 🖥️ User Client (Frontend) - **BẮT BUỘC CẬP NHẬT**

**Trước (cũ):**
```typescript
// ❌ CŨ - Không rõ ràng
socket.on('user:typing', (data) => {
  if (data.type === 'agent') {
    console.log('Agent đang typing');
  }
});
```

**Sau (mới):**
```typescript
// ✅ MỚI - Rõ ràng hơn
socket.on('agent:typing', (data) => {
  console.log('Agent đang typing:', data.isTyping);
  // data = {
  //   type: 'agent',
  //   agentId: '69520162e1abb06986fdcee5',
  //   userId: null,
  //   conversationId: '695247765cedd121b96885c6',
  //   isTyping: true | false,
  //   timestamp: Date
  // }

  if (data.isTyping) {
    showTypingIndicator();
  } else {
    hideTypingIndicator();
  }
});
```

#### 🤖 Agent Client (Agent Service) - **KHÔNG CẦN THAY ĐỔI**

```typescript
// ✅ GIỮ NGUYÊN - User vẫn emit user:typing
socket.on('user:typing', (data) => {
  console.log('User đang typing:', data.isTyping);
  // data = {
  //   type: 'user',
  //   userId: '691eba08517f917943ae1fa1',
  //   agentId: null,
  //   conversationId: '695247765cedd121b96885c6',
  //   isTyping: true | false,
  //   timestamp: Date
  // }
});
```

---

## 🔧 Migration Steps

### For Frontend Developers:

**Step 1: Update event listener name**
```diff
- socket.on('user:typing', (data) => {
+ socket.on('agent:typing', (data) => {
-   if (data.type === 'agent') {
-     setIsTyping(true);
-   }
+   setIsTyping(data.isTyping);
  });
```

**Step 2: Use the updated useChat hook**
```typescript
const {
  connected,
  messages,
  isAgentTyping,  // ← New: Track agent typing state
  sendMessage,
  sendTyping      // ← New: Function to send typing indicator
} = useChat({
  token,
  conversationId,
  onMessage,
  onError
});
```

**Step 3: Implement typing indicator in input handler**
```typescript
const handleInputChange = (e) => {
  setInput(e.target.value);

  // Send typing indicator
  sendTyping(true);

  // Auto-stop after 2s of inactivity
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    sendTyping(false);
  }, 2000);
};
```

**Step 4: Show typing indicator in UI**
```tsx
{isAgentTyping && (
  <div className="typing-indicator">
    🤖 Agent is typing...
  </div>
)}
```

### For Agent Developers:

**No changes needed!** Agent service code remains the same. Just continue listening to `user:typing` event.

---

## 📊 Event Flow Diagram

```
┌─────────────┐                    ┌─────────────┐
│    USER     │                    │    AGENT    │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ emit('message:typing')           │
       │ { isTyping: true }               │
       ├──────────────────────────────────┤
       │                                  │
       │         Backend Gateway          │
       │    (check client.data.type)      │
       │                                  │
       ├──────────────────────────────────┤
       │                                  │
       │                                  │ on('user:typing')
       │                                  │◄─────────────────
       │                                  │ { type: 'user',
       │                                  │   isTyping: true }
       │                                  │
       │                                  │
       │                                  │ emit('message:typing')
       │                                  │ { isTyping: true }
       │                                  ├──────────────────┐
       │                                  │                  │
       │         Backend Gateway          │                  │
       │    (check client.data.type)      │                  │
       │                                  │                  │
       │ on('agent:typing')               │                  │
       │◄─────────────────────────────────┤                  │
       │ { type: 'agent',                 │                  │
       │   isTyping: true }               │                  │
       │                                  │                  │
```

---

## 🐛 Debugging

### Backend Logs

Khi typing event được gửi, bạn sẽ thấy log:

```
[WS-TYPING] agent:typing | conversationId=695247765cedd121b96885c6 | isTyping=true | agentId=69520162e1abb06986fdcee5
```

hoặc

```
[WS-TYPING] user:typing | conversationId=695247765cedd121b96885c6 | isTyping=true | userId=691eba08517f917943ae1fa1
```

### Grep Commands

```bash
# Xem tất cả typing events
grep -E "\[WS-TYPING\]" logs/*.log

# Xem chỉ agent typing
grep -E "\[WS-TYPING\] agent:typing" logs/*.log

# Xem chỉ user typing
grep -E "\[WS-TYPING\] user:typing" logs/*.log

# Theo dõi real-time
tail -f logs/*.log | grep -E "\[WS-TYPING\]"
```

---

## ✅ Checklist

### Backend Team:
- [x] Cập nhật chat.gateway.ts với logic phân biệt event
- [x] Thêm debug logging cho typing events
- [x] Build thành công
- [ ] Deploy lên production
- [ ] Test với agent và user client

### Frontend Team:
- [ ] Đổi event listener từ `user:typing` → `agent:typing`
- [ ] Sử dụng `isAgentTyping` từ useChat hook
- [ ] Implement `sendTyping()` trong input handler
- [ ] Thêm debounce pattern (2s timeout)
- [ ] Test typing indicator hiển thị đúng
- [ ] Verify typing indicator tắt khi nhận message

### Agent Service Team:
- [ ] Verify agent vẫn nhận được `user:typing` event
- [ ] Test emit `message:typing` từ agent
- [ ] Verify user nhận được `agent:typing` event

---

## 📚 Related Documentation

- [FRONTEND-CHAT-INTEGRATION.md](./FRONTEND-CHAT-INTEGRATION.md) - Complete frontend integration guide
- [WEBSOCKET-DEBUG-LOGS.md](./WEBSOCKET-DEBUG-LOGS.md) - Debug logging guide
- [WEBSOCKET-LOG-CHEATSHEET.md](./WEBSOCKET-LOG-CHEATSHEET.md) - Quick reference

---

## ❓ FAQ

**Q: Tại sao phải tách thành 2 events riêng?**

A: Để frontend code rõ ràng hơn. Thay vì phải check `data.type === 'agent'`, bây giờ frontend chỉ cần listen đúng event `agent:typing`.

**Q: Agent service có cần thay đổi code không?**

A: Không! Agent service giữ nguyên. Vẫn emit `message:typing` và listen `user:typing`.

**Q: Nếu tôi không cập nhật frontend thì sao?**

A: Typing indicator sẽ không hoạt động. Frontend sẽ không nhận được typing events từ agent vì đang listen sai event name.

**Q: Làm sao biết backend đã deploy chưa?**

A: Gửi typing event và check logs. Nếu thấy log `[WS-TYPING] agent:typing` nghĩa là đã deploy xong.

---

## 📅 Timeline

- **2026-01-07**: Backend nâng cấp hoàn tất
- **TBD**: Frontend cập nhật code
- **TBD**: Testing và verification
- **TBD**: Production rollout

---

## 🆘 Support

Nếu có vấn đề khi migration, liên hệ:
- Backend team: Check logs với grep `[WS-TYPING]`
- Frontend team: Check browser console có nhận được `agent:typing` events không
- Agent service team: Check có emit `message:typing` thành công không
