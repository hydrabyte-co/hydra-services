# Notification Service Requirements

**Document Version:** 2.0
**Date:** 2025-10-17
**Status:** Requirements & Design
**Service Name:** notification (noti)
**Port:** 3002
**Reference:** Template Service (Production-Ready Pattern)

---

## 📋 Executive Summary

This document outlines the requirements and technical design for the **Notification Service** - a real-time notification and messaging hub for the Hydra Services ecosystem. The service provides WebSocket-based real-time communication, queue-based event distribution, and persistent notification storage.

---

## 🎯 Objectives

1. Provide real-time notification delivery via WebSocket (Socket.IO)
2. Support event-driven architecture with BullMQ queue integration
3. Enable bidirectional communication between users, agents, and services
4. Store notification history with read/unread tracking
5. Support room-based broadcasting (user, org, agent rooms)
6. Scale to support 1,000 concurrent connections (CCU)
7. Integrate with existing services (IAM, Template) for event propagation

---

## 🏗️ Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                   Notification Service (Port 3002)          │
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │  REST API    │◄────────┤   MongoDB    │                │
│  │  Controllers │         │  (Storage)   │                │
│  └──────┬───────┘         └──────────────┘                │
│         │                                                   │
│         │                 ┌──────────────┐                │
│         ▼                 │    Redis     │                │
│  ┌──────────────┐◄────────┤  (BullMQ)    │                │
│  │   Service    │         └──────────────┘                │
│  │    Layer     │                                          │
│  └──────┬───────┘         ┌──────────────┐                │
│         │                 │   Socket.IO  │                │
│         ▼                 │   Gateway    │                │
│  ┌──────────────┐◄────────┤  (WebSocket) │                │
│  │   Queue      │         └──────┬───────┘                │
│  │  Processors  │                │                         │
│  └──────────────┘                ▼                         │
│                          [Connected Clients]               │
└─────────────────────────────────────────────────────────────┘
         ▲                           │
         │                           │
         │ Events via Queue          │ Real-time WS
         │                           │
┌────────┴──────────┐       ┌────────▼──────────┐
│  Template Service │       │   Web/Mobile      │
│  (template-events)│       │   Clients         │
└───────────────────┘       └───────────────────┘
┌───────────────────┐
│   IAM Service     │
│   (iam-events)    │
└───────────────────┘
```

### Process Model

**Single Process Architecture**
- API and WebSocket run on the same process (port 3002)
- Rationale:
  - Sufficient for 1k CCU target
  - Simplified deployment and debugging
  - Direct method calls between Gateway and Service layer
  - Reduced infrastructure complexity
  - Node.js can handle 10k+ concurrent connections

---

## 🏭 Production-Ready Features

### Health Check Endpoint

**Requirement:**

Provide a `/health` endpoint for monitoring and deployment orchestration.

**Endpoint:** `GET /health` (no authentication required)

**Response Format:**
```json
{
  "status": "ok",
  "info": {
    "version": "1.0.0",
    "service": "notification",
    "uptime": 3600.5,
    "environment": "production"
  },
  "details": {
    "database": {
      "status": "up",
      "responseTime": 15
    },
    "redis": {
      "status": "up",
      "responseTime": 2
    },
    "websocket": {
      "status": "up",
      "activeConnections": 247
    }
  }
}
```

**Status Codes:**
- `200 OK` - All systems healthy
- `503 Service Unavailable` - Any critical system down

**Implementation:**
```typescript
// health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private healthService: HealthService,
    private dbHealth: MongooseHealthIndicator,
    private redisHealth: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.healthService.check([
      () => this.dbHealth.pingCheck('database'),
      () => this.redisHealth.pingCheck('redis'),
      () => this.checkWebSocket(),
    ]);
  }
}
```

---

### Global Exception Filter

**Purpose:** Standardize error responses across all endpoints

**Features:**
- Catch all unhandled exceptions
- Format errors consistently
- Include correlation IDs for tracing
- Log errors appropriately
- Return user-friendly messages

**Implementation:**
```typescript
// filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const correlationId = request.headers['x-correlation-id'] || uuidv4();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: exception.message || 'Internal server error',
      correlationId: correlationId,
    };

    // Log error
    logger.error('Exception caught', {
      ...errorResponse,
      stack: exception.stack,
    });

    response.status(status).json(errorResponse);
  }
}
```

**Registration in main.ts:**
```typescript
app.useGlobalFilters(new GlobalExceptionFilter());
```

---

### Correlation ID Middleware

**Purpose:** Track requests across services for debugging

**Features:**
- Generate correlation ID if not present
- Pass correlation ID through all requests
- Include in logs and error responses
- Propagate to downstream services

**Implementation:**
```typescript
// middleware/correlation-id.middleware.ts
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
```

**Registration in app.module.ts:**
```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes('*');
  }
}
```

---

### Swagger Error Decorators

**Purpose:** Document error responses in OpenAPI/Swagger

**Available Decorators:**
- `@ApiCreateErrors()` - For POST endpoints
- `@ApiReadErrors()` - For GET endpoints
- `@ApiUpdateErrors()` - For PATCH/PUT endpoints
- `@ApiDeleteErrors()` - For DELETE endpoints

**Error Response Schema:**
```typescript
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: '2025-10-17T10:00:00Z' })
  timestamp: string;

  @ApiProperty({ example: '/notifications' })
  path: string;

  @ApiProperty({ example: 'POST' })
  method: string;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({ example: 'abc-123-def' })
  correlationId: string;

  @ApiProperty({ required: false })
  details?: any;
}
```

**Usage Example:**
```typescript
@Post()
@ApiCreateErrors()
@ApiCreatedResponse({ type: NotificationDto })
async create(@Body() dto: CreateNotificationDto) {
  return this.notificationService.create(dto);
}

