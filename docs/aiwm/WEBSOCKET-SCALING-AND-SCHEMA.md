# WebSocket Scaling & Message Schema Design

## 1. Khả Năng Mở Rộng của WebSocket với NestJS

### 1.1. Horizontal Scaling với Redis Adapter

**Problem:** Khi scale nhiều instances của AIWM service, mỗi instance có riêng Socket.io server → User kết nối instance A không nhận được message từ Agent kết nối instance B.

**Solution:** Sử dụng **Redis Adapter** để sync giữa các instances.

#### Kiến Trúc Multi-Instance

```
                      Load Balancer (Nginx/HAProxy)
                               |
              +----------------+----------------+
              |                |                |
         Instance 1       Instance 2       Instance 3
         (Port 3003)      (Port 3003)      (Port 3003)
              |                |                |
              +----------------+----------------+
                               |
                          Redis Server
                    (Pub/Sub + Adapter)
```

#### Implementation

```typescript
// services/aiwm/src/bootstrap-api.ts
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export async function bootstrapApiServer() {
  const app = await NestFactory.create(AppModule);

  // Redis clients for Socket.io adapter
  const pubClient = createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  // Create Redis adapter
  const redisAdapter = createAdapter(pubClient, subClient);

  // Apply adapter to Socket.io
  app.useWebSocketAdapter(new IoAdapter(app));
  const io = app.get('socket.io.server'); // Get Socket.io server
  io.adapter(redisAdapter);

  await app.listen(3003);
}
```

#### Cách Hoạt Động

1. **User gửi message qua Instance 1**
   - Instance 1 nhận message
   - Lưu DB
   - Publish event `message:new` lên Redis

2. **Redis Pub/Sub broadcast**
   - Instance 1, 2, 3 đều nhận event từ Redis
   - Mỗi instance emit `message:new` tới các socket clients của nó

3. **Agent kết nối Instance 2**
   - Instance 2 emit message tới Agent
   - Agent nhận được message real-time

```typescript
// Automatic với Redis Adapter
io.to('conversation:123').emit('message:new', message);
// → Redis adapter tự động broadcast tới TẤT CẢ instances
```

### 1.2. Sticky Sessions (Optional)

**Khi nào cần:**
- Nếu có nhiều reconnect issues
- Muốn giảm Redis overhead

**Config Nginx:**

```nginx
upstream aiwm_websocket {
    ip_hash; # Sticky session based on client IP
    server 172.16.3.20:3003;
    server 172.16.3.21:3003;
    server 172.16.3.22:3003;
}

server {
    listen 80;

    location /ws/ {
        proxy_pass http://aiwm_websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 1.3. Performance Metrics

#### Single Instance Capacity
- **Concurrent connections:** ~10,000 - 20,000 per instance
- **Messages/sec:** ~5,000 - 10,000
- **Memory:** ~2GB per 10k connections

#### Scaled Architecture (3 instances + Redis)
- **Concurrent connections:** 30,000 - 60,000
- **Messages/sec:** 15,000 - 30,000
- **Latency overhead:** +5-10ms (Redis pub/sub)

### 1.4. Monitoring Scaling Health

```typescript
// services/aiwm/src/modules/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class ChatService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async getScalingMetrics() {
    const [
      totalUsers,
      totalAgents,
      instanceCount,
    ] = await Promise.all([
      this.redis.scard('users:online'),
      this.redis.scard('agents:online'),
      this.redis.scard('instances:online'),
    ]);

    return {
      users: totalUsers,
      agents: totalAgents,
      instances: instanceCount,
      avgUsersPerInstance: Math.round(totalUsers / instanceCount),
    };
  }
}
```

---

## 2. Naming Convention cho WebSocket Events

### 2.1. Nguyên Tắc Thiết Kế

#### Pattern: `<resource>:<action>`

```
conversation:join      ✅ Rõ ràng
conversation:leave     ✅ Rõ ràng
message:send          ✅ Rõ ràng
message:new           ✅ Rõ ràng
typing:start          ✅ Rõ ràng

