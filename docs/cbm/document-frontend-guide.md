# Document API - Frontend Integration Guide

**Service**: CBM (Core Business Management)
**Module**: Document
**Version**: 1.0
**Last Updated**: 2025-12-05

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

The **Document API** manages user and AI agent generated documents with support for multiple content types (HTML, Text, Markdown, JSON). Documents can be categorized with labels and have flexible access control.

### Base URL
```
http://localhost:3360/documents
```

### Authentication
All endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer <jwt_token>
```

### Key Features
- **Multiple Content Types**: HTML, Text, Markdown, JSON with appropriate MIME types
- **Content Separation**: Content field excluded from list/detail endpoints for performance
- **Dedicated Content Endpoint**: GET `/documents/:id/content` returns raw content with MIME type
- **Label-based Organization**: Categorize documents with flexible tags
- **Statistics Aggregation**: Get counts by status and type
- **Full-text Search**: Search on summary and content fields

---

## API Endpoints

### 1. Create Document

**Endpoint**: `POST /documents`
**Description**: Create a new document

**Request Body**:
```typescript
{
  summary: string;              // Required, max 500 chars
  content: string;              // Required, min 1 char
  type: 'html' | 'text' | 'markdown' | 'json';  // Required
  labels: string[];             // Required, array of strings
  status?: 'draft' | 'published' | 'archived';  // Optional, default 'draft'
  scope?: 'public' | 'org' | 'private';         // Optional, default 'private'
}
```

**Response**: `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "summary": "API Integration Guide",
  "content": "This guide explains how to integrate with our REST API...",
  "type": "markdown",
  "labels": ["api", "guide", "integration"],
  "status": "draft",
  "scope": "private",
  "owner": {
    "userId": "507f1f77bcf86cd799439012",
    "orgId": "507f1f77bcf86cd799439013"
  },
  "createdBy": "507f1f77bcf86cd799439012",
  "updatedBy": "507f1f77bcf86cd799439012",
  "deletedAt": null,
  "metadata": {},
  "createdAt": "2025-12-05T10:30:00.000Z",
  "updatedAt": "2025-12-05T10:30:00.000Z"
}
```

**Validation Rules**:
- `summary`: Required, 1-500 characters
- `content`: Required, minimum 1 character
- `type`: Required, must be one of: 'html', 'text', 'markdown', 'json'
- `labels`: Required array of strings
- `status`: Optional, must be 'draft', 'published', or 'archived' (default: 'draft')
- `scope`: Optional, must be 'public', 'org', or 'private' (default: 'private')

---

### 2. Get Document Content

**Endpoint**: `GET /documents/:id/content`
**Description**: Retrieve raw document content with appropriate MIME type

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the document

**Response**: `200 OK` with raw content

**Response Headers**:
```
Content-Type: text/html; charset=utf-8          (for type: 'html')
Content-Type: text/plain; charset=utf-8         (for type: 'text')
Content-Type: text/markdown; charset=utf-8      (for type: 'markdown')
Content-Type: application/json; charset=utf-8   (for type: 'json')
```

**Response Body**: Raw content (not JSON)
```
This guide explains how to integrate with our REST API...
```

**Use Cases**:
- Display HTML in iframe: `<iframe src="/documents/{id}/content" />`
- Fetch and render: Parse content-type and render accordingly
- Download document: Save to file with appropriate extension

**Error Responses**:
- `404 Not Found`: Document with given ID does not exist or is deleted

---

### 3. Get All Documents

**Endpoint**: `GET /documents`
**Description**: Retrieve all documents with pagination and statistics

**Query Parameters**:
```typescript
{
  page?: number;        // Page number (default: 1)
  limit?: number;       // Items per page (default: 10, max: 100)
  search?: string;      // Search in summary and content
  sort?: string;        // Sort field (e.g., 'createdAt', '-createdAt')
  filter?: object;      // MongoDB filter (e.g., { status: 'published' })
}
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "summary": "API Integration Guide",
      // NOTE: content field is EXCLUDED for performance
      "type": "markdown",
      "labels": ["api", "guide", "integration"],
      "status": "draft",
      "scope": "private",
      "createdAt": "2025-12-05T10:30:00.000Z",
      "updatedAt": "2025-12-05T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  },
  "statistics": {
    "total": 45,
    "byStatus": {
      "draft": 20,
      "published": 15,
      "archived": 10
    },
    "byType": {
      "markdown": 25,
      "html": 10,
      "text": 8,
      "json": 2
    }
  }
}
```

**Common Filters**:
```typescript
// Get published documents only
?filter={"status":"published"}

