# WorkManagement Built-in Tools

## Overview

WorkManagement provides 12 built-in MCP tools for comprehensive work/task management including CRUD operations and workflow state transitions.

## Tools List

### CRUD Operations (5 tools)

#### 1. CreateWork
- **Description:** Create a new work item (epic/task/subtask)
- **Input:**
  ```typescript
  {
    title: string,                    // Required, max 200 chars
    description?: string,             // Markdown, max 10000 chars
    type: 'epic' | 'task' | 'subtask',
    projectId?: string,
    reporter: string,                 // Format: "user:<userId>" or "agent:<agentId>"
    assignee?: string,                // Format: "user:<userId>" or "agent:<agentId>"
    dueDate?: string,                 // ISO 8601 format
    startAt?: string,                 // ISO 8601 format (for agent scheduled execution)
    status?: string,                  // Default: 'backlog'
    dependencies?: string[],          // Array of Work IDs
    parentId?: string,                // For subtasks
    documents?: string[]              // Array of Document IDs
  }
  ```
- **Example:**
  ```json
  {
    "title": "Implement user authentication",
    "description": "## Requirements\n- JWT tokens\n- Refresh token flow",
    "type": "task",
    "reporter": "user:65f1a2b3c4d5e6f7g8h9i0j1",
    "assignee": "agent:65f1a2b3c4d5e6f7g8h9i0j2",
    "status": "todo",
    "dueDate": "2025-03-31T23:59:59.000Z"
  }
  ```
- **Output:** Created work object (sanitized)

#### 2. ListWorks
- **Description:** List works with pagination and filters
- **Input:**
  ```typescript
  {
    page?: number,                    // Default: 1
    limit?: number,                   // Default: 10, max: 100
    search?: string,                  // Full-text search in title/description
    type?: 'epic' | 'task' | 'subtask',
    status?: string,
    projectId?: string,
    reporter?: string,                // Format: "user:<userId>" or "agent:<agentId>"
    assignee?: string                 // Format: "user:<userId>" or "agent:<agentId>"
  }
  ```
- **Example:**
  ```json
  {
    "page": 1,
    "limit": 10,
    "status": "in_progress",
    "assignee": "agent:65f1a2b3c4d5e6f7g8h9i0j2"
  }
  ```
- **Output:** Paginated list with statistics (sanitized)

#### 3. GetWork
- **Description:** Get work details by ID
- **Input:** `{ id: string }`
- **Output:** Work object (sanitized)

#### 4. UpdateWork
- **Description:** Update work metadata (cannot update status or type)
- **Note:** Use workflow action tools to change status
- **Input:**
  ```typescript
  {
    id: string,
    title?: string,
    description?: string,
    projectId?: string,
    reporter?: string,               // Format: "user:<userId>" or "agent:<agentId>"
    assignee?: string,               // Format: "user:<userId>" or "agent:<agentId>"
    dueDate?: string,
    startAt?: string,
    dependencies?: string[],
    parentId?: string,
    documents?: string[]
  }
  ```
- **Output:** Updated work object (sanitized)

#### 5. DeleteWork
- **Description:** Soft delete work (only when status is done/cancelled)
- **Input:** `{ id: string }`
- **Output:** Success message

---

### Workflow State Transitions (7 tools)

#### 6. StartWork
- **Description:** Start work - transition from todo to in_progress
- **Input:** `{ id: string }`
- **API:** `POST /works/:id/start`
- **Example:**
  ```json
  { "id": "65f1a2b3c4d5e6f7g8h9i0j1" }
  ```
- **Output:** Updated work object (sanitized)

#### 7. BlockWork
- **Description:** Block work with reason - transition from in_progress to blocked
- **Input:**
  ```typescript
  {
    id: string,
    reason: string  // Required, max 1000 chars
  }
  ```
- **API:** `POST /works/:id/block`
- **Example:**
  ```json
  {
    "id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "reason": "Waiting for API design to be finalized before implementation can continue"
  }
  ```
- **Output:** Updated work object (sanitized)

#### 8. UnblockWork
- **Description:** Unblock work - transition from blocked to in_progress
- **Input:** `{ id: string }`
- **API:** `POST /works/:id/unblock`
- **Output:** Updated work object (sanitized)

#### 9. RequestReviewForWork
- **Description:** Request review - transition from in_progress to review
- **Input:** `{ id: string }`
- **API:** `POST /works/:id/request-review`
- **Output:** Updated work object (sanitized)

#### 10. CompleteWork
- **Description:** Complete work - transition from review to done
- **Input:** `{ id: string }`
- **API:** `POST /works/:id/complete`
- **Output:** Updated work object (sanitized)

#### 11. ReopenWork
- **Description:** Reopen completed work - transition from done to in_progress
- **Input:** `{ id: string }`
- **API:** `POST /works/:id/reopen`
- **Output:** Updated work object (sanitized)

#### 12. CancelWork
- **Description:** Cancel work from any status - transition to cancelled
- **Input:** `{ id: string }`
- **API:** `POST /works/:id/cancel`
- **Output:** Updated work object (sanitized)

---

## Work Status Workflow

