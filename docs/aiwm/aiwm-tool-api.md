# Tool API Documentation - Frontend Integration Guide

## Overview

Tool API quản lý các MCP (Model Context Protocol) tools và built-in tools trong hệ thống AIWM. API cung cấp đầy đủ các endpoint để tạo, quản lý, cập nhật và xóa các tool.

**Base URL:**
- `http://localhost:3305` (Local)
- `https://api.x-or.cloud/dev/aiwm` (Production)

**Authentication:** Bearer Token (JWT)

---

## Table of Contents

1. [Entity Description](#entity-description)
2. [API Endpoints](#api-endpoints)
3. [Common Response Formats](#common-response-formats)
4. [Error Handling](#error-handling)
5. [Integration Examples](#integration-examples)

---

## Entity Description

### Tool Entity

```typescript
interface Tool {
  // Identifiers
  _id: string;                    // MongoDB Object ID (primary key)
  name: string;                   // Tool name (max 100 chars)
  type: ToolType;                 // "mcp" hoặc "builtin"
  description: string;            // Mô tả tool (max 500 chars)
  category: ToolCategory;         // Category của tool

  // MCP-specific fields (chỉ có khi type = "mcp")
  transport?: 'sse' | 'http';     // Transport protocol
  endpoint?: string;              // Tool endpoint URL
  dockerImage?: string;           // Docker image name
  containerId?: string;           // Running container ID (khi deployed)
  port?: number;                  // Container port (1024-65535)
  environment?: Record<string, string>; // Biến môi trường
  healthEndpoint?: string;        // Health check endpoint
  lastHealthCheck?: Date;         // Lần health check cuối

  // Common fields
  status: ToolStatus;             // Trạng thái tool
  schema: {
    inputSchema: object;          // JSON Schema cho input
    outputSchema: object;         // JSON Schema cho output
  };

  // Access Control
  scope: ToolScope;               // Phạm vi truy cập

  // Ownership & Audit (từ BaseSchema)
  owner: {
    orgId?: string;               // Organization ID
    groupId?: string;             // Group ID
    agentId?: string;             // Agent ID
    appId?: string;               // App ID
  };
  createdBy: string;              // User ID của người tạo
  updatedBy?: string;             // User ID của người update
  deletedAt?: Date;               // Soft delete timestamp
  metadata?: Record<string, any>; // Custom metadata

  // Timestamps
  createdAt: Date;                // Ngày tạo
  updatedAt: Date;                // Ngày update
}
```

### Enums

#### ToolType

```typescript
enum ToolType {
  MCP = 'mcp',         // MCP tool (chạy trong container)
  BUILTIN = 'builtin'  // Built-in tool (có sẵn trong agent)
}
```

#### ToolCategory

```typescript
enum ToolCategory {
  PRODUCTIVITY = 'productivity',      // Productivity tools
  DATA = 'data',                      // Data processing tools
  SYSTEM = 'system',                  // System tools
  COMMUNICATION = 'communication'     // Communication tools
}
```

#### ToolStatus

```typescript
enum ToolStatus {
  ACTIVE = 'active',      // Tool đang hoạt động
  INACTIVE = 'inactive',  // Tool tạm dừng
  ERROR = 'error'         // Tool gặp lỗi
}
```

#### ToolScope

```typescript
enum ToolScope {
  PUBLIC = 'public',      // Công khai cho tất cả
  ORG = 'org',            // Chỉ trong organization
  PRIVATE = 'private'     // Chỉ người tạo sử dụng
}
```

### Tool Schema

```typescript
interface ToolSchemaDto {
  inputSchema: object;   // JSON Schema định nghĩa input parameters
  outputSchema: object;  // JSON Schema định nghĩa output format
}
```

**Example:**

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query"
      },
      "maxResults": {
        "type": "number",
        "description": "Maximum number of results",
        "default": 10
      }
    },
    "required": ["query"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "results": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "url": { "type": "string" },
            "snippet": { "type": "string" }
          }
        }
      },
      "total": {
        "type": "number"
      }
    }
  }
}
```

---

## API Endpoints

### 1. Create Tool

Tạo tool mới (MCP hoặc built-in).

**Endpoint:** `POST /tools`
**Auth Required:** Yes

**Request Body:**

```typescript
{
  // Required fields
  name: string;              // Tool name (max 100)
  type: 'mcp' | 'builtin';   // Tool type
  description: string;       // Description (max 500)
  category: ToolCategory;    // Category
  schema: ToolSchemaDto;     // Input/output schema

  // Optional fields
  status?: ToolStatus;       // Default: 'active'
  scope?: ToolScope;         // Default: 'public'

  // MCP-specific (required if type="mcp")
  transport?: 'sse' | 'http';
  endpoint?: string;
  dockerImage?: string;
  port?: number;             // 1024-65535
  environment?: Record<string, string>;
  healthEndpoint?: string;
}
```

**Example Request (MCP Tool):**

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
    "SEARCH_ENGINE": "duckduckgo",
    "MAX_RESULTS": "20"
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

**Example Request (Built-in Tool):**

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
        "page": { "type": "number", "default": 1 },
        "limit": { "type": "number", "default": 10 }
      }
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "agents": {
          "type": "array",
          "items": { "type": "object" }
        },
        "total": { "type": "number" }
      }
    }
  },
  "status": "active",
  "scope": "org"
}
```

