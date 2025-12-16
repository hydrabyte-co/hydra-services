# Work API - Frontend Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Work Hierarchy](#work-hierarchy)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [CRUD Operations](#crud-operations)
7. [State Management](#state-management)
8. [Common Use Cases](#common-use-cases)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

---

## Overview

Work API quản lý công việc (tasks) với 3 cấp độ phân cấp: Epic → Task → Subtask. API hỗ trợ state machine để quản lý trạng thái và workflow của công việc.

**Base URL**: `http://localhost:3001` (development)

**Key Features**:
- ✅ 3-level hierarchy (Epic/Task/Subtask)
- ✅ State machine workflow
- ✅ Agent scheduling
- ✅ Dependency tracking
- ✅ Multi-tenant ownership
- ✅ Soft delete

---

## Authentication

Tất cả endpoints yêu cầu JWT Bearer token trong header.

```typescript
const API_BASE = 'http://localhost:3001';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

**Lấy token từ IAM service:**
```typescript
async function login(username: string, password: string): Promise<string> {
  const response = await fetch('https://api.x-or.cloud/dev/iam-v2/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();
  return data.accessToken;
}
```

---

## Work Hierarchy

```
Epic (top level - no parent)
├── Task (parent: epic or null)
│   ├── Subtask (parent: task)
│   ├── Subtask (parent: task)
│   └── Subtask (parent: task)
└── Task (parent: epic or null)

Task (independent - no parent)
├── Subtask (parent: task)
└── Subtask (parent: task)
```

**Quy tắc phân cấp:**
- **Epic**: Không có parent (parentId = null)
- **Task**: Có thể có epic làm parent hoặc độc lập (parentId = epicId hoặc null)
- **Subtask**: BẮT BUỘC có task làm parent (parentId = taskId)

---

## API Endpoints

### Base CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/works` | Create new work |
| GET | `/works` | List works with pagination |
| GET | `/works/:id` | Get work by ID |
| PATCH | `/works/:id` | Update work (limited fields) |
| DELETE | `/works/:id` | Soft delete work |

### Action Endpoints (State Transitions)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/works/:id/start` | Start work (backlog/todo → in_progress) |
| POST | `/works/:id/block` | Block work (in_progress → blocked) |
| POST | `/works/:id/unblock` | Unblock work (blocked → in_progress) |
| POST | `/works/:id/request-review` | Request review (in_progress → review) |
| POST | `/works/:id/complete` | Complete work (review → done) |
| POST | `/works/:id/reopen` | Reopen work (done → in_progress) |
| POST | `/works/:id/cancel` | Cancel work (any → cancelled) |

### Special Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/works/:id/can-trigger` | Check if work can trigger agent |

---

## Data Models

### Work Entity
```typescript
interface Work {
  _id: string;                    // MongoDB ObjectId
  title: string;                  // Work title (max 200 chars)
  description?: string;           // Markdown description (max 10000 chars)
  type: 'epic' | 'task' | 'subtask';  // Work type
  status: WorkStatus;             // Current status
  projectId?: string;             // Optional project reference

  reporter: {                     // Who reported the work
    type: 'user' | 'agent';
    id: string;
  };

  assignee?: {                    // Who is assigned
    type: 'user' | 'agent';
    id: string;
  };

  dueDate?: string;               // ISO 8601 date
  startAt?: string;               // ISO 8601 date (for agent scheduling)

  dependencies: string[];         // Array of Work IDs this work depends on
  reason?: string;                // Block reason (when status = blocked)
  parentId?: string;              // Parent work ID
  documents: string[];            // Array of document IDs

  // BaseSchema fields
  owner: {
    orgId: string;
    groupId?: string;
    agentId?: string;
    appId?: string;
  };
  createdBy: string;
  updatedBy?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

type WorkStatus =
  | 'backlog'      // Initial state
  | 'todo'         // Ready to start
  | 'in_progress'  // Being worked on
  | 'blocked'      // Blocked by dependencies
  | 'review'       // Under review
  | 'done'         // Completed
  | 'cancelled';   // Cancelled
```

### Create Work DTO
```typescript
interface CreateWorkDto {
  title: string;                  // Required
  description?: string;
  type: 'epic' | 'task' | 'subtask';  // Required
  projectId?: string;

  reporter: {                     // Required
    type: 'user' | 'agent';
    id: string;
  };

  assignee?: {
    type: 'user' | 'agent';
    id: string;
  };

  dueDate?: string;               // ISO 8601
  startAt?: string;               // ISO 8601
  dependencies?: string[];
  parentId?: string;              // Required for subtask
  documents?: string[];
}
```

### Update Work DTO
```typescript
interface UpdateWorkDto {
  title?: string;
  description?: string;
  projectId?: string;

  reporter?: {
    type: 'user' | 'agent';
    id: string;
  };

  assignee?: {
    type: 'user' | 'agent';
    id: string;
  };

  dueDate?: string;
  startAt?: string;
  dependencies?: string[];
  parentId?: string;
  documents?: string[];

  // ❌ CANNOT UPDATE: type, status, reason
}
```

### Block Work DTO
```typescript
interface BlockWorkDto {
  reason: string;  // Required (max 1000 chars)
}
```

---

## CRUD Operations

### 1. Create Work

#### Create Epic
```typescript
async function createEpic(
  title: string,
  reporterId: string
): Promise<Work> {
  const response = await fetch(`${API_BASE}/works`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title,
      type: 'epic',
      reporter: {
        type: 'user',
        id: reporterId
      }
      // parentId sẽ tự động = null
    })
  });

  return response.json();
}
```

#### Create Task (under Epic)
```typescript
async function createTask(
  title: string,
  epicId: string,
  reporterId: string
): Promise<Work> {
  const response = await fetch(`${API_BASE}/works`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title,
      type: 'task',
      parentId: epicId,  // Optional - can be null for independent task
      reporter: {
        type: 'user',
        id: reporterId
      }
    })
  });

  return response.json();
}
```

#### Create Subtask (under Task)
```typescript
async function createSubtask(
  title: string,
  taskId: string,
  reporterId: string
): Promise<Work> {
  const response = await fetch(`${API_BASE}/works`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title,
      type: 'subtask',
      parentId: taskId,  // Required for subtask
      reporter: {
        type: 'user',
        id: reporterId
      }
    })
  });

  return response.json();
}
```

### 2. List Works

```typescript
interface ListWorksParams {
  page?: number;
  limit?: number;
  sort?: string;
  'filter[status]'?: WorkStatus;
  'filter[type]'?: 'epic' | 'task' | 'subtask';
  'filter[projectId]'?: string;
  'filter[assignee.id]'?: string;
  'filter[parentId]'?: string;
}

interface ListWorksResponse {
  data: Work[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: {
    total: number;
    byStatus: Record<WorkStatus, number>;
    byType: Record<string, number>;
  };
}

async function listWorks(params: ListWorksParams): Promise<ListWorksResponse> {
  const queryString = new URLSearchParams(params as any).toString();
  const response = await fetch(`${API_BASE}/works?${queryString}`, {
    headers
  });

  return response.json();
}

// Examples:
// All works, page 1
const allWorks = await listWorks({ page: 1, limit: 20 });

// Only in_progress works
const inProgressWorks = await listWorks({
  'filter[status]': 'in_progress'
});

// Tasks assigned to user
const myTasks = await listWorks({
  'filter[assignee.id]': currentUserId,
  'filter[type]': 'task'
});

// Subtasks of a specific task
const subtasks = await listWorks({
  'filter[parentId]': taskId,
  'filter[type]': 'subtask'
});

// Sort by newest first
const recentWorks = await listWorks({
  sort: '-createdAt',
  limit: 10
});
```

### 3. Get Work by ID

```typescript
async function getWork(id: string): Promise<Work> {
  const response = await fetch(`${API_BASE}/works/${id}`, {
    headers
  });

  if (!response.ok) {
    throw new Error('Work not found');
  }

  return response.json();
}
```

### 4. Update Work

**Lưu ý**: Chỉ được update một số trường nhất định.

```typescript
async function updateWork(
  id: string,
  updates: UpdateWorkDto
): Promise<Work> {
  const response = await fetch(`${API_BASE}/works/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates)
  });

  return response.json();
}

