# IAM Authentication API Documentation

This document describes all authentication endpoints available in the IAM (Identity & Access Management) service.

**Base URL:** `http://localhost:3000` (tùy theo môi trường sẽ load config từ cấu hính)
**API Prefix:** `/auth`

---

## Table of Contents
1. [POST /auth/login](#1-post-authlogin)
2. [GET /auth/verify-token](#2-get-authverify-token)
3. [GET /auth/profile](#3-get-authprofile)
4. [POST /auth/change-password](#4-post-authchange-password)
5. [POST /auth/refresh-token](#5-post-authrefresh-token)
6. [POST /auth/logout](#6-post-authlogout)

---

## 1. POST /auth/login

Authenticate user credentials and receive JWT access token and refresh token.

### Request

**Endpoint:** `POST /auth/login`

**Headers:**
```
Content-Type: application/json
```

**Payload:**
```json
{
  "username": "tonyh",
  "password": "123zXc_-"
}
```

**Payload Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | User's username |
| password | string | Yes | User's password |

### Response

**Success (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGRjZjM2NWY2YTkyYzBkNDkxMWI2MTkiLCJ1c2VybmFtZSI6InRvbnloIiwic3RhdHVzIjoiYWN0aXZlIiwicm9sZXMiOlsidW5pdmVyc2Uub3duZXIiXSwib3JnSWQiOiI2OGRkMDViMTc1ZDllM2MxN2JmOTdmNjAiLCJncm91cElkIjoiIiwiYWdlbnRJZCI6IiIsImFwcElkIjoiIiwiaWF0IjoxNzYwNzU2ODUyLCJleHAiOjE3NjA3NjA0NTJ9.HlPiTlhVCl9f9emf8JxuJKK6CGzf9CxMqa_-5iLKIu8",
  "expiresIn": 3600,
  "refreshToken": "0583c49a8ff26132464091da3e1e48d7ae7901af1bd1b6874d1f2c3e4a5b6c7d",
  "refreshExpiresIn": 604800,
  "tokenType": "Bearer"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| accessToken | string | JWT token for API authentication |
| expiresIn | number | Access token expiration time in seconds (default: 3600 = 1 hour) |
| refreshToken | string | Token used to refresh access token |
| refreshExpiresIn | number | Refresh token expiration time in seconds (604800 = 7 days) |
| tokenType | string | Token type (always "Bearer") |

**JWT Payload:**
The access token contains the following claims:
- `sub`: User ID
- `username`: Username
- `status`: User status (e.g., "active")
- `roles`: Array of user roles (e.g., ["universe.owner"])
- `orgId`: Organization ID
- `groupId`: Group ID
- `agentId`: Agent ID
- `appId`: Application ID
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp

**Error Responses:**

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### cURL Example
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"xoradmin","password":"123zXc_-"}'
```

---

## 2. GET /auth/verify-token

Verify if a JWT access token is valid and not expired.

### Request

**Endpoint:** `GET /auth/verify-token`

**Headers:**
```
Authorization: Bearer <access_token>
```

**No Request Body**

### Response

**Success (200 OK):**
```json
{
  "valid": true,
  "user": {
    "sub": "68dcf365f6a92c0d4911b619",
    "username": "tonyh",
    "status": "active",
    "roles": ["universe.owner"],
    "orgId": "68dd05b175d9e3c17bf97f60",
    "groupId": "",
    "agentId": "",
    "appId": "",
    "iat": 1760756852,
    "exp": 1760760452
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| valid | boolean | Always true if token is valid |
| user | object | Decoded JWT payload with user information |

**Error Responses:**

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### cURL Example
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/auth/verify-token
```

---

## 3. GET /auth/profile

Get the current authenticated user's profile information.

### Request

**Endpoint:** `GET /auth/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**No Request Body**

### Response

**Success (200 OK):**
```json
{
  "_id": "68dcf365f6a92c0d4911b619",
  "username": "tonyh",
  "roles": ["universe.owner"],
  "status": "active",
  "owner": {
    "orgId": "68dd05b175d9e3c17bf97f60",
    "groupId": "",
    "agentId": "",
    "appId": ""
  },
  "createdAt": "2025-11-07T10:30:00.000Z",
  "updatedAt": "2025-11-11T08:45:00.000Z"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| _id | string | User ID |
| username | string | Username |
| roles | string[] | Array of user roles |
| status | string | User status |
| owner | object | Ownership information (orgId, groupId, etc.) |
| createdAt | string | Account creation timestamp |
| updatedAt | string | Last update timestamp |

**Note:** Password field is excluded from the response for security.

**Error Responses:**

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "User not found",
  "error": "Unauthorized"
}
```

### cURL Example
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/auth/profile
```

---

## 4. POST /auth/change-password

Change password for the currently authenticated user.

### Request

**Endpoint:** `POST /auth/change-password`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Payload:**
```json
{
  "oldPassword": "123zXc_-",
  "newPassword": "..."
}
```

**Payload Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| oldPassword | string | Yes | Current password |
| newPassword | string | Yes | New password (8-15 chars, must contain uppercase, lowercase, number, and special character) |

**Password Requirements:**
- Length: 8-15 characters
- Must contain at least one uppercase letter
- Must contain at least one lowercase letter
- Must contain at least one number
- Must contain at least one special character

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**

**401 Unauthorized - Invalid Old Password:**
```json
{
  "statusCode": 401,
  "message": "Old password is incorrect",
  "error": "Unauthorized"
}
```

**400 Bad Request - Invalid Password Format:**
```json
{
  "statusCode": 400,
  "message": [
    "Password must be 8-15 characters and contain uppercase, lowercase, number, and special character"
  ],
  "error": "Bad Request"
}
```

### cURL Example
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X POST http://localhost:3000/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"123zXc_-","newPassword":"..."}'
```

---

## 5. POST /auth/refresh-token

Get a new access token using a valid refresh token. This allows users to maintain their session without re-authenticating.

### Request

**Endpoint:** `POST /auth/refresh-token`

**Headers:**
```
Content-Type: application/json
```

**Payload:**
```json
{
  "refreshToken": "0583c49a8ff26132464091da3e1e48d7ae7901af1bd1b6874d1f2c3e4a5b6c7d"
}
```

**Payload Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refreshToken | string | Yes | Valid refresh token received from login |

### Response

**Success (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGRjZjM2NWY2YTkyYzBkNDkxMWI2MTkiLCJ1c2VybmFtZSI6InRvbnloIiwic3RhdHVzIjoiYWN0aXZlIiwicm9sZXMiOlsidW5pdmVyc2Uub3duZXIiXSwib3JnSWQiOiI2OGRkMDViMTc1ZDllM2MxN2JmOTdmNjAiLCJncm91cElkIjoiIiwiYWdlbnRJZCI6IiIsImFwcElkIjoiIiwiaWF0IjoxNzYwNzU2ODUyLCJleHAiOjE3NjA3NjA0NTJ9.HlPiTlhVCl9f9emf8JxuJKK6CGzf9CxMqa_-5iLKIu8",
  "expiresIn": 3600,
  "refreshToken": "0583c49a8ff26132464091da3e1e48d7ae7901af1bd1b6874d1f2c3e4a5b6c7d",
  "refreshExpiresIn": 604800,
  "tokenType": "Bearer"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| accessToken | string | New JWT access token |
| expiresIn | number | New access token expiration time in seconds |
| refreshToken | string | Same refresh token (still valid) |
| refreshExpiresIn | number | Remaining refresh token expiration time |
| tokenType | string | Token type (always "Bearer") |

**Error Responses:**

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Invalid or expired refresh token",
  "error": "Unauthorized"
}
```

### cURL Example
```bash
curl -X POST http://localhost:3000/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"0583c49a8ff26132464091da3e1e48d7ae7901af1bd1b6874d1f2c3e4a5b6c7d"}'
```

---

## 6. POST /auth/logout

Logout the current user by invalidating their access token and optionally revoking their refresh token.

### Request

**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Payload (Optional):**
```json
{
  "refreshToken": "0583c49a8ff26132464091da3e1e48d7ae7901af1bd1b6874d1f2c3e4a5b6c7d"
}
```

**Payload Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refreshToken | string | No | Refresh token to revoke (recommended for complete logout) |

**Note:** The access token is automatically extracted from the Authorization header and will be blacklisted.

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Always true on successful logout |
| message | string | Confirmation message |

**Error Responses:**

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### cURL Example
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
REFRESH_TOKEN="0583c49a8ff26132464091da3e1e48d7ae7901af1bd1b6874d1f2c3e4a5b6c7d"

# Logout with refresh token revocation
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"

# Logout without refresh token (only blacklist access token)
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Authentication Flow

### Standard Login Flow
```
1. POST /auth/login (username + password)
   ↓
2. Receive accessToken + refreshToken
   ↓
3. Use accessToken in Authorization header for API calls
   ↓
4. When accessToken expires:
   - POST /auth/refresh-token (with refreshToken)
   - Receive new accessToken
   ↓
5. POST /auth/logout when done
```

### Token Management

**Access Token:**
- Expires in 1 hour (configurable via `JWT_EXPIRES_IN` env variable)
- Must be included in Authorization header: `Bearer <token>`
- Automatically blacklisted on logout
- Cannot be refreshed directly (use refresh token)

**Refresh Token:**
- Expires in 7 days
- Used only for getting new access tokens
- Should be stored securely (not in localStorage for web apps)
- Revoked on logout if provided

### Security Notes

1. **Password Requirements:** Enforced on registration and password change (8-15 chars, mixed case, numbers, special characters)
2. **Token Blacklisting:** Access tokens are blacklisted on logout to prevent reuse
3. **Refresh Token Storage:** Refresh tokens are stored server-side with expiration
4. **User Status Check:** Only active users can authenticate
5. **Soft Delete Support:** Deleted users cannot log in

---

## Error Response Format

All error responses follow this standard format:

```json
{
  "statusCode": 401,
  "message": "Error message or array of validation errors",
  "error": "Error type (e.g., Unauthorized, Bad Request)"
}
```

Common HTTP status codes:
- **200 OK** - Successful request
- **400 Bad Request** - Validation errors
- **401 Unauthorized** - Authentication failed or invalid token
- **500 Internal Server Error** - Server error

---

## Environment Variables

Required environment variables for authentication:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| JWT_SECRET | Secret key for signing JWT tokens | - | `your-secret-key-here` |
| JWT_EXPIRES_IN | Access token expiration time | `1h` | `3600` or `1h` or `60m` |
| MONGODB_URI | MongoDB connection string | - | `mongodb://localhost:27017/iam` |

---

## Swagger Documentation

When the IAM service is running, you can access interactive API documentation at:

```
http://localhost:3000/api-docs
```

This provides a UI to test all endpoints directly in the browser.
