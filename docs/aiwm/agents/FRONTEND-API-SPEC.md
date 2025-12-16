# Agent Management API Specification - Frontend Integration

## Overview

This document provides API specifications for frontend developers to implement Agent Management UI in AIWM platform.

## Base URL

```
Production: https://api.x-or.cloud/dev/aiwm
Development: http://localhost:3305
```

## Authentication

All endpoints (except `/agents/:id/connect`) require JWT authentication:

```
Authorization: Bearer {admin-jwt-token}
```

---

## API Endpoints

### 1. List Agents

**GET** `/agents`

Get paginated list of agents with filtering and sorting.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `sort` (string, optional): Sort field, prefix with `-` for descending (e.g., `-createdAt`, `name`)
- `status` (string, optional): Filter by status (`active`, `inactive`, `busy`, `suspended`)

**Response:**
```json
{
  "data": [
    {
      "_id": "agent-id-1",
      "name": "Customer Support Agent",
      "description": "AI agent for customer support",
      "status": "active",
      "instructionId": "instruction-id",
      "guardrailId": null,
      "nodeId": "node-id",
      "tags": ["support", "production"],
      "allowedToolIds": ["tool-id-1", "tool-id-2"],
      "settings": {
        "claudeModel": "claude-3-5-haiku-latest",
        "maxTurns": 100,
        "permissionMode": "bypassPermissions",
        "resume": true,
        "discord": {
          "token": "***",
          "channelIds": ["123456"]
        }
      },
      "lastConnectedAt": "2025-01-15T10:30:00.000Z",
      "lastHeartbeatAt": "2025-01-15T12:45:00.000Z",
      "connectionCount": 42,
      "owner": "org-id",
      "createdBy": "user-id",
      "updatedBy": "user-id",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-15T12:45:00.000Z",
      "isDeleted": false
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  },
  "statistics": {
    "total": 25,
    "byStatus": {
      "active": 18,
      "inactive": 5,
      "busy": 2,
      "suspended": 0
    }
  }
}
```

**UI Implementation Notes:**
- Show status badges with colors (active: green, inactive: gray, busy: yellow, suspended: red)
- Display last heartbeat as relative time (e.g., "5 minutes ago")
- Show connection count as badge
- Mask sensitive data in settings (tokens should show as `***`)

---

### 2. Get Agent Details

**GET** `/agents/:id`

Get detailed information about a specific agent.

**Query Parameters:**
- `populate` (string, optional): Set to `instruction` to include full instruction object

**Response:**
```json
{
  "_id": "agent-id",
  "name": "Customer Support Agent",
  "description": "AI agent for customer support",
  "status": "active",
  "instructionId": "instruction-id",
  "guardrailId": null,
  "nodeId": "node-id",
  "tags": ["support", "production"],
  "allowedToolIds": ["tool-id-1", "tool-id-2"],
  "settings": {
    "claudeModel": "claude-3-5-haiku-latest",
    "maxTurns": 100,
    "permissionMode": "bypassPermissions",
    "resume": true,
    "claudeOAuthToken": "***",
    "discord": {
      "token": "***",
      "channelIds": ["123456"],
      "botId": "bot-id"
    },
    "telegram": {
      "token": "***",
      "groupIds": ["-1001234567890"],
      "botUsername": "my_bot"
    }
  },
  "lastConnectedAt": "2025-01-15T10:30:00.000Z",
  "lastHeartbeatAt": "2025-01-15T12:45:00.000Z",
  "connectionCount": 42,
  "owner": "org-id",
  "createdBy": "user-id",
  "updatedBy": "user-id",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-15T12:45:00.000Z",
  "isDeleted": false
}
```

**With `populate=instruction`:**
```json
{
  "_id": "agent-id",
  "name": "Customer Support Agent",
  "instructionId": {
    "_id": "instruction-id",
    "name": "Support Agent Instruction",
    "systemPrompt": "You are a helpful assistant...",
    "guidelines": ["Be polite", "Be accurate"],
    "status": "active"
  },
  // ... other fields
}
```

---

### 3. Create Agent

**POST** `/agents`

Create a new agent.