// Examples:
// Update title
await updateWork(workId, { title: 'New title' });

// Assign to agent
await updateWork(workId, {
  assignee: {
    type: 'agent',
    id: agentId
  }
});

// Set due date
await updateWork(workId, {
  dueDate: '2025-03-31T23:59:59.000Z'
});

// Add dependencies
await updateWork(workId, {
  dependencies: [otherWorkId1, otherWorkId2]
});
```

### 5. Delete Work

```typescript
async function deleteWork(id: string): Promise<void> {
  await fetch(`${API_BASE}/works/${id}`, {
    method: 'DELETE',
    headers
  });
}
```

---

## State Management

### State Transition Diagram

```
backlog ──────> todo ──────> in_progress ──────> review ──────> done
                  ↑              │                                │
                  │              ↓                                ↓
                  └────────── blocked                        in_progress
                                                             (reopen)

                  any ──────────> cancelled
```

### Action Methods

#### 1. Start Work
```typescript
async function startWork(id: string): Promise<Work> {
  const response = await fetch(`${API_BASE}/works/${id}/start`, {
    method: 'POST',
    headers
  });

  return response.json();
}

// Transition: backlog/todo → in_progress
```

#### 2. Block Work
```typescript
async function blockWork(id: string, reason: string): Promise<Work> {
  const response = await fetch(`${API_BASE}/works/${id}/block`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reason })
  });

  return response.json();
}