join-conversation     ❌ Không consistent
sendMessage           ❌ CamelCase (dùng kebab-case)
newMsg                ❌ Viết tắt
```

#### Quy Ước Chi Tiết

| Pattern | Mô tả | Ví dụ |
|---------|-------|-------|
| `<resource>:<action>` | CRUD actions | `conversation:create`, `message:delete` |
| `<resource>:<state>` | State changes | `agent:online`, `agent:offline` |
| `<event>:start/stop` | Toggle events | `typing:start`, `typing:stop` |
| `<resource>:from-<source>` | Source indication | `message:from-user`, `message:from-agent` |

### 2.2. Event Categories

#### Client → Server (Commands)

```typescript
// Conversation management
'conversation:create'     // Create new conversation
'conversation:join'       // Join existing conversation
'conversation:leave'      // Leave conversation
'conversation:update'     // Update conversation metadata

// Message management
'message:send'            // Send message
'message:edit'            // Edit message
'message:delete'          // Delete message
'message:react'           // Add reaction

// User actions
'typing:start'            // User started typing
'typing:stop'             // User stopped typing
'presence:online'         // User came online
'presence:offline'        // User went offline

// Agent actions
'tool:call'               // Request tool execution
'task:create'             // Create new task
```

#### Server → Client (Events)

```typescript
// Conversation events
'conversation:created'    // Conversation created
'conversation:joined'     // Successfully joined
'conversation:updated'    // Conversation updated
'conversation:deleted'    // Conversation deleted

// Message events
'message:new'             // New message received
'message:updated'         // Message edited
'message:deleted'         // Message deleted
'message:reacted'         // Reaction added

// Notification events
'typing:start'            // Someone is typing
'typing:stop'             // Stopped typing
'agent:thinking'          // Agent is processing
'agent:tool-calling'      // Agent calling tool

