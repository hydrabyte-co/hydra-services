# Agent Type Classification

## Overview

AIWM now supports two types of agents with different management models:

1. **Managed Agents** (`managed`) - Lightweight agents managed entirely by AIWM
2. **Autonomous Agents** (`autonomous`) - Self-deployed agents with Claude Code SDK

## Agent Types

### Managed Agent (`type: 'managed'`)

**Characteristics:**
- Lightweight agents with MCP tools
- Fully managed by AIWM platform
- No self-deployment required
- AIWM handles all execution and lifecycle
- No secret/credential management needed

**Use Cases:**
- Simple task automation
- MCP tool-based workflows
- Centrally managed agent fleets
- Quick agent deployment without infrastructure

**Configuration:**
```json
{
  "name": "Simple Task Agent",
  "type": "managed",
  "status": "active",
  "instructionId": "...",
  "nodeId": "...",
  "allowedToolIds": ["tool1", "tool2"]
}
```

**Limitations:**
- Cannot connect via `/agents/:id/connect` endpoint
- No credential regeneration (no `/credentials/regenerate`)
- No deployment scripts
- Cannot run autonomously outside AIWM

---

### Autonomous Agent (`type: 'autonomous'`)

**Characteristics:**
- Full-featured agents using Claude Code SDK
- Self-deployed on customer infrastructure
- Connects to AIWM for configuration
- Has secret-based authentication
- Receives instruction + tools via connection API

**Use Cases:**
- Complex multi-turn conversations
- Discord/Telegram bots
- Customer-deployed agents
- Advanced tool usage with Claude Code SDK
- Agents requiring custom runtime environment

**Configuration:**
```json
{
  "name": "Customer Support Bot",
  "type": "autonomous",
  "status": "active",
  "instructionId": "...",
  "nodeId": "...",
  "allowedToolIds": ["tool1", "tool2"],
  "settings": {
    "auth_roles": ["agent", "document.reader"],
    "claude_model": "claude-3-5-sonnet-latest",
    "claude_maxTurns": 100,
    "claude_permissionMode": "bypassPermissions",
    "claude_resume": true,
    "discord_token": "...",
    "discord_channelIds": ["..."]
  }
}
```

**Features:**
- Secret-based authentication (bcrypt hashed)
- JWT token generation (24h expiry)
- `.env` configuration generation
- Installation script generation
- Heartbeat monitoring
- Connection tracking

---

## Schema Changes

### Agent Schema

```typescript
@Schema({ timestamps: true })
export class Agent extends BaseSchema {
  // ... existing fields

  @Prop({
    type: String,
    enum: ['managed', 'autonomous'],
    default: 'managed'
  })
  type: string;

  // Authentication & Connection Management (only for autonomous agents)
  @Prop({ required: false, select: false })
  secret?: string; // Hashed secret (autonomous only)

  @Prop({ type: [String], ref: 'Tool', default: [] })
  allowedToolIds: string[];

  @Prop({ type: Object, default: {} })
  settings: Record<string, unknown>;

  // Connection tracking (autonomous only)
  @Prop()
  lastConnectedAt?: Date;

  @Prop()
  lastHeartbeatAt?: Date;

  @Prop({ default: 0 })
  connectionCount: number;
}
```

### Indexes

Added index for efficient filtering by type:
```typescript
AgentSchema.index({ type: 1 });
```

---

## Important: Type Changes Are NOT Allowed

⚠️ **You CANNOT change agent type after creation**

Once an agent is created with a specific type (`managed` or `autonomous`), the type field is **immutable**.

**Why?**
- **Data Integrity**: Switching types would require secret generation/deletion, causing connection issues
- **Deployment Conflicts**: Autonomous agents deployed on customer infrastructure cannot be migrated to managed
- **Complexity**: Too many edge cases and potential failures during migration
- **User Safety**: Prevents accidental breaking of running agents

**Attempting to change type will result in:**
```json
{
  "statusCode": 400,
  "message": "Cannot change agent type from 'managed' to 'autonomous'. Please delete and recreate the agent with the desired type."
}
```

**Recommendation:**
If you need to change agent type:
1. Create a new agent with the desired type
2. Migrate configuration (instruction, tools, settings)
3. Test the new agent
4. Delete the old agent

---

## API Changes

### 1. Create Agent

**Endpoint:** `POST /agents`