```
backlog ──────────────────────┐
                              ↓
                            todo
                              ↓
                       [StartWork]
                              ↓
                        in_progress ←──────────┐
                              ↓                 │
                    ┌─────────┼─────────┐      │
                    ↓         ↓         ↓      │
              [BlockWork] [RequestReview] [CancelWork]
                    ↓         ↓              ↓
                 blocked    review      cancelled
                    ↓         ↓
              [UnblockWork] [CompleteWork]
                    │         ↓
                    │       done
                    │         ↓
                    └──── [ReopenWork]
```

---

## Reporter/Assignee Format

All tools use a **simplified string format** for reporter and assignee instead of nested objects:

### Format
- User: `"user:<userId>"`
- Agent: `"agent:<agentId>"`

### Examples
```typescript
// Creating work with user reporter and agent assignee
{
  "reporter": "user:65f1a2b3c4d5e6f7g8h9i0j1",
  "assignee": "agent:65f1a2b3c4d5e6f7g8h9i0j2"
}

// Filtering by assignee
{
  "assignee": "agent:65f1a2b3c4d5e6f7g8h9i0j2"
}
```

### Internal Transformation
The executor automatically converts this format to the API's expected object format:
```typescript
// Input (tool):  "user:65f1a2b3..."
// Output (API):  { type: "user", id: "65f1a2b3..." }
```

---

## Response Optimization

All tools automatically **sanitize responses** to optimize token usage for LLM by removing:
- `owner` - Owner object metadata
- `createdBy` - Creator user ID
- `updatedBy` - Last updater user ID
- `__v` - MongoDB version key

This reduces response size by ~30-40% while preserving essential information.

---

## Architecture

### File Structure

```
services/aiwm/src/mcp/builtin/cbm/work-management/
├── schemas.ts      # 12 Zod validation schemas
├── executors.ts    # 12 executor functions + sanitization helpers
├── tools.ts        # 12 tool definitions
└── index.ts        # Export all
```

### Key Features

1. **Simplified Input Format** - Reporter/assignee use `"user:<id>"` or `"agent:<id>"` format
2. **Automatic Parsing** - Executors convert simplified format to API object format
3. **Zod Validation** - All inputs validated with detailed schemas
4. **Error Handling** - Comprehensive try-catch with user-friendly messages
5. **Token Optimization** - Response sanitization removes metadata
6. **Workflow State Machine** - 7 tools for status transitions
7. **Type Safety** - Full TypeScript support

---

## Integration

Tools are registered in `services/aiwm/src/bootstrap-mcp.ts`:
- **Category:** `WorkManagement`
- **Type:** `builtin`
- **Configuration:** Fetches `cbm.base_url` from Configuration module
- **Authentication:** Uses JWT from agent token

---

## Usage Example

### From MCP Client

```typescript
// Create work
const work = await mcpClient.callTool('CreateWork', {
  title: 'Implement authentication',
  type: 'task',
  reporter: 'user:65f1a2b3c4d5e6f7g8h9i0j1',
  assignee: 'agent:65f1a2b3c4d5e6f7g8h9i0j2',
  status: 'todo'
});

// List works assigned to agent
const works = await mcpClient.callTool('ListWorks', {
  assignee: 'agent:65f1a2b3c4d5e6f7g8h9i0j2',
  status: 'in_progress'
});

// Start work
await mcpClient.callTool('StartWork', {
  id: '65f1a2b3c4d5e6f7g8h9i0j3'
});

// Block work with reason
await mcpClient.callTool('BlockWork', {
  id: '65f1a2b3c4d5e6f7g8h9i0j3',
  reason: 'Waiting for API specs from backend team'
});

// Complete work
await mcpClient.callTool('CompleteWork', {
  id: '65f1a2b3c4d5e6f7g8h9i0j3'
});
```

---

## Naming Convention

All tools follow **PascalCase with "Work" keyword** pattern:
- ✅ `CreateWork`, `ListWorks`, `GetWork`
- ✅ `StartWork`, `BlockWork`, `CompleteWork`
- ✅ `RequestReviewForWork`
- ❌ `cbm_work_create` (old naming)

---

## Comparison with DocumentManagement

| Feature | DocumentManagement | WorkManagement |
|---------|-------------------|----------------|
| **Total Tools** | 14 | 12 |
| **CRUD** | 7 | 5 |
| **Content Operations** | 7 (search/replace, append) | 0 |
| **Workflow Actions** | 0 | 7 |
| **Complex Input** | Simple strings | Nested objects (simplified to strings) |
| **State Machine** | No | Yes (7 states) |
| **Business Rules** | None | Delete only when done/cancelled, Block requires reason |

---

## Related Documentation

- [MCP Configuration Fix](./MCP-CONFIGURATION-FIX.md) - How CBM base URL is fetched
- [Document Management Tools](./DOCUMENT-MANAGEMENT-TOOLS.md) - Sister tool set
- [CBM Work API](../../services/cbm/src/modules/work/README.md) - Backend API docs (if exists)
- [AIWM README](../../services/aiwm/README.md) - AIWM service overview

---

## Date

Created: 2025-12-18
