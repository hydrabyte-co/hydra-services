# Chat WebSocket Implementation Plan

## Tổng Quan

Plan này mô tả chi tiết các bước implementation cho tính năng Chat WebSocket trong AIWM Service.

**Timeline ước tính:** 5-7 ngày làm việc

**Dependencies:**
- AIWM service đang chạy
- MongoDB connected
- Redis connected
- IAM service (JWT authentication)
- UtilService (OpenAI text generation)

---

## Phase 1: Schema Updates & DTOs (Day 1)

### 1.1. Update Conversation Schema

**File:** `services/aiwm/src/modules/conversation/conversation.schema.ts`

**Tasks:**
- [ ] Remove `conversationId` field (dùng MongoDB `_id`)
- [ ] Update `participants` structure:
  ```typescript
  participants: Array<{
    type: 'user' | 'agent';
    id: string;
    joined: Date;
  }>;
  ```
- [ ] Add `contextSummary: string` field
- [ ] Verify indexes
- [ ] Test schema với sample data

**Output:** Updated conversation.schema.ts

---

### 1.2. Update Message Schema

**File:** `services/aiwm/src/modules/message/message.schema.ts`

**Tasks:**
- [ ] Change `role` enum: `'assistant'` → `'agent'`
- [ ] Update `attachments` to `string[]`
- [ ] Verify all existing fields (toolCalls, toolResults, thinking, usage)
- [ ] Add indexes
- [ ] Test schema với sample data

**Output:** Updated message.schema.ts

---

### 1.3. Create DTOs

**Location:** `services/aiwm/src/modules/conversation/dto/`

**Files to create:**
- [ ] `create-conversation.dto.ts`
  ```typescript
  import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

  export class CreateConversationDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsNotEmpty()
    agentId: string;

    @IsArray()
    @IsOptional()
    tags?: string[];
  }
  ```

- [ ] `update-conversation.dto.ts`
  ```typescript
  import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

  export class UpdateConversationDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(['active', 'archived', 'closed'])
    @IsOptional()
    status?: 'active' | 'archived' | 'closed';

    @IsArray()
    @IsOptional()
    tags?: string[];
  }
  ```

**Location:** `services/aiwm/src/modules/message/dto/`

**Files to create:**
- [ ] `create-message.dto.ts`
  ```typescript
  import {
    IsString, IsNotEmpty, IsEnum, IsOptional,
    IsArray, IsObject
  } from 'class-validator';

  export class CreateMessageDto {
    @IsString()
    @IsNotEmpty()
    conversationId: string;

    @IsEnum(['user', 'agent', 'system', 'tool'])
    role: 'user' | 'agent' | 'system' | 'tool';

    @IsString()
    @IsNotEmpty()
    content: string;

    @IsString()
    @IsOptional()
    participantId?: string;

    @IsEnum(['text', 'thinking', 'tool_call', 'tool_result', 'error', 'system'])
    @IsOptional()
    type?: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'error' | 'system';

    @IsString()
    @IsOptional()
    parentId?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    attachments?: string[];

    @IsObject()
    @IsOptional()
    thinking?: {
      content: string;
      visible: boolean;
      duration: number;
    };

    @IsArray()
    @IsOptional()
    toolCalls?: any[];

    @IsArray()
    @IsOptional()
    toolResults?: any[];

    @IsObject()
    @IsOptional()
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };

    @IsOptional()
    latency?: number;

    @IsString()
    @IsOptional()
    error?: string;

    @IsEnum(['sending', 'sent', 'delivered', 'failed'])
    @IsOptional()
    status?: 'sending' | 'sent' | 'delivered' | 'failed';
  }
  ```

**Output:** All DTOs created and validated

---

### 1.4. Create AttachmentHelper

**File:** `services/aiwm/src/modules/message/attachment.helper.ts`