@Get(':id')
@ApiReadErrors()
@ApiOkResponse({ type: NotificationDto })
async findOne(@Param('id') id: string) {
  return this.notificationService.findById(id);
}
```

---

### RBAC Integration

**Purpose:** Role-based access control using BaseService capabilities

**Permission Structure:**
```typescript
// Notification permissions
const permissions = {
  'notification.create': ['universe.owner', 'organization.admin'],
  'notification.read': ['universe.owner', 'organization.admin', 'organization.member'],
  'notification.update': ['universe.owner', 'organization.admin'],
  'notification.delete': ['universe.owner', 'organization.admin'],
  'notification.send': ['universe.owner', 'organization.admin'], // Internal API
};
```

**Controller Implementation (Modern Pattern):**
```typescript
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiTags('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiReadErrors()
  @ApiOkResponse({ type: [NotificationDto] })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    // BaseService handles RBAC and filtering
    return this.notificationService.findAll({
      userId: user.sub,
      orgId: user.orgId,
      roles: user.roles,
    }, query);
  }

  @Patch(':id/read')
  @ApiUpdateErrors()
  @ApiOkResponse({ type: NotificationDto })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    // Verify ownership before update
    return this.notificationService.markAsRead(id, user.sub);
  }

  @Delete(':id')
  @ApiDeleteErrors()
  @ApiOkResponse()
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    // BaseService soft delete with ownership check
    return this.notificationService.softDelete(id, {
      userId: user.sub,
      orgId: user.orgId,
      roles: user.roles,
    });
  }
}
```

**@CurrentUser Decorator:**
```typescript
// decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Set by JwtAuthGuard
  },
);

export interface AuthenticatedUser {
  sub: string;
  username: string;
  status: string;
  roles: string[];
  orgId: string;
  groupId?: string;
  agentId?: string;
  appId?: string;
}
```

---

### Audit Trail

**Purpose:** Track who created/updated resources

**Implementation:**

Using BaseSchema from `@hydrabyte/base`:
```typescript
@Schema({ timestamps: true })
export class Notification extends BaseSchema {
  // BaseSchema provides:
  // - createdAt (automatic)
  // - updatedAt (automatic)
  // - deletedAt (soft delete)
  // - createdBy (manual)
  // - updatedBy (manual)

