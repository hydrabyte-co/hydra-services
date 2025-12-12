# Agent API - Frontend Integration Guide

**Service**: AIWM (AI Workload Management)
**Module**: Agent
**Version**: 1.0
**Last Updated**: 2025-01-15

---

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Data Models](#data-models)
4. [Field Descriptions](#field-descriptions)
5. [Agent Configuration](#agent-configuration)
6. [Status Lifecycle](#status-lifecycle)
7. [Validation Rules](#validation-rules)
8. [Error Handling](#error-handling)
9. [UI Components Guide](#ui-components-guide)
10. [Example Requests](#example-requests)
11. [Developer Notes](#developer-notes)

---

## Overview

The **Agent API** manages AI agents that execute tasks using instructions, tools, and models. Agents run on GPU nodes and can be configured with specific capabilities, permissions, and performance settings.

### Base URL
```
http://localhost:3003/agents
```

### Authentication
All endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer <jwt_token>
```

### Key Features
- **Agent Lifecycle Management**: Create, configure, monitor, and delete agents
- **Instruction Integration**: Link agents to instruction templates for behavior definition
- **Tool Assignment**: Assign multiple tools to agents (built-in and MCP)
- **Performance Metrics**: Track task completion, response time, and latency
- **Node Assignment**: Deploy agents on specific GPU nodes
- **Status Monitoring**: Real-time status tracking (active, inactive, busy)
- **Statistics Aggregation**: Get counts by status and performance metrics

---

## API Endpoints

### 1. Create Agent

**Endpoint**: `POST /agents`
**Description**: Create a new AI agent

**Request Body**:
```typescript
{
  agentId: string;                       // Required, unique identifier
  name: string;                          // Required
  description: string;                   // Required
  role: string;                          // Required, e.g., "Customer Support"
  status: 'active' | 'inactive' | 'busy'; // Required
  capabilities: string[];                // Required, e.g., ["chat", "search"]

  configuration: {                       // Required
    modelId: string;                     // Model to use
    maxTokens: number;                   // Max tokens per response (min: 1)
    temperature: number;                 // Generation temperature (min: 0)
    timeout: number;                     // Timeout in seconds (min: 1)
    maxRetries: number;                  // Max retry attempts (min: 0)
  };

  instructionId?: string;                // Optional, reference to Instruction
  nodeId: string;                        // Required, GPU node ID
  permissions?: string[];                // Optional, e.g., ["read:docs", "write:logs"]
  tags?: string[];                       // Optional, e.g., ["production", "vtv"]
}
```

**Response**: `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "agentId": "agent-cs-001",
  "name": "Customer Support Agent",
  "description": "AI agent for handling customer support inquiries",
  "role": "Customer Support",
  "status": "active",
  "capabilities": ["chat", "search", "email"],
  "configuration": {
    "modelId": "gpt-4",
    "maxTokens": 2000,
    "temperature": 0.7,
    "timeout": 30,
    "maxRetries": 3
  },
  "instructionId": "507f1f77bcf86cd799439012",
  "nodeId": "507f1f77bcf86cd799439013",
  "totalTasks": 0,
  "completedTasks": 0,
  "failedTasks": 0,
  "averageResponseTime": 0,
  "averageLatency": 0,
  "lastTask": null,
  "lastHeartbeat": null,
  "isActive": true,
  "permissions": ["read:docs", "write:logs"],
  "tags": ["production", "vtv"],
  "owner": {
    "userId": "507f1f77bcf86cd799439014",
    "orgId": "507f1f77bcf86cd799439015"
  },
  "createdBy": "507f1f77bcf86cd799439014",
  "updatedBy": "507f1f77bcf86cd799439014",
  "deletedAt": null,
  "metadata": {},
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Validation Rules**:
- `agentId`: Required, must be unique
- `name`: Required string
- `description`: Required string
- `role`: Required string
- `status`: Required, must be 'active', 'inactive', or 'busy'
- `capabilities`: Required array of strings
- `configuration`: Required, all sub-fields must meet min constraints
- `nodeId`: Required, must reference existing Node

---

### 2. Get All Agents

**Endpoint**: `GET /agents`
**Description**: Retrieve all agents with pagination and statistics

**Query Parameters**:
```typescript
{
  page?: number;        // Page number (default: 1)
  limit?: number;       // Items per page (default: 10, max: 100)
  search?: string;      // Search in name and description
  sort?: string;        // Sort field (e.g., 'createdAt', '-createdAt')
  filter?: object;      // MongoDB filter (e.g., { status: 'active' })
  populate?: string;    // Use 'instruction' to include instruction details
}
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "agentId": "agent-cs-001",
      "name": "Customer Support Agent",
      "description": "AI agent for handling customer support inquiries",
      "role": "Customer Support",
      "status": "active",
      "capabilities": ["chat", "search", "email"],
      "configuration": {
        "modelId": "gpt-4",
        "maxTokens": 2000,
        "temperature": 0.7,
        "timeout": 30,
        "maxRetries": 3
      },
      "instructionId": "507f1f77bcf86cd799439012",
      "nodeId": "507f1f77bcf86cd799439013",
      "totalTasks": 150,
      "completedTasks": 145,
      "failedTasks": 5,
      "averageResponseTime": 1250,
      "averageLatency": 320,
      "lastTask": "2025-01-15T14:30:00.000Z",
      "lastHeartbeat": "2025-01-15T14:35:00.000Z",
      "isActive": true,
      "tags": ["production", "vtv"],
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T14:35:00.000Z"
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
      "busy": 2
    },
    "byType": {}
  }
}
```

**Common Filters**:
```typescript
// Get active agents only
?filter={"status":"active"}

// Search by name or description
?search=customer

// Sort by creation date (newest first)
?sort=-createdAt

// Filter by role
?filter={"role":"Customer Support"}

// Filter by tags
?filter={"tags":"production"}

// Include instruction details
?populate=instruction

// Combine filters
?filter={"status":"active","tags":"production"}&populate=instruction&page=1&limit=20
```

---

### 3. Get Agent by ID

**Endpoint**: `GET /agents/:id`
**Description**: Retrieve a single agent by MongoDB ObjectId

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the agent

**Query Parameters**:
```typescript
{
  populate?: string;    // Use 'instruction' to include instruction details
}
```

**Response**: `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "agentId": "agent-cs-001",
  "name": "Customer Support Agent",
  "description": "AI agent for handling customer support inquiries",
  "role": "Customer Support",
  "status": "active",
  "capabilities": ["chat", "search", "email"],
  "configuration": {
    "modelId": "gpt-4",
    "maxTokens": 2000,
    "temperature": 0.7,
    "timeout": 30,
    "maxRetries": 3
  },
  "instructionId": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Customer Support Instructions",
    "systemPrompt": "You are a helpful customer support agent...",
    "guidelines": ["Be polite", "Listen carefully"],
    "status": "active"
  },
  "nodeId": "507f1f77bcf86cd799439013",
  "totalTasks": 150,
  "completedTasks": 145,
  "failedTasks": 5,
  "averageResponseTime": 1250,
  "averageLatency": 320,
  "lastTask": "2025-01-15T14:30:00.000Z",
  "lastHeartbeat": "2025-01-15T14:35:00.000Z",
  "isActive": true,
  "permissions": ["read:docs", "write:logs"],
  "tags": ["production", "vtv"],
  "owner": {
    "userId": "507f1f77bcf86cd799439014",
    "orgId": "507f1f77bcf86cd799439015"
  },
  "createdBy": "507f1f77bcf86cd799439014",
  "updatedBy": "507f1f77bcf86cd799439014",
  "deletedAt": null,
  "metadata": {},
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T14:35:00.000Z"
}
```

**Note**: When `?populate=instruction` is used, `instructionId` field becomes an object containing full instruction details.

**Error Responses**:
- `404 Not Found`: Agent with given ID does not exist or is deleted

---

### 4. Update Agent

**Endpoint**: `PUT /agents/:id`
**Description**: Update an existing agent (all fields optional)

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the agent

**Request Body**: (All fields optional)
```typescript
{
  name?: string;
  description?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'busy';
  capabilities?: string[];
  configuration?: {
    modelId?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
    maxRetries?: number;
  };
  instructionId?: string;
  nodeId?: string;
  permissions?: string[];
  tags?: string[];
  isActive?: boolean;
}
```

**Response**: `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "agentId": "agent-cs-001",
  "name": "Customer Support Agent V2",
  "description": "Updated AI agent for customer support",
  "status": "active",
  "configuration": {
    "modelId": "gpt-4-turbo",
    "maxTokens": 3000,
    "temperature": 0.8,
    "timeout": 45,
    "maxRetries": 5
  },
  "updatedBy": "507f1f77bcf86cd799439014",
  "updatedAt": "2025-01-15T15:00:00.000Z",
  ...
}
```

**Error Responses**:
- `404 Not Found`: Agent does not exist

---

### 5. Delete Agent

**Endpoint**: `DELETE /agents/:id`
**Description**: Soft delete an agent (sets `deletedAt` timestamp)

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the agent

**Response**: `200 OK`
```json
{
  "message": "Agent deleted successfully"
}
```

**Error Responses**:
- `404 Not Found`: Agent does not exist

---

## Data Models

### TypeScript Interfaces

```typescript
/**
 * Agent Entity
 * AI agents that execute tasks
 */
export interface Agent {
  _id: string;                           // MongoDB ObjectId as string
  agentId: string;                       // Unique agent identifier
  name: string;                          // Agent name
  description: string;                   // Agent description
  role: string;                          // Agent role (e.g., "Customer Support")
  status: 'active' | 'inactive' | 'busy'; // Agent status
  capabilities: string[];                // Agent capabilities

  configuration: AgentConfiguration;     // Agent configuration
  instructionId?: string;                // Optional instruction reference
  nodeId: string;                        // GPU node reference

  // Performance metrics
  totalTasks: number;                    // Total tasks assigned
  completedTasks: number;                // Successfully completed tasks
  failedTasks: number;                   // Failed tasks
  averageResponseTime: number;           // Avg response time in ms
  averageLatency: number;                // Avg latency in ms
  lastTask?: Date;                       // Last task timestamp
  lastHeartbeat?: Date;                  // Last heartbeat timestamp

  // Access control
  isActive: boolean;                     // Active status
  permissions: string[];                 // Agent permissions
  tags: string[];                        // Agent tags

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
 * Agent Configuration
 */
export interface AgentConfiguration {
  modelId: string;                       // Model ID to use
  maxTokens: number;                     // Max tokens per response (min: 1)
  temperature: number;                   // Generation temperature (min: 0)
  timeout: number;                       // Timeout in seconds (min: 1)
  maxRetries: number;                    // Max retry attempts (min: 0)
}

/**
 * Create Agent DTO
 */
export interface CreateAgentDto {
  agentId: string;                       // Required, unique
  name: string;                          // Required
  description: string;                   // Required
  role: string;                          // Required
  status: 'active' | 'inactive' | 'busy'; // Required
  capabilities: string[];                // Required
  configuration: AgentConfiguration;     // Required
  instructionId?: string;                // Optional
  nodeId: string;                        // Required
  permissions?: string[];                // Optional
  tags?: string[];                       // Optional
}

/**
 * Update Agent DTO
 */
export interface UpdateAgentDto {
  name?: string;
  description?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'busy';
  capabilities?: string[];
  configuration?: AgentConfiguration;
  instructionId?: string;
  nodeId?: string;
  permissions?: string[];
  tags?: string[];
  isActive?: boolean;
}

/**
 * Paginated Response
 */
export interface AgentListResponse {
  data: Agent[];
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
      busy: number;
    };
    byType: Record<string, any>;
  };
}
```

---

## Field Descriptions

### Core Fields

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `_id` | `string` | Auto | MongoDB ObjectId as string | Generated by database |
| `agentId` | `string` | Yes | Unique agent identifier | Must be unique |
| `name` | `string` | Yes | Agent name | - |
| `description` | `string` | Yes | Agent description | - |
| `role` | `string` | Yes | Agent role | e.g., "Customer Support", "Sales Assistant" |
| `status` | `string` | Yes | Agent status | `'active'`, `'inactive'`, or `'busy'` |
| `capabilities` | `string[]` | Yes | Agent capabilities | e.g., `["chat", "search", "email"]` |
| `configuration` | `object` | Yes | Agent configuration | See AgentConfiguration below |
| `instructionId` | `string` | No | Reference to Instruction | MongoDB ObjectId as string |
| `nodeId` | `string` | Yes | Reference to Node | MongoDB ObjectId as string |

### AgentConfiguration Fields

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `modelId` | `string` | Yes | Model to use for agent | - |
| `maxTokens` | `number` | Yes | Max tokens per response | min: 1 |
| `temperature` | `number` | Yes | Generation temperature | min: 0 (typically 0-2) |
| `timeout` | `number` | Yes | Timeout in seconds | min: 1 |
| `maxRetries` | `number` | Yes | Max retry attempts | min: 0 |

### Performance Metrics Fields

| Field | Type | Description |
|-------|------|-------------|
| `totalTasks` | `number` | Total tasks assigned to agent |
| `completedTasks` | `number` | Successfully completed tasks |
| `failedTasks` | `number` | Failed tasks |
| `averageResponseTime` | `number` | Average response time in milliseconds |
| `averageLatency` | `number` | Average latency in milliseconds |
| `lastTask` | `Date` | Timestamp of last task execution |
| `lastHeartbeat` | `Date` | Timestamp of last heartbeat signal |

### Access Control Fields

| Field | Type | Description |
|-------|------|-------------|
| `isActive` | `boolean` | Active status (default: true) |
| `permissions` | `string[]` | Agent permissions (e.g., `["read:docs", "write:logs"]`) |
| `tags` | `string[]` | Agent tags for categorization (e.g., `["production", "vtv"]`) |

### BaseSchema Fields (Inherited)

| Field | Type | Description |
|-------|------|-------------|
| `owner.userId` | `string` | User who owns the agent |
| `owner.orgId` | `string` | Organization ID |
| `createdBy` | `string` | User ID who created the agent |
| `updatedBy` | `string` | User ID who last updated the agent |
| `deletedAt` | `Date \| null` | Soft delete timestamp (null if not deleted) |
| `metadata` | `object` | Custom metadata (extensible) |
| `createdAt` | `Date` | Creation timestamp |
| `updatedAt` | `Date` | Last update timestamp |

---

## Agent Configuration

### Configuration Object

The `configuration` object defines how the agent interacts with the AI model:

```typescript
{
  modelId: string;        // Model identifier (e.g., "gpt-4", "claude-3")
  maxTokens: number;      // Maximum tokens in response (controls length)
  temperature: number;    // Randomness (0 = deterministic, 2 = very creative)
  timeout: number;        // Request timeout in seconds
  maxRetries: number;     // Retry attempts on failure
}
```

### Configuration Examples

**1. Customer Support Agent (Deterministic)**
```json
{
  "modelId": "gpt-4",
  "maxTokens": 1500,
  "temperature": 0.3,     // Low temperature for consistent responses
  "timeout": 30,
  "maxRetries": 3
}
```

**2. Creative Content Writer (Creative)**
```json
{
  "modelId": "claude-3-opus",
  "maxTokens": 3000,
  "temperature": 1.2,     // High temperature for creativity
  "timeout": 60,
  "maxRetries": 2
}
```

**3. Fast FAQ Bot (Quick Responses)**
```json
{
  "modelId": "gpt-3.5-turbo",
  "maxTokens": 500,
  "temperature": 0.2,
  "timeout": 10,          // Short timeout for quick responses
  "maxRetries": 5
}
```

### Temperature Guide

| Temperature | Behavior | Use Case |
|-------------|----------|----------|
| **0.0 - 0.3** | Deterministic, focused | Customer support, factual Q&A, data extraction |
| **0.4 - 0.7** | Balanced | General chatbots, assistants |
| **0.8 - 1.2** | Creative | Content writing, brainstorming |
| **1.3 - 2.0** | Very creative | Creative writing, art generation |

---

## Status Lifecycle

### Status Values

```
┌─────────┐
│ active  │ ◄─── Agent is ready to accept tasks
└─────────┘
     │
     │ (receives task)
     ▼
┌────────┐
│  busy  │ ◄─── Agent is processing a task
└────────┘
     │
     │ (task completes or idle)
     ▼
┌─────────┐
│ active  │
└─────────┘
     │
     │ (manual deactivation or maintenance)
     ▼
┌──────────┐
│ inactive │ ◄─── Agent is not accepting tasks
└──────────┘
     │
     │ (reactivate)
     ▼
┌─────────┐
│ active  │
└─────────┘
```

### Status Rules

1. **active**
   - Agent is online and ready to accept tasks
   - Can transition to 'busy' when task is assigned
   - Can transition to 'inactive' via manual update

2. **busy**
   - Agent is currently processing a task
   - Cannot accept new tasks
   - Transitions back to 'active' when task completes

3. **inactive**
   - Agent is not accepting new tasks
   - Existing tasks may continue processing
   - Can be reactivated to 'active' status

### Performance Metrics Updates

Performance metrics are updated automatically:

```typescript
// When task completes successfully
totalTasks += 1
completedTasks += 1
averageResponseTime = (averageResponseTime * (totalTasks - 1) + taskResponseTime) / totalTasks
lastTask = new Date()
status = 'active'

// When task fails
totalTasks += 1
failedTasks += 1
lastTask = new Date()
status = 'active'

// Heartbeat (periodic health check)
lastHeartbeat = new Date()
```

---

## Validation Rules

### Field Validation

```typescript
// agentId validation
agentId: {
  required: true,
  unique: true,
  type: 'string'
}

// name validation
name: {
  required: true,
  type: 'string'
}

// description validation
description: {
  required: true,
  type: 'string'
}

// role validation
role: {
  required: true,
  type: 'string'
}

// status validation
status: {
  required: true,
  enum: ['active', 'inactive', 'busy']
}

// capabilities validation
capabilities: {
  required: true,
  type: 'array',
  items: { type: 'string' }
}

// configuration validation
configuration: {
  required: true,
  type: 'object',
  properties: {
    modelId: { required: true, type: 'string' },
    maxTokens: { required: true, type: 'number', min: 1 },
    temperature: { required: true, type: 'number', min: 0 },
    timeout: { required: true, type: 'number', min: 1 },
    maxRetries: { required: true, type: 'number', min: 0 }
  }
}

// nodeId validation
nodeId: {
  required: true,
  type: 'string'
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
    "agentId must be a string",
    "configuration.maxTokens must not be less than 1"
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

**404 Not Found** - Agent Not Found
```json
{
  "statusCode": 404,
  "message": "Agent with ID 507f1f77bcf86cd799439011 not found",
  "error": "Not Found"
}
```

**409 Conflict** - Duplicate agentId
```json
{
  "statusCode": 409,
  "message": "Agent with agentId 'agent-cs-001' already exists",
  "error": "Conflict"
}
```

### Error Handling in Frontend

```typescript
async function createAgent(data: CreateAgentDto) {
  try {
    const response = await fetch('/agents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();

      switch (response.status) {
        case 400:
          console.error('Validation error:', error.message);
          // Show validation errors to user
          break;
        case 404:
          console.error('Resource not found:', error.message);
          break;
        case 409:
          console.error('Agent ID already exists');
          // Suggest different agentId
          break;
        default:
          console.error('Unexpected error:', error);
      }
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create agent:', error);
    throw error;
  }
}
```

---

## UI Components Guide

### 1. Agent List Component

**Purpose**: Display paginated list of agents with filters and statistics

```typescript
interface AgentListProps {
  token: string;
  onSelect?: (agent: Agent) => void;
}

function AgentList({ token, onSelect }: AgentListProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    byStatus: { active: 0, inactive: 0, busy: 0 }
  });
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    role: '',
    tags: []
  });

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort: '-createdAt',
        populate: 'instruction'
      });

      const filterObj: any = {};
      if (filters.status !== 'all') filterObj.status = filters.status;
      if (filters.role) filterObj.role = filters.role;
      if (filters.tags.length > 0) filterObj.tags = { $in: filters.tags };

      if (Object.keys(filterObj).length > 0) {
        queryParams.append('filter', JSON.stringify(filterObj));
      }

      if (filters.search) {
        queryParams.append('search', filters.search);
      }

      const response = await fetch(
        `/agents?${queryParams}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const result = await response.json();
      setAgents(result.data);
      setPagination(result.pagination);
      setStatistics(result.statistics);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [pagination.page, filters]);

  return (
    <div className="agent-list">
      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search agents..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="busy">Busy</option>
        </select>
      </div>

      {/* Statistics */}
      <div className="statistics">
        <div className="stat-card">
          <div className="stat-value">{statistics.total}</div>
          <div className="stat-label">Total Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.byStatus.active}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.byStatus.busy}</div>
          <div className="stat-label">Busy</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.byStatus.inactive}</div>
          <div className="stat-label">Inactive</div>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="agent-cards">
        {loading ? (
          <div>Loading...</div>
        ) : (
          agents.map(agent => (
            <div
              key={agent._id}
              className="agent-card"
              onClick={() => onSelect?.(agent)}
            >
              <div className="agent-header">
                <h3>{agent.name}</h3>
                <span className={`status-badge ${agent.status}`}>
                  {agent.status}
                </span>
              </div>
              <p className="agent-description">{agent.description}</p>
              <div className="agent-meta">
                <span className="role">{agent.role}</span>
                <span className="node">Node: {agent.nodeId}</span>
              </div>
              <div className="agent-stats">
                <div className="stat">
                  <span className="label">Tasks:</span>
                  <span className="value">{agent.completedTasks}/{agent.totalTasks}</span>
                </div>
                <div className="stat">
                  <span className="label">Success Rate:</span>
                  <span className="value">
                    {agent.totalTasks > 0
                      ? ((agent.completedTasks / agent.totalTasks) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="stat">
                  <span className="label">Avg Response:</span>
                  <span className="value">{agent.averageResponseTime}ms</span>
                </div>
              </div>
              {agent.tags.length > 0 && (
                <div className="agent-tags">
                  {agent.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
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

### 2. Agent Form Component

**Purpose**: Create/Edit agent with configuration

```typescript
interface AgentFormProps {
  token: string;
  agent?: Agent;
  onSuccess?: (agent: Agent) => void;
  onCancel?: () => void;
}

function AgentForm({ token, agent, onSuccess, onCancel }: AgentFormProps) {
  const [formData, setFormData] = useState<CreateAgentDto>({
    agentId: agent?.agentId || '',
    name: agent?.name || '',
    description: agent?.description || '',
    role: agent?.role || '',
    status: agent?.status || 'active',
    capabilities: agent?.capabilities || [],
    configuration: agent?.configuration || {
      modelId: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7,
      timeout: 30,
      maxRetries: 3
    },
    instructionId: agent?.instructionId || '',
    nodeId: agent?.nodeId || '',
    permissions: agent?.permissions || [],
    tags: agent?.tags || []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.agentId) newErrors.agentId = 'Agent ID is required';
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.role) newErrors.role = 'Role is required';
    if (formData.capabilities.length === 0) {
      newErrors.capabilities = 'At least one capability is required';
    }
    if (!formData.nodeId) newErrors.nodeId = 'Node is required';

    // Configuration validation
    if (formData.configuration.maxTokens < 1) {
      newErrors.maxTokens = 'Max tokens must be at least 1';
    }
    if (formData.configuration.temperature < 0) {
      newErrors.temperature = 'Temperature must be at least 0';
    }
    if (formData.configuration.timeout < 1) {
      newErrors.timeout = 'Timeout must be at least 1 second';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const url = agent ? `/agents/${agent._id}` : '/agents';
      const method = agent ? 'PUT' : 'POST';

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
        throw error;
      }

      const result = await response.json();
      onSuccess?.(result);
    } catch (error: any) {
      console.error('Failed to save agent:', error);
      if (error.statusCode === 409) {
        setErrors({ ...errors, agentId: 'Agent ID already exists' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="agent-form">
      {/* Agent ID */}
      <div className="form-group">
        <label>Agent ID *</label>
        <input
          type="text"
          value={formData.agentId}
          onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
          disabled={!!agent}
          placeholder="agent-cs-001"
        />
        {errors.agentId && <span className="error">{errors.agentId}</span>}
      </div>

      {/* Name */}
      <div className="form-group">
        <label>Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Customer Support Agent"
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      {/* Description */}
      <div className="form-group">
        <label>Description *</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="AI agent for handling customer support inquiries"
          rows={3}
        />
        {errors.description && <span className="error">{errors.description}</span>}
      </div>

      {/* Role */}
      <div className="form-group">
        <label>Role *</label>
        <input
          type="text"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          placeholder="Customer Support"
        />
        {errors.role && <span className="error">{errors.role}</span>}
      </div>

      {/* Status */}
      <div className="form-group">
        <label>Status *</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="busy">Busy</option>
        </select>
      </div>

      {/* Configuration Section */}
      <fieldset className="config-section">
        <legend>Configuration</legend>

        <div className="form-group">
          <label>Model ID *</label>
          <input
            type="text"
            value={formData.configuration.modelId}
            onChange={(e) => setFormData({
              ...formData,
              configuration: { ...formData.configuration, modelId: e.target.value }
            })}
            placeholder="gpt-4"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Max Tokens *</label>
            <input
              type="number"
              min="1"
              value={formData.configuration.maxTokens}
              onChange={(e) => setFormData({
                ...formData,
                configuration: { ...formData.configuration, maxTokens: parseInt(e.target.value) }
              })}
            />
            {errors.maxTokens && <span className="error">{errors.maxTokens}</span>}
          </div>

          <div className="form-group">
            <label>Temperature *</label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={formData.configuration.temperature}
              onChange={(e) => setFormData({
                ...formData,
                configuration: { ...formData.configuration, temperature: parseFloat(e.target.value) }
              })}
            />
            {errors.temperature && <span className="error">{errors.temperature}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Timeout (seconds) *</label>
            <input
              type="number"
              min="1"
              value={formData.configuration.timeout}
              onChange={(e) => setFormData({
                ...formData,
                configuration: { ...formData.configuration, timeout: parseInt(e.target.value) }
              })}
            />
            {errors.timeout && <span className="error">{errors.timeout}</span>}
          </div>

          <div className="form-group">
            <label>Max Retries *</label>
            <input
              type="number"
              min="0"
              value={formData.configuration.maxRetries}
              onChange={(e) => setFormData({
                ...formData,
                configuration: { ...formData.configuration, maxRetries: parseInt(e.target.value) }
              })}
            />
          </div>
        </div>
      </fieldset>

      {/* Capabilities */}
      <div className="form-group">
        <label>Capabilities *</label>
        <input
          type="text"
          placeholder="chat, search, email (comma-separated)"
          value={formData.capabilities.join(', ')}
          onChange={(e) => setFormData({
            ...formData,
            capabilities: e.target.value.split(',').map(c => c.trim()).filter(c => c)
          })}
        />
        {errors.capabilities && <span className="error">{errors.capabilities}</span>}
      </div>

      {/* Tags */}
      <div className="form-group">
        <label>Tags</label>
        <input
          type="text"
          placeholder="production, vtv (comma-separated)"
          value={formData.tags.join(', ')}
          onChange={(e) => setFormData({
            ...formData,
            tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
          })}
        />
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (agent ? 'Update Agent' : 'Create Agent')}
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

## Example Requests

### 1. Create Agent

```bash
curl -X POST http://localhost:3003/agents \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-cs-001",
    "name": "Customer Support Agent",
    "description": "AI agent for handling customer support inquiries",
    "role": "Customer Support",
    "status": "active",
    "capabilities": ["chat", "search", "email"],
    "configuration": {
      "modelId": "gpt-4",
      "maxTokens": 2000,
      "temperature": 0.7,
      "timeout": 30,
      "maxRetries": 3
    },
    "instructionId": "507f1f77bcf86cd799439012",
    "nodeId": "507f1f77bcf86cd799439013",
    "permissions": ["read:docs", "write:logs"],
    "tags": ["production", "vtv"]
  }'
```

---

### 2. Get All Agents (with filters)

```bash
# Get all active agents
curl -X GET "http://localhost:3003/agents?filter={\"status\":\"active\"}&page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGc..."

# Search agents
curl -X GET "http://localhost:3003/agents?search=customer&sort=-createdAt" \
  -H "Authorization: Bearer eyJhbGc..."

# Get agents with instruction details
curl -X GET "http://localhost:3003/agents?populate=instruction" \
  -H "Authorization: Bearer eyJhbGc..."

# Filter by role
curl -X GET "http://localhost:3003/agents?filter={\"role\":\"Customer Support\"}" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 3. Get Agent by ID

```bash
# Without instruction details
curl -X GET http://localhost:3003/agents/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..."

# With instruction details
curl -X GET "http://localhost:3003/agents/507f1f77bcf86cd799439011?populate=instruction" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 4. Update Agent

```bash
curl -X PUT http://localhost:3003/agents/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Agent V2",
    "status": "active",
    "configuration": {
      "modelId": "gpt-4-turbo",
      "maxTokens": 3000,
      "temperature": 0.8,
      "timeout": 45,
      "maxRetries": 5
    }
  }'
```

---

### 5. Delete Agent

```bash
curl -X DELETE http://localhost:3003/agents/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## Developer Notes

### Key Design Decisions

1. **Unique agentId**
   - Each agent must have a unique `agentId` field
   - Different from MongoDB `_id`
   - Used for human-readable identification
   - Cannot be changed after creation

2. **Configuration Object**
   - Separate configuration object for model settings
   - All configuration fields are required
   - Validates constraints (min values)

3. **Performance Metrics**
   - Automatically tracked by system
   - Updated on task completion
   - Used for monitoring and analytics

4. **Instruction Integration**
   - Optional `instructionId` field
   - Can populate instruction details with `?populate=instruction`
   - Agent can work without instruction (uses default behavior)

5. **Node Assignment**
   - Required `nodeId` field
   - Agent runs on specified GPU node
   - Can be changed via update

### Common Use Cases

**1. Create Agent with Instruction**
```typescript
const agent = await createAgent({
  agentId: 'agent-cs-001',
  name: 'Customer Support Agent',
  description: 'Handles customer inquiries',
  role: 'Customer Support',
  status: 'active',
  capabilities: ['chat', 'search'],
  configuration: {
    modelId: 'gpt-4',
    maxTokens: 2000,
    temperature: 0.7,
    timeout: 30,
    maxRetries: 3
  },
  instructionId: 'instruction-id-here',
  nodeId: 'node-id-here',
  tags: ['production']
});
```

**2. Monitor Agent Performance**
```typescript
const agent = await fetchAgent(agentId);

const successRate = (agent.completedTasks / agent.totalTasks) * 100;
const avgResponseTime = agent.averageResponseTime;

console.log(`Success Rate: ${successRate}%`);
console.log(`Avg Response Time: ${avgResponseTime}ms`);
```

**3. Update Agent Configuration**
```typescript
await updateAgent(agentId, {
  configuration: {
    ...currentConfig,
    temperature: 0.9,  // Increase creativity
    maxTokens: 3000    // Allow longer responses
  }
});
```

### Performance Considerations

1. **Indexing**
   - Index on `agentId` for unique constraint
   - Index on `status` for filtering
   - Index on `nodeId` for node queries

2. **Pagination**
   - Use pagination for agent lists
   - Default limit: 10, max: 100

3. **Populate Instruction**
   - Only populate when needed (`?populate=instruction`)
   - Adds database query overhead

### Testing Checklist

- [ ] Create agent with all required fields
- [ ] Create agent with optional instruction
- [ ] Validate unique agentId constraint
- [ ] Validate configuration constraints (min values)
- [ ] List agents with pagination
- [ ] Search agents by keyword
- [ ] Filter by status
- [ ] Filter by role
- [ ] Filter by tags
- [ ] Get agent by ID
- [ ] Get agent with populated instruction
- [ ] Update agent configuration
- [ ] Update agent status
- [ ] Delete agent
- [ ] Verify performance metrics tracking
- [ ] Test authentication

---

**End of Document**