**Tasks:**
- [ ] Implement `getType(attachment: string)`
- [ ] Implement `getDocumentId(attachment: string)`
- [ ] Implement `getFilenameFromUrl(url: string)`
- [ ] Implement `parse(attachment: string)`
- [ ] Implement `createDocumentAttachment(documentId: string)`
- [ ] Implement `isValid(attachment: string)`
- [ ] Write unit tests

**Output:** attachment.helper.ts với full functionality

---

## Phase 2: Conversation Module (Day 2)

### 2.1. Conversation Controller

**File:** `services/aiwm/src/modules/conversation/conversation.controller.ts`

**Tasks:**
- [ ] Implement `POST /conversations` - Create conversation
- [ ] Implement `GET /conversations` - List conversations (pagination, filter by userId/agentId)
- [ ] Implement `GET /conversations/:id` - Get conversation detail
- [ ] Implement `PUT /conversations/:id` - Update conversation
- [ ] Implement `DELETE /conversations/:id` - Soft delete
- [ ] Add Swagger decorators
- [ ] Add JwtAuthGuard
- [ ] Add error handling decorators

**Sample:**
```typescript
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiTags('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @ApiCreateErrors()
  async create(
    @Body() dto: CreateConversationDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.conversationService.create(dto, context);
  }

  @Get()
  @ApiReadErrors({ notFound: false })
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.conversationService.findAll(query, context);
  }

  // ... other endpoints
}
```

**Output:** conversation.controller.ts fully implemented

---

### 2.2. Conversation Service

**File:** `services/aiwm/src/modules/conversation/conversation.service.ts`

**Tasks:**
- [ ] Extend BaseService
- [ ] Implement create logic (add creator to participants)
- [ ] Implement findAll with filtering (by userId, agentId, status)
- [ ] Implement findById
- [ ] Implement update
- [ ] Implement soft delete
- [ ] Add helper method `addParticipant(conversationId, userId/agentId)`
- [ ] Add helper method `checkAccess(conversationId, userId/agentId)`

**Sample:**
```typescript
@Injectable()
export class ConversationService extends BaseService<Conversation> {
  constructor(@InjectModel(Conversation.name) model: Model<Conversation>) {
    super(model);
  }

  async create(dto: CreateConversationDto, context: RequestContext) {
    // Add creator to participants
    const conversation = await super.create({
      ...dto,
      participants: [
        {
          type: 'user',
          id: context.userId,
          joined: new Date(),
        },
        {
          type: 'agent',
          id: dto.agentId,
          joined: new Date(),
        },
      ],
    }, context);

    return conversation;
  }

  async checkAccess(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await this.model.findById(conversationId);
    if (!conversation) return false;

    return conversation.participants.some(p => p.id === userId);
  }

  // ... other methods
}
```

**Output:** conversation.service.ts với full business logic

---

### 2.3. Update Conversation Module

**File:** `services/aiwm/src/modules/conversation/conversation.module.ts`

**Tasks:**
- [ ] Import ConversationController
- [ ] Import ConversationService
- [ ] Export ConversationService (để Chat module dùng)
- [ ] Register schema

**Output:** conversation.module.ts fully configured

---

## Phase 3: Message Module (Day 3)

### 3.1. Message Controller

**File:** `services/aiwm/src/modules/message/message.controller.ts`

**Tasks:**
- [ ] Implement `POST /messages` - Create message (fallback REST)
- [ ] Implement `GET /messages` - List messages by conversationId
- [ ] Implement `GET /messages/:id` - Get message detail
- [ ] Implement `DELETE /messages/:id` - Delete message
- [ ] Add Swagger decorators
- [ ] Add JwtAuthGuard
- [ ] Add validation

**Sample:**
```typescript
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiTags('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @ApiCreateErrors()
  async create(
    @Body() dto: CreateMessageDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.messageService.create(dto, context);
  }

  @Get()
  @ApiReadErrors({ notFound: false })
  async findAll(
    @Query() query: PaginationQueryDto & { conversationId?: string },
    @CurrentUser() context: RequestContext,
  ) {
    return this.messageService.findAll(query, context);
  }

  // ... other endpoints
}
```