**Request Body:**
```json
{
  "name": "My Agent",
  "description": "...",
  "status": "active",
  "type": "autonomous",  // NEW: 'managed' (default) or 'autonomous'
  "instructionId": "...",
  "nodeId": "...",
  "allowedToolIds": ["..."],
  "settings": { ... }
}
```

**Behavior:**
- If `type: 'autonomous'`:
  - Secret is auto-generated and hashed (or use provided secret)
  - Agent can connect via connection API
- If `type: 'managed'` (default):
  - No secret generated
  - Cannot use connection/credentials APIs

---

### 2. Update Agent

**Endpoint:** `PUT /agents/:id`

**Request Body:**
```json
{
  "name": "Updated Name",
  "status": "inactive",
  "type": "autonomous"  // ❌ Will be REJECTED if different from current type
}
```

**Type Change Validation:**
- ✅ Same type or type not included: Update allowed
- ❌ Different type: Returns 400 Bad Request

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Cannot change agent type from 'managed' to 'autonomous'. Please delete and recreate the agent with the desired type."
}
```

---

### 3. Agent Connection (Autonomous Only)

**Endpoint:** `POST /agents/:id/connect`

**Request Body:**
```json
{
  "secret": "agent-secret-here"
}
```

**Response (IAM TokenData-compatible):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "refreshToken": null,
  "refreshExpiresIn": 0,
  "tokenType": "bearer",
  "mcpEndpoint": "http://localhost:3305/mcp",
  "instruction": "You are a customer support agent...",
  "tools": [...],
  "settings": {
    "auth_roles": ["agent"],
    "claude_model": "claude-3-5-sonnet-latest",
    ...
  }
}
```

**JWT Payload (decoded from accessToken):**
```json
{
  "sub": "agentId",
  "username": "agent:<agentId>",
  "status": "active",
  "roles": ["agent"],
  "orgId": "orgId",
  "groupId": "",
  "agentId": "agentId",
  "userId": "",
  "type": "agent",
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Validation:**
- ✅ Works for `type: 'autonomous'`
- ❌ Returns 400 for `type: 'managed'`

**Error Response for Managed Agents:**
```json
{
  "statusCode": 400,
  "message": "Only autonomous agents can connect via this endpoint"
}
```

---

### 3. Regenerate Credentials (Autonomous Only)

**Endpoint:** `POST /agents/:id/credentials/regenerate`

**Validation:**
- ✅ Works for `type: 'autonomous'`
- ❌ Returns 400 for `type: 'managed'`

**Error Response for Managed Agents:**
```json
{
  "statusCode": 400,
  "message": "Only autonomous agents have credentials to regenerate"
}
```

---

### 5. List Agents with Statistics

**Endpoint:** `GET /agents`

**Response:**
```json
{
  "data": [...],
  "pagination": {...},
  "statistics": {
    "total": 100,
    "byStatus": {
      "active": 70,
      "inactive": 20,
      "suspended": 10
    },
    "byType": {
      "managed": 60,
      "autonomous": 40
    }
  }
}
```

**NEW:** Statistics now include `byType` breakdown.

---

## Frontend Integration

### UI Labels (Vietnamese)

```typescript
const AGENT_TYPE_LABELS = {
  managed: 'Agent quản lý tập trung',
  autonomous: 'Agent tự chủ'
};

const AGENT_TYPE_DESCRIPTIONS = {
  managed: 'Agent được quản lý hoàn toàn bởi AIWM, sử dụng MCP tools',
  autonomous: 'Agent tự triển khai, sử dụng Claude Code SDK'
};
```

### Agent Creation Form

```tsx
<Form.Item label="Loại Agent" name="type">
  <Radio.Group>
    <Radio value="managed">
      <Space direction="vertical" size={0}>
        <Text strong>Agent quản lý tập trung</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Lightweight, AIWM quản lý hoàn toàn
        </Text>
      </Space>
    </Radio>
    <Radio value="autonomous">
      <Space direction="vertical" size={0}>
        <Text strong>Agent tự chủ</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Tự triển khai, Claude Code SDK, có credentials
        </Text>
      </Space>
    </Radio>
  </Radio.Group>
</Form.Item>

