# Chat WebSocket Architecture - AIWM Service (Final Design)

## Tổng Quan

Tài liệu này mô tả chi tiết kiến trúc WebSocket cho tính năng chat real-time giữa Users và AI Agents trong AIWM Service. Hệ thống hỗ trợ full-page chat application tương tự Discord với các tính năng:

- Chat real-time với AI Agents
- Quản lý conversations và message history
- Tool calls và tool results tracking (MCP integration)
- Agent thinking/reasoning display
- Typing indicators và presence tracking
- Multi-device sync
- File attachments (URLs và CBM document references)
- Scalable architecture với Redis Pub/Sub

**Design Principles:**
- ✅ Simplified schema (không over-engineering)
- ✅ String-based attachments (parse by prefix)
- ✅ Auto-generate context summary (mỗi 10 messages)
- ✅ Role: 'agent' thay vì 'assistant'

---

## Kiến Trúc Tổng Thể

### Shared Instance Architecture

AIWM Service chạy WebSocket và HTTP API trên **cùng một instance** (Port 3003):

```
AIWM Service (Port 3003)
├── HTTP API (Express)
│   ├── REST endpoints
│   │   ├── /conversations (CRUD)
│   │   ├── /messages (CRUD)
│   │   └── /agents, /models, /tools...
│   └── Health check (/health)
└── WebSocket (Socket.io)
    ├── /ws/node (existing - for GPU nodes)
    └── /ws/chat (NEW - for user-agent chat)
```

### Lý do chọn Shared Instance:

1. ✅ **Đơn giản deployment** - Chỉ 1 service thay vì 2
2. ✅ **Shared state** - Dễ truy cập database, Redis, services
3. ✅ **Tiết kiệm resources** - Không duplicate connections
4. ✅ **Consistent authentication** - Dùng chung JWT strategy
5. ✅ **AIWM đã có WebSocket adapter** - Tái sử dụng infrastructure

---

## Horizontal Scaling với Redis

### Multi-Instance Architecture

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

### Implementation

```typescript
// services/aiwm/src/bootstrap-api.ts
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

  // Apply Redis adapter to Socket.io
  const io = app.get('socket.io.server');
  io.adapter(createAdapter(pubClient, subClient));

  await app.listen(3003);
}
```

### Capacity

- **Single instance:** 10,000 - 20,000 concurrent connections
- **3 instances:** 30,000 - 60,000 concurrent connections
- **Latency overhead:** +5-10ms (Redis pub/sub)

---

## Các Modules Liên Quan

### 1. Conversation Module

**Location:** `services/aiwm/src/modules/conversation/`

**Status:** Schema có sẵn, cần implement Controller + Service

**Chức năng:**
- CRUD conversations
- Track participants
- Auto-generate context summary
- Manage conversation lifecycle

**API Endpoints:**
```
POST   /conversations          Create new conversation
GET    /conversations          List conversations (by user/agent)
GET    /conversations/:id      Get conversation detail
PUT    /conversations/:id      Update conversation
DELETE /conversations/:id      Soft delete conversation
POST   /conversations/:id/summarize  Manual summary trigger (optional)
```

---

### 2. Message Module

**Location:** `services/aiwm/src/modules/message/`

**Status:** Schema có sẵn, cần implement Controller + Service

**Chức năng:**
- CRUD messages
- Save tool calls and results
- Track token usage
- Support attachments
- Auto-update conversation summary mỗi 10 messages

**API Endpoints:**
```
POST   /messages               Send message (fallback to REST)
GET    /messages               List messages by conversation
GET    /messages/:id           Get message detail
DELETE /messages/:id           Delete message
```

---

### 3. Chat Module (NEW)

**Location:** `services/aiwm/src/modules/chat/`

**Status:** Cần tạo mới

**Chức năng:**
- WebSocket gateway
- Real-time message routing
- Presence tracking (online agents/users)
- Typing indicators
- Chat business logic