  // Your fields...
}
```

**Service Layer:**
```typescript
async create(dto: CreateNotificationDto, userId: string) {
  const notification = await this.notificationModel.create({
    ...dto,
    createdBy: userId, // Audit trail
    metadata: {
      ...dto.metadata,
      userId: userId,
    },
  });

  return notification;
}

async update(id: string, dto: UpdateNotificationDto, userId: string) {
  const notification = await this.notificationModel.findByIdAndUpdate(
    id,
    {
      ...dto,
      updatedBy: userId, // Audit trail
      updatedAt: new Date(),
    },
    { new: true }
  );

  return notification;
}
```

---

### Logging Best Practices

**Structured Logging:**
```typescript
import { Logger } from '@nestjs/common';

export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async create(dto: CreateNotificationDto) {
    this.logger.log({
      message: 'Creating notification',
      event: dto.event,
      recipients: dto.recipients,
      correlationId: dto.metadata?.correlationId,
    });

    try {
      const notification = await this.notificationModel.create(dto);

      this.logger.log({
        message: 'Notification created successfully',
        notificationId: notification._id,
        event: dto.event,
      });

      return notification;
    } catch (error) {
      this.logger.error({
        message: 'Failed to create notification',
        error: error.message,
        stack: error.stack,
        dto: dto,
      });
      throw error;
    }
  }
}
```

---

## 🔌 WebSocket Implementation

### Socket.IO Configuration

**Namespace:** `/` (default namespace)

**Authentication:**
- JWT token from `Authorization` header: `Authorization: Bearer <token>`
- Token verification uses existing JWT infrastructure from IAM service
- Reuses `JwtService` from `@nestjs/jwt`

**Connection Flow:**
```
1. Client connects with JWT in header
2. Server verifies token using JwtService
3. Extract user info: { sub, username, orgId, roles, agentId }
4. Auto-join rooms:
   - user:{userId}  (always)
   - org:{orgId}    (always)
5. Emit 'connected' event to client
```

**Room Convention:**
- `user:{userId}` - Private user room
- `org:{orgId}` - Organization broadcast room
- `agent:{agentId}` - Agent-specific room (join on-demand)

### WebSocket Events

#### Server → Client

| Event | Description | Payload |
|-------|-------------|---------|
| `connected` | Connection established | `{ userId: string }` |
| `new_notification` | New notification received | `Notification` object |
| `notification_read` | Notification marked as read | `{ id: string, userId: string }` |
| `error` | Error occurred | `{ message: string, code?: string }` |

#### Client → Server

| Event | Description | Payload | Response |
|-------|-------------|---------|----------|
| `join_agent_room` | Join agent room | `{ agentId: string }` | `{ success: boolean }` |
| `leave_agent_room` | Leave agent room | `{ agentId: string }` | `{ success: boolean }` |
| `send_message` | Send message to room | `{ room: string, title: string, message: string, data?: any }` | `{ success: boolean, id: string }` |

### Gateway Structure

```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  // Authentication in handleConnection
  // Auto-join user and org rooms
  // Handle client messages
  // Broadcast methods: broadcastToUser, broadcastToOrg, broadcastToAgent
}
```

---

## 📡 Queue Integration (BullMQ)

### Queue Naming Convention

**Pattern:** `{service}-{purpose}`

**Notification Service Queues:**
- `noti-events` - Internal events (delivery status, metrics)
- `noti-incoming` - Events from other services

**Other Services:**
- `template-events` - Template Service emits events (category.created, product.created, etc.)
- `iam-events` - IAM Service emits events (user.created, organization.updated, etc.)
- `cbm-events` - CBM Service events (future)

### Event Flow

```
Template Service                 Notification Service              WebSocket Clients
     │                                  │                                │
     │ Emit: category.created           │                                │
     ├──────────────────────────────────►│                                │
     │  Queue: template-events           │                                │
     │                                   │                                │
     │                              ┌────▼─────┐                          │
     │                              │Processor │                          │
     │                              │ Handles  │                          │
     │                              │  Event   │                          │
     │                              └────┬─────┘                          │
     │                                   │                                │
     │                              ┌────▼─────┐                          │
     │                              │  Save    │                          │
     │                              │  to DB   │                          │
     │                              └────┬─────┘                          │
     │                                   │                                │
     │                              ┌────▼─────┐                          │
     │                              │Broadcast │                          │
     │                              │ via WS   ├────────────────────────► │
     │                              └──────────┘    to org:{orgId}        │
