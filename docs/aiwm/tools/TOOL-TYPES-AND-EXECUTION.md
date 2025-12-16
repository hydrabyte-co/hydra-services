# Tool Types and Execution Models - AIWM

## Overview

AIWM supports **4 types of tools** with different execution models:

1. **Builtin Tools** - Pre-packaged in agent container
2. **MCP Tools** - External MCP servers (SSE/HTTP protocol)
3. **API Tools** - Internal HTTP APIs (CBM services) via AIWM proxy
4. **Custom Tools** - User-defined functions in agent code

---

## Tool Type Comparison

| Type | Example | Execution Location | Deployment | Use Case |
|------|---------|-------------------|------------|----------|
| `builtin` | Read, Write, Bash | Agent container | Pre-packaged | Standard Claude Code SDK tools |
| `mcp` | WebSearch, Database | External MCP server | Docker container | Third-party MCP tools |
| `api` | CBM Document, Work, Project | AIWM proxy → CBM service | Internal service | Internal business APIs |
| `custom` | Custom business logic | Agent code | User implements | Agent-specific functions |

---

## 1. Builtin Tools

### Characteristics:
- Pre-packaged in Claude Code SDK
- No external calls needed
- Fast execution (local)
- Standard tools like Read, Write, Bash, Grep, etc.

### Schema Example:
```json
{
  "name": "read-file",
  "type": "builtin",
  "description": "Read files from filesystem",
  "category": "productivity",
  "status": "active",
  "scope": "public",
  "schema": {
    "inputSchema": {
      "type": "object",
      "properties": {
        "file_path": { "type": "string" }
      }
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "content": { "type": "string" }
      }
    }
  }
}
```

### Agent Client Execution:
```typescript
// Agent client recognizes builtin tools
if (tool.type === 'builtin') {
  // Use Claude Code SDK's built-in tools
  // No external call needed
}
```

---

## 2. MCP Tools

### Characteristics:
- External MCP servers following Anthropic MCP protocol
- Deployed as Docker containers
- SSE or HTTP transport
- Examples: Web search, database connectors

### Schema Example:
```json
{
  "name": "web-search",
  "type": "mcp",
  "description": "Search the web using MCP protocol",
  "category": "productivity",
  "status": "active",
  "scope": "public",
  "transport": "sse",
  "endpoint": "http://mcp-web-search:3000/sse",
  "dockerImage": "aiops/mcp-web-search:latest",
  "port": 3000,
  "healthEndpoint": "/health",
  "schema": {
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": { "type": "string" }
      }
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "results": { "type": "array" }
      }
    }
  }
}
```

### Agent Client Execution:
```typescript
// Agent calls MCP server directly
if (tool.type === 'mcp') {
  const result = await mcpClient.callTool({
    endpoint: tool.endpoint,
    transport: tool.transport,
    input: toolInput
  });
}
```

---

## 3. API Tools (Recommended for CBM Services)

### Characteristics:
- Internal HTTP APIs (NestJS services)
- Calls proxied through AIWM for:
  - **Authentication**: AIWM validates agent JWT
  - **Authorization**: AIWM checks permissions
  - **Monitoring**: Centralized logging and metrics
  - **Rate limiting**: Control API usage
- Agent doesn't need direct access to CBM

### Schema Example:
```json
{
  "name": "cbm-create-project",
  "type": "api",
  "description": "Create a new project in CBM",
  "category": "data",
  "status": "active",
  "scope": "org",
  "endpoint": "/tools/cbm-create-project/execute",
  "execution": {
    "method": "POST",
    "baseUrl": "http://cbm:3001",
    "path": "/projects",
    "authRequired": true,
    "timeout": 5000,
    "headers": {
      "Content-Type": "application/json"
    }
  },
  "schema": {
    "inputSchema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" }
      },
      "required": ["name"]
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "_id": { "type": "string" },
        "name": { "type": "string" },
        "status": { "type": "string" }
      }
    }
  }
}
```

### Execution Flow:

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Agent     │         │    AIWM      │         │     CBM     │
│   Client    │         │ Tool Proxy   │         │   Service   │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │ 1. Call API tool      │                        │
       │ (with agent JWT)      │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │                       │ 2. Validate agent JWT  │
       │                       │    Check permissions   │
       │                       │                        │
       │                       │ 3. Forward to CBM      │
       │                       │    (with user context) │
       │                       ├───────────────────────>│
       │                       │                        │
       │                       │ 4. Execute API         │
       │                       │    (create project)    │
       │                       │                        │
       │                       │ 5. Return result       │
       │                       │<───────────────────────┤
       │                       │                        │
       │ 6. Return to agent    │                        │
       │<──────────────────────┤                        │
       │                       │                        │