**Files cần tạo:**
```
chat/
├── chat.module.ts
├── chat.gateway.ts          # WebSocket handler
├── chat.service.ts          # Business logic
└── dto/
    ├── join-conversation.dto.ts
    ├── send-message.dto.ts
    └── typing.dto.ts
```

---

## Database Schema

### Conversation Schema (Simplified)

```typescript
// services/aiwm/src/modules/conversation/conversation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation extends BaseSchema {
  // Conversation title (auto-generated from first message or user-set)
  @Prop({ required: true })
  title: string;

  // Brief description
  @Prop({ default: '' })
  description: string;

  // Primary agent
  @Prop({ required: true, type: String, ref: 'Agent', index: true })
  agentId: string;

  // Model used
  @Prop({ required: true, type: String, ref: 'Model' })
  modelId: string;

  // Type: 'chat', 'support', 'workflow'
  @Prop({ required: true, default: 'chat' })
  conversationType: string;

  // Status: 'active', 'archived', 'closed'
  @Prop({ required: true, default: 'active', index: true })
  status: string;

  // Token/cost tracking
  @Prop({ default: 0 })
  totalTokens: number;

  @Prop({ default: 0 })
  totalMessages: number;

  @Prop({ default: 0 })
  totalCost: number;

  // Simplified participants
  @Prop({
    type: [
      {
        type: { type: String, enum: ['user', 'agent'], required: true },
        id: { type: String, required: true },
        joined: { type: Date, required: true, default: Date.now },
      },
    ],
    default: [],
  })
  participants: Array<{
    type: 'user' | 'agent';
    id: string;
    joined: Date;
  }>;

  // Last message preview
  @Prop({ type: Object, required: false })
  lastMessage?: {
    content: string;
    role: string;
    createdAt: Date;
  };

  // Tags
  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: true })
  isActive: boolean;

  // Context summary (auto-generated every 10 messages)
  @Prop({ type: String, required: false })
  contextSummary?: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes
ConversationSchema.index({ agentId: 1, status: 1, createdAt: -1 });
ConversationSchema.index({ 'participants.id': 1, status: 1 });
ConversationSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
```

---

### Message Schema (Simplified Attachments)

```typescript
// services/aiwm/src/modules/message/message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message extends BaseSchema {
  @Prop({ required: true, type: String, ref: 'Conversation', index: true })
  conversationId: string;

  @Prop({ required: false, type: String, ref: 'Agent' })
  agentId?: string;

  // Role: 'user' | 'agent' | 'system' | 'tool'
  @Prop({
    required: true,
    enum: ['user', 'agent', 'system', 'tool'],
    index: true,
  })
  role: 'user' | 'agent' | 'system' | 'tool';

  @Prop({ required: true, type: String })
  content: string;

  // Message type: 'text', 'thinking', 'tool_call', 'tool_result', 'error', 'system'
  @Prop({
    required: false,
    enum: ['text', 'thinking', 'tool_call', 'tool_result', 'error', 'system'],
    default: 'text',
  })
  messageType?: string;

  @Prop({ required: false })
  name?: string;

  @Prop({ required: false, type: String, ref: 'Message' })
  parentMessageId?: string;

  // Tool calls (MCP integration)
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true },
        function: {
          name: { type: String, required: true },
          arguments: { type: String, required: true },
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

  // Tool results
  @Prop({
    type: [
      {
        toolCallId: { type: String, required: true },
        toolName: { type: String, required: true },
        result: { type: Object, required: true },
        success: { type: Boolean, required: true },
        error: { type: String, required: false },
        executionTime: { type: Number, required: false },
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

  // Agent thinking
  @Prop({ type: Object, required: false })
  thinking?: {
    content: string;
    visible: boolean;
    duration: number;
  };

  // Token usage
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

  @Prop({ required: false })
  latency?: number;

  @Prop({ required: false })
  error?: string;

  @Prop({
    required: false,
    enum: ['sending', 'sent', 'delivered', 'failed'],
    default: 'sent',
  })
  messageStatus?: string;

  // Simplified attachments (string array)
  // Parse by prefix: https://, document:
  @Prop({ type: [String], required: false })
  attachments?: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ conversationId: 1, role: 1 });
MessageSchema.index({ agentId: 1, createdAt: -1 });
MessageSchema.index({ messageType: 1 });
```