{/* Show credentials button only for autonomous agents */}
{agent.type === 'autonomous' && (
  <Button onClick={handleRegenerateCredentials}>
    🔑 Tạo lại Credentials
  </Button>
)}
```

### Agent List Filters

```tsx
<Select
  placeholder="Lọc theo loại"
  onChange={(value) => setFilter({ ...filter, type: value })}
  allowClear
>
  <Option value="managed">Agent quản lý tập trung</Option>
  <Option value="autonomous">Agent tự chủ</Option>
</Select>
```

### Agent Card Badge

```tsx
{agent.type === 'managed' ? (
  <Badge color="blue">Quản lý tập trung</Badge>
) : (
  <Badge color="green">Tự chủ</Badge>
)}
```

---

## Migration Guide

### Existing Agents (No Schema Migration Required)

All existing agents will default to `type: 'managed'` because:
```typescript
@Prop({
  type: String,
  enum: ['managed', 'autonomous'],
  default: 'managed'  // ← Default value
})
type: string;
```

**Behavior:**
- Existing agents without `type` field → treated as `managed`
- Existing agents with `secret` → **should be manually updated** to `type: 'autonomous'`

### Updating Existing Autonomous Agents

If you have existing agents that use connection API:

```bash
# Update agent type to 'autonomous'
curl -X PUT "http://localhost:3305/agents/{AGENT_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "autonomous"}'
```

---

## Testing

### Test Script Updated

[scripts/test-agent-connection.sh](../../../scripts/test-agent-connection.sh) now creates agents with `type: 'autonomous'`.

### Manual Testing

**1. Test Type Change Prevention:**
```bash
# Create managed agent
AGENT_ID=$(curl -s -X POST "http://localhost:3305/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Managed Agent",
    "type": "managed",
    "status": "active",
    "instructionId": "...",
    "nodeId": "..."
  }' | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")

# Try to change to autonomous (should fail)
curl -X PUT "http://localhost:3305/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "autonomous"}'
```

**Expected:** 400 Bad Request - "Cannot change agent type from 'managed' to 'autonomous'. Please delete and recreate the agent with the desired type."

**2. Create Managed Agent:**
```bash
curl -X POST "http://localhost:3305/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Managed Agent Test",
    "type": "managed",
    "status": "active",
    "instructionId": "...",
    "nodeId": "..."
  }'
```

**3. Try to Connect Managed Agent (Should Fail):**
```bash
curl -X POST "http://localhost:3305/agents/{MANAGED_AGENT_ID}/connect" \
  -H "Content-Type: application/json" \
  -d '{"secret": "any-secret"}'
```

**Expected:** 400 Bad Request - "Only autonomous agents can connect via this endpoint"

**4. Create Autonomous Agent:**
```bash
curl -X POST "http://localhost:3305/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Autonomous Agent Test",
    "type": "autonomous",
    "status": "active",
    "instructionId": "...",
    "nodeId": "..."
  }'
```

**5. Regenerate Credentials (Should Work):**
```bash
curl -X POST "http://localhost:3305/agents/{AUTONOMOUS_AGENT_ID}/credentials/regenerate" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** 200 OK with secret, envConfig, installScript

**6. Connect Autonomous Agent (Should Work):**
```bash
curl -X POST "http://localhost:3305/agents/{AUTONOMOUS_AGENT_ID}/connect" \
  -H "Content-Type: application/json" \
  -d '{"secret": "secret-from-regenerate"}'
```

**Expected:** 200 OK with token, instruction, tools, settings

---

## MCP Tool Integration

When autonomous agents connect, they receive an MCP endpoint for tool discovery and execution.

### Agent Workflow

1. **Agent connects**: `POST /agents/:id/connect` with secret
2. **Receives configuration**:
   - `accessToken` - JWT for authentication
   - `mcpEndpoint` - URL for MCP protocol (`http://localhost:3305/mcp`)
   - `instruction` - Agent instructions
   - `tools` - Legacy tool list (deprecated, use MCP endpoint instead)
   - `settings` - Runtime configuration

3. **Agent discovers tools**: `POST /mcp/tools/list` with agent JWT
   - Returns filtered list based on agent's `allowedToolIds`
   - Only `type='api'` and `status='active'` tools included
   - Response format: `{ "tools": [{ "name", "description", "inputSchema" }] }`

4. **Agent executes tools**: `POST /mcp/tools/call` with agent JWT
   - Proxies request to CBM service
   - Uses agent JWT directly (no user JWT generation)
   - Response format: `{ "content": [{ "type": "text", "text": "..." }] }`