// Search by summary or content
?search=integration

// Sort by creation date (newest first)
?sort=-createdAt

// Filter by labels
?filter={"labels":"api"}

// Filter by type
?filter={"type":"markdown"}

// Combine filters
?filter={"status":"published","type":"markdown"}&page=1&limit=20
```

**Important Note**:
- The `content` field is **excluded** from this endpoint to improve performance
- Use `GET /documents/:id/content` to fetch the actual content

---

### 4. Get Document by ID

**Endpoint**: `GET /documents/:id`
**Description**: Retrieve a single document by MongoDB ObjectId

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the document

**Response**: `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "summary": "API Integration Guide",
  // NOTE: content field is EXCLUDED
  "type": "markdown",
  "labels": ["api", "guide", "integration"],
  "status": "draft",
  "scope": "private",
  "owner": {
    "userId": "507f1f77bcf86cd799439012",
    "orgId": "507f1f77bcf86cd799439013"
  },
  "createdBy": "507f1f77bcf86cd799439012",
  "updatedBy": "507f1f77bcf86cd799439012",
  "deletedAt": null,
  "metadata": {},
  "createdAt": "2025-12-05T10:30:00.000Z",
  "updatedAt": "2025-12-05T10:30:00.000Z"
}
```

**Important Note**:
- The `content` field is **excluded** from this endpoint
- Use `GET /documents/:id/content` to fetch the actual content

**Error Responses**:
- `404 Not Found`: Document with given ID does not exist or is deleted

---

### 5. Update Document

**Endpoint**: `PATCH /documents/:id`
**Description**: Update an existing document (all fields optional)

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the document

**Request Body**: (All fields optional)
```typescript
{
  summary?: string;              // Max 500 chars
  content?: string;              // Min 1 char
  type?: 'html' | 'text' | 'markdown' | 'json';
  labels?: string[];             // Array of strings
  status?: 'draft' | 'published' | 'archived';
  scope?: 'public' | 'org' | 'private';
}
```

**Response**: `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "summary": "Updated API Integration Guide",
  "content": "Updated content...",
  "type": "markdown",
  "labels": ["api", "guide", "integration", "rest"],
  "status": "published",
  "scope": "org",
  "updatedBy": "507f1f77bcf86cd799439012",
  "updatedAt": "2025-12-05T11:00:00.000Z",
  ...
}
```

**Error Responses**:
- `404 Not Found`: Document does not exist

---

### 6. Delete Document

**Endpoint**: `DELETE /documents/:id`
**Description**: Soft delete a document (sets `deletedAt` timestamp)

**Path Parameters**:
- `id` (string): MongoDB ObjectId of the document

**Response**: `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "summary": "API Integration Guide",
  "status": "archived",
  "deletedAt": "2025-12-05T12:00:00.000Z",
  ...
}
```

**Error Responses**:
- `404 Not Found`: Document does not exist

---

## Data Models

### TypeScript Interfaces

```typescript
/**
 * Document Entity
 */