**Request Body:**
```json
{
  "name": "Customer Support Agent",
  "description": "AI agent for customer support",
  "status": "active",
  "instructionId": "instruction-id",
  "guardrailId": null,
  "nodeId": "node-id",
  "tags": ["support", "production"],
  "secret": "optional-custom-secret",
  "allowedToolIds": ["tool-id-1", "tool-id-2"],
  "settings": {
    "claudeModel": "claude-3-5-haiku-latest",
    "maxTurns": 100,
    "permissionMode": "bypassPermissions",
    "resume": true,
    "claudeOAuthToken": "oauth-token-if-needed",
    "discord": {
      "token": "discord-bot-token",
      "channelIds": ["123456789"],
      "botId": "discord-bot-id"
    },
    "telegram": {
      "token": "telegram-bot-token",
      "groupIds": ["-1001234567890"],
      "botUsername": "my_support_bot"
    }
  }
}
```

**Field Descriptions:**
- `name` (string, required): Agent display name
- `description` (string, required): Agent description
- `status` (enum, required): `active`, `inactive`, `busy`, or `suspended`
- `instructionId` (string, optional): ID of instruction to use
- `guardrailId` (string, optional): ID of guardrail to use
- `nodeId` (string, required): ID of node where agent will run
- `tags` (string[], optional): Tags for categorization
- `secret` (string, optional): Custom secret for authentication (will be hashed). If not provided, random secret is generated
- `allowedToolIds` (string[], optional): Array of tool IDs agent can use
- `settings` (object, optional): Runtime configuration including:
  - `claudeModel` (string): Claude model to use
  - `maxTurns` (number): Maximum conversation turns
  - `permissionMode` (string): Permission mode for Claude SDK
  - `resume` (boolean): Enable resume mode
  - `claudeOAuthToken` (string): OAuth token for Claude API
  - `discord` (object): Discord platform configuration
  - `telegram` (object): Telegram platform configuration

**Response:**
```json
{
  "_id": "newly-created-agent-id",
  "name": "Customer Support Agent",
  // ... all agent fields
  "createdAt": "2025-01-15T13:00:00.000Z",
  "updatedAt": "2025-01-15T13:00:00.000Z"
}
```

**Note:** Secret is hashed and NOT returned in response. Use `/credentials/regenerate` to get credentials.

**UI Implementation:**
- Provide dropdown for selecting instruction (from `/instructions` endpoint)
- Provide dropdown for selecting node (from `/nodes` endpoint)
- Provide multi-select for tools (from `/tools` endpoint)
- Provide form for settings with sensible defaults
- Show warning that secret cannot be retrieved after creation
- Recommend calling `/credentials/regenerate` immediately after creation

---

### 4. Update Agent

**PUT** `/agents/:id`

Update an existing agent. All fields are optional.

**Request Body:**
```json
{
  "name": "Updated Agent Name",
  "status": "inactive",
  "instructionId": "new-instruction-id",
  "allowedToolIds": ["tool-id-3"],
  "settings": {
    "claudeModel": "claude-3-5-sonnet-latest",
    "maxTurns": 50
  }
}
```

**Response:**
```json
{
  "_id": "agent-id",
  "name": "Updated Agent Name",
  // ... updated fields
  "updatedAt": "2025-01-15T13:30:00.000Z"
}
```

**Note:** Cannot update `secret` via this endpoint. Use `/credentials/regenerate` instead.

**UI Implementation:**
- Pre-populate form with current values
- Allow partial updates (only changed fields)
- Show confirmation before changing critical fields (status, instructionId)
- Warn user that updating instruction requires agent restart to take effect

---

### 5. Delete Agent

**DELETE** `/agents/:id`

Soft delete an agent (sets `isDeleted: true`).

**Response:**
```json
{
  "message": "Agent deleted successfully"
}
```

**UI Implementation:**
- Show confirmation dialog before deletion
- Warn user that this is a soft delete (can be recovered by admin)
- Remove agent from list after successful deletion

---

### 6. Regenerate Agent Credentials

**POST** `/agents/:id/credentials/regenerate`

Generate new credentials for an agent. This is the ONLY way to get the plain text secret.