---

## Attachments - String Array Pattern

### Format

```typescript
attachments: [
  "https://s3.amazonaws.com/bucket/report.pdf",  // File URL
  "https://cdn.example.com/images/chart.png",    // Image URL
  "document:doc-xyz789abc",                      // CBM document
]
```

### Helper Class

```typescript
// services/aiwm/src/modules/message/attachment.helper.ts
export class AttachmentHelper {
  static getType(attachment: string): 'url' | 'document' | 'unknown' {
    if (attachment.startsWith('http://') || attachment.startsWith('https://')) {
      return 'url';
    }
    if (attachment.startsWith('document:')) {
      return 'document';
    }
    return 'unknown';
  }

  static getDocumentId(attachment: string): string | null {
    if (attachment.startsWith('document:')) {
      return attachment.substring('document:'.length);
    }
    return null;
  }

  static getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1);
    } catch {
      return 'unknown';
    }
  }

  static parse(attachment: string) {
    const type = this.getType(attachment);

    if (type === 'url') {
      return {
        type: 'url',
        url: attachment,
        filename: this.getFilenameFromUrl(attachment),
      };
    }

    if (type === 'document') {
      return {
        type: 'document',
        documentId: this.getDocumentId(attachment),
      };
    }

    return { type: 'unknown' };
  }

  static createDocumentAttachment(documentId: string): string {
    return `document:${documentId}`;
  }

  static isValid(attachment: string): boolean {
    const type = this.getType(attachment);

    if (type === 'url') {
      try {
        new URL(attachment);
        return true;
      } catch {
        return false;
      }
    }

    if (type === 'document') {
      const docId = this.getDocumentId(attachment);
      return docId !== null && docId.length > 0;
    }

    return false;
  }
}
```

---

## Context Summary Auto-Generation

### Strategy

Auto-generate summary **mỗi 10 messages** (sau message thứ 10, 20, 30...)

### Implementation

```typescript
// services/aiwm/src/modules/message/message.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from './message.schema';
import { ConversationService } from '../conversation/conversation.service';
import { UtilService } from '../util/util.service';
import { BaseService } from '@hydrabyte/base';

@Injectable()
export class MessageService extends BaseService<Message> {
  constructor(
    @InjectModel(Message.name) model: Model<Message>,
    private conversationService: ConversationService,
    private utilService: UtilService,
  ) {
    super(model);
  }

  async create(dto: CreateMessageDto, context: RequestContext) {
    // Save message
    const message = await super.create(dto, context);

    // Update conversation stats
    const conversation = await this.conversationService.findById(
      dto.conversationId,
    );

    const newTotalMessages = conversation.totalMessages + 1;

    await this.conversationService.update(
      dto.conversationId,
      {
        totalMessages: newTotalMessages,
        totalTokens: conversation.totalTokens + (message.usage?.totalTokens || 0),
        lastMessage: {
          content: message.content.substring(0, 100),
          role: message.role,
          createdAt: message.createdAt,
        },
      },
      context,
    );

    // Auto-generate summary every 10 messages
    if (newTotalMessages % 10 === 0) {
      // Run in background (don't block response)
      this.generateConversationSummary(dto.conversationId).catch(err => {
        console.error('Failed to generate summary:', err);
      });
    }

    return message;
  }

  private async generateConversationSummary(conversationId: string) {
    try {
      // Get last 20 messages
      const messages = await this.model
        .find({ conversationId, isActive: true })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      if (messages.length === 0) return;

      // Reverse to chronological order
      messages.reverse();

      // Build conversation text
      const conversationText = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      // Generate summary using UtilService (OpenAI)
      const summary = await this.utilService.generateText({
        fieldDescription: `Summarize this conversation in 2-3 sentences. Focus on main topics, decisions, and outcomes:\n\n${conversationText}`,
        maxLength: 300,
      });

      // Update conversation
      await this.conversationService.model.updateOne(
        { _id: conversationId },
        { $set: { contextSummary: summary } },
      );

      console.log(`✅ Generated summary for conversation ${conversationId}`);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    }
  }
}
```

