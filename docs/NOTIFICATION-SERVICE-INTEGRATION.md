# Notification Service - Integration Guide

**Document Version:** 1.0
**Date Created:** 2025-10-18
**Service:** Notification Service (noti)
**Port:** 3002
**Status:** Production Ready ✅

---

## 📋 Overview

Notification Service cung cấp hệ thống thông báo real-time với 3 phương thức giao tiếp:
1. **REST API** - Quản lý notifications (CRUD)
2. **WebSocket** - Real-time push notifications đến clients
3. **Queue (BullMQ)** - Event-driven notifications từ các services khác

---

## 🚀 Quick Start

### 1. Service Information

- **Base URL:** `http://localhost:3002/api`
- **WebSocket URL:** `ws://localhost:3002/notifications`
- **Swagger Docs:** `http://localhost:3002/api-docs`
- **Health Check:** `http://localhost:3002/api/health`

### 2. Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/hydra-noti

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Service
PORT=3002
NODE_ENV=development
```

### 3. Start Service

```bash
# Development
npx nx serve noti

# Production build
npx nx build noti
node dist/services/noti/main.js
```

---

## 🔌 WebSocket Integration

### Client Connection

```typescript
import { io } from 'socket.io-client';

// Connect với JWT token
const socket = io('ws://localhost:3002/notifications', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Hoặc dùng Authorization header
const socket = io('ws://localhost:3002/notifications', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token'
  }
});