// Transition: in_progress → blocked
// Sets reason field
```

#### 3. Unblock Work
```typescript
async function unblockWork(id: string): Promise<Work> {
  const response = await fetch(`${API_BASE}/works/${id}/unblock`, {
    method: 'POST',
    headers
  });

  return response.json();
}

// Transition: blocked → in_progress
// Clears reason field
```

#### 4. Request Review
```typescript
async function requestReview(id: string): Promise<Work> {
  const response = await fetch(`${API_BASE}/works/${id}/request-review`, {
    method: 'POST',
    headers
  });

  return response.json();
}

// Transition: in_progress → review
```

#### 5. Complete Work
```typescript
async function completeWork(id: string): Promise<Work> {
  const response = await fetch(`${API_BASE}/works/${id}/complete`, {
    method: 'POST',
    headers
  });

  return response.json();
}

// Transition: review → done
```

#### 6. Reopen Work
```typescript
async function reopenWork(id: string): Promise<Work> {
  const response = await fetch(`${API_BASE}/works/${id}/reopen`, {
    method: 'POST',
    headers
  });

  return response.json();
}

// Transition: done → in_progress
```

#### 7. Cancel Work
```typescript
async function cancelWork(id: string): Promise<Work> {
  const response = await fetch(`${API_BASE}/works/${id}/cancel`, {
    method: 'POST',
    headers
  });

  return response.json();
}

// Transition: any → cancelled
```

---

## Common Use Cases

### Use Case 1: Hiển thị Kanban Board

```typescript
interface KanbanColumn {
  status: WorkStatus;
  title: string;
  works: Work[];
}

async function loadKanbanBoard(): Promise<KanbanColumn[]> {
  const statuses: WorkStatus[] = [
    'backlog',
    'todo',
    'in_progress',
    'review',
    'done'
  ];

  const columns = await Promise.all(
    statuses.map(async (status) => {
      const response = await listWorks({
        'filter[status]': status,
        limit: 100,
        sort: '-updatedAt'
      });

      return {
        status,
        title: getStatusTitle(status),
        works: response.data
      };
    })
  );

  return columns;
}

function getStatusTitle(status: WorkStatus): string {
  const titles = {
    backlog: 'Backlog',
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done'
  };
  return titles[status] || status;
}
```

### Use Case 2: Hiển thị Epic Tree

```typescript
interface EpicTree {
  epic: Work;
  tasks: TaskTree[];
}

interface TaskTree {
  task: Work;
  subtasks: Work[];
}

async function loadEpicTree(epicId: string): Promise<EpicTree> {
  // Load epic
  const epic = await getWork(epicId);

  // Load tasks under epic
  const tasksResponse = await listWorks({
    'filter[parentId]': epicId,
    'filter[type]': 'task'
  });

  // Load subtasks for each task
  const tasks = await Promise.all(
    tasksResponse.data.map(async (task) => {
      const subtasksResponse = await listWorks({
        'filter[parentId]': task._id,
        'filter[type]': 'subtask'
      });

      return {
        task,
        subtasks: subtasksResponse.data
      };
    })
  );

  return { epic, tasks };
}
```

### Use Case 3: Tạo Full Work Hierarchy

```typescript
async function createFullHierarchy(
  epicTitle: string,
  tasks: Array<{
    title: string;
    subtasks: string[];
  }>,
  reporterId: string
): Promise<EpicTree> {
  // 1. Create epic
  const epic = await createEpic(epicTitle, reporterId);

  // 2. Create tasks and subtasks
  const taskTrees = await Promise.all(
    tasks.map(async (taskData) => {
      // Create task
      const task = await createTask(
        taskData.title,
        epic._id,
        reporterId
      );

      // Create subtasks
      const subtasks = await Promise.all(
        taskData.subtasks.map(subtaskTitle =>
          createSubtask(subtaskTitle, task._id, reporterId)
        )
      );

      return { task, subtasks };
    })
  );

  return { epic, tasks: taskTrees };
}