**Response:**
```json
{
  "agentId": "agent-id",
  "secret": "f8e7d6c5b4a39281706f5e4d3c2b1a09",
  "envConfig": "# ===== AIWM Integration =====\nAIWM_ENABLED=true\nAIWM_BASE_URL=https://api.x-or.cloud/dev/aiwm\nAIWM_AGENT_ID=agent-id\nAIWM_AGENT_SECRET=f8e7d6c5b4a39281706f5e4d3c2b1a09\n\n# ===== Agent Info =====\nAGENT_NAME=Customer Support Agent\n\n# ===== Claude Code SDK Configuration =====\nCLAUDE_MODEL=claude-3-5-haiku-latest\nCLAUDE_MAX_TURNS=100\nCLAUDE_PERMISSION_MODE=bypassPermissions\nCLAUDE_RESUME=true\n\n# ===== Platform Configuration (Optional) =====\nDISCORD_TOKEN=discord-token-here\nDISCORD_CHANNEL_ID=123456\nTELEGRAM_BOT_TOKEN=telegram-token-here\nTELEGRAM_GROUP_ID=-1001234567890\n",
  "installScript": "#!/bin/bash\n# ============================================\n# Agent Installation Script (PLACEHOLDER)\n# ============================================\n# Agent: Customer Support Agent\n# Agent ID: agent-id\n# Generated: 2025-01-15T13:45:00.000Z\n...\n"
}
```

**Field Descriptions:**
- `agentId` (string): Agent ID
- `secret` (string): Plain text secret (show only once!)
- `envConfig` (string): Pre-formatted .env configuration with all settings
- `installScript` (string): Installation script (placeholder for now)

**UI Implementation - CRITICAL:**
- **Show large warning** that secret is shown only once and cannot be retrieved again
- **Copy to clipboard button** for secret
- **Copy to clipboard button** for envConfig
- **Download .env file button** to save envConfig
- **Download install.sh button** to save installScript
- **Show confirmation dialog** before regenerating (old secret will be invalidated)
- **Mask secret after user copies** or provide "show/hide" toggle
- Consider showing a checklist:
  - [ ] Copied secret to safe location
  - [ ] Downloaded .env file
  - [ ] Confirmed agent client is not currently running (will be disconnected)

---

### 7. Agent Statistics (Derived from List)

**GET** `/agents?page=1&limit=1`

Get agent statistics from the `statistics` field in list response.

**Response:**
```json
{
  "data": [...],
  "pagination": {...},
  "statistics": {
    "total": 25,
    "byStatus": {
      "active": 18,
      "inactive": 5,
      "busy": 2,
      "suspended": 0
    }
  }
}
```

**UI Implementation:**
- Show in dashboard as cards or charts
- Use pie chart or bar chart for status breakdown
- Show total agents count prominently

---

## Data Structures

### Agent Schema

```typescript
interface Agent {
  _id: string;                    // MongoDB ObjectId
  name: string;                   // Agent name
  description: string;            // Agent description
  status: 'active' | 'inactive' | 'busy' | 'suspended';
  instructionId?: string;         // Instruction ID (optional)
  guardrailId?: string;           // Guardrail ID (optional)
  nodeId: string;                 // Node ID (required)
  tags: string[];                 // Tags array

  // Authentication & Connection
  allowedToolIds: string[];       // Tool IDs whitelist
  settings: AgentSettings;        // Runtime configuration
  lastConnectedAt?: Date;         // Last connection timestamp
  lastHeartbeatAt?: Date;         // Last heartbeat timestamp
  connectionCount: number;        // Total connections

  // Ownership & Audit
  owner: string;                  // Organization ID
  createdBy: string;              // User ID who created
  updatedBy: string;              // User ID who last updated
  createdAt: Date;                // Creation timestamp
  updatedAt: Date;                // Last update timestamp
  isDeleted: boolean;             // Soft delete flag
}

interface AgentSettings {
  // Claude Code SDK Configuration
  claudeModel?: string;           // e.g., "claude-3-5-haiku-latest"
  maxTurns?: number;              // e.g., 100
  permissionMode?: string;        // e.g., "bypassPermissions"
  resume?: boolean;               // e.g., true
  claudeOAuthToken?: string;      // OAuth token for Claude API

  // Discord Platform
  discord?: {
    token?: string;               // Discord bot token
    channelIds?: string[];        // Discord channel IDs
    botId?: string;               // Discord bot ID
  };

  // Telegram Platform
  telegram?: {
    token?: string;               // Telegram bot token
    groupIds?: string[];          // Telegram group IDs
    botUsername?: string;         // Telegram bot username
  };

  // Extensible for other platforms
  [key: string]: any;
}
```

