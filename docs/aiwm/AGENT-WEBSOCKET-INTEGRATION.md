# Agent WebSocket Integration Guide

## Overview

This guide shows how to integrate your agent with the AIWM WebSocket service to receive messages, process them, and send responses in real-time.

**Base WebSocket URL:** `wss://api.x-or.cloud/dev/aiwm/chat`

---

## Prerequisites

1. **Agent Token**: Get your agent JWT token from `/agents/:agentId/connect` endpoint
2. **WebSocket Client**: Use Socket.IO client library (v4.x recommended)
3. **Agent ID**: Your unique agent identifier

---

## Quick Start

### 1. Install Socket.IO Client

```bash
# Node.js
npm install socket.io-client

# Python
pip install python-socketio

# Other languages: See https://socket.io/docs/v4/
```

### 2. Connect to WebSocket

**Node.js Example:**
```javascript
const io = require('socket.io-client');

// Step 1: Get agent token from API
const agentToken = await getAgentToken(); // Your function to get token

// Step 2: Connect to WebSocket
const socket = io('wss://api.x-or.cloud/dev/aiwm/chat', {
  auth: {
    token: agentToken  // Pass JWT token in auth
  },
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Step 3: Handle connection events
socket.on('connect', () => {
  console.log('✓ Connected to AIWM WebSocket');
  console.log('Socket ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('✗ Connection failed:', error.message);
});
```

**Python Example:**
```python
import socketio

# Step 1: Get agent token
agent_token = get_agent_token()  # Your function to get token

# Step 2: Create Socket.IO client
sio = socketio.Client()

# Step 3: Connect with authentication
sio.connect(
    'wss://api.x-or.cloud/dev/aiwm/chat',
    auth={'token': agent_token},
    transports=['websocket']
)

@sio.event
def connect():
    print('✓ Connected to AIWM WebSocket')

@sio.event
def connect_error(data):
    print(f'✗ Connection failed: {data}')
```

---

## Authentication Flow

### Getting Agent Token

**Endpoint:** `POST https://api.x-or.cloud/dev/aiwm/agents/:agentId/connect`

**Request:**
```bash
curl -X POST https://api.x-or.cloud/dev/aiwm/agents/YOUR_AGENT_ID/connect \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your-agent-secret"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "tokenType": "bearer",
  "instruction": {
    "id": "...",
    "systemPrompt": "You are a helpful AI assistant...",
    "guidelines": [...]
  },
  "settings": {},
  "mcpServers": {}
}
```

### WebSocket Authentication

The agent token is passed via the `auth` object when connecting:

```javascript
// Method 1: Via auth object (Recommended)
const socket = io('wss://api.x-or.cloud/dev/aiwm/chat', {
  auth: { token: agentToken }
});

// Method 2: Via query parameters
const socket = io('wss://api.x-or.cloud/dev/aiwm/chat?token=' + agentToken);

// Method 3: Via headers
const socket = io('wss://api.x-or.cloud/dev/aiwm/chat', {
  extraHeaders: {
    Authorization: `Bearer ${agentToken}`
  }
});
```

---

## Auto-Created Conversation

When your agent connects, the system **automatically creates or reuses a conversation**:

- **First connection**: Creates new conversation → `Agent {agentId} - Auto Conversation`
- **Reconnection**: Reuses existing active conversation
- **Status**: Conversation status = `active`
- **Participants**: Agent is auto-added to participants list

**What this means:**
- ✅ No manual conversation creation needed
- ✅ Same conversation persists across reconnections
- ✅ Can start sending/receiving messages immediately after connect

---

## Receiving Messages

### Event: `message:new`

Triggered when a new message is sent to the conversation (from user or another agent).

**Event Handler:**
```javascript
socket.on('message:new', (message) => {
  console.log('📩 New message received:', message);

  // Message structure
  const {
    _id,              // Message ID
    conversationId,   // Conversation ID
    role,             // 'user' | 'assistant' | 'system' | 'tool'
    content,          // Message text
    participantId,    // Sender ID (user or agent)
    type,             // 'text' | 'thinking' | 'tool_call' | 'tool_result'
    attachments,      // File URLs or document references
    createdAt         // Timestamp
  } = message;

  // Process message and respond
  if (role === 'user') {
    processUserMessage(content, conversationId);
  }
});
```