// Usage:
const hierarchy = await createFullHierarchy(
  'Q1 2025 Features',
  [
    {
      title: 'User Authentication',
      subtasks: [
        'Implement login endpoint',
        'Add JWT validation',
        'Write unit tests'
      ]
    },
    {
      title: 'Dashboard UI',
      subtasks: [
        'Design dashboard layout',
        'Implement chart components'
      ]
    }
  ],
  currentUserId
);
```

### Use Case 4: Agent Scheduling

```typescript
interface CanTriggerResponse {
  canTrigger: boolean;
  reason: string;
  work: Work | null;
}

async function scheduleAgentWork(
  workId: string,
  agentId: string,
  startAt: string
): Promise<Work> {
  // 1. Assign to agent
  const work = await updateWork(workId, {
    assignee: {
      type: 'agent',
      id: agentId
    },
    startAt
  });

  // 2. Check if can trigger
  const canTrigger = await checkCanTriggerAgent(workId);

  if (canTrigger.canTrigger) {
    console.log('✅ Agent can be triggered:', canTrigger.reason);
    // Trigger agent execution via AIWM service
  } else {
    console.log('❌ Cannot trigger agent:', canTrigger.reason);
  }

  return work;
}

async function checkCanTriggerAgent(
  workId: string
): Promise<CanTriggerResponse> {
  const response = await fetch(
    `${API_BASE}/works/${workId}/can-trigger`,
    { headers }
  );

  return response.json();
}
```

### Use Case 5: Work Dependencies

```typescript
async function createDependentWork(
  title: string,
  dependsOn: string[],
  reporterId: string
): Promise<Work> {
  // Create work with dependencies
  const work = await createTask(title, null, reporterId);

  // Add dependencies
  await updateWork(work._id, { dependencies: dependsOn });

  return getWork(work._id);
}

async function checkWorkCanStart(workId: string): Promise<boolean> {
  const work = await getWork(workId);

  if (!work.dependencies || work.dependencies.length === 0) {
    return true;
  }

  // Check if all dependencies are done
  const dependencies = await Promise.all(
    work.dependencies.map(id => getWork(id))
  );

  return dependencies.every(dep => dep.status === 'done');
}
```

---

## Error Handling

### Common Error Responses

```typescript
interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