### Connect Response with MCP Endpoint

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "refreshToken": null,
  "refreshExpiresIn": 0,
  "tokenType": "bearer",
  "mcpEndpoint": "http://localhost:3305/mcp",  // ⭐ NEW: MCP endpoint for tool operations
  "instruction": "You are a customer support agent...",
  "tools": [...],  // Legacy, use MCP endpoint instead
  "settings": {
    "auth_roles": ["agent", "document.editor"],
    "claude_model": "claude-3-5-sonnet-latest",
    ...
  }
}
```

### MCP Protocol Endpoints

**1. POST /mcp/tools/list** - Discover available tools
```bash
curl -X POST "http://localhost:3305/mcp/tools/list" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response:
```json
{
  "tools": [
    {
      "name": "cbm_documents_createOne",
      "description": "Create a new document in CBM...",
      "inputSchema": {
        "type": "object",
        "required": ["summary", "content"],
        "properties": {
          "summary": { "type": "string", "maxLength": 500 },
          "content": { "type": "string" }
        }
      }
    }
  ]
}
```

**2. POST /mcp/tools/call** - Execute a tool
```bash
curl -X POST "http://localhost:3305/mcp/tools/call" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cbm_documents_createOne",
    "arguments": {
      "summary": "Meeting notes",
      "content": "Discussion about Q1 planning",
      "type": "markdown"
    }
  }'
```

Response:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"_id\":\"...\",\"summary\":\"Meeting notes\",\"createdAt\":\"...\"}"
    }
  ]
}
```

### Tool Filtering

- Only tools in agent's `allowedToolIds` array are returned
- Only `type: 'api'` tools (CBM service integration)
- Only `status: 'active'` tools
- Claude builtin tools are configured in agent's `settings` (not from MCP endpoint)

### Authentication Flow

1. Agent uses agent JWT (from connect) for all MCP requests
2. AIWM validates agent JWT via JwtAuthGuard
3. AIWM proxies tool calls to CBM with the **same agent JWT** (no user JWT generation)
4. CBM validates agent JWT and applies RBAC based on `roles` in JWT payload
5. CBM returns response → AIWM wraps in MCP format → Agent receives result

### Error Handling

MCP endpoints return errors in standard format:
```json
{
  "error": {
    "code": "TOOL_EXECUTION_FAILED",
    "message": "Failed to execute tool: cbm_documents_createOne",
    "details": {
      "statusCode": 400,
      "message": "Validation failed: summary is required"
    }
  }
}
```

### Example: Complete MCP Workflow

```bash
# Step 1: Agent connects
CONNECT_RESPONSE=$(curl -X POST "http://localhost:3305/agents/$AGENT_ID/connect" \
  -d '{"secret": "$AGENT_SECRET"}')

AGENT_TOKEN=$(echo "$CONNECT_RESPONSE" | jq -r '.accessToken')
MCP_ENDPOINT=$(echo "$CONNECT_RESPONSE" | jq -r '.mcpEndpoint')

# Step 2: Discover tools
TOOLS=$(curl -X POST "$MCP_ENDPOINT/tools/list" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -d '{}')

# Step 3: Execute tool
RESULT=$(curl -X POST "$MCP_ENDPOINT/tools/call" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -d '{
    "name": "cbm_documents_createOne",
    "arguments": {
      "summary": "Test",
      "content": "Content",
      "type": "text"
    }
  }')
```

---

## Summary

✅ **Completed Changes:**
- Added `type` field to Agent schema (`managed` | `autonomous`)
- Updated create logic to handle secret generation based on type
- Added type validation in `connect()` and `regenerateCredentials()`
- **Blocked type changes** in `updateAgent()` to prevent migration issues
- Added statistics by type in list endpoint
- Updated test script
- Created comprehensive documentation

✅ **Benefits:**
- Clear separation between managed vs autonomous agents
- Prevents confusion about which agents can connect
- Better user experience in frontend (show credentials only when relevant)
- Simpler classification (single field instead of dual fields)
- Extensible for future types (e.g., 'hybrid', 'enterprise')

✅ **Backward Compatible:**
- Existing agents default to `type: 'managed'`
- No database migration required
- Existing autonomous agents can be manually updated via API