**Message Object Structure:**
```typescript
{
  _id: string;              // Message ID
  conversationId: string;   // Conversation ID
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;          // Message content
  participantId?: string;   // Sender ID
  type?: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'error' | 'system';
  attachments?: string[];   // URLs or document references
  thinking?: {              // Agent reasoning (optional)
    content: string;
    visible: boolean;
    duration: number;
  };
  toolCalls?: Array<{       // Tool invocations (optional)
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  toolResults?: Array<{     // Tool execution results (optional)
    toolCallId: string;
    toolName: string;
    result: any;
    success: boolean;
    error?: string;
    executionTime?: number;
  }>;
  usage?: {                 // Token usage (optional)
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency?: number;         // Response time in ms
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Sending Messages

### Event: `message:send`

Send a message to the conversation.

**Simple Text Message:**
```javascript
socket.emit('message:send', {
  role: 'assistant',
  content: 'Hello! How can I help you today?'
});
```

**Message with Thinking:**
```javascript
socket.emit('message:send', {
  role: 'assistant',
  content: 'Based on the analysis, I recommend...',
  thinking: {
    content: 'Let me analyze the data step by step...',
    visible: true,
    duration: 1200  // ms
  }
});
```

**Message with Tool Call:**
```javascript
socket.emit('message:send', {
  role: 'assistant',
  content: 'Searching for information...',
  toolCalls: [
    {
      id: 'call_abc123',
      type: 'mcp_tool',
      function: {
        name: 'web_search',
        arguments: JSON.stringify({ query: 'latest AI news' })
      }
    }
  ]
});
```

**Message with Tool Result:**
```javascript
socket.emit('message:send', {
  role: 'tool',
  content: 'Search completed',
  toolResults: [
    {
      toolCallId: 'call_abc123',
      toolName: 'web_search',
      result: { articles: [...] },
      success: true,
      executionTime: 2340
    }
  ]
});
```

**Message with Attachments:**
```javascript
socket.emit('message:send', {
  role: 'assistant',
  content: 'Here are the relevant documents',
  attachments: [
    'https://s3.amazonaws.com/bucket/file.pdf',
    'document:doc-xyz789'  // Internal document reference
  ]
});
```

**Message with Usage Stats:**
```javascript
socket.emit('message:send', {
  role: 'assistant',
  content: 'Analysis complete',
  usage: {
    promptTokens: 450,
    completionTokens: 120,
    totalTokens: 570
  },
  latency: 2300
});
```

### Response Confirmation

**Event: `message:sent`**
```javascript
socket.on('message:sent', (data) => {
  console.log('✓ Message delivered:', data.messageId);
  // { success: true, messageId: '...', timestamp: '...' }
});
```

**Event: `message:error`**
```javascript
socket.on('message:error', (error) => {
  console.error('✗ Message failed:', error.error);
  // { success: false, error: 'Error message', timestamp: '...' }
});
```

---

## Complete Agent Example

### Node.js Agent

```javascript
const io = require('socket.io-client');
const axios = require('axios');

class AIWMAgent {
  constructor(agentId, agentSecret) {
    this.agentId = agentId;
    this.agentSecret = agentSecret;
    this.socket = null;
    this.conversationId = null;
    this.token = null;
  }

