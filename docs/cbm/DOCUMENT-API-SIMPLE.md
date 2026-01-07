# Document Management API - Simple Guide

**Base URL**: `https://api.x-or.cloud/dev/cbm`

**Authentication**: All requests require Bearer token in Authorization header:
```
Authorization: Bearer <your_access_token>
```

---

## 1. Create New Document

**Endpoint**: `POST /documents`

**Description**: Create a new document with summary, content, type, and status.

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <your_access_token>
```

**Request Body**:
```json
{
  "summary": "API Test Document",
  "content": "# Introduction\n\nThis is a test document for AI Agent.\n\n## Features\n\n- Feature 1: Authentication\n- Feature 2: Document management\n- Feature 3: Search capabilities",
  "type": "markdown",
  "status": "published",
  "labels": ["test", "api", "sample"]
}
```

**Field Descriptions**:
- `summary` (required): Short description of the document (max 500 chars)
- `content` (required): Full content of the document
- `type` (required): Document type - one of: `text`, `html`, `markdown`, `json`
- `status` (required): Document status - one of: `draft`, `published`, `archived`
- `labels` (optional): Array of strings for categorization

**Success Response** (201 Created):
```json
{
  "_id": "676234a8f7e8b2c4d5a6b7c8",
  "summary": "API Test Document",
  "content": "# Introduction\n\nThis is a test document for AI Agent.\n\n## Features\n\n- Feature 1: Authentication\n- Feature 2: Document management\n- Feature 3: Search capabilities",
  "type": "markdown",
  "status": "published",
  "labels": ["test", "api", "sample"],
  "owner": {
    "orgId": "691eb9e6517f917943ae1f9d",
    "groupId": "",
    "userId": "691eba08517f917943ae1fa1",
    "agentId": "",
    "appId": ""
  },
  "createdBy": "691eba08517f917943ae1fa1",
  "updatedBy": "691eba08517f917943ae1fa1",
  "createdAt": "2025-12-18T08:30:00.000Z",
  "updatedAt": "2025-12-18T08:30:00.000Z"
}
```

**cURL Example**:
```bash
curl -X POST https://api.x-or.cloud/dev/cbm/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "summary": "API Test Document",
    "content": "# Introduction\n\nThis is a test document for AI Agent.\n\n## Features\n\n- Feature 1: Authentication\n- Feature 2: Document management\n- Feature 3: Search capabilities",
    "type": "markdown",
    "status": "published",
    "labels": ["test", "api", "sample"]
  }'
```

**Important Notes**:
- Save the `_id` from response - you'll need it for other operations
- The document is created with ownership automatically set from your token
- Only you (or users in your organization) can access this document

---

## 2. Search Documents

**Endpoint**: `GET /documents`

**Description**: Search documents by keyword (searches in summary, content, and labels). Supports pagination and filtering.

**Query Parameters**:
- `search` (optional): Keyword to search for
- `status` (optional): Filter by status (`draft`, `published`, `archived`)
- `type` (optional): Filter by type (`text`, `html`, `markdown`, `json`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)

**Request Headers**:
```
Authorization: Bearer <your_access_token>
```

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "_id": "676234a8f7e8b2c4d5a6b7c8",
      "summary": "API Test Document",
      "type": "markdown",
      "status": "published",
      "labels": ["test", "api", "sample"],
      "owner": {
        "orgId": "691eb9e6517f917943ae1f9d",
        "userId": "691eba08517f917943ae1fa1"
      },
      "createdBy": "691eba08517f917943ae1fa1",
      "updatedBy": "691eba08517f917943ae1fa1",
      "createdAt": "2025-12-18T08:30:00.000Z",
      "updatedAt": "2025-12-18T08:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "statistics": {
    "total": 1,
    "byStatus": {
      "published": 1,
      "draft": 0,
      "archived": 0
    },
    "byType": {
      "markdown": 1,
      "text": 0,
      "html": 0,
      "json": 0
    }
  }
}
```

**cURL Examples**:

1. **Search by keyword**:
```bash
curl -X GET "https://api.x-or.cloud/dev/cbm/documents?search=API%20Test" \
  -H "Authorization: Bearer <your_access_token>"
```

2. **Filter by status and type**:
```bash
curl -X GET "https://api.x-or.cloud/dev/cbm/documents?status=published&type=markdown" \
  -H "Authorization: Bearer <your_access_token>"
```