// System events
'connected'               // Connection established
'error'                   // Error occurred
'reconnected'             // Reconnection successful
```

### 2.3. Event Payload Standards

#### Success Response Pattern

```typescript
// All success events include:
{
  success: true,
  data: { /* actual data */ },
  timestamp: '2025-01-15T10:00:00Z'
}
```

#### Error Response Pattern

```typescript
// All error events include:
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid conversation ID',
    details: { /* extra info */ }
  },
  timestamp: '2025-01-15T10:00:00Z'
}
```

---

## 3. Schema Tối Thiểu cho Conversation & Message

### 3.1. Conversation Schema (Enhanced)

```typescript
// services/aiwm/src/modules/conversation/conversation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation extends BaseSchema {
  // Unique conversation ID
  @Prop({ required: true, unique: true, index: true })
  conversationId: string;

  // Conversation title (auto-generated from first message or user-set)
  @Prop({ required: true })
  title: string;

  // Brief description
  @Prop({ default: '' })
  description: string;

  // Agent handling this conversation
  @Prop({ required: true, type: String, ref: 'Agent', index: true })
  agentId: string;

  // Model used by agent
  @Prop({ required: true, type: String, ref: 'Model' })
  modelId: string;

  // Conversation type: 'chat', 'support', 'workflow', etc.
  @Prop({ required: true, default: 'chat' })
  conversationType: string;

  // Status: 'active', 'archived', 'closed'
  @Prop({ required: true, default: 'active', index: true })
  status: string;

  // Total tokens consumed in this conversation
  @Prop({ default: 0 })
  totalTokens: number;

  // Total messages count
  @Prop({ default: 0 })
  totalMessages: number;

  // Total cost (in USD)
  @Prop({ default: 0 })
  totalCost: number;

  // Participants in conversation
  @Prop({
    type: [
      {
        userId: { type: String, required: false },
        agentId: { type: String, required: false },
        role: { type: String, required: true }, // 'user', 'agent', 'observer'
        joinedAt: { type: Date, required: true },
        leftAt: { type: Date, required: false },
      },
    ],
    default: [],
  })
  participants: Array<{
    userId?: string;
    agentId?: string;
    role: string;
    joinedAt: Date;
    leftAt?: Date;
  }>;

  // Last message preview
  @Prop({ type: Object, required: false })
  lastMessage?: {
    content: string;
    role: string;
    createdAt: Date;
  };

  // Tags for categorization
  @Prop({ type: [String], default: [] })
  tags: string[];

  // Active status
  @Prop({ default: true })
  isActive: boolean;

  // Context/memory for conversation (optional)
  @Prop({ type: Object, required: false })
  context?: {
    summary?: string;        // AI-generated summary
    entities?: string[];     // Extracted entities
    topics?: string[];       // Detected topics
    sentiment?: string;      // Overall sentiment
  };
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes for performance
ConversationSchema.index({ agentId: 1, status: 1, createdAt: -1 });
ConversationSchema.index({ 'participants.userId': 1, status: 1 });
ConversationSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
```

### 3.2. Message Schema (Enhanced với Tool Calls & Thinking)

```typescript
// services/aiwm/src/modules/message/message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message extends BaseSchema {
  // Reference to conversation
  @Prop({ required: true, type: String, ref: 'Conversation', index: true })
  conversationId: string;

  // Agent that handled this message (if role=assistant)
  @Prop({ required: false, type: String, ref: 'Agent' })
  agentId?: string;

  // Message role: 'user', 'assistant', 'system', 'tool'
  @Prop({ required: true, enum: ['user', 'assistant', 'system', 'tool'] })
  role: 'user' | 'assistant' | 'system' | 'tool';

  // Message content (text)
  @Prop({ required: true, type: String })
  content: string;

  // Message type for special rendering
  // 'text', 'thinking', 'tool_call', 'tool_result', 'error', 'system'
  @Prop({
    required: false,
    enum: ['text', 'thinking', 'tool_call', 'tool_result', 'error', 'system'],
    default: 'text',
  })
  messageType?: string;

  // Name (for function/tool messages)
  @Prop({ required: false })
  name?: string;

  // Parent message ID (for threading/replies)
  @Prop({ required: false, type: String, ref: 'Message' })
  parentMessageId?: string;

  // Tool calls made by assistant (Claude Code style)
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true }, // 'function', 'mcp_tool'
        function: {
          name: { type: String, required: true },
          arguments: { type: String, required: true }, // JSON string
        },
      },
    ],
    required: false,
  })
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;

  // Tool results (responses from tools)
  @Prop({
    type: [
      {
        toolCallId: { type: String, required: true },
        toolName: { type: String, required: true },
        result: { type: Object, required: true },
        success: { type: Boolean, required: true },
        error: { type: String, required: false },
        executionTime: { type: Number, required: false }, // ms
      },
    ],
    required: false,
  })
  toolResults?: Array<{
    toolCallId: string;
    toolName: string;
    result: any;
    success: boolean;
    error?: string;
    executionTime?: number;
  }>;

  // Agent thinking/reasoning (Claude Code style)
  @Prop({ type: Object, required: false })
  thinking?: {
    content: string;           // Thinking text
    visible: boolean;          // Show to user?
    duration: number;          // Time spent thinking (ms)
  };

  // Token usage for this message
  @Prop({
    type: {
      promptTokens: { type: Number, required: true },
      completionTokens: { type: Number, required: true },
      totalTokens: { type: Number, required: true },
    },
    required: false,
  })
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  // Response latency (ms)
  @Prop({ required: false })
  latency?: number;

  // Error information (if failed)
  @Prop({ required: false })
  error?: string;

  // Message status: 'sending', 'sent', 'delivered', 'failed'
  @Prop({
    required: false,
    enum: ['sending', 'sent', 'delivered', 'failed'],
    default: 'sent',
  })
  messageStatus?: string;

  // Attachments (files, images, etc.)
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        filename: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        url: { type: String, required: true },
      },
    ],
    required: false,
  })
  attachments?: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
  }>;

  // Active status
  @Prop({ default: true })
  isActive: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ conversationId: 1, role: 1 });