export interface Document {
  _id: string;                    // MongoDB ObjectId as string
  summary: string;                // Document title/summary
  content: string;                // Main content (excluded in list/detail endpoints)
  type: 'html' | 'text' | 'markdown' | 'json';  // Content type
  labels: string[];               // Categorization labels
  status: 'draft' | 'published' | 'archived';   // Document status
  scope: 'public' | 'org' | 'private';          // Access control

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
 * Create Document DTO
 */
export interface CreateDocumentDto {
  summary: string;                // Required, max 500 chars
  content: string;                // Required, min 1 char
  type: 'html' | 'text' | 'markdown' | 'json';  // Required
  labels: string[];               // Required
  status?: 'draft' | 'published' | 'archived';  // Optional, default 'draft'
  scope?: 'public' | 'org' | 'private';         // Optional, default 'private'
}

/**
 * Update Document DTO
 */
export interface UpdateDocumentDto {
  summary?: string;               // Max 500 chars
  content?: string;               // Min 1 char
  type?: 'html' | 'text' | 'markdown' | 'json';
  labels?: string[];
  status?: 'draft' | 'published' | 'archived';
  scope?: 'public' | 'org' | 'private';
}

/**
 * Paginated Response
 */
export interface DocumentListResponse {
  data: Omit<Document, 'content'>[];  // Content field excluded
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  statistics: {
    total: number;
    byStatus: {
      draft: number;
      published: number;
      archived: number;
    };
    byType: {
      html: number;
      text: number;
      markdown: number;
      json: number;
    };
  };
}

/**
 * MIME Type Mapping
 */
export const MIME_TYPE_MAP: Record<string, string> = {
  html: 'text/html',
  text: 'text/plain',
  markdown: 'text/markdown',
  json: 'application/json',
};
```

---

## Field Descriptions

### Core Fields

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `_id` | `string` | Auto | MongoDB ObjectId as string | Generated by database |
| `summary` | `string` | Yes | Document title/summary | 1-500 characters |
| `content` | `string` | Yes | Main document content | Min 1 character, excluded in list/detail |
| `type` | `string` | Yes | Content type | 'html', 'text', 'markdown', 'json' |
| `labels` | `string[]` | Yes | Categorization labels | Array of strings |
| `status` | `string` | No | Document status | 'draft', 'published', 'archived' (default: 'draft') |
| `scope` | `string` | No | Access control | 'public', 'org', 'private' (default: 'private') |

### BaseSchema Fields (Inherited)

| Field | Type | Description |
|-------|------|-------------|
| `owner.userId` | `string` | User who owns the document |
| `owner.orgId` | `string` | Organization ID |
| `createdBy` | `string` | User ID who created the document |
| `updatedBy` | `string` | User ID who last updated the document |
| `deletedAt` | `Date \| null` | Soft delete timestamp (null if not deleted) |
| `metadata` | `object` | Custom metadata (extensible) |
| `createdAt` | `Date` | Creation timestamp |
| `updatedAt` | `Date` | Last update timestamp |

---

## Status Lifecycle

### Status Values

```
┌─────────┐
│  draft  │ ◄─── Default status when created
└─────────┘
     │
     │ (manual update)
     ▼
┌───────────┐
│ published │ ◄─── Ready for consumption
└───────────┘
     │
     │ (manual update)
     ▼
┌──────────┐
│ archived │ ◄─── No longer active
└──────────┘
```

### Status Rules

1. **draft** (Default)
   - Document is being edited
   - Not visible in public listings
   - Can be updated freely

2. **published**
   - Document is ready for consumption
   - Visible based on scope setting
   - Can still be updated or archived

3. **archived**
   - Document is no longer active
   - Hidden from normal listings
   - Can be reactivated or permanently deleted

4. **Soft Delete** (via DELETE endpoint)
   - Sets `deletedAt` timestamp
   - Deleted documents are hidden from all queries
   - Can potentially be restored (backend implementation dependent)

---

## Validation Rules

### Field Validation

```typescript
// Summary validation
summary: {
  required: true,
  minLength: 1,
  maxLength: 500,
  type: 'string'
}

// Content validation
content: {
  required: true,
  minLength: 1,
  type: 'string'
}

// Type validation
type: {
  required: true,
  enum: ['html', 'text', 'markdown', 'json']
}

// Labels validation
labels: {
  required: true,
  type: 'array',
  items: { type: 'string' }
}

// Status validation
status: {
  required: false,
  enum: ['draft', 'published', 'archived'],
  default: 'draft'
}

// Scope validation
scope: {
  required: false,
  enum: ['public', 'org', 'private'],
  default: 'private'
}
```

---

## Error Handling

### Standard Error Responses

**400 Bad Request** - Validation Error
```json
{
  "statusCode": 400,
  "message": ["summary must be shorter than or equal to 500 characters"],
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

**404 Not Found** - Document Not Found
```json
{
  "statusCode": 404,
  "message": "Document with ID 507f1f77bcf86cd799439011 not found",
  "error": "Not Found"
}
```

### Error Handling in Frontend

```typescript
async function fetchDocument(id: string, token: string) {
  try {
    const response = await fetch(`/documents/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle specific error cases
      switch (response.status) {
        case 400:
          console.error('Validation error:', error.message);
          break;
        case 404:
          console.error('Document not found');
          break;
        default:
          console.error('Unexpected error:', error);
      }
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch document:', error);
    throw error;
  }
}
```

---

## UI Components Guide

### 1. Document List Component

**Purpose**: Display paginated list of documents with search and filters

```typescript
interface DocumentListProps {
  token: string;
  onSelect?: (document: Document) => void;
}