**Output:** message.controller.ts fully implemented

---

### 3.2. Message Service with Auto-Summary

**File:** `services/aiwm/src/modules/message/message.service.ts`

**Tasks:**
- [ ] Extend BaseService
- [ ] Override `create()` method:
  - Save message
  - Update conversation stats (totalMessages++, totalTokens, lastMessage)
  - Check if `totalMessages % 10 === 0` → trigger summary generation
- [ ] Implement `generateConversationSummary(conversationId)` (private)
  - Get last 20 messages
  - Build conversation text
  - Call UtilService.generateText()
  - Update conversation.contextSummary
- [ ] Implement findByConversation(conversationId, pagination)
- [ ] Add validation for attachments (AttachmentHelper.isValid)

**Sample:**
```typescript
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
    // Validate attachments
    if (dto.attachments) {
      const invalid = dto.attachments.find(att => !AttachmentHelper.isValid(att));
      if (invalid) {
        throw new BadRequestException(`Invalid attachment: ${invalid}`);
      }
    }

    // Save message
    const message = await super.create(dto, context);

    // Update conversation
    const conversation = await this.conversationService.findById(dto.conversationId);
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
      this.generateConversationSummary(dto.conversationId).catch(err => {
        console.error('Failed to generate summary:', err);
      });
    }

    return message;
  }

  private async generateConversationSummary(conversationId: string) {
    // Implementation as documented
  }

  // ... other methods
}
```

**Output:** message.service.ts với auto-summary

---

### 3.3. Update Message Module

**File:** `services/aiwm/src/modules/message/message.module.ts`

**Tasks:**
- [ ] Import MessageController
- [ ] Import MessageService
- [ ] Import ConversationModule (để dùng ConversationService)
- [ ] Import UtilModule (để dùng UtilService)
- [ ] Export MessageService (để Chat module dùng)
- [ ] Register schema

**Output:** message.module.ts fully configured

---

## Phase 4: Chat Module - WebSocket Gateway (Day 4-5)

### 4.1. Create Chat Module Structure

**Tasks:**
- [ ] Create folder `services/aiwm/src/modules/chat/`
- [ ] Create `chat.module.ts`
- [ ] Create `chat.gateway.ts`
- [ ] Create `chat.service.ts`
- [ ] Create `dto/` folder
- [ ] Create DTOs:
  - `join-conversation.dto.ts`
  - `send-message.dto.ts`
  - `typing.dto.ts`

---

### 4.2. Chat Service (Redis Integration)

**File:** `services/aiwm/src/modules/chat/chat.service.ts`

**Tasks:**
- [ ] Inject Redis client
- [ ] Inject ConversationService
- [ ] Inject MessageService
- [ ] Implement `handleAgentConnect(socketId, agentId)`
  - SADD agents:online
  - HSET agent:{agentId} socketId connectedAt
  - Update Agent.status = 'online'
- [ ] Implement `handleAgentDisconnect(agentId)`
  - SREM agents:online
  - DEL agent:{agentId}
  - Update Agent.status = 'offline'
- [ ] Implement `handleUserConnect(socketId, userId)`
  - SADD users:online
  - HSET user:{userId} socketId connectedAt
- [ ] Implement `handleUserDisconnect(userId)`
  - SREM users:online
  - DEL user:{userId}
- [ ] Implement `checkConversationAccess(conversationId, userId)`
- [ ] Implement `addToConversationMembers(conversationId, userId)`
  - SADD conversation:{id}:members {userId}
- [ ] Implement `removeFromConversationMembers(conversationId, userId)`
  - SREM conversation:{id}:members {userId}
- [ ] Implement `getMessageHistory(conversationId, limit = 50)`
- [ ] Implement `saveMessage(dto)` - Call MessageService.create()
- [ ] Implement `forwardToAgent(conversationId, message)`
  - Get conversation.agentId
  - Check if agent online (SISMEMBER agents:online)
  - Get agent socketId (HGET agent:{agentId} socketId)
  - Return { agentId, socketId, isOnline }