---

## UI/UX Recommendations

### Agent List Page

**Columns to Display:**
- Status (badge with color)
- Name
- Description (truncated)
- Instruction (link to instruction detail)
- Node (link to node detail)
- Last Heartbeat (relative time)
- Connection Count (badge)
- Actions (View, Edit, Delete, Regenerate Crtiêpedentials)

**Filters:**
- Status dropdown (all, active, inactive, busy, suspended)
- Node dropdown
- Search by name

**Sorting:**
- Name (A-Z, Z-A)
- Created date (newest, oldest)
- Last heartbeat (most recent, least recent)
- Connection count (high to low, low to high)

### Agent Detail Page

**Sections:**

1. **Basic Information**
   - Name (editable inline)
   - Description (editable inline)
   - Status (dropdown)
   - Tags (chips, editable)

2. **Configuration**
   - Instruction (dropdown to change)
   - Node (dropdown to change)
   - Tools (multi-select)

3. **Settings** (expandable/collapsible sections)
   - Claude SDK Settings
   - Discord Configuration
   - Telegram Configuration

4. **Connection Status** (read-only)
   - Last Connected: "2 hours ago"
   - Last Heartbeat: "5 minutes ago"
   - Connection Count: 42
   - Status indicator (online/offline based on heartbeat)

5. **Credentials** (separate section)
   - Button: "Regenerate Credentials"
   - Warning: "This will invalidate the current secret"

6. **Audit Trail** (read-only)
   - Created by: user@example.com
   - Created at: 2025-01-01 10:00:00
   - Updated by: user@example.com
   - Updated at: 2025-01-15 12:00:00

### Agent Create/Edit Form

**Form Layout:**

```
┌─────────────────────────────────────┐
│ Basic Information                   │
├─────────────────────────────────────┤
│ Name: [___________________]         │
│ Description: [______________]       │
│ Status: [Active ▼]                  │
│ Tags: [tag1] [tag2] [+ Add]         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Configuration                       │
├─────────────────────────────────────┤
│ Instruction: [Select ▼]            │
│ Node: [Select ▼]                   │
│ Tools: [☑ tool1] [☐ tool2] [☐ tool3]│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Claude SDK Settings                 │
├─────────────────────────────────────┤
│ Model: [claude-3-5-haiku-latest ▼] │
│ Max Turns: [100]                    │
│ Permission Mode: [bypassPermissions]│
│ Resume: [☑ Enabled]                 │
│ OAuth Token: [***************]      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Platform Configuration              │
├─────────────────────────────────────┤
│ Discord                             │
│   Token: [***************]          │
│   Channel IDs: [123, 456]           │
│   Bot ID: [789]                     │
│                                     │
│ Telegram                            │
│   Token: [***************]          │
│   Group IDs: [-1001234567890]       │
│   Bot Username: [@my_bot]           │
└─────────────────────────────────────┘

[Cancel] [Save Agent]
```

**Validation Rules:**
- Name: required, max 100 chars
- Description: required, max 500 chars
- Status: required, one of enum values
- NodeId: required
- Settings: validate JSON structure
- Tokens: mask in UI, validate format

### Credentials Modal

When user clicks "Regenerate Credentials":

```
┌─────────────────────────────────────────────┐
│ ⚠️  Regenerate Agent Credentials           │
├─────────────────────────────────────────────┤
│                                             │
│ This will generate a NEW secret and        │
│ INVALIDATE the current one.                │
│                                             │
│ ⚠️  IMPORTANT:                              │
│ • Agent must be restarted with new secret  │
│ • Current running agent will be            │
│   disconnected                              │
│ • Secret is shown ONLY ONCE                │
│                                             │
│ Are you sure you want to continue?         │
│                                             │
│ [Cancel] [Yes, Regenerate]                 │
└─────────────────────────────────────────────┘
```