---

## WebSocket Events

### Event Naming Convention

**Pattern:** `<resource>:<action>`

Examples:
- `conversation:join` ✅
- `message:send` ✅
- `typing:start` ✅

### Client → Server Events

```typescript
// Conversation management
'conversation:join'       // Join conversation room
'conversation:leave'      // Leave conversation room

// Message management
'message:send'            // Send message

// User actions
'typing:start'            // User started typing
'typing:stop'             // User stopped typing
```

### Server → Client Events

```typescript
// Connection
'connected'               // Connection established

// Conversation
'conversation:joined'     // Successfully joined
'conversation:left'       // Successfully left

// Messages
'messages:history'        // Message history (on join)
'message:new'             // New message received
'message:sent'            // Confirmation message sent

// Typing indicators
'typing:start'            // Someone is typing
'typing:stop'             // Stopped typing

// Errors
'error'                   // Error occurred
```

---

## Luồng Kết Nối

### 1. Agent Connection Flow

```
Agent starts up
  ↓
Get JWT token from IAM (with agentId claim)
  ↓
Connect WebSocket: ws://localhost:3003/ws/chat
  + auth: { token: JWT }
  ↓
WsJwtAdapter validates JWT → Extract agentId
  ↓
[Valid] → Mark online in Redis
  - SADD agents:online {agentId}
  - HSET agent:{agentId} socketId connectedAt
  - Update Agent.status = 'online' in DB
  ↓
Emit 'connected' to agent
  ↓
Listen for 'message:from-user' events
```

**Agent Code:**
```typescript
import io from 'socket.io-client';

const agentToken = await getAgentJWT();

const socket = io('http://localhost:3003/ws/chat', {
  auth: { token: agentToken }
});

socket.on('connect', () => {
  console.log('Agent connected');
});

socket.on('message:from-user', async (data) => {
  const { conversationId, messageId, content, userId } = data;

  // Process with AI
  const response = await processWithAI(content);

  // Send back
  socket.emit('message:send', {
    conversationId,
    content: response,
    role: 'agent',
    replyTo: messageId
  });
});
```

---

### 2. User Connection Flow

```
User logs into Portal
  ↓
Get JWT token from IAM (with userId claim)
  ↓
Open Chat page → Fetch conversations
  GET /conversations → List of conversations
  ↓
Connect WebSocket: ws://localhost:3003/ws/chat
  + auth: { token: JWT }
  ↓
WsJwtAdapter validates JWT → Extract userId
  ↓
[Valid] → Mark online in Redis
  - SADD users:online {userId}
  - HSET user:{userId} socketId connectedAt
  ↓
Emit 'connected' to user
  ↓
User selects conversation
  ↓
Emit 'conversation:join' { conversationId }
  ↓
Verify user has access
  ↓
[Has Access]
  - socket.join('conversation:{id}')
  - SADD conversation:{id}:members {userId}
  - Emit 'conversation:joined'
  - Get last 50 messages from DB
  - Emit 'messages:history' with messages
```

