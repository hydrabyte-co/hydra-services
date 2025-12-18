# MCP Built-in Tools - Implementation Summary

## Overview

Built-in MCP tools provide pre-integrated functionality for AI agents to interact with Hydra services (CBM, IAM, AIWM) without requiring external MCP servers or API configurations.

**Implementation Date**: 2025-01-XX
**Status**: ✅ Complete (DocumentManagement)
**Location**: `services/aiwm/src/mcp/`

---

## Architecture

### High-Level Design

```
┌─────────────────┐
│  AI Agent with  │
│  Agent Token    │
└────────┬────────┘
         │
         │ Connect with JWT
         ▼
┌─────────────────────────────────┐
│   MCP Server (port 3306)        │
│   bootstrap-mcp.ts              │
│                                 │
│  1. Validate agent token        │
│  2. Load agent's allowedToolIds │
│  3. Filter tools (type=builtin) │
│  4. Register with MCP SDK       │
└────────┬───────────────────┬────┘
         │                   │
         │ builtin tool      │ api/mcp/custom tools
         ▼                   ▼
┌──────────────────┐   ┌─────────────────┐
│  Built-in Tools  │   │  Dynamic Tools  │
│  Registry        │   │  from Database  │
│                  │   │                 │
│  - Document Mgmt │   │  - API tools    │
│  - Project Mgmt  │   │  - MCP tools    │
│  - Work Mgmt     │   │  - Custom tools │
└────────┬─────────┘   └─────────────────┘
         │
         │ HTTP calls with JWT
         ▼
┌─────────────────────────────────┐
│   Target Services               │
│   - CBM (Documents, Projects)   │
│   - IAM (Users, Orgs)           │
│   - AIWM (Agents, Models)       │
└─────────────────────────────────┘
```

### Code Organization

```
services/aiwm/src/mcp/
├── builtin/
│   ├── cbm/
│   │   ├── document-management/
│   │   │   ├── tools.ts           # 7 DocumentManagement tools
│   │   │   ├── schemas.ts         # Zod validation schemas
│   │   │   ├── executors.ts       # Execution logic (API calls)
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts                   # BuiltInTools registry
├── types.ts                       # Common types
├── utils.ts                       # Helper functions
└── README.md
```

---

## Implemented Tools

### DocumentManagement (7 tools)

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `CreateDocument` | POST | `/documents` | Create new document |
| `ListDocuments` | GET | `/documents` | List with pagination/filters |
| `GetDocument` | GET | `/documents/:id` | Get by ID |
| `GetDocumentContent` | GET | `/documents/:id/content` | Get content only |
| `UpdateDocument` | PATCH | `/documents/:id` | Update metadata |
| `UpdateDocumentContent` | PATCH | `/documents/:id/content` | Update content |
| `DeleteDocument` | DELETE | `/documents/:id` | Soft delete |

**Features**:
- Full CRUD operations
- Advanced content operations (replace, find-replace, append)
- Search and filtering
- Pagination support
- Zod validation for all inputs

---

## How to Enable for an Agent

### Prerequisites
- AIWM service running on port 3003
- CBM service running on port 3001
- MCP server running on port 3306
- Valid admin token from IAM

### Step-by-Step

#### 1. Create Built-in Tool Record
```bash
curl -X POST http://localhost:3003/tools \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DocumentManagement",
    "description": "Built-in tool for managing documents in CBM service",
    "type": "builtin",
    "status": "active"
  }'
```

**Response**: `{ "_id": "67abc123...", ... }`

#### 2. Create Agent with Tool
```bash
curl -X POST http://localhost:3003/agents \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DocumentManager Agent",
    "description": "Agent with DocumentManagement capability",
    "status": "active",
    "allowedToolIds": ["67abc123..."]
  }'
```

**Response**: `{ "_id": "67def456...", ... }`

#### 3. Generate Agent Token
```bash
curl -X POST http://localhost:3003/agents/67def456.../token \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 3600}'
```

**Response**: `{ "token": "eyJhbG...", ... }`

#### 4. Connect to MCP Server
```bash
# List available tools
curl -X POST http://localhost:3306 \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "CreateDocument",
        "description": "Create a new document...",
        "inputSchema": { ... }
      },
      // ... 6 more DocumentManagement tools
    ]
  }
}
```

#### 5. Call a Tool
```bash
curl -X POST http://localhost:3306 \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "CreateDocument",
      "arguments": {
        "summary": "My First Document",
        "content": "This is the content",
        "type": "markdown",
        "status": "draft"
      }
    }
  }'
```

---

## Testing

### Automated Test Script

```bash
./scripts/test-document-management-mcp.sh
```