After regeneration:

```
┌─────────────────────────────────────────────┐
│ ✅ Credentials Generated Successfully       │
├─────────────────────────────────────────────┤
│                                             │
│ ⚠️  Copy these credentials NOW!             │
│ They will NOT be shown again.               │
│                                             │
│ Agent ID:                                   │
│ ┌─────────────────────────────────────┐    │
│ │ 67f3a2c8d1e5b4a7c9f1d3e2            │ 📋 │
│ └─────────────────────────────────────┘    │
│                                             │
│ Secret:                                     │
│ ┌─────────────────────────────────────┐    │
│ │ f8e7d6c5b4a39281706f5e4d3c2b1a09    │ 📋 │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ [📥 Download .env File]              │    │
│ │ [📥 Download Install Script]         │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ Checklist:                                  │
│ ☐ Copied agent ID                          │
│ ☐ Copied secret                            │
│ ☐ Downloaded .env file                     │
│ ☐ Saved credentials securely               │
│                                             │
│ [Close]                                     │
└─────────────────────────────────────────────┘
```

---

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    "name must be a string",
    "nodeId must be a valid ObjectId"
  ]
}
```

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Agent with ID 67f3a2c8d1e5b4a7c9f1d3e2 not found"
}
```

**500 Internal Server Error:**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "correlationId": "req-123-456-789"
}
```

**Frontend Error Handling:**
- Show user-friendly error messages
- Log correlation ID for debugging
- Provide retry option for network errors
- Show validation errors inline on form fields

---

## Real-time Updates (Future Enhancement)

For real-time agent status updates (heartbeat, connection status):

**Option 1: Polling**
- Poll `/agents/:id` every 30-60 seconds
- Update UI with latest heartbeat status
- Simple to implement

**Option 2: WebSocket (Recommended)**
- Subscribe to agent status updates
- Receive real-time heartbeat events
- More efficient for many agents

---

## Testing

### Test Data

Use provided test script to create test agents:
```bash
./scripts/test-agent-connection.sh
```

Or create manually via API.

### Test Scenarios

1. **Create Agent Flow:**
   - Create instruction first
   - Create tools
   - Create node
   - Create agent with all settings
   - Regenerate credentials immediately
   - Download .env file

2. **Update Agent Flow:**
   - Change instruction
   - Add/remove tools
   - Update settings
   - Verify agent needs restart

3. **Credentials Flow:**
   - Regenerate credentials
   - Copy secret
   - Download .env
   - Verify old secret no longer works

4. **Delete Agent Flow:**
   - Soft delete agent
   - Verify agent doesn't appear in list
   - Verify agent data still in database (isDeleted: true)

---

## API Client Example

```typescript
// Example using fetch API
class AgentAPI {
  private baseUrl = 'http://localhost:3305';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async listAgents(params?: {
    page?: number;
    limit?: number;
    status?: string;
    sort?: string;
  }) {
    const query = new URLSearchParams(params as any);
    const response = await fetch(`${this.baseUrl}/agents?${query}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });
    return response.json();
  }

  async createAgent(data: CreateAgentDto) {
    const response = await fetch(`${this.baseUrl}/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async regenerateCredentials(agentId: string) {
    const response = await fetch(
      `${this.baseUrl}/agents/${agentId}/credentials/regenerate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      }
    );
    return response.json();
  }

  // ... other methods
}
```

---

## Changelog

### Version 1.0 (Current)
- Initial release with basic CRUD operations
- Agent authentication via secret
- Credentials regeneration
- Settings configuration for Claude SDK and platforms
- Connection tracking (lastConnectedAt, lastHeartbeatAt, connectionCount)

### Future Versions
- WebSocket support for real-time updates
- Bulk operations (create/update/delete multiple agents)
- Agent deployment automation
- Agent health monitoring dashboard
- Advanced filtering and search
