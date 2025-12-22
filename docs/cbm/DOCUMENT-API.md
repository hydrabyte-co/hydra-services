# CBM Document API Documentation

## Overview

The Document module provides CRUD operations and advanced content manipulation for user and AI agent generated documents. Supports multiple content types: `html`, `text`, `markdown`, `json`.

**Base URL**: `http://localhost:3001` (Development)
**Authentication**: JWT Bearer Token required for all endpoints

---

## Endpoints

### 1. Create Document

**POST** `/documents`

Create a new document with content.

**Request Body**:
```json
{
  "summary": "API Integration Guide",
  "content": "# Getting Started\n\nThis guide explains...",
  "type": "markdown",
  "labels": ["api", "guide"],
  "status": "draft",
  "scope": "private"
}
```

**Fields**:
- `summary` (required, string, max 500): Document title/summary
- `content` (required, string): Main document content
- `type` (required, enum): `html` | `text` | `markdown` | `json`
- `labels` (required, array): Tags for categorization and search
- `status` (optional, enum): `draft` | `published` | `archived` (default: `draft`)
- `scope` (optional, enum): `public` | `org` | `private` (default: `private`)

**Response** (201):
```json
{
  "_id": "67613a1b2f8e4c5d9a1b2c3d",
  "summary": "API Integration Guide",
  "type": "markdown",
  "labels": ["api", "guide"],
  "status": "draft",
  "scope": "private",
  "owner": {
    "orgId": "691eb9e6517f917943ae1f9d",
    "userId": "691eba08517f917943ae1fa1",
    "groupId": "",
    "agentId": "",
    "appId": ""
  },
  "createdBy": "691eba08517f917943ae1fa1",
  "updatedBy": "691eba08517f917943ae1fa1",
  "createdAt": "2025-12-17T10:30:00.000Z",
  "updatedAt": "2025-12-17T10:30:00.000Z",
  "isDeleted": false
}
```

**Note**: `content` field is excluded from response to reduce size. Use `/documents/:id/content` to retrieve content.

**cURL Example**:
```bash
curl -X POST http://localhost:3001/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "API Integration Guide",
    "content": "# Getting Started\n\nThis guide explains...",
    "type": "markdown",
    "labels": ["api", "guide"],
    "status": "draft"
  }'
```

---

### 2. List Documents with Search

**GET** `/documents?page=1&limit=10&search=API`

List documents with pagination, search, and statistics.

**Query Parameters**:
- `page` (optional, number, default: 1): Page number
- `limit` (optional, number, default: 10): Items per page
- `search` (optional, string): Search in summary, content, and labels (case-insensitive regex)
- `sort` (optional, string): Sort field (e.g., `-createdAt` for descending)
- `filter[status]` (optional, string): Filter by status
- `filter[type]` (optional, string): Filter by type

**Response** (200):
```json
{
  "data": [
    {
      "_id": "67613a1b2f8e4c5d9a1b2c3d",
      "summary": "API Integration Guide",
      "type": "markdown",
      "labels": ["api", "guide"],
      "status": "draft",
      "scope": "private",
      "createdAt": "2025-12-17T10:30:00.000Z",
      "updatedAt": "2025-12-17T10:30:00.000Z"
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
      "draft": 10,
      "published": 12,
      "archived": 3
    },
    "byType": {
      "markdown": 15,
      "html": 7,
      "text": 3
    }
  }
}
```

**cURL Examples**:
```bash
# List all documents
curl -X GET "http://localhost:3001/documents?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Search documents
curl -X GET "http://localhost:3001/documents?search=API" \
  -H "Authorization: Bearer $TOKEN"

# Filter by status
curl -X GET "http://localhost:3001/documents?filter[status]=published" \
  -H "Authorization: Bearer $TOKEN"

# Combine search and filter
curl -X GET "http://localhost:3001/documents?search=guide&filter[type]=markdown&sort=-createdAt" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 3. Get Document by ID

**GET** `/documents/:id`

Get document metadata by ID (without content).

**Response** (200):
```json
{
  "_id": "67613a1b2f8e4c5d9a1b2c3d",
  "summary": "API Integration Guide",
  "type": "markdown",
  "labels": ["api", "guide"],
  "status": "draft",
  "scope": "private",
  "createdAt": "2025-12-17T10:30:00.000Z",
  "updatedAt": "2025-12-17T10:30:00.000Z"
}
```

**cURL Example**:
```bash
curl -X GET http://localhost:3001/documents/67613a1b2f8e4c5d9a1b2c3d \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4. Get Document Content