**Frontend Code:**
```typescript
const userToken = localStorage.getItem('accessToken');

const socket = io('http://localhost:3003/ws/chat', {
  auth: { token: userToken }
});

socket.on('connect', () => {
  // Join conversation
  socket.emit('conversation:join', { conversationId: 'conv-123' });
});

socket.on('conversation:joined', ({ conversationId }) => {
  console.log(`Joined: ${conversationId}`);
});

socket.on('messages:history', ({ messages }) => {
  renderMessages(messages);
});

socket.on('message:new', (message) => {
  appendMessage(message);
});
```

---

### 3. User Sends Message Flow

```
User types message → Click send
  ↓
Emit 'message:send' {
  conversationId,
  content: "Hello agent!"
}
  ↓
WebSocket Gateway receives event
  ↓
Validate: user in conversation?
  ↓
[Valid] → Save message to DB
  role: 'user'
  content: "Hello agent!"
  createdBy: userId
  ↓
Update conversation stats
  totalMessages++
  lastMessage = { ... }
  ↓
Check if totalMessages % 10 === 0
  → [Yes] Generate summary (background)
  ↓
Broadcast to conversation room:
  io.to('conversation:{id}').emit('message:new', message)
  ↓
User receives own message (confirmation)
  ↓
Check if agent is online:
  SISMEMBER agents:online {agentId}
  ↓
[Agent Online]
  → Get agent socketId from Redis
  → Forward to agent: emit('message:from-user', { ... })
  ↓
Agent processes message → Responds
  ↓
Agent emits 'message:send' {
  conversationId,
  content: response,
  role: 'agent'
}
  ↓
Save agent message to DB
  ↓
Broadcast to room: emit('message:new', agentMessage)
  ↓
User receives agent response
```

---

### 4. Typing Indicators Flow

```
User starts typing
  ↓
Emit 'typing:start' { conversationId }
  ↓
Gateway sets Redis key with TTL:
  SETEX conversation:{id}:typing:{userId} 3 "typing"
  ↓
Broadcast to others in room:
  socket.to('conversation:{id}').emit('typing:start', { userId })
  ↓
Other participants see typing indicator
  ↓
[User stops typing OR 3 seconds pass]
  ↓
Redis key expires OR emit 'typing:stop'
  ↓
Broadcast 'typing:stop'
  ↓
Hide typing indicator
```

---

## Redis Data Structures

### Online Tracking

```redis
# Online agents
SADD agents:online "agent-123"
HSET agent:agent-123 socketId "socket-xyz" connectedAt "2025-01-15T10:00:00Z"

# Online users
SADD users:online "user-456"
HSET user:user-456 socketId "socket-abc" connectedAt "2025-01-15T10:05:00Z"

# Conversation members
SADD conversation:conv-123:members "user-456"
SADD conversation:conv-123:members "agent-123"

# Typing indicator (TTL 3 seconds)
SETEX conversation:conv-123:typing:user-456 3 "typing"
```

---

## WebSocket Gateway Implementation