// Connection events
socket.on('connected', (data) => {
  console.log('Connected:', data);
  // { message: 'Connected to notification service', userId: '...', rooms: [...] }
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

### Listening to Notification Events

Service emit 4 loại events tương ứng với queue event names:

#### 1. system.notification

```typescript
socket.on('system.notification', (notification) => {
  console.log('System Notification:', notification);

  // Structure:
  // {
  //   title: string,
  //   message: string,
  //   severity: 'low' | 'normal' | 'high' | 'critical',
  //   notificationMetadata: {
  //     notificationId: string,
  //     correlationId?: string,
  //     orgId?: string,
  //     userId?: string,
  //     timestamp: string
  //   },
  //   data?: { ... },
  //   recipients: { ... }
  // }

  // Display notification to user
  showNotification(notification.title, notification.message, notification.severity);
});
```

#### 2. service.event

```typescript
socket.on('service.event', (event) => {
  console.log('Service Event:', event);

  // Structure:
  // {
  //   name: string,  // e.g., 'user.created', 'order.completed'
  //   notificationMetadata: {
  //     notificationId: string,
  //     correlationId?: string,
  //     orgId?: string,
  //     userId?: string,
  //     agentId?: string,
  //     timestamp: string
  //   },
  //   data?: { ... },
  //   recipients: { ... }
  // }

  // Client generates title/message based on event name
  const title = generateTitleFromEvent(event.name);
  const message = generateMessageFromEvent(event.name, event.data);
  showNotification(title, message);
});
```

#### 3. service.alert

```typescript
socket.on('service.alert', (alert) => {
  console.log('Service Alert:', alert);

  // Structure: Similar to system.notification
  // {
  //   title: string,
  //   message: string,
  //   severity: 'low' | 'normal' | 'high' | 'critical',
  //   notificationMetadata: { ... },
  //   data?: { ... },
  //   recipients: { ... }
  // }

  // Show alert with appropriate styling based on severity
  showAlert(alert.title, alert.message, alert.severity);
});
```

#### 4. agent.event

```typescript
socket.on('agent.event', (event) => {
  console.log('Agent Event:', event);

  // Structure:
  // {
  //   name: string,
  //   title?: string,
  //   message?: string,
  //   severity?: 'low' | 'normal' | 'high' | 'critical',
  //   notificationMetadata: {
  //     notificationId: string,
  //     agentId: string,
  //     ...
  //   },
  //   data?: { ... },
  //   recipients: { ... }
  // }

  // If title/message provided, use them directly
  // Otherwise, generate from event name
  const title = event.title || generateTitleFromEvent(event.name);
  const message = event.message || generateMessageFromEvent(event.name, event.data);
  showNotification(title, message, event.severity);
});
```

### Room-Based Subscriptions

Khi connect, client tự động join vào các rooms dựa trên JWT payload:

- **user:{userId}** - Notifications cho user cụ thể
- **org:{orgId}** - Notifications cho organization
- **agent:{agentId}** - Notifications cho agent (nếu có)

Không cần subscribe manually, WebSocket Gateway tự động join rooms dựa trên JWT.

---

## 📡 Queue Integration (BullMQ)

### Emit Events từ Services Khác

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class YourService {
  constructor(
    @InjectQueue('noti') private notiQueue: Queue,
  ) {}

  async sendNotification() {
    // 1. System Notification
    await this.notiQueue.add('system.notification', {
      event: 'system.notification',
      data: {
        title: 'System Maintenance',
        message: 'The system will be down for maintenance at 2 AM',
        severity: 'high',
        metadata: {
          correlationId: 'maint-001',
          timestamp: new Date().toISOString(),
        },
        recipients: {
          broadcast: true,  // Send to all connected clients
        },
      },
    });

    // 2. Service Event
    await this.notiQueue.add('service.event', {
      event: 'service.event',
      data: {
        name: 'user.created',
        metadata: {
          correlationId: 'user-123',
          orgId: 'org-456',
          userId: 'user-789',
          timestamp: new Date().toISOString(),
        },
        data: {
          userId: 'user-789',
          username: 'john.doe',
          email: 'john@example.com',
        },
        recipients: {
          orgIds: ['org-456'],  // Send to organization
        },
      },
    });

    // 3. Service Alert
    await this.notiQueue.add('service.alert', {
      event: 'service.alert',
      data: {
        title: 'High CPU Usage',
        message: 'CPU usage is above 90% for the last 5 minutes',
        severity: 'critical',
        metadata: {
          correlationId: 'alert-001',
          timestamp: new Date().toISOString(),
        },
        recipients: {
          userIds: ['admin-1', 'admin-2'],  // Send to specific users
        },
      },
    });

    // 4. Agent Event
    await this.notiQueue.add('agent.event', {
      event: 'agent.event',
      data: {
        name: 'agent.task.completed',
        title: 'Task Completed',
        message: 'Data processing task has been completed successfully',
        severity: 'normal',
        metadata: {
          correlationId: 'task-001',
          agentId: 'agent-123',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
        },
        data: {
          taskId: 'task-001',
          duration: 1234,
          recordsProcessed: 5000,
        },
        recipients: {
          agentIds: ['agent-123'],
          userIds: ['user-456'],
        },
      },
    });
  }
}
```

### Event Processing Flow

```
Service A → Emit Event → Queue (noti)
                            ↓
              NotificationProcessor (consumes)
                            ↓
                ┌───────────┴───────────┐
                ↓                       ↓
         Save to MongoDB      Emit to WebSocket
                                       ↓
                              Connected Clients
```

---

## 🔐 REST API Integration

### Authentication

Tất cả endpoints yêu cầu JWT token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3002/api/notifications
```

### Endpoints

#### 1. Get All Notifications

```bash
GET /api/notifications?limit=50&skip=0

Response:
[
  {
    "_id": "notification-id",
    "event": "system.notification",
    "title": "New Feature Released",
    "message": "Check out our new analytics dashboard",
    "severity": "normal",
    "notificationMetadata": {
      "correlationId": "feature-001",
      "orgId": "org-123",
      "timestamp": "2025-10-18T00:00:00Z"
    },
    "data": { ... },
    "recipients": { ... },
    "deliveryStatus": "delivered",
    "readByUserIds": [],
    "createdAt": "2025-10-18T00:00:00Z",
    "updatedAt": "2025-10-18T00:00:00Z"
  }
]
```

#### 2. Get Unread Count

```bash
GET /api/notifications/unread-count

Response:
{
  "count": 5
}
```

#### 3. Get Unread Notifications

```bash
GET /api/notifications/unread?limit=50

Response: Array of unread notifications
```

#### 4. Get Notification by ID

```bash
GET /api/notifications/:id

Response: Single notification object
```

#### 5. Mark as Read

```bash
PATCH /api/notifications/:id/read

Response: Updated notification with userId in readByUserIds
```

#### 6. Update Notification

```bash
PATCH /api/notifications/:id
Content-Type: application/json

{
  "title": "Updated title",
  "message": "Updated message"
}

Response: Updated notification
```

#### 7. Delete Notification (Soft Delete)

```bash
DELETE /api/notifications/:id

Response: Deleted notification with isDeleted=true
```

---

## 🏗️ Integration Examples

### Example 1: Template Service Integration

```typescript
// In Template Service
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ReportService {
  constructor(
    @InjectQueue('noti') private notiQueue: Queue,
  ) {}

  async generateReport(userId: string, orgId: string) {
    // Generate report...

    // Emit notification when report is ready
    await this.notiQueue.add('service.event', {
      event: 'service.event',
      data: {
        name: 'report.generated',
        metadata: {
          correlationId: `report-${Date.now()}`,
          orgId,
          userId,
          timestamp: new Date().toISOString(),
        },
        data: {
          reportId: 'report-123',
          reportType: 'monthly-summary',
          downloadUrl: '/reports/123/download',
        },
        recipients: {
          userIds: [userId],
          orgIds: [orgId],
        },
      },
    });
  }
}
```

### Example 2: React Client Integration

```typescript
// React Component
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function NotificationComponent() {
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Get JWT token from auth state
    const token = localStorage.getItem('jwt_token');

    // Connect to WebSocket
    const newSocket = io('ws://localhost:3002/notifications', {
      auth: { token }
    });

    newSocket.on('connected', (data) => {
      console.log('Connected to notifications:', data);
    });

    // Listen to all event types
    newSocket.on('system.notification', (notification) => {
      addNotification(notification);
      showToast(notification.title, notification.message, notification.severity);
    });

    newSocket.on('service.event', (event) => {
      addNotification(event);
      // Generate UI message based on event name
      const message = formatServiceEvent(event);
      showToast(message.title, message.body);
    });

    newSocket.on('service.alert', (alert) => {
      addNotification(alert);
      showAlert(alert.title, alert.message, alert.severity);
    });

    newSocket.on('agent.event', (event) => {
      addNotification(event);
      showToast(event.title || event.name, event.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const markAsRead = async (notificationId) => {
    const response = await fetch(
      `http://localhost:3002/api/notifications/${notificationId}/read`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      }
    );
    // Update UI
  };

  return (
    <div>
      <h2>Notifications ({notifications.length})</h2>
      {notifications.map(notif => (
        <NotificationItem
          key={notif.notificationMetadata.notificationId}
          notification={notif}
          onMarkRead={markAsRead}
        />
      ))}
    </div>
  );
}
```

---

## 📊 Monitoring & Health Check

### Health Check Endpoint

```bash
GET /api/health

