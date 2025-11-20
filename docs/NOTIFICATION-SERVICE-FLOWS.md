# Notification Service - Category Flows & Sample Data

**Document Version:** 1.0
**Date:** 2025-10-17
**Parent Document:** [NOTIFICATION-SERVICE-REQUIREMENTS.md](./NOTIFICATION-SERVICE-REQUIREMENTS.md)

---

## 📋 Overview

This document provides detailed flows and sample data for each notification category. Each section includes:
- **Use Case**: When this notification is triggered
- **Flow Diagram**: Step-by-step flow from source to recipient
- **Sample Notification Data**: Complete JSON structure
- **Queue Pattern**: Queue name and message structure (for queue-based flows)
- **WebSocket Event Pattern**: Event name and payload sent to clients
- **Implementation Notes**: Key logic and considerations

---

## Table of Contents

1. [Queue & WebSocket Event Patterns](#1-queue--websocket-event-patterns)
2. [System Notifications](#2-system-notifications)
3. [IAM Service Events](#3-iam-service-events)
4. [Template Service Events](#4-template-service-events)
5. [Alert Categories](#5-alert-categories)
6. [Agent Categories](#6-agent-categories)
7. [User Messages](#7-user-messages)
8. [Inter-Service Routing Patterns](#8-inter-service-routing-patterns)

---

## 1. Queue & WebSocket Event Patterns

### 1.1. Queue Message Pattern

**Standard Queue Message Structure:**

All messages sent to queues (from services to Notification Service) follow this pattern:

```typescript
interface QueueMessage {
  event: string;           // Event name (e.g., 'template.category.created')
  data: object;            // Event-specific data
  timestamp: string;       // ISO 8601 timestamp
  metadata?: {             // Optional metadata
    correlationId?: string;
    userId?: string;
    orgId?: string;
  };
}
```

**Example Queue Message:**
```json
{
  "event": "template.category.created",
  "data": {
    "_id": "cat-123-abc",
    "name": "Electronics",
    "description": "Electronic devices",
    "isActive": true,
    "createdBy": "user-456",
    "orgId": "org-abc-456",
    "createdAt": "2025-10-17T11:00:00Z"
  },
  "timestamp": "2025-10-17T11:00:00Z",
  "metadata": {
    "correlationId": "req-xyz-789",
    "userId": "user-456",
    "orgId": "org-abc-456"
  }
}
```

---

### 1.2. WebSocket Event Pattern

**Standard WebSocket Events:**

The Notification Service sends events to clients via Socket.IO:

#### **Event: `new_notification`**

Sent when a new notification is created and should be displayed to user.

```typescript
interface NewNotificationEvent {
  event: 'new_notification';
  data: {
    id: string;               // Notification ID
    category: string;         // Notification category
    title: string;            // Notification title
    message: string;          // Notification message
    source?: object;          // Source information
    data?: object;            // Category-specific data
    createdAt: string;        // ISO 8601 timestamp
    readByUserIds?: string[]; // Users who read this
  };
}
```

**Example WebSocket Emission:**
```typescript
// Server-side
socket.to('org:org-abc-456').emit('new_notification', {
  id: 'notif-123-xyz',
  category: 'template.category.created',
  title: 'Category Created',
  message: 'New category "Electronics" has been created.',
  source: {
    service: 'template',
    entity: 'category',
    id: 'cat-123-abc',
    userId: 'user-456'
  },
  data: {
    category: {
      id: 'cat-123-abc',
      name: 'Electronics'
    }
  },
  createdAt: '2025-10-17T11:00:00Z',
  readByUserIds: []
});
```

**Client-side Handling:**
```javascript
socket.on('new_notification', (notification) => {
  console.log('New notification:', notification);

  // Display notification in UI
  showNotificationToast({
    title: notification.title,
    message: notification.message,
    category: notification.category,
    data: notification.data
  });

  // Update unread count
  updateUnreadCount();
});
```

#### **Event: `notification_read`**

Sent when a notification is marked as read (broadcast to update UI across devices).

```typescript
interface NotificationReadEvent {
  event: 'notification_read';
  data: {
    id: string;           // Notification ID
    userId: string;       // User who read it
    readAt: string;       // ISO 8601 timestamp
  };
}
```

**Example:**
```typescript
socket.to(`user:${userId}`).emit('notification_read', {
  id: 'notif-123-xyz',
  userId: 'user-456',
  readAt: '2025-10-17T11:05:00Z'
});
```

#### **Event: `notification_deleted`**

Sent when a notification is deleted.

```typescript
interface NotificationDeletedEvent {
  event: 'notification_deleted';
  data: {
    id: string;           // Notification ID
    deletedAt: string;    // ISO 8601 timestamp
  };
}
```

#### **Event: `connected`**

Sent to client upon successful connection.

```typescript
socket.emit('connected', {
  userId: 'user-456',
  rooms: ['user:user-456', 'org:org-abc-456'],
  timestamp: '2025-10-17T10:00:00Z'
});
```

#### **Event: `error`**

Sent when an error occurs.

```typescript
socket.emit('error', {
  code: 'UNAUTHORIZED',
  message: 'Invalid or expired JWT token',
  timestamp: '2025-10-17T10:00:00Z'
});
```

---

### 1.3. Queue Names Reference

| Queue Name | Direction | Purpose | Emitted By | Consumed By |
|------------|-----------|---------|------------|-------------|
| `iam-events` | → Notification | IAM service events | IAM Service | Notification Service |
| `iam-incoming` | ← Notification | Commands to IAM | Notification Service | IAM Service |
| `template-events` | → Notification | Template service events | Template Service | Notification Service |
| `template-incoming` | ← Notification | Commands to Template | Notification Service | Template Service |
| `cbm-events` | → Notification | CBM service events | CBM Service | Notification Service |
| `cbm-incoming` | ← Notification | Commands to CBM | Notification Service | CBM Service |
| `noti-events` | Internal | Notification service events | Notification Service | Notification Service |
| `noti-incoming` | → Notification | External commands | External Services | Notification Service |

---

### 1.4. Event Name Conventions

**Queue Event Names:**
- Pattern: `{service}.{entity}.{action}`
- Examples:
  - `template.category.created`
  - `iam.user.updated`
  - `cbm.order.completed`

**WebSocket Event Names:**
- Pattern: `{action}_{object}` (snake_case)
- Standard events:
  - `new_notification` - New notification received
  - `notification_read` - Notification marked as read
  - `notification_deleted` - Notification deleted
  - `connected` - Client connected
  - `disconnected` - Client disconnected
  - `error` - Error occurred

**Client → Server Event Names:**
- Pattern: `{action}_{object}` (snake_case)
- Examples:
  - `send_message` - User sends message
  - `join_agent_room` - Join agent room
  - `leave_agent_room` - Leave agent room
  - `mark_read` - Mark notification as read

---

### 1.5. Complete Flow Example: Template Service Event

This example demonstrates the complete flow from a service event to WebSocket broadcast:

```
┌────────────────┐
│Template Service│
└───────┬────────┘
        │
        │ 1. User creates category
        │
        ▼
   [CategoryService.create()]
        │
        │ 2. Save to database
        │
        ▼
   [Emit to queue]
        │
        │ Queue: template-events
        │ Event: template.category.created
        │
        │ Message:
        │ {
        │   "event": "template.category.created",
        │   "data": {
        │     "_id": "cat-123",
        │     "name": "Electronics",
        │     "orgId": "org-abc-456",
        │     "createdBy": "user-456"
        │   },
        │   "timestamp": "2025-10-17T11:00:00Z"
        │ }
        │
        ▼
┌────────────────────┐
│Notification Service│
│                    │
│ 3. Queue Processor │
│    @Process('template.category.created')
│                    │
│ 4. Transform to    │
│    Notification    │
│                    │
│ 5. Save to DB      │
│    {               │
│      category: 'template.category.created',
│      title: 'Category Created',
│      recipients: { orgIds: ['org-abc-456'] }
│    }               │
│                    │
│ 6. Map recipients  │
│    → rooms         │
│    orgIds → org:org-abc-456
│                    │
│ 7. Broadcast WS    │
└─────────┬──────────┘
          │
          │ WebSocket Event: new_notification
          │ To Room: org:org-abc-456
          │
          │ Payload:
          │ {
          │   "id": "notif-123",
          │   "category": "template.category.created",
          │   "title": "Category Created",
          │   "message": "New category 'Electronics' created",
          │   "source": {
          │     "service": "template",
          │     "entity": "category",
          │     "id": "cat-123",
          │     "userId": "user-456"
          │   },
          │   "data": {
          │     "category": {
          │       "id": "cat-123",
          │       "name": "Electronics"
          │     }
          │   },
          │   "createdAt": "2025-10-17T11:00:00Z"
          │ }
          │
          ▼
    ┌──────────┐
    │All Users │
    │in Org    │
    │          │
    │socket.on('new_notification', ...)
    └──────────┘
```

---

## 2. System Notifications

### 2.1. `system.announcement`

**Use Case:** Admin broadcasts announcement to entire organization

**Flow:**
```
Admin Dashboard → POST /notifications/send → Notification Service
    → Save to DB → Broadcast to org:{orgId} room → All Org Users
```

**Queue Pattern:**
```
N/A - Direct API call, no queue involved
```

**WebSocket Event:**
```typescript
// Event Name: new_notification
// Emitted to: org:org-abc-456

socket.to('org:org-abc-456').emit('new_notification', {
  id: 'notif-ann-123',
  category: 'system.announcement',
  title: 'New Feature Released',
  message: 'We\'ve launched the new Analytics Dashboard! Check it out in the Reports section.',
  source: {
    service: 'iam',
    userId: 'admin-user-123'
  },
  data: {
    announcementType: 'feature_release',
    featureName: 'Analytics Dashboard',
    ctaUrl: '/reports/analytics',
    priority: 'normal'
  },
  createdAt: '2025-10-17T10:00:00Z',
  readByUserIds: []
});
```

**Sample Notification (DB):**
```json
{
  "category": "system.announcement",
  "title": "New Feature Released",
  "message": "We've launched the new Analytics Dashboard! Check it out in the Reports section.",

  "source": {
    "service": "iam",
    "userId": "admin-user-123"
  },

  "recipients": {
    "orgIds": ["org-abc-456"]
  },

  "data": {
    "announcementType": "feature_release",
    "featureName": "Analytics Dashboard",
    "ctaUrl": "/reports/analytics",
    "priority": "normal"
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Key Implementation Points:**
- No queue processing needed (direct API call)
- Broadcast to entire organization
- Optional call-to-action URL
- Room mapping: `orgIds` → `org:{orgId}`

---

### 1.2. `system.maintenance`

**Use Case:** Scheduled maintenance notification to all active users

**Flow:**
```
Scheduler/Cron → Notification Service → Broadcast to multiple org rooms
    → All Connected Users
```

**Sample Notification:**
```json
{
  "category": "system.maintenance",
  "title": "Scheduled Maintenance",
  "message": "System will be down for maintenance on Sunday, 2AM-4AM UTC. Please save your work.",

  "source": {
    "service": "noti",
    "userId": "system"
  },

  "recipients": {
    "orgIds": ["org-abc-456", "org-xyz-789"]
  },

  "data": {
    "maintenanceWindow": {
      "start": "2025-10-20T02:00:00Z",
      "end": "2025-10-20T04:00:00Z"
    },
    "affectedServices": ["iam", "template", "cbm"],
    "severity": "high"
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Key Implementation Points:**
- System-generated (no specific user source)
- Multi-org broadcast
- Time-sensitive information

---

### 1.3. `system.update`

**Use Case:** Feature update or system change announcement

**Flow:**
```
Admin → Notification Service → Broadcast to all users
```

**Sample Notification:**
```json
{
  "category": "system.update",
  "title": "System Update v2.5.0",
  "message": "New version deployed with performance improvements and bug fixes.",

  "source": {
    "service": "noti",
    "userId": "system"
  },

  "recipients": {
    "orgIds": ["org-abc-456"]
  },

  "data": {
    "version": "2.5.0",
    "releaseDate": "2025-10-17",
    "highlights": [
      "50% faster API response times",
      "Fixed authentication token refresh issue",
      "New export formats for reports"
    ],
    "releaseNotesUrl": "/docs/releases/v2.5.0"
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

## 3. IAM Service Events

### 3.1. `iam.user.created`

**Use Case:** New user created, notify org admins and the new user

**Flow:**
```
IAM Service → Create User → Emit to iam-events queue
    → Notification Service Processor
    → Create Notification
    → Broadcast to org + specific users
```

**Queue Pattern:**
```typescript
// Queue Name: iam-events
// Event Name: iam.user.created

// Message sent by IAM Service:
{
  "event": "iam.user.created",
  "data": {
    "_id": "user-new-789",
    "username": "john.doe",
    "email": "john.doe@example.com",
    "orgId": "org-abc-456",
    "roles": ["universe.member"],
    "createdBy": "admin-user-123",
    "createdAt": "2025-10-17T10:30:00Z"
  },
  "timestamp": "2025-10-17T10:30:00Z",
  "metadata": {
    "correlationId": "req-iam-123",
    "userId": "admin-user-123",
    "orgId": "org-abc-456"
  }
}
```

**WebSocket Event:**
```typescript
// Event Name: new_notification
// Emitted to:
//   - user:admin-user-123 (creator)
//   - user:user-new-789 (new user)
//   - org:org-abc-456 (all org members)

socket.to('user:admin-user-123').emit('new_notification', {
  id: 'notif-iam-789',
  category: 'iam.user.created',
  title: 'New User Added',
  message: 'User john.doe@example.com has been added to your organization.',
  source: {
    service: 'iam',
    entity: 'user',
    id: 'user-new-789',
    userId: 'admin-user-123'
  },
  data: {
    newUser: {
      id: 'user-new-789',
      username: 'john.doe',
      email: 'john.doe@example.com',
      roles: ['universe.member']
    },
    createdBy: {
      id: 'admin-user-123',
      username: 'admin'
    }
  },
  createdAt: '2025-10-17T10:30:00Z',
  readByUserIds: []
});

// Also emit to new user and org
socket.to('user:user-new-789').emit('new_notification', { /* same */ });
socket.to('org:org-abc-456').emit('new_notification', { /* same */ });
```

**Notification (DB):**
```json
{
  "category": "iam.user.created",
  "title": "New User Added",
  "message": "User john.doe@example.com has been added to your organization.",

  "source": {
    "service": "iam",
    "entity": "user",
    "id": "user-new-789",
    "userId": "admin-user-123"
  },

  "recipients": {
    "userIds": ["admin-user-123", "user-new-789"],
    "orgIds": ["org-abc-456"]
  },

  "data": {
    "newUser": {
      "id": "user-new-789",
      "username": "john.doe",
      "email": "john.doe@example.com",
      "roles": ["universe.member"]
    },
    "createdBy": {
      "id": "admin-user-123",
      "username": "admin"
    }
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Processor Implementation:**
```typescript
@Processor('iam-events')
export class IAMEventsProcessor {

  @Process('iam.user.created')
  async handleUserCreated(job: Job) {
    const { data } = job.data;

    const notification = await this.notificationService.create({
      category: 'iam.user.created',
      title: 'New User Added',
      message: `User ${data.email} has been added to your organization.`,
      source: {
        service: 'iam',
        entity: 'user',
        id: data._id,
        userId: data.createdBy
      },
      recipients: {
        userIds: [data.createdBy, data._id],
        orgIds: [data.orgId]
      },
      data: {
        newUser: {
          id: data._id,
          username: data.username,
          email: data.email,
          roles: data.roles
        },
        createdBy: { id: data.createdBy }
      }
    });

    // Broadcast handled by service layer
  }
}
```

**Key Implementation Points:**
- Queue-based processing
- Notify both creator and new user
- Also broadcast to entire org
- Extract relevant data from IAM event

---

### 2.2. `iam.user.updated`

**Use Case:** User profile updated, notify the user

**Flow:**
```
IAM Service → Update User → Emit to iam-events
    → Notification Service → Notify user only
```

**Sample Notification:**
```json
{
  "category": "iam.user.updated",
  "title": "Profile Updated",
  "message": "Your profile has been successfully updated.",

  "source": {
    "service": "iam",
    "entity": "user",
    "id": "user-123",
    "userId": "user-123"
  },

  "recipients": {
    "userIds": ["user-123"]
  },

  "data": {
    "updatedFields": ["email", "phone"],
    "previousEmail": "old@example.com",
    "newEmail": "new@example.com"
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Key Implementation Points:**
- User-specific notification (not broadcast to org)
- Show what changed
- Confirmation message

---

### 2.3. `iam.user.deleted`

**Use Case:** User deleted from system, notify org admins

**Sample Notification:**
```json
{
  "category": "iam.user.deleted",
  "title": "User Removed",
  "message": "User john.doe@example.com has been removed from your organization.",

  "source": {
    "service": "iam",
    "entity": "user",
    "id": "user-789",
    "userId": "admin-user-123"
  },

  "recipients": {
    "userIds": ["admin-user-123"],
    "orgIds": ["org-abc-456"]
  },

  "data": {
    "deletedUser": {
      "id": "user-789",
      "username": "john.doe",
      "email": "john.doe@example.com"
    },
    "deletedBy": {
      "id": "admin-user-123",
      "username": "admin"
    },
    "reason": "User requested account deletion"
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

### 2.4. `iam.organization.created`

**Use Case:** New organization created, notify system admins and org owner

**Sample Notification:**
```json
{
  "category": "iam.organization.created",
  "title": "Organization Created",
  "message": "Organization 'Acme Corp' has been created successfully.",

  "source": {
    "service": "iam",
    "entity": "organization",
    "id": "org-new-999",
    "userId": "owner-user-456"
  },

  "recipients": {
    "userIds": ["owner-user-456", "system-admin-001"]
  },

  "data": {
    "organization": {
      "id": "org-new-999",
      "name": "Acme Corp",
      "owner": "owner-user-456",
      "plan": "starter"
    }
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

### 2.5. `iam.organization.updated`

**Use Case:** Organization settings updated, notify org admins

**Sample Notification:**
```json
{
  "category": "iam.organization.updated",
  "title": "Organization Settings Updated",
  "message": "Organization settings have been modified.",

  "source": {
    "service": "iam",
    "entity": "organization",
    "id": "org-abc-456",
    "userId": "admin-user-123"
  },

  "recipients": {
    "orgIds": ["org-abc-456"]
  },

  "data": {
    "updatedFields": ["name", "billing_email"],
    "changes": {
      "name": {
        "from": "Old Name",
        "to": "New Name"
      }
    }
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

## 3. Template Service Events

### 3.1. `template.category.created`

**Use Case:** Category created, notify organization members

**Flow:**
```
Template Service → Create Category → Emit to template-events queue
    → Notification Service Processor
    → Create Notification
    → Broadcast to org:{orgId}
```

**Queue Event from Template:**
```json
{
  "event": "template.category.created",
  "data": {
    "_id": "cat-123-abc",
    "name": "Electronics",
    "description": "Electronic devices and accessories",
    "isActive": true,
    "createdBy": "user-456",
    "orgId": "org-abc-456",
    "createdAt": "2025-10-17T11:00:00Z"
  },
  "timestamp": "2025-10-17T11:00:00Z"
}
```

**Resulting Notification:**
```json
{
  "category": "template.category.created",
  "title": "Category Created",
  "message": "New category 'Electronics' has been created.",

  "source": {
    "service": "template",
    "entity": "category",
    "id": "cat-123-abc",
    "userId": "user-456"
  },

  "recipients": {
    "orgIds": ["org-abc-456"]
  },

  "data": {
    "category": {
      "id": "cat-123-abc",
      "name": "Electronics",
      "description": "Electronic devices and accessories",
      "isActive": true
    },
    "createdBy": {
      "id": "user-456",
      "username": "john.doe"
    }
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Processor Implementation:**
```typescript
@Processor('template-events')
export class TemplateEventsProcessor {

  @Process('template.category.created')
  async handleCategoryCreated(job: Job) {
    const { data } = job.data;

    const notification = await this.notificationService.create({
      category: 'template.category.created',
      title: 'Category Created',
      message: `New category '${data.name}' has been created.`,
      source: {
        service: 'template',
        entity: 'category',
        id: data._id,
        userId: data.createdBy
      },
      recipients: {
        orgIds: [data.orgId]
      },
      data: {
        category: {
          id: data._id,
          name: data.name,
          description: data.description,
          isActive: data.isActive
        },
        createdBy: { id: data.createdBy }
      }
    });
  }
}
```

---

### 3.2. `template.category.updated`

**Use Case:** Category updated, notify org members

**Sample Notification:**
```json
{
  "category": "template.category.updated",
  "title": "Category Updated",
  "message": "Category 'Electronics' has been updated.",

  "source": {
    "service": "template",
    "entity": "category",
    "id": "cat-123-abc",
    "userId": "user-456"
  },

  "recipients": {
    "orgIds": ["org-abc-456"]
  },

  "data": {
    "category": {
      "id": "cat-123-abc",
      "name": "Electronics"
    },
    "updatedFields": ["description", "isActive"],
    "updatedBy": {
      "id": "user-456",
      "username": "john.doe"
    }
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

### 3.3. `template.product.created`

**Use Case:** Product created, notify org + optionally route to CBM service

**Flow:**
```
Template Service → Create Product → Emit to template-events
    → Notification Service
    → 1) Broadcast to org
    → 2) Route to cbm-incoming queue (if configured)
```

**Sample Notification with Service Routing:**
```json
{
  "category": "template.product.created",
  "title": "Product Created",
  "message": "New product 'iPhone 15 Pro' has been added to catalog.",

  "source": {
    "service": "template",
    "entity": "product",
    "id": "prod-789-xyz",
    "userId": "user-456"
  },

  "recipients": {
    "orgIds": ["org-abc-456"],
    "service": "cbm",
    "queue": "cbm-incoming"
  },

  "data": {
    "product": {
      "id": "prod-789-xyz",
      "name": "iPhone 15 Pro",
      "description": "Latest iPhone model",
      "price": 999.99,
      "stock": 50,
      "categoryId": "cat-123-abc"
    },
    "createdBy": {
      "id": "user-456",
      "username": "john.doe"
    }
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Key Implementation Points:**
- Dual routing: WebSocket broadcast + Queue routing
- `recipients.service` and `recipients.queue` trigger inter-service communication
- CBM service can process product creation (e.g., sync inventory)

---

### 3.4. `template.product.updated`

**Use Case:** Product updated, notify org

**Sample Notification:**
```json
{
  "category": "template.product.updated",
  "title": "Product Updated",
  "message": "Product 'iPhone 15 Pro' price has been updated.",

  "source": {
    "service": "template",
    "entity": "product",
    "id": "prod-789-xyz",
    "userId": "user-456"
  },

  "recipients": {
    "orgIds": ["org-abc-456"]
  },

  "data": {
    "product": {
      "id": "prod-789-xyz",
      "name": "iPhone 15 Pro"
    },
    "updatedFields": ["price"],
    "changes": {
      "price": {
        "from": 999.99,
        "to": 899.99
      }
    }
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

### 3.5. `template.report.completed`

**Use Case:** Report generation completed, notify requesting user

**Flow:**
```
Template Service → Report Processor → Complete
    → Emit to template-events
    → Notification Service → Notify user
```

**Sample Notification:**
```json
{
  "category": "template.report.completed",
  "title": "Report Ready",
  "message": "Your 'Monthly Sales Report' is ready for download.",

  "source": {
    "service": "template",
    "entity": "report",
    "id": "report-555",
    "userId": "user-456"
  },

  "recipients": {
    "userIds": ["user-456"]
  },

  "data": {
    "report": {
      "id": "report-555",
      "name": "Monthly Sales Report",
      "type": "sales",
      "format": "pdf",
      "downloadUrl": "/api/template/reports/report-555/download",
      "generatedAt": "2025-10-17T11:30:00Z"
    },
    "processingTime": 45000
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Key Implementation Points:**
- User-specific notification (not broadcast)
- Include download URL
- Processing time for analytics

---

### 3.6. `template.report.failed`

**Use Case:** Report generation failed, notify user to retry

**Sample Notification:**
```json
{
  "category": "template.report.failed",
  "title": "Report Generation Failed",
  "message": "Failed to generate 'Monthly Sales Report'. Please try again.",

  "source": {
    "service": "template",
    "entity": "report",
    "id": "report-556",
    "userId": "user-456"
  },

  "recipients": {
    "userIds": ["user-456"]
  },

  "data": {
    "report": {
      "id": "report-556",
      "name": "Monthly Sales Report",
      "type": "sales"
    },
    "error": {
      "code": "INSUFFICIENT_DATA",
      "message": "No data available for the selected date range",
      "canRetry": true
    },
    "retryUrl": "/reports/generate?id=report-556"
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

## 4. Alert Categories

### 4.1. `alert.error`

**Use Case:** Critical system error detected, notify admins immediately

**Flow:**
```
Any Service → Error Handler → Emit to noti-incoming
    → Notification Service → Notify system admins + affected users
```

**Sample Notification:**
```json
{
  "category": "alert.error",
  "title": "Critical Error: Database Connection Failed",
  "message": "Template service unable to connect to MongoDB. Users may experience issues.",

  "source": {
    "service": "template",
    "entity": "database",
    "userId": "system"
  },

  "recipients": {
    "userIds": ["admin-001", "admin-002"],
    "orgIds": ["system-org"]
  },

  "data": {
    "error": {
      "code": "ECONNREFUSED",
      "message": "Connection refused to mongodb://localhost:27017",
      "stack": "Error: connect ECONNREFUSED 127.0.0.1:27017...",
      "timestamp": "2025-10-17T12:00:00Z"
    },
    "severity": "critical",
    "affectedUsers": 150,
    "service": "template",
    "actionRequired": "Check MongoDB service status and restart if necessary"
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Key Implementation Points:**
- Critical priority
- Detailed error information
- Action guidance for admins
- Track affected user count

---

### 4.2. `alert.warning`

**Use Case:** Warning about potential issues, notify relevant users

**Sample Notification:**
```json
{
  "category": "alert.warning",
  "title": "High API Usage Detected",
  "message": "Your organization has used 85% of monthly API quota.",

  "source": {
    "service": "noti",
    "entity": "usage_monitor"
  },

  "recipients": {
    "orgIds": ["org-abc-456"],
    "userIds": ["org-owner-456"]
  },

  "data": {
    "usage": {
      "current": 85000,
      "limit": 100000,
      "percentage": 85,
      "resetDate": "2025-11-01T00:00:00Z"
    },
    "recommendations": [
      "Review API call patterns",
      "Optimize frequent queries",
      "Consider upgrading plan"
    ]
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

### 4.3. `alert.threshold`

**Use Case:** Resource threshold exceeded, immediate action required

**Sample Notification:**
```json
{
  "category": "alert.threshold",
  "title": "Storage Quota Exceeded",
  "message": "Your organization has exceeded storage quota. Immediate action required.",

  "source": {
    "service": "noti",
    "entity": "storage_monitor"
  },

  "recipients": {
    "orgIds": ["org-abc-456"],
    "userIds": ["org-owner-456", "org-admin-789"]
  },

  "data": {
    "resource": "storage",
    "current": 105,
    "limit": 100,
    "unit": "GB",
    "exceeded": 5,
    "actions": [
      "Delete unused files",
      "Upgrade storage plan",
      "Archive old data"
    ],
    "gracePeriod": "72 hours before service restrictions"
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

## 5. Agent Categories

### 5.1. `agent.connected`

**Use Case:** Agent connects to system, notify user and auto-join agent room

**Flow:**
```
Agent Client → Connect → Notification Service
    → Notify user + Auto-join agent:{agentId} room
```

**Sample Notification:**
```json
{
  "category": "agent.connected",
  "title": "Agent Connected",
  "message": "Your AI assistant 'CodeHelper' is now online.",

  "source": {
    "agentId": "agent-code-helper-123"
  },

  "recipients": {
    "userIds": ["user-456"],
    "agentIds": ["agent-code-helper-123"]
  },

  "data": {
    "agent": {
      "id": "agent-code-helper-123",
      "name": "CodeHelper",
      "type": "coding_assistant",
      "capabilities": ["code_generation", "debugging", "refactoring"],
      "version": "2.1.0"
    },
    "connectionTime": "2025-10-17T13:00:00Z",
    "sessionId": "session-xyz-789"
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Key Implementation Points:**
- User auto-joins `agent:{agentId}` room
- All subsequent agent messages broadcast to this room
- Agent metadata for UI display

---

### 5.2. `agent.disconnected`

**Use Case:** Agent disconnects, notify user

**Sample Notification:**
```json
{
  "category": "agent.disconnected",
  "title": "Agent Disconnected",
  "message": "Your AI assistant 'CodeHelper' has disconnected.",

  "source": {
    "agentId": "agent-code-helper-123"
  },

  "recipients": {
    "userIds": ["user-456"]
  },

  "data": {
    "agent": {
      "id": "agent-code-helper-123",
      "name": "CodeHelper"
    },
    "disconnectionTime": "2025-10-17T14:00:00Z",
    "reason": "Session timeout",
    "sessionDuration": 3600
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

### 5.3. `agent.thinking`

**Use Case:** Agent processing request, real-time update to user

**Flow:**
```
Agent → Processing → Notification Service
    → Broadcast to agent:{agentId} room (user already joined)
```

**Sample Notification:**
```json
{
  "category": "agent.thinking",
  "title": "Agent Thinking",
  "message": "Analyzing your codebase structure...",

  "source": {
    "agentId": "agent-code-helper-123"
  },

  "recipients": {
    "agentIds": ["agent-code-helper-123"],
    "userIds": ["user-456"]
  },

  "data": {
    "executionId": "exec-abc-789",
    "agentActionType": "thinking",
    "thought": "Let me examine the files in the src/ directory to understand the project structure",
    "progress": 30,
    "estimatedTimeRemaining": 5000,
    "currentTask": "Scanning directory tree"
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Key Implementation Points:**
- Real-time streaming updates
- Progress tracking
- `agentActionType` in `data` field (not top-level)
- Optional ETA for UX

---

### 5.4. `agent.tool_use`

**Use Case:** Agent using a tool, notify user about action

**Sample Notification:**
```json
{
  "category": "agent.tool_use",
  "title": "Agent Using Tool",
  "message": "Reading file: src/main.ts",

  "source": {
    "agentId": "agent-code-helper-123"
  },

  "recipients": {
    "agentIds": ["agent-code-helper-123"],
    "userIds": ["user-456"]
  },

  "data": {
    "executionId": "exec-abc-789",
    "agentActionType": "tool_use",
    "tool": {
      "name": "read_file",
      "input": {
        "path": "src/main.ts",
        "encoding": "utf-8"
      }
    },
    "timestamp": "2025-10-17T13:01:00Z"
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

### 5.5. `agent.tool_result`

**Use Case:** Tool execution completed, return result

**Sample Notification:**
```json
{
  "category": "agent.tool_result",
  "title": "Tool Result",
  "message": "Successfully read file src/main.ts",

  "source": {
    "agentId": "agent-code-helper-123"
  },

  "recipients": {
    "agentIds": ["agent-code-helper-123"],
    "userIds": ["user-456"]
  },

  "data": {
    "executionId": "exec-abc-789",
    "agentActionType": "tool_result",
    "tool": {
      "name": "read_file"
    },
    "result": {
      "success": true,
      "output": "import { NestFactory } from '@nestjs/core'...",
      "lineCount": 45,
      "size": 1234
    },
    "executionTime": 150
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

### 5.6. `agent.request_help`

**Use Case:** Agent needs human assistance, escalate to user

**Sample Notification:**
```json
{
  "category": "agent.request_help",
  "title": "Agent Needs Assistance",
  "message": "Unable to determine the best approach. Please provide guidance.",

  "source": {
    "agentId": "agent-code-helper-123"
  },

  "recipients": {
    "userIds": ["user-456"],
    "agentIds": ["agent-code-helper-123"]
  },

  "data": {
    "executionId": "exec-abc-789",
    "agentActionType": "request_help",
    "reason": "ambiguous_requirements",
    "context": {
      "task": "Refactor authentication module",
      "question": "Should I use JWT or OAuth2 for the new implementation?",
      "options": ["JWT", "OAuth2", "Hybrid"],
      "considerations": [
        "JWT is simpler but less secure for long-lived sessions",
        "OAuth2 requires additional infrastructure",
        "Hybrid approach may be overkill for current needs"
      ]
    },
    "priority": "high",
    "requiresResponse": true
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Key Implementation Points:**
- High priority notification
- Clear question and options
- Requires user response (can use `user.message` to reply)

---

### 5.7. `agent.completed`

**Use Case:** Agent completed task, summary results

**Sample Notification:**
```json
{
  "category": "agent.completed",
  "title": "Task Completed",
  "message": "Successfully refactored authentication module.",

  "source": {
    "agentId": "agent-code-helper-123"
  },

  "recipients": {
    "userIds": ["user-456"],
    "agentIds": ["agent-code-helper-123"]
  },

  "data": {
    "executionId": "exec-abc-789",
    "agentActionType": "completed",
    "summary": {
      "filesModified": 5,
      "linesAdded": 120,
      "linesRemoved": 85,
      "testsAdded": 3,
      "duration": 45000
    },
    "result": {
      "success": true,
      "changes": [
        "Migrated from session-based to JWT authentication",
        "Added refresh token mechanism",
        "Updated all protected routes",
        "Added comprehensive test coverage"
      ]
    },
    "nextSteps": [
      "Review changes in PR #123",
      "Run full test suite",
      "Deploy to staging environment"
    ]
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Key Implementation Points:**
- Completion summary with metrics
- Clear result and changes
- Suggested next steps
- Link to related resources (PR, docs)

---

### 5.8. `agent.error`

**Use Case:** Agent encountered error, notify user

**Sample Notification:**
```json
{
  "category": "agent.error",
  "title": "Agent Error",
  "message": "Failed to complete task due to permission error.",

  "source": {
    "agentId": "agent-code-helper-123"
  },

  "recipients": {
    "userIds": ["user-456"],
    "agentIds": ["agent-code-helper-123"]
  },

  "data": {
    "executionId": "exec-abc-789",
    "agentActionType": "error",
    "error": {
      "code": "PERMISSION_DENIED",
      "message": "Cannot write to protected file: /etc/config.json",
      "recoverable": false,
      "suggestion": "Please check file permissions or run with appropriate access"
    },
    "context": {
      "task": "Update configuration file",
      "failedStep": "write_file",
      "attemptedPath": "/etc/config.json"
    },
    "partialResults": {
      "completedSteps": ["backup_existing_file", "validate_new_config"],
      "failedAt": "write_new_config"
    }
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

### 5.9. `agent.message`

**Use Case:** Agent sends message to user (chat-like interaction)

**Sample Notification:**
```json
{
  "category": "agent.message",
  "title": "Message from Agent",
  "message": "I've found 3 potential issues in your authentication code. Would you like me to fix them?",

  "source": {
    "agentId": "agent-code-helper-123"
  },

  "recipients": {
    "agentIds": ["agent-code-helper-123"],
    "userIds": ["user-456"]
  },

  "data": {
    "executionId": "exec-abc-789",
    "agentActionType": "message",
    "messageType": "question",
    "issues": [
      {
        "severity": "high",
        "description": "Missing password strength validation",
        "location": "src/auth/user.service.ts:45"
      },
      {
        "severity": "medium",
        "description": "No rate limiting on login endpoint",
        "location": "src/auth/auth.controller.ts:23"
      },
      {
        "severity": "high",
        "description": "JWT secret hardcoded in source",
        "location": "src/auth/jwt.strategy.ts:12"
      }
    ],
    "requiresResponse": true,
    "suggestedActions": [
      "Fix all issues automatically",
      "Show me the details first",
      "Skip for now"
    ]
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

---

## 6. User Messages

### 6.1. `user.message`

**Use Case:** User sends message back to agent or other user

**Flow:**
```
User Client → WebSocket emit('send_message') → Notification Service
    → Save to DB → Broadcast to agent room
```

**WebSocket Event from Client:**
```javascript
socket.emit('send_message', {
  room: 'agent:agent-code-helper-123',
  title: 'Message from User',
  message: 'Yes, please fix all three issues. Also add 2FA support if possible.',
  data: {
    executionId: 'exec-abc-789',
    messageType: 'response',
    replyToNotificationId: 'notif-xyz-123',
    instructions: [
      'Fix all 3 security issues',
      'Add 2FA support'
    ]
  }
});
```

**Resulting Notification:**
```json
{
  "category": "user.message",
  "title": "Message from User",
  "message": "Yes, please fix all three issues. Also add 2FA support if possible.",

  "source": {
    "userId": "user-456"
  },

  "recipients": {
    "agentIds": ["agent-code-helper-123"],
    "userIds": ["user-456"]
  },

  "data": {
    "executionId": "exec-abc-789",
    "messageType": "response",
    "replyToNotificationId": "notif-xyz-123",
    "instructions": [
      "Fix all 3 security issues",
      "Add 2FA support"
    ]
  },

  "deliveryStatus": "pending",
  "readByUserIds": []
}
```

**Gateway Handler:**
```typescript
@SubscribeMessage('send_message')
async handleClientMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() payload: any
) {
  const user = client.data.user; // From JWT auth

  // Create notification
  const notification = await this.notificationService.create({
    category: 'user.message',
    title: payload.title,
    message: payload.message,
    source: {
      userId: user.sub
    },
    recipients: {
      agentIds: [payload.room.replace('agent:', '')], // Extract agentId
      userIds: [user.sub] // Echo back to user
    },
    data: payload.data
  });

  // Broadcast to room (handled by service)

  return { success: true, id: notification._id };
}
```

---

## 7. Inter-Service Routing Patterns

### 7.1. Pattern: Service → Notification → WebSocket (One-way)

**Most common pattern for notifications**

```
┌─────────────────┐
│ Template Service│
└────────┬────────┘
         │
         │ 1. Create Category
         │
         │ 2. Emit to template-events queue
         │
         ▼
┌────────────────────┐
│ Notification Service│
│                    │
│ 3. Process Event   │
│ 4. Save to DB      │
│ 5. Broadcast WS    │
└─────────┬──────────┘
          │
          │ to org:{orgId}
          │
          ▼
    ┌─────────┐
    │  Users  │
    └─────────┘
```

**Use Cases:**
- Template: category.created, product.updated
- IAM: user.created, organization.updated
- Any service event that should notify users

---

### 7.2. Pattern: Service → Notification → Service Queue (Service-to-Service)

**For triggering actions in other services**

```
┌─────────────────┐
│ Template Service│
└────────┬────────┘
         │
         │ 1. Create Product
         │
         │ 2. Emit to template-events
         │
         ▼
┌────────────────────┐
│ Notification Service│
│                    │
│ 3. Process Event   │
│ 4. Create Notif    │
│    with recipients.│
│    service = "cbm" │
│                    │
│ 5. Route to        │
│    cbm-incoming    │
└─────────┬──────────┘
          │
          │ 6. Forward event
          │
          ▼
    ┌──────────┐
    │CBM Service│
    │          │
    │7. Process│
    │  (Update │
    │ inventory)│
    └──────────┘
```

**Example Notification:**
```json
{
  "category": "template.product.created",
  "recipients": {
    "orgIds": ["org-abc"],    // Also notify users via WebSocket
    "service": "cbm",          // Route to CBM service
    "queue": "cbm-incoming"    // Specific queue name
  }
}
```

**Service Layer Logic:**
```typescript
async create(dto: CreateNotificationDto) {
  // 1. Save notification
  const notification = await this.notificationModel.create(dto);

  // 2. Broadcast to WebSocket rooms (if applicable)
  if (dto.recipients.userIds || dto.recipients.orgIds || dto.recipients.agentIds) {
    const rooms = this.mapRecipientsToRooms(dto.recipients);
    await this.gateway.broadcastToRooms(rooms, notification);
  }

  // 3. Route to another service queue
  if (dto.recipients.service && dto.recipients.queue) {
    await this.queueProducer.sendToServiceQueue(
      dto.recipients.queue,
      {
        event: dto.category,
        notification: notification,
        data: dto.data,
        timestamp: new Date().toISOString()
      }
    );
  }

  return notification;
}
```

---

### 7.3. Pattern: User → WebSocket → Agent → WebSocket (Bidirectional)

**Real-time chat between user and agent**

```
┌──────────┐              ┌────────────────────┐              ┌─────────┐
│User Client│              │ Notification Service│              │Agent    │
└─────┬────┘              └──────────┬──────────┘              └────┬────┘
      │                              │                              │
      │ 1. send_message              │                              │
      │ (via WebSocket)              │                              │
      ├─────────────────────────────►│                              │
      │                              │                              │
      │                         2. Save to DB                       │
      │                              │                              │
      │                         3. Broadcast to                     │
      │                            agent:{id} room                  │
      │                              ├─────────────────────────────►│
      │                              │                              │
      │                              │     4. Agent processes       │
      │                              │                              │
      │                              │     5. Agent sends response  │
      │                              │◄─────────────────────────────┤
      │                              │                              │
      │                         6. Save to DB                       │
      │                              │                              │
      │     7. Broadcast back        │                              │
      │◄─────────────────────────────┤                              │
      │                              │                              │
```

**Flow:**
1. User emits `send_message` with `category: 'user.message'`
2. Service saves and broadcasts to `agent:{agentId}` room
3. Agent receives, processes request
4. Agent emits message with `category: 'agent.message'`
5. Service saves and broadcasts back to user

---

### 7.4. Queue Subscription Matrix

| Service | Subscribes To | Emits To | Purpose |
|---------|---------------|----------|---------|
| **Notification** | `template-events`<br>`iam-events`<br>`cbm-events` | `noti-events` | Receive events from all services<br>Emit delivery status |
| **Template** | `noti-incoming`<br>`template-incoming` | `template-events` | Receive commands from Notification<br>Emit CRUD events |
| **IAM** | `noti-incoming`<br>`iam-incoming` | `iam-events` | Receive commands<br>Emit user/org events |
| **CBM** | `noti-incoming`<br>`template-events`<br>`cbm-incoming` | `cbm-events` | Receive commands + template events<br>Emit business events |

---

## 📊 Summary Statistics

### Notification Categories Count

| Domain | Count | Categories |
|--------|-------|------------|
| **System** | 3 | announcement, maintenance, update |
| **IAM** | 5 | user.created/updated/deleted, organization.created/updated |
| **Template** | 6 | category/product created/updated, report completed/failed |
| **CBM** | 2+ | order.created/updated, ... |
| **Notification** | 2 | delivered, failed |
| **Alert** | 3 | error, warning, threshold |
| **Agent** | 8 | connected, disconnected, thinking, tool_use, tool_result, request_help, completed, error, message |
| **User** | 1 | message |
| **Total** | 30+ | Extensible as needed |

---

## 🔑 Key Takeaways

### Schema Patterns

1. **Source Object** - Always identifies origin:
   - `service`: Which service created this
   - `entity`: What type of resource
   - `id`: Specific resource ID
   - `userId` or `agentId`: Who initiated

2. **Recipients Object** - Flexible routing:
   - `userIds[]`: Specific users → `user:{id}` rooms
   - `orgIds[]`: Organizations → `org:{id}` rooms
   - `agentIds[]`: Agents → `agent:{id}` rooms
   - `service` + `queue`: Inter-service routing

3. **Data Field** - Category-specific payload:
   - `agentActionType`: Agent action details
   - `executionId`: Track agent executions
   - Custom fields per category
   - Metadata for UI/UX

### Implementation Guidelines

1. **Processor per Service**: Create dedicated processors for each external service queue
2. **Dual Routing**: Support both WebSocket broadcast AND queue routing
3. **Real-time Updates**: Agent categories should stream progress updates
4. **Error Handling**: Always include error details and recovery suggestions
5. **Audit Trail**: Save all notifications to DB before broadcasting

---

**Next Steps:**
1. Review and validate all flows
2. Finalize database schema based on patterns
3. Implement processors for each service
4. Build comprehensive test cases

