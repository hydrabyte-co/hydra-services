# WebSocket Chat - Quick Start (Frontend)

Hướng dẫn nhanh 5 phút để tích hợp chat vào frontend.

## 🚀 3 Bước Cơ Bản

### Bước 1: Cài Đặt

```bash
npm install socket.io-client
```

### Bước 2: Kết Nối

```typescript
import { io } from 'socket.io-client';

// Get token from login
const token = localStorage.getItem('accessToken');

// Connect
const socket = io('https://api.x-or.cloud/ws', {
  auth: { token },
  transports: ['websocket'],
});

// Listen for connection
socket.on('connect', () => {
  console.log('✅ Connected!');
});
```

### Bước 3: Join & Chat

```typescript
// Join conversation
socket.emit('conversation:join',
  { conversationId: 'YOUR_CONVERSATION_ID' },
  (response) => {
    if (response.success) {
      console.log('✅ Joined conversation');
    }
  }
);

// Listen for messages
socket.on('message:new', (message) => {
  console.log('📨 New message:', message.content);
  // Display in UI
});

// Send message
const sendMessage = (text: string) => {
  socket.emit('message:send',
    { role: 'user', content: text },
    (response) => {
      if (response.success) {
        console.log('✅ Sent!');
      }
    }
  );
};
```

---

## 📱 Copy-Paste React Component

```tsx
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export const Chat = ({ conversationId, token }: { conversationId: string, token: string }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const s = io('https://api.x-or.cloud/ws', {
      auth: { token },
      transports: ['websocket'],
    });

    s.on('connect', () => {
      console.log('✅ Connected');
      s.emit('conversation:join', { conversationId });
    });

    s.on('message:new', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    setSocket(s);

    return () => { s.disconnect(); };
  }, [token, conversationId]);

  const send = () => {
    if (!input.trim() || !socket) return;
    socket.emit('message:send', { role: 'user', content: input });
    setInput('');
  };

  return (
    <div>
      <div style={{ height: 400, overflowY: 'scroll', border: '1px solid #ccc', padding: 10 }}>
        {messages.map(msg => (
          <div key={msg._id} style={{ marginBottom: 10 }}>
            <strong>{msg.role === 'user' ? '👤 You' : '🤖 Agent'}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && send()}
          style={{ width: '80%', padding: 8 }}
          placeholder="Type a message..."
        />
        <button onClick={send} style={{ width: '18%', padding: 8, marginLeft: '2%' }}>
          Send
        </button>
      </div>
    </div>
  );
};
```

**Sử dụng:**
```tsx
<Chat conversationId="695247765cedd121b96885c6" token={userToken} />
```

---

## 🎨 Copy-Paste Vue Component

```vue
<template>
  <div>
    <div class="messages">
      <div v-for="msg in messages" :key="msg._id" class="message">
        <strong>{{ msg.role === 'user' ? '👤 You' : '🤖 Agent' }}:</strong> {{ msg.content }}
      </div>
    </div>
    <div class="input-area">
      <input
        v-model="input"
        @keypress.enter="send"
        placeholder="Type a message..."
      />
      <button @click="send">Send</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

const props = defineProps<{
  conversationId: string;
  token: string;
}>();

const socket = ref<Socket | null>(null);
const messages = ref<any[]>([]);
const input = ref('');

onMounted(() => {
  socket.value = io('https://api.x-or.cloud/ws', {
    auth: { token: props.token },
    transports: ['websocket'],
  });

  socket.value.on('connect', () => {
    console.log('✅ Connected');
    socket.value?.emit('conversation:join', { conversationId: props.conversationId });
  });

  socket.value.on('message:new', (msg: any) => {
    messages.value.push(msg);
  });
});

onUnmounted(() => {
  socket.value?.disconnect();
});

const send = () => {
  if (!input.value.trim()) return;
  socket.value?.emit('message:send', { role: 'user', content: input.value });
  input.value = '';
};
</script>

<style scoped>
.messages {
  height: 400px;
  overflow-y: scroll;
  border: 1px solid #ccc;
  padding: 10px;
}
.message {
  margin-bottom: 10px;
}
.input-area {
  margin-top: 10px;
}
input {
  width: 80%;
  padding: 8px;
}
button {
  width: 18%;
  padding: 8px;
  margin-left: 2%;
}
</style>
```