**Response:** `201 Created`

```json
{
  "_id": "673e7a1f5c9d8e001234abcd",
  "name": "webSearch",
  "type": "mcp",
  "description": "Search the web using DuckDuckGo",
  "category": "productivity",
  "transport": "sse",
  "endpoint": "http://localhost:3100",
  "dockerImage": "aiops/mcp-web-search:latest",
  "port": 3100,
  "environment": {
    "SEARCH_ENGINE": "duckduckgo",
    "MAX_RESULTS": "20"
  },
  "healthEndpoint": "/health",
  "status": "active",
  "scope": "public",
  "schema": {
    "inputSchema": { /* ... */ },
    "outputSchema": { /* ... */ }
  },
  "owner": {
    "orgId": "68dd05b175d9e3c17bf97f60"
  },
  "createdBy": "68dcf365f6a92c0d4911b619",
  "createdAt": "2025-11-22T10:00:00.000Z",
  "updatedAt": "2025-11-22T10:00:00.000Z"
}
```

**curl Example:**

```bash
curl -X POST http://localhost:3305/tools \
  -H "Authorization: Bearer $TOKEN" \
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
    "healthEndpoint": "/health",
    "schema": {
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        },
        "required": ["query"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "results": { "type": "array" }
        }
      }
    }
  }'
```

**Frontend Usage:**

```typescript
const createTool = async (data: CreateToolDto) => {
  const response = await fetch('http://localhost:3305/tools', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to create tool');
  }

  return await response.json();
};
```

---

### 2. Get All Tools

Lấy danh sách tất cả tools với phân trang.

**Endpoint:** `GET /tools`
**Auth Required:** Yes

**Query Parameters:**
- `page` (number, optional): Số trang (mặc định: 1)
- `limit` (number, optional): Số item mỗi trang (mặc định: 10)

**Response:** `200 OK`

```json
{
  "data": [
    {
      "_id": "673e7a1f5c9d8e001234abcd",
      "name": "webSearch",
      "type": "mcp",
      "description": "Search the web using DuckDuckGo",
      "category": "productivity",
      "status": "active",
      "scope": "public",
      "transport": "sse",
      "endpoint": "http://localhost:3100",
      "dockerImage": "aiops/mcp-web-search:latest",
      "port": 3100,
      "containerId": "abc123def456",
      "healthEndpoint": "/health",
      "lastHealthCheck": "2025-11-22T10:05:00.000Z",
      "schema": {
        "inputSchema": { /* ... */ },
        "outputSchema": { /* ... */ }
      },
      "createdAt": "2025-11-22T10:00:00.000Z",
      "updatedAt": "2025-11-22T10:05:00.000Z"
    },
    {
      "_id": "673e7a1f5c9d8e001234abce",
      "name": "listAgents",
      "type": "builtin",
      "description": "List all agents in the organization",
      "category": "system",
      "status": "active",
      "scope": "org",
      "schema": {
        "inputSchema": { /* ... */ },
        "outputSchema": { /* ... */ }
      },
      "createdAt": "2025-11-22T09:00:00.000Z",
      "updatedAt": "2025-11-22T09:00:00.000Z"
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 10
}
```