function DocumentList({ token, onSelect }: DocumentListProps) {
  const [documents, setDocuments] = useState<Omit<Document, 'content'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    byStatus: { draft: 0, published: 0, archived: 0 },
    byType: { html: 0, text: 0, markdown: 0, json: 0 }
  });
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    labels: []
  });

  const fetchDocuments = async () => {
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

      const filterObj: any = {};
      if (filters.status !== 'all') {
        filterObj.status = filters.status;
      }
      if (filters.type !== 'all') {
        filterObj.type = filters.type;
      }
      if (Object.keys(filterObj).length > 0) {
        queryParams.append('filter', JSON.stringify(filterObj));
      }

      const response = await fetch(
        `/documents?${queryParams}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const result = await response.json();
      setDocuments(result.data);
      setPagination(result.pagination);
      setStatistics(result.statistics);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [pagination.page, filters]);

  return (
    <div>
      {/* Search and Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search documents..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="all">All Types</option>
          <option value="html">HTML</option>
          <option value="text">Text</option>
          <option value="markdown">Markdown</option>
          <option value="json">JSON</option>
        </select>
      </div>

      {/* Statistics */}
      <div className="statistics">
        <div>Total: {statistics.total}</div>
        <div>Draft: {statistics.byStatus.draft}</div>
        <div>Published: {statistics.byStatus.published}</div>
        <div>Archived: {statistics.byStatus.archived}</div>
      </div>

      {/* Document List */}
      <div className="document-list">
        {loading ? (
          <div>Loading...</div>
        ) : (
          documents.map(doc => (
            <div
              key={doc._id}
              onClick={() => onSelect?.(doc as Document)}
              className="document-item"
            >
              <h3>{doc.summary}</h3>
              <div className="meta">
                <span className="type">{doc.type}</span>
                <span className="status">{doc.status}</span>
              </div>
              <div className="labels">
                {doc.labels.map(label => (
                  <span key={label} className="label">{label}</span>
                ))}
              </div>
              <div className="date">
                {new Date(doc.createdAt).toLocaleDateString()}
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

### 2. Document Form Component

**Purpose**: Create/Edit document with validation

```typescript
interface DocumentFormProps {
  token: string;
  document?: Document;  // If editing
  onSuccess?: (document: Document) => void;
  onCancel?: () => void;
}

function DocumentForm({ token, document, onSuccess, onCancel }: DocumentFormProps) {
  const [formData, setFormData] = useState<CreateDocumentDto>({
    summary: document?.summary || '',
    content: document?.content || '',
    type: document?.type || 'text',
    labels: document?.labels || [],
    status: document?.status || 'draft',
    scope: document?.scope || 'private'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.summary || formData.summary.length < 1) {
      newErrors.summary = 'Summary is required (min 1 character)';
    }
    if (formData.summary && formData.summary.length > 500) {
      newErrors.summary = 'Summary must be max 500 characters';
    }
    if (!formData.content || formData.content.length < 1) {
      newErrors.content = 'Content is required (min 1 character)';
    }
    if (!formData.type) {
      newErrors.type = 'Type is required';
    }
    if (!formData.labels || formData.labels.length === 0) {
      newErrors.labels = 'At least one label is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const url = document
        ? `/documents/${document._id}`
        : '/documents';

      const method = document ? 'PATCH' : 'POST';

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
        alert(`Error: ${error.message}`);
      } else {
        const result = await response.json();
        onSuccess?.(result);
      }
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Summary */}
      <div>
        <label>Summary *</label>
        <input
          type="text"
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          maxLength={500}
        />
        {errors.summary && <span className="error">{errors.summary}</span>}
      </div>

      {/* Type */}
      <div>
        <label>Type *</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
        >
          <option value="text">Text</option>
          <option value="html">HTML</option>
          <option value="markdown">Markdown</option>
          <option value="json">JSON</option>
        </select>
        {errors.type && <span className="error">{errors.type}</span>}
      </div>

      {/* Content */}
      <div>
        <label>Content *</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={10}
        />
        {errors.content && <span className="error">{errors.content}</span>}
      </div>

      {/* Labels */}
      <div>
        <label>Labels *</label>
        <input
          type="text"
          placeholder="Enter labels separated by comma"
          value={formData.labels.join(', ')}
          onChange={(e) => setFormData({
            ...formData,
            labels: e.target.value.split(',').map(t => t.trim()).filter(t => t)
          })}
        />
        {errors.labels && <span className="error">{errors.labels}</span>}
      </div>

      {/* Status */}
      <div>
        <label>Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Scope */}
      <div>
        <label>Scope</label>
        <select
          value={formData.scope}
          onChange={(e) => setFormData({ ...formData, scope: e.target.value as any })}
        >
          <option value="private">Private</option>
          <option value="org">Organization</option>
          <option value="public">Public</option>
        </select>
      </div>

      {/* Actions */}
      <div>
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (document ? 'Update' : 'Create')}
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

### 3. Document Viewer Component

**Purpose**: Display document content with appropriate rendering

```typescript
interface DocumentViewerProps {
  token: string;
  documentId: string;
}

function DocumentViewer({ token, documentId }: DocumentViewerProps) {
  const [document, setDocument] = useState<Omit<Document, 'content'> | null>(null);
  const [content, setContent] = useState<string>('');
  const [contentType, setContentType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDocumentMetadata();
    fetchDocumentContent();
  }, [documentId]);

  const fetchDocumentMetadata = async () => {
    try {
      const response = await fetch(`/documents/${documentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      const data = await response.json();
      setDocument(data);
    } catch (error) {
      console.error('Failed to fetch document metadata:', error);
    }
  };

  const fetchDocumentContent = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/documents/${documentId}/content`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const type = response.headers.get('Content-Type') || 'text/plain';
      const text = await response.text();

      setContentType(type);
      setContent(text);
    } catch (error) {
      console.error('Failed to fetch document content:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) return <div>Loading content...</div>;

    if (contentType.includes('text/html')) {
      // Render HTML
      return (
        <div
          className="html-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    } else if (contentType.includes('text/markdown')) {
      // Render Markdown (using a markdown library like react-markdown)
      return <ReactMarkdown>{content}</ReactMarkdown>;
    } else if (contentType.includes('application/json')) {
      // Render formatted JSON
      try {
        const jsonObj = JSON.parse(content);
        return <pre>{JSON.stringify(jsonObj, null, 2)}</pre>;
      } catch {
        return <pre>{content}</pre>;
      }
    } else {
      // Render as plain text
      return <pre className="text-content">{content}</pre>;
    }
  };

  if (!document) return <div>Loading...</div>;

  return (
    <div className="document-viewer">
      {/* Header */}
      <div className="header">
        <h1>{document.summary}</h1>
        <div className="meta">
          <span className="type">{document.type}</span>
          <span className="status">{document.status}</span>
          <span className="scope">{document.scope}</span>
        </div>
      </div>

      {/* Labels */}
      {document.labels.length > 0 && (
        <div className="labels">
          {document.labels.map(label => (
            <span key={label} className="label">{label}</span>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="content">
        {renderContent()}
      </div>

      {/* Metadata */}
      <div className="metadata">
        <table>
          <tbody>
            <tr>
              <td>ID:</td>
              <td>{document._id}</td>
            </tr>
            <tr>
              <td>Created:</td>
              <td>{new Date(document.createdAt).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Updated:</td>
              <td>{new Date(document.updatedAt).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### 4. Document Preview Component (iframe)

**Purpose**: Display HTML documents in iframe

```typescript
interface DocumentPreviewProps {
  token: string;
  documentId: string;
}