**What it does**:
1. Login to get admin token
2. Create DocumentManagement tool
3. Create agent with the tool
4. Generate agent token
5. Call MCP server to list tools
6. Verify DocumentManagement tools are available

### Manual Testing with MCP Inspector

1. **Install MCP Inspector**:
```bash
npx @modelcontextprotocol/inspector
```

2. **Configure Direct Mode**:
   - URL: `http://localhost:3306`
   - Headers: `Authorization: Bearer $AGENT_TOKEN`

3. **Test Operations**:
   - List tools (`tools/list`)
   - Call `CreateDocument`
   - Call `ListDocuments`
   - Call `GetDocument`
   - etc.

---

## Key Implementation Details

### 1. Tool Registration Flow

```typescript
// In bootstrap-mcp.ts
const registerToolsForAgent = async (tokenPayload, bearerToken) => {
  // 1. Fetch agent
  const agent = await agentService.findById(agentId, context);

  // 2. Get allowedToolIds
  const toolIds = agent.allowedToolIds;

  // 3. Fetch tools from database (filter by toolIds)
  const tools = await toolService.findAll({ _id: { $in: toolIds } });

  // 4. For each tool with type='builtin':
  for (const tool of tools) {
    if (tool.type === 'builtin') {
      // Get builtin tool from registry
      const builtinTool = getBuiltInTool(tool.name);

      // Register with MCP server
      mcpServer.registerTool(
        tool.name,
        { description, inputSchema },
        async (args) => {
          return await builtinTool.executor(args, executionContext);
        }
      );
    }
  }
};
```

### 2. Execution Context

Every builtin tool receives an execution context:

```typescript
interface ExecutionContext {
  token: string;      // Bearer token from agent
  userId: string;     // User ID from token payload
  orgId: string;      // Organization ID
  agentId: string;    // Agent ID
  groupId?: string;   // Optional group ID
  roles?: string[];   // User roles
}
```

### 3. Service Communication

Built-in tools use the `makeServiceRequest` utility:

```typescript
const response = await makeServiceRequest(
  `${CBM_BASE_URL}/documents`,
  {
    method: 'POST',
    context: executionContext, // Adds Authorization header
    body: JSON.stringify(args),
  }
);
```

### 4. Error Handling

All executors wrap API calls in try-catch:

```typescript
try {
  const response = await makeServiceRequest(...);
  return formatToolResponse(response);
} catch (error) {
  return {
    content: [{ type: 'text', text: `Error: ${error.message}` }],
    isError: true,
  };
}
```

---

## Future Enhancements

### Planned Built-in Tools

1. **ProjectManagement** (CBM)
   - Create, list, get, update, delete projects
   - Activate, hold, resume, complete, archive

2. **WorkManagement** (CBM)
   - Create, list, get, update, delete works
   - Start, block, unblock, review, complete, cancel

3. **IAM Integration**
   - User CRUD operations
   - Organization management
   - Role assignments

4. **AIWM Operations**
   - Model management
   - Agent configuration
   - Deployment operations

### Improvements

- [ ] Add caching for tool registry
- [ ] Implement rate limiting per tool
- [ ] Add telemetry and logging
- [ ] Support batch operations
- [ ] Add tool execution history
- [ ] Implement tool versioning

---

## Security Considerations

1. **Authentication**: All tools require valid JWT token
2. **Authorization**: RBAC enforced at service level
3. **Token Propagation**: Agent token is passed to target services
4. **Audit Trail**: All operations logged in target services
5. **Validation**: Zod schemas validate inputs before execution

---

## Troubleshooting

### Tools Not Showing Up

**Problem**: Agent connects but no tools listed

**Solutions**:
1. Check tool type is `builtin` in database
2. Verify tool name matches registry (e.g., `DocumentManagement`)
3. Check agent's `allowedToolIds` includes the tool
4. Check tool status is `active`

### Tool Execution Fails

**Problem**: Tool call returns error

**Solutions**:
1. Check CBM service is running (`http://localhost:3001`)
2. Verify agent token is valid (not expired)
3. Check RBAC permissions in target service
4. Review service logs for details

### Build Errors

**Problem**: TypeScript compilation fails

**Solutions**:
```bash
# Clear cache
npx nx reset

# Rebuild
npx nx build aiwm

# Check types
npx tsc --noEmit -p services/aiwm/tsconfig.app.json
```

---

## References

- [MCP Built-in Tools README](../../services/aiwm/src/mcp/README.md)
- [CBM Document API](./API-DOCUMENT.md)
- [AIWM Tool Module](./API-TOOL.md)
- [MCP Protocol Spec](https://modelcontextprotocol.io/)
