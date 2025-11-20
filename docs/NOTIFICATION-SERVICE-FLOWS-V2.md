# Notification Service - Event Flows & Patterns

**Document Version:** 2.0
**Date:** 2025-10-17
**Parent Document:** [NOTIFICATION-SERVICE-REQUIREMENTS.md](./NOTIFICATION-SERVICE-REQUIREMENTS.md)

---

## 📋 Overview

This document defines the complete event-driven architecture for the Notification Service, including:
- **Queue Event Patterns**: 4 unified event types consumed by the `noti` queue
- **WebSocket Event Patterns**: Events emitted to clients (aligned with queue event names)
- **Database Schema**: Unified notification structure
- **Complete Flow Examples**: End-to-end flows for each event type

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Queue Event Patterns](#2-queue-event-patterns)
3. [WebSocket Event Patterns](#3-websocket-event-patterns)
4. [Database Schema](#4-database-schema)
5. [Complete Flow Examples](#5-complete-flow-examples)
6. [Client Integration Guide](#6-client-integration-guide)

---

## 1. Architecture Overview

### 1.1. Single Queue, Four Event Types

```
┌─────────────────────────────────────────────────────────┐
│                     Queue: noti                         │
│                                                         │
│  Consumes 4 Event Types:                               │
│    1. system.notification                              │
│    2. service.event                                    │
│    3. service.alert                                    │
│    4. agent.event                                      │
└─────────────────────────────────────────────────────────┘
           │
           │ Process events
           ▼
┌─────────────────────────────────────────────────────────┐
│              Notification Service                       │
│                                                         │
│  1. Validate event                                     │
│  2. Transform to Notification                          │
│  3. Save to MongoDB                                    │
│  4. Map recipients → rooms                             │
│  5. Broadcast via WebSocket                            │
└─────────────────────────────────────────────────────────┘
           │
           │ Emit events (same names)
           ▼
┌─────────────────────────────────────────────────────────┐
│                 WebSocket Clients                       │
│                                                         │
│  Listen to:                                            │
│    - system.notification                               │
│    - service.event                                     │
│    - service.alert                                     │
│    - agent.event                                       │
└─────────────────────────────────────────────────────────┘
```

### 1.2. Event Type Purpose

| Event Type | Purpose | Source | Examples |
|------------|---------|--------|----------|
| `system.notification` | Admin announcements, system updates | Admin/System | Feature releases, maintenance notices |
| `service.event` | Resource CRUD events | IAM, Template, CBM services | User created, Category updated |
| `service.alert` | System alerts, errors | Any service | DB connection failed, quota exceeded |
| `agent.event` | AI agent activities | Agent service/client | Thinking, Tool use, Completed |

---

## 2. Queue Event Patterns

### 2.1. Queue Configuration

**Queue Name:** `noti`

**Connection:** BullMQ + Redis

**Processors:**
```typescript
@Processor('noti')
export class NotificationProcessor {
  @Process('system.notification')
  async handleSystemNotification(job: Job) { /* ... */ }

  @Process('service.event')
  async handleServiceEvent(job: Job) { /* ... */ }

  @Process('service.alert')
  async handleServiceAlert(job: Job) { /* ... */ }

  @Process('agent.event')
  async handleAgentEvent(job: Job) { /* ... */ }
}
```

---

### 2.2. Event Type: `system.notification`

**Purpose:** Admin-initiated announcements and system updates

**Queue Message Structure:**
```typescript
interface SystemNotificationQueueEvent {
  event: 'system.notification';
  data: {
    title: string;
    message: string;
    severity: 'low' | 'normal' | 'high' | 'critical';
    metadata: {
      correlationId?: string;
      orgId?: string;
      userId?: string;        // Admin who created
      timestamp: string;      // ISO 8601
    };
    data?: Record<string, any>;  // Additional context
  };
}
```

**Example:**
```json
{
  "event": "system.notification",
  "data": {
    "title": "New Feature Released",
    "message": "Analytics Dashboard is now available in the Reports section",
    "severity": "normal",
    "metadata": {
      "correlationId": "ann-001",
      "orgId": "org-abc-456",
      "userId": "admin-123",
      "timestamp": "2025-10-17T10:00:00Z"
    },
    "data": {
      "featureName": "Analytics Dashboard",
      "ctaUrl": "/reports/analytics",
      "releaseDate": "2025-10-17",
      "highlights": [
        "Real-time metrics",
        "Custom dashboards",
        "Export to PDF/Excel"
      ]
    }
  }
}
```

**Emitted By:**
- Admin dashboard
- Scheduler/cron jobs
- System monitoring services

**Recipients:**
- Typically entire organizations (`orgIds`)
- Or all users (system-wide)

---

### 2.3. Event Type: `service.event`

**Purpose:** Resource lifecycle events from microservices

**Queue Message Structure:**
```typescript
interface ServiceEventQueueEvent {
  event: 'service.event';
  data: {
    name: string;             // Event name: 'iam.user.created', 'template.category.updated', etc.
    metadata: {
      correlationId?: string;
      orgId?: string;
      userId?: string;
      timestamp: string;
    };
    data?: Record<string, any>;  // Resource data
  };
}
```

**Example: IAM User Created**
```json
{
  "event": "service.event",
  "data": {
    "name": "iam.user.created",
    "metadata": {
      "correlationId": "req-iam-123",
      "orgId": "org-abc-456",
      "userId": "admin-123",
      "timestamp": "2025-10-17T10:30:00Z"
    },
    "data": {
      "_id": "user-new-789",
      "username": "john.doe",
      "email": "john.doe@example.com",
      "roles": ["universe.member"],
      "createdBy": "admin-123"
    }
  }
}
```

**Example: Template Category Created**
```json
{
  "event": "service.event",
  "data": {
    "name": "template.category.created",
    "metadata": {
      "correlationId": "req-template-456",
      "orgId": "org-abc-456",
      "userId": "user-456",
      "timestamp": "2025-10-17T11:00:00Z"
    },
    "data": {
      "_id": "cat-123-abc",
      "name": "Electronics",
      "description": "Electronic devices and accessories",
      "isActive": true,
      "createdBy": "user-456"
    }
  }
}
```

**Event Naming Convention:** `{service}.{entity}.{action}`
- `iam.user.created`
- `iam.user.updated`
- `iam.organization.created`
- `template.category.created`
- `template.product.updated`
- `cbm.order.completed`

**Emitted By:**
- IAM Service
- Template Service
- CBM Service
- Any microservice with resources

**Note:** `service.event` does NOT include `title` and `message` in the queue event. These are generated by the Notification Service processor based on the event name and data.

---

### 2.4. Event Type: `service.alert`

**Purpose:** System alerts, errors, warnings from services

**Queue Message Structure:**
```typescript
interface ServiceAlertQueueEvent {
  event: 'service.alert';
  data: {
    title: string;
    message: string;
    severity: 'low' | 'normal' | 'high' | 'critical';
    metadata: {
      correlationId?: string;
      orgId?: string;
      userId?: string;
      timestamp: string;
    };
    data?: Record<string, any>;  // Alert context
  };
}
```

**Example: Database Connection Failed**
```json
{
  "event": "service.alert",
  "data": {
    "title": "Database Connection Failed",
    "message": "Template service unable to connect to MongoDB",
    "severity": "critical",
    "metadata": {
      "correlationId": "err-template-001",
      "orgId": "system-org",
      "timestamp": "2025-10-17T12:00:00Z"
    },
    "data": {
      "service": "template",
      "errorCode": "ECONNREFUSED",
      "errorMessage": "connect ECONNREFUSED 127.0.0.1:27017",
      "affectedUsers": 150,
      "actionRequired": "Check MongoDB service status and restart if necessary"
    }
  }
}
```

**Example: Quota Warning**
```json
{
  "event": "service.alert",
  "data": {
    "title": "API Quota Warning",
    "message": "Your organization has used 85% of monthly API quota",
    "severity": "high",
    "metadata": {
      "orgId": "org-abc-456",
      "timestamp": "2025-10-17T12:30:00Z"
    },
    "data": {
      "resource": "api_calls",
      "current": 85000,
      "limit": 100000,
      "percentage": 85,
      "resetDate": "2025-11-01T00:00:00Z",
      "recommendations": [
        "Review API call patterns",
        "Optimize frequent queries",
        "Consider upgrading plan"
      ]
    }
  }
}
```

**Emitted By:**
- Service error handlers
- Monitoring systems
- Resource quota monitors
- Health check services

**Recipients:**
- System admins (for critical errors)
- Organization admins/owners (for org-specific alerts)

---

### 2.5. Event Type: `agent.event`

**Purpose:** AI agent activities, actions, and status updates

**Queue Message Structure:**
```typescript
interface AgentEventQueueEvent {
  event: 'agent.event';
  data: {
    name: string;             // Action: 'thinking', 'tool_use', 'completed', etc.
    title: string;            // Human-readable title
    message: string;          // Action description
    severity?: 'low' | 'normal' | 'high' | 'critical';
    metadata: {
      correlationId?: string;
      orgId: string;          // Required
      userId: string;         // Required
      agentId: string;        // Required
      timestamp: string;
    };
    data?: Record<string, any>;  // Agent action data
  };
}
```

**Example: Agent Thinking**
```json
{
  "event": "agent.event",
  "data": {
    "name": "thinking",
    "title": "Agent Thinking",
    "message": "Analyzing your codebase structure...",
    "severity": "normal",
    "metadata": {
      "correlationId": "exec-abc-789",
      "orgId": "org-abc-456",
      "userId": "user-456",
      "agentId": "agent-code-helper-123",
      "timestamp": "2025-10-17T13:00:00Z"
    },
    "data": {
      "executionId": "exec-abc-789",
      "thought": "Let me examine the files in the src/ directory to understand the project structure",
      "progress": 30,
      "estimatedTimeRemaining": 5000,
      "currentTask": "Scanning directory tree"
    }
  }
}
```

**Example: Agent Tool Use**
```json
{
  "event": "agent.event",
  "data": {
    "name": "tool_use",
    "title": "Agent Using Tool",
    "message": "Reading file: src/main.ts",
    "severity": "normal",
    "metadata": {
      "correlationId": "exec-abc-789",
      "orgId": "org-abc-456",
      "userId": "user-456",
      "agentId": "agent-code-helper-123",
      "timestamp": "2025-10-17T13:01:00Z"
    },
    "data": {
      "executionId": "exec-abc-789",
      "tool": {
        "name": "read_file",
        "input": {
          "path": "src/main.ts",
          "encoding": "utf-8"
        }
      }
    }
  }
}
```

**Example: Agent Request Help**
```json
{
  "event": "agent.event",
  "data": {
    "name": "request_help",
    "title": "Agent Needs Assistance",
    "message": "Unable to determine the best approach. Please provide guidance.",
    "severity": "high",
    "metadata": {
      "correlationId": "exec-abc-789",
      "orgId": "org-abc-456",
      "userId": "user-456",
      "agentId": "agent-code-helper-123",
      "timestamp": "2025-10-17T13:03:00Z"
    },
    "data": {
      "executionId": "exec-abc-789",
      "reason": "ambiguous_requirements",
      "question": "Should I use JWT or OAuth2 for the new authentication implementation?",
      "options": ["JWT", "OAuth2", "Hybrid"],
      "context": "Refactoring authentication module",
      "requiresResponse": true
    }
  }
}
```

**Example: Agent Completed**
```json
{
  "event": "agent.event",
  "data": {
    "name": "completed",
    "title": "Task Completed",
    "message": "Successfully refactored authentication module",
    "severity": "normal",
    "metadata": {
      "correlationId": "exec-abc-789",
      "orgId": "org-abc-456",
      "userId": "user-456",
      "agentId": "agent-code-helper-123",
      "timestamp": "2025-10-17T13:10:00Z"
    },
    "data": {
      "executionId": "exec-abc-789",
      "summary": {
        "filesModified": 5,
        "linesAdded": 120,
        "linesRemoved": 85,
        "testsAdded": 3,
        "duration": 600000
      },
      "result": {
        "success": true,
        "changes": [
          "Migrated from session-based to JWT authentication",
          "Added refresh token mechanism",
          "Updated all protected routes"
        ]
      }
    }
  }
}
```

**Agent Action Names:**
- `connected` - Agent connected
- `disconnected` - Agent disconnected
- `thinking` - Agent processing/analyzing
- `tool_use` - Agent using a tool
- `tool_result` - Tool execution result
- `request_help` - Agent needs user input
- `completed` - Task completed
- `error` - Agent encountered error
- `message` - Chat message from agent

**Emitted By:**
- Agent service
- Agent client applications
- Agent orchestration systems

---

## 3. WebSocket Event Patterns

### 3.1. Event Names Alignment

**WebSocket event names = Queue event names**

| Queue Event | WebSocket Event | Notes |
|-------------|-----------------|-------|
| `system.notification` | `system.notification` | ✅ Same name |
| `service.event` | `service.event` | ✅ Same name |
| `service.alert` | `service.alert` | ✅ Same name |
| `agent.event` | `agent.event` | ✅ Same name |

---

### 3.2. WebSocket Event: `system.notification`

**Payload Structure:**
```typescript
interface SystemNotificationWSEvent {
  title: string;
  message: string;
  severity: 'low' | 'normal' | 'high' | 'critical';
  metadata: {
    notificationId: string;    // ✨ Notification DB ID
    correlationId?: string;
    orgId?: string;
    userId?: string;
    timestamp: string;
  };
  data?: Record<string, any>;
  readByUserIds: string[];
  createdAt: string;
}
```

**Example Emission:**
```typescript
socket.to('org:org-abc-456').emit('system.notification', {
  title: 'New Feature Released',
  message: 'Analytics Dashboard is now available',
  severity: 'normal',
  metadata: {
    notificationId: 'notif-sys-123',
    correlationId: 'ann-001',
    orgId: 'org-abc-456',
    userId: 'admin-123',
    timestamp: '2025-10-17T10:00:00Z'
  },
  data: {
    featureName: 'Analytics Dashboard',
    ctaUrl: '/reports/analytics',
    releaseDate: '2025-10-17'
  },
  readByUserIds: [],
  createdAt: '2025-10-17T10:00:00Z'
});
```

---

### 3.3. WebSocket Event: `service.event`

**Payload Structure:**
```typescript
interface ServiceEventWSEvent {
  name: string;               // Event name
  metadata: {
    notificationId: string;
    correlationId?: string;
    orgId?: string;
    userId?: string;
    timestamp: string;
  };
  data?: Record<string, any>;
  readByUserIds: string[];
  createdAt: string;
}
```

**Example Emission:**
```typescript
socket.to('org:org-abc-456').emit('service.event', {
  name: 'iam.user.created',
  metadata: {
    notificationId: 'notif-svc-456',
    correlationId: 'req-iam-123',
    orgId: 'org-abc-456',
    userId: 'admin-123',
    timestamp: '2025-10-17T10:30:00Z'
  },
  data: {
    _id: 'user-new-789',
    username: 'john.doe',
    email: 'john.doe@example.com',
    roles: ['universe.member']
  },
  readByUserIds: [],
  createdAt: '2025-10-17T10:30:00Z'
});
```

**Note:** Client must generate `title` and `message` based on `name` and `data`.

---

### 3.4. WebSocket Event: `service.alert`

**Payload Structure:**
```typescript
interface ServiceAlertWSEvent {
  title: string;
  message: string;
  severity: 'low' | 'normal' | 'high' | 'critical';
  metadata: {
    notificationId: string;
    correlationId?: string;
    orgId?: string;
    userId?: string;
    timestamp: string;
  };
  data?: Record<string, any>;
  readByUserIds: string[];
  createdAt: string;
}
```

**Example Emission:**
```typescript
socket.to('user:admin-001').emit('service.alert', {
  title: 'Database Connection Failed',
  message: 'Template service unable to connect to MongoDB',
  severity: 'critical',
  metadata: {
    notificationId: 'notif-alert-789',
    correlationId: 'err-template-001',
    orgId: 'system-org',
    timestamp: '2025-10-17T12:00:00Z'
  },
  data: {
    service: 'template',
    errorCode: 'ECONNREFUSED',
    affectedUsers: 150
  },
  readByUserIds: [],
  createdAt: '2025-10-17T12:00:00Z'
});
```

---

### 3.5. WebSocket Event: `agent.event`

**Payload Structure:**
```typescript
interface AgentEventWSEvent {
  name: string;
  title: string;
  message: string;
  severity?: 'low' | 'normal' | 'high' | 'critical';
  metadata: {
    notificationId: string;
    correlationId?: string;
    orgId: string;
    userId: string;
    agentId: string;
    timestamp: string;
  };
  data?: Record<string, any>;
  readByUserIds: string[];
  createdAt: string;
}
```

**Example Emission:**
```typescript
socket.to('user:user-456').emit('agent.event', {
  name: 'thinking',
  title: 'Agent Thinking',
  message: 'Analyzing your codebase structure...',
  severity: 'normal',
  metadata: {
    notificationId: 'notif-agent-999',
    correlationId: 'exec-abc-789',
    orgId: 'org-abc-456',
    userId: 'user-456',
    agentId: 'agent-code-helper-123',
    timestamp: '2025-10-17T13:00:00Z'
  },
  data: {
    executionId: 'exec-abc-789',
    thought: 'Let me examine the src/ directory',
    progress: 30
  },
  readByUserIds: [],
  createdAt: '2025-10-17T13:00:00Z'
});
```

---

### 3.6. Additional WebSocket Events

#### **Connection Event:**
```typescript
socket.emit('connected', {
  userId: 'user-456',
  rooms: ['user:user-456', 'org:org-abc-456'],
  timestamp: '2025-10-17T10:00:00Z'
});
```

#### **Notification Read Event:**
```typescript
socket.to('user:user-456').emit('notification.read', {
  notificationId: 'notif-123',
  userId: 'user-456',
  readAt: '2025-10-17T11:00:00Z'
});
```

#### **Notification Deleted Event:**
```typescript
socket.to('user:user-456').emit('notification.deleted', {
  notificationId: 'notif-123',
  deletedAt: '2025-10-17T11:05:00Z'
});
```

#### **Error Event:**
```typescript
socket.emit('error', {
  code: 'UNAUTHORIZED',
  message: 'Invalid or expired JWT token',
  timestamp: '2025-10-17T10:00:00Z'
});
```

---

## 4. Database Schema

### 4.1. Unified Notification Schema

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type NotificationDocument = Notification & Document;

// === Enums ===
export enum NotificationEventType {
  SYSTEM_NOTIFICATION = 'system.notification',
  SERVICE_EVENT = 'service.event',
  SERVICE_ALERT = 'service.alert',
  AGENT_EVENT = 'agent.event',
}

export enum NotificationSeverity {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum NotificationDeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

// === Nested Structures ===
export class NotificationMetadata {
  @Prop()
  correlationId?: string;

  @Prop()
  orgId?: string;

  @Prop()
  userId?: string;

  @Prop()
  agentId?: string;

  @Prop({ required: true })
  timestamp: string;
}

export class NotificationRecipients {
  @Prop({ type: [String], default: [] })
  userIds?: string[];

  @Prop({ type: [String], default: [] })
  agentIds?: string[];

  @Prop({ type: [String], default: [] })
  orgIds?: string[];

  @Prop()
  service?: string;

  @Prop()
  queue?: string;
}

// === Main Schema ===
@Schema({ timestamps: true })
export class Notification extends BaseSchema {
  // Event type (required)
  @Prop({
    required: true,
    enum: Object.values(NotificationEventType),
    index: true,
  })
  event: string;

  // For system.notification, service.alert, agent.event
  @Prop()
  title?: string;

  @Prop()
  message?: string;

  @Prop({ enum: Object.values(NotificationSeverity) })
  severity?: string;

  // For service.event, agent.event
  @Prop({ index: true })
  name?: string;

  // Common metadata (required)
  @Prop({ type: NotificationMetadata, required: true })
  metadata: NotificationMetadata;

  // Unified data payload
  @Prop({ type: Object })
  data?: Record<string, any>;

  // Recipients (required)
  @Prop({ type: NotificationRecipients, required: true })
  recipients: NotificationRecipients;

  // Delivery status
  @Prop({
    default: NotificationDeliveryStatus.PENDING,
    enum: Object.values(NotificationDeliveryStatus),
    index: true,
  })
  deliveryStatus: string;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  failureReason?: string;

  // Read status
  @Prop({ type: [String], default: [], index: true })
  readByUserIds: string[];
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// === Indexes ===
NotificationSchema.index({ 'recipients.userIds': 1, createdAt: -1 });
NotificationSchema.index({ 'recipients.orgIds': 1, createdAt: -1 });
NotificationSchema.index({ 'recipients.agentIds': 1, createdAt: -1 });
NotificationSchema.index({ event: 1, createdAt: -1 });
NotificationSchema.index({ event: 1, name: 1, createdAt: -1 });
NotificationSchema.index({ 'metadata.orgId': 1, createdAt: -1 });
NotificationSchema.index({ 'metadata.userId': 1, createdAt: -1 });
NotificationSchema.index({ 'metadata.agentId': 1, createdAt: -1 });
NotificationSchema.index({ severity: 1, createdAt: -1 });
NotificationSchema.index({ deliveryStatus: 1, createdAt: -1 });
```

### 4.2. Field Usage Matrix

| Event Type | Fields Used | Notes |
|------------|-------------|-------|
| `system.notification` | `title`, `message`, `severity`, `metadata`, `data` | Full display fields |
| `service.event` | `name`, `metadata`, `data` | Generate title/message on client |
| `service.alert` | `title`, `message`, `severity`, `metadata`, `data` | Full display fields |
| `agent.event` | `name`, `title`, `message`, `severity`, `metadata`, `data` | Full display fields |

---

## 5. Complete Flow Examples

### 5.1. System Notification Flow

```
┌──────────────┐
│ Admin Panel  │
└──────┬───────┘
       │
       │ POST /notifications/send
       │
       ▼
┌─────────────────────┐
│Notification Service │
│                     │
│ 1. Validate request │
│ 2. Create in DB     │
│    {                │
│      event: 'system.notification',
│      title: '...',  │
│      ...            │
│    }                │
│                     │
│ 3. Map recipients   │
│    → org:org-abc-456│
│                     │
│ 4. Broadcast WS     │
└──────────┬──────────┘
           │
           │ emit('system.notification', {...})
           │
           ▼
     ┌──────────┐
     │  Users   │
     │  in Org  │
     └──────────┘
```

---

### 5.2. Service Event Flow (IAM User Created)

```
┌─────────────┐
│ IAM Service │
└──────┬──────┘
       │
       │ 1. User creates new user
       │
       ▼
  [UserService.create()]
       │
       │ 2. Save to MongoDB
       │
       ▼
  [Emit to queue]
       │
       │ Queue: noti
       │ Event: service.event
       │
       │ {
       │   "event": "service.event",
       │   "data": {
       │     "name": "iam.user.created",
       │     "metadata": { ... },
       │     "data": { user data }
       │   }
       │ }
       │
       ▼
┌─────────────────────┐
│Notification Service │
│                     │
│ @Process('service.event')
│                     │
│ 3. Transform event  │
│    - Generate       │
│      recipients     │
│      (creator, new  │
│       user, org)    │
│                     │
│ 4. Save to DB       │
│    {               │
│      event: 'service.event',
│      name: 'iam.user.created',
│      metadata: {...},
│      data: {...},  │
│      recipients: {...}
│    }               │
│                     │
│ 5. Map recipients   │
│    → user:admin-123 │
│    → user:new-789   │
│    → org:org-abc-456│
│                     │
│ 6. Broadcast WS     │
└──────────┬──────────┘
           │
           │ emit('service.event', {
           │   name: 'iam.user.created',
           │   metadata: { notificationId: '...', ... },
           │   data: { user data }
           │ })
           │
           ▼
     ┌──────────┐
     │  Users   │
     │          │
     │ Client   │
     │ generates│
     │ title &  │
     │ message  │
     └──────────┘
```

---

### 5.3. Service Alert Flow

```
┌─────────────────┐
│Template Service │
└────────┬────────┘
         │
         │ 1. MongoDB connection fails
         │
         ▼
   [Error Handler]
         │
         │ 2. Emit to queue
         │
         │ Queue: noti
         │ Event: service.alert
         │
         │ {
         │   "event": "service.alert",
         │   "data": {
         │     "title": "DB Connection Failed",
         │     "message": "...",
         │     "severity": "critical",
         │     "metadata": {...},
         │     "data": { error details }
         │   }
         │ }
         │
         ▼
┌─────────────────────┐
│Notification Service │
│                     │
│ @Process('service.alert')
│                     │
│ 3. Save to DB       │
│                     │
│ 4. Determine        │
│    recipients       │
│    (system admins)  │
│                     │
│ 5. Broadcast WS     │
└──────────┬──────────┘
           │
           │ emit('service.alert', {
           │   title: 'DB Connection Failed',
           │   severity: 'critical',
           │   ...
           │ })
           │
           ▼
     ┌──────────┐
     │  Admins  │
     │          │
     │ Show     │
     │ critical │
     │ alert    │
     └──────────┘
```

---

### 5.4. Agent Event Flow (Real-time Updates)

```
┌─────────────┐
│Agent Client │
└──────┬──────┘
       │
       │ 1. User requests code analysis
       │
       ▼
  [Agent starts execution]
       │
       │ 2. Emit 'thinking' event
       │
       │ Queue: noti
       │ Event: agent.event
       │
       │ {
       │   "event": "agent.event",
       │   "data": {
       │     "name": "thinking",
       │     "title": "Agent Thinking",
       │     "message": "Analyzing...",
       │     "severity": "normal",
       │     "metadata": {
       │       "orgId": "...",
       │       "userId": "...",
       │       "agentId": "...",
       │       ...
       │     },
       │     "data": {
       │       "thought": "...",
       │       "progress": 30
       │     }
       │   }
       │ }
       │
       ▼
┌─────────────────────┐
│Notification Service │
│                     │
│ @Process('agent.event')
│                     │
│ 3. Save to DB       │
│                     │
│ 4. Map recipients   │
│    → user:user-456  │
│    → agent:agent-123│
│                     │
│ 5. Broadcast WS     │
└──────────┬──────────┘
           │
           │ emit('agent.event', {
           │   name: 'thinking',
           │   title: 'Agent Thinking',
           │   message: '...',
           │   metadata: { notificationId: '...', ... },
           │   data: { progress: 30 }
           │ })
           │
           ▼
     ┌──────────┐
     │   User   │
     │          │
     │ UI shows │
     │ agent    │
     │ thinking │
     │ progress │
     └──────────┘
       │
       │ (Agent continues)
       │
       ▼
  [Agent uses tool]
       │
       │ Emit 'tool_use' event
       │ → Notification Service
       │ → Broadcast
       │
       ▼
     ┌──────────┐
     │   User   │
     │ sees tool│
     │ being    │
     │ used     │
     └──────────┘
       │
       │ (Agent completes)
       │
       ▼
  [Agent finishes]
       │
       │ Emit 'completed' event
       │ → Notification Service
       │ → Broadcast
       │
       ▼
     ┌──────────┐
     │   User   │
     │ sees     │
     │ results  │
     └──────────┘
```

---

## 6. Client Integration Guide

### 6.1. Socket Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3002', {
  extraHeaders: {
    Authorization: `Bearer ${JWT_TOKEN}`
  }
});

// Connection established
socket.on('connect', () => {
  console.log('Connected to notification service');
});

// Connection confirmed by server
socket.on('connected', (data) => {
  console.log('User ID:', data.userId);
  console.log('Joined rooms:', data.rooms);
});

// Connection errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

---

### 6.2. Event Listeners

```typescript
// Listen to system notifications
socket.on('system.notification', (notification) => {
  showSystemNotification({
    title: notification.title,
    message: notification.message,
    severity: notification.severity,
    ctaUrl: notification.data?.ctaUrl
  });

  // Store notification ID for actions
  storeNotification(notification.metadata.notificationId, notification);
});

// Listen to service events
socket.on('service.event', (event) => {
  // Generate display content
  const { title, message } = generateEventDisplay(event.name, event.data);

  showNotification({
    title: title,
    message: message,
    type: 'event'
  });

  // Update UI based on specific events
  handleServiceEvent(event.name, event.data);
});

// Listen to service alerts
socket.on('service.alert', (alert) => {
  showAlert({
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    actions: alert.data?.actions || []
  });
});

// Listen to agent events
socket.on('agent.event', (agentEvent) => {
  updateAgentUI({
    agentId: agentEvent.metadata.agentId,
    action: agentEvent.name,
    title: agentEvent.title,
    message: agentEvent.message,
    progress: agentEvent.data?.progress,
    data: agentEvent.data
  });

  // Handle specific actions
  handleAgentAction(agentEvent);
});
```

---

### 6.3. Helper Functions

```typescript
// Generate display for service events
function generateEventDisplay(name: string, data: any): { title: string; message: string } {
  switch (name) {
    case 'iam.user.created':
      return {
        title: 'New User Added',
        message: `User ${data.email} has been added to your organization`
      };
    case 'template.category.created':
      return {
        title: 'Category Created',
        message: `New category "${data.name}" has been created`
      };
    // Add more cases...
    default:
      return {
        title: 'Resource Updated',
        message: `${name} occurred`
      };
  }
}

// Handle service events (refresh UI, etc.)
function handleServiceEvent(name: string, data: any) {
  switch (name) {
    case 'iam.user.created':
      refreshUserList();
      break;
    case 'template.category.created':
      refreshCategoryList();
      break;
    // Add more cases...
  }
}

// Handle agent actions
function handleAgentAction(event: any) {
  switch (event.name) {
    case 'thinking':
      showAgentThinking(event);
      break;
    case 'tool_use':
      showAgentToolUse(event);
      break;
    case 'completed':
      showAgentCompleted(event);
      break;
    case 'error':
      showAgentError(event);
      break;
    case 'request_help':
      showAgentRequestHelp(event);
      break;
  }
}
```

---

### 6.4. API Integration

```typescript
// Mark notification as read
async function markAsRead(notificationId: string) {
  await fetch(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

// Get notification history
async function getNotifications(filters: any) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/notifications?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}

// Get unread count
async function getUnreadCount() {
  const response = await fetch('/api/notifications/unread-count', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.count;
}
```

---

## 7. Summary

### Key Principles

1. **Single Queue:** All events flow through `noti` queue
2. **4 Event Types:** Clear categorization of notification purposes
3. **Aligned Naming:** Queue events = WebSocket events
4. **Unified Metadata:** `notificationId` + common fields in all events
5. **Flexible Data:** Single `data` field for all payloads
6. **Room-Based Broadcasting:** Efficient targeting via Socket.IO rooms

### Event Type Checklist

| Event Type | Has title | Has message | Has severity | Has name | Notes |
|------------|-----------|-------------|--------------|----------|-------|
| `system.notification` | ✅ | ✅ | ✅ | ❌ | Full display fields |
| `service.event` | ❌ | ❌ | ❌ | ✅ | Client generates display |
| `service.alert` | ✅ | ✅ | ✅ | ❌ | Full display fields |
| `agent.event` | ✅ | ✅ | ✅ (optional) | ✅ | Full display fields |

---

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2025-10-17 | Complete rewrite with unified event architecture |
| 1.0 | 2025-10-17 | Initial version with 30+ categories (deprecated) |