```

### Queue Processors

**ExternalEventsProcessor**
- Subscribes to: `template-events`, `iam-events`
- Processes events from other services
- Creates notifications in database
- Broadcasts to appropriate rooms via Gateway

**Example:**
```typescript
@Processor('template-events')
export class TemplateEventsProcessor {
  @Process('template.category.created')
  async handleCategoryCreated(job: Job) {
    // 1. Create notification in DB
    // 2. Map recipients to rooms
    // 3. Broadcast via Gateway
  }
}
```

---

## 🗂️ Notification Categories

### Category Enum Structure

**Convention:** `{service}.{entity}.{action}` or `{domain}.{action}`

### Category Definitions

#### System Categories
- `system.announcement` - System-wide announcements from admin
- `system.maintenance` - Maintenance notifications
- `system.update` - Feature updates and releases

#### IAM Service Events
- `iam.user.created` - New user created
- `iam.user.updated` - User profile updated
- `iam.user.deleted` - User deleted
- `iam.organization.created` - Organization created
- `iam.organization.updated` - Organization updated

#### Template Service Events
- `template.category.created` - Category created
- `template.category.updated` - Category updated
- `template.product.created` - Product created
- `template.product.updated` - Product updated
- `template.report.completed` - Report generation completed
- `template.report.failed` - Report generation failed

#### CBM Service Events (Future)
- `cbm.order.created` - Order created
- `cbm.order.updated` - Order status updated
- *(more to be defined)*

#### Notification Service Events
- `noti.delivered` - Notification successfully delivered
- `noti.failed` - Notification delivery failed

#### Alert Categories
- `alert.error` - System error alerts
- `alert.warning` - Warning notifications
- `alert.threshold` - Threshold exceeded (quota, limits, etc.)

#### Agent Categories
- `agent.connected` - Agent connected to system
- `agent.disconnected` - Agent disconnected
- `agent.thinking` - Agent processing/thinking
- `agent.tool_use` - Agent using a tool
- `agent.tool_result` - Tool execution result
- `agent.request_help` - Agent requesting assistance
- `agent.completed` - Agent execution completed
- `agent.error` - Agent encountered error
- `agent.message` - Message from agent

#### User Categories
- `user.message` - Message from user

---

## 🗄️ Database Schema

**Note:** This section is reserved for detailed discussion and finalization.

### Preliminary Structure

The Notification entity will include:

**Core Fields:**
- `category` - Notification category (enum)
- `title` - Notification title
- `message` - Notification message/body

**Source Object (Dynamic):**
- `service` - Source service name
- `entity` - Source entity type
- `id` - Source entity ID
- `userId` - Source user ID (if applicable)
- `agentId` - Source agent ID (if applicable)

**Recipients Object (Dynamic):**
- `userIds[]` - Target user IDs → map to `user:{id}` rooms
- `agentIds[]` - Target agent IDs → map to `agent:{id}` rooms
- `orgIds[]` - Target org IDs → map to `org:{id}` rooms
- `service` - Target service for queue routing
- `queue` - Target queue name

**Validation:** At least one recipient target is required (userIds, agentIds, orgIds, or service+queue)

**Additional Fields:**
- `data` - Flexible JSON payload for category-specific data
- `deliveryStatus` - Status enum: pending, delivered, failed
- `readByUserIds[]` - Array of user IDs who have read the notification
- `metadata` - Optional metadata (non-business-logic)

**Indexes:**
- `recipients.userIds` + `createdAt`
- `recipients.orgIds` + `createdAt`
- `recipients.agentIds` + `createdAt`
- `category` + `createdAt`
- `deliveryStatus`
- `source.service` + `source.entity`

**Base Schema:** Extends `@hydrabyte/base/BaseSchema` for:
- `createdAt`, `updatedAt`
- `deletedAt` (soft delete support)
- `createdBy`, `updatedBy` (audit trail)

---

## 🔐 Authentication & Authorization

### JWT Token Verification

**Reuse Existing Infrastructure:**
- Import `JwtModule` from `@nestjs/jwt`
- Use `JwtService.verifyAsync()` for token validation
- Extract payload: `{ sub, username, orgId, roles, agentId, ... }`

**No custom JWT strategy needed** - directly use JwtService in Gateway

### Authorization Rules

- Users can only read their own notifications
- Users can send messages to rooms they belong to
- Organization-level broadcasts require appropriate roles (future enhancement)
- Internal API endpoints (`POST /notifications/send`) require service-to-service auth (future)

---

## 📚 API Endpoints

### Public Endpoints (Require JWT Auth)

#### Get Notifications
```
GET /notifications
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20, max: 100)
  - category: string (optional, filter by category)
  - unreadOnly: boolean (optional, default: false)

