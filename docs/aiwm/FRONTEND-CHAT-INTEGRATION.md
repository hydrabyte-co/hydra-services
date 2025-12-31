# Frontend Chat Integration Guide

Hướng dẫn tích hợp WebSocket chat cho giao diện người dùng.

## 📋 Mục Lục

- [Tổng Quan](#tổng-quan)
- [Cài Đặt](#cài-đặt)
- [Kết Nối WebSocket](#kết-nối-websocket)
- [Authentication](#authentication)
- [Events Reference](#events-reference)
- [UI Components](#ui-components)
- [Code Examples](#code-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Tổng Quan

### Kiến Trúc

```
┌─────────────────┐
│  React/Vue/etc  │
│   Chat UI       │
└────────┬────────┘
         │
         │ Socket.IO Client
         ▼
┌─────────────────────┐
│   Nginx LB          │
│   (Sticky Session)  │
└──────────┬──────────┘
           │
    ┌──────┴──────┬──────────┐
    ▼             ▼          ▼
┌────────┐   ┌────────┐  ┌────────┐
│ AIWM   │   │ AIWM   │  │ AIWM   │
│ API 00 │   │ API 01 │  │ API 02 │
└────────┘   └────────┘  └────────┘
    │             │          │
    └──────┬──────┴──────────┘
           ▼
      ┌─────────┐
      │  Redis  │
      │ Pub/Sub │
      └─────────┘
```

### URLs

- **Production:** `https://api.x-or.cloud/ws`

---

## Cài Đặt

### NPM Package

```bash
npm install socket.io-client
# or
yarn add socket.io-client
```

### TypeScript Types

```bash
npm install --save-dev @types/socket.io-client
```

---

## Kết Nối WebSocket

### Basic Connection

```typescript
import { io, Socket } from 'socket.io-client';

const WEBSOCKET_URL = process.env.REACT_APP_WS_URL || 'https://api.x-or.cloud/ws';

// Create socket connection
const socket: Socket = io(WEBSOCKET_URL, {
  auth: {
    token: userToken, // JWT token from login
  },
  transports: ['websocket'], // Only use WebSocket (no polling)
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  timeout: 10000,
});
```

### React Hook Example

```typescript
// hooks/useChat.ts
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseChatOptions {
  token: string;
  conversationId?: string;
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
}

export const useChat = ({ token, conversationId, onMessage, onError }: UseChatOptions) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const socketInstance = io(process.env.REACT_APP_WS_URL!, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('✅ Connected:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('⚠️ Connection error:', error.message);
      onError?.(error);
    });

    // Message events
    socketInstance.on('message:new', (message: Message) => {
      setMessages(prev => [...prev, message]);
      onMessage?.(message);
    });

    socketInstance.on('message:sent', (data) => {
      console.log('✅ Message sent:', data.messageId);
    });

    socketInstance.on('message:error', (error) => {
      console.error('❌ Message error:', error.message);
      onError?.(new Error(error.message));
    });

    setSocket(socketInstance);

    // Cleanup
    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  // Auto-join conversation when conversationId changes
  useEffect(() => {
    if (socket && connected && conversationId) {
      socket.emit('conversation:join', { conversationId }, (response) => {
        if (response?.success) {
          console.log('✅ Joined conversation:', conversationId);
        } else {
          console.error('❌ Failed to join:', response?.error);
          onError?.(new Error(response?.error));
        }
      });

      // Leave on unmount or conversationId change
      return () => {
        socket.emit('conversation:leave', { conversationId });
      };
    }
  }, [socket, connected, conversationId]);

  const sendMessage = useCallback((content: string, role: 'user' | 'assistant' = 'user') => {
    if (!socket || !connected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      socket.emit('message:send', { role, content }, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Failed to send message'));
        }
      });
    });
  }, [socket, connected]);

  return {
    socket,
    connected,
    messages,
    sendMessage,
  };
};
```

---

## Authentication

### Getting User Token

```typescript
// 1. User logs in
const loginResponse = await fetch('https://api.x-or.cloud/iam-v2/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'user@example.com',
    password: 'password123',
  }),
});

const { accessToken } = await loginResponse.json();

// 2. Use token for WebSocket
const socket = io(WS_URL, {
  auth: { token: accessToken },
});
```

### Token Refresh

```typescript
// When token expires, reconnect with new token
socket.auth = { token: newAccessToken };
socket.disconnect().connect();
```

---

## Events Reference

### 📤 Client → Server (Emit)

#### 1. Join Conversation
```typescript
socket.emit('conversation:join',
  { conversationId: 'xxx' },
  (response) => {
    if (response.success) {
      console.log('Joined:', response.conversationId);
    }
  }
);
```

#### 2. Leave Conversation
```typescript
socket.emit('conversation:leave',
  { conversationId: 'xxx' },
  (response) => {
    console.log('Left conversation');
  }
);
```

#### 3. Send Message
```typescript
socket.emit('message:send',
  {
    role: 'user',           // 'user' | 'assistant'
    content: 'Hello!',      // Message text
  },
  (response) => {
    if (response.success) {
      console.log('Message ID:', response.messageId);
    }
  }
);
```

#### 4. Typing Indicator (Start)
```typescript
socket.emit('typing:start', {
  conversationId: 'xxx',
});
```

#### 5. Typing Indicator (Stop)
```typescript
socket.emit('typing:stop', {
  conversationId: 'xxx',
});
```

### 📥 Server → Client (Listen)

#### 1. Connection Events
```typescript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

#### 2. Presence Updates
```typescript
socket.on('presence:update', (data) => {
  console.log('Presence:', data);
  // data = {
  //   type: 'user' | 'agent',
  //   userId?: string,
  //   agentId?: string,
  //   status: 'online' | 'offline',
  //   conversationId?: string,
  //   timestamp: Date
  // }
});
```

#### 3. Conversation Events
```typescript
socket.on('conversation:joined', (data) => {
  console.log('Joined conversation:', data.conversationId);
});

socket.on('user:joined', (data) => {
  console.log('User joined:', data.userId || data.agentId);
});

socket.on('user:left', (data) => {
  console.log('User left:', data.userId || data.agentId);
});
```

#### 4. Message Events
```typescript
socket.on('message:new', (message) => {
  console.log('New message:', message);
  // message = {
  //   _id: string,
  //   conversationId: string,
  //   role: 'user' | 'assistant' | 'system',
  //   content: string,
  //   sender: {
  //     type: 'user' | 'agent',
  //     id: string,
  //     name?: string
  //   },
  //   createdAt: Date,
  //   updatedAt: Date,
  //   ...
  // }
});

socket.on('message:sent', (data) => {
  console.log('Message sent:', data.messageId);
});

socket.on('message:error', (error) => {
  console.error('Message error:', error.message);
});
```

#### 5. Typing Events
```typescript
socket.on('typing:start', (data) => {
  console.log('User is typing:', data);
  // data = {
  //   conversationId: string,
  //   user: {
  //     type: 'user' | 'agent',
  //     id: string,
  //     name?: string
  //   }
  // }
});

socket.on('typing:stop', (data) => {
  console.log('User stopped typing');
});
```

---

## UI Components

### React Chat Component

```typescript
// components/Chat.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';

interface ChatProps {
  conversationId: string;
  userToken: string;
}

export const Chat: React.FC<ChatProps> = ({ conversationId, userToken }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { connected, messages, sendMessage } = useChat({
    token: userToken,
    conversationId,
    onMessage: (msg) => {
      console.log('Received:', msg);
      // Scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    },
    onError: (error) => {
      console.error('Chat error:', error);
      alert(error.message);
    },
  });

  const handleSend = async () => {
    if (!input.trim()) return;

    try {
      await sendMessage(input, 'user');
      setInput('');
    } catch (error) {
      console.error('Failed to send:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      {/* Connection Status */}
      <div className="chat-header">
        <div className={`status ${connected ? 'online' : 'offline'}`}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      {/* Messages */}
      <div className="messages">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`message ${msg.role === 'user' ? 'user' : 'agent'}`}
          >
            <div className="message-sender">
              {msg.sender.type === 'user' ? '👤 You' : '🤖 Agent'}
            </div>
            <div className="message-content">{msg.content}</div>
            <div className="message-time">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="typing-indicator">
          🤖 Agent is typing...
        </div>
      )}

      {/* Input */}
      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={!connected}
          rows={2}
        />
        <button onClick={handleSend} disabled={!connected || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};
```

### Vue Chat Component

```vue
<!-- components/Chat.vue -->
<template>
  <div class="chat-container">
    <!-- Connection Status -->
    <div class="chat-header">
      <div :class="['status', connected ? 'online' : 'offline']">
        {{ connected ? '🟢 Connected' : '🔴 Disconnected' }}
      </div>
    </div>

    <!-- Messages -->
    <div class="messages" ref="messagesContainer">
      <div
        v-for="msg in messages"
        :key="msg._id"
        :class="['message', msg.role === 'user' ? 'user' : 'agent']"
      >
        <div class="message-sender">
          {{ msg.sender.type === 'user' ? '👤 You' : '🤖 Agent' }}
        </div>
        <div class="message-content">{{ msg.content }}</div>
        <div class="message-time">
          {{ formatTime(msg.createdAt) }}
        </div>
      </div>
    </div>

    <!-- Typing Indicator -->
    <div v-if="isTyping" class="typing-indicator">
      🤖 Agent is typing...
    </div>

    <!-- Input -->
    <div class="chat-input">
      <textarea
        v-model="input"
        @keypress.enter.exact.prevent="sendMessage"
        placeholder="Type a message..."
        :disabled="!connected"
        rows="2"
      />
      <button @click="sendMessage" :disabled="!connected || !input.trim()">
        Send
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { io, Socket } from 'socket.io-client';

const props = defineProps<{
  conversationId: string;
  userToken: string;
}>();

const socket = ref<Socket | null>(null);
const connected = ref(false);
const messages = ref<Message[]>([]);
const input = ref('');
const isTyping = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

const WS_URL = import.meta.env.VITE_WS_URL || 'https://api.x-or.cloud/ws';

onMounted(() => {
  // Connect
  socket.value = io(WS_URL, {
    auth: { token: props.userToken },
    transports: ['websocket'],
    reconnection: true,
  });

  // Events
  socket.value.on('connect', () => {
    connected.value = true;
    console.log('✅ Connected');
  });

  socket.value.on('disconnect', () => {
    connected.value = false;
    console.log('❌ Disconnected');
  });

  socket.value.on('message:new', (msg: Message) => {
    messages.value.push(msg);
    nextTick(() => {
      messagesContainer.value?.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: 'smooth',
      });
    });
  });

  socket.value.on('typing:start', () => {
    isTyping.value = true;
  });

  socket.value.on('typing:stop', () => {
    isTyping.value = false;
  });
});

// Auto-join conversation
watch(() => props.conversationId, (newId) => {
  if (socket.value && connected.value && newId) {
    socket.value.emit('conversation:join', { conversationId: newId });
  }
}, { immediate: true });

onUnmounted(() => {
  socket.value?.disconnect();
});

const sendMessage = () => {
  if (!input.value.trim() || !socket.value) return;

  socket.value.emit('message:send', {
    role: 'user',
    content: input.value,
  }, (response: any) => {
    if (response?.success) {
      input.value = '';
    }
  });
};

const formatTime = (date: Date) => {
  return new Date(date).toLocaleTimeString();
};
</script>
```

---

## Code Examples

### TypeScript Interfaces

```typescript
// types/chat.ts
export interface Message {
  _id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  type?: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'error';
  sender: {
    type: 'user' | 'agent';
    id: string;
    name?: string;
  };
  parentId?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  _id: string;
  participants: {
    users: string[];
    agents: string[];
  };
  lastMessage?: {
    content: string;
    timestamp: Date;
    senderId: string;
  };
  status: 'active' | 'archived' | 'closed';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresenceUpdate {
  type: 'user' | 'agent';
  userId?: string;
  agentId?: string;
  status: 'online' | 'offline';
  conversationId?: string;
  timestamp: Date;
}
```

### Full Flow Example

```typescript
// services/ChatService.ts
import { io, Socket } from 'socket.io-client';
import type { Message, Conversation, PresenceUpdate } from '../types/chat';

export class ChatService {
  private socket: Socket | null = null;
  private messageHandlers: Array<(msg: Message) => void> = [];
  private presenceHandlers: Array<(data: PresenceUpdate) => void> = [];

  constructor(private wsUrl: string) {}

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.wsUrl, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected:', this.socket!.id);
        this.setupEventListeners();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('⚠️ Connection error:', error.message);
        reject(error);
      });
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('message:new', (msg: Message) => {
      this.messageHandlers.forEach(handler => handler(msg));
    });

    this.socket.on('presence:update', (data: PresenceUpdate) => {
      this.presenceHandlers.forEach(handler => handler(data));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
    });
  }

  joinConversation(conversationId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('conversation:join', { conversationId }, (response: any) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to join'));
        }
      });
    });
  }

  sendMessage(content: string, role: 'user' | 'assistant' = 'user'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('message:send', { role, content }, (response: any) => {
        if (response?.success) {
          resolve(response.messageId);
        } else {
          reject(new Error(response?.error || 'Failed to send'));
        }
      });
    });
  }

  onMessage(handler: (msg: Message) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onPresence(handler: (data: PresenceUpdate) => void): () => void {
    this.presenceHandlers.push(handler);
    return () => {
      this.presenceHandlers = this.presenceHandlers.filter(h => h !== handler);
    };
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.messageHandlers = [];
    this.presenceHandlers = [];
  }
}
```

---

## Best Practices

### 1. Connection Management

✅ **DO:**
```typescript
// Reuse single socket instance
const socket = useMemo(() =>
  io(WS_URL, { auth: { token } }),
  [token]
);