- [ ] Implement `setTypingIndicator(conversationId, userId)`
  - SETEX conversation:{id}:typing:{userId} 3 "typing"
- [ ] Implement `removeTypingIndicator(conversationId, userId)`
  - DEL conversation:{id}:typing:{userId}

**Sample:**
```typescript
@Injectable()
export class ChatService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private conversationService: ConversationService,
    private messageService: MessageService,
    private agentService: AgentService,
  ) {}

  async handleAgentConnect(socketId: string, agentId: string) {
    await this.redis.sadd('agents:online', agentId);
    await this.redis.hset(`agent:${agentId}`, {
      socketId,
      connectedAt: new Date().toISOString(),
    });

    // Update agent status in DB
    await this.agentService.model.updateOne(
      { _id: agentId },
      { $set: { status: 'online' } },
    );
  }

  async forwardToAgent(conversationId: string, message: any) {
    const conversation = await this.conversationService.findById(conversationId);
    const agentId = conversation.agentId;

    // Check if agent online
    const isOnline = await this.redis.sismember('agents:online', agentId);

    if (!isOnline) {
      return { agentId, isOnline: false };
    }

    // Get agent socketId
    const agentData = await this.redis.hgetall(`agent:${agentId}`);
    const socketId = agentData.socketId;

    return { agentId, socketId, isOnline: true };
  }

  // ... other methods
}
```

**Output:** chat.service.ts với full Redis integration

---

### 4.3. Chat Gateway

**File:** `services/aiwm/src/modules/chat/chat.gateway.ts`

**Tasks:**
- [ ] Implement `handleConnection(client: Socket)`
  - Extract userId/agentId from JWT
  - Call chatService.handleAgentConnect() or handleUserConnect()
  - Emit 'connected' event
- [ ] Implement `handleDisconnect(client: Socket)`
  - Call chatService.handleAgentDisconnect() or handleUserDisconnect()
- [ ] Implement `@SubscribeMessage('conversation:join')`
  - Verify access
  - Join Socket.io room
  - Add to Redis set
  - Emit 'conversation:joined'
  - Send message history
- [ ] Implement `@SubscribeMessage('conversation:leave')`
  - Leave room
  - Remove from Redis set
  - Emit 'conversation:left'
- [ ] Implement `@SubscribeMessage('message:send')`
  - Save message via chatService.saveMessage()
  - Broadcast to room: `io.to('conversation:{id}').emit('message:new', message)`
  - If from user, forward to agent
  - Emit 'message:sent' confirmation
- [ ] Implement `@SubscribeMessage('typing:start')`
  - Set Redis key with TTL
  - Broadcast to others in room
- [ ] Implement `@SubscribeMessage('typing:stop')`
  - Remove Redis key
  - Broadcast to others in room
- [ ] Add error handling
- [ ] Add logging

**Sample:** (See architecture document)

**Output:** chat.gateway.ts fully functional

---

### 4.4. Chat Module Configuration

**File:** `services/aiwm/src/modules/chat/chat.module.ts`

**Tasks:**
- [ ] Import ChatGateway
- [ ] Import ChatService
- [ ] Import ConversationModule
- [ ] Import MessageModule
- [ ] Import AgentModule
- [ ] Import Redis module
- [ ] Export ChatService (if needed)

**Sample:**
```typescript
@Module({
  imports: [
    ConversationModule,
    MessageModule,
    AgentModule,
    // Redis already imported in AppModule
  ],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
```

**Output:** chat.module.ts configured

---

### 4.5. Update AppModule

**File:** `services/aiwm/src/app/app.module.ts`

**Tasks:**
- [ ] Import ChatModule
- [ ] Add to imports array
- [ ] Verify Redis module is imported
- [ ] Verify all dependencies

**Output:** AppModule updated

---

## Phase 5: Testing (Day 6)

### 5.1. Unit Tests