3. **Search with filters**:
```bash
curl -X GET "https://api.x-or.cloud/dev/cbm/documents?search=test&status=published&page=1&limit=10" \
  -H "Authorization: Bearer <your_access_token>"
```

**Important Notes**:
- The `content` field is NOT included in list results (to reduce response size)
- Search is case-insensitive and uses regex matching
- Search looks in: `summary`, `content`, and `labels` fields
- Statistics show breakdown by status and type for filtered results

---

## 3. Read Document Content

**Endpoint**: `GET /documents/:id/content`

**Description**: Get the full content of a specific document.

**Path Parameters**:
- `id`: The document ID (from create or search response)

**Request Headers**:
```
Authorization: Bearer <your_access_token>
```

**Success Response** (200 OK):
```json
{
  "_id": "676234a8f7e8b2c4d5a6b7c8",
  "summary": "API Test Document",
  "content": "# Introduction\n\nThis is a test document for AI Agent.\n\n## Features\n\n- Feature 1: Authentication\n- Feature 2: Document management\n- Feature 3: Search capabilities",
  "type": "markdown",
  "status": "published",
  "labels": ["test", "api", "sample"],
  "owner": {
    "orgId": "691eb9e6517f917943ae1f9d",
    "groupId": "",
    "userId": "691eba08517f917943ae1fa1",
    "agentId": "",
    "appId": ""
  },
  "createdBy": "691eba08517f917943ae1fa1",
  "updatedBy": "691eba08517f917943ae1fa1",
  "createdAt": "2025-12-18T08:30:00.000Z",
  "updatedAt": "2025-12-18T08:30:00.000Z"
}
```

**cURL Example**:
```bash
curl -X GET https://api.x-or.cloud/dev/cbm/documents/676234a8f7e8b2c4d5a6b7c8/content \
  -H "Authorization: Bearer <your_access_token>"
```

**Important Notes**:
- This endpoint returns the FULL document including content
- Use this when you need to read the actual content
- Returns 404 if document doesn't exist or you don't have access

---

## 4. Update Document Content

**Endpoint**: `PATCH /documents/:id/content`

**Description**: Update document content using various operations (replace, find-replace, append).

**Path Parameters**:
- `id`: The document ID

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <your_access_token>
```

### Operation 1: Replace Entire Content

**Request Body**:
```json
{
  "operation": "replace",
  "content": "# Updated Content\n\nThis is the completely new content.\n\n## New Section\n\nAll previous content is replaced."
}
```

**cURL Example**:
```bash
curl -X PATCH https://api.x-or.cloud/dev/cbm/documents/676234a8f7e8b2c4d5a6b7c8/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "operation": "replace",
    "content": "# Updated Content\n\nThis is the completely new content."
  }'
```

### Operation 2: Find and Replace Text

**Request Body**:
```json
{
  "operation": "find-replace-text",
  "find": "Feature 1: Authentication",
  "replace": "Feature 1: User Authentication with JWT"
}
```

**cURL Example**:
```bash
curl -X PATCH https://api.x-or.cloud/dev/cbm/documents/676234a8f7e8b2c4d5a6b7c8/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "operation": "find-replace-text",
    "find": "Feature 1: Authentication",
    "replace": "Feature 1: User Authentication with JWT"
  }'
```

### Operation 3: Append to End

**Request Body**:
```json
{
  "operation": "append",
  "content": "\n\n## Changelog\n\n- 2025-12-18: Document created"
}
```

**cURL Example**:
```bash
curl -X PATCH https://api.x-or.cloud/dev/cbm/documents/676234a8f7e8b2c4d5a6b7c8/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "operation": "append",
    "content": "\n\n## Changelog\n\n- 2025-12-18: Document created"
  }'
```

### Operation 4: Append to Markdown Section

**Request Body**:
```json
{
  "operation": "append-to-section",
  "section": "## Features",
  "content": "\n- Feature 4: Real-time collaboration"
}
```

**cURL Example**:
```bash
curl -X PATCH https://api.x-or.cloud/dev/cbm/documents/676234a8f7e8b2c4d5a6b7c8/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "operation": "append-to-section",
    "section": "## Features",
    "content": "\n- Feature 4: Real-time collaboration"
  }'