// Cleanup on unmount
useEffect(() => {
  return () => socket.disconnect();
}, [socket]);
```

❌ **DON'T:**
```typescript
// Creating multiple connections
const socket1 = io(WS_URL);
const socket2 = io(WS_URL); // Bad!
```

### 2. Error Handling

✅ **DO:**
```typescript
socket.on('connect_error', (error) => {
  // Handle gracefully
  if (error.message.includes('Authentication')) {
    // Refresh token
    refreshToken().then(newToken => {
      socket.auth = { token: newToken };
      socket.connect();
    });
  } else {
    // Show user-friendly error
    showNotification('Connection lost. Retrying...');
  }
});
```

### 3. Message Deduplication

```typescript
const [messages, setMessages] = useState<Map<string, Message>>(new Map());

socket.on('message:new', (msg: Message) => {
  setMessages(prev => new Map(prev).set(msg._id, msg));
});
```

### 4. Typing Indicators

```typescript
// Debounce typing events
const debouncedTyping = useMemo(
  () => debounce(() => {
    socket.emit('typing:stop', { conversationId });
  }, 2000),
  [socket, conversationId]
);

const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
  setInput(e.target.value);
  socket.emit('typing:start', { conversationId });
  debouncedTyping();
};
```

### 5. Offline Support

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);
const [queuedMessages, setQueuedMessages] = useState<string[]>([]);

useEffect(() => {
  const handleOnline = () => {
    setIsOnline(true);
    // Send queued messages
    queuedMessages.forEach(msg => sendMessage(msg));
    setQueuedMessages([]);
  };

  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, [queuedMessages]);

const sendMessage = (content: string) => {
  if (!isOnline) {
    setQueuedMessages(prev => [...prev, content]);
    return;
  }
  // Send via socket
};
```