**Files to test:**
- [ ] `attachment.helper.spec.ts`
  - Test parse() with URL
  - Test parse() with document:
  - Test isValid()
  - Test createDocumentAttachment()

- [ ] `conversation.service.spec.ts`
  - Test create()
  - Test checkAccess()
  - Test addParticipant()

- [ ] `message.service.spec.ts`
  - Test create() with auto-summary trigger
  - Test generateConversationSummary()
  - Test attachment validation

- [ ] `chat.service.spec.ts`
  - Test handleAgentConnect()
  - Test forwardToAgent()
  - Test typing indicators

- [ ] `chat.gateway.spec.ts`
  - Test handleConnection()
  - Test conversation:join
  - Test message:send

**Output:** All unit tests passing

---

### 5.2. Integration Tests

**Test scenarios:**

**Conversation API:**
- [ ] Create conversation
- [ ] List conversations
- [ ] Get conversation detail
- [ ] Update conversation
- [ ] Delete conversation

**Message API:**
- [ ] Create message
- [ ] List messages by conversation
- [ ] Verify auto-summary after 10 messages

**WebSocket:**
- [ ] Agent connection
- [ ] User connection
- [ ] Join conversation
- [ ] Send message (user → agent)
- [ ] Send message (agent → user)
- [ ] Typing indicators
- [ ] Multiple users in same conversation
- [ ] Disconnect handling

**Sample test:**
```typescript
describe('Chat WebSocket (e2e)', () => {
  let app: INestApplication;
  let userSocket: Socket;
  let agentSocket: Socket;

  beforeAll(async () => {
    // Setup app and sockets
  });

  it('should allow user to join conversation', (done) => {
    userSocket.emit('conversation:join', { conversationId: 'conv-123' });

    userSocket.on('conversation:joined', (data) => {
      expect(data.conversationId).toBe('conv-123');
      done();
    });
  });

  it('should forward user message to agent', (done) => {
    userSocket.emit('message:send', {
      conversationId: 'conv-123',
      content: 'Hello agent'
    });

    agentSocket.on('message:from-user', (data) => {
      expect(data.content).toBe('Hello agent');
      done();
    });
  });
});
```

**Output:** All integration tests passing

---

### 5.3. Manual Testing

**Tools:**
- Postman (REST API)
- Socket.io client (WebSocket)
- Browser console

**Test checklist:**
- [ ] Create conversation via API
- [ ] Connect as user via WebSocket
- [ ] Connect as agent via WebSocket
- [ ] Join conversation
- [ ] Send messages back and forth
- [ ] Test attachments (URL and document:)
- [ ] Verify context summary generation after 10 messages
- [ ] Test typing indicators
- [ ] Test disconnect/reconnect
- [ ] Verify Redis data (agents:online, users:online, conversation members)

**Output:** All manual tests successful

---

## Phase 6: Documentation & Deployment (Day 7)

### 6.1. API Documentation

**Tasks:**
- [ ] Verify Swagger docs for Conversation endpoints
- [ ] Verify Swagger docs for Message endpoints
- [ ] Add WebSocket event documentation to README
- [ ] Add sample curl commands
- [ ] Document error codes

**Output:** Complete API documentation

---

### 6.2. Update AIWM README

**File:** `services/aiwm/README.md`

**Tasks:**
- [ ] Add Conversation module section
- [ ] Add Message module section
- [ ] Add Chat module section
- [ ] Add WebSocket usage examples
- [ ] Add Redis requirements
- [ ] Update seed scripts (if any)

**Output:** Updated README

---

### 6.3. Environment Setup

**Tasks:**
- [ ] Document required environment variables
- [ ] Add `.env.example`:
  ```bash
  PORT=3003
  MONGODB_URI=mongodb://172.16.3.20:27017
  REDIS_HOST=localhost
  REDIS_PORT=6379
  JWT_SECRET=your-secret-here
  ```
- [ ] Verify Redis connection in production
- [ ] Test with multiple instances (if using Redis adapter)

**Output:** Environment configured

---

### 6.4. Deployment Checklist

