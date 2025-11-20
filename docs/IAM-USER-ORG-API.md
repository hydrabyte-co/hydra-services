# IAM Service - User & Organization Management API Documentation

## Overview

The IAM (Identity & Access Management) service provides comprehensive user authentication, authorization, and organization management capabilities. This document describes the entities, APIs, and usage patterns for User and Organization management.

**Service Port:** 3000
**Base URL:** `http://localhost:3000`
**API Documentation:** `http://localhost:3000/api-docs`

---

## Table of Contents

1. [Entities](#entities)
   - [User Entity](#user-entity)
   - [Organization Entity](#organization-entity)
   - [Base Schema](#base-schema)
2. [Authentication APIs](#authentication-apis)
3. [User Management APIs](#user-management-apis)
4. [Organization Management APIs](#organization-management-apis)
5. [Common Patterns](#common-patterns)
6. [Error Handling](#error-handling)

---

## Entities

### User Entity

**Location:** [services/iam/src/modules/user/user.schema.ts](../services/iam/src/modules/user/user.schema.ts)

The User entity extends `BaseSchema` and represents system users with authentication credentials and role-based access control.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | `string` | Yes | Unique username (6+ chars, alphanumeric, `_`, `.` or email format) |
| `password` | `object` | Yes | Password hash object with algorithm and reference |
| `password.hashedValue` | `string` | Yes | BCrypt hashed password value |
| `password.algorithm` | `PasswordHashAlgorithms` | Yes | Hash algorithm used (currently: `bcrypt`) |
| `password.ref` | `string` | No | Base64-encoded password reference |
| `roles` | `string[]` | Yes | Array of roles in `scope.role` format (e.g., `universe.owner`) |
| `status` | `UserStatuses` | Yes | User status (`active`, `inactive`, `pending`) |

**Inherited from BaseSchema:**
- `metadata`: Flexible key-value metadata object
- `createdAt`: Timestamp when record was created
- `updatedAt`: Timestamp when record was last updated
- `deletedAt`: Timestamp when soft-deleted (null if active)
- `isDeleted`: Boolean flag for soft delete
- `owner`: Ownership context (orgId, groupId, userId, agentId, appId)
- `createdBy`: User ID who created the record
- `updatedBy`: User ID who last updated the record

#### User Status Enum

```typescript
enum UserStatuses {
  Active = 'active',      // User can login and access system
  Inactive = 'inactive',  // User cannot login
  Pending = 'pending'     // User awaiting activation
}
```

#### Password Hash Algorithm Enum

```typescript
enum PasswordHashAlgorithms {
  BCrypt = 'bcrypt'
}
```

#### Validation Rules

**Username:**
- Pattern: `/^[\w-._]+(@([\w-]+\.)+[\w-]{2,4})*$/`
- Must be 6+ characters
- Accepts: letters, numbers, `_`, `.`, `-` or email format
- Example: `john.doe`, `user_123`, `admin@example.com`

**Password:**
- Pattern: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&_-])[A-Za-z\d@.#$!%*?&_-]{8,15}$/`
- Length: 8-15 characters
- Must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character: `@.#$!%*?&_-`
- Example: `SecureP@ss123`

---

### Organization Entity

**Location:** [services/iam/src/modules/organization/organization.schema.ts](../services/iam/src/modules/organization/organization.schema.ts)

The Organization entity represents organizational units that can own and manage resources.

#### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Organization name (lowercase alphanumeric with hyphens) |
| `description` | `string` | No | Organization description |

**Inherited from BaseSchema:** (same as User entity)

#### Validation Rules

**Organization Name:**
- Pattern: `/^[a-z0-9-]+$/`
- Must be lowercase alphanumeric with hyphens only
- Example: `acme-corp`, `dev-team-123`

---

### Base Schema

**Location:** [libs/base/src/lib/base.schema.ts](../libs/base/src/lib/base.schema.ts)

All entities in the system extend from `BaseSchema`, which provides common fields for audit trail, soft delete, and ownership tracking.

#### Common Fields

```typescript
{
  metadata: {},                    // Flexible metadata storage
  createdAt: Date,                 // Auto-populated on creation
  updatedAt: Date,                 // Auto-updated on changes
  deletedAt: Date | null,          // Soft delete timestamp
  isDeleted: false,                // Soft delete flag
  owner: {
    orgId: string,                 // Owning organization ID
    groupId: string,               // Owning group ID
    userId: string,                // Owning user ID
    agentId: string,               // Owning agent ID
    appId: string                  // Owning app ID
  },
  createdBy: string,               // User ID who created
  updatedBy: string                // User ID who last updated
}
```

---

## Authentication APIs

**Base Path:** `/auth`
**Controller:** [services/iam/src/modules/auth/auth.controller.ts](../services/iam/src/modules/auth/auth.controller.ts)

### 1. Login

Authenticate user and obtain JWT tokens.

**Endpoint:** `POST /auth/login`
**Authentication:** None (public endpoint)

**Request Body:**
```json
{
  "username": "tonyh",
  "password": "123zXc_-"
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "0583c49a8ff26132464091da3e1e48d7ae7901af1bd1b6874d...",
  "expiresIn": 3600,
  "tokenType": "bearer"
}
```

**Error Response (401):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tonyh",
    "password": "123zXc_-"
  }'
```

---

### 2. Verify Token

Validate if a JWT token is valid.

**Endpoint:** `GET /auth/verify-token`
**Authentication:** Required (Bearer Token)

**Success Response (200):**
```json
{
  "valid": true,
  "user": {
    "sub": "68dcf365f6a92c0d4911b619",
    "username": "tonyh",
    "status": "active",
    "roles": ["universe.owner"],
    "orgId": "68dd05b175d9e3c17bf97f60"
  }
}
```

**cURL Example:**
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3000/auth/verify-token
```

---

### 3. Get Profile

Retrieve current authenticated user's profile.

**Endpoint:** `GET /auth/profile`
**Authentication:** Required (Bearer Token)

**Success Response (200):**
```json
{
  "_id": "68dcf365f6a92c0d4911b619",
  "username": "tonyh",
  "status": "active",
  "roles": ["universe.owner"],
  "owner": {
    "orgId": "68dd05b175d9e3c17bf97f60",
    "groupId": "",
    "userId": "",
    "agentId": "",
    "appId": ""
  },
  "createdAt": "2025-01-08T10:30:00.000Z",
  "updatedAt": "2025-01-08T10:30:00.000Z"
}
```

**cURL Example:**
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3000/auth/profile
```

---

### 4. Change Password

Change password for the authenticated user.

**Endpoint:** `POST /auth/change-password`
**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "oldPassword": "123zXc_-",
  "newPassword": "NewPass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Response (401):**
```json
{
  "statusCode": 401,
  "message": "Invalid old password"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "123zXc_-",
    "newPassword": "NewPass123!"
  }'
```

---

### 5. Refresh Token

Get a new access token using refresh token.

**Endpoint:** `POST /auth/refresh-token`
**Authentication:** None (uses refresh token)

**Request Body:**
```json
{
  "refreshToken": "0583c49a8ff26132464091da3e1e48d7ae7901af1bd1b6874d..."
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new-refresh-token-here...",
  "expiresIn": 3600,
  "tokenType": "bearer"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

---

### 6. Logout

Invalidate access token and refresh token.

**Endpoint:** `POST /auth/logout`
**Authentication:** Required (Bearer Token)

**Request Body (Optional):**
```json
{
  "refreshToken": "0583c49a8ff26132464091da3e1e48d7ae7901af1bd1b6874d..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

---

## User Management APIs

**Base Path:** `/users`
**Controller:** [services/iam/src/modules/user/user.controller.ts](../services/iam/src/modules/user/user.controller.ts)
**Authentication:** All endpoints require JWT Bearer Token

### 1. Create User

Create a new user in the system.

**Endpoint:** `POST /users`
**Permissions:** Requires appropriate RBAC permissions

**Request Body:**
```json
{
  "username": "john.doe",
  "password": "SecureP@ss123",
  "roles": ["universe.owner"],
  "status": "active"
}
```

**Success Response (201):**
```json
{
  "_id": "68dcf365f6a92c0d4911b619",
  "username": "john.doe",
  "status": "active",
  "roles": ["universe.owner"],
  "owner": {
    "orgId": "68dd05b175d9e3c17bf97f60",
    "groupId": "",
    "userId": "creator-user-id",
    "agentId": "",
    "appId": ""
  },
  "createdBy": "creator-user-id",
  "updatedBy": "creator-user-id",
  "createdAt": "2025-01-08T10:30:00.000Z",
  "updatedAt": "2025-01-08T10:30:00.000Z"
}
```

**Validation Errors (400):**
```json
{
  "statusCode": 400,
  "message": [
    "Passwords must be 8 to 16 characters long and include uppercase letters, lowercase letters, numbers, and at least one of the following special characters: @ . # $ ! % * ? & _ -"
  ],
  "error": "Bad Request"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "password": "SecureP@ss123",
    "roles": ["universe.owner"],
    "status": "active"
  }'
```

---

### 2. Get All Users

Retrieve a paginated list of users with optional filtering.

**Endpoint:** `GET /users`
**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)
- `sortBy` (string, optional): Field to sort by (default: `createdAt`)
- `sortOrder` (string, optional): Sort order `asc` or `desc` (default: `desc`)
- `filter` (object, optional): MongoDB query filter (JSON string)

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "68dcf365f6a92c0d4911b619",
      "username": "john.doe",
      "status": "active",
      "roles": ["universe.owner"],
      "createdAt": "2025-01-08T10:30:00.000Z",
      "updatedAt": "2025-01-08T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

**cURL Examples:**

Basic usage:
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "http://localhost:3000/users"
```

With pagination:
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "http://localhost:3000/users?page=2&limit=20"
```

With filtering (active users only):
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "http://localhost:3000/users?filter={\"status\":\"active\"}"
```

---

### 3. Get User by ID

Retrieve a single user by their ID.

**Endpoint:** `GET /users/:id`
**Path Parameters:**
- `id` (string): MongoDB ObjectId of the user

**Success Response (200):**
```json
{
  "_id": "68dcf365f6a92c0d4911b619",
  "username": "john.doe",
  "status": "active",
  "roles": ["universe.owner"],
  "owner": {
    "orgId": "68dd05b175d9e3c17bf97f60",
    "groupId": "",
    "userId": "",
    "agentId": "",
    "appId": ""
  },
  "createdAt": "2025-01-08T10:30:00.000Z",
  "updatedAt": "2025-01-08T10:30:00.000Z",
  "createdBy": "creator-user-id",
  "updatedBy": "updater-user-id"
}
```

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "User with ID 68dcf365f6a92c0d4911b619 not found"
}
```

**cURL Example:**
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3000/users/68dcf365f6a92c0d4911b619
```

---

### 4. Update User

Update user information (currently supports status updates only).

**Endpoint:** `PUT /users/:id`
**Path Parameters:**
- `id` (string): MongoDB ObjectId of the user

**Request Body:**
```json
{
  "status": "inactive"
}
```

**Success Response (200):**
```json
{
  "_id": "68dcf365f6a92c0d4911b619",
  "username": "john.doe",
  "status": "inactive",
  "roles": ["universe.owner"],
  "updatedAt": "2025-01-08T11:00:00.000Z",
  "updatedBy": "updater-user-id"
}
```

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "User with ID 68dcf365f6a92c0d4911b619 not found"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/users/68dcf365f6a92c0d4911b619 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive"
  }'
```

---

### 5. Delete User (Soft Delete)

Soft delete a user (sets `isDeleted` flag and `deletedAt` timestamp).

**Endpoint:** `DELETE /users/:id`
**Path Parameters:**
- `id` (string): MongoDB ObjectId of the user

**Success Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "User with ID 68dcf365f6a92c0d4911b619 not found"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/users/68dcf365f6a92c0d4911b619 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Organization Management APIs

**Base Path:** `/organizations`
**Controller:** [services/iam/src/modules/organization/organization.controller.ts](../services/iam/src/modules/organization/organization.controller.ts)
**Authentication:** All endpoints require JWT Bearer Token

### 1. Create Organization

Create a new organization.

**Endpoint:** `POST /organizations`
**Permissions:** Requires appropriate RBAC permissions

**Request Body:**
```json
{
  "name": "acme-corp",
  "description": "ACME Corporation - Leading in innovation"
}
```

**Success Response (201):**
```json
{
  "_id": "68dd05b175d9e3c17bf97f60",
  "name": "acme-corp",
  "description": "ACME Corporation - Leading in innovation",
  "owner": {
    "orgId": "",
    "groupId": "",
    "userId": "creator-user-id",
    "agentId": "",
    "appId": ""
  },
  "createdBy": "creator-user-id",
  "updatedBy": "creator-user-id",
  "createdAt": "2025-01-08T10:30:00.000Z",
  "updatedAt": "2025-01-08T10:30:00.000Z"
}
```

**Validation Errors (400):**
```json
{
  "statusCode": 400,
  "message": [
    "Name must match [a-z0-9-]+"
  ],
  "error": "Bad Request"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/organizations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "acme-corp",
    "description": "ACME Corporation - Leading in innovation"
  }'
```

---

### 2. Get All Organizations

Retrieve a paginated list of organizations with optional filtering.

**Endpoint:** `GET /organizations`
**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)
- `sortBy` (string, optional): Field to sort by (default: `createdAt`)
- `sortOrder` (string, optional): Sort order `asc` or `desc` (default: `desc`)
- `filter` (object, optional): MongoDB query filter (JSON string)

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "68dd05b175d9e3c17bf97f60",
      "name": "acme-corp",
      "description": "ACME Corporation - Leading in innovation",
      "createdAt": "2025-01-08T10:30:00.000Z",
      "updatedAt": "2025-01-08T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

**cURL Examples:**

Basic usage:
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "http://localhost:3000/organizations"
```

With pagination:
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "http://localhost:3000/organizations?page=1&limit=20"
```

With filtering:
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "http://localhost:3000/organizations?filter={\"name\":\"acme-corp\"}"
```

---

### 3. Get Organization by ID

Retrieve a single organization by its ID.

**Endpoint:** `GET /organizations/:id`
**Path Parameters:**
- `id` (string): MongoDB ObjectId of the organization

**Success Response (200):**
```json
{
  "_id": "68dd05b175d9e3c17bf97f60",
  "name": "acme-corp",
  "description": "ACME Corporation - Leading in innovation",
  "owner": {
    "orgId": "",
    "groupId": "",
    "userId": "creator-user-id",
    "agentId": "",
    "appId": ""
  },
  "createdAt": "2025-01-08T10:30:00.000Z",
  "updatedAt": "2025-01-08T10:30:00.000Z",
  "createdBy": "creator-user-id",
  "updatedBy": "updater-user-id"
}
```

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "Organization with ID 68dd05b175d9e3c17bf97f60 not found"
}
```

**cURL Example:**
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3000/organizations/68dd05b175d9e3c17bf97f60
```

---

### 4. Update Organization

Update organization information.

**Endpoint:** `PUT /organizations/:id`
**Path Parameters:**
- `id` (string): MongoDB ObjectId of the organization

**Request Body:**
```json
{
  "name": "acme-corp-updated",
  "description": "Updated description"
}
```

**Success Response (200):**
```json
{
  "_id": "68dd05b175d9e3c17bf97f60",
  "name": "acme-corp-updated",
  "description": "Updated description",
  "updatedAt": "2025-01-08T11:00:00.000Z",
  "updatedBy": "updater-user-id"
}
```

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "Organization with ID 68dd05b175d9e3c17bf97f60 not found"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/organizations/68dd05b175d9e3c17bf97f60 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "acme-corp-updated",
    "description": "Updated description"
  }'
```

---

### 5. Delete Organization (Soft Delete)

Soft delete an organization (sets `isDeleted` flag and `deletedAt` timestamp).

**Endpoint:** `DELETE /organizations/:id`
**Path Parameters:**
- `id` (string): MongoDB ObjectId of the organization

**Success Response (200):**
```json
{
  "message": "Organization deleted successfully"
}
```

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "Organization with ID 68dd05b175d9e3c17bf97f60 not found"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/organizations/68dd05b175d9e3c17bf97f60 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Common Patterns

### Pagination

All list endpoints support pagination with the following query parameters:

```bash
?page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

Response format:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Filtering

Use MongoDB query syntax for filtering:

```bash
# Single field filter
?filter={"status":"active"}

# Multiple fields
?filter={"status":"active","roles":"universe.owner"}

# Using operators
?filter={"createdAt":{"$gte":"2025-01-01T00:00:00.000Z"}}
```

### Soft Delete

All entities support soft delete:
- Deleted records have `isDeleted: true` and `deletedAt` timestamp
- Deleted records are excluded from normal queries
- Records can be permanently deleted or restored (requires custom implementation)

### Audit Trail

Every entity automatically tracks:
- `createdBy`: User ID who created the record
- `updatedBy`: User ID who last modified the record
- `createdAt`: Creation timestamp
- `updatedAt`: Last modification timestamp

### RBAC Integration

All endpoints (except authentication) use `JwtAuthGuard` and support role-based access control through the `BaseService` class. The `RequestContext` object contains:

```typescript
{
  userId: string,
  username: string,
  orgId: string,
  groupId: string,
  agentId: string,
  appId: string,
  roles: string[]
}
```

---

## Error Handling

### Common Error Responses

**400 Bad Request** - Validation errors:
```json
{
  "statusCode": 400,
  "message": [
    "Validation error message 1",
    "Validation error message 2"
  ],
  "error": "Bad Request"
}
```

**401 Unauthorized** - Missing or invalid token:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden** - Insufficient permissions:
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "correlationId": "uuid-here"
}
```

**404 Not Found** - Resource not found:
```json
{
  "statusCode": 404,
  "message": "User with ID xyz not found"
}
```

**500 Internal Server Error** - Server errors:
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "correlationId": "uuid-here"
}
```

### Correlation IDs

All error responses include a `correlationId` for tracking and debugging purposes. This ID is automatically generated by the `CorrelationIdMiddleware`.

---

## Security Considerations

### Password Security
- Passwords are hashed using BCrypt algorithm
- Password validation enforces strong password requirements
- Plain-text passwords are never stored
- Password references are Base64-encoded for recovery purposes

### Token Management
- Access tokens expire after 1 hour (configurable)
- Refresh tokens have longer expiration
- Tokens can be revoked via logout endpoint
- Token blacklisting is implemented for logout

### RBAC
- All protected endpoints require JWT authentication
- Permissions are checked at the service layer
- Roles follow `scope.role` format (e.g., `universe.owner`)
- Owner context is automatically tracked for all operations

---

## Related Documentation

- [IAM Authentication API Documentation](./IAM-AUTH-API.md) - Detailed authentication flows
- [Template Service Documentation](./TEMPLATE-SERVICE-UPGRADE.md) - Service patterns and architecture
- [RBAC Implementation](../libs/base/README.md) - Role-based access control details

---

## Contact & Support

For questions or issues related to IAM service:
- Check API documentation at `http://localhost:3000/api-docs`
- Review test files in `services/iam/src/modules/*/`
- Refer to CLAUDE.md for development workflow

---

**Last Updated:** 2025-01-08
**Service Version:** 1.0.0
**API Version:** v1