Response: 200 OK
{
  "data": [Notification[]],
  "total": number,
  "page": number,
  "limit": number,
  "totalPages": number
}
```

#### Get Unread Count
```
GET /notifications/unread-count

Response: 200 OK
{
  "count": number
}
```

#### Mark as Read
```
PATCH /notifications/:id/read

Response: 200 OK
{
  "id": string,
  "readByUserIds": string[],
  "success": true
}
```

#### Mark All as Read
```
PATCH /notifications/read-all

Response: 200 OK
{
  "updatedCount": number,
  "success": true
}
```

#### Delete Notification
```
DELETE /notifications/:id

Response: 200 OK
{
  "id": string,
  "success": true
}
```

### Internal Endpoints (Future: Service-to-Service Auth)

#### Send Notification
```
POST /notifications/send
Body: {
  "category": string,
  "title": string,
  "message": string,
  "source": {
    "service": string,
    "entity": string,
    "id": string,
    "userId": string,
    "agentId": string
  },
  "recipients": {
    "userIds": string[],
    "agentIds": string[],
    "orgIds": string[],
    "service": string,
    "queue": string
  },
  "data": object
}

Response: 201 Created
{
  "id": string,
  "category": string,
  "deliveryStatus": string,
  "success": true
}
```

---

## 📦 Module Structure

```
services/notification/
├── src/
│   ├── modules/
│   │   └── notification/
│   │       ├── notification.schema.ts
│   │       ├── notification.service.ts
│   │       ├── notification.controller.ts
│   │       ├── notification.module.ts
│   │       └── dto/
│   │           ├── create-notification.dto.ts
│   │           ├── update-notification.dto.ts
│   │           └── pagination-query.dto.ts
│   ├── gateways/
│   │   └── notification.gateway.ts
│   ├── queues/
│   │   ├── queue.module.ts
│   │   ├── producers/
│   │   │   └── notification.producer.ts
│   │   └── processors/
│   │       ├── template-events.processor.ts
│   │       ├── iam-events.processor.ts
│   │       └── notification-delivery.processor.ts (phase 2)
│   ├── config/
│   │   ├── redis.config.ts
│   │   └── queue.config.ts
│   ├── app.module.ts
│   └── main.ts
├── README.md
└── package.json
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Service Config
PORT=3002
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/hydra-noti

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=R4md0m_S3cr3t