  async connect() {
    // Step 1: Get agent token
    const response = await axios.post(
      `https://api.x-or.cloud/dev/aiwm/agents/${this.agentId}/connect`,
      { secret: this.agentSecret }
    );

    this.token = response.data.accessToken;
    console.log('✓ Token obtained');

    // Step 2: Connect to WebSocket
    this.socket = io('wss://api.x-or.cloud/dev/aiwm/chat', {
      auth: { token: this.token },
      transports: ['websocket'],
      reconnection: true,
    });

    // Step 3: Setup event handlers
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('✓ Connected to AIWM WebSocket');
    });

    this.socket.on('presence:update', (data) => {
      if (data.type === 'agent' && data.agentId === this.agentId) {
        this.conversationId = data.conversationId;
        console.log('✓ Auto-joined conversation:', this.conversationId);
      }
    });

    this.socket.on('message:new', async (message) => {
      console.log('📩 Received:', message.content);

      // Ignore own messages
      if (message.participantId === this.agentId) return;

      // Process user messages only
      if (message.role === 'user') {
        await this.handleUserMessage(message);
      }
    });

    this.socket.on('message:sent', (data) => {
      console.log('✓ Message delivered:', data.messageId);
    });

    this.socket.on('message:error', (error) => {
      console.error('✗ Message error:', error.error);
    });

    this.socket.on('disconnect', () => {
      console.log('✗ Disconnected from WebSocket');
    });
  }

  async handleUserMessage(message) {
    // Show typing indicator
    this.sendTypingIndicator(true);

    try {
      // Process message (your AI logic here)
      const response = await this.processMessage(message.content);

      // Send response
      this.sendMessage({
        role: 'assistant',
        content: response,
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        }
      });
    } catch (error) {
      console.error('Error processing message:', error);
      this.sendMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        type: 'error',
        error: error.message
      });
    } finally {
      this.sendTypingIndicator(false);
    }
  }

  async processMessage(content) {
    // TODO: Implement your AI logic here
    // - Call LLM API
    // - Use MCP tools
    // - Process with custom logic
    return `Echo: ${content}`;
  }

  sendMessage(messageData) {
    this.socket.emit('message:send', {
      conversationId: this.conversationId,
      ...messageData
    });
  }

  sendTypingIndicator(isTyping) {
    this.socket.emit('message:typing', {
      conversationId: this.conversationId,
      isTyping
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Usage
const agent = new AIWMAgent('your-agent-id', 'your-agent-secret');
agent.connect().then(() => {
  console.log('Agent is ready!');
});
```

### Python Agent

```python
import socketio
import requests
import json
from typing import Dict, Any

class AIWMAgent:
    def __init__(self, agent_id: str, agent_secret: str):
        self.agent_id = agent_id
        self.agent_secret = agent_secret
        self.sio = socketio.Client()
        self.conversation_id = None
        self.token = None
        self._setup_event_handlers()

    def connect(self):
        # Step 1: Get agent token
        response = requests.post(
            f'https://api.x-or.cloud/dev/aiwm/agents/{self.agent_id}/connect',
            json={'secret': self.agent_secret}
        )
        self.token = response.json()['accessToken']
        print('✓ Token obtained')

        # Step 2: Connect to WebSocket
        self.sio.connect(
            'wss://api.x-or.cloud/dev/aiwm/chat',
            auth={'token': self.token},
            transports=['websocket']
        )

    def _setup_event_handlers(self):
        @self.sio.event
        def connect():
            print('✓ Connected to AIWM WebSocket')

        @self.sio.event
        def presence_update(data):
            if data['type'] == 'agent' and data['agentId'] == self.agent_id:
                self.conversation_id = data['conversationId']
                print(f"✓ Auto-joined conversation: {self.conversation_id}")

        @self.sio.event
        def message_new(message):
            print(f"📩 Received: {message['content']}")

            # Ignore own messages
            if message.get('participantId') == self.agent_id:
                return

            # Process user messages
            if message['role'] == 'user':
                self.handle_user_message(message)

        @self.sio.event
        def message_sent(data):
            print(f"✓ Message delivered: {data['messageId']}")

        @self.sio.event
        def message_error(error):
            print(f"✗ Message error: {error['error']}")

        @self.sio.event
        def disconnect():
            print('✗ Disconnected from WebSocket')

    def handle_user_message(self, message: Dict[str, Any]):
        # Show typing indicator
        self.send_typing_indicator(True)

        try:
            # Process message (your AI logic)
            response = self.process_message(message['content'])

            # Send response
            self.send_message({
                'role': 'assistant',
                'content': response,
                'usage': {
                    'promptTokens': 100,
                    'completionTokens': 50,
                    'totalTokens': 150
                }
            })
        except Exception as e:
            print(f'Error processing message: {e}')
            self.send_message({
                'role': 'assistant',
                'content': 'Sorry, I encountered an error.',
                'type': 'error',
                'error': str(e)
            })
        finally:
            self.send_typing_indicator(False)

    def process_message(self, content: str) -> str:
        # TODO: Implement your AI logic here
        return f'Echo: {content}'

    def send_message(self, message_data: Dict[str, Any]):
        self.sio.emit('message:send', {
            'conversationId': self.conversation_id,
            **message_data
        })

    def send_typing_indicator(self, is_typing: bool):
        self.sio.emit('message:typing', {
            'conversationId': self.conversation_id,
            'isTyping': is_typing
        })

    def disconnect(self):
        self.sio.disconnect()

# Usage
agent = AIWMAgent('your-agent-id', 'your-agent-secret')
agent.connect()
print('Agent is ready!')

# Keep running
agent.sio.wait()
```

---

## Additional Features

### Typing Indicator

**Send typing status:**
```javascript
socket.emit('message:typing', {
  conversationId: conversationId,
  isTyping: true  // or false
});
```

**Receive typing status:**
```javascript
socket.on('user:typing', (data) => {
  console.log(`${data.userId || data.agentId} is typing...`);
});
```

### Presence Tracking

**Receive presence updates:**
```javascript
socket.on('presence:update', (data) => {
  console.log('Presence update:', data);
  // { type: 'agent|user', agentId/userId: '...', status: 'online|offline', conversationId: '...' }
});
```

**Get online users in conversation:**
```javascript
socket.emit('conversation:online', {
  conversationId: conversationId
}, (response) => {
  console.log('Online users:', response.onlineUsers);
});
```

### Read Receipts

**Mark message as read:**
```javascript
socket.emit('message:read', {
  conversationId: conversationId,
  messageId: messageId
});
```

**Receive read receipts:**
```javascript
socket.on('message:read', (data) => {
  console.log(`${data.userId || data.agentId} read message ${data.messageId}`);
});
```

---

## Error Handling

### Connection Errors

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);

  // Common errors:
  // - Invalid token (401)
  // - Token expired (401)
  // - Agent suspended (403)
  // - Network error

  // Retry logic
  if (error.message.includes('token')) {
    // Refresh token and reconnect
    refreshToken().then(newToken => {
      socket.auth.token = newToken;
      socket.connect();
    });
  }
});
```

### Message Send Errors

```javascript
socket.on('message:error', (error) => {
  console.error('Message error:', error.error);

  // Common errors:
  // - Validation error (invalid role, missing content, etc.)
  // - No conversation found
  // - Permission denied

  // Handle error
  if (error.error.includes('No conversation')) {
    // Rejoin conversation
    socket.emit('conversation:join', { conversationId });
  }
});
```

### Reconnection

```javascript
socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);

  // Conversation is auto-rejoined by the server
  // No manual action needed
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection failed:', error);
});

socket.on('reconnect_failed', () => {
  console.error('Reconnection failed permanently');

  // Manual intervention needed
  // - Check network
  // - Refresh token
  // - Contact support
});
```

---

## Testing Tools

### Postman WebSocket Testing

1. Open Postman → New → WebSocket Request
2. URL: `wss://api.x-or.cloud/dev/aiwm/chat?token=YOUR_TOKEN`
3. Connect
4. Send events:
   ```json
   {
     "event": "message:send",
     "data": {
       "role": "assistant",
       "content": "Test message"
     }
   }
   ```

### curl Command (Get Token)

```bash
# Get agent token
curl -X POST https://api.x-or.cloud/dev/aiwm/agents/YOUR_AGENT_ID/connect \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-agent-secret"}'
```

### Node.js Test Script

```javascript
// test-agent-ws.js
const io = require('socket.io-client');

const token = process.env.AGENT_TOKEN;
const socket = io('wss://api.x-or.cloud/dev/aiwm/chat', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('✓ Connected');

  // Send test message
  socket.emit('message:send', {
    role: 'assistant',
    content: 'Test message from agent'
  });
});

socket.on('message:new', (msg) => {
  console.log('📩 Received:', msg);
});

socket.on('message:sent', (data) => {
  console.log('✓ Sent:', data.messageId);
  process.exit(0);
});
```

Run:
```bash
AGENT_TOKEN=your-token node test-agent-ws.js
```

---

## Best Practices

### 1. Token Management
- ✅ Refresh token before expiry (check `expiresIn`)
- ✅ Store token securely (environment variables, secrets manager)
- ✅ Handle token expiry gracefully (reconnect with new token)

### 2. Message Processing
- ✅ Ignore own messages (check `participantId`)
- ✅ Use typing indicators for better UX
- ✅ Include usage stats for monitoring
- ✅ Handle errors gracefully

### 3. Reconnection
- ✅ Enable auto-reconnection
- ✅ Implement exponential backoff
- ✅ Don't rejoin conversation manually (auto-rejoined by server)

### 4. Performance
- ✅ Process messages asynchronously
- ✅ Implement message queuing for high volume
- ✅ Monitor latency and token usage

### 5. Security
- ✅ Never log full tokens
- ✅ Validate all incoming messages
- ✅ Sanitize user input before processing

---

## Troubleshooting

### Agent not receiving messages
- Check token is valid and not expired
- Verify agent is connected (`socket.connected === true`)
- Check conversation is auto-created (listen to `presence:update`)
- Verify message role is correct ('user' messages trigger agent responses)

### Messages not sending
- Check `conversationId` is set (auto-filled if omitted)
- Verify `role` is 'assistant' (not 'agent')
- Check message validation (content is required)
- Listen to `message:error` event for details

### Connection drops frequently
- Check network stability
- Verify Redis is running (backend dependency)
- Increase reconnection timeout
- Monitor server logs for errors

### "No conversation found" error
- Wait for `presence:update` event before sending messages
- Check agent auto-join logic in backend
- Verify orgId matches between agent and conversation

---

## API Reference

### WebSocket Events (Client → Server)

| Event | Description | Payload |
|-------|-------------|---------|
| `message:send` | Send a message | `{ role, content, conversationId?, thinking?, toolCalls?, toolResults?, usage?, ... }` |
| `message:typing` | Send typing indicator | `{ conversationId, isTyping }` |
| `message:read` | Mark message as read | `{ conversationId, messageId }` |
| `conversation:join` | Join conversation (manual) | `{ conversationId }` |
| `conversation:leave` | Leave conversation | `{ conversationId }` |
| `conversation:online` | Get online users | `{ conversationId }` |

### WebSocket Events (Server → Client)

| Event | Description | Payload |
|-------|-------------|---------|
| `message:new` | New message received | `{ _id, conversationId, role, content, ... }` |
| `message:sent` | Message send confirmation | `{ success, messageId, timestamp }` |
| `message:error` | Message send error | `{ success: false, error, timestamp }` |
| `user:typing` | Someone is typing | `{ type, userId, agentId, conversationId, isTyping }` |
| `presence:update` | Online/offline status | `{ type, userId, agentId, conversationId, status }` |
| `user:joined` | User joined conversation | `{ type, userId, agentId, conversationId }` |
| `user:left` | User left conversation | `{ type, userId, agentId, conversationId }` |
| `message:read` | Message read receipt | `{ type, userId, agentId, messageId, conversationId }` |

---

## Support

- **Documentation**: [CHAT-IMPLEMENTATION-SUMMARY.md](./CHAT-IMPLEMENTATION-SUMMARY.md)
- **Auto-Conversation**: [CHAT-AUTO-CONVERSATION.md](./CHAT-AUTO-CONVERSATION.md)
- **API Base**: `https://api.x-or.cloud/dev/aiwm`
- **WebSocket**: `wss://api.x-or.cloud/dev/aiwm/chat`

---

**Last Updated:** December 2025
**Version:** 1.0
**Status:** Production Ready