**curl Example:**

```bash
curl -X GET "http://localhost:3305/tools?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Frontend Usage:**

```typescript
interface PaginationParams {
  page?: number;
  limit?: number;
}

const getTools = async (params: PaginationParams = {}) => {
  const queryParams = new URLSearchParams({
    page: String(params.page || 1),
    limit: String(params.limit || 10)
  });

  const response = await fetch(`http://localhost:3305/tools?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch tools');
  }

  return await response.json();
};
```

---

### 3. Get Tool by ID

Lấy thông tin chi tiết của một tool.

**Endpoint:** `GET /tools/:id`
**Auth Required:** Yes

**Path Parameters:**
- `id` (string): Tool ID

**Response:** `200 OK`

```json
{
  "_id": "673e7a1f5c9d8e001234abcd",
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
    "SEARCH_ENGINE": "duckduckgo",
    "MAX_RESULTS": "20"
  },
  "healthEndpoint": "/health",
  "lastHealthCheck": "2025-11-22T10:05:00.000Z",
  "status": "active",
  "scope": "public",
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
  "owner": {
    "orgId": "68dd05b175d9e3c17bf97f60"
  },
  "createdBy": "68dcf365f6a92c0d4911b619",
  "createdAt": "2025-11-22T10:00:00.000Z",
  "updatedAt": "2025-11-22T10:05:00.000Z"
}
```

**curl Example:**

```bash
curl -X GET http://localhost:3305/tools/673e7a1f5c9d8e001234abcd \
  -H "Authorization: Bearer $TOKEN"
```

**Frontend Usage:**

```typescript
const getToolById = async (toolId: string) => {
  const response = await fetch(`http://localhost:3305/tools/${toolId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Tool not found');
    }
    throw new Error('Failed to fetch tool');
  }

  return await response.json();
};
```

---

### 4. Update Tool

Cập nhật thông tin tool.

**Endpoint:** `PATCH /tools/:id`
**Auth Required:** Yes

**Path Parameters:**
- `id` (string): Tool ID

**Request Body:**

```typescript
{
  name?: string;
  description?: string;
  category?: ToolCategory;
  endpoint?: string;
  port?: number;
  environment?: Record<string, string>;
  healthEndpoint?: string;
  schema?: ToolSchemaDto;
  status?: ToolStatus;
  scope?: ToolScope;
}
```

**Example Request:**

```json
{
  "description": "Enhanced web search with filtering",
  "status": "active",
  "environment": {
    "SEARCH_ENGINE": "google",
    "MAX_RESULTS": "50"
  }
}
```

**Response:** `200 OK`

```json
{
  "_id": "673e7a1f5c9d8e001234abcd",
  "name": "webSearch",
  "type": "mcp",
  "description": "Enhanced web search with filtering",
  "category": "productivity",
  "status": "active",
  "environment": {
    "SEARCH_ENGINE": "google",
    "MAX_RESULTS": "50"
  },
  "updatedAt": "2025-11-22T10:10:00.000Z"
}
```

**curl Example:**

```bash
curl -X PATCH http://localhost:3305/tools/673e7a1f5c9d8e001234abcd \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Enhanced web search with filtering",
    "status": "active"
  }'