```typescript
// services/aiwm/src/modules/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/ws/chat',
  cors: { origin: '*' }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private chatService: ChatService) {}

  async handleConnection(client: Socket) {
    try {
      const user = client.handshake.auth;
      const { userId, agentId } = user;

      if (agentId) {
        await this.chatService.handleAgentConnect(client.id, agentId);
      } else if (userId) {
        await this.chatService.handleUserConnect(client.id, userId);
      } else {
        client.disconnect();
      }

      client.emit('connected', { userId, agentId });
      this.logger.log(`Connected: ${userId || agentId}`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.handshake.auth;
    const { userId, agentId } = user;

    if (agentId) {
      await this.chatService.handleAgentDisconnect(agentId);
    } else if (userId) {
      await this.chatService.handleUserDisconnect(userId);
    }

    this.logger.log(`Disconnected: ${userId || agentId}`);
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const user = client.handshake.auth;
    const { conversationId } = data;

    // Verify access
    const hasAccess = await this.chatService.checkConversationAccess(
      conversationId,
      user.userId || user.agentId
    );

    if (!hasAccess) {
      client.emit('error', { message: 'Access denied' });
      return;
    }

    // Join room
    await client.join(`conversation:${conversationId}`);
    await this.chatService.addToConversationMembers(
      conversationId,
      user.userId || user.agentId
    );

    // Send confirmation
    client.emit('conversation:joined', { conversationId });

    // Send message history
    const messages = await this.chatService.getMessageHistory(conversationId);
    client.emit('messages:history', { messages });
  }

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const user = client.handshake.auth;
    const { conversationId } = data;

    await client.leave(`conversation:${conversationId}`);
    await this.chatService.removeFromConversationMembers(
      conversationId,
      user.userId || user.agentId
    );

    client.emit('conversation:left', { conversationId });
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto
  ) {
    const user = client.handshake.auth;
    const { conversationId, content, attachments } = data;

    // Save message
    const message = await this.chatService.saveMessage({
      conversationId,
      content,
      attachments,
      role: user.userId ? 'user' : 'agent',
      createdBy: user.userId,
      agentId: user.agentId,
    });

    // Broadcast to room
    this.server.to(`conversation:${conversationId}`).emit('message:new', message);

    // If from user, forward to agent
    if (user.userId) {
      await this.chatService.forwardToAgent(conversationId, message);
    }

    // Confirmation
    client.emit('message:sent', { messageId: message.id });
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const user = client.handshake.auth;
    const { conversationId } = data;

    await this.chatService.setTypingIndicator(
      conversationId,
      user.userId || user.agentId
    );

    client.to(`conversation:${conversationId}`).emit('typing:start', {
      conversationId,
      userId: user.userId,
      agentId: user.agentId,
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const user = client.handshake.auth;
    const { conversationId } = data;

    await this.chatService.removeTypingIndicator(
      conversationId,
      user.userId || user.agentId
    );

    client.to(`conversation:${conversationId}`).emit('typing:stop', {
      conversationId,
      userId: user.userId,
      agentId: user.agentId,
    });
  }
}
```

---

## Sample Data

### Conversation Example

