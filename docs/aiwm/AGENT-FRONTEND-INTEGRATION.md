# Agent API - Frontend Integration Guide

## Overview

AIWM Agent API cung cấp endpoints để quản lý AI agents (autonomous và managed) và lấy configuration cho client-side chat implementation.

**Base URL:** `https://api.x-or.cloud/dev/aiwm` hoặc `http://localhost:3003`

**Authentication:** Tất cả endpoints yêu cầu Bearer token (JWT) trong header `Authorization: Bearer <token>`

---

## Agent Types

### Autonomous Agent
- **Purpose:** Background agents chạy tự động, kết nối với Discord/Telegram
- **Characteristics:**
  - Có `secret` để authenticate khi connect
  - Chạy độc lập, không cần user interaction
  - Tự động xử lý messages từ chat platform
  - Sử dụng MCP tools builtin

### Managed Agent
- **Purpose:** User-controlled agents cho chat UI
- **Characteristics:**
  - **KHÔNG có** `secret` (user không connect trực tiếp)
  - Cần `deploymentId` link tới LLM deployment
  - Frontend gọi LLM trực tiếp (không qua server)
  - Client-side execution với Vercel AI SDK
  - Sử dụng MCP tools qua HTTP transport

---

## Entities Reference

### Agent Entity

```typescript
{
  _id: string;                    // MongoDB ObjectId
  name: string;                   // Tên agent
  description: string;            // Mô tả chức năng
  status: 'active' | 'inactive' | 'busy' | 'suspended';
  type: 'managed' | 'autonomous'; // IMMUTABLE - không thay đổi sau khi tạo

  // References
  instructionId?: string;         // Link to Instruction document
  guardrailId?: string;           // Link to Guardrail document
  deploymentId?: string;          // Link to Deployment (REQUIRED for managed agents)
  nodeId: string;                 // Link to Node (infrastructure)

  // RBAC
  role: 'organization.owner' | 'organization.editor' | 'organization.viewer';
  // Default: 'organization.viewer'
  // Determines agent's permissions for MCP tools

  // Metadata
  tags: string[];                 // For categorization/filtering
  allowedToolIds: string[];       // Whitelist of tool IDs (empty = all tools allowed)

  // Runtime configuration (flat structure with prefixes)
  settings: {
    // For autonomous agents
    auth_roles?: string[];        // DEPRECATED - use `role` field instead
    claude_model?: string;        // e.g., 'claude-3-5-sonnet-latest'
    claude_maxTurns?: number;     // Default: 100
    claude_permissionMode?: string;
    discord_token?: string;
    discord_channelIds?: string[];
    discord_botId?: string;
    telegram_token?: string;
    telegram_groupIds?: string[];
    // ... extensible for future platforms
  };

  // Connection tracking (autonomous only)
  lastConnectedAt?: Date;
  lastHeartbeatAt?: Date;
  connectionCount: number;

  // BaseSchema fields
  owner: { orgId: string };
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Deployment Entity (Referenced by managed agents)

```typescript
{
  _id: string;
  name: string;
  modelId: string;                // Link to Model document
  status: 'running' | 'stopped' | 'failed' | ...;
  // ... other deployment fields
}
```

### Model Entity (Contains provider info)

```typescript
{
  _id: string;
  name: string;
  type: 'llm' | 'vision' | 'embedding' | 'voice';
  deploymentType: 'api-based' | 'self-hosted';

  // For api-based models (used by managed agents)
  provider?: 'anthropic' | 'openai' | 'google' | 'azure' | 'cohere';
  apiEndpoint?: string;           // e.g., "https://api.anthropic.com/v1/messages"
  modelIdentifier?: string;       // e.g., "claude-3-5-sonnet-20241022", "gpt-4-turbo"
  apiConfig?: {
    apiKey: string;               // API key for provider
    // ... other provider-specific config
  };
}
```

---

## API Endpoints

### 1. List Agents

**Endpoint:** `GET /agents`

**Purpose:** Lấy danh sách agents với pagination và filtering

**Query Parameters:**
- `page` (number, default: 1) - Trang hiện tại
- `limit` (number, default: 10) - Số items per page
- `search` (string, optional) - Tìm kiếm theo name/description
- `filter[status]` (string, optional) - Filter by status: `active`, `inactive`, `busy`, `suspended`
- `filter[type]` (string, optional) - Filter by type: `managed`, `autonomous`
- `sort` (string, optional) - Sort field, prefix `-` for descending (e.g., `-createdAt`, `name`)
- `populate` (string, optional) - Set to `instruction` để include instruction details

**Response:**
```typescript
{
  data: Agent[];                  // Array of agent objects
  pagination: {
    total: number;                // Total number of agents
    page: number;                 // Current page
    limit: number;                // Items per page
    totalPages: number;           // Total pages
  };
  statistics?: {                  // Agent count by status
    active: number;
    inactive: number;
    busy: number;
    suspended: number;
  };
}
```

**Use Cases:**
- Agent management dashboard
- Agent selector dropdown
- Monitoring agent status

---

### 2. Create Managed Agent

**Endpoint:** `POST /agents`

**Purpose:** Tạo managed agent cho chat UI

**Required Fields:**
```typescript
{
  name: string;                   // Tên agent (max 100 chars)
  description: string;            // Mô tả chức năng
  type: 'managed';                // MUST be 'managed'
  deploymentId: string;           // REQUIRED - Link to LLM deployment
  instructionId?: string;         // Optional - System prompt
  role?: string;                  // Optional - Default: 'organization.viewer'
  nodeId: string;                 // Infrastructure node ID
  tags?: string[];                // Optional - For categorization
  allowedToolIds?: string[];      // Optional - Tool whitelist (empty = all allowed)
  settings?: Record<string, any>; // Optional - Custom config
}
```

**KHÔNG cần fields:**
- ❌ `secret` - Managed agents không dùng secret authentication
- ❌ `status` - Auto-set to 'active'
- ❌ `lastConnectedAt`, `connectionCount` - Không relevant cho managed agents

**Response:** Agent object (201 Created)

**Validation:**
- `deploymentId` MUST point to valid Deployment với `status: 'running'`
- Deployment's Model MUST have `deploymentType: 'api-based'`
- `role` MUST be one of: `organization.owner`, `organization.editor`, `organization.viewer`

**Use Case:**
User tạo chatbot mới → Frontend call POST /agents → Nhận agent ID → Dùng để call /agents/:id/connect

---

### 3. Create Autonomous Agent

**Endpoint:** `POST /agents`

**Purpose:** Tạo autonomous agent cho Discord/Telegram bot

**Required Fields:**
```typescript
{
  name: string;
  description: string;
  type: 'autonomous';             // MUST be 'autonomous'
  secret: string;                 // REQUIRED - Plain text secret (will be hashed)
  instructionId?: string;         // Optional - System prompt
  role?: string;                  // Optional - Default: 'organization.viewer'
  nodeId: string;                 // Infrastructure node
  tags?: string[];
  allowedToolIds?: string[];

  // Platform-specific settings
  settings: {
    claude_model?: string;        // e.g., 'claude-3-5-sonnet-latest'
    claude_maxTurns?: number;     // Default: 100
    discord_token?: string;       // Discord bot token
    discord_channelIds?: string[];
    discord_botId?: string;
    telegram_token?: string;
    telegram_groupIds?: string[];
    // ... other platform configs
  };
}
```

**KHÔNG cần field:**
- ❌ `deploymentId` - Autonomous agents không dùng deployment (dùng Claude Desktop SDK)

**Response:** Agent object với `secret` đã được hash (201 Created)

**Security:**
- `secret` sẽ được hash bằng bcrypt trước khi lưu
- Response KHÔNG trả về plaintext secret
- Save secret securely - sẽ cần cho agent authentication

**Use Case:**
Admin setup Discord bot → Create autonomous agent → Deploy agent với secret → Agent connect về server

---

### 4. Update Agent

**Endpoint:** `PUT /agents/:id`

**Purpose:** Cập nhật agent configuration và metadata

**Allowed Fields:**
```typescript
{
  name?: string;                  // Update name
  description?: string;           // Update description
  status?: string;                // Change status: active/inactive/busy/suspended
  instructionId?: string;         // Change instruction
  guardrailId?: string;           // Add/change guardrail
  deploymentId?: string;          // For managed: change LLM deployment
  role?: string;                  // Change RBAC role
  tags?: string[];                // Update tags
  allowedToolIds?: string[];      // Update tool whitelist
  settings?: Record<string, any>; // Update runtime config
}
```

**IMMUTABLE Fields (KHÔNG được thay đổi):**
- ❌ `type` - Agent type cannot be changed after creation
- ❌ `nodeId` - Infrastructure assignment is permanent
- ❌ `owner`, `createdBy`, `createdAt` - System-managed fields

**Response:** Updated Agent object (200 OK)

**Business Rules:**
- Managed agent: `deploymentId` có thể update sang deployment khác
- Autonomous agent: Không nên update `settings.discord_*` khi agent đang connect (status: active)
- Changing `status` to `suspended` sẽ disconnect active agent
- `role` update sẽ ảnh hưởng tới MCP tool permissions ngay lập tức

**Use Cases:**
- Switch managed agent to different LLM model
- Update autonomous agent's Discord channels
- Temporarily suspend misbehaving agent
- Upgrade agent's RBAC permissions

---

### 5. Delete Agent

**Endpoint:** `DELETE /agents/:id`

**Purpose:** Soft delete agent (set `deletedAt`)

**Response:**
```typescript
{
  message: "Agent deleted successfully"
}
```

**Behavior:**
- Soft delete: Agent vẫn tồn tại trong DB với `deletedAt` timestamp
- Deleted agents KHÔNG xuất hiện trong list/get queries
- Active connections sẽ bị terminate
- Có thể restore bằng cách unset `deletedAt` (admin operation)

---

### 6. Agent Connect (For Managed Agents)

**Endpoint:** `POST /agents/:id/connect`

**Purpose:** Lấy complete configuration cho client-side chat implementation với Vercel AI SDK

**Authentication:** Public endpoint (KHÔNG cần Bearer token)

**Request Body:**
```typescript
{
  secret: string;   // Agent secret (for autonomous) or empty string (for managed)
}
```

**Response for Managed Agent:**
```typescript
{
  // JWT Token
  accessToken: string;            // JWT token containing agent identity & roles
  expiresIn: number;              // Token expiration (seconds) - typically 86400 (24h)
  refreshToken: null;             // Not implemented for agents
  refreshExpiresIn: 0;
  tokenType: "bearer";

  // MCP Tools Configuration
  mcpServers: {
    "Builtin": {
      type: "http";
      url: string;                // MCP HTTP endpoint (e.g., http://localhost:3306)
      headers: {
        Authorization: string;    // "Bearer <accessToken>"
      };
    };
  };

  // System Prompt
  instruction: string;            // Merged instruction text for agent

  // Runtime Settings
  settings: Record<string, any>;  // Agent's settings object

  // LLM Deployment Info (ONLY for managed agents)
  deployment: {
    id: string;                   // Deployment ID
    provider: string;             // 'anthropic' | 'openai' | 'google'
    model: string;                // Model identifier (e.g., 'claude-3-5-sonnet-20241022')
    apiEndpoint: string;          // Full API endpoint URL
  };
}
```

**Field Purposes:**

1. **accessToken** - Use for:
   - Authenticating MCP tool calls
   - Identifying agent in logs
   - RBAC permission checks

2. **mcpServers** - MCP tool server configuration:
   - `url`: Endpoint to call MCP tools
   - `headers.Authorization`: Include in every MCP request
   - Frontend calls MCP tools via HTTP POST with JSON-RPC format

3. **instruction** - System prompt:
   - Pass to LLM as `system` message
   - Contains agent's behavioral instructions
   - Pre-merged from Instruction document

4. **deployment** - LLM configuration:
   - `provider`: Which SDK to use (@anthropic-ai/sdk, openai, @ai-sdk/google)
   - `model`: Model name to request
   - `apiEndpoint`: API base URL (usually provider default)

**JWT Token Payload (Decoded):**
```typescript
{
  sub: string;                    // Agent ID
  username: string;               // "agent:<agentId>"
  status: string;                 // Agent status
  roles: string[];                // [agent.role] - e.g., ['organization.owner']
  orgId: string;                  // Organization ID
  agentId: string;                // Same as sub
  type: "agent";                  // Token type marker
  iat: number;                    // Issued at (timestamp)
  exp: number;                    // Expiration (timestamp)
}
```

**Roles in Token:**
- Used by MCP server for RBAC checks
- Each MCP tool has required roles
- Agent can only use tools if `token.roles` satisfies tool's requirements

**Error Responses:**
- `401 Unauthorized` - Invalid secret or agent suspended
- `404 Not Found` - Agent not found
- `400 Bad Request` - Managed agent called with secret (not needed)

---

## Integration Flow: Managed Agent Chat

### Setup Flow

1. **Create Managed Agent**
   ```
   POST /agents
   {
     name: "Finance Assistant",
     type: "managed",
     deploymentId: "507f...",  // Points to Claude deployment
     instructionId: "608f...",  // Finance domain instructions
     role: "organization.owner"
   }
   ```

2. **Get Agent Config**
   ```
   POST /agents/{agentId}/connect
   { secret: "" }  // Empty for managed

   → Response contains:
     - deployment.provider = "anthropic"
     - deployment.model = "claude-3-5-sonnet-20241022"
     - deployment.apiEndpoint = "https://api.anthropic.com/v1/messages"
     - instruction = "You are a finance assistant..."
     - mcpServers.Builtin.url = "http://localhost:3306"
     - accessToken = "eyJhbG..."
   ```

3. **Frontend Implementation with Vercel AI SDK**

   Frontend sử dụng response data để:

   a. **Initialize LLM Client**
   - Use `deployment.provider` to select SDK
   - Configure with `deployment.model` và `deployment.apiEndpoint`

   b. **Setup System Prompt**
   - Pass `instruction` as system message

   c. **Configure MCP Tools**
   - Call `mcpServers.Builtin.url` để list available tools
   - Include `accessToken` trong Authorization header
   - Map MCP tools to Vercel AI SDK tool format

   d. **Tool Execution**
   - When LLM requests tool use
   - Frontend calls MCP endpoint với tool name + arguments
   - Include `accessToken` for authentication
   - Return tool result to LLM

### MCP Tool Call Format

**List Tools:**
```
POST {mcpServers.Builtin.url}
Headers: { Authorization: "Bearer {accessToken}" }
Body: {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {}
}