```

**Success Response** (200 OK) - All Operations:
```json
{
  "_id": "676234a8f7e8b2c4d5a6b7c8",
  "summary": "API Test Document",
  "content": "<updated_content>",
  "type": "markdown",
  "status": "published",
  "labels": ["test", "api", "sample"],
  "updatedBy": "691eba08517f917943ae1fa1",
  "updatedAt": "2025-12-18T08:35:00.000Z"
}
```

**Available Operations**:
1. `replace` - Replace entire content (requires: `content`)
2. `find-replace-text` - Find and replace text (requires: `find`, `replace`)
3. `find-replace-regex` - Find and replace using regex (requires: `pattern`, `replace`, optional: `flags`)
4. `find-replace-markdown` - Replace markdown section (requires: `section`, `sectionContent`)
5. `append` - Append to end (requires: `content`)
6. `append-after-text` - Append after specific text (requires: `find`, `content`)
7. `append-to-section` - Append to markdown section (requires: `section`, `content`)

**Important Notes**:
- Append operations save 95-99% tokens compared to GET + full PUT
- Only the document owner (same organization) can update
- `updatedBy` is automatically set from your token (userId or agentId)
- Returns 404 if document doesn't exist or you don't have access

---

## Complete Test Scenario

Here's a complete test flow for AI Agent:

### Step 1: Create Document
```bash
# Save the document ID from response
RESPONSE=$(curl -X POST https://api.x-or.cloud/dev/cbm/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "summary": "AI Agent Test Document",
    "content": "# Test Document\n\n## Section 1\n\nInitial content here.",
    "type": "markdown",
    "status": "draft",
    "labels": ["test", "agent"]
  }')

# Extract ID (use jq or manually)
DOC_ID=$(echo $RESPONSE | jq -r '._id')
echo "Created document: $DOC_ID"
```

### Step 2: Search for Document
```bash
# Search by keyword
curl -X GET "https://api.x-or.cloud/dev/cbm/documents?search=AI%20Agent&status=draft" \
  -H "Authorization: Bearer <TOKEN>"
```

### Step 3: Read Full Content
```bash
# Get full content
curl -X GET "https://api.x-or.cloud/dev/cbm/documents/$DOC_ID/content" \
  -H "Authorization: Bearer <TOKEN>"
```

### Step 4: Update Content
```bash
# Append new content
curl -X PATCH "https://api.x-or.cloud/dev/cbm/documents/$DOC_ID/content" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "operation": "append-to-section",
    "section": "## Section 1",
    "content": "\n\nAdded by AI Agent at '$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }'
```

### Step 5: Verify Update
```bash
# Read again to verify
curl -X GET "https://api.x-or.cloud/dev/cbm/documents/$DOC_ID/content" \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Error Responses

All endpoints return standard error responses:

**400 Bad Request** - Invalid input:
```json
{
  "statusCode": 400,
  "message": ["summary must be a string", "type must be one of: text, html, markdown, json"],
  "error": "Bad Request",
  "correlationId": "abc-123-def-456"
}
```

**401 Unauthorized** - Invalid or missing token:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden** - No permission:
```json
{
  "statusCode": 403,
  "message": "You do not have permission to perform this action.",
  "error": "Forbidden",
  "correlationId": "abc-123-def-456"
}
```

**404 Not Found** - Document not found:
```json
{
  "statusCode": 404,
  "message": "Document not found",
  "error": "Not Found",
  "correlationId": "abc-123-def-456"
}
```

---

## Test Checklist for AI Agent

Use this checklist to validate API understanding:

- [ ] Can create a new document with all required fields
- [ ] Can extract and save the document ID from create response
- [ ] Can search for the created document by keyword
- [ ] Can filter search results by status and type
- [ ] Can retrieve full content using the document ID
- [ ] Can replace entire content
- [ ] Can find and replace specific text
- [ ] Can append content to the end
- [ ] Can append content to a specific markdown section
- [ ] Can verify the update by reading content again
- [ ] Understands that append operations save tokens
- [ ] Knows when to use list endpoint (without content) vs content endpoint (with full content)

---

## Performance Tips

1. **Use List Endpoint for Browsing**: `/documents` returns results WITHOUT content field - much faster
2. **Use Content Endpoint Only When Needed**: `/documents/:id/content` returns full content - use only when you need to read/edit
3. **Prefer Append Operations**: When adding content, use `append` operations instead of GET + replace full content (saves 95-99% tokens)
4. **Use Search with Filters**: Combine `search` with `status` and `type` filters to narrow results quickly
5. **Batch Operations**: When you know the document ID, go directly to content endpoint instead of searching first

---

**Document Version**: 1.0
**Last Updated**: 2025-12-18
**API Base URL**: https://api.x-or.cloud/dev/cbm