function DocumentPreview({ token, documentId }: DocumentPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contentUrl, setContentUrl] = useState<string>('');

  useEffect(() => {
    // Build content URL with auth token
    // Note: In production, consider using session-based auth or temporary tokens
    const url = `/documents/${documentId}/content`;
    setContentUrl(url);
  }, [documentId]);

  return (
    <div className="document-preview">
      <iframe
        ref={iframeRef}
        src={contentUrl}
        width="100%"
        height="600px"
        style={{ border: '1px solid #ccc' }}
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
}
```

---

## Example Requests

### 1. Create HTML Document

```bash
curl -X POST http://localhost:3360/documents \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "User Onboarding Guide",
    "content": "<h1>Welcome</h1><p>Follow these steps to get started...</p>",
    "type": "html",
    "labels": ["onboarding", "guide", "user"]
  }'
```

---

### 2. Create Markdown Document

```bash
curl -X POST http://localhost:3360/documents \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "API Documentation",
    "content": "# API Guide\n\n## Getting Started\n\nFollow these steps...",
    "type": "markdown",
    "labels": ["api", "documentation", "guide"]
  }'
```

---

### 3. Get All Published Documents

```bash
curl -X GET "http://localhost:3360/documents?filter={\"status\":\"published\"}&page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 4. Get Document Content

