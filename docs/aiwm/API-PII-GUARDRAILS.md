# PII & Guardrails API Documentation

## Overview

This document provides API documentation for PII Protection and Guardrails modules in AIWM service.

**Base URL:** `http://localhost:3003`
**Authentication:** Bearer Token (JWT)

---

## Table of Contents

1. [PII Protection API](#pii-protection-api)
2. [Guardrails API](#guardrails-api)
3. [Integration Examples](#integration-examples)
4. [Error Handling](#error-handling)

---

## PII Protection API

### Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/pii-patterns` | Create new PII pattern |
| GET | `/pii-patterns` | Get all PII patterns (paginated) |
| GET | `/pii-patterns/active` | Get active PII patterns only |
| GET | `/pii-patterns/:id` | Get PII pattern by ID |
| PUT | `/pii-patterns/:id` | Update PII pattern |
| DELETE | `/pii-patterns/:id` | Delete PII pattern (soft delete) |

---

### 1. Create PII Pattern

**POST** `/pii-patterns`

Create a new PII detection pattern.

**Request Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Email Address (Global)",
  "type": "email",
  "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
  "replacement": "[EMAIL_REDACTED]",
  "description": "Detects email addresses in standard format",
  "enabled": true,
  "locale": "global",
  "status": "active",
  "tags": ["common", "gdpr", "global"]
}
```

**Response (201 Created):**
```json
{
  "_id": "6931e6c19ec77f4a38c4c5f8",
  "name": "Email Address (Global)",
  "type": "email",
  "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
  "replacement": "[EMAIL_REDACTED]",
  "description": "Detects email addresses in standard format",
  "enabled": true,
  "locale": "global",
  "status": "active",
  "tags": ["common", "gdpr", "global"],
  "owner": {
    "userId": "691eba0851 7f917943ae1fa1",
    "orgId": "691eba0851 7f917943ae1f9d"
  },
  "createdBy": "691eba0851 7f917943ae1fa1",
  "updatedBy": "691eba0851 7f917943ae1fa1",
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-01T10:00:00.000Z",
  "isDeleted": false
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3003/pii-patterns \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Email Address (Global)",
    "type": "email",
    "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
    "replacement": "[EMAIL_REDACTED]",
    "description": "Detects email addresses in standard format",
    "enabled": true,
    "locale": "global",
    "status": "active",
    "tags": ["common", "gdpr", "global"]
  }'
```

---

### 2. Get All PII Patterns (Paginated)

**GET** `/pii-patterns?page=1&limit=10&sortBy=createdAt&sortOrder=desc`

Get paginated list of PII patterns.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order - 'asc' or 'desc' (default: desc)
- `type` (optional): Filter by type (email, phone, credit_card, etc.)
- `locale` (optional): Filter by locale (global, vn, us, etc.)
- `status` (optional): Filter by status (active, inactive)

**Response (200 OK):**
```json
{
  "data": [
    {
      "_id": "6931e6c19ec77f4a38c4c5f8",
      "name": "Email Address (Global)",
      "type": "email",
      "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
      "replacement": "[EMAIL_REDACTED]",
      "enabled": true,
      "locale": "global",
      "status": "active",
      "tags": ["common", "gdpr"],
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "statistics": {
    "total": 8,
    "byStatus": {
      "active": 8,
      "inactive": 0
    },
    "byType": {
      "email": 1,
      "phone": 2,
      "credit_card": 1,
      "ssn": 1,
      "api_key": 2,
      "custom": 1
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3003/pii-patterns?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Get Active PII Patterns

**GET** `/pii-patterns/active`

Get only active and enabled PII patterns (used for detection).

**Response (200 OK):**
```json
{
  "data": [
    {
      "_id": "6931e6c19ec77f4a38c4c5f8",
      "name": "Email Address (Global)",
      "type": "email",
      "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
      "replacement": "[EMAIL_REDACTED]",
      "enabled": true,
      "status": "active"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3003/pii-patterns/active \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Get PII Pattern by ID

**GET** `/pii-patterns/:id`

Get a specific PII pattern by ID.

**Response (200 OK):**
```json
{
  "_id": "6931e6c19ec77f4a38c4c5f8",
  "name": "Email Address (Global)",
  "type": "email",
  "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
  "replacement": "[EMAIL_REDACTED]",
  "description": "Detects email addresses in standard format",
  "enabled": true,
  "locale": "global",
  "status": "active",
  "tags": ["common", "gdpr"],
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-01T10:00:00.000Z"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3003/pii-patterns/6931e6c19ec77f4a38c4c5f8 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. Update PII Pattern

**PUT** `/pii-patterns/:id`

Update an existing PII pattern.

**Request Body:**
```json
{
  "enabled": false,
  "status": "inactive",
  "description": "Updated description"
}
```

**Response (200 OK):**
```json
{
  "_id": "6931e6c19ec77f4a38c4c5f8",
  "name": "Email Address (Global)",
  "enabled": false,
  "status": "inactive",
  "description": "Updated description",
  "updatedAt": "2025-01-01T11:00:00.000Z"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3003/pii-patterns/6931e6c19ec77f4a38c4c5f8 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false,
    "status": "inactive"
  }'
```

---

### 6. Delete PII Pattern

**DELETE** `/pii-patterns/:id`

Soft delete a PII pattern.

**Response (200 OK):**
```json
{
  "message": "PII pattern deleted successfully",
  "_id": "6931e6c19ec77f4a38c4c5f8"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3003/pii-patterns/6931e6c19ec77f4a38c4c5f8 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Guardrails API

### Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/guardrails` | Create new guardrail |
| GET | `/guardrails` | Get all guardrails (paginated) |
| GET | `/guardrails/:id` | Get guardrail by ID |
| PUT | `/guardrails/:id` | Update guardrail |
| DELETE | `/guardrails/:id` | Delete guardrail (soft delete) |

---

### 1. Create Guardrail

**POST** `/guardrails`

Create a new guardrail configuration.

**Request Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "VTV Safe Content Filter",
  "description": "Standard content filter for VTV public-facing agents",
  "enabled": true,
  "blockedKeywords": [
    "violence", "weapon", "gun", "bomb",
    "hack", "illegal", "drug",
    "sex", "porn", "adult", "nude"
  ],
  "blockedTopics": [
    "political", "religious", "adult", "violence", "hate-speech"
  ],
  "customMessage": "Xin lỗi, em không thể hỗ trợ yêu cầu này do vi phạm chính sách nội dung của VTV.",
  "tags": ["vtv", "public", "strict"],
  "status": "active"
}
```

**Response (201 Created):**
```json
{
  "_id": "6931e6c19ec77f4a38c4c5f5",
  "name": "VTV Safe Content Filter",
  "description": "Standard content filter for VTV public-facing agents",
  "enabled": true,
  "blockedKeywords": [
    "violence", "weapon", "gun", "bomb",
    "hack", "illegal", "drug",
    "sex", "porn", "adult", "nude"
  ],
  "blockedTopics": [
    "political", "religious", "adult", "violence", "hate-speech"
  ],
  "customMessage": "Xin lỗi, em không thể hỗ trợ yêu cầu này do vi phạm chính sách nội dung của VTV.",
  "tags": ["vtv", "public", "strict"],
  "status": "active",
  "owner": {
    "userId": "691eba0851 7f917943ae1fa1",
    "orgId": "691eba0851 7f917943ae1f9d"
  },
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-01T10:00:00.000Z",
  "isDeleted": false
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3003/guardrails \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VTV Safe Content Filter",
    "description": "Standard content filter for VTV public-facing agents",
    "enabled": true,
    "blockedKeywords": ["violence", "weapon", "hack", "illegal"],
    "blockedTopics": ["political", "religious", "adult", "violence"],
    "customMessage": "Xin lỗi, em không thể hỗ trợ yêu cầu này.",
    "tags": ["vtv", "public", "strict"],
    "status": "active"
  }'
```

---

### 2. Get All Guardrails (Paginated)

**GET** `/guardrails?page=1&limit=10&sortBy=createdAt&sortOrder=desc`

Get paginated list of guardrails.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order - 'asc' or 'desc' (default: desc)
- `status` (optional): Filter by status (active, inactive)
- `tags` (optional): Filter by tags

**Response (200 OK):**
```json
{
  "data": [
    {
      "_id": "6931e6c19ec77f4a38c4c5f5",
      "name": "VTV Safe Content Filter",
      "description": "Standard content filter for VTV public-facing agents",
      "enabled": true,
      "blockedKeywords": ["violence", "weapon", "hack", "illegal"],
      "blockedTopics": ["political", "religious", "adult", "violence"],
      "customMessage": "Xin lỗi, em không thể hỗ trợ yêu cầu này.",
      "tags": ["vtv", "public", "strict"],
      "status": "active",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "statistics": {
    "total": 3,
    "byStatus": {
      "active": 3,
      "inactive": 0
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3003/guardrails?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Get Guardrail by ID

**GET** `/guardrails/:id`

Get a specific guardrail by ID.

**Response (200 OK):**
```json
{
  "_id": "6931e6c19ec77f4a38c4c5f5",
  "name": "VTV Safe Content Filter",
  "description": "Standard content filter for VTV public-facing agents",
  "enabled": true,
  "blockedKeywords": ["violence", "weapon", "hack", "illegal"],
  "blockedTopics": ["political", "religious", "adult", "violence"],
  "customMessage": "Xin lỗi, em không thể hỗ trợ yêu cầu này.",
  "tags": ["vtv", "public", "strict"],
  "status": "active",
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-01T10:00:00.000Z"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3003/guardrails/6931e6c19ec77f4a38c4c5f5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Update Guardrail

**PUT** `/guardrails/:id`

Update an existing guardrail.

**Request Body:**
```json
{
  "enabled": true,
  "blockedKeywords": ["violence", "weapon", "gun", "bomb", "terrorism"],
  "customMessage": "Updated message"
}
```

**Response (200 OK):**
```json
{
  "_id": "6931e6c19ec77f4a38c4c5f5",
  "name": "VTV Safe Content Filter",
  "enabled": true,
  "blockedKeywords": ["violence", "weapon", "gun", "bomb", "terrorism"],
  "customMessage": "Updated message",
  "updatedAt": "2025-01-01T11:00:00.000Z"
}
```

**Validation:** Cannot disable/deactivate a guardrail that is currently used by active agents.

**Error Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Cannot disable guardrail: it is currently used by 2 active agent(s): VTV Customer Support Agent, VTV News Bot",
  "error": "Bad Request"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3003/guardrails/6931e6c19ec77f4a38c4c5f5 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blockedKeywords": ["violence", "weapon", "gun", "bomb", "terrorism"]
  }'
```

---

### 5. Delete Guardrail

**DELETE** `/guardrails/:id`

Soft delete a guardrail.

**Response (200 OK):**
```json
{
  "message": "Guardrail deleted successfully",
  "_id": "6931e6c19ec77f4a38c4c5f5"
}
```

**Validation:** Cannot delete a guardrail that is currently used by active agents.

**Error Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Cannot delete guardrail: it is currently used by 2 active agent(s): VTV Customer Support Agent, VTV News Bot",
  "error": "Bad Request"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3003/guardrails/6931e6c19ec77f4a38c4c5f5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Integration Examples

### Frontend Integration (React/TypeScript)

#### 1. Fetch Active PII Patterns

```typescript
// services/pii.service.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

export interface PiiPattern {
  _id: string;
  name: string;
  type: string;
  pattern: string;
  replacement: string;
  enabled: boolean;
  status: string;
}

export const getActivePiiPatterns = async (token: string): Promise<PiiPattern[]> => {
  const response = await axios.get(`${API_BASE_URL}/pii-patterns/active`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
};

export const getAllPiiPatterns = async (
  token: string,
  page: number = 1,
  limit: number = 10
) => {
  const response = await axios.get(`${API_BASE_URL}/pii-patterns`, {
    params: { page, limit },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const createPiiPattern = async (token: string, data: Partial<PiiPattern>) => {
  const response = await axios.post(`${API_BASE_URL}/pii-patterns`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};
```

#### 2. Fetch Guardrails

```typescript
// services/guardrail.service.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

export interface Guardrail {
  _id: string;
  name: string;
  description?: string;
  enabled: boolean;
  blockedKeywords: string[];
  blockedTopics: string[];
  customMessage?: string;
  tags: string[];
  status: string;
}

export const getAllGuardrails = async (
  token: string,
  page: number = 1,
  limit: number = 10,
  tags?: string
) => {
  const response = await axios.get(`${API_BASE_URL}/guardrails`, {
    params: { page, limit, tags },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getGuardrailById = async (token: string, id: string): Promise<Guardrail> => {
  const response = await axios.get(`${API_BASE_URL}/guardrails/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const createGuardrail = async (token: string, data: Partial<Guardrail>) => {
  const response = await axios.post(`${API_BASE_URL}/guardrails`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

export const updateGuardrail = async (
  token: string,
  id: string,
  data: Partial<Guardrail>
) => {
  const response = await axios.put(`${API_BASE_URL}/guardrails/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};
```

#### 3. React Component Example

```typescript
// components/GuardrailList.tsx
import React, { useEffect, useState } from 'react';
import { getAllGuardrails, Guardrail } from '../services/guardrail.service';

export const GuardrailList: React.FC = () => {
  const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token'); // or from context

  useEffect(() => {
    const fetchGuardrails = async () => {
      try {
        const response = await getAllGuardrails(token!, 1, 10);
        setGuardrails(response.data);
      } catch (error) {
        console.error('Error fetching guardrails:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuardrails();
  }, [token]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Guardrails</h2>
      {guardrails.map((gr) => (
        <div key={gr._id}>
          <h3>{gr.name}</h3>
          <p>{gr.description}</p>
          <p>Status: {gr.status}</p>
          <p>Blocked Keywords: {gr.blockedKeywords.length}</p>
          <p>Blocked Topics: {gr.blockedTopics.length}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

#### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Data Models

### PII Pattern Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Human-readable name |
| type | string | Yes | Pattern type (email, phone, credit_card, etc.) |
| pattern | string | Yes | Regex pattern for detection |
| replacement | string | Yes | Replacement text for redaction |
| description | string | No | Pattern description |
| enabled | boolean | No | Whether pattern is active (default: true) |
| locale | string | No | Locale (global, vn, us, etc.) |
| status | string | No | Status (active, inactive) |
| tags | string[] | No | Tags for categorization |

### Guardrail Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Human-readable name |
| description | string | No | Guardrail description |
| enabled | boolean | No | Whether guardrail is active (default: true) |
| blockedKeywords | string[] | No | List of blocked keywords |
| blockedTopics | string[] | No | List of blocked topics |
| customMessage | string | No | Custom message when content is blocked |
| tags | string[] | No | Tags for categorization |
| status | string | No | Status (active, inactive) |

---

## Testing with cURL

### Complete Testing Flow

```bash
# 1. Get JWT Token (from IAM service)
TOKEN="your_jwt_token_here"

# 2. Create a PII Pattern
curl -X POST http://localhost:3003/pii-patterns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Email Pattern",
    "type": "email",
    "pattern": "\\b[A-Za-z0-9._%+-]+@test\\.com\\b",
    "replacement": "[EMAIL_REDACTED]",
    "enabled": true,
    "status": "active"
  }'

# 3. Get All PII Patterns
curl -X GET "http://localhost:3003/pii-patterns?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# 4. Create a Guardrail
curl -X POST http://localhost:3003/guardrails \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Guardrail",
    "enabled": true,
    "blockedKeywords": ["test", "demo"],
    "blockedTopics": ["testing"],
    "status": "active"
  }'

# 5. Get All Guardrails
curl -X GET "http://localhost:3003/guardrails?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Notes

1. **Authentication**: All endpoints require valid JWT token from IAM service
2. **Ownership**: All created entities are automatically assigned to the user's organization
3. **Soft Delete**: DELETE operations perform soft delete (isDeleted flag)
4. **Pagination**: Default pagination is 10 items per page
5. **Validation**: Guardrails cannot be deleted/disabled if used by active agents
6. **Statistics**: List endpoints include aggregated statistics

---

## Support

For issues or questions, contact the backend team or check:
- API Documentation: http://localhost:3003/api-docs
- Health Check: http://localhost:3003/health