---

## Troubleshooting

### Connection Issues

**Problem:** Connection fails with "Authentication error"
```
Solution: Check JWT token is valid and not expired
```

**Problem:** Connection works but messages not received
```
Solution:
1. Check you called socket.emit('conversation:join', ...)
2. Check conversationId is correct
3. Check Redis adapter is running on backend
```

**Problem:** Frequent disconnections
```
Solution:
1. Check network stability
2. Increase reconnectionDelay and reconnectionAttempts
3. Check Nginx timeout settings
```

### Message Issues

**Problem:** Messages appear duplicated
```
Solution: Use message._id as key for deduplication
```

**Problem:** Old messages not showing
```
Solution: Fetch history from REST API before connecting:
GET /messages/conversation/:conversationId
```

### Performance Issues

**Problem:** UI freezes with many messages
```
Solution: Use virtual scrolling (react-window, vue-virtual-scroller)
```

**Problem:** Memory leak
```
Solution: Clean up event listeners in useEffect cleanup
```

---

## REST API Endpoints

### Initial Setup Flow

Trước khi kết nối WebSocket, frontend cần:

1. **Get list of available agents** → Choose agent to chat
2. **Get or create conversation** → Get conversationId
3. **Load message history** → Show previous messages
4. **Connect WebSocket** → Join conversation and start real-time chat