**GET** `/documents/:id/content`

Get document content with appropriate MIME type.

**Response** (200):
- Content-Type header set based on document type:
  - `text/html; charset=utf-8` for HTML
  - `text/markdown; charset=utf-8` for Markdown
  - `text/plain; charset=utf-8` for Text
  - `application/json; charset=utf-8` for JSON
- Response body: Raw content string

**cURL Example**:
```bash
curl -X GET http://localhost:3001/documents/67613a1b2f8e4c5d9a1b2c3d/content \
  -H "Authorization: Bearer $TOKEN"
```

---

### 5. Update Document Metadata

**PATCH** `/documents/:id`

Update document metadata (summary, labels, status, scope, type).

**Request Body** (all fields optional):
```json
{
  "summary": "Updated API Integration Guide",
  "labels": ["api", "guide", "rest"],
  "status": "published",
  "scope": "org"
}
```

**Response** (200): Updated document object

**cURL Example**:
```bash
curl -X PATCH http://localhost:3001/documents/67613a1b2f8e4c5d9a1b2c3d \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "published"}'
```

---

### 6. Update Document Content (Advanced)

**PATCH** `/documents/:id/content`

Update document content with advanced operations.

**Supported Operations**:
- **Replace operations**: `replace`, `find-replace-text`, `find-replace-regex`, `find-replace-markdown`
- **Append operations** (NEW): `append`, `append-after-text`, `append-to-section`

---

#### 6.1 Replace All Content

Replace entire document content.

**Request**:
```json
{
  "operation": "replace",
  "content": "# New Content\n\nThis is the new content."
}
```

**cURL Example**:
```bash
curl -X PATCH http://localhost:3001/documents/67613a1b2f8e4c5d9a1b2c3d/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "replace",
    "content": "# New Content\n\nThis is completely new."
  }'
```

#### 6.2 Find and Replace Text

Find and replace text strings (case-sensitive).

**Request**:
```json
{
  "operation": "find-replace-text",
  "find": "old text",
  "replace": "new text"
}
```

**cURL Example**:
```bash
curl -X PATCH http://localhost:3001/documents/67613a1b2f8e4c5d9a1b2c3d/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "find-replace-text",
    "find": "Getting Started",
    "replace": "Introduction"
  }'
```

#### 6.3 Find and Replace with Regex

Find and replace using regular expressions.

**Request**:
```json
{
  "operation": "find-replace-regex",
  "pattern": "TODO:\\s*.*",
  "replace": "DONE: Task completed",
  "flags": "gi"
}
```

**Fields**:
- `pattern` (required): Regex pattern
- `replace` (required): Replacement string (supports capture groups like `$1`)
- `flags` (optional, default: "g"): Regex flags (`g`, `i`, `m`, etc.)

**cURL Example**:
```bash
curl -X PATCH http://localhost:3001/documents/67613a1b2f8e4c5d9a1b2c3d/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "find-replace-regex",
    "pattern": "^# (.+)$",
    "replace": "# $1 (Updated)",
    "flags": "m"
  }'
```

#### 6.4 Find and Replace Markdown Section

Replace an entire markdown section (from heading to next same/higher level heading).

**Request**:
```json
{
  "operation": "find-replace-markdown",
  "section": "## API Specification",
  "sectionContent": "## API Specification\n\nUpdated content here.\n\n- Endpoint 1\n- Endpoint 2"
}
```

**Fields**:
- `section` (required): Markdown heading to find (e.g., `## API Specification`)
- `sectionContent` (required): New content including the heading

**How it works**:
- Finds the specified heading (case-insensitive)
- Replaces everything from that heading until:
  - Next heading of same or higher level (e.g., if searching for `##`, stops at next `#` or `##`)
  - End of document

