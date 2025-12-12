# Agent API Documentation

## Overview

This document provides API documentation for the Agent module in AIWM service. Agents are AI assistants that execute instructions on nodes with guardrail protection.

**Base URL:** `http://localhost:3003`
**Authentication:** Bearer Token (JWT)

---

## Table of Contents

1. [Agent Endpoints](#agent-endpoints)
2. [Data Models](#data-models)
3. [Integration Examples](#integration-examples)
4. [Testing with cURL](#testing-with-curl)

---

## Agent Endpoints

### Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agents` | Create new agent |
| GET | `/agents` | Get all agents (paginated) |
| GET | `/agents/:id` | Get agent by ID |
| PUT | `/agents/:id` | Update agent |
| DELETE | `/agents/:id` | Delete agent (soft delete) |

---

### 1. Create Agent

**POST** `/agents`

Create a new AI agent.

**Request Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "VTV Customer Support Agent",
  "description": "Agent hỗ trợ khách hàng VTV 24/7 - trả lời câu hỏi về chương trình, lịch phát sóng",
  "status": "active",
  "instructionId": "6931e6c19ec77f4a38c4c5f2",
  "guardrailId": "6931e6c19ec77f4a38c4c5f5",
  "nodeId": "6931e6c19ec77f4a38c4c5f1",
  "tags": ["vtv", "customer-support", "production"]
}
```

**Field Descriptions:**
- `name` (required): Human-readable agent name
- `description` (required): Detailed description of agent's purpose
- `status` (required): Agent status - `"active"`, `"inactive"`, or `"busy"`
- `instructionId` (optional): Reference to Instruction that defines agent behavior
- `guardrailId` (optional): Reference to Guardrail for content filtering
- `nodeId` (required): Reference to Node where agent runs
- `tags` (optional): Array of tags for categorization

**Response (201 Created):**
```json
{
  "_id": "6931e6c19ec77f4a38c4c5f9",
  "name": "VTV Customer Support Agent",
  "description": "Agent hỗ trợ khách hàng VTV 24/7 - trả lời câu hỏi về chương trình, lịch phát sóng",
  "status": "active",
  "instructionId": "6931e6c19ec77f4a38c4c5f2",
  "guardrailId": "6931e6c19ec77f4a38c4c5f5",
  "nodeId": "6931e6c19ec77f4a38c4c5f1",
  "tags": ["vtv", "customer-support", "production"],
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
curl -X POST http://localhost:3003/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VTV Customer Support Agent",
    "description": "Agent hỗ trợ khách hàng VTV 24/7",
    "status": "active",
    "instructionId": "6931e6c19ec77f4a38c4c5f2",
    "guardrailId": "6931e6c19ec77f4a38c4c5f5",
    "nodeId": "6931e6c19ec77f4a38c4c5f1",
    "tags": ["vtv", "customer-support"]
  }'
```

---

### 2. Get All Agents (Paginated)

**GET** `/agents?page=1&limit=10&sortBy=createdAt&sortOrder=desc`

Get paginated list of agents with statistics.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order - 'asc' or 'desc' (default: desc)
- `status` (optional): Filter by status (active, inactive, busy)
- `tags` (optional): Filter by tags
- `populate` (optional): Set to `"instruction"` to include instruction details

**Response (200 OK):**
```json
{
  "data": [
    {
      "_id": "6931e6c19ec77f4a38c4c5f9",
      "name": "VTV Customer Support Agent",
      "description": "Agent hỗ trợ khách hàng VTV 24/7",
      "status": "active",
      "instructionId": "6931e6c19ec77f4a38c4c5f2",
      "guardrailId": "6931e6c19ec77f4a38c4c5f5",
      "nodeId": "6931e6c19ec77f4a38c4c5f1",
      "tags": ["vtv", "customer-support", "production"],
      "createdAt": "2025-01-01T10:00:00.000Z",
      "updatedAt": "2025-01-01T10:00:00.000Z"
    },
    {
      "_id": "6931e6c19ec77f4a38c4c5fa",
      "name": "VTV News Bot",
      "description": "Bot tin tức VTV",
      "status": "active",
      "instructionId": "6931e6c19ec77f4a38c4c5f3",
      "guardrailId": "6931e6c19ec77f4a38c4c5f7",
      "nodeId": "6931e6c19ec77f4a38c4c5f1",
      "tags": ["vtv", "news", "production"],
      "createdAt": "2025-01-01T10:05:00.000Z",
      "updatedAt": "2025-01-01T10:05:00.000Z"
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
      "inactive": 0,
      "busy": 0
    }
  }
}
```

**cURL Examples:**
```bash
# Get all agents
curl -X GET "http://localhost:3003/agents?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by status
curl -X GET "http://localhost:3003/agents?status=active" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get with instruction details populated
curl -X GET "http://localhost:3003/agents?populate=instruction" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Get Agent by ID

**GET** `/agents/:id`

Get a specific agent by ID.

**Query Parameters:**
- `populate` (optional): Set to `"instruction"` to include instruction details

**Response (200 OK):**
```json
{
  "_id": "6931e6c19ec77f4a38c4c5f9",
  "name": "VTV Customer Support Agent",
  "description": "Agent hỗ trợ khách hàng VTV 24/7 - trả lời câu hỏi về chương trình, lịch phát sóng",
  "status": "active",
  "instructionId": "6931e6c19ec77f4a38c4c5f2",
  "guardrailId": "6931e6c19ec77f4a38c4c5f5",
  "nodeId": "6931e6c19ec77f4a38c4c5f1",
  "tags": ["vtv", "customer-support", "production"],
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

**Response with populated instruction (200 OK):**
```json
{
  "_id": "6931e6c19ec77f4a38c4c5f9",
  "name": "VTV Customer Support Agent",
  "description": "Agent hỗ trợ khách hàng VTV 24/7",
  "status": "active",
  "instructionId": {
    "_id": "6931e6c19ec77f4a38c4c5f2",
    "name": "VTV Customer Support - General",
    "description": "Hướng dẫn cho chatbot hỗ trợ khách hàng VTV",
    "content": "Bạn là trợ lý ảo của VTV...",
    "status": "active"
  },
  "guardrailId": "6931e6c19ec77f4a38c4c5f5",
  "nodeId": "6931e6c19ec77f4a38c4c5f1",
  "tags": ["vtv", "customer-support", "production"],
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-01T10:00:00.000Z"
}
```

**cURL Examples:**
```bash
# Get agent by ID
curl -X GET http://localhost:3003/agents/6931e6c19ec77f4a38c4c5f9 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get agent with instruction details
curl -X GET "http://localhost:3003/agents/6931e6c19ec77f4a38c4c5f9?populate=instruction" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Update Agent

**PUT** `/agents/:id`

Update an existing agent.

**Request Body (all fields optional):**
```json
{
  "name": "VTV Customer Support Agent v2",
  "description": "Updated description",
  "status": "inactive",
  "instructionId": "6931e6c19ec77f4a38c4c5f3",
  "guardrailId": "6931e6c19ec77f4a38c4c5f6",
  "tags": ["vtv", "customer-support", "v2"]
}
```

**Response (200 OK):**
```json
{
  "_id": "6931e6c19ec77f4a38c4c5f9",
  "name": "VTV Customer Support Agent v2",
  "description": "Updated description",
  "status": "inactive",
  "instructionId": "6931e6c19ec77f4a38c4c5f3",
  "guardrailId": "6931e6c19ec77f4a38c4c5f6",
  "nodeId": "6931e6c19ec77f4a38c4c5f1",
  "tags": ["vtv", "customer-support", "v2"],
  "updatedBy": "691eba0851 7f917943ae1fa1",
  "updatedAt": "2025-01-01T11:00:00.000Z"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3003/agents/6931e6c19ec77f4a38c4c5f9 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive",
    "description": "Updated description"
  }'
```

---

### 5. Delete Agent

**DELETE** `/agents/:id`

Soft delete an agent.

**Response (200 OK):**
```json
{
  "message": "Agent deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3003/agents/6931e6c19ec77f4a38c4c5f9 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Data Models

### Agent Model (Simplified MVP Version)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| _id | ObjectId | Auto | MongoDB document ID |
| name | string | Yes | Human-readable agent name |
| description | string | Yes | Detailed description of agent purpose |
| status | enum | Yes | Agent status: `"active"`, `"inactive"`, `"busy"` |
| instructionId | string | No | Reference to Instruction (defines behavior) |
| guardrailId | string | No | Reference to Guardrail (content filtering) |
| nodeId | string | Yes | Reference to Node (where agent runs) |
| tags | string[] | No | Tags for categorization |
| owner | object | Auto | Ownership info (userId, orgId) |
| createdBy | string | Auto | User who created the agent |
| updatedBy | string | Auto | User who last updated |
| createdAt | Date | Auto | Creation timestamp |
| updatedAt | Date | Auto | Last update timestamp |
| isDeleted | boolean | Auto | Soft delete flag |

### Agent Status Values

- `"active"` - Agent is running and accepting requests
- `"inactive"` - Agent is stopped/paused
- `"busy"` - Agent is currently processing tasks

### Removed Fields (from Previous Version)

The following fields were removed in the MVP simplification:
- ❌ `agentId` - Use MongoDB `_id` instead
- ❌ `role` - Not needed for MVP
- ❌ `isActive` - Use `status` field instead
- ❌ `capabilities` - Not used in business logic
- ❌ `permissions` - Handled by IAM service
- ❌ Performance metrics (`totalTasks`, `completedTasks`, `failedTasks`, `averageResponseTime`, `averageLatency`)
- ❌ `lastTask`, `lastHeartbeat` - Will be tracked in Execution entities
- ❌ Embedded `guardrails` object - Now uses `guardrailId` reference to Guardrail module

---

## Integration Examples

### Frontend Integration (React/TypeScript)

#### 1. Service Layer

```typescript
// services/agent.service.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

export interface Agent {
  _id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'busy';
  instructionId?: string;
  guardrailId?: string;
  nodeId: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentDto {
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'busy';
  instructionId?: string;
  guardrailId?: string;
  nodeId: string;
  tags?: string[];
}

export interface UpdateAgentDto {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'busy';
  instructionId?: string;
  guardrailId?: string;
  tags?: string[];
}

export const getAllAgents = async (
  token: string,
  page: number = 1,
  limit: number = 10,
  status?: string,
  populate?: boolean
) => {
  const params: any = { page, limit };
  if (status) params.status = status;
  if (populate) params.populate = 'instruction';

  const response = await axios.get(`${API_BASE_URL}/agents`, {
    params,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getAgentById = async (
  token: string,
  id: string,
  populate?: boolean
): Promise<Agent> => {
  const params = populate ? { populate: 'instruction' } : {};
  const response = await axios.get(`${API_BASE_URL}/agents/${id}`, {
    params,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const createAgent = async (
  token: string,
  data: CreateAgentDto
): Promise<Agent> => {
  const response = await axios.post(`${API_BASE_URL}/agents`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

export const updateAgent = async (
  token: string,
  id: string,
  data: UpdateAgentDto
): Promise<Agent> => {
  const response = await axios.put(`${API_BASE_URL}/agents/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

export const deleteAgent = async (token: string, id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/agents/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
```

#### 2. React Components

```typescript
// components/AgentList.tsx
import React, { useEffect, useState } from 'react';
import { getAllAgents, Agent } from '../services/agent.service';

interface AgentListProps {
  token: string;
}

export const AgentList: React.FC<AgentListProps> = ({ token }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await getAllAgents(token, 1, 10);
        setAgents(response.data);
        setStatistics(response.statistics);
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [token]);

  if (loading) return <div>Loading agents...</div>;

  return (
    <div>
      <h2>AI Agents</h2>

      {statistics && (
        <div className="stats">
          <p>Total: {statistics.total}</p>
          <p>Active: {statistics.byStatus.active}</p>
          <p>Inactive: {statistics.byStatus.inactive}</p>
          <p>Busy: {statistics.byStatus.busy}</p>
        </div>
      )}

      <div className="agent-list">
        {agents.map((agent) => (
          <div key={agent._id} className="agent-card">
            <h3>{agent.name}</h3>
            <p>{agent.description}</p>
            <span className={`status status-${agent.status}`}>
              {agent.status}
            </span>
            <div className="tags">
              {agent.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

```typescript
// components/CreateAgentForm.tsx
import React, { useState } from 'react';
import { createAgent, CreateAgentDto } from '../services/agent.service';

interface CreateAgentFormProps {
  token: string;
  onSuccess: () => void;
}

export const CreateAgentForm: React.FC<CreateAgentFormProps> = ({ token, onSuccess }) => {
  const [formData, setFormData] = useState<CreateAgentDto>({
    name: '',
    description: '',
    status: 'active',
    nodeId: '',
    tags: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAgent(token, formData);
      onSuccess();
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Name:</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <label>Description:</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div>
        <label>Status:</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="busy">Busy</option>
        </select>
      </div>

      <div>
        <label>Node ID:</label>
        <input
          type="text"
          value={formData.nodeId}
          onChange={(e) => setFormData({ ...formData, nodeId: e.target.value })}
          required
        />
      </div>

      <div>
        <label>Instruction ID (optional):</label>
        <input
          type="text"
          value={formData.instructionId || ''}
          onChange={(e) => setFormData({ ...formData, instructionId: e.target.value })}
        />
      </div>

      <div>
        <label>Guardrail ID (optional):</label>
        <input
          type="text"
          value={formData.guardrailId || ''}
          onChange={(e) => setFormData({ ...formData, guardrailId: e.target.value })}
        />
      </div>

      <button type="submit">Create Agent</button>
    </form>
  );
};
```

---

## Testing with cURL

### Complete Testing Flow

```bash
# Set JWT Token
TOKEN="your_jwt_token_here"

# 1. Get all agents
curl -X GET "http://localhost:3003/agents?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# 2. Filter active agents
curl -X GET "http://localhost:3003/agents?status=active" \
  -H "Authorization: Bearer $TOKEN"

# 3. Get agents with instruction populated
curl -X GET "http://localhost:3003/agents?populate=instruction" \
  -H "Authorization: Bearer $TOKEN"

# 4. Get specific agent by ID
curl -X GET http://localhost:3003/agents/6931e6c19ec77f4a38c4c5f9 \
  -H "Authorization: Bearer $TOKEN"

# 5. Create new agent
curl -X POST http://localhost:3003/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "description": "Test agent for API testing",
    "status": "active",
    "nodeId": "6931e6c19ec77f4a38c4c5f1",
    "instructionId": "6931e6c19ec77f4a38c4c5f2",
    "guardrailId": "6931e6c19ec77f4a38c4c5f5",
    "tags": ["test", "demo"]
  }'

# 6. Update agent
curl -X PUT http://localhost:3003/agents/6931e6c19ec77f4a38c4c5f9 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive",
    "description": "Updated description"
  }'

# 7. Delete agent
curl -X DELETE http://localhost:3003/agents/6931e6c19ec77f4a38c4c5f9 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Integration with Related Modules

### Agent → Instruction
Agents reference Instructions to define their behavior:
```bash
# Get agent with instruction details
curl -X GET "http://localhost:3003/agents/AGENT_ID?populate=instruction" \
  -H "Authorization: Bearer $TOKEN"
```

### Agent → Guardrail
Agents reference Guardrails for content filtering:
```bash
# Get guardrail details
curl -X GET http://localhost:3003/guardrails/GUARDRAIL_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Agent → Node
Agents run on specific Nodes:
```bash
# Get node details
curl -X GET http://localhost:3003/nodes/NODE_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Common Use Cases

### 1. Create VTV Customer Support Agent
```bash
curl -X POST http://localhost:3003/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VTV Customer Support Agent",
    "description": "24/7 customer support for VTV viewers",
    "status": "active",
    "instructionId": "6931e6c19ec77f4a38c4c5f2",
    "guardrailId": "6931e6c19ec77f4a38c4c5f5",
    "nodeId": "6931e6c19ec77f4a38c4c5f1",
    "tags": ["vtv", "customer-support", "production"]
  }'
```

### 2. Get All Active VTV Agents
```bash
curl -X GET "http://localhost:3003/agents?status=active&tags=vtv" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Pause an Agent
```bash
curl -X PUT http://localhost:3003/agents/AGENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "inactive"}'
```

### 4. Update Agent's Guardrail
```bash
curl -X PUT http://localhost:3003/agents/AGENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"guardrailId": "NEW_GUARDRAIL_ID"}'
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["status must be one of: active, inactive, busy"],
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
  "message": "Agent with ID 6931e6c19ec77f4a38c4c5f9 not found",
  "error": "Not Found"
}
```

---

## Notes

1. **Authentication**: All endpoints require valid JWT token from IAM service
2. **Ownership**: Agents are automatically assigned to user's organization
3. **Soft Delete**: DELETE operations set `isDeleted: true` flag
4. **Pagination**: Default is 10 items per page
5. **Population**: Use `?populate=instruction` to include instruction details
6. **Status Enum**: Only accepts `"active"`, `"inactive"`, or `"busy"`
7. **References**: All ID fields (instructionId, guardrailId, nodeId) must be valid ObjectIds
8. **Tags**: Useful for filtering and categorization (e.g., "vtv", "production", "test")

---

## Related Documentation

- [PII & Guardrails API](./API-PII-GUARDRAILS.md)
- [Instruction API](./API-INSTRUCTION.md)
- [Node API](./API-NODE.md)

---

## Support

For issues or questions:
- API Documentation: http://localhost:3003/api-docs
- Health Check: http://localhost:3003/health