MessageSchema.index({ agentId: 1, createdAt: -1 });
MessageSchema.index({ parentMessageId: 1 });
```

---

## 4. Sample Messages - Các Trường Hợp Thực Tế

### 4.1. Simple User-Agent Exchange

#### Case 1: User asks question

```json
{
  "_id": "msg-001",
  "conversationId": "conv-123",
  "role": "user",
  "messageType": "text",
  "content": "What is the weather in Hanoi?",
  "agentId": null,
  "createdBy": "user-456",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### Case 2: Agent responds (simple text)

```json
{
  "_id": "msg-002",
  "conversationId": "conv-123",
  "role": "assistant",
  "messageType": "text",
  "content": "The current weather in Hanoi is 24°C, partly cloudy with light winds.",
  "agentId": "agent-789",
  "usage": {
    "promptTokens": 45,
    "completionTokens": 20,
    "totalTokens": 65
  },
  "latency": 1200,
  "createdAt": "2025-01-15T10:00:02Z"
}
```

---

### 4.2. Agent with Tool Calls (MCP Tools)

#### Case 3: User asks complex question

```json
{
  "_id": "msg-003",
  "conversationId": "conv-123",
  "role": "user",
  "messageType": "text",
  "content": "Search for recent news about AI and summarize the top 3 articles",
  "createdBy": "user-456",
  "createdAt": "2025-01-15T10:05:00Z"
}
```

#### Case 4: Agent calls MCP Tool (Web Search)

```json
{
  "_id": "msg-004",
  "conversationId": "conv-123",
  "role": "assistant",
  "messageType": "tool_call",
  "content": "I'll search for recent AI news articles.",
  "agentId": "agent-789",
  "toolCalls": [
    {
      "id": "call_abc123",
      "type": "mcp_tool",
      "function": {
        "name": "web_search",
        "arguments": "{\"query\":\"AI news 2025\",\"limit\":10}"
      }
    }
  ],
  "createdAt": "2025-01-15T10:05:01Z"
}
```

#### Case 5: Tool Result (from MCP server)

```json
{
  "_id": "msg-005",
  "conversationId": "conv-123",
  "role": "tool",
  "messageType": "tool_result",
  "name": "web_search",
  "content": "Tool execution completed",
  "toolResults": [
    {
      "toolCallId": "call_abc123",
      "toolName": "web_search",
      "result": {
        "articles": [
          {
            "title": "OpenAI Releases GPT-5",
            "url": "https://example.com/gpt5",
            "summary": "OpenAI announced..."
          },
          {
            "title": "Google's Gemini 2.0 Update",
            "url": "https://example.com/gemini",
            "summary": "Google unveiled..."
          }
        ]
      },
      "success": true,
      "executionTime": 2340
    }
  ],
  "createdAt": "2025-01-15T10:05:04Z"
}
```

#### Case 6: Agent final response (after tool result)

```json
{
  "_id": "msg-006",
  "conversationId": "conv-123",
  "role": "assistant",
  "messageType": "text",
  "content": "Here are the top 3 AI news articles:\n\n1. **OpenAI Releases GPT-5**\nOpenAI announced the release of GPT-5...\n\n2. **Google's Gemini 2.0 Update**\nGoogle unveiled major improvements...\n\n3. **Meta AI Research Breakthrough**\nMeta's AI team published...",
  "agentId": "agent-789",
  "usage": {
    "promptTokens": 890,
    "completionTokens": 145,
    "totalTokens": 1035
  },
  "latency": 3500,
  "createdAt": "2025-01-15T10:05:08Z"
}
```

---

### 4.3. Agent with Thinking (Claude Code Style)

#### Case 7: Complex reasoning with visible thinking

```json
{
  "_id": "msg-007",
  "conversationId": "conv-456",
  "role": "user",
  "messageType": "text",
  "content": "Write a Python function to find all prime numbers up to N using Sieve of Eratosthenes",
  "createdBy": "user-789",
  "createdAt": "2025-01-15T10:10:00Z"
}
```

#### Case 8: Agent thinking message

```json
{
  "_id": "msg-008",
  "conversationId": "conv-456",
  "role": "assistant",
  "messageType": "thinking",
  "content": "",
  "agentId": "agent-code-assistant",
  "thinking": {
    "content": "I need to implement the Sieve of Eratosthenes algorithm. Let me think through the steps:\n\n1. Create a boolean array of size N+1\n2. Mark all numbers as potential primes initially\n3. Start with 2, mark all multiples as non-prime\n4. Move to next unmarked number\n5. Repeat until sqrt(N)\n6. Return all unmarked numbers\n\nI'll also add input validation and optimize for space complexity.",
    "visible": true,
    "duration": 1200
  },
  "createdAt": "2025-01-15T10:10:01Z"
}
```

#### Case 9: Agent writes code (after thinking)

```json
{
  "_id": "msg-009",
  "conversationId": "conv-456",
  "role": "assistant",
  "messageType": "text",
  "content": "Here's an implementation of the Sieve of Eratosthenes:\n\n```python\ndef sieve_of_eratosthenes(n):\n    if n < 2:\n        return []\n    \n    # Create boolean array\n    is_prime = [True] * (n + 1)\n    is_prime[0] = is_prime[1] = False\n    \n    # Sieve algorithm\n    for i in range(2, int(n**0.5) + 1):\n        if is_prime[i]:\n            for j in range(i*i, n + 1, i):\n                is_prime[j] = False\n    \n    # Collect primes\n    return [i for i in range(n + 1) if is_prime[i]]\n\n# Example usage\nprint(sieve_of_eratosthenes(30))\n# Output: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]\n```\n\nThis implementation has:\n- Time complexity: O(n log log n)\n- Space complexity: O(n)",
  "agentId": "agent-code-assistant",
  "usage": {
    "promptTokens": 250,
    "completionTokens": 320,
    "totalTokens": 570
  },
  "latency": 2800,
  "createdAt": "2025-01-15T10:10:04Z"
}
```

---

### 4.4. Multi-Tool Chain (Complex Workflow)

#### Case 10: User requests data analysis

```json
{
  "_id": "msg-010",
  "conversationId": "conv-789",
  "role": "user",
  "messageType": "text",
  "content": "Fetch the latest sales data from database, analyze trends, and create a summary report",
  "createdBy": "user-101",
  "createdAt": "2025-01-15T10:15:00Z"
}
```

#### Case 11: Agent calls Tool #1 (Database Query)

```json
{
  "_id": "msg-011",
  "conversationId": "conv-789",
  "role": "assistant",
  "messageType": "tool_call",
  "content": "Fetching sales data from database...",
  "agentId": "agent-analyst",
  "toolCalls": [
    {
      "id": "call_db_001",
      "type": "mcp_tool",
      "function": {
        "name": "database_query",
        "arguments": "{\"table\":\"sales\",\"query\":\"SELECT * FROM sales WHERE date >= DATE_SUB(NOW(), INTERVAL 30 DAY)\"}"
      }
    }
  ],
  "createdAt": "2025-01-15T10:15:01Z"
}
```

#### Case 12: Tool Result #1

```json
{
  "_id": "msg-012",
  "conversationId": "conv-789",
  "role": "tool",
  "messageType": "tool_result",
  "name": "database_query",
  "content": "Database query completed",
  "toolResults": [
    {
      "toolCallId": "call_db_001",
      "toolName": "database_query",
      "result": {
        "rows": [
          { "date": "2025-01-01", "amount": 15000, "region": "North" },
          { "date": "2025-01-02", "amount": 18500, "region": "South" }
          // ... more rows
        ],
        "rowCount": 30
      },
      "success": true,
      "executionTime": 450
    }
  ],
  "createdAt": "2025-01-15T10:15:02Z"
}
```

#### Case 13: Agent calls Tool #2 (Data Analysis)

```json
{
  "_id": "msg-013",
  "conversationId": "conv-789",
  "role": "assistant",
  "messageType": "tool_call",
  "content": "Analyzing sales trends...",
  "agentId": "agent-analyst",
  "toolCalls": [
    {
      "id": "call_analyze_001",
      "type": "mcp_tool",
      "function": {
        "name": "python_execute",
        "arguments": "{\"code\":\"import pandas as pd\\nimport numpy as np\\n\\n# Analysis code here\\n...\"}"
      }
    }
  ],
  "createdAt": "2025-01-15T10:15:03Z"
}
```

#### Case 14: Tool Result #2

```json
{
  "_id": "msg-014",
  "conversationId": "conv-789",
  "role": "tool",
  "messageType": "tool_result",
  "name": "python_execute",
  "content": "Analysis completed",
  "toolResults": [
    {
      "toolCallId": "call_analyze_001",
      "toolName": "python_execute",
      "result": {
        "summary": {
          "totalSales": 525000,
          "avgDaily": 17500,
          "trend": "increasing",
          "growthRate": 12.5
        }
      },
      "success": true,
      "executionTime": 1200
    }
  ],
  "createdAt": "2025-01-15T10:15:05Z"
}
```

#### Case 15: Agent final summary

```json
{
  "_id": "msg-015",
  "conversationId": "conv-789",
  "role": "assistant",
  "messageType": "text",
  "content": "## Sales Analysis Summary (Last 30 Days)\n\n### Key Metrics\n- **Total Sales:** $525,000\n- **Average Daily Sales:** $17,500\n- **Trend:** Increasing (+12.5%)\n\n### Insights\n1. Sales show consistent growth over the past month\n2. North region outperforming South by 15%\n3. Weekend sales 20% higher than weekdays\n\n### Recommendations\n- Focus marketing efforts on South region\n- Increase inventory for weekends\n- Maintain current strategy for North region",
  "agentId": "agent-analyst",
  "usage": {
    "promptTokens": 1200,
    "completionTokens": 180,
    "totalTokens": 1380
  },
  "latency": 2100,
  "createdAt": "2025-01-15T10:15:08Z"
}
```

---

### 4.5. Error Handling

#### Case 16: Tool execution fails

```json
{
  "_id": "msg-016",
  "conversationId": "conv-999",
  "role": "tool",
  "messageType": "tool_result",
  "name": "web_search",
  "content": "Tool execution failed",
  "toolResults": [
    {
      "toolCallId": "call_search_002",
      "toolName": "web_search",
      "result": null,
      "success": false,
      "error": "API rate limit exceeded. Please try again in 60 seconds.",
      "executionTime": 150
    }
  ],
  "createdAt": "2025-01-15T10:20:00Z"
}
```

#### Case 17: Agent handles error gracefully

```json
{
  "_id": "msg-017",
  "conversationId": "conv-999",
  "role": "assistant",
  "messageType": "text",
  "content": "I apologize, but I encountered a rate limit error while searching the web. Could you please try again in a minute? Alternatively, I can provide information based on my existing knowledge.",
  "agentId": "agent-789",
  "messageStatus": "sent",
  "createdAt": "2025-01-15T10:20:01Z"
}
```

---

### 4.6. System Messages

#### Case 18: Conversation started

```json
{
  "_id": "msg-018",
  "conversationId": "conv-new",
  "role": "system",
  "messageType": "system",
  "content": "Conversation started with AI Assistant. How can I help you today?",
  "agentId": "agent-789",
  "createdAt": "2025-01-15T10:25:00Z"
}
```

#### Case 19: Agent switched

```json
{
  "_id": "msg-019",
  "conversationId": "conv-123",
  "role": "system",
  "messageType": "system",
  "content": "Agent switched from 'General Assistant' to 'Code Expert'",
  "metadata": {
    "previousAgentId": "agent-general",
    "newAgentId": "agent-code"
  },
  "createdAt": "2025-01-15T10:30:00Z"
}
```

---

## 5. Frontend Rendering Guidelines

### 5.1. Message Component Logic

```typescript
// React component example
function MessageItem({ message }: { message: Message }) {
  // Render based on messageType
  switch (message.messageType) {
    case 'text':
      return <TextMessage content={message.content} />;

    case 'thinking':
      return (
        <ThinkingMessage
          content={message.thinking.content}
          visible={message.thinking.visible}
        />
      );

    case 'tool_call':
      return (
        <ToolCallMessage
          toolCalls={message.toolCalls}
          content={message.content}
        />
      );

    case 'tool_result':
      return (
        <ToolResultMessage
          results={message.toolResults}
          collapsed={true} // Collapsible by default
        />
      );

    case 'error':
      return <ErrorMessage error={message.error} />;

    case 'system':
      return <SystemMessage content={message.content} />;

    default:
      return <TextMessage content={message.content} />;
  }
}
```

### 5.2. Conversation Flow Example

```
┌─────────────────────────────────────────┐
│ User: "Search AI news and summarize"    │ ← messageType: text
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🤖 Agent: Thinking...                   │ ← messageType: thinking
│ (Collapsible)                           │   (visible: true)
│ "I need to search for recent AI news    │
│  and then summarize the findings..."    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🔧 Tool Call: web_search                │ ← messageType: tool_call
│ Arguments: {"query": "AI news 2025"}    │
│ (Show spinner or loading state)         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ✅ Tool Result: web_search              │ ← messageType: tool_result
│ (Collapsed by default, expandable)      │
│ Found 10 articles                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🤖 Agent: Here are the top AI news:     │ ← messageType: text
│                                         │
│ 1. OpenAI releases GPT-5...            │
│ 2. Google's Gemini update...           │
│ 3. Meta AI breakthrough...             │
└─────────────────────────────────────────┘
```

---

## Summary

### Scaling WebSocket
✅ **Redis Adapter** - Auto sync giữa multiple instances
✅ **Horizontal scaling** - 10k-20k connections/instance
✅ **Sticky sessions** - Optional, reduce Redis overhead
✅ **Monitoring** - Track users, agents, instances

### Event Naming
✅ **Pattern:** `<resource>:<action>`
✅ **Consistency:** kebab-case, descriptive
✅ **Categories:** Commands (client→server), Events (server→client)
✅ **Payload standards:** Success/error patterns

### Schema Design
✅ **Conversation:** Tracks participants, metadata, context
✅ **Message:** Supports text, thinking, tool_calls, tool_results
✅ **messageType:** Distinguish rendering types
✅ **Tool integration:** Full MCP tool call/result tracking

### Real-world Examples
✅ Simple Q&A
✅ Tool calls (web search, database)
✅ Agent thinking (Claude Code style)
✅ Multi-tool chains
✅ Error handling
✅ System messages