**cURL Example**:
```bash
curl -X PATCH http://localhost:3001/documents/67613a1b2f8e4c5d9a1b2c3d/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "find-replace-markdown",
    "section": "## API Specification",
    "sectionContent": "## API Specification\n\nUpdated API docs.\n\n- GET /users\n- POST /users"
  }'
```

**Response** (200): Updated document object with new content

---

#### 6.5 Append to End (NEW)

Append content to the end of document. **Token efficient** - no need to load full content.

**Request**:
```json
{
  "operation": "append",
  "content": "\n\n## New Section\nNew content appended at the end."
}
```

**Use cases**:
- AI agent building log files incrementally
- Appending new sections to documentation
- Adding entries to meeting notes

**cURL Example**:
```bash
curl -X PATCH http://localhost:3001/documents/67613a1b2f8e4c5d9a1b2c3d/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "append",
    "content": "\n\n## Changelog\n- v1.2.0 Released"
  }'
```

**Token Savings**: 95-99% compared to GET + replace entire content

---

#### 6.6 Append After Text (NEW)

Append content immediately after a text match. **Token efficient**.

**Request**:
```json
{
  "operation": "append-after-text",
  "find": "## References",
  "content": "\n- New reference item"
}
```

**Fields**:
- `find` (required): Text to search for (case-sensitive, first match)
- `content` (required): Content to append after the match

**Use cases**:
- Adding items to a list
- Inserting content at specific markers
- Appending after headings

**cURL Example**:
```bash
curl -X PATCH http://localhost:3001/documents/67613a1b2f8e4c5d9a1b2c3d/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "append-after-text",
    "find": "## TODO",
    "content": "\n- [ ] Complete documentation"
  }'
```

**Token Savings**: 95-99% compared to GET + replace entire content

---

#### 6.7 Append to Markdown Section (NEW)

Append content at the end of a markdown section. **Token efficient**.

**Request**:
```json
{
  "operation": "append-to-section",
  "section": "## API Endpoints",
  "content": "\n\n### POST /users\nCreate a new user."
}
```

**Fields**:
- `section` (required): Markdown heading (e.g., `## Section Name`)
- `content` (required): Content to append at end of section

**How it works**:
- Finds the specified heading
- Appends content at the end of that section, before the next same/higher level heading

**Use cases**:
- Adding subsections to existing sections
- Appending examples to documentation
- Building structured documents incrementally

**cURL Example**:
```bash
curl -X PATCH http://localhost:3001/documents/67613a1b2f8e4c5d9a1b2c3d/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "append-to-section",
    "section": "## Events",
    "content": "\n- [12:00] New event logged"
  }'
```

**Real-world example** (AI agent building logs):
```bash
# Agent appends log entries incrementally
curl -X PATCH http://localhost:3001/documents/$DOC_ID/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operation":"append-to-section","section":"## Events","content":"\n- [10:00] System started"}'

curl -X PATCH http://localhost:3001/documents/$DOC_ID/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operation":"append-to-section","section":"## Events","content":"\n- [10:05] User login"}'

# Result: Sequential log entries without loading full document
```

**Token Savings**: 95-99% compared to GET + replace entire content

**Response** (200): Updated document object with new content

---

### 7. Delete Document (Soft Delete)

**DELETE** `/documents/:id`

Soft delete a document (sets `isDeleted: true`).

**Response** (200): Deleted document object

**cURL Example**:
```bash
curl -X DELETE http://localhost:3001/documents/67613a1b2f8e4c5d9a1b2c3d \
  -H "Authorization: Bearer $TOKEN"
```

---

## Common Use Cases

### Frontend Integration

#### 1. Display Document Library
```javascript
// Fetch documents with search and pagination
const response = await fetch(
  'http://localhost:3001/documents?page=1&limit=20&search=guide&sort=-createdAt',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const { data, pagination, statistics } = await response.json();

// Display documents (content field excluded)
documents.forEach(doc => {
  console.log(doc.summary, doc.labels, doc.status);
});

// Show statistics
console.log(`Total: ${statistics.total}, Published: ${statistics.byStatus.published}`);
```

#### 2. View Document Content
```javascript
// Get document content
const contentResponse = await fetch(
  `http://localhost:3001/documents/${docId}/content`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const content = await contentResponse.text();

