# Tool API - Frontend Integration Guide

**Service**: AIWM (AI Workload Management)
**Module**: Tool
**Version**: 1.0
**Last Updated**: 2025-01-15

---

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Data Models](#data-models)
4. [Field Descriptions](#field-descriptions)
5. [Tool Types](#tool-types)
6. [Status Lifecycle](#status-lifecycle)
7. [Validation Rules](#validation-rules)
8. [Error Handling](#error-handling)
9. [UI Components Guide](#ui-components-guide)
10. [Example Requests](#example-requests)
11. [Developer Notes](#developer-notes)

---

## Overview

The **Tool API** manages AI agent tools including MCP (Model Context Protocol) tools and built-in tools. Tools define capabilities that agents can use to perform specific tasks like web search, data retrieval, or system operations.

### Base URL
```
http://localhost:3305/tools
```

### Authentication
All endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer <jwt_token>
```

### Key Features
- **Two Tool Types**: MCP (containerized) and Built-in (pre-packaged)
- **JSON Schema Validation**: Input/output schemas using JSON Schema
- **Dependency Validation**: Prevents deletion/deactivation of tools used by active agents
- **Health Monitoring**: Health check endpoints for MCP tools
- **Access Control**: Public, org-level, or private tool scopes
- **Statistics Aggregation**: Get counts by status and type

---

## API Endpoints

### 1. Create Tool

**Endpoint**: `POST /tools`
**Description**: Create a new tool (MCP or built-in)

**Request Body**:
```typescript
{
  name: string;                          // Required, 1-100 chars
  type: 'mcp' | 'builtin';              // Required
  description: string;                   // Required, 1-500 chars
  category: 'productivity' | 'data' | 'system' | 'communication'; // Required

  // MCP-specific (required if type='mcp')
  transport?: 'sse' | 'http';           // Required for MCP
  endpoint?: string;                     // Required for MCP, e.g., "http://localhost:3100"
  dockerImage?: string;                  // Required for MCP, e.g., "aiops/mcp-web-search:latest"
  port?: number;                         // Required for MCP, 1024-65535
  environment?: Record<string, string>;  // Optional, env vars for container
  healthEndpoint?: string;               // Optional, e.g., "/health"

  // Common fields
  schema: {                              // Required
    inputSchema: object;                 // JSON Schema for input
    outputSchema: object;                // JSON Schema for output
  };
  status?: 'active' | 'inactive' | 'error';  // Optional, default 'active'
  scope?: 'public' | 'org' | 'private';      // Optional, default 'public'
}
```

**Example - MCP Tool**:
```json
{
  "name": "webSearch",
  "type": "mcp",
  "description": "Search the web using DuckDuckGo",
  "category": "productivity",
  "transport": "sse",
  "endpoint": "http://localhost:3100",
  "dockerImage": "aiops/mcp-web-search:latest",
  "port": 3100,
  "environment": {
    "API_KEY": "xxx",
    "DEBUG": "true"
  },
  "healthEndpoint": "/health",
  "schema": {
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "Search query"
        }
      },
      "required": ["query"]
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "results": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  },
  "status": "active",
  "scope": "public"
}
```

**Example - Built-in Tool**:
```json
{
  "name": "listAgents",
  "type": "builtin",
  "description": "List all agents in the organization",
  "category": "system",
  "schema": {
    "inputSchema": {
      "type": "object",
      "properties": {
        "limit": {
          "type": "number",
          "description": "Max number of agents to return"
        }
      }
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "agents": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "name": { "type": "string" }
            }
          }
        }
      }
    }
  },
  "status": "active",
  "scope": "org"
}
```

**Response**: `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "webSearch",
  "type": "mcp",
  "description": "Search the web using DuckDuckGo",
  "category": "productivity",
  "transport": "sse",
  "endpoint": "http://localhost:3100",
  "dockerImage": "aiops/mcp-web-search:latest",
  "port": 3100,
  "environment": {
    "API_KEY": "xxx",
    "DEBUG": "true"
  },
  "healthEndpoint": "/health",
  "lastHealthCheck": null,
  "status": "active",
  "schema": {
    "inputSchema": {...},
    "outputSchema": {...}
  },
  "scope": "public",
  "owner": {
    "userId": "507f1f77bcf86cd799439012",
    "orgId": "507f1f77bcf86cd799439013"
  },
  "createdBy": "507f1f77bcf86cd799439012",
  "updatedBy": "507f1f77bcf86cd799439012",
  "deletedAt": null,
  "metadata": {},
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Validation Rules**:
- `name`: Required, 1-100 characters
- `type`: Required, must be 'mcp' or 'builtin'
- `description`: Required, 1-500 characters
- `category`: Required, must be 'productivity', 'data', 'system', or 'communication'
- **For MCP tools**: `transport`, `endpoint`, `dockerImage`, `port` are required
- `port`: Must be between 1024-65535
- `schema`: Required, must contain valid `inputSchema` and `outputSchema`

---

### 2. Get All Tools

**Endpoint**: `GET /tools`
**Description**: Retrieve all tools with pagination and statistics

**Query Parameters**:
```typescript
{
  page?: number;        // Page number (default: 1)
  limit?: number;       // Items per page (default: 10, max: 100)
  search?: string;      // Search in name and description
  sort?: string;        // Sort field (e.g., 'createdAt', '-createdAt')
  filter?: object;      // MongoDB filter (e.g., { type: 'mcp', status: 'active' })
}
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "webSearch",
      "type": "mcp",
      "description": "Search the web using DuckDuckGo",
      "category": "productivity",
      "status": "active",
      "scope": "public",
      "transport": "sse",
      "endpoint": "http://localhost:3100",
      "port": 3100,
      "schema": {...},
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  },
  "statistics": {
    "total": 15,
    "byStatus": {
      "active": 12,
      "inactive": 2,
      "error": 1
    },
    "byType": {}
  }
}
```

**Common Filters**:
```typescript
// Get active MCP tools only
?filter={"type":"mcp","status":"active"}

// Search by name or description
?search=web

// Sort by creation date (newest first)
?sort=-createdAt

// Filter by category
?filter={"category":"productivity"}

// Get public tools only
?filter={"scope":"public"}

// Combine filters
?filter={"type":"mcp","status":"active","scope":"public"}&page=1&limit=20
```

---

### 3. Get Tool by ID

**Endpoint**: `GET /tools/:id`
**Description**: Retrieve a single tool by MongoDB ObjectId

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the tool

**Response**: `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "webSearch",
  "type": "mcp",
  "description": "Search the web using DuckDuckGo",
  "category": "productivity",
  "transport": "sse",
  "endpoint": "http://localhost:3100",
  "dockerImage": "aiops/mcp-web-search:latest",
  "containerId": "abc123def456",
  "port": 3100,
  "environment": {
    "API_KEY": "xxx",
    "DEBUG": "true"
  },
  "healthEndpoint": "/health",
  "lastHealthCheck": "2025-01-15T12:00:00.000Z",
  "status": "active",
  "schema": {
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": { "type": "string", "description": "Search query" }
      },
      "required": ["query"]
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "results": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "scope": "public",
  "owner": {
    "userId": "507f1f77bcf86cd799439012",
    "orgId": "507f1f77bcf86cd799439013"
  },
  "createdBy": "507f1f77bcf86cd799439012",
  "updatedBy": "507f1f77bcf86cd799439012",
  "deletedAt": null,
  "metadata": {},
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T12:00:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Tool with given ID does not exist or is deleted

---

### 4. Update Tool

**Endpoint**: `PATCH /tools/:id`
**Description**: Update an existing tool (all fields optional)

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the tool

**Request Body**: (All fields optional)
```typescript
{
  name?: string;              // 1-100 chars
  description?: string;       // 1-500 chars
  category?: 'productivity' | 'data' | 'system' | 'communication';
  endpoint?: string;          // For MCP tools
  port?: number;              // 1024-65535, for MCP tools
  environment?: Record<string, string>;
  healthEndpoint?: string;
  schema?: {
    inputSchema: object;
    outputSchema: object;
  };
  status?: 'active' | 'inactive' | 'error';
  scope?: 'public' | 'org' | 'private';
}
```

**Response**: `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "webSearchV2",
  "description": "Enhanced web search with filters",
  "status": "active",
  "updatedBy": "507f1f77bcf86cd799439012",
  "updatedAt": "2025-01-15T11:00:00.000Z",
  ...
}
```

**Validation Rules**:
- Cannot deactivate tool (`status: 'inactive'`) if it's being used by active agents
- Throws `409 Conflict` with list of dependent agents if validation fails

**Error Responses**:
- `404 Not Found`: Tool does not exist
- `409 Conflict`: Tool is in use by active agents (cannot deactivate)

---

### 5. Delete Tool

**Endpoint**: `DELETE /tools/:id`
**Description**: Soft delete a tool (sets `deletedAt` timestamp)

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the tool

**Response**: `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "webSearch",
  "status": "inactive",
  "deletedAt": "2025-01-15T12:00:00.000Z",
  ...
}
```

**Validation Rules**:
- Cannot delete tool if it's being used by active agents
- Throws `409 Conflict` with list of dependent agents if validation fails

**Error Responses**:
- `404 Not Found`: Tool does not exist
- `409 Conflict`: Tool is in use by active agents (cannot delete)

---

## Data Models

### TypeScript Interfaces

```typescript
/**
 * Tool Entity
 * MCP and Built-in Tools
 */
export interface Tool {
  _id: string;                           // MongoDB ObjectId as string
  name: string;                          // Tool name
  type: 'mcp' | 'builtin';              // Tool type
  description: string;                   // Tool description
  category: 'productivity' | 'data' | 'system' | 'communication';

  // MCP-specific fields (only if type='mcp')
  transport?: 'sse' | 'http';           // Transport protocol
  endpoint?: string;                     // Tool endpoint URL
  dockerImage?: string;                  // Docker image name
  containerId?: string;                  // Running container ID (set when deployed)
  port?: number;                         // Container port (1024-65535)
  environment?: Record<string, string>;  // Environment variables
  healthEndpoint?: string;               // Health check URL
  lastHealthCheck?: Date;                // Last health check timestamp

  // Common fields
  status: 'active' | 'inactive' | 'error';
  schema: {
    inputSchema: object;                 // JSON Schema for input
    outputSchema: object;                // JSON Schema for output
  };
  scope: 'public' | 'org' | 'private';  // Access control

  // BaseSchema fields (inherited)
  owner: {
    userId: string;
    orgId: string;
  };
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Tool DTO
 */
export interface CreateToolDto {
  name: string;                          // Required, 1-100 chars
  type: 'mcp' | 'builtin';              // Required
  description: string;                   // Required, 1-500 chars
  category: 'productivity' | 'data' | 'system' | 'communication'; // Required

  // MCP-specific (required if type='mcp')
  transport?: 'sse' | 'http';
  endpoint?: string;
  dockerImage?: string;
  port?: number;                         // 1024-65535
  environment?: Record<string, string>;
  healthEndpoint?: string;

  // Common
  schema: {                              // Required
    inputSchema: object;
    outputSchema: object;
  };
  status?: 'active' | 'inactive' | 'error';  // Default: 'active'
  scope?: 'public' | 'org' | 'private';      // Default: 'public'
}

/**
 * Update Tool DTO
 */
export interface UpdateToolDto {
  name?: string;                         // 1-100 chars
  description?: string;                  // 1-500 chars
  category?: 'productivity' | 'data' | 'system' | 'communication';
  endpoint?: string;
  port?: number;                         // 1024-65535
  environment?: Record<string, string>;
  healthEndpoint?: string;
  schema?: {
    inputSchema: object;
    outputSchema: object;
  };
  status?: 'active' | 'inactive' | 'error';  // Cannot set to 'inactive' if in use
  scope?: 'public' | 'org' | 'private';
}

/**
 * Paginated Response
 */
export interface ToolListResponse {
  data: Tool[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  statistics: {
    total: number;
    byStatus: {
      active: number;
      inactive: number;
      error: number;
    };
    byType: Record<string, any>;
  };
}

/**
 * Error Response (409 Conflict)
 */
export interface ToolInUseError {
  statusCode: 409;
  message: string;
  error: 'Conflict';
  details: {
    activeAgents: Array<{
      id: string;
      name: string;
    }>;
    action: 'delete' | 'deactivate';
  };
}
```

---

## Field Descriptions

### Core Fields

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `_id` | `string` | Auto | MongoDB ObjectId as string | Generated by database |
| `name` | `string` | Yes | Tool name | 1-100 characters |
| `type` | `string` | Yes | Tool type | `'mcp'` or `'builtin'` |
| `description` | `string` | Yes | Tool description | 1-500 characters |
| `category` | `string` | Yes | Tool category | `'productivity'`, `'data'`, `'system'`, or `'communication'` |
| `status` | `string` | No | Tool status | `'active'`, `'inactive'`, or `'error'` (default: `'active'`) |
| `scope` | `string` | No | Access control | `'public'`, `'org'`, or `'private'` (default: `'public'`) |
| `schema` | `object` | Yes | Input/output schemas | Must contain `inputSchema` and `outputSchema` |

### MCP-Specific Fields (Required if type='mcp')

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `transport` | `string` | Yes (MCP) | Transport protocol | `'sse'` or `'http'` |
| `endpoint` | `string` | Yes (MCP) | Tool endpoint URL | Valid URL (e.g., `http://localhost:3100`) |
| `dockerImage` | `string` | Yes (MCP) | Docker image name | e.g., `aiops/mcp-web-search:latest` |
| `port` | `number` | Yes (MCP) | Container port | 1024-65535 |
| `containerId` | `string` | No | Running container ID | Set when deployed |
| `environment` | `object` | No | Environment variables | Key-value pairs |
| `healthEndpoint` | `string` | No | Health check path | e.g., `/health` |
| `lastHealthCheck` | `Date` | No | Last health check time | Timestamp |

### BaseSchema Fields (Inherited)

| Field | Type | Description |
|-------|------|-------------|
| `owner.userId` | `string` | User who owns the tool |
| `owner.orgId` | `string` | Organization ID |
| `createdBy` | `string` | User ID who created the tool |
| `updatedBy` | `string` | User ID who last updated the tool |
| `deletedAt` | `Date \| null` | Soft delete timestamp (null if not deleted) |
| `metadata` | `object` | Custom metadata (extensible) |
| `createdAt` | `Date` | Creation timestamp |
| `updatedAt` | `Date` | Last update timestamp |

---

## Tool Types

### 1. MCP Tools (Model Context Protocol)

MCP tools are **containerized tools** that run as Docker containers and communicate via MCP protocol.

**Characteristics**:
- Run in isolated Docker containers
- Require deployment (container creation)
- Need endpoint configuration (IP + port)
- Support health checks
- Environment variables for configuration
- Transport: SSE (Server-Sent Events) or HTTP

**Use Cases**:
- Web search tools
- External API integrations
- Resource-intensive operations
- Tools requiring isolated environment

**Deployment Process**:
1. Create tool with `type: 'mcp'` and Docker configuration
2. System pulls Docker image
3. Container is started with specified port and environment
4. `containerId` is set when container is running
5. Health checks monitor container status

**Example MCP Tools**:
- `webSearch`: Search the web using DuckDuckGo
- `databaseQuery`: Query external databases
- `fileProcessor`: Process large files

---

### 2. Built-in Tools

Built-in tools are **pre-packaged** in the agent container, no deployment needed.

**Characteristics**:
- Pre-installed in agent runtime
- No container deployment required
- Immediate availability
- Lower resource overhead
- Direct function calls

**Use Cases**:
- System operations (list agents, get status)
- Internal data access
- Quick utility functions
- Agent management operations

**Example Built-in Tools**:
- `listAgents`: List all agents in organization
- `getAgentStatus`: Get status of specific agent
- `executeWorkflow`: Execute predefined workflows

---

### Comparison Table

| Feature | MCP Tools | Built-in Tools |
|---------|-----------|----------------|
| **Deployment** | Requires Docker container | Pre-packaged in agent |
| **Startup Time** | Slower (container pull + start) | Instant |
| **Resource Usage** | Higher (separate container) | Lower (in-process) |
| **Isolation** | Fully isolated | Shared agent process |
| **Customization** | High (env vars, config) | Limited |
| **Update Method** | Update Docker image | Update agent container |
| **Health Checks** | Yes (endpoint-based) | No (always available) |
| **Use Case** | External integrations, heavy tasks | Internal operations, utilities |

---

## Status Lifecycle

### Status Values

```
┌─────────┐
│ active  │ ◄─── Default status when created
└─────────┘
     │
     │ (manual update or health check fail)
     ▼
┌──────────┐
│ inactive │ ◄─── Only if NOT used by active agents
└──────────┘
     │
     │ (error occurs)
     ▼
┌────────┐
│ error  │ ◄─── System detected error (e.g., container crash)
└────────┘
     │
     │ (fix and reactivate)
     ▼
┌─────────┐
│ active  │
└─────────┘
```

### Status Rules

1. **active** (Default)
   - Tool is operational and can be assigned to agents
   - MCP tools: container is running and healthy
   - Built-in tools: always active unless manually deactivated

2. **inactive**
   - Tool is not available for new agent assignments
   - Existing agent assignments may still work
   - Cannot be set if tool is in use by active agents
   - Can be reactivated to 'active' status

3. **error**
   - System detected an error (e.g., MCP container crashed, health check failed)
   - Tool is not available
   - Requires manual intervention or automatic recovery
   - Can be fixed and reactivated to 'active'

4. **Soft Delete** (via DELETE endpoint)
   - Sets `deletedAt` timestamp
   - Cannot delete if tool is in use by active agents
   - Deleted tools are hidden from normal queries

---

## Validation Rules

### Field Validation

```typescript
// Name validation
name: {
  required: true,
  minLength: 1,
  maxLength: 100,
  type: 'string'
}

// Type validation
type: {
  required: true,
  enum: ['mcp', 'builtin']
}

// Description validation
description: {
  required: true,
  minLength: 1,
  maxLength: 500,
  type: 'string'
}

// Category validation
category: {
  required: true,
  enum: ['productivity', 'data', 'system', 'communication']
}

// MCP-specific validation (if type='mcp')
transport: {
  requiredIf: type === 'mcp',
  enum: ['sse', 'http']
}

endpoint: {
  requiredIf: type === 'mcp',
  type: 'string'
}

dockerImage: {
  requiredIf: type === 'mcp',
  type: 'string'
}

port: {
  requiredIf: type === 'mcp',
  type: 'number',
  min: 1024,
  max: 65535
}

// Schema validation
schema: {
  required: true,
  type: 'object',
  properties: {
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' }
  }
}

// Status validation
status: {
  required: false,
  enum: ['active', 'inactive', 'error'],
  default: 'active'
}

// Scope validation
scope: {
  required: false,
  enum: ['public', 'org', 'private'],
  default: 'public'
}
```

### Business Logic Validation

**1. Update Status to 'inactive'**
```typescript
// Check if tool is used by active agents
if (updateData.status === 'inactive') {
  const activeAgents = checkActiveAgentDependencies(toolId);
  if (activeAgents.length > 0) {
    throw {
      statusCode: 409,
      message: 'Cannot deactivate tool. It is in use by active agents.',
      details: {
        activeAgents: [...],
        action: 'deactivate'
      }
    };
  }
}
```

**2. Delete Tool**
```typescript
// Check if tool is used by active agents
const activeAgents = checkActiveAgentDependencies(toolId);
if (activeAgents.length > 0) {
  throw {
    statusCode: 409,
    message: 'Cannot delete tool. It is in use by active agents.',
    details: {
      activeAgents: [...],
      action: 'delete'
    }
  };
}
```

**3. MCP Tool Validation**
```typescript
// If type='mcp', validate required fields
if (type === 'mcp') {
  if (!transport || !endpoint || !dockerImage || !port) {
    throw {
      statusCode: 400,
      message: 'MCP tools require transport, endpoint, dockerImage, and port'
    };
  }
}
```

---

## Error Handling

### Standard Error Responses

**400 Bad Request** - Validation Error
```json
{
  "statusCode": 400,
  "message": [
    "name must be shorter than or equal to 100 characters",
    "port must not be less than 1024"
  ],
  "error": "Bad Request"
}
```

**401 Unauthorized** - Missing or Invalid JWT
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**404 Not Found** - Tool Not Found
```json
{
  "statusCode": 404,
  "message": "Tool with ID 507f1f77bcf86cd799439011 not found",
  "error": "Not Found"
}
```

**409 Conflict** - Tool In Use
```json
{
  "statusCode": 409,
  "message": "Cannot delete tool 'webSearch'. It is in use by 2 active agents: Customer Support Bot, Sales Assistant",
  "error": "Conflict",
  "details": {
    "activeAgents": [
      { "id": "507f1f77bcf86cd799439021", "name": "Customer Support Bot" },
      { "id": "507f1f77bcf86cd799439022", "name": "Sales Assistant" }
    ],
    "action": "delete"
  }
}
```

### Error Handling in Frontend

```typescript
async function updateTool(id: string, data: UpdateToolDto) {
  try {
    const response = await fetch(`/tools/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle specific error cases
      switch (response.status) {
        case 400:
          console.error('Validation error:', error.message);
          break;
        case 404:
          console.error('Tool not found');
          break;
        case 409:
          // Tool is in use
          console.error('Cannot update:', error.message);
          console.log('Active agents:', error.details.activeAgents);
          // Show list of dependent agents to user
          break;
        default:
          console.error('Unexpected error:', error);
      }
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to update tool:', error);
    throw error;
  }
}
```

---

## UI Components Guide

### 1. Tool List Component

**Purpose**: Display paginated list of tools with filters

```typescript
interface ToolListProps {
  token: string;
  onSelect?: (tool: Tool) => void;
}

function ToolList({ token, onSelect }: ToolListProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    byStatus: { active: 0, inactive: 0, error: 0 }
  });
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
    category: 'all',
    scope: 'all'
  });

  const fetchTools = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort: '-createdAt'
      });

      // Build filter object
      const filterObj: any = {};
      if (filters.type !== 'all') filterObj.type = filters.type;
      if (filters.status !== 'all') filterObj.status = filters.status;
      if (filters.category !== 'all') filterObj.category = filters.category;
      if (filters.scope !== 'all') filterObj.scope = filters.scope;

      if (Object.keys(filterObj).length > 0) {
        queryParams.append('filter', JSON.stringify(filterObj));
      }

      if (filters.search) {
        queryParams.append('search', filters.search);
      }

      const response = await fetch(
        `/tools?${queryParams}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const result = await response.json();
      setTools(result.data);
      setPagination(result.pagination);
      setStatistics(result.statistics);
    } catch (error) {
      console.error('Failed to fetch tools:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Search and Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search tools..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />

        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="all">All Types</option>
          <option value="mcp">MCP</option>
          <option value="builtin">Built-in</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="error">Error</option>
        </select>

        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="all">All Categories</option>
          <option value="productivity">Productivity</option>
          <option value="data">Data</option>
          <option value="system">System</option>
          <option value="communication">Communication</option>
        </select>

        <select
          value={filters.scope}
          onChange={(e) => setFilters({ ...filters, scope: e.target.value })}
        >
          <option value="all">All Scopes</option>
          <option value="public">Public</option>
          <option value="org">Organization</option>
          <option value="private">Private</option>
        </select>
      </div>

      {/* Statistics */}
      <div className="statistics">
        <div>Total: {statistics.total}</div>
        <div>Active: {statistics.byStatus.active}</div>
        <div>Inactive: {statistics.byStatus.inactive}</div>
        <div>Error: {statistics.byStatus.error}</div>
      </div>

      {/* Tool List */}
      <div className="tool-list">
        {loading ? (
          <div>Loading...</div>
        ) : (
          tools.map(tool => (
            <div
              key={tool._id}
              className="tool-card"
              onClick={() => onSelect?.(tool)}
            >
              <div className="tool-header">
                <h3>{tool.name}</h3>
                <span className={`badge ${tool.type}`}>{tool.type}</span>
                <span className={`status ${tool.status}`}>{tool.status}</span>
              </div>
              <p>{tool.description}</p>
              <div className="tool-meta">
                <span className="category">{tool.category}</span>
                <span className="scope">{tool.scope}</span>
                {tool.type === 'mcp' && (
                  <span className="endpoint">{tool.endpoint}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          disabled={pagination.page === 1}
          onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
        >
          Previous
        </button>
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        <button
          disabled={pagination.page === pagination.totalPages}
          onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

### 2. Tool Form Component

**Purpose**: Create/Edit tool with type-specific validation

```typescript
interface ToolFormProps {
  token: string;
  tool?: Tool;  // If editing
  onSuccess?: (tool: Tool) => void;
  onCancel?: () => void;
}

function ToolForm({ token, tool, onSuccess, onCancel }: ToolFormProps) {
  const [formData, setFormData] = useState<CreateToolDto>({
    name: tool?.name || '',
    type: tool?.type || 'mcp',
    description: tool?.description || '',
    category: tool?.category || 'productivity',
    transport: tool?.transport || 'sse',
    endpoint: tool?.endpoint || '',
    dockerImage: tool?.dockerImage || '',
    port: tool?.port || 3100,
    environment: tool?.environment || {},
    healthEndpoint: tool?.healthEndpoint || '/health',
    schema: tool?.schema || {
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: {} }
    },
    status: tool?.status || 'active',
    scope: tool?.scope || 'public'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const isMcpTool = formData.type === 'mcp';

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 1) {
      newErrors.name = 'Name is required';
    }
    if (formData.name && formData.name.length > 100) {
      newErrors.name = 'Name must be max 100 characters';
    }
    if (!formData.description || formData.description.length < 1) {
      newErrors.description = 'Description is required';
    }
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be max 500 characters';
    }

    // MCP-specific validation
    if (isMcpTool) {
      if (!formData.transport) {
        newErrors.transport = 'Transport is required for MCP tools';
      }
      if (!formData.endpoint) {
        newErrors.endpoint = 'Endpoint is required for MCP tools';
      }
      if (!formData.dockerImage) {
        newErrors.dockerImage = 'Docker image is required for MCP tools';
      }
      if (!formData.port || formData.port < 1024 || formData.port > 65535) {
        newErrors.port = 'Port must be between 1024-65535';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const url = tool ? `/tools/${tool._id}` : '/tools';
      const method = tool ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          alert(`Cannot update: ${error.message}\n\nActive agents:\n${
            error.details.activeAgents.map(a => `- ${a.name}`).join('\n')
          }`);
        } else {
          throw error;
        }
      } else {
        const result = await response.json();
        onSuccess?.(result);
      }
    } catch (error) {
      console.error('Failed to save tool:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Name */}
      <div>
        <label>Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          maxLength={100}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      {/* Type (only for create) */}
      {!tool && (
        <div>
          <label>Type *</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
          >
            <option value="mcp">MCP (Containerized)</option>
            <option value="builtin">Built-in</option>
          </select>
        </div>
      )}

      {/* Description */}
      <div>
        <label>Description *</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          maxLength={500}
        />
        {errors.description && <span className="error">{errors.description}</span>}
      </div>

      {/* Category */}
      <div>
        <label>Category *</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
        >
          <option value="productivity">Productivity</option>
          <option value="data">Data</option>
          <option value="system">System</option>
          <option value="communication">Communication</option>
        </select>
      </div>

      {/* MCP-specific fields */}
      {isMcpTool && (
        <>
          <div>
            <label>Transport *</label>
            <select
              value={formData.transport}
              onChange={(e) => setFormData({ ...formData, transport: e.target.value as any })}
            >
              <option value="sse">SSE (Server-Sent Events)</option>
              <option value="http">HTTP</option>
            </select>
            {errors.transport && <span className="error">{errors.transport}</span>}
          </div>

          <div>
            <label>Endpoint *</label>
            <input
              type="text"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              placeholder="http://localhost:3100"
            />
            {errors.endpoint && <span className="error">{errors.endpoint}</span>}
          </div>

          <div>
            <label>Docker Image *</label>
            <input
              type="text"
              value={formData.dockerImage}
              onChange={(e) => setFormData({ ...formData, dockerImage: e.target.value })}
              placeholder="aiops/mcp-web-search:latest"
            />
            {errors.dockerImage && <span className="error">{errors.dockerImage}</span>}
          </div>

          <div>
            <label>Port *</label>
            <input
              type="number"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
              min={1024}
              max={65535}
            />
            {errors.port && <span className="error">{errors.port}</span>}
          </div>

          <div>
            <label>Health Endpoint</label>
            <input
              type="text"
              value={formData.healthEndpoint}
              onChange={(e) => setFormData({ ...formData, healthEndpoint: e.target.value })}
              placeholder="/health"
            />
          </div>

          <div>
            <label>Environment Variables (JSON)</label>
            <textarea
              value={JSON.stringify(formData.environment, null, 2)}
              onChange={(e) => {
                try {
                  const env = JSON.parse(e.target.value);
                  setFormData({ ...formData, environment: env });
                } catch (err) {
                  // Invalid JSON, ignore
                }
              }}
              rows={4}
            />
          </div>
        </>
      )}

      {/* Schema (simplified - in real app use JSON editor) */}
      <div>
        <label>Input Schema (JSON) *</label>
        <textarea
          value={JSON.stringify(formData.schema.inputSchema, null, 2)}
          onChange={(e) => {
            try {
              const inputSchema = JSON.parse(e.target.value);
              setFormData({
                ...formData,
                schema: { ...formData.schema, inputSchema }
              });
            } catch (err) {
              // Invalid JSON
            }
          }}
          rows={6}
        />
      </div>

      <div>
        <label>Output Schema (JSON) *</label>
        <textarea
          value={JSON.stringify(formData.schema.outputSchema, null, 2)}
          onChange={(e) => {
            try {
              const outputSchema = JSON.parse(e.target.value);
              setFormData({
                ...formData,
                schema: { ...formData.schema, outputSchema }
              });
            } catch (err) {
              // Invalid JSON
            }
          }}
          rows={6}
        />
      </div>

      {/* Status */}
      <div>
        <label>Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Scope */}
      <div>
        <label>Scope</label>
        <select
          value={formData.scope}
          onChange={(e) => setFormData({ ...formData, scope: e.target.value as any })}
        >
          <option value="public">Public</option>
          <option value="org">Organization</option>
          <option value="private">Private</option>
        </select>
      </div>

      {/* Actions */}
      <div>
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (tool ? 'Update' : 'Create')}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
```

---

### 3. Tool Detail Component

**Purpose**: Display full tool details with health status (for MCP tools)

```typescript
interface ToolDetailProps {
  token: string;
  toolId: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

function ToolDetail({ token, toolId, onEdit, onDelete }: ToolDetailProps) {
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTool();
  }, [toolId]);

  const fetchTool = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/tools/${toolId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tool');
      }

      const data = await response.json();
      setTool(data);
    } catch (error) {
      console.error('Failed to fetch tool:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tool?')) {
      return;
    }

    try {
      const response = await fetch(`/tools/${toolId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          alert(`Cannot delete: ${error.message}\n\nActive agents:\n${
            error.details.activeAgents.map(a => `- ${a.name}`).join('\n')
          }`);
        } else {
          throw error;
        }
      } else {
        onDelete?.();
      }
    } catch (error) {
      console.error('Failed to delete tool:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!tool) return <div>Tool not found</div>;

  const isMcpTool = tool.type === 'mcp';

  return (
    <div className="tool-detail">
      {/* Header */}
      <div className="header">
        <h1>{tool.name}</h1>
        <div className="badges">
          <span className={`badge ${tool.type}`}>{tool.type}</span>
          <span className={`badge ${tool.category}`}>{tool.category}</span>
          <span className={`badge ${tool.scope}`}>{tool.scope}</span>
        </div>
        <div className="actions">
          <button onClick={onEdit}>Edit</button>
          <button onClick={handleDelete} className="danger">Delete</button>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`status-badge ${tool.status}`}>
        {tool.status}
      </div>

      {/* Description */}
      <div className="section">
        <h3>Description</h3>
        <p>{tool.description}</p>
      </div>

      {/* MCP Configuration */}
      {isMcpTool && (
        <div className="section">
          <h3>MCP Configuration</h3>
          <table>
            <tbody>
              <tr>
                <td>Transport:</td>
                <td>{tool.transport}</td>
              </tr>
              <tr>
                <td>Endpoint:</td>
                <td><code>{tool.endpoint}</code></td>
              </tr>
              <tr>
                <td>Docker Image:</td>
                <td><code>{tool.dockerImage}</code></td>
              </tr>
              <tr>
                <td>Port:</td>
                <td>{tool.port}</td>
              </tr>
              {tool.containerId && (
                <tr>
                  <td>Container ID:</td>
                  <td><code>{tool.containerId}</code></td>
                </tr>
              )}
              {tool.healthEndpoint && (
                <tr>
                  <td>Health Endpoint:</td>
                  <td><code>{tool.healthEndpoint}</code></td>
                </tr>
              )}
              {tool.lastHealthCheck && (
                <tr>
                  <td>Last Health Check:</td>
                  <td>{new Date(tool.lastHealthCheck).toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>

          {tool.environment && Object.keys(tool.environment).length > 0 && (
            <>
              <h4>Environment Variables</h4>
              <pre>{JSON.stringify(tool.environment, null, 2)}</pre>
            </>
          )}
        </div>
      )}

      {/* Schema */}
      <div className="section">
        <h3>Input Schema</h3>
        <pre>{JSON.stringify(tool.schema.inputSchema, null, 2)}</pre>

        <h3>Output Schema</h3>
        <pre>{JSON.stringify(tool.schema.outputSchema, null, 2)}</pre>
      </div>

      {/* Metadata */}
      <div className="section metadata">
        <h3>Metadata</h3>
        <table>
          <tbody>
            <tr>
              <td>ID:</td>
              <td>{tool._id}</td>
            </tr>
            <tr>
              <td>Type:</td>
              <td>{tool.type}</td>
            </tr>
            <tr>
              <td>Category:</td>
              <td>{tool.category}</td>
            </tr>
            <tr>
              <td>Scope:</td>
              <td>{tool.scope}</td>
            </tr>
            <tr>
              <td>Created:</td>
              <td>{new Date(tool.createdAt).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Updated:</td>
              <td>{new Date(tool.updatedAt).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Created By:</td>
              <td>{tool.createdBy}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### 4. Tool Selector Component

**Purpose**: Select tools for agent assignment (multi-select)

```typescript
interface ToolSelectorProps {
  token: string;
  value?: string[];  // Selected tool IDs
  onChange: (toolIds: string[]) => void;
  typeFilter?: 'mcp' | 'builtin' | 'all';
  statusFilter?: 'active' | 'inactive' | 'error' | 'all';
}

function ToolSelector({
  token,
  value = [],
  onChange,
  typeFilter = 'all',
  statusFilter = 'active'
}: ToolSelectorProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTools();
  }, [typeFilter, statusFilter]);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const filterObj: any = {};
      if (typeFilter !== 'all') filterObj.type = typeFilter;
      if (statusFilter !== 'all') filterObj.status = statusFilter;

      const filter = Object.keys(filterObj).length > 0
        ? `?filter=${JSON.stringify(filterObj)}`
        : '';

      const response = await fetch(`/tools${filter}&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      setTools(result.data);
    } catch (error) {
      console.error('Failed to fetch tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (toolId: string) => {
    if (value.includes(toolId)) {
      onChange(value.filter(id => id !== toolId));
    } else {
      onChange([...value, toolId]);
    }
  };

  return (
    <div className="tool-selector">
      <label>Select Tools</label>
      {loading ? (
        <div>Loading tools...</div>
      ) : (
        <div className="tool-checkboxes">
          {tools.map(tool => (
            <div key={tool._id} className="tool-option">
              <input
                type="checkbox"
                id={tool._id}
                checked={value.includes(tool._id)}
                onChange={() => handleToggle(tool._id)}
              />
              <label htmlFor={tool._id}>
                <span className="tool-name">{tool.name}</span>
                <span className={`badge ${tool.type}`}>{tool.type}</span>
                <span className="tool-description">{tool.description}</span>
              </label>
            </div>
          ))}
        </div>
      )}
      <div className="selected-count">
        {value.length} tool(s) selected
      </div>
    </div>
  );
}
```

---

## Example Requests

### 1. Create MCP Tool

```bash
curl -X POST http://localhost:3305/tools \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "webSearch",
    "type": "mcp",
    "description": "Search the web using DuckDuckGo",
    "category": "productivity",
    "transport": "sse",
    "endpoint": "http://localhost:3100",
    "dockerImage": "aiops/mcp-web-search:latest",
    "port": 3100,
    "environment": {
      "API_KEY": "xxx",
      "DEBUG": "true"
    },
    "healthEndpoint": "/health",
    "schema": {
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query"
          }
        },
        "required": ["query"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "results": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    },
    "status": "active",
    "scope": "public"
  }'
```

---

### 2. Create Built-in Tool

```bash
curl -X POST http://localhost:3305/tools \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "listAgents",
    "type": "builtin",
    "description": "List all agents in the organization",
    "category": "system",
    "schema": {
      "inputSchema": {
        "type": "object",
        "properties": {
          "limit": {
            "type": "number",
            "description": "Max number of agents to return"
          }
        }
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "agents": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "name": { "type": "string" }
              }
            }
          }
        }
      }
    },
    "status": "active",
    "scope": "org"
  }'
```

---

### 3. Get All Tools (with filters)

```bash
# Get all active MCP tools
curl -X GET "http://localhost:3305/tools?filter={\"type\":\"mcp\",\"status\":\"active\"}&page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGc..."

# Search tools
curl -X GET "http://localhost:3305/tools?search=web&sort=-createdAt" \
  -H "Authorization: Bearer eyJhbGc..."

# Filter by category
curl -X GET "http://localhost:3305/tools?filter={\"category\":\"productivity\"}" \
  -H "Authorization: Bearer eyJhbGc..."

# Get public tools only
curl -X GET "http://localhost:3305/tools?filter={\"scope\":\"public\"}" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 4. Get Tool by ID

```bash
curl -X GET http://localhost:3305/tools/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 5. Update Tool

```bash
curl -X PATCH http://localhost:3305/tools/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Enhanced web search with filters and ranking",
    "environment": {
      "API_KEY": "new-key",
      "DEBUG": "false"
    }
  }'
```

---

### 6. Deactivate Tool

```bash
curl -X PATCH http://localhost:3305/tools/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive"
  }'
```

**Note**: This will fail with `409 Conflict` if the tool is in use by active agents.

---

### 7. Delete Tool

```bash
curl -X DELETE http://localhost:3305/tools/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..."
```

**Note**: This will fail with `409 Conflict` if the tool is in use by active agents.

---

## Developer Notes

### Key Design Decisions

1. **Two Tool Types**
   - **MCP**: Containerized, flexible, isolated, requires deployment
   - **Built-in**: Pre-packaged, instant, lightweight, no deployment
   - Each type has different requirements and use cases

2. **JSON Schema Validation**
   - Tools define input/output schemas using JSON Schema
   - Frontend can validate inputs before sending to tool
   - Backend validates both input and output against schemas

3. **Dependency Validation**
   - Prevents deletion/deactivation of tools used by active agents
   - Returns list of dependent agents in error response
   - Frontend should display these agents to user

4. **Health Monitoring (MCP only)**
   - MCP tools have health endpoints for monitoring
   - `lastHealthCheck` timestamp tracks last successful check
   - Status can automatically change to 'error' if health check fails

5. **Access Control**
   - **public**: Available to all users
   - **org**: Available within organization
   - **private**: Available to owner only

### Common Use Cases

**1. Agent Assignment (Multi-tool)**
```typescript
// Fetch active tools for selection
const tools = await fetch('/tools?filter={"status":"active"}&limit=100');

// Assign multiple tools to agent
await fetch('/agents', {
  method: 'POST',
  body: JSON.stringify({
    name: 'My Agent',
    instructionId: '...',
    toolIds: ['tool1', 'tool2', 'tool3'], // Array of tool IDs
    ...
  })
});
```

**2. MCP Tool Deployment Workflow**
```typescript
// 1. Create MCP tool
const mcpTool = await createTool({
  name: 'webSearch',
  type: 'mcp',
  dockerImage: 'aiops/mcp-web-search:latest',
  port: 3100,
  ...
});

// 2. System pulls Docker image and starts container
// 3. containerId is set when container is running

// 4. Poll for container status
const updatedTool = await fetchTool(mcpTool._id);
if (updatedTool.containerId) {
  console.log('Container deployed:', updatedTool.containerId);
}

// 5. Monitor health checks
setInterval(async () => {
  const tool = await fetchTool(mcpTool._id);
  if (tool.status === 'error') {
    console.error('Health check failed!');
  }
}, 30000); // Check every 30 seconds
```

**3. Tool Management**
```typescript
// Create tool
const newTool = await createTool({ ... });

// Update tool
await updateTool(toolId, { description: 'Updated...' });

// Deactivate (if not in use)
await updateTool(toolId, { status: 'inactive' });

// Delete (if not in use)
await deleteTool(toolId);
```

**4. Handling Dependencies**
```typescript
try {
  await updateTool(id, { status: 'inactive' });
} catch (error) {
  if (error.statusCode === 409) {
    // Show list of dependent agents
    const agents = error.details.activeAgents;
    showAlert(`Cannot deactivate. Used by:\n${agents.map(a => `- ${a.name}`).join('\n')}`);
  }
}
```

### Performance Considerations

1. **Indexing**
   - Index on `type` and `status` for list queries
   - Index on `category` for filtering
   - Text index on `name` and `description` for search

2. **Pagination**
   - Use pagination for large datasets (default limit: 10, max: 100)
   - Always provide page/limit parameters for predictable performance

3. **Caching**
   - Tools are relatively static, consider caching active tools
   - Cache TTL: 5-10 minutes recommended
   - Invalidate cache on create/update/delete

4. **MCP Container Management**
   - Container startup can take 10-30 seconds
   - Show loading state during container deployment
   - Poll for `containerId` and `status` updates

### Testing Checklist

- [ ] Create MCP tool with all required fields
- [ ] Create built-in tool (no MCP fields)
- [ ] Validate MCP-specific field requirements
- [ ] Validate port range (1024-65535)
- [ ] Validate JSON Schema format
- [ ] List tools with pagination
- [ ] Search tools by keyword
- [ ] Filter by type (mcp/builtin)
- [ ] Filter by status (active/inactive/error)
- [ ] Filter by category
- [ ] Filter by scope
- [ ] Get tool by ID
- [ ] Update tool fields
- [ ] Try to deactivate tool in use (should fail with 409)
- [ ] Deactivate tool not in use (should succeed)
- [ ] Try to delete tool in use (should fail with 409)
- [ ] Delete tool not in use (should succeed)
- [ ] Verify statistics aggregation
- [ ] Test authentication (missing/invalid token)
- [ ] Monitor MCP tool health checks
- [ ] Verify container deployment (containerId set)

---

**End of Document**