# WebSocket
WS_CORS_ORIGIN=*
```

### Redis Configuration

**Same as Template Service:**
```typescript
// redis.config.ts
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
};
```

---

## 🎯 Scaling & Performance

### Concurrency Target

**1,000 CCU (Concurrent Connections)**

### Performance Requirements

- WebSocket connection time: < 500ms
- Message broadcast latency: < 100ms
- API response time: < 200ms (p95)
- Queue processing: < 1s per event

### Scaling Strategy

#### Phase 1: Single Instance (Current Design)
- Single process handles both API and WebSocket
- Sufficient for 1k CCU
- Vertical scaling (increase CPU/memory)

#### Phase 2: Horizontal Scaling (Future)
When exceeding capacity:

**Socket.IO Redis Adapter:**
```typescript
import { RedisAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

// Enable multi-instance WebSocket scaling
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

**Sticky Sessions:**
- Load balancer routes same client to same instance
- Required for Socket.IO multi-instance

### Rate Limiting

**Throttle Configuration:**
```typescript
// app.module.ts
ThrottlerModule.forRoot([{
  ttl: 60000,      // 60 seconds
  limit: 100,      // 100 requests per minute
}]),

// In Gateway
@Throttle({ default: { limit: 10, ttl: 60000 } })
@SubscribeMessage('send_message')
async handleClientMessage(...) {}
```

---

## 🔗 Integration with Existing Services

### Template Service Integration

**Events to Subscribe:**
- `template.category.created`
- `template.category.updated`
- `template.product.created`
- `template.product.updated`
- `template.report.completed`
- `template.report.failed`

**Implementation:**
1. Template Service emits events to `template-events` queue
2. Notification Service subscribes to `template-events`
3. TemplateEventsProcessor handles events
4. Creates notifications and broadcasts to relevant rooms

**Example Event Payload:**
```typescript
{
  event: 'template.category.created',
  data: {
    _id: 'category-id',
    name: 'Electronics',
    createdBy: 'user-id',
    orgId: 'org-id',
    ...
  },
  timestamp: '2025-10-17T10:00:00Z'
}
```

### IAM Service Integration

**Events to Subscribe:**
- `iam.user.created`
- `iam.user.updated`
- `iam.user.deleted`
- `iam.organization.created`
- `iam.organization.updated`

**Authentication:**
- Notification Service uses IAM's JWT tokens
- Verifies tokens using shared JWT_SECRET
- Extracts user context from token payload

### CBM Service Integration (Future)

**Reserved for future implementation**
- Order events
- Payment events
- Business workflow events

---

## 📋 Implementation Checklist

### Phase 1: Core Features

**Service Setup:**
- [ ] Create service structure using Nx CLI
- [ ] Setup main.ts and app.module.ts
- [ ] Configure MongoDB connection
- [ ] Configure Redis connection
- [ ] Setup health check endpoint
- [ ] Setup GlobalExceptionFilter
- [ ] Setup CorrelationIdMiddleware
- [ ] Configure Swagger/OpenAPI
- [ ] Add error response schemas

**Database & Schema:**
- [ ] Finalize notification schema design
- [ ] Create Mongoose schema with BaseSchema
- [ ] Define indexes
- [ ] Create DTOs with validation

**WebSocket Implementation:**
- [ ] Create NotificationGateway
- [ ] Implement JWT authentication in handleConnection
- [ ] Implement auto-join user/org rooms
- [ ] Implement join/leave agent room handlers
- [ ] Implement client message handler
- [ ] Implement broadcast methods

**REST API:**
- [ ] Create NotificationController with @CurrentUser pattern
- [ ] Add Swagger decorators (@ApiTags, @ApiOperation)
- [ ] Add error decorators (@ApiCreateErrors, @ApiReadErrors, etc.)
- [ ] Implement GET /health (no auth)
- [ ] Implement GET /notifications with pagination
- [ ] Implement GET /notifications/unread-count
- [ ] Implement PATCH /notifications/:id/read
- [ ] Implement PATCH /notifications/read-all
- [ ] Implement DELETE /notifications/:id (soft delete)
- [ ] Implement POST /notifications/send (internal)

**Service Layer:**
- [ ] Create NotificationService extending BaseService
- [ ] Implement CRUD operations with RBAC
- [ ] Implement room mapping logic
- [ ] Implement read status tracking
- [ ] Add audit trail (createdBy, updatedBy)
- [ ] Add structured logging
- [ ] Integrate with Gateway for broadcasting
- [ ] Implement ownership verification

**Queue Integration:**
- [ ] Setup QueueModule with BullMQ
- [ ] Create queue.config.ts with queue names
- [ ] Create NotificationProducer
- [ ] Create TemplateEventsProcessor
- [ ] Create IAMEventsProcessor
- [ ] Test queue event flow

**Testing:**
- [ ] Build service successfully (npx nx build notification)
- [ ] Verify no TypeScript errors
- [ ] Test health endpoint: GET /health
- [ ] Test WebSocket connection with JWT
- [ ] Test WebSocket authentication failure
- [ ] Test room joining/leaving
- [ ] Test message broadcasting to multiple rooms
- [ ] Test API endpoints with curl (with JWT)
- [ ] Test pagination on GET /notifications
- [ ] Test RBAC permissions (different roles)
- [ ] Test soft delete functionality
- [ ] Test queue event processing (all 4 event types)
- [ ] Test correlation ID propagation
- [ ] Test GlobalExceptionFilter error responses
- [ ] Test integration with Template Service
- [ ] Test Swagger API documentation at /api-docs

**Documentation:**
- [ ] Create README with setup instructions
- [ ] Document API endpoints with examples
- [ ] Document WebSocket events
- [ ] Document queue integration patterns

### Phase 2: Advanced Features (Future)

- [ ] Email notifications via external service
- [ ] SMS notifications via external service
- [ ] Push notifications (FCM/APNS)
- [ ] Notification templates management
- [ ] User notification preferences
- [ ] Scheduled notifications
- [ ] Advanced filtering and search
- [ ] Analytics and reporting
- [ ] Multi-instance scaling with Redis Adapter

---

## ✅ Production-Ready Checklist Summary

This section summarizes the production-ready features that align with Template Service patterns:

| Feature | Status | Priority | Template Alignment |
|---------|--------|----------|-------------------|
| **Health Check Endpoint** | 📋 Documented | High | ✅ Aligned |
| **GlobalExceptionFilter** | 📋 Documented | High | ✅ Aligned |
| **CorrelationIdMiddleware** | 📋 Documented | High | ✅ Aligned |
| **Swagger Documentation** | 📋 Documented | High | ✅ Aligned |
| **Swagger Error Decorators** | 📋 Documented | High | ✅ Aligned |
| **RBAC Integration** | 📋 Documented | High | ✅ Aligned |
| **Modern Controller Pattern** | 📋 Documented | High | ✅ Aligned |
| **@CurrentUser Decorator** | 📋 Documented | High | ✅ Aligned |
| **BaseService Extension** | 📋 Documented | High | ✅ Aligned |
| **BaseSchema (Audit Trail)** | 📋 Documented | High | ✅ Aligned |
| **Soft Delete** | 📋 Documented | High | ✅ Aligned |
| **Pagination** | 📋 Documented | High | ✅ Aligned |
| **Structured Logging** | 📋 Documented | Medium | ✅ Aligned |
| **Error Response Schema** | 📋 Documented | High | ✅ Aligned |
| **BullMQ Queue Integration** | 📋 Documented | High | ✅ Aligned |

### Comparison with Template Service

| Aspect | Template Service | Notification Service | Match |
|--------|-----------------|---------------------|-------|
| **Health Endpoint** | `/health` with DB/Redis checks | `/health` with DB/Redis/WS checks | ✅ |
| **Exception Handling** | GlobalExceptionFilter | GlobalExceptionFilter | ✅ |
| **Correlation ID** | Middleware | Middleware | ✅ |
| **Swagger Setup** | Complete with error schemas | Complete with error schemas | ✅ |
| **Controller Pattern** | @CurrentUser, no BaseController | @CurrentUser, no BaseController | ✅ |
| **Service Pattern** | Extends BaseService | Extends BaseService | ✅ |
| **Schema Pattern** | Extends BaseSchema | Extends BaseSchema | ✅ |
| **Queue Pattern** | BullMQ + Processors | BullMQ + Processors | ✅ |
| **RBAC** | Permission-based | Permission-based | ✅ |
| **Audit Trail** | createdBy/updatedBy | createdBy/updatedBy | ✅ |

### Additional Features (Notification-Specific)

| Feature | Status | Notes |
|---------|--------|-------|
| **WebSocket (Socket.IO)** | 📋 Documented | Notification-specific |
| **Room-Based Broadcasting** | 📋 Documented | Notification-specific |
| **4 Event Types** | 📋 Documented | Notification-specific |
| **Read Status Tracking** | 📋 Documented | Notification-specific |
| **Real-time Delivery** | 📋 Documented | Notification-specific |

---

## 🧪 Testing Strategy

### Unit Tests
- Service methods (create, update, delete, read)
- DTO validation
- Room mapping logic
- Read status tracking

### Integration Tests
- WebSocket connection and authentication
- Message broadcasting to rooms
- Queue event processing
- API endpoint responses

### E2E Tests
- Complete notification flow: emit → queue → process → broadcast
- Multi-user scenarios
- Room-based broadcasting
- Read/unread tracking

### Manual Testing

**WebSocket Connection:**
```javascript
// Using socket.io-client
const socket = io('http://localhost:3002', {
  extraHeaders: {
    Authorization: 'Bearer <JWT_TOKEN>'
  }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
});

socket.on('new_notification', (notification) => {
  console.log('Received:', notification);
});
```

**API Testing:**
```bash
# Get notifications
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3002/notifications?page=1&limit=20

# Get unread count
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3002/notifications/unread-count

# Mark as read
curl -X PATCH -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3002/notifications/{id}/read
```

---

## 📝 Naming Conventions

### Files
- Schemas: `*.schema.ts`
- Services: `*.service.ts`
- Controllers: `*.controller.ts`
- DTOs: `*.dto.ts`
- Processors: `*.processor.ts`
- Producers: `*.producer.ts`
- Gateways: `*.gateway.ts`

### Classes
- PascalCase: `NotificationService`, `NotificationGateway`
- Suffix with type: `CreateNotificationDto`, `NotificationSchema`

### Queue Names
- Lowercase with hyphens: `template-events`, `noti-incoming`
- Pattern: `{service}-{purpose}`

### Room Names
- Lowercase with colon: `user:123`, `org:456`, `agent:789`
- Pattern: `{type}:{id}`

### Event Names
- Dot notation: `template.category.created`, `agent.thinking`
- Pattern: `{service}.{entity}.{action}` or `{domain}.{action}`

---

## 🚀 Deployment Considerations

### Docker
- Single container for the service
- Expose port 3002
- Environment variables via .env or ConfigMap
- Health check endpoint: `/health`

### Dependencies
- MongoDB: connection string via MONGODB_URI
- Redis: host/port/password via env vars
- IAM Service: for JWT token validation

### Monitoring
- Health check endpoint for liveness/readiness probes
- Log aggregation for error tracking
- Metrics: connection count, message rate, queue depth

---

## 📚 References

### Existing Services
- **Template Service**: Reference for BullMQ queue patterns, service structure
- **IAM Service**: JWT authentication, user context
- **Base Library**: BaseService, BaseSchema patterns

### Documentation
- [Socket.IO Documentation](https://socket.io/docs/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [NestJS WebSocket](https://docs.nestjs.com/websockets/gateways)
- [Mongoose Schemas](https://mongoosejs.com/docs/guide.html)

---

## ✅ Success Criteria

1. **Real-time delivery**: Notifications appear in client within 100ms of emission
2. **Reliability**: Queue-based processing with retry on failure
3. **Scalability**: Support 1k CCU with room for growth
4. **Persistence**: All notifications stored in MongoDB
5. **Tracking**: Read/unread status per user
6. **Integration**: Successfully receives and processes events from Template and IAM services
7. **Developer Experience**: Clear API, good documentation, easy to test
8. **Production Ready**: Health checks, error handling, logging, RBAC support

---

## 🔄 Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0 | 2025-10-17 | Added production-ready features aligned with Template Service:<br>- Health Check Endpoint<br>- GlobalExceptionFilter<br>- CorrelationIdMiddleware<br>- Swagger Error Decorators<br>- RBAC Integration<br>- Modern Controller Pattern (@CurrentUser)<br>- Audit Trail documentation<br>- Structured Logging<br>- Production-Ready Checklist Summary | hydra-services_dev |
| 1.0 | 2025-10-17 | Initial requirements document with WebSocket, Queue, and basic architecture | hydra-services_dev |

---

**Next Steps:**
1. ✅ Database schema finalized (see NOTIFICATION-SERVICE-FLOWS-V2.md)
2. ✅ Production-ready features documented
3. ⏭️ Review and approve requirements
4. ⏭️ Create implementation issue in MCP VOA
5. ⏭️ Begin phase 1 implementation