// Render based on type
if (doc.type === 'markdown') {
  renderMarkdown(content);
} else if (doc.type === 'html') {
  renderHTML(content);
}
```

#### 3. Update Document Content (Markdown Editor)
```javascript
// Replace specific section when user edits
await fetch(`http://localhost:3001/documents/${docId}/content`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    operation: 'find-replace-markdown',
    section: '## Introduction',
    sectionContent: `## Introduction\n\n${newContent}`
  })
});
```

### MCP Tool Development

#### 1. Document Search Tool
```typescript
// MCP Tool: search_documents
{
  name: "search_documents",
  description: "Search documents by keyword",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      type: { type: "string", enum: ["html", "text", "markdown", "json"] },
      limit: { type: "number", default: 10 }
    },
    required: ["query"]
  }
}

// Implementation
async function searchDocuments(query, type, limit = 10) {
  const params = new URLSearchParams({
    search: query,
    limit: limit.toString()
  });
  if (type) params.append('filter[type]', type);

  const response = await fetch(
    `http://localhost:3001/documents?${params}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.json();
}
```

#### 2. Document Update Tool
```typescript
// MCP Tool: update_document_section
{
  name: "update_document_section",
  description: "Update a specific markdown section in a document",
  inputSchema: {
    type: "object",
    properties: {
      documentId: { type: "string" },
      section: { type: "string", description: "Markdown heading (e.g., '## API')" },
      content: { type: "string", description: "New content for the section" }
    },
    required: ["documentId", "section", "content"]
  }
}

// Implementation
async function updateDocumentSection(documentId, section, content) {
  const response = await fetch(
    `http://localhost:3001/documents/${documentId}/content`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'find-replace-markdown',
        section: section,
        sectionContent: `${section}\n\n${content}`
      })
    }
  );
  return response.json();
}
```

#### 3. Document Creation Tool
```typescript
// MCP Tool: create_document
{
  name: "create_document",
  description: "Create a new document",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      content: { type: "string" },
      type: { type: "string", enum: ["html", "text", "markdown", "json"] },
      labels: { type: "array", items: { type: "string" } }
    },
    required: ["summary", "content", "type", "labels"]
  }
}

// Implementation
async function createDocument(summary, content, type, labels) {
  const response = await fetch('http://localhost:3001/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ summary, content, type, labels })
  });
  return response.json();
}
```

---

## Authentication & Authorization

### JWT Token
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Ownership & Permissions
- Documents are scoped by `owner.orgId` from JWT token
- Users can only access documents within their organization
- Agent updates: If request has `agentId` in context, `updatedBy` is set to `agentId`, otherwise `userId`

### Getting a Token
```bash
# Login to get token
curl -X POST http://api.x-or.cloud/dev/iam-v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"username","password":"YourPassword"}'

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "expiresIn": 3600
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed: summary is required",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Document with ID 67613a1b2f8e4c5d9a1b2c3d not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

## Best Practices

### Performance
1. **Pagination**: Always use pagination for list endpoints to avoid large responses
2. **Content Exclusion**: List endpoints exclude `content` field by default - use `/documents/:id/content` to fetch content only when needed
3. **Search Optimization**: Use specific filters (`type`, `status`) combined with search for better performance

### Security
1. **Authentication**: Always include valid JWT token in `Authorization` header
2. **Scope**: Set appropriate `scope` for documents (`private`, `org`, `public`)
3. **Validation**: Frontend should validate input before sending to API

### Content Operations
1. **Atomic Updates**: Use specific operations (`find-replace-text`, `find-replace-markdown`) instead of replacing entire content when possible
2. **Markdown Sections**: When updating markdown documents, use `find-replace-markdown` to update specific sections without affecting other parts
3. **Regex Patterns**: Test regex patterns before using `find-replace-regex` to avoid unintended replacements

---

## Testing

Test script available at: `scripts/test-document-module.sh`

```bash
# Run all tests
./scripts/test-document-module.sh
```

Tests cover:
- Document creation
- Search functionality
- All content update operations
- Statistics aggregation
- Soft delete

---

## Support

For issues or questions:
- Backend Team: Document Service issues
- Frontend Team: Integration questions
- MCP Dev Team: Tool development support

**Service Location**: `services/cbm/src/modules/document/`