### 1. Get Available Agents

```typescript
// GET /agents - Get list of agents user can chat with
const getAgents = async (token: string, options?: {
  status?: 'active' | 'inactive' | 'maintenance';
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
}) => {
  const params = new URLSearchParams({
    status: options?.status || 'active',
    page: String(options?.page || 1),
    limit: String(options?.limit || 20),
    ...(options?.sort && { sort: options.sort }),
    ...(options?.search && { search: options.search }),
  });

  const response = await fetch(
    `https://api.x-or.cloud/agents?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();
  return result;
};

// Example usage:
const agents = await getAgents(token, {
  status: 'active',
  page: 1,
  limit: 20,
  sort: '-createdAt', // Sort by newest first
  search: 'support',  // Search by name or description
});

// Response structure:
{
  data: [
    {
      _id: "69520162e1abb06986fdcee5",
      name: "Customer Support Agent",
      description: "Helps with customer inquiries and provides solutions",
      status: "active", // 'active' | 'inactive' | 'maintenance'

      // Agent capabilities and configuration
      capabilities: ["chat", "search", "faq", "knowledge_base"],
      tools: ["web_search", "document_lookup", "calculator"],

      // Display information
      avatar: "https://cdn.x-or.cloud/agents/avatar-123.png",

      // System information
      model: {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022"
      },

      // Owner information (for RBAC)
      owner: {
        userId: "691eba08517f917943ae1fa1",
        orgId: "691eb9e6517f917943ae1f9d"
      },

      // Metadata
      metadata: {
        department: "Customer Service",
        language: "en",
        timezone: "UTC"
      },

      // Timestamps
      createdAt: "2024-12-01T00:00:00Z",
      updatedAt: "2024-12-30T00:00:00Z"
    },
    // ... more agents
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 45,
    totalPages: 3
  }
}
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by status | `active`, `inactive`, `maintenance` |
| `page` | number | Page number (1-based) | `1` |
| `limit` | number | Items per page (max 100) | `20` |
| `sort` | string | Sort field (prefix `-` for desc) | `-createdAt`, `name` |
| `search` | string | Search in name/description | `support`, `sales` |
| `filter[owner.orgId]` | string | Filter by organization | `691eb9e6...` |
| `filter[capabilities]` | string | Filter by capability | `chat` |

