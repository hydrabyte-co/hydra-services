# Instruction API - Frontend Integration Guide

**Service**: AIWM (AI Workload Management)
**Module**: Instruction
**Version**: 1.0
**Last Updated**: 2025-01-15

---

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Data Models](#data-models)
4. [Field Descriptions](#field-descriptions)
5. [Status Lifecycle](#status-lifecycle)
6. [Validation Rules](#validation-rules)
7. [Error Handling](#error-handling)
8. [UI Components Guide](#ui-components-guide)
9. [Example Requests](#example-requests)
10. [Developer Notes](#developer-notes)

---

## Overview

The **Instruction API** manages AI agent instructions that define behavior and guidelines for AI agents. Instructions contain system prompts, guidelines, and metadata for configuring agent behavior.

### Base URL
```
http://localhost:3003/instructions
```

### Authentication
All endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer <jwt_token>
```

### Key Features
- **Simple MVP Design**: Essential fields only (name, systemPrompt, guidelines, tags, status)
- **Dependency Validation**: Prevents deletion/deactivation of instructions used by active agents
- **Text Search**: Full-text search on name and description fields
- **Tag-based Organization**: Categorize instructions with tags
- **Statistics Aggregation**: Get counts by status

---

## API Endpoints

### 1. Create Instruction

**Endpoint**: `POST /instructions`
**Description**: Create a new instruction for AI agent behavior

**Request Body**:
```typescript
{
  name: string;              // Required, 1-200 chars
  description?: string;      // Optional, max 1000 chars
  systemPrompt: string;      // Required, min 10 chars
  guidelines?: string[];     // Optional array of guidelines
  tags?: string[];           // Optional array of tags
  status?: 'active' | 'inactive';  // Optional, default 'active'
}
```

**Response**: `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Customer Support Agent v1",
  "description": "Instructions for customer support AI agent",
  "systemPrompt": "You are a helpful customer support agent...",
  "guidelines": [
    "Always greet customers warmly",
    "Listen carefully to understand the issue",
    "Provide clear step-by-step solutions"
  ],
  "tags": ["customer-service", "support", "polite"],
  "status": "active",
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
- `name`: Required, 1-200 characters
- `systemPrompt`: Required, minimum 10 characters
- `description`: Optional, max 1000 characters
- `guidelines`: Optional array of strings
- `tags`: Optional array of strings
- `status`: Optional, must be 'active' or 'inactive' (default: 'active')

---

### 2. Get All Instructions

**Endpoint**: `GET /instructions`
**Description**: Retrieve all instructions with pagination and statistics

**Query Parameters**:
```typescript
{
  page?: number;        // Page number (default: 1)
  limit?: number;       // Items per page (default: 10, max: 100)
  search?: string;      // Search in name and description
  sort?: string;        // Sort field (e.g., 'createdAt', '-createdAt')
  filter?: object;      // MongoDB filter (e.g., { status: 'active' })
}
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Customer Support Agent v1",
      "description": "Instructions for customer support AI agent",
      "systemPrompt": "You are a helpful customer support agent...",
      "guidelines": [
        "Always greet customers warmly",
        "Listen carefully to understand the issue"
      ],
      "tags": ["customer-service", "support"],
      "status": "active",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
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
      "active": 20,
      "inactive": 5
    },
    "byType": {}
  }
}
```

**Common Filters**:
```typescript
// Get active instructions only
?filter={"status":"active"}

// Search by name or description
?search=customer

// Sort by creation date (newest first)
?sort=-createdAt

// Filter by tags
?filter={"tags":"customer-service"}

// Combine filters
?filter={"status":"active","tags":"support"}&page=1&limit=20
```

---

### 3. Get Instruction by ID

**Endpoint**: `GET /instructions/:id`
**Description**: Retrieve a single instruction by MongoDB ObjectId

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the instruction

**Response**: `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Customer Support Agent v1",
  "description": "Instructions for customer support AI agent",
  "systemPrompt": "You are a helpful customer support agent. Always be polite...",
  "guidelines": [
    "Always greet customers warmly",
    "Listen carefully to understand the issue",
    "Provide clear step-by-step solutions"
  ],
  "tags": ["customer-service", "support", "polite"],
  "status": "active",
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

**Error Responses**:
- `404 Not Found`: Instruction with given ID does not exist or is deleted

---

### 4. Update Instruction

**Endpoint**: `PUT /instructions/:id`
**Description**: Update an existing instruction (all fields optional)

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the instruction

**Request Body**: (All fields optional)
```typescript
{
  name?: string;              // 1-200 chars
  description?: string;       // Max 1000 chars
  systemPrompt?: string;      // Min 10 chars
  guidelines?: string[];      // Array of guidelines
  tags?: string[];            // Array of tags
  status?: 'active' | 'inactive';
}
```

**Response**: `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Customer Support Agent v2",
  "description": "Updated instructions for customer support AI agent",
  "systemPrompt": "Updated system prompt...",
  "guidelines": ["New guideline 1", "New guideline 2"],
  "tags": ["customer-service", "support", "empathetic"],
  "status": "active",
  "updatedBy": "507f1f77bcf86cd799439012",
  "updatedAt": "2025-01-15T11:00:00.000Z",
  ...
}
```

**Validation Rules**:
- Cannot deactivate instruction (`status: 'inactive'`) if it's being used by active agents
- Throws `409 Conflict` with list of dependent agents if validation fails

**Error Responses**:
- `404 Not Found`: Instruction does not exist
- `409 Conflict`: Instruction is in use by active agents (cannot deactivate)

---

### 5. Delete Instruction

**Endpoint**: `DELETE /instructions/:id`
**Description**: Soft delete an instruction (sets `deletedAt` timestamp)

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the instruction

**Response**: `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Customer Support Agent v1",
  "status": "inactive",
  "deletedAt": "2025-01-15T12:00:00.000Z",
  ...
}
```

**Validation Rules**:
- Cannot delete instruction if it's being used by active agents
- Throws `409 Conflict` with list of dependent agents if validation fails

**Error Responses**:
- `404 Not Found`: Instruction does not exist
- `409 Conflict`: Instruction is in use by active agents (cannot delete)

---

## Data Models

### TypeScript Interfaces

```typescript
/**
 * Instruction Entity
 * Defines behavior and guidelines for AI agents
 */
export interface Instruction {
  _id: string;                    // MongoDB ObjectId as string
  name: string;                   // Human-readable name
  description?: string;           // Detailed description
  systemPrompt: string;           // Main system prompt for agent
  guidelines: string[];           // Step-by-step rules/guidelines
  tags: string[];                 // Categorization tags
  status: 'active' | 'inactive';  // Status

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
 * Create Instruction DTO
 */
export interface CreateInstructionDto {
  name: string;                   // Required, 1-200 chars
  description?: string;           // Optional, max 1000 chars
  systemPrompt: string;           // Required, min 10 chars
  guidelines?: string[];          // Optional
  tags?: string[];                // Optional
  status?: 'active' | 'inactive'; // Optional, default 'active'
}

/**
 * Update Instruction DTO
 */
export interface UpdateInstructionDto {
  name?: string;                  // 1-200 chars
  description?: string;           // Max 1000 chars
  systemPrompt?: string;          // Min 10 chars
  guidelines?: string[];
  tags?: string[];
  status?: 'active' | 'inactive'; // Cannot set to 'inactive' if in use
}

/**
 * Paginated Response
 */
export interface InstructionListResponse {
  data: Instruction[];
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
    };
    byType: Record<string, any>;
  };
}

/**
 * Error Response (409 Conflict)
 */
export interface InstructionInUseError {
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
| `name` | `string` | Yes | Human-readable name for the instruction | 1-200 characters |
| `description` | `string` | No | Detailed description of the instruction | Max 1000 characters |
| `systemPrompt` | `string` | Yes | Main system prompt for the agent | Min 10 characters |
| `guidelines` | `string[]` | No | Step-by-step rules/guidelines | Array of strings |
| `tags` | `string[]` | No | Tags for categorizing instructions | Array of strings |
| `status` | `string` | No | Instruction status | `'active'` or `'inactive'` (default: `'active'`) |

### BaseSchema Fields (Inherited)

| Field | Type | Description |
|-------|------|-------------|
| `owner.userId` | `string` | User who owns the instruction |
| `owner.orgId` | `string` | Organization ID |
| `createdBy` | `string` | User ID who created the instruction |
| `updatedBy` | `string` | User ID who last updated the instruction |
| `deletedAt` | `Date \| null` | Soft delete timestamp (null if not deleted) |
| `metadata` | `object` | Custom metadata (extensible) |
| `createdAt` | `Date` | Creation timestamp |
| `updatedAt` | `Date` | Last update timestamp |

---

## Status Lifecycle

### Status Values

```
┌─────────┐
│ active  │ ◄─── Default status when created
└─────────┘
     │
     │ (manual update)
     ▼
┌──────────┐
│ inactive │ ◄─── Only if NOT used by active agents
└──────────┘
     │
     │ (can reactivate)
     ▼
┌─────────┐
│ active  │
└─────────┘
```

### Status Rules

1. **active** (Default)
   - Instruction can be used by agents
   - Can be assigned to new agents
   - Can be updated freely

2. **inactive**
   - Instruction cannot be assigned to new agents
   - Existing agent assignments are not affected
   - Cannot be set if instruction is in use by active agents
   - Can be reactivated to 'active' status

3. **Soft Delete** (via DELETE endpoint)
   - Sets `deletedAt` timestamp
   - Cannot delete if instruction is in use by active agents
   - Deleted instructions are hidden from normal queries

---

## Validation Rules

### Field Validation

```typescript
// Name validation
name: {
  required: true,
  minLength: 1,
  maxLength: 200,
  type: 'string'
}

// Description validation
description: {
  required: false,
  maxLength: 1000,
  type: 'string'
}

// System Prompt validation
systemPrompt: {
  required: true,
  minLength: 10,
  type: 'string'
}

// Guidelines validation
guidelines: {
  required: false,
  type: 'array',
  items: { type: 'string' }
}

// Tags validation
tags: {
  required: false,
  type: 'array',
  items: { type: 'string' }
}

// Status validation
status: {
  required: false,
  enum: ['active', 'inactive'],
  default: 'active'
}
```

### Business Logic Validation

**1. Update Status to 'inactive'**
```typescript
// Check if instruction is used by active agents
if (updateData.status === 'inactive') {
  const activeAgents = checkActiveAgentDependencies(instructionId);
  if (activeAgents.length > 0) {
    throw {
      statusCode: 409,
      message: 'Cannot deactivate instruction. It is in use by active agents.',
      details: {
        activeAgents: [...],
        action: 'deactivate'
      }
    };
  }
}
```

**2. Delete Instruction**
```typescript
// Check if instruction is used by active agents
const activeAgents = checkActiveAgentDependencies(instructionId);
if (activeAgents.length > 0) {
  throw {
    statusCode: 409,
    message: 'Cannot delete instruction. It is in use by active agents.',
    details: {
      activeAgents: [...],
      action: 'delete'
    }
  };
}
```

---

## Error Handling

### Standard Error Responses

**400 Bad Request** - Validation Error
```json
{
  "statusCode": 400,
  "message": ["name must be shorter than or equal to 200 characters"],
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

**404 Not Found** - Instruction Not Found
```json
{
  "statusCode": 404,
  "message": "Instruction with ID 507f1f77bcf86cd799439011 not found",
  "error": "Not Found"
}
```

**409 Conflict** - Instruction In Use
```json
{
  "statusCode": 409,
  "message": "Cannot delete instruction 'Customer Support Agent v1'. It is in use by 3 active agents: Sales Agent, Support Bot, FAQ Assistant",
  "error": "Conflict",
  "details": {
    "activeAgents": [
      { "id": "507f1f77bcf86cd799439021", "name": "Sales Agent" },
      { "id": "507f1f77bcf86cd799439022", "name": "Support Bot" },
      { "id": "507f1f77bcf86cd799439023", "name": "FAQ Assistant" }
    ],
    "action": "delete"
  }
}
```

### Error Handling in Frontend

```typescript
async function updateInstruction(id: string, data: UpdateInstructionDto) {
  try {
    const response = await fetch(`/instructions/${id}`, {
      method: 'PUT',
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
          console.error('Instruction not found');
          break;
        case 409:
          // Instruction is in use
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
    console.error('Failed to update instruction:', error);
    throw error;
  }
}
```

---

## UI Components Guide

### 1. Instruction List Component

**Purpose**: Display paginated list of instructions with search and filters

```typescript
interface InstructionListProps {
  token: string;
  onSelect?: (instruction: Instruction) => void;
}

function InstructionList({ token, onSelect }: InstructionListProps) {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    byStatus: { active: 0, inactive: 0 }
  });
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    tags: []
  });

  const fetchInstructions = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort: '-createdAt'
      });

      // Add filters
      if (filters.search) {
        queryParams.append('search', filters.search);
      }
      if (filters.status !== 'all') {
        queryParams.append('filter', JSON.stringify({ status: filters.status }));
      }

      const response = await fetch(
        `/instructions?${queryParams}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const result = await response.json();
      setInstructions(result.data);
      setPagination(result.pagination);
      setStatistics(result.statistics);
    } catch (error) {
      console.error('Failed to fetch instructions:', error);
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
          placeholder="Search instructions..."
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
        </select>
      </div>

      {/* Statistics */}
      <div className="statistics">
        <div>Total: {statistics.total}</div>
        <div>Active: {statistics.byStatus.active}</div>
        <div>Inactive: {statistics.byStatus.inactive}</div>
      </div>

      {/* Instruction List */}
      <div className="instruction-list">
        {loading ? (
          <div>Loading...</div>
        ) : (
          instructions.map(instruction => (
            <div key={instruction._id} onClick={() => onSelect?.(instruction)}>
              <h3>{instruction.name}</h3>
              <p>{instruction.description}</p>
              <div className="tags">
                {instruction.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
              <div className="status">{instruction.status}</div>
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

### 2. Instruction Form Component

**Purpose**: Create/Edit instruction with validation

```typescript
interface InstructionFormProps {
  token: string;
  instruction?: Instruction;  // If editing
  onSuccess?: (instruction: Instruction) => void;
  onCancel?: () => void;
}

function InstructionForm({ token, instruction, onSuccess, onCancel }: InstructionFormProps) {
  const [formData, setFormData] = useState<CreateInstructionDto>({
    name: instruction?.name || '',
    description: instruction?.description || '',
    systemPrompt: instruction?.systemPrompt || '',
    guidelines: instruction?.guidelines || [],
    tags: instruction?.tags || [],
    status: instruction?.status || 'active'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 1) {
      newErrors.name = 'Name is required (min 1 character)';
    }
    if (formData.name && formData.name.length > 200) {
      newErrors.name = 'Name must be max 200 characters';
    }
    if (!formData.systemPrompt || formData.systemPrompt.length < 10) {
      newErrors.systemPrompt = 'System prompt is required (min 10 characters)';
    }
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be max 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const url = instruction
        ? `/instructions/${instruction._id}`
        : '/instructions';

      const method = instruction ? 'PUT' : 'POST';

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
          // Instruction in use
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
      console.error('Failed to save instruction:', error);
    } finally {
      setLoading(false);
    }
  };

  const addGuideline = () => {
    setFormData({
      ...formData,
      guidelines: [...formData.guidelines, '']
    });
  };

  const updateGuideline = (index: number, value: string) => {
    const newGuidelines = [...formData.guidelines];
    newGuidelines[index] = value;
    setFormData({ ...formData, guidelines: newGuidelines });
  };

  const removeGuideline = (index: number) => {
    setFormData({
      ...formData,
      guidelines: formData.guidelines.filter((_, i) => i !== index)
    });
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
          maxLength={200}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      {/* Description */}
      <div>
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          maxLength={1000}
        />
        {errors.description && <span className="error">{errors.description}</span>}
      </div>

      {/* System Prompt */}
      <div>
        <label>System Prompt *</label>
        <textarea
          value={formData.systemPrompt}
          onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
          rows={5}
        />
        {errors.systemPrompt && <span className="error">{errors.systemPrompt}</span>}
      </div>

      {/* Guidelines */}
      <div>
        <label>Guidelines</label>
        {formData.guidelines.map((guideline, index) => (
          <div key={index}>
            <input
              type="text"
              value={guideline}
              onChange={(e) => updateGuideline(index, e.target.value)}
            />
            <button type="button" onClick={() => removeGuideline(index)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addGuideline}>
          Add Guideline
        </button>
      </div>

      {/* Tags */}
      <div>
        <label>Tags</label>
        <input
          type="text"
          placeholder="Enter tags separated by comma"
          value={formData.tags.join(', ')}
          onChange={(e) => setFormData({
            ...formData,
            tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
          })}
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
        </select>
      </div>

      {/* Actions */}
      <div>
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (instruction ? 'Update' : 'Create')}
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

### 3. Instruction Detail Component

**Purpose**: Display full instruction details with actions

```typescript
interface InstructionDetailProps {
  token: string;
  instructionId: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

function InstructionDetail({ token, instructionId, onEdit, onDelete }: InstructionDetailProps) {
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInstruction();
  }, [instructionId]);

  const fetchInstruction = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/instructions/${instructionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch instruction');
      }

      const data = await response.json();
      setInstruction(data);
    } catch (error) {
      console.error('Failed to fetch instruction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this instruction?')) {
      return;
    }

    try {
      const response = await fetch(`/instructions/${instructionId}`, {
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
      console.error('Failed to delete instruction:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!instruction) return <div>Instruction not found</div>;

  return (
    <div className="instruction-detail">
      {/* Header */}
      <div className="header">
        <h1>{instruction.name}</h1>
        <div className="actions">
          <button onClick={onEdit}>Edit</button>
          <button onClick={handleDelete} className="danger">Delete</button>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`status-badge ${instruction.status}`}>
        {instruction.status}
      </div>

      {/* Description */}
      {instruction.description && (
        <div className="section">
          <h3>Description</h3>
          <p>{instruction.description}</p>
        </div>
      )}

      {/* System Prompt */}
      <div className="section">
        <h3>System Prompt</h3>
        <pre>{instruction.systemPrompt}</pre>
      </div>

      {/* Guidelines */}
      {instruction.guidelines.length > 0 && (
        <div className="section">
          <h3>Guidelines</h3>
          <ol>
            {instruction.guidelines.map((guideline, index) => (
              <li key={index}>{guideline}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Tags */}
      {instruction.tags.length > 0 && (
        <div className="section">
          <h3>Tags</h3>
          <div className="tags">
            {instruction.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="section metadata">
        <h3>Metadata</h3>
        <table>
          <tbody>
            <tr>
              <td>ID:</td>
              <td>{instruction._id}</td>
            </tr>
            <tr>
              <td>Created:</td>
              <td>{new Date(instruction.createdAt).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Updated:</td>
              <td>{new Date(instruction.updatedAt).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Created By:</td>
              <td>{instruction.createdBy}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### 4. Instruction Selector Component

**Purpose**: Select instruction for agent assignment

```typescript
interface InstructionSelectorProps {
  token: string;
  value?: string;  // Selected instruction ID
  onChange: (instructionId: string) => void;
  statusFilter?: 'active' | 'inactive' | 'all';
}

function InstructionSelector({
  token,
  value,
  onChange,
  statusFilter = 'active'
}: InstructionSelectorProps) {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInstructions();
  }, [statusFilter]);

  const fetchInstructions = async () => {
    setLoading(true);
    try {
      const filter = statusFilter !== 'all'
        ? `?filter=${JSON.stringify({ status: statusFilter })}`
        : '';

      const response = await fetch(`/instructions${filter}&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      setInstructions(result.data);
    } catch (error) {
      console.error('Failed to fetch instructions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
    >
      <option value="">Select an instruction...</option>
      {instructions.map(instruction => (
        <option key={instruction._id} value={instruction._id}>
          {instruction.name} ({instruction.status})
        </option>
      ))}
    </select>
  );
}
```

---

## Example Requests

### 1. Create Instruction

```bash
curl -X POST http://localhost:3003/instructions \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Agent v1",
    "description": "Instructions for customer support AI agent",
    "systemPrompt": "You are a helpful customer support agent. Always be polite, professional, and empathetic.",
    "guidelines": [
      "Always greet customers warmly",
      "Listen carefully to understand the issue",
      "Provide clear step-by-step solutions"
    ],
    "tags": ["customer-service", "support", "polite"],
    "status": "active"
  }'
```

---

### 2. Get All Instructions (with filters)

```bash
# Get all active instructions
curl -X GET "http://localhost:3003/instructions?filter={\"status\":\"active\"}&page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGc..."

# Search instructions
curl -X GET "http://localhost:3003/instructions?search=customer&sort=-createdAt" \
  -H "Authorization: Bearer eyJhbGc..."

# Filter by tags
curl -X GET "http://localhost:3003/instructions?filter={\"tags\":\"support\"}" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 3. Get Instruction by ID

```bash
curl -X GET http://localhost:3003/instructions/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 4. Update Instruction

```bash
curl -X PUT http://localhost:3003/instructions/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Agent v2",
    "systemPrompt": "Updated system prompt for customer support...",
    "guidelines": [
      "New guideline 1",
      "New guideline 2"
    ],
    "tags": ["customer-service", "support", "empathetic"]
  }'
```

---

### 5. Deactivate Instruction

```bash
curl -X PUT http://localhost:3003/instructions/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive"
  }'
```

**Note**: This will fail with `409 Conflict` if the instruction is in use by active agents.

---

### 6. Delete Instruction

```bash
curl -X DELETE http://localhost:3003/instructions/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..."
```

**Note**: This will fail with `409 Conflict` if the instruction is in use by active agents.

---

## Developer Notes

### Key Design Decisions

1. **Simple MVP Design**
   - Only essential fields (name, systemPrompt, guidelines, tags, status)
   - No complex versioning or history tracking
   - Focus on basic CRUD operations

2. **Dependency Validation**
   - Prevents deletion/deactivation of instructions used by active agents
   - Returns list of dependent agents in error response
   - Frontend should display these agents to user

3. **Text Search Support**
   - Full-text search on `name` and `description` fields
   - Use MongoDB text indexes for performance
   - Query parameter: `?search=keyword`

4. **Tag-based Organization**
   - Free-form string array for tags
   - No predefined taxonomy
   - Can filter by tags: `?filter={"tags":"support"}`

5. **Statistics Aggregation**
   - Automatically computed on `findAll` endpoint
   - Includes counts by status
   - Useful for dashboard widgets

### Common Use Cases

**1. Agent Assignment**
```typescript
// Fetch active instructions for dropdown
const instructions = await fetch('/instructions?filter={"status":"active"}&limit=100');

// Assign to agent
await fetch('/agents', {
  method: 'POST',
  body: JSON.stringify({
    name: 'My Agent',
    instructionId: selectedInstructionId,
    ...
  })
});
```

**2. Instruction Management**
```typescript
// Create new instruction
const newInstruction = await createInstruction({
  name: 'New Instruction',
  systemPrompt: 'System prompt...',
  guidelines: ['Guideline 1', 'Guideline 2'],
  tags: ['tag1', 'tag2'],
  status: 'active'
});

// Update instruction
await updateInstruction(instructionId, {
  systemPrompt: 'Updated prompt...'
});

// Deactivate (if not in use)
await updateInstruction(instructionId, {
  status: 'inactive'
});

// Delete (if not in use)
await deleteInstruction(instructionId);
```

**3. Handling Dependencies**
```typescript
try {
  await updateInstruction(id, { status: 'inactive' });
} catch (error) {
  if (error.statusCode === 409) {
    // Show list of dependent agents
    const agents = error.details.activeAgents;
    showAlert(`Cannot deactivate. Used by: ${agents.map(a => a.name).join(', ')}`);
  }
}
```

### Performance Considerations

1. **Indexing**
   - Index on `status` and `createdAt` for list queries
   - Text index on `name` and `description` for search
   - Index on `tags` for tag filtering

2. **Pagination**
   - Use pagination for large datasets (default limit: 10, max: 100)
   - Always provide page/limit parameters for predictable performance

3. **Caching**
   - Instructions are relatively static, consider caching active instructions
   - Cache TTL: 5-10 minutes recommended
   - Invalidate cache on create/update/delete

### Testing Checklist

- [ ] Create instruction with all fields
- [ ] Create instruction with minimal fields (name + systemPrompt)
- [ ] Validate field constraints (name length, systemPrompt length, etc.)
- [ ] List instructions with pagination
- [ ] Search instructions by keyword
- [ ] Filter by status (active/inactive)
- [ ] Filter by tags
- [ ] Get instruction by ID
- [ ] Update instruction fields
- [ ] Try to deactivate instruction in use (should fail with 409)
- [ ] Deactivate instruction not in use (should succeed)
- [ ] Try to delete instruction in use (should fail with 409)
- [ ] Delete instruction not in use (should succeed)
- [ ] Verify statistics aggregation
- [ ] Test authentication (missing/invalid token)

---

**End of Document**