- [ ] Build service: `npx nx build aiwm`
- [ ] Run linter: `npx nx lint aiwm`
- [ ] Run tests: `npx nx test aiwm`
- [ ] Verify MongoDB connection
- [ ] Verify Redis connection
- [ ] Start service: `npx nx serve aiwm`
- [ ] Test health endpoint: `curl http://localhost:3003/health`
- [ ] Test WebSocket connection
- [ ] Monitor logs for errors
- [ ] Test with real frontend (if available)

**Output:** Service deployed and running

---

## Rollback Plan

Nếu có issues trong production:

1. **Disable WebSocket:**
   - Comment out ChatModule import in AppModule
   - Restart service
   - Users can still use REST API fallback

2. **Revert Schema Changes:**
   - Run migration script to revert Conversation/Message schemas
   - Restore from backup nếu cần

3. **Redis Issues:**
   - WebSocket sẽ vẫn hoạt động (single instance)
   - Chỉ mất khả năng horizontal scaling

---

## Dependencies & Tools

### NPM Packages (already installed)
- `@nestjs/websockets`
- `@nestjs/platform-socket.io`
- `socket.io`
- `ioredis` (already in use)

### New Dependencies (nếu cần)
```bash
# Redis adapter for Socket.io (nếu scaling)
npm install @socket.io/redis-adapter

# Socket.io client (for testing)
npm install socket.io-client -D
```

---

## Success Criteria

### Phase 1-3: REST API
- ✅ Conversation CRUD API working
- ✅ Message CRUD API working
- ✅ Auto-summary generation working
- ✅ Attachments validation working
- ✅ Unit tests passing

### Phase 4: WebSocket
- ✅ Agent can connect
- ✅ User can connect
- ✅ User can join conversation
- ✅ Messages sent via WebSocket
- ✅ Messages received in real-time
- ✅ Typing indicators working
- ✅ Presence tracking working

### Phase 5: Testing
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ Manual testing successful
- ✅ No memory leaks
- ✅ No connection issues

### Phase 6: Deployment
- ✅ Service running stable
- ✅ Documentation complete
- ✅ Frontend can integrate
- ✅ Monitoring in place

---

## Risk Mitigation

### Risk 1: Redis Connection Issues
**Mitigation:**
- Add retry logic for Redis connection
- Add health check for Redis
- Fallback to single instance if Redis unavailable

### Risk 2: Auto-Summary Performance
**Mitigation:**
- Run summary generation in background (non-blocking)
- Add timeout for OpenAI API calls
- Cache recent messages to reduce DB queries

### Risk 3: WebSocket Scalability
**Mitigation:**
- Implement Redis adapter from start
- Load test with 1000+ concurrent connections
- Monitor memory usage

### Risk 4: Schema Migration
**Mitigation:**
- Test migration on staging first
- Backup database before migration
- Write rollback scripts

---

## Post-Implementation

### Monitoring
- [ ] Setup alerts for WebSocket connection count
- [ ] Monitor Redis memory usage
- [ ] Track message delivery latency
- [ ] Monitor context summary generation success rate

### Optimization
- [ ] Implement message pagination (load more)
- [ ] Add message caching (Redis)
- [ ] Optimize database queries
- [ ] Add compression for WebSocket messages

### Future Enhancements (V2)
- [ ] Streaming responses
- [ ] Message reactions
- [ ] Read receipts
- [ ] Voice messages
- [ ] Video calls (WebRTC)
- [ ] Rich message formatting
- [ ] Message search
- [ ] Export conversations

---

## Contact & Support

**Questions during implementation:**
- Check architecture docs: `docs/aiwm/CHAT-WEBSOCKET-ARCHITECTURE.md`
- Review simplified schema: `docs/aiwm/SIMPLIFIED-SCHEMA.md`
- Review scaling docs: `docs/aiwm/WEBSOCKET-SCALING-AND-SCHEMA.md`

**Need help?**
- Create issue in repository
- Contact backend team lead