→ Response: Array of available tools with schemas
```

**Call Tool:**
```
POST {mcpServers.Builtin.url}
Headers: { Authorization: "Bearer {accessToken}" }
Body: {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: {
    name: "cbm_documents_list",
    arguments: {
      search: "finance",
      page: 1,
      limit: 10
    }
  }
}

→ Response: Tool execution result
```

---

## Best Practices

### For Managed Agents

1. **Deployment Selection**
   - Choose deployment based on:
     - Provider preference (Anthropic, OpenAI, Google)
     - Model capabilities (context window, tool calling support)
     - Cost considerations
   - Ensure deployment status is `running` before linking

2. **Instruction Design**
   - Keep instructions clear and specific
   - Include tool usage guidelines
   - Define agent's role and boundaries
   - Example domains: finance, customer support, code review

3. **Role Assignment**
   - Start with `organization.viewer` for limited access
   - Grant `organization.editor` for write operations
   - Reserve `organization.owner` for administrative agents

4. **Tool Whitelisting**
   - Leave `allowedToolIds` empty for full access
   - Restrict to specific tools for focused agents
   - Update whitelist as agent capabilities evolve

### For Autonomous Agents

1. **Secret Management**
   - Generate strong, unique secrets (min 32 chars)
   - Store plaintext secret securely (needed for agent deployment)
   - Never expose secret in logs or UI

2. **Platform Configuration**
   - Set appropriate `claude_maxTurns` to limit conversation length
   - Configure platform tokens (Discord/Telegram) in `settings`
   - Test platform integration before activating

3. **Monitoring**
   - Track `lastHeartbeatAt` for health monitoring
   - Monitor `connectionCount` for usage patterns
   - Alert on status changes to `suspended` or connection drops

---

## Common Scenarios

### Scenario 1: Create Chat UI for Document Assistant

1. Create managed agent with `deploymentId` pointing to Claude deployment
2. Set `instructionId` with document assistant instructions
3. Set `role: "organization.viewer"` for read-only access
4. Frontend calls `/connect` to get config
5. Use Vercel AI SDK to setup chat with:
   - Claude API client (from deployment info)
   - System prompt (from instruction)
   - MCP tools for document access (from mcpServers)

### Scenario 2: Deploy Discord Bot

1. Create autonomous agent with Discord settings
2. Include `discord_token`, `discord_channelIds`, `discord_botId` in settings
3. Agent connects using secret authentication
4. Backend handles Discord webhook → Agent processing → Tool calls → Response

### Scenario 3: Switch Agent to Different LLM

1. User wants to switch from Claude to GPT-4
2. Create new Deployment with OpenAI model
3. Update managed agent: `PUT /agents/:id` with new `deploymentId`
4. Frontend re-connects to get updated deployment config
5. Chat UI now uses OpenAI client instead of Anthropic

### Scenario 4: Temporarily Disable Agent

1. Update agent status: `PUT /agents/:id` with `status: "suspended"`
2. Active connections terminated
3. New connection attempts rejected with 401
4. Re-enable: Update status back to `active`

---

## Error Handling

### Common Error Codes

- `400 Bad Request` - Invalid input, validation failed
- `401 Unauthorized` - Missing/invalid token, invalid secret, agent suspended
- `403 Forbidden` - Insufficient permissions (RBAC)
- `404 Not Found` - Agent/deployment not found
- `409 Conflict` - Type change attempted, constraint violation
- `500 Internal Server Error` - Server-side error

### Validation Errors

Response format:
```typescript
{
  statusCode: 400,
  message: string | string[],  // Error description(s)
  error: "Bad Request"
}
```

### Business Logic Errors

Examples:
- "Only autonomous agents can connect via this endpoint"
- "Agent is suspended"
- "Deployment not found or not running"
- "Cannot change agent type after creation"

---

## Security Considerations

### Authentication

- **User operations** (list, create, update, delete): Require JWT token với valid org roles
- **Agent connect**: Public endpoint but requires agent secret (autonomous) or agent existence (managed)

### Authorization (RBAC)

Agent's `role` field controls MCP tool access:
- `organization.viewer` - Read-only tools
- `organization.editor` - Read + write tools
- `organization.owner` - Full access including admin tools

### API Key Security

- Model API keys stored in Model.apiConfig (encrypted at rest)
- NEVER exposed in API responses
- Frontend NEVER sees provider API keys
- Backend handles API key injection for managed agents (future: proxy mode)

### Token Lifecycle

- Agent JWT tokens expire after 24 hours
- Frontend should handle token refresh (re-call /connect)
- Suspended agents' tokens immediately invalid

---

## Performance Notes

### Pagination

- Default `limit: 10` items per page
- Maximum `limit: 100` enforced


## Version History

- **v1.0** (Current) - Initial release
  - Support managed and autonomous agents
  - Deployment integration for managed agents
  - Role-based MCP tool access
  - Connect endpoint for frontend integration