```

### AIWM Tool Proxy Implementation:

```typescript
// services/aiwm/src/modules/tool/tool-executor.service.ts
@Injectable()
export class ToolExecutorService {
  async executeApiTool(
    tool: Tool,
    input: any,
    agentContext: { agentId: string; userId: string; orgId: string }
  ): Promise<any> {
    // Validate tool type
    if (tool.type !== 'api') {
      throw new BadRequestException('Tool is not an API tool');
    }

    // Build request URL
    const url = `${tool.execution.baseUrl}${tool.execution.path}`;

    // Prepare headers
    const headers: Record<string, string> = {
      ...tool.execution.headers,
    };

    // Add auth if required
    if (tool.execution.authRequired) {
      // Generate temporary JWT for user context
      const userToken = await this.generateUserToken(agentContext);
      headers['Authorization'] = `Bearer ${userToken}`;
    }

    // Call CBM API
    try {
      const response = await axios({
        method: tool.execution.method || 'POST',
        url,
        headers,
        data: input,
        timeout: tool.execution.timeout || 5000,
      });

      // Log execution
      await this.logToolExecution({
        toolId: tool._id,
        agentId: agentContext.agentId,
        userId: agentContext.userId,
        input,
        output: response.data,
        status: 'success',
        duration: response.config.timeout,
      });

      return response.data;
    } catch (error) {
      // Log error
      await this.logToolExecution({
        toolId: tool._id,
        agentId: agentContext.agentId,
        userId: agentContext.userId,
        input,
        error: error.message,
        status: 'error',
      });

      throw new InternalServerErrorException(
        `Tool execution failed: ${error.message}`
      );
    }
  }
}
```

### Agent Client Execution:

```typescript
// Agent calls AIWM proxy endpoint
if (tool.type === 'api') {
  const result = await axios.post(
    `${AIWM_BASE_URL}${tool.endpoint}`, // /tools/:toolId/execute
    toolInput,
    {
      headers: {
        Authorization: `Bearer ${agentJWT}`
      }
    }
  );
}
```

---

## 4. Custom Tools

### Characteristics:
- User-defined functions in agent code
- Agent implements the logic
- Flexible for agent-specific needs

### Schema Example:
```json
{
  "name": "format-currency",
  "type": "custom",
  "description": "Format number as Vietnamese currency",
  "category": "productivity",
  "status": "active",
  "scope": "private",
  "schema": {
    "inputSchema": {
      "type": "object",
      "properties": {
        "amount": { "type": "number" }
      }
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "formatted": { "type": "string" }
      }
    }
  }
}
```

### Agent Client Execution:
```typescript
// Agent implements custom logic
if (tool.type === 'custom') {
  // Call agent's custom function
  const result = await customTools[tool.name](toolInput);
}
```

---

## Recommended Approach for CBM Services

### ✅ Use `type: 'api'` for CBM tools because:

1. **Security**: AIWM validates agent credentials before forwarding
2. **Authorization**: AIWM can check org/user permissions
3. **Monitoring**: Centralized logging of all CBM API calls
4. **Rate Limiting**: Control API usage per agent
5. **Versioning**: Easy to update CBM API without agent changes
6. **Error Handling**: Standardized error responses
7. **Loose Coupling**: Agent doesn't need CBM endpoint/credentials

### Example CBM Tools to Create:

```bash
# 1. CBM Document Tools
POST /tools
{
  "name": "cbm-create-document",
  "type": "api",
  "description": "Create a new document in CBM",
  "category": "data",
  "execution": {
    "method": "POST",
    "baseUrl": "http://cbm:3001",
    "path": "/documents",
    "authRequired": true
  },
  "schema": {...}
}

# 2. CBM Work Tools
POST /tools
{
  "name": "cbm-create-work",
  "type": "api",
  "description": "Create a new work item in CBM",
  "category": "data",
  "execution": {
    "method": "POST",
    "baseUrl": "http://cbm:3001",
    "path": "/works",
    "authRequired": true
  },
  "schema": {...}
}

# 3. CBM Project Tools
POST /tools
{
  "name": "cbm-list-projects",
  "type": "api",
  "description": "List all projects in CBM",
  "category": "data",
  "execution": {
    "method": "GET",
    "baseUrl": "http://cbm:3001",
    "path": "/projects",
    "authRequired": true
  },
  "schema": {...}
}
```

---

## Implementation Roadmap

### Phase 1: Schema Updates (✅ Done)
- [x] Add `type: 'api'` to tool schema
- [x] Add `execution` field for API configuration
- [x] Update tool DTOs

### Phase 2: Tool Proxy Service (Next)
- [ ] Create `ToolExecutorService` in AIWM
- [ ] Implement `POST /tools/:toolId/execute` endpoint
- [ ] Add authentication validation
- [ ] Add logging and monitoring
- [ ] Add rate limiting

### Phase 3: CBM Tool Registration
- [ ] Create seed script for CBM tools
- [ ] Register all CBM endpoints as API tools
- [ ] Document tool schemas
- [ ] Add examples for each tool

### Phase 4: Agent Client Integration
- [ ] Update agent client to recognize `api` type
- [ ] Implement tool execution logic
- [ ] Add error handling
- [ ] Add retry logic

---

## Migration Path

### From Direct API Calls → API Tools

**Before (Direct):**
```typescript
// Agent directly calls CBM
const project = await axios.post('http://cbm:3001/projects', data);
```

**After (API Tools):**
```typescript
// Agent calls via AIWM proxy
const tool = tools.find(t => t.name === 'cbm-create-project');
const project = await executeApiTool(tool, data);
```

**Benefits:**
- ✅ Centralized auth/authz
- ✅ Monitoring and logging
- ✅ Rate limiting
- ✅ Easy to update CBM endpoints

---

## Summary

| Aspect | Builtin | MCP | API (CBM) | Custom |
|--------|---------|-----|-----------|--------|
| **Deployment** | Pre-packaged | Docker | Internal service | Agent code |
| **Protocol** | N/A | MCP SSE/HTTP | HTTP REST | N/A |
| **Auth** | N/A | API key | Agent JWT | N/A |
| **Monitoring** | Agent logs | MCP logs | AIWM proxy logs | Agent logs |
| **Use Case** | Standard tools | External tools | Internal APIs | Agent-specific |
| **Example** | Read, Write | WebSearch | CBM services | format-currency |

**Recommendation for CBM**: Use `type: 'api'` with AIWM proxy for security, monitoring, and loose coupling.