```json
{
  "_id": "67890abc12345def",
  "title": "Sales Analysis Q1 2025",
  "agentId": "agent-analyst-001",
  "modelId": "model-gpt4",
  "conversationType": "chat",
  "status": "active",
  "totalTokens": 5420,
  "totalMessages": 15,
  "totalCost": 0.054,
  "participants": [
    { "type": "user", "id": "user-john", "joined": "2025-01-15T10:00:00Z" },
    { "type": "agent", "id": "agent-analyst-001", "joined": "2025-01-15T10:00:00Z" }
  ],
  "lastMessage": {
    "content": "The analysis shows 12.5% growth...",
    "role": "agent",
    "createdAt": "2025-01-15T10:15:00Z"
  },
  "tags": ["sales", "q1-2025"],
  "contextSummary": "User requested Q1 sales analysis. Agent retrieved data and found 12.5% growth trend.",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

### Message Examples

**User message:**
```json
{
  "_id": "msg-001",
  "conversationId": "67890abc12345def",
  "role": "user",
  "messageType": "text",
  "content": "Please analyze this file",
  "attachments": ["https://s3.amazonaws.com/bucket/sales.xlsx"],
  "createdBy": "user-john",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**Agent with tool call:**
```json
{
  "_id": "msg-002",
  "conversationId": "67890abc12345def",
  "role": "agent",
  "messageType": "tool_call",
  "content": "Fetching sales data...",
  "agentId": "agent-analyst-001",
  "toolCalls": [
    {
      "id": "call_db_001",
      "type": "mcp_tool",
      "function": {
        "name": "database_query",
        "arguments": "{\"query\":\"SELECT * FROM sales...\"}"
      }
    }
  ],
  "createdAt": "2025-01-15T10:00:01Z"
}
```

**Tool result:**
```json
{
  "_id": "msg-003",
  "conversationId": "67890abc12345def",
  "role": "tool",
  "messageType": "tool_result",
  "name": "database_query",
  "content": "Query completed",
  "toolResults": [
    {
      "toolCallId": "call_db_001",
      "toolName": "database_query",
      "result": { "rows": [...] },
      "success": true,
      "executionTime": 450
    }
  ],
  "createdAt": "2025-01-15T10:00:02Z"
}
```

**Agent final response:**
```json
{
  "_id": "msg-004",
  "conversationId": "67890abc12345def",
  "role": "agent",
  "messageType": "text",
  "content": "Analysis complete. Growth: 12.5%",
  "agentId": "agent-analyst-001",
  "attachments": ["document:doc-report-xyz"],
  "usage": {
    "promptTokens": 450,
    "completionTokens": 120,
    "totalTokens": 570
  },
  "latency": 2300,
  "createdAt": "2025-01-15T10:00:05Z"
}
```

---

## Security

### Authentication
- JWT validation on WebSocket connection (WsJwtAdapter)
- Extract userId/agentId from token claims

### Authorization
- Verify conversation access before joining
- Check participant membership

### Rate Limiting
```typescript
@UseGuards(ThrottlerGuard)
@Throttle(20, 60) // 20 messages per minute
@SubscribeMessage('message:send')
```

### Input Validation
- Validate all DTOs with class-validator
- Sanitize message content (prevent XSS)

---

## Monitoring

### Connection Metrics
```typescript
setInterval(() => {
  const connectedSockets = io.sockets.sockets.size;
  const connectedUsers = await redis.scard('users:online');
  const connectedAgents = await redis.scard('agents:online');

  logger.log(`Connections: ${connectedSockets} (Users: ${connectedUsers}, Agents: ${connectedAgents})`);
}, 60000);
```

### Health Check
```typescript
@Get('health')
async health() {
  const socketsCount = this.chatGateway.server.sockets.sockets.size;

  return {
    status: 'ok',
    websocket: {
      connected: socketsCount,
      healthy: socketsCount >= 0
    }
  };
}
```

---

## Testing

### Unit Tests
```typescript
describe('ChatGateway', () => {
  it('should connect user', async () => {
    const socket = createMockSocket({ userId: 'user-123' });
    await gateway.handleConnection(socket);
    expect(socket.emit).toHaveBeenCalledWith('connected', { userId: 'user-123' });
  });
});
```

### Integration Tests
```typescript
describe('Chat WebSocket (e2e)', () => {
  it('should send and receive messages', (done) => {
    socket.emit('message:send', { conversationId: 'conv-123', content: 'Hello' });
    socket.on('message:new', (message) => {
      expect(message.content).toBe('Hello');
      done();
    });
  });
});
```

---

## Deployment

### Environment Variables
```bash
PORT=3003
MONGODB_URI=mongodb://172.16.3.20:27017
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-here
```

### Production Config
```typescript
// Enable Redis adapter for multi-instance
const redisAdapter = createAdapter(pubClient, subClient);
io.adapter(redisAdapter);

// CORS for production
app.enableCors({
  origin: 'https://portal.yourdomain.com',
  credentials: true
});
```

---

## Summary

### ✅ Simplified Design
- Conversation: Chỉ `contextSummary` (string)
- Message: `attachments` as string array
- Role: 'agent' thay vì 'assistant'
- Auto-summary: Mỗi 10 messages

### ✅ WebSocket Architecture
- Shared instance (HTTP + WebSocket cùng port)
- Redis adapter for horizontal scaling
- Event naming: `<resource>:<action>`

### ✅ Core Features
- Real-time messaging
- Tool calls tracking (MCP)
- Typing indicators
- Presence tracking
- File attachments (URL + document references)

### ✅ Modules
1. Conversation (Controller + Service)
2. Message (Controller + Service)
3. Chat (Gateway + Service)