Response:
{
  "status": "ok",
  "info": {
    "version": "1.0.0",
    "gitCommit": "abc123",
    "uptime": 12345.67,
    "environment": "development"
  },
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

### Queue Monitoring

```bash
# Check queue status (BullMQ Board - if installed)
# Or use Redis CLI to check queue
redis-cli

> KEYS bull:noti:*
> LLEN bull:noti:wait
> LLEN bull:noti:active
> LLEN bull:noti:completed
> LLEN bull:noti:failed
```

---

## 🔧 Troubleshooting

### Issue 1: WebSocket Connection Failed

**Problem:** Client cannot connect to WebSocket

**Solutions:**
- Verify JWT token is valid and not expired
- Check token is sent in correct format: `auth.token` or `Authorization` header
- Verify WebSocket URL is correct: `ws://localhost:3002/notifications`
- Check CORS settings if connecting from browser

### Issue 2: Not Receiving Notifications

**Problem:** Connected but not receiving events

**Solutions:**
- Check user is in correct room (userId, orgId in JWT)
- Verify recipients configuration in event data
- Check WebSocket event listeners are attached before events are emitted
- Verify Redis connection (BullMQ needs Redis)

### Issue 3: Queue Events Not Processing

**Problem:** Events added to queue but not processed

**Solutions:**
- Verify Redis is running and accessible
- Check `REDIS_HOST` and `REDIS_PORT` environment variables
- Check NotificationProcessor logs for errors
- Verify queue name is 'noti'

---

## 📚 References

- [NOTIFICATION-SERVICE-REQUIREMENTS.md](./NOTIFICATION-SERVICE-REQUIREMENTS.md) - Full requirements
- [NOTIFICATION-SERVICE-FLOWS-V2.md](./NOTIFICATION-SERVICE-FLOWS-V2.md) - Event flows and patterns
- [NOTIFICATION-SERVICE-PLAN.md](./NOTIFICATION-SERVICE-PLAN.md) - Implementation plan
- Swagger Documentation: http://localhost:3002/api-docs

---

## 🎯 Best Practices

### 1. Event Naming

Use descriptive, hierarchical event names:
```
✅ Good: 'user.created', 'order.completed', 'payment.failed'
❌ Bad: 'created', 'done', 'error'
```

### 2. Severity Levels

Choose appropriate severity:
- **critical**: System failures, security issues
- **high**: Important events requiring attention
- **normal**: Standard notifications
- **low**: Informational events

### 3. Recipients

Be specific with recipients to avoid unnecessary notifications:
```typescript
// ✅ Good: Target specific users/orgs
recipients: {
  userIds: ['user-123'],
  orgIds: ['org-456']
}

// ❌ Avoid: Broadcasting unless truly necessary
recipients: {
  broadcast: true
}
```

### 4. Correlation IDs

Always include correlationId for debugging and tracing:
```typescript
metadata: {
  correlationId: 'unique-request-id',
  timestamp: new Date().toISOString()
}
```

---

## ✅ Checklist cho Services Muốn Tích Hợp

- [ ] Thêm BullMQ dependency vào service
- [ ] Configure Redis connection
- [ ] Inject `noti` queue vào service
- [ ] Emit events với đúng format theo types
- [ ] Test events được deliver qua WebSocket
- [ ] Test notifications được lưu vào MongoDB
- [ ] Document các event types service emit

---

**Last Updated:** 2025-10-18
**Maintained By:** Hydra Services Team