**Examples:**

```typescript
// Get all active agents
const activeAgents = await getAgents(token, { status: 'active' });

// Search for sales agents
const salesAgents = await getAgents(token, {
  status: 'active',
  search: 'sales'
});

// Get agents sorted by name
const sortedAgents = await getAgents(token, {
  status: 'active',
  sort: 'name'
});

// Pagination - get page 2
const page2 = await getAgents(token, {
  page: 2,
  limit: 10
});
```

### 2. Get Conversation with Agent

```typescript
// GET /conversations/agent/:agentId - Get existing conversation or need to create
const getConversationWithAgent = async (agentId: string, token: string) => {
  const response = await fetch(
    `https://api.x-or.cloud/conversations/agent/${agentId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (response.ok) {
    const result = await response.json();
    return result.data[0]; // Most recent conversation with this agent
  }

  // No existing conversation, create new one
  return null;
};

// Response structure:
// {
//   data: [
//     {
//       _id: "695247765cedd121b96885c6",
//       participants: {
//         users: ["691eba08517f917943ae1fa1"],
//         agents: ["69520162e1abb06986fdcee5"]
//       },
//       lastMessage: {
//         content: "Hello! How can I help you?",
//         timestamp: "2024-12-30T10:00:00Z",
//         senderId: "69520162e1abb06986fdcee5"
//       },
//       status: "active",
//       createdAt: "2024-12-30T09:00:00Z",
//       updatedAt: "2024-12-30T10:00:00Z"
//     }
//   ]
// }
```

### 3. Create New Conversation (if needed)

```typescript
// POST /conversations - Create new conversation with agent
const createConversation = async (agentId: string, token: string) => {
  const response = await fetch(
    'https://api.x-or.cloud/conversations',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participants: {
          agents: [agentId],
        },
        status: 'active',
      }),
    }
  );

  const result = await response.json();
  return result; // New conversation
};