**Sử dụng:**
```vue
<Chat conversationId="695247765cedd121b96885c6" :token="userToken" />
```

---

## 🎯 Minimal Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Chat Demo</title>
  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body>
  <div id="messages" style="height: 400px; overflow-y: scroll; border: 1px solid #ccc; padding: 10px;"></div>
  <input id="input" type="text" style="width: 80%; padding: 8px;" placeholder="Type a message..." />
  <button onclick="send()" style="width: 18%; padding: 8px;">Send</button>

  <script>
    const TOKEN = 'YOUR_JWT_TOKEN';
    const CONVERSATION_ID = 'YOUR_CONVERSATION_ID';

    const socket = io('https://api.x-or.cloud/ws', {
      auth: { token: TOKEN },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('✅ Connected');
      socket.emit('conversation:join', { conversationId: CONVERSATION_ID });
    });

    socket.on('message:new', (msg) => {
      const div = document.createElement('div');
      div.innerHTML = `<strong>${msg.role === 'user' ? '👤 You' : '🤖 Agent'}:</strong> ${msg.content}`;
      document.getElementById('messages').appendChild(div);
    });

    function send() {
      const input = document.getElementById('input');
      if (!input.value.trim()) return;

      socket.emit('message:send', { role: 'user', content: input.value });
      input.value = '';
    }

    document.getElementById('input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') send();
    });
  </script>
</body>
</html>
```

---

## 🔑 Key Points

### URLs
- **Dev:** `http://localhost:3305/ws`
- **Prod:** `https://api.x-or.cloud/ws`

### Required Config
```typescript
{
  auth: { token },           // JWT from login
  transports: ['websocket'], // Don't use polling
}
```

### Must-Have Events
```typescript
// Listen
socket.on('connect', ...)      // Connection success
socket.on('message:new', ...)  // Receive messages

// Emit
socket.emit('conversation:join', { conversationId })
socket.emit('message:send', { role: 'user', content })
```

---

## ⚠️ Common Mistakes

❌ **Mistake 1:** Forgot to join conversation
```typescript
// Bad - messages won't be received
socket.emit('message:send', { ... });

// Good - join first
socket.emit('conversation:join', { conversationId });
// Then send
socket.emit('message:send', { ... });
```

❌ **Mistake 2:** Using polling instead of WebSocket
```typescript
// Bad
io(url, { transports: ['polling', 'websocket'] })

// Good
io(url, { transports: ['websocket'] })
```

❌ **Mistake 3:** Creating multiple connections
```typescript
// Bad - memory leak
useEffect(() => {
  const s = io(url);
  // No cleanup!
});

// Good - cleanup
useEffect(() => {
  const s = io(url);
  return () => s.disconnect();
}, []);
```

---

## 🐛 Quick Debug

### Not Connecting?
```javascript
// Check in browser console
socket.on('connect_error', (err) => console.error(err.message));

// Common issues:
// - "Authentication error" → Token invalid
// - "404" → Wrong URL (missing /ws)
// - "502" → Backend not running
```

### Not Receiving Messages?
```javascript
// 1. Check joined conversation
socket.emit('conversation:join', { conversationId }, (res) => {
  console.log('Join result:', res);
});

// 2. Check listening to event
socket.on('message:new', (msg) => {
  console.log('Got message:', msg);
});

// 3. Check backend logs
// pm2 logs | grep roomSize
// Should see roomSize=2 (you + agent)
```

---

## 📚 Next Steps

✅ **Working?** Great! Now improve:
1. Add typing indicators
2. Show online/offline status
3. Handle reconnection gracefully
4. Load message history from API

📖 **Want More?** Read full guide:
- [FRONTEND-CHAT-INTEGRATION.md](./FRONTEND-CHAT-INTEGRATION.md) - Complete guide
- [WEBSOCKET-LOG-CHEATSHEET.md](./WEBSOCKET-LOG-CHEATSHEET.md) - Debug help

🆘 **Need Help?** Check:
- API Docs: `https://api.x-or.cloud/api-docs`
- Test in browser console first
- Check backend logs: `pm2 logs | grep WS-`