```bash
curl -X GET http://localhost:3360/documents/507f1f77bcf86cd799439011/content \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 5. Update Document Status

```bash
curl -X PATCH http://localhost:3360/documents/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published"
  }'
```

---

### 6. Search Documents

```bash
curl -X GET "http://localhost:3360/documents?search=integration&sort=-createdAt" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## Developer Notes

### Key Design Decisions

1. **Content Separation**
   - `content` field is excluded from `GET /documents` and `GET /documents/:id`
   - Improves performance for list and detail views
   - Use dedicated `/content` endpoint to fetch actual content

2. **MIME Type Support**
   - Each document type maps to appropriate MIME type
   - Enables proper browser rendering and downloading
   - Supports iframe embedding for HTML documents

3. **Label-based Organization**
   - Free-form string array for labels
   - No predefined taxonomy
   - Flexible categorization

4. **Statistics Aggregation**
   - Automatically computed on `findAll` endpoint
   - Includes counts by status and type
   - Useful for dashboard widgets

### Common Use Cases

**1. Display Document in Web Page**
```typescript
// Fetch metadata
const doc = await fetch(`/documents/${id}`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Fetch content separately
const content = await fetch(`/documents/${id}/content`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.text());

// Render based on type
if (doc.type === 'html') {
  container.innerHTML = content;
} else if (doc.type === 'markdown') {
  container.innerHTML = renderMarkdown(content);
}
```

**2. Document Management**
```typescript
// Create new document
const newDoc = await createDocument({
  summary: 'New Doc',
  content: 'Content here...',
  type: 'text',
  labels: ['label1', 'label2'],
  status: 'draft'
});

// Update document
await updateDocument(docId, {
  status: 'published',
  scope: 'org'
});

// Delete document
await deleteDocument(docId);
```

**3. Embed HTML Document**
```html
<iframe
  src="http://localhost:3360/documents/{id}/content"
  width="100%"
  height="600px"
></iframe>
```

### Performance Considerations

1. **Content Exclusion**
   - List endpoint excludes `content` field
   - Significantly reduces response size for large documents
   - Fetch content only when needed

2. **Indexing**
   - Index on `type` and `status` for filtering
   - Full-text index on `summary` and `content` for search
   - Index on `labels` for tag filtering

3. **Pagination**
   - Use pagination for large datasets (default limit: 10, max: 100)
   - Always provide page/limit parameters

4. **Caching**
   - Consider caching document metadata (without content)
   - Cache TTL: 5-10 minutes recommended
   - Invalidate cache on create/update/delete

### Testing Checklist

- [ ] Create document with all content types (html, text, markdown, json)
- [ ] Verify `content` field is excluded from list endpoint
- [ ] Verify `content` field is excluded from detail endpoint
- [ ] Fetch content via `/content` endpoint with correct MIME type
- [ ] Test iframe embedding for HTML documents
- [ ] List documents with pagination
- [ ] Search documents by keyword
- [ ] Filter by status (draft/published/archived)
- [ ] Filter by type (html/text/markdown/json)
- [ ] Filter by labels
- [ ] Update document fields
- [ ] Delete document (soft delete)
- [ ] Verify statistics aggregation
- [ ] Test authentication (missing/invalid token)

---

**End of Document**