// Response structure:
// {
//   _id: "695247765cedd121b96885c6",
//   participants: {
//     users: ["691eba08517f917943ae1fa1"],
//     agents: ["69520162e1abb06986fdcee5"]
//   },
//   status: "active",
//   createdAt: "2024-12-30T12:00:00Z"
// }
```

### 4. Load Message History

```typescript
// GET /messages/conversation/:conversationId - Get previous messages
const getMessages = async (conversationId: string, token: string, page = 1) => {
  const response = await fetch(
    `https://api.x-or.cloud/messages/conversation/${conversationId}?page=${page}&limit=50&sort=-createdAt`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();
  return result.data; // Array of messages
};

// Response structure:
// {
//   data: [
//     {
//       _id: "6953840f1c4f71b88e843e22",
//       conversationId: "695247765cedd121b96885c6",
//       role: "user",
//       content: "Hello! I need help.",
//       sender: {
//         type: "user",
//         id: "691eba08517f917943ae1fa1"
//       },
//       createdAt: "2024-12-30T10:00:00Z",
//       updatedAt: "2024-12-30T10:00:00Z"
//     },
//     {
//       _id: "695383821c4f71b88e843e16",
//       conversationId: "695247765cedd121b96885c6",
//       role: "assistant",
//       content: "Hi! I'm here to help. What do you need?",
//       sender: {
//         type: "agent",
//         id: "69520162e1abb06986fdcee5"
//       },
//       createdAt: "2024-12-30T10:00:30Z",
//       updatedAt: "2024-12-30T10:00:30Z"
//     }
//   ],
//   pagination: {
//     page: 1,
//     limit: 50,
//     total: 15
//   }
// }
```

### 5. List All User's Conversations

```typescript
// GET /conversations/my-conversations - Get all conversations for current user
const getMyConversations = async (token: string) => {
  const response = await fetch(
    'https://api.x-or.cloud/conversations/my-conversations?page=1&limit=20&sort=-updatedAt',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();
  return result.data;
};

// Response: List of conversations sorted by most recent activity
```

### Complete Setup Example

```typescript
// services/ChatSetupService.ts
interface ChatSetup {
  agent: Agent;
  conversation: Conversation;
  messages: Message[];
}

export const setupChatWithAgent = async (
  agentId: string,
  token: string
): Promise<ChatSetup> => {
  // 1. Get agent info
  const agentsResponse = await fetch(
    `https://api.x-or.cloud/agents?filter[_id]=${agentId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const { data: agents } = await agentsResponse.json();
  const agent = agents[0];

  if (!agent) {
    throw new Error('Agent not found');
  }

  // 2. Get or create conversation
  let conversation: Conversation | null = null;

  // Try to get existing conversation
  const convResponse = await fetch(
    `https://api.x-or.cloud/conversations/agent/${agentId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  if (convResponse.ok) {
    const { data } = await convResponse.json();
    conversation = data[0]; // Most recent
  }

  // Create new if none exists
  if (!conversation) {
    const createResponse = await fetch(
      'https://api.x-or.cloud/conversations',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participants: { agents: [agentId] },
          status: 'active',
        }),
      }
    );
    conversation = await createResponse.json();
  }

  // 3. Load message history
  const messagesResponse = await fetch(
    `https://api.x-or.cloud/messages/conversation/${conversation._id}?page=1&limit=50&sort=-createdAt`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const { data: messages } = await messagesResponse.json();

  // Return complete setup
  return {
    agent,
    conversation,
    messages: messages.reverse(), // Oldest first for display
  };
};
```

### React Component with Full Flow

```typescript
// components/AgentChat.tsx
import { useEffect, useState } from 'react';
import { setupChatWithAgent } from '../services/ChatSetupService';
import { useChat } from '../hooks/useChat';