```

**Frontend Usage:**

```typescript
const updateTool = async (toolId: string, data: Partial<Tool>) => {
  const response = await fetch(`http://localhost:3305/tools/${toolId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to update tool');
  }

  return await response.json();
};
```

---

### 5. Delete Tool

Xóa tool (soft delete).

**Endpoint:** `DELETE /tools/:id`
**Auth Required:** Yes

**Path Parameters:**
- `id` (string): Tool ID

**Response:** `200 OK`

```json
{
  "message": "Tool deleted successfully"
}
```

**curl Example:**

```bash
curl -X DELETE http://localhost:3305/tools/673e7a1f5c9d8e001234abcd \
  -H "Authorization: Bearer $TOKEN"
```

**Frontend Usage:**

```typescript
const deleteTool = async (toolId: string) => {
  const response = await fetch(`http://localhost:3305/tools/${toolId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete tool');
  }

  return await response.json();
};
```

---

## Common Response Formats

### Success Response

```typescript
{
  data?: any;           // Response data
  message?: string;     // Success message
  total?: number;       // Total items (for pagination)
  page?: number;        // Current page (for pagination)
  limit?: number;       // Items per page (for pagination)
}
```

### Error Response

```typescript
{
  statusCode: number;   // HTTP status code
  message: string | string[];  // Error message(s)
  error?: string;       // Error type
  timestamp: string;    // ISO timestamp
  path: string;         // Request path
}
```

**Example:**

```json
{
  "statusCode": 400,
  "message": [
    "name must be a string",
    "transport must be one of the following values: sse, http"
  ],
  "error": "Bad Request",
  "timestamp": "2025-11-22T10:00:00.000Z",
  "path": "/tools"
}
```

---

## Error Handling

### HTTP Status Codes

- `200 OK` - Request thành công
- `201 Created` - Tạo resource thành công
- `400 Bad Request` - Request body không hợp lệ
- `401 Unauthorized` - Thiếu hoặc token không hợp lệ
- `403 Forbidden` - Không có quyền truy cập
- `404 Not Found` - Tool không tồn tại
- `500 Internal Server Error` - Lỗi server

### Validation Errors

**MCP Tool Validation:**

```json
{
  "statusCode": 400,
  "message": [
    "transport must be one of the following values: sse, http",
    "endpoint must be a string",
    "dockerImage must be a string",
    "port must be a number conforming to the specified constraints"
  ],
  "error": "Bad Request"
}
```

**Schema Validation:**

```json
{
  "statusCode": 400,
  "message": [
    "schema.inputSchema must be an object",
    "schema.outputSchema must be an object"
  ],
  "error": "Bad Request"
}
```

---

## Integration Examples

### Complete MCP Tool Creation Flow

```typescript
// Bước 1: Tạo MCP tool
const createMCPTool = async () => {
  const toolData = {
    name: "webSearch",
    type: "mcp",
    description: "Search the web using DuckDuckGo",
    category: "productivity",
    transport: "sse",
    endpoint: "http://localhost:3100",
    dockerImage: "aiops/mcp-web-search:latest",
    port: 3100,
    environment: {
      SEARCH_ENGINE: "duckduckgo",
      MAX_RESULTS: "20"
    },
    healthEndpoint: "/health",
    schema: {
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          },
          maxResults: {
            type: "number",
            description: "Maximum results",
            default: 10
          }
        },
        required: ["query"]
      },
      outputSchema: {
        type: "object",
        properties: {
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
                snippet: { type: "string" }
              }
            }
          },
          total: { type: "number" }
        }
      }
    },
    status: "active",
    scope: "public"
  };

  try {
    const tool = await createTool(toolData);
    console.log('Tool created:', tool._id);
    return tool;
  } catch (error) {
    console.error('Failed to create tool:', error);
    throw error;
  }
};
```

### Built-in Tool Creation

```typescript
const createBuiltinTool = async () => {
  const toolData = {
    name: "listAgents",
    type: "builtin",
    description: "List all agents in the organization",
    category: "system",
    schema: {
      inputSchema: {
        type: "object",
        properties: {
          page: {
            type: "number",
            description: "Page number",
            default: 1
          },
          limit: {
            type: "number",
            description: "Items per page",
            default: 10
          }
        }
      },
      outputSchema: {
        type: "object",
        properties: {
          agents: {
            type: "array",
            items: { type: "object" }
          },
          total: { type: "number" },
          page: { type: "number" },
          limit: { type: "number" }
        }
      }
    },
    status: "active",
    scope: "org"
  };

  try {
    const tool = await createTool(toolData);
    console.log('Built-in tool created:', tool._id);
    return tool;
  } catch (error) {
    console.error('Failed to create built-in tool:', error);
    throw error;
  }
};
```

### Tools List Component

```typescript
interface ToolsListState {
  tools: Tool[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  filter: {
    type?: ToolType;
    category?: ToolCategory;
    status?: ToolStatus;
  };
}

const ToolsList: React.FC = () => {
  const [state, setState] = useState<ToolsListState>({
    tools: [],
    total: 0,
    page: 1,
    limit: 10,
    loading: false,
    filter: {}
  });

  // Load tools
  const loadTools = async (page: number = 1, limit: number = 10) => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await getTools({ page, limit });
      setState(prev => ({
        ...prev,
        tools: response.data,
        total: response.total,
        page: response.page,
        limit: response.limit,
        loading: false
      }));
    } catch (error) {
      console.error('Failed to load tools:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadTools(state.page, state.limit);
  }, [state.page, state.limit]);