// Example error handler
async function handleApiCall<T>(
  apiCall: () => Promise<Response>
): Promise<T> {
  try {
    const response = await apiCall();

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### Error Scenarios

| Status | Error | Scenario |
|--------|-------|----------|
| 400 | Cannot update work type | Tried to change type via PATCH |
| 400 | Cannot update status directly | Tried to change status via PATCH |
| 400 | Epic cannot have a parent | Created epic with parentId |
| 400 | Subtask must have a parentId | Created subtask without parentId |
| 400 | Task can only have epic as parent | Created task with task/subtask parent |
| 400 | Subtask can only have task as parent | Created subtask with epic/subtask parent |
| 400 | Cannot start work with status... | Invalid state transition |
| 400 | Reason is required when blocking work | Blocked without reason |
| 404 | Work not found | Invalid work ID or not owned |
| 401 | Unauthorized | Missing or invalid token |

---

## Best Practices

### 1. Caching & Optimization

```typescript
class WorkCache {
  private cache = new Map<string, { work: Work; timestamp: number }>();
  private TTL = 60000; // 1 minute

  async getWork(id: string): Promise<Work> {
    const cached = this.cache.get(id);

    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.work;
    }

    const work = await getWork(id);
    this.cache.set(id, { work, timestamp: Date.now() });

    return work;
  }

  invalidate(id: string): void {
    this.cache.delete(id);
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### 2. Batch Loading

```typescript
async function loadWorksByIds(ids: string[]): Promise<Work[]> {
  // Instead of N requests, use filter
  const response = await listWorks({
    limit: ids.length,
    // Note: Backend should support $in filter
  });

  return response.data.filter(work => ids.includes(work._id));
}
```

### 3. Optimistic Updates

```typescript
async function optimisticStartWork(
  work: Work,
  onSuccess: (updated: Work) => void,
  onError: (error: Error) => void
): Promise<void> {
  // Optimistically update UI
  const optimisticWork = { ...work, status: 'in_progress' as WorkStatus };
  onSuccess(optimisticWork);

  try {
    // Actual API call
    const updated = await startWork(work._id);
    onSuccess(updated); // Update with real data
  } catch (error) {
    onError(error as Error);
    onSuccess(work); // Revert to original
  }
}
```

### 4. Real-time Updates (WebSocket)

```typescript
interface WorkUpdateEvent {
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
  work: Work;
}

class WorkRealtimeService {
  private ws: WebSocket | null = null;

  connect(onUpdate: (event: WorkUpdateEvent) => void): void {
    this.ws = new WebSocket('ws://localhost:3001/works/updates');

    this.ws.onmessage = (event) => {
      const data: WorkUpdateEvent = JSON.parse(event.data);
      onUpdate(data);
    };
  }

  disconnect(): void {
    this.ws?.close();
  }
}
```

### 5. Type Safety with TypeScript

```typescript
// Create type-safe API client
class WorkApiClient {
  constructor(private baseUrl: string, private token: string) {}

  private get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async create(dto: CreateWorkDto): Promise<Work> {
    const response = await fetch(`${this.baseUrl}/works`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(dto)
    });

    return response.json();
  }

  async list(params: ListWorksParams): Promise<ListWorksResponse> {
    const queryString = new URLSearchParams(params as any).toString();
    const response = await fetch(
      `${this.baseUrl}/works?${queryString}`,
      { headers: this.headers }
    );

    return response.json();
  }

  // ... other methods
}

// Usage
const api = new WorkApiClient(API_BASE, token);
const work = await api.create({ ... });
```

---

## Testing

### Unit Test Example (Jest)

```typescript
import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Work API', () => {
  let token: string;
  let epicId: string;

  beforeAll(async () => {
    token = await login('admin@x-or.cloud', 'password');
  });

  it('should create epic', async () => {
    const epic = await createEpic('Test Epic', userId);

    expect(epic.type).toBe('epic');
    expect(epic.title).toBe('Test Epic');
    expect(epic.parentId).toBeNull();

    epicId = epic._id;
  });

  it('should create task under epic', async () => {
    const task = await createTask('Test Task', epicId, userId);

    expect(task.type).toBe('task');
    expect(task.parentId).toBe(epicId);
  });

  it('should transition states correctly', async () => {
    const work = await createTask('Test', null, userId);

    // Start work
    let updated = await startWork(work._id);
    expect(updated.status).toBe('in_progress');

    // Request review
    updated = await requestReview(work._id);
    expect(updated.status).toBe('review');

    // Complete
    updated = await completeWork(work._id);
    expect(updated.status).toBe('done');
  });

  it('should reject invalid type changes', async () => {
    const work = await createTask('Test', null, userId);

    await expect(
      updateWork(work._id, { type: 'epic' } as any)
    ).rejects.toThrow('Cannot update work type');
  });
});
```

---

## Appendix: Complete React Hook Example

```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseWorkOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useWork(id: string, options: UseWorkOptions = {}) {
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWork = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWork(id);
      setWork(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWork();

    if (options.autoRefresh) {
      const interval = setInterval(
        fetchWork,
        options.refreshInterval || 30000
      );
      return () => clearInterval(interval);
    }
  }, [fetchWork, options.autoRefresh, options.refreshInterval]);

  const update = useCallback(async (updates: UpdateWorkDto) => {
    const updated = await updateWork(id, updates);
    setWork(updated);
    return updated;
  }, [id]);

  const start = useCallback(async () => {
    const updated = await startWork(id);
    setWork(updated);
    return updated;
  }, [id]);

  const block = useCallback(async (reason: string) => {
    const updated = await blockWork(id, reason);
    setWork(updated);
    return updated;
  }, [id]);

  // ... other actions

  return {
    work,
    loading,
    error,
    refresh: fetchWork,
    update,
    start,
    block,
    // ... other actions
  };
}

// Usage in component:
function WorkCard({ workId }: { workId: string }) {
  const { work, loading, start, block } = useWork(workId);

  if (loading) return <div>Loading...</div>;
  if (!work) return <div>Work not found</div>;

  return (
    <div>
      <h3>{work.title}</h3>
      <p>Status: {work.status}</p>

      {work.status === 'todo' && (
        <button onClick={() => start()}>Start</button>
      )}

      {work.status === 'in_progress' && (
        <button onClick={() => block('Need clarification')}>
          Block
        </button>
      )}
    </div>
  );
}
```

---

## Support

Nếu gặp vấn đề khi tích hợp API:
- Kiểm tra [Work Schema Changes](./work-schema-changes.md)
- Đọc [Hierarchy Validation](./work-hierarchy-validation.md)
- Xem [Immutable Fields](./work-immutable-fields.md)
- Liên hệ backend team để được hỗ trợ