export const AgentChat = ({ agentId, token }: { agentId: string, token: string }) => {
  const [setup, setSetup] = useState<ChatSetup | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Load agent, conversation, and history
  useEffect(() => {
    setupChatWithAgent(agentId, token)
      .then(setSetup)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [agentId, token]);

  // 2. Connect WebSocket with conversationId
  const { connected, messages, sendMessage } = useChat({
    token,
    conversationId: setup?.conversation._id,
    onMessage: (msg) => {
      console.log('New message:', msg);
    },
  });

  if (loading) return <div>Loading...</div>;
  if (!setup) return <div>Error loading chat</div>;

  // 3. Merge history + new messages
  const allMessages = [
    ...setup.messages,
    ...messages.filter(m => !setup.messages.find(h => h._id === m._id)),
  ];

  return (
    <div>
      <h2>Chat with {setup.agent.name}</h2>
      <div className={connected ? 'online' : 'offline'}>
        {connected ? '🟢 Online' : '🔴 Offline'}
      </div>

      <div className="messages">
        {allMessages.map(msg => (
          <div key={msg._id}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <input
        type="text"
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).value = '';
          }
        }}
      />
    </div>
  );
};
```

### Agent Selector Component

```typescript
// components/AgentSelector.tsx
import { useEffect, useState } from 'react';

interface Agent {
  _id: string;
  name: string;
  description: string;
  status: string;
  avatar?: string;
}

export const AgentSelector = ({
  token,
  onSelect,
}: {
  token: string;
  onSelect: (agentId: string) => void;
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://api.x-or.cloud/agents?status=active&page=1&limit=20', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(result => setAgents(result.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div>Loading agents...</div>;

  return (
    <div className="agent-list">
      <h2>Select an Agent</h2>
      {agents.map(agent => (
        <div
          key={agent._id}
          className="agent-card"
          onClick={() => onSelect(agent._id)}
          style={{ cursor: 'pointer', padding: '10px', border: '1px solid #ccc', marginBottom: '10px' }}
        >
          {agent.avatar && <img src={agent.avatar} alt={agent.name} style={{ width: 50, height: 50 }} />}
          <h3>{agent.name}</h3>
          <p>{agent.description}</p>
          <span className={agent.status === 'active' ? 'active' : 'inactive'}>
            {agent.status === 'active' ? '🟢 Available' : '🔴 Offline'}
          </span>
        </div>
      ))}
    </div>
  );
};
```

### Complete App Flow

```typescript
// App.tsx
import { useState } from 'react';
import { AgentSelector } from './components/AgentSelector';
import { AgentChat } from './components/AgentChat';

export const App = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const token = localStorage.getItem('accessToken')!;

  if (!selectedAgentId) {
    return <AgentSelector token={token} onSelect={setSelectedAgentId} />;
  }

  return (
    <div>
      <button onClick={() => setSelectedAgentId(null)}>← Back to agents</button>
      <AgentChat agentId={selectedAgentId} token={token} />
    </div>
  );
};
```

---

## Testing

### Manual Testing with Browser Console

```javascript
// In browser console
const socket = io('https://api.x-or.cloud/ws', {
  auth: { token: 'YOUR_TOKEN' },
  transports: ['websocket'],
});

socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('message:new', (msg) => console.log('Message:', msg));

socket.emit('conversation:join', { conversationId: 'xxx' }, console.log);
socket.emit('message:send', { role: 'user', content: 'Test' }, console.log);
```

### Integration Test Example

```typescript
// tests/chat.test.ts
import { io, Socket } from 'socket.io-client';

describe('Chat Integration', () => {
  let socket: Socket;
  const token = 'test-token';
  const conversationId = 'test-conversation-id';

  beforeEach((done) => {
    socket = io('http://localhost:3305/ws', {
      auth: { token },
      transports: ['websocket'],
    });
    socket.on('connect', done);
  });

  afterEach(() => {
    socket.disconnect();
  });

  it('should join conversation', (done) => {
    socket.emit('conversation:join', { conversationId }, (response) => {
      expect(response.success).toBe(true);
      done();
    });
  });

  it('should send and receive message', (done) => {
    socket.on('message:new', (msg) => {
      expect(msg.content).toBe('Test message');
      done();
    });

    socket.emit('message:send', {
      role: 'user',
      content: 'Test message',
    });
  });
});
```

---

## Support

For questions or issues:
- Backend API docs: `https://api.x-or.cloud/api-docs`
- Debug logs guide: [WEBSOCKET-DEBUG-LOGS.md](./WEBSOCKET-DEBUG-LOGS.md)
- Quick reference: [WEBSOCKET-LOG-CHEATSHEET.md](./WEBSOCKET-LOG-CHEATSHEET.md)