  return (
    <div>
      {state.loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="filters">
            <select
              value={state.filter.type || ''}
              onChange={(e) => {
                setState(prev => ({
                  ...prev,
                  filter: { ...prev.filter, type: e.target.value as ToolType }
                }));
              }}
            >
              <option value="">All Types</option>
              <option value="mcp">MCP</option>
              <option value="builtin">Built-in</option>
            </select>

            <select
              value={state.filter.category || ''}
              onChange={(e) => {
                setState(prev => ({
                  ...prev,
                  filter: { ...prev.filter, category: e.target.value as ToolCategory }
                }));
              }}
            >
              <option value="">All Categories</option>
              <option value="productivity">Productivity</option>
              <option value="data">Data</option>
              <option value="system">System</option>
              <option value="communication">Communication</option>
            </select>
          </div>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Category</th>
                <th>Status</th>
                <th>Scope</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.tools.map(tool => (
                <tr key={tool._id}>
                  <td>
                    <div>
                      <strong>{tool.name}</strong>
                      <div className="description">{tool.description}</div>
                    </div>
                  </td>
                  <td>
                    <TypeBadge type={tool.type} />
                  </td>
                  <td>
                    <CategoryBadge category={tool.category} />
                  </td>
                  <td>
                    <StatusBadge status={tool.status} />
                  </td>
                  <td>
                    <ScopeBadge scope={tool.scope} />
                  </td>
                  <td>
                    <button onClick={() => viewTool(tool._id)}>View</button>
                    <button onClick={() => editTool(tool._id)}>Edit</button>
                    <button onClick={() => deleteTool(tool._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            current={state.page}
            total={state.total}
            pageSize={state.limit}
            onChange={(page) => loadTools(page, state.limit)}
          />
        </>
      )}
    </div>
  );
};
```

### Tool Detail Component

```typescript
const ToolDetail: React.FC<{ toolId: string }> = ({ toolId }) => {
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTool = async () => {
    try {
      const data = await getToolById(toolId);
      setTool(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load tool:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTool();
  }, [toolId]);

  if (loading) return <div>Loading...</div>;
  if (!tool) return <div>Tool not found</div>;

  return (
    <div>
      <h1>{tool.name}</h1>

      <div className="badges">
        <TypeBadge type={tool.type} />
        <CategoryBadge category={tool.category} />
        <StatusBadge status={tool.status} />
        <ScopeBadge scope={tool.scope} />
      </div>

      <div className="description">
        <h2>Description</h2>
        <p>{tool.description}</p>
      </div>

      {tool.type === 'mcp' && (
        <div className="mcp-info">
          <h2>MCP Configuration</h2>
          <table>
            <tbody>
              <tr>
                <td>Transport:</td>
                <td>{tool.transport}</td>
              </tr>
              <tr>
                <td>Endpoint:</td>
                <td>{tool.endpoint}</td>
              </tr>
              <tr>
                <td>Docker Image:</td>
                <td>{tool.dockerImage}</td>
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
                  <td>{tool.healthEndpoint}</td>
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
            <div className="environment">
              <h3>Environment Variables</h3>
              <pre>{JSON.stringify(tool.environment, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      <div className="schema">
        <h2>Schema</h2>

        <div className="input-schema">
          <h3>Input Schema</h3>
          <pre>{JSON.stringify(tool.schema.inputSchema, null, 2)}</pre>
        </div>

        <div className="output-schema">
          <h3>Output Schema</h3>
          <pre>{JSON.stringify(tool.schema.outputSchema, null, 2)}</pre>
        </div>
      </div>

      <div className="metadata">
        <h2>Metadata</h2>
        <p>Created: {new Date(tool.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(tool.updatedAt).toLocaleString()}</p>
        <p>Created By: {tool.createdBy}</p>
        {tool.updatedBy && <p>Updated By: {tool.updatedBy}</p>}
      </div>

      <div className="actions">
        <button onClick={() => editTool(toolId)}>Edit Tool</button>
        <button onClick={() => duplicateTool(toolId)}>Duplicate</button>
        {tool.status === 'active' ? (
          <button onClick={() => updateTool(toolId, { status: 'inactive' })}>
            Deactivate
          </button>
        ) : (
          <button onClick={() => updateTool(toolId, { status: 'active' })}>
            Activate
          </button>
        )}
        <button onClick={() => deleteTool(toolId)} className="danger">
          Delete Tool
        </button>
      </div>
    </div>
  );
};
```

### Badge Components

```typescript
const TypeBadge: React.FC<{ type: ToolType }> = ({ type }) => {
  const config = {
    mcp: { color: 'blue', icon: '🐳', text: 'MCP' },
    builtin: { color: 'green', icon: '⚙️', text: 'Built-in' }
  };

  const badge = config[type];

  return (
    <span className={`badge badge-${badge.color}`}>
      {badge.icon} {badge.text}
    </span>
  );
};

const CategoryBadge: React.FC<{ category: ToolCategory }> = ({ category }) => {
  const config = {
    productivity: { color: 'purple', icon: '📊' },
    data: { color: 'cyan', icon: '📁' },
    system: { color: 'gray', icon: '⚙️' },
    communication: { color: 'orange', icon: '💬' }
  };

  const badge = config[category];

  return (
    <span className={`badge badge-${badge.color}`}>
      {badge.icon} {category}
    </span>
  );
};

const StatusBadge: React.FC<{ status: ToolStatus }> = ({ status }) => {
  const config = {
    active: { color: 'green', icon: '✓', text: 'Active' },
    inactive: { color: 'gray', icon: '○', text: 'Inactive' },
    error: { color: 'red', icon: '✗', text: 'Error' }
  };

  const badge = config[status];

  return (
    <span className={`badge badge-${badge.color}`}>
      {badge.icon} {badge.text}
    </span>
  );
};

const ScopeBadge: React.FC<{ scope: ToolScope }> = ({ scope }) => {
  const config = {
    public: { color: 'blue', icon: '🌍', text: 'Public' },
    org: { color: 'orange', icon: '🏢', text: 'Organization' },
    private: { color: 'red', icon: '🔒', text: 'Private' }
  };

  const badge = config[scope];

  return (
    <span className={`badge badge-${badge.color}`}>
      {badge.icon} {badge.text}
    </span>
  );
};
```

---

## TypeScript Definitions

```typescript
// types/tool.ts

export enum ToolType {
  MCP = 'mcp',
  BUILTIN = 'builtin'
}

export enum ToolCategory {
  PRODUCTIVITY = 'productivity',
  DATA = 'data',
  SYSTEM = 'system',
  COMMUNICATION = 'communication'
}

export enum ToolStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error'
}

export enum ToolScope {
  PUBLIC = 'public',
  ORG = 'org',
  PRIVATE = 'private'
}

export interface ToolSchemaDto {
  inputSchema: object;
  outputSchema: object;
}

export interface Tool {
  _id: string;
  name: string;
  type: ToolType;
  description: string;
  category: ToolCategory;

  // MCP-specific
  transport?: 'sse' | 'http';
  endpoint?: string;
  dockerImage?: string;
  containerId?: string;
  port?: number;
  environment?: Record<string, string>;
  healthEndpoint?: string;
  lastHealthCheck?: Date;

  // Common
  status: ToolStatus;
  schema: ToolSchemaDto;
  scope: ToolScope;

  // BaseSchema
  owner: {
    orgId?: string;
    groupId?: string;
    agentId?: string;
    appId?: string;
  };
  createdBy: string;
  updatedBy?: string;
  deletedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateToolDto {
  name: string;
  type: ToolType;
  description: string;
  category: ToolCategory;
  schema: ToolSchemaDto;
  status?: ToolStatus;
  scope?: ToolScope;

  // MCP-specific (required if type="mcp")
  transport?: 'sse' | 'http';
  endpoint?: string;
  dockerImage?: string;
  port?: number;
  environment?: Record<string, string>;
  healthEndpoint?: string;
}

export interface UpdateToolDto {
  name?: string;
  description?: string;
  category?: ToolCategory;
  endpoint?: string;
  port?: number;
  environment?: Record<string, string>;
  healthEndpoint?: string;
  schema?: ToolSchemaDto;
  status?: ToolStatus;
  scope?: ToolScope;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## Best Practices

### 1. Tool Type Selection

**Khi nào dùng MCP Tool:**
- Tool cần chạy độc lập trong container
- Tool cần scale riêng
- Tool có dependencies phức tạp
- Tool từ bên thứ 3

**Khi nào dùng Built-in Tool:**
- Tool đơn giản, không cần dependencies nặng
- Tool cần performance cao
- Tool tích hợp sâu với agent

### 2. Schema Design

```typescript
// Good: Specific, well-documented schema
const goodSchema = {
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query string",
        minLength: 1,
        maxLength: 500
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results to return",
        minimum: 1,
        maximum: 100,
        default: 10
      }
    },
    required: ["query"]
  },
  outputSchema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            url: { type: "string", format: "uri" },
            snippet: { type: "string" }
          },
          required: ["title", "url"]
        }
      },
      total: {
        type: "number",
        description: "Total number of results found"
      }
    },
    required: ["results", "total"]
  }
};

// Bad: Generic, unclear schema
const badSchema = {
  inputSchema: {
    type: "object",
    properties: {
      input: { type: "string" }
    }
  },
  outputSchema: {
    type: "object"
  }
};
```

### 3. Error Handling

```typescript
const handleToolError = (error: any) => {
  if (error.response) {
    const { statusCode, message } = error.response.data;

    switch (statusCode) {
      case 400:
        // Validation errors
        if (Array.isArray(message)) {
          alert('Validation errors:\n' + message.join('\n'));
        } else {
          alert(message);
        }
        break;
      case 401:
        window.location.href = '/login';
        break;
      case 403:
        alert('You do not have permission to perform this action');
        break;
      case 404:
        alert('Tool not found');
        break;
      default:
        alert('An error occurred: ' + message);
    }
  } else {
    alert('Cannot connect to server');
  }
};
```

### 4. Scope Management

```typescript
// Public tool: Ai cũng dùng được
const publicTool = {
  scope: 'public',
  // ... other fields
};

// Organization tool: Chỉ trong org
const orgTool = {
  scope: 'org',
  // ... other fields
};

// Private tool: Chỉ người tạo
const privateTool = {
  scope: 'private',
  // ... other fields
};
```

---

## Notes

1. **Authentication**: Tất cả API đều yêu cầu JWT token trong header `Authorization: Bearer <token>`

2. **Pagination**: Sử dụng query parameters `page` và `limit` cho endpoint list

3. **Validation**:
   - MCP tools bắt buộc có: `transport`, `endpoint`, `dockerImage`, `port`
   - Built-in tools không cần các field MCP-specific

4. **Schema**: Input/output schema sử dụng JSON Schema format standard

5. **Soft Delete**: DELETE endpoint chỉ soft delete (set `deletedAt`), không xóa vĩnh viễn

6. **Status Management**:
   - `active`: Tool đang hoạt động
   - `inactive`: Tool tạm dừng
   - `error`: Tool gặp lỗi (thường do container fail)

7. **Health Check**: Chỉ MCP tools có health check endpoint
