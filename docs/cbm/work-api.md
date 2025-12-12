# Work API Documentation

## Overview

The Work API provides endpoints for managing work items (epics, tasks, subtasks) within the CBM (Core Business Management) service. Works support complex workflows with status-based state transitions, hierarchical relationships, and validation rules.

**Base URL:** `http://localhost:3001`
**Service:** CBM (Core Business Management)
**Module:** Work

## Table of Contents

- [Authentication](#authentication)
- [Data Model](#data-model)
- [Endpoints](#endpoints)
  - [CRUD Operations](#crud-operations)
  - [Action Endpoints](#action-endpoints)
- [Status State Machine](#status-state-machine)
- [Validation Rules](#validation-rules)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)

---

## Authentication

All endpoints require JWT authentication via Bearer token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

---

## Data Model

### Work Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB document ID |
| `title` | String | Yes | Work title (max 200 chars) |
| `summary` | String | No | Short summary (max 500 chars) |
| `description` | String | No | Detailed description in markdown (max 10000 chars) |
| `type` | String | Yes | Work type: epic/task/subtask |
| `projectId` | String | No | Optional project reference |
| `reporter` | Object | Yes | Who reported the work (see ReporterAssignee) |
| `assignee` | Object | No | Who is assigned to the work (see ReporterAssignee) |
| `dueDate` | Date | No | Due date |
| `startAt` | Date | No | Start time (for agent scheduled execution) |
| `status` | String | Yes | Work status (default: 'backlog') |
| `blockedBy` | String[] | No | Array of Work IDs blocking this work |
| `parentId` | String | No | Parent Work ID (for subtasks) |
| `documents` | String[] | No | Array of document IDs |
| `owner` | Object | Auto | Owner information from BaseSchema |
| `createdBy` | String | Auto | Creator user ID from BaseSchema |
| `updatedBy` | String | Auto | Last updater user ID from BaseSchema |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |
| `deletedAt` | Date | Auto | Soft delete timestamp |

### ReporterAssignee Object

```typescript
{
  "type": "user" | "agent",  // Entity type
  "id": "507f1f77bcf86cd799439011"  // Entity ID (user or agent)
}
```

### Type Values

- `epic` - Large scope work item, can contain tasks and subtasks
- `task` - Standard work item, can contain subtasks
- `subtask` - Small work item, cannot contain other subtasks

### Status Values

- `backlog` - Not yet planned
- `todo` - Ready to work on
- `in_progress` - Currently being worked on
- `blocked` - Blocked by dependencies or issues
- `cancelled` - Cancelled/abandoned
- `review` - Waiting for review/approval
- `done` - Completed

---

## Endpoints

### CRUD Operations

#### 1. Create Work

**POST** `/works`

Create a new work item with validation.

**Request Body:**

```json
{
  "title": "Implement user authentication",
  "summary": "Add JWT-based authentication to the API",
  "description": "## Requirements\n- JWT tokens\n- Refresh token flow\n- Password hashing",
  "type": "task",
  "projectId": "507f1f77bcf86cd799439011",
  "reporter": {
    "type": "user",
    "id": "user123"
  },
  "assignee": {
    "type": "user",
    "id": "user456"
  },
  "dueDate": "2025-03-31T23:59:59.000Z",
  "status": "backlog",
  "documents": ["doc123"]
}
```

**Validations:**
- `reporter` must exist and not be deleted (validated against IAM/AIWM services)
- `assignee` (if provided) must exist and not be deleted
- `parentId` (if provided) must exist and not be a subtask if current type is subtask

**Response:** `201 Created`

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "Implement user authentication",
  "summary": "Add JWT-based authentication to the API",
  "description": "## Requirements\n- JWT tokens\n- Refresh token flow\n- Password hashing",
  "type": "task",
  "projectId": "507f1f77bcf86cd799439011",
  "reporter": {
    "type": "user",
    "id": "user123"
  },
  "assignee": {
    "type": "user",
    "id": "user456"
  },
  "dueDate": "2025-03-31T23:59:59.000Z",
  "status": "backlog",
  "blockedBy": [],
  "documents": ["doc123"],
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user authentication",
    "type": "task",
    "reporter": {
      "type": "user",
      "id": "507f1f77bcf86cd799439013"
    },
    "assignee": {
      "type": "user",
      "id": "507f1f77bcf86cd799439014"
    }
  }'
```

---

#### 2. List Works

**GET** `/works`

List all works with pagination and statistics.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 10 | Items per page |
| `sort` | String | -createdAt | Sort field |
| `filter[status]` | String | - | Filter by status |
| `filter[type]` | String | - | Filter by type |
| `filter[projectId]` | String | - | Filter by project |
| `filter[assignee.id]` | String | - | Filter by assignee ID |
| `filter[reporter.id]` | String | - | Filter by reporter ID |
| `filter[parentId]` | String | - | Filter by parent (subtasks) |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "Implement user authentication",
      "type": "task",
      "status": "in_progress",
      "reporter": {
        "type": "user",
        "id": "user123"
      },
      "assignee": {
        "type": "user",
        "id": "user456"
      },
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  },
  "statistics": {
    "total": 50,
    "byStatus": {
      "backlog": 10,
      "todo": 8,
      "in_progress": 15,
      "blocked": 2,
      "review": 5,
      "done": 8,
      "cancelled": 2
    },
    "byType": {
      "epic": 5,
      "task": 30,
      "subtask": 15
    }
  }
}
```

**cURL Examples:**

```bash
# Basic list
curl -X GET "http://localhost:3001/works?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Filter by status and type
curl -X GET "http://localhost:3001/works?filter[status]=in_progress&filter[type]=task" \
  -H "Authorization: Bearer $TOKEN"

# Get all subtasks of a parent work
curl -X GET "http://localhost:3001/works?filter[parentId]=507f1f77bcf86cd799439012" \
  -H "Authorization: Bearer $TOKEN"

# Get works assigned to specific user
curl -X GET "http://localhost:3001/works?filter[assignee.id]=user456" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 3. Get Work by ID

**GET** `/works/:id`

Get a specific work by ID.

**Response:** `200 OK`

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "Implement user authentication",
  "summary": "Add JWT-based authentication to the API",
  "description": "## Requirements\n- JWT tokens\n- Refresh token flow",
  "type": "task",
  "projectId": "507f1f77bcf86cd799439011",
  "reporter": {
    "type": "user",
    "id": "user123"
  },
  "assignee": {
    "type": "user",
    "id": "user456"
  },
  "status": "in_progress",
  "blockedBy": [],
  "documents": ["doc123"],
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-16T14:30:00.000Z"
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:3001/works/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 4. Update Work

**PATCH** `/works/:id`

Update work fields with validation. All fields are optional.

**Request Body:**

```json
{
  "title": "Implement user authentication - Updated",
  "assignee": {
    "type": "agent",
    "id": "agent789"
  },
  "status": "in_progress",
  "blockedBy": ["507f1f77bcf86cd799439020"]
}
```

**Validations:**
- If updating `reporter` or `assignee`, entity must exist and not be deleted
- If updating `parentId`, parent must exist and hierarchy rules apply

**Response:** `200 OK`

**cURL Example:**

```bash
curl -X PATCH http://localhost:3001/works/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignee": {
      "type": "agent",
      "id": "507f1f77bcf86cd799439015"
    },
    "blockedBy": ["507f1f77bcf86cd799439020"]
  }'
```

---

#### 5. Delete Work (Soft Delete)

**DELETE** `/works/:id`

Soft delete a work. Only works with status `done` or `cancelled` can be deleted.

**Response:** `200 OK`

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "Implement user authentication",
  "status": "done",
  "deletedAt": "2025-01-20T10:00:00.000Z"
}
```

**Error Response:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Cannot delete work with status: in_progress. Only done or cancelled works can be deleted.",
  "error": "Bad Request"
}
```

**cURL Example:**

```bash
curl -X DELETE http://localhost:3001/works/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer $TOKEN"
```

---

### Action Endpoints

Action endpoints manage status transitions with validation. These enforce the state machine rules.

#### 1. Start Work

**POST** `/works/:id/start`

Transition work from `todo` to `in_progress` status.

**Response:** `200 OK`

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "Implement user authentication",
  "status": "in_progress",
  "updatedAt": "2025-01-16T09:00:00.000Z"
}
```

**Error Response:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Cannot start work with status: backlog. Only todo works can be started.",
  "error": "Bad Request"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3001/works/507f1f77bcf86cd799439012/start \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 2. Block Work

**POST** `/works/:id/block`

Transition work from `in_progress` to `blocked` status.

**Response:** `200 OK`

**cURL Example:**

```bash
curl -X POST http://localhost:3001/works/507f1f77bcf86cd799439012/block \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 3. Unblock Work

**POST** `/works/:id/unblock`

Transition work from `blocked` to `in_progress` status.

**Response:** `200 OK`

**cURL Example:**

```bash
curl -X POST http://localhost:3001/works/507f1f77bcf86cd799439012/unblock \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 4. Request Review

**POST** `/works/:id/request-review`

Transition work from `in_progress` to `review` status.

**Response:** `200 OK`

**cURL Example:**

```bash
curl -X POST http://localhost:3001/works/507f1f77bcf86cd799439012/request-review \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 5. Complete Work

**POST** `/works/:id/complete`

Transition work from `review` to `done` status.

**Response:** `200 OK`

**cURL Example:**

```bash
curl -X POST http://localhost:3001/works/507f1f77bcf86cd799439012/complete \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 6. Reopen Work

**POST** `/works/:id/reopen`

Transition work from `done` to `in_progress` status.

**Response:** `200 OK`

**cURL Example:**

```bash
curl -X POST http://localhost:3001/works/507f1f77bcf86cd799439012/reopen \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 7. Cancel Work

**POST** `/works/:id/cancel`

Transition work from any status to `cancelled` status.

**Response:** `200 OK`

**Error Response:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Work is already cancelled",
  "error": "Bad Request"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3001/works/507f1f77bcf86cd799439012/cancel \
  -H "Authorization: Bearer $TOKEN"
```

---

## Status State Machine

```
backlog ─> todo ──start──> in_progress ──request-review──> review ──complete──> done
                              ↕                                                    ↓
                           block/unblock                                      reopen
                              ↕                                                    ↓
                           blocked                                          in_progress

                    ─────────────── cancel ───────────────> cancelled
                    (from any status)
```

**Valid Transitions:**

| From | Action | To |
|------|--------|-----|
| todo | start | in_progress |
| in_progress | block | blocked |
| blocked | unblock | in_progress |
| in_progress | request-review | review |
| review | complete | done |
| done | reopen | in_progress |
| any | cancel | cancelled |

**Deletion Rules:**

- Works can only be soft deleted when status is `done` or `cancelled`
- Attempting to delete works in other statuses will result in a 400 error

---

## Validation Rules

### 1. Reporter/Assignee Validation

When creating or updating works, the system validates that reporter and assignee entities exist:

```bash
# Validation checks:
# - Entity ID must be valid ObjectId format
# - Entity must exist in IAM (for users) or AIWM (for agents) services
# - Entity must not be deleted (isDeleted = false)
```

**Current Implementation:**
- Basic ObjectId format validation is implemented
- Full service integration is marked as TODO (see work.service.ts:71-85)

### 2. Parent-Child Hierarchy

Subtasks can only have epic or task parents, not other subtasks:

```bash
# Valid:
epic -> subtask ✓
task -> subtask ✓

# Invalid:
subtask -> subtask ✗  # Will return 400 error
```

**Error Example:**

```json
{
  "statusCode": 400,
  "message": "Subtask cannot have another subtask as parent",
  "error": "Bad Request"
}
```

### 3. Type Restrictions

- `epic`: Can contain tasks and subtasks
- `task`: Can contain subtasks
- `subtask`: Cannot contain other works (leaf node)

---

## Usage Examples

### Complete Workflow Example

```bash
# 1. Create epic
EPIC_ID=$(curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User Management System",
    "type": "epic",
    "reporter": {"type": "user", "id": "user123"}
  }' | jq -r '._id')

# 2. Create task under epic
TASK_ID=$(curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user authentication",
    "type": "task",
    "parentId": "'$EPIC_ID'",
    "reporter": {"type": "user", "id": "user123"},
    "assignee": {"type": "user", "id": "user456"}
  }' | jq -r '._id')

# 3. Create subtask under task
SUBTASK_ID=$(curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Setup JWT library",
    "type": "subtask",
    "parentId": "'$TASK_ID'",
    "reporter": {"type": "user", "id": "user123"},
    "assignee": {"type": "agent", "id": "agent789"}
  }' | jq -r '._id')

# 4. Move subtask through workflow
# todo -> in_progress
curl -X POST http://localhost:3001/works/$SUBTASK_ID/start \
  -H "Authorization: Bearer $TOKEN"

# in_progress -> review
curl -X POST http://localhost:3001/works/$SUBTASK_ID/request-review \
  -H "Authorization: Bearer $TOKEN"

# review -> done
curl -X POST http://localhost:3001/works/$SUBTASK_ID/complete \
  -H "Authorization: Bearer $TOKEN"

# 5. Query subtasks of a task
curl -X GET "http://localhost:3001/works?filter[parentId]=$TASK_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Blocked Work Scenario

```bash
# 1. Create two dependent tasks
TASK1_ID=$(curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Setup database schema",
    "type": "task",
    "reporter": {"type": "user", "id": "user123"}
  }' | jq -r '._id')

TASK2_ID=$(curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement data access layer",
    "type": "task",
    "reporter": {"type": "user", "id": "user123"},
    "blockedBy": ["'$TASK1_ID'"]
  }' | jq -r '._id')

# 2. Start task 2 (blocked by task 1)
curl -X POST http://localhost:3001/works/$TASK2_ID/start \
  -H "Authorization: Bearer $TOKEN"

# 3. Block task 2 due to dependency
curl -X POST http://localhost:3001/works/$TASK2_ID/block \
  -H "Authorization: Bearer $TOKEN"

# 4. Complete task 1
curl -X POST http://localhost:3001/works/$TASK1_ID/start \
  -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:3001/works/$TASK1_ID/request-review \
  -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:3001/works/$TASK1_ID/complete \
  -H "Authorization: Bearer $TOKEN"

# 5. Unblock task 2
curl -X POST http://localhost:3001/works/$TASK2_ID/unblock \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error Handling

### Common Error Responses

**400 Bad Request** - Invalid request data, invalid state transition, or validation failure

```json
{
  "statusCode": 400,
  "message": "Cannot start work with status: backlog. Only todo works can be started.",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "Subtask cannot have another subtask as parent",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "Invalid user ID format: not-an-objectid",
  "error": "Bad Request"
}
```

**401 Unauthorized** - Missing or invalid JWT token

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**404 Not Found** - Work not found

```json
{
  "statusCode": 404,
  "message": "Work not found",
  "error": "Not Found"
}
```

**422 Unprocessable Entity** - Validation errors

```json
{
  "statusCode": 422,
  "message": [
    "title should not be empty",
    "type must be one of the following values: epic, task, subtask",
    "reporter should not be empty"
  ],
  "error": "Unprocessable Entity"
}
```

---

## Notes

- The `reporter` field is required and must reference an existing user or agent
- The `assignee` field is optional but must reference an existing user or agent if provided
- Full-text search is available on `title`, `summary`, and `description` fields
- The `startAt` field can be used for scheduling agent execution
- Works can belong to a project via `projectId` but this is optional
- Soft deleted works (deletedAt !== null) are excluded from all queries
- Statistics are calculated in real-time on each list request

---

## Related Documentation

- [Project API Documentation](./project-api.md)
- [Document API Documentation](./document-frontend-guide.md)
- [Frontend Integration Guide](./project-work-frontend-guide.md)
