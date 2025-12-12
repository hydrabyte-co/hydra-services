# Project API Documentation

## Overview

The Project API provides endpoints for managing projects within the CBM (Core Business Management) service. Projects group works and manage large work scopes with status-based state transitions.

**Base URL:** `http://localhost:3001`
**Service:** CBM (Core Business Management)
**Module:** Project

## Table of Contents

- [Authentication](#authentication)
- [Data Model](#data-model)
- [Endpoints](#endpoints)
  - [CRUD Operations](#crud-operations)
  - [Action Endpoints](#action-endpoints)
- [Status State Machine](#status-state-machine)
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

### Project Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB document ID |
| `name` | String | Yes | Project name (max 200 chars) |
| `description` | String | No | Project description (max 2000 chars) |
| `members` | String[] | No | Array of user IDs |
| `startDate` | Date | No | Project start date |
| `dueDate` | Date | No | Project due date |
| `tags` | String[] | No | Tags for categorization |
| `documents` | String[] | No | Array of document IDs |
| `status` | String | Yes | Project status (default: 'draft') |
| `owner` | Object | Auto | Owner information from BaseSchema |
| `createdBy` | String | Auto | Creator user ID from BaseSchema |
| `updatedBy` | String | Auto | Last updater user ID from BaseSchema |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |
| `deletedAt` | Date | Auto | Soft delete timestamp |

### Status Values

- `draft` - Initial state, project is being planned
- `active` - Project is actively running
- `on_hold` - Project is temporarily paused
- `completed` - Project has finished
- `archived` - Project is archived (final state)

---

## Endpoints

### CRUD Operations

#### 1. Create Project

**POST** `/projects`

Create a new project.

**Request Body:**

```json
{
  "name": "Q1 2025 Product Launch",
  "description": "Launch new product features for Q1 2025",
  "members": ["user123", "user456"],
  "startDate": "2025-01-01T00:00:00.000Z",
  "dueDate": "2025-03-31T23:59:59.000Z",
  "tags": ["product", "launch", "q1"],
  "documents": ["doc123", "doc456"],
  "status": "draft"
}
```

**Response:** `201 Created`

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Q1 2025 Product Launch",
  "description": "Launch new product features for Q1 2025",
  "members": ["user123", "user456"],
  "startDate": "2025-01-01T00:00:00.000Z",
  "dueDate": "2025-03-31T23:59:59.000Z",
  "tags": ["product", "launch", "q1"],
  "documents": ["doc123", "doc456"],
  "status": "draft",
  "owner": {
    "userId": "current-user-id",
    "orgId": "org123"
  },
  "createdBy": "current-user-id",
  "updatedBy": "current-user-id",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3001/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2025 Product Launch",
    "description": "Launch new product features for Q1 2025",
    "members": ["user123", "user456"],
    "startDate": "2025-01-01T00:00:00.000Z",
    "dueDate": "2025-03-31T23:59:59.000Z",
    "tags": ["product", "launch", "q1"]
  }'
```

---

#### 2. List Projects

**GET** `/projects`

List all projects with pagination and statistics.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 10 | Items per page |
| `sort` | String | -createdAt | Sort field (prefix with - for descending) |
| `filter[status]` | String | - | Filter by status |
| `filter[tags]` | String | - | Filter by tag |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Q1 2025 Product Launch",
      "description": "Launch new product features for Q1 2025",
      "status": "active",
      "members": ["user123"],
      "tags": ["product", "launch"],
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  },
  "statistics": {
    "total": 25,
    "byStatus": {
      "draft": 5,
      "active": 12,
      "on_hold": 3,
      "completed": 4,
      "archived": 1
    }
  }
}
```

**cURL Examples:**

```bash
# Basic list
curl -X GET "http://localhost:3001/projects?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Filter by status
curl -X GET "http://localhost:3001/projects?filter[status]=active" \
  -H "Authorization: Bearer $TOKEN"

# Sort by name ascending
curl -X GET "http://localhost:3001/projects?sort=name" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 3. Get Project by ID

**GET** `/projects/:id`

Get a specific project by ID.

**Response:** `200 OK`

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Q1 2025 Product Launch",
  "description": "Launch new product features for Q1 2025",
  "members": ["user123", "user456"],
  "startDate": "2025-01-01T00:00:00.000Z",
  "dueDate": "2025-03-31T23:59:59.000Z",
  "tags": ["product", "launch", "q1"],
  "documents": ["doc123", "doc456"],
  "status": "active",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-16T14:30:00.000Z"
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:3001/projects/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 4. Update Project

**PATCH** `/projects/:id`

Update project fields. All fields are optional.

**Request Body:**

```json
{
  "name": "Q1 2025 Product Launch - Updated",
  "description": "Updated description",
  "members": ["user123", "user456", "user789"],
  "tags": ["product", "launch", "q1", "priority"]
}
```

**Response:** `200 OK`

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Q1 2025 Product Launch - Updated",
  "description": "Updated description",
  "members": ["user123", "user456", "user789"],
  "tags": ["product", "launch", "q1", "priority"],
  "status": "active",
  "updatedAt": "2025-01-16T15:00:00.000Z"
}
```

**cURL Example:**

```bash
curl -X PATCH http://localhost:3001/projects/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2025 Product Launch - Updated",
    "members": ["user123", "user456", "user789"]
  }'
```

---

#### 5. Delete Project (Soft Delete)

**DELETE** `/projects/:id`

Soft delete a project. Only projects with status `completed` or `archived` can be deleted.

**Response:** `200 OK`

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Q1 2025 Product Launch",
  "status": "completed",
  "deletedAt": "2025-01-20T10:00:00.000Z"
}
```

**Error Response:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Cannot delete project with status: active. Only completed or archived projects can be deleted.",
  "error": "Bad Request"
}
```

**cURL Example:**

```bash
curl -X DELETE http://localhost:3001/projects/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer $TOKEN"
```

---

### Action Endpoints

Action endpoints manage status transitions with validation. These enforce the state machine rules.

#### 1. Activate Project

**POST** `/projects/:id/activate`

Transition project from `draft` to `active` status.

**Response:** `200 OK`

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Q1 2025 Product Launch",
  "status": "active",
  "updatedAt": "2025-01-16T09:00:00.000Z"
}
```

**Error Response:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Cannot activate project with status: active. Only draft projects can be activated.",
  "error": "Bad Request"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3001/projects/507f1f77bcf86cd799439011/activate \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 2. Hold Project

**POST** `/projects/:id/hold`

Transition project from `active` to `on_hold` status.

**Response:** `200 OK`

**cURL Example:**

```bash
curl -X POST http://localhost:3001/projects/507f1f77bcf86cd799439011/hold \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 3. Resume Project

**POST** `/projects/:id/resume`

Transition project from `on_hold` to `active` status.

**Response:** `200 OK`

**cURL Example:**

```bash
curl -X POST http://localhost:3001/projects/507f1f77bcf86cd799439011/resume \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 4. Complete Project

**POST** `/projects/:id/complete`

Transition project from `active` to `completed` status.

**Response:** `200 OK`

**cURL Example:**

```bash
curl -X POST http://localhost:3001/projects/507f1f77bcf86cd799439011/complete \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 5. Archive Project

**POST** `/projects/:id/archive`

Transition project from `completed` to `archived` status.

**Response:** `200 OK`

**cURL Example:**

```bash
curl -X POST http://localhost:3001/projects/507f1f77bcf86cd799439011/archive \
  -H "Authorization: Bearer $TOKEN"
```

---

## Status State Machine

```
draft ──activate──> active ──complete──> completed ──archive──> archived
                      ↕
                    hold/resume
                      ↕
                   on_hold
```

**Valid Transitions:**

| From | Action | To |
|------|--------|-----|
| draft | activate | active |
| active | hold | on_hold |
| on_hold | resume | active |
| active | complete | completed |
| completed | archive | archived |

**Deletion Rules:**

- Projects can only be soft deleted when status is `completed` or `archived`
- Attempting to delete projects in other statuses will result in a 400 error

---

## Usage Examples

### Complete Workflow Example

```bash
# 1. Create project
PROJECT_ID=$(curl -s -X POST http://localhost:3001/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Feature Development",
    "description": "Develop new authentication feature",
    "members": ["user123"],
    "tags": ["feature", "auth"]
  }' | jq -r '._id')

# 2. Activate project
curl -X POST http://localhost:3001/projects/$PROJECT_ID/activate \
  -H "Authorization: Bearer $TOKEN"

# 3. Update project details
curl -X PATCH http://localhost:3001/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "members": ["user123", "user456"],
    "tags": ["feature", "auth", "priority"]
  }'

# 4. Put on hold temporarily
curl -X POST http://localhost:3001/projects/$PROJECT_ID/hold \
  -H "Authorization: Bearer $TOKEN"

# 5. Resume project
curl -X POST http://localhost:3001/projects/$PROJECT_ID/resume \
  -H "Authorization: Bearer $TOKEN"

# 6. Complete project
curl -X POST http://localhost:3001/projects/$PROJECT_ID/complete \
  -H "Authorization: Bearer $TOKEN"

# 7. Archive project
curl -X POST http://localhost:3001/projects/$PROJECT_ID/archive \
  -H "Authorization: Bearer $TOKEN"

# 8. Soft delete
curl -X DELETE http://localhost:3001/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error Handling

### Common Error Responses

**400 Bad Request** - Invalid request data or invalid state transition

```json
{
  "statusCode": 400,
  "message": "Cannot activate project with status: active. Only draft projects can be activated.",
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

**404 Not Found** - Project not found

```json
{
  "statusCode": 404,
  "message": "Project not found",
  "error": "Not Found"
}
```

**422 Unprocessable Entity** - Validation errors

```json
{
  "statusCode": 422,
  "message": [
    "name should not be empty",
    "name must be shorter than or equal to 200 characters"
  ],
  "error": "Unprocessable Entity"
}
```

---

## Notes

- All date fields accept ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- The `owner`, `createdBy`, `updatedBy` fields are automatically populated from the JWT token
- Soft deleted projects (deletedAt !== null) are excluded from all queries
- Statistics are calculated in real-time on each list request
- Full-text search is available on `name` and `description` fields

---

## Related Documentation

- [Work API Documentation](./work-api.md)
- [Document API Documentation](./document-frontend-guide.md)
- [Frontend Integration Guide](./project-work-frontend-guide.md)
