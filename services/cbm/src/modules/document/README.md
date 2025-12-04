# Document Module - CBM Service

Document module cho phép quản lý tài liệu được tạo bởi AI Agent hoặc người dùng.

## Schema

**Document Fields:**
- `summary` (string, required, max 500) - Tóm tắt/tiêu đề tài liệu
- `content` (string, required) - Nội dung chính của tài liệu
- `type` (enum, required) - Loại nội dung: 'html', 'text', 'markdown', 'json'
- `labels` (string[], required) - Mảng nhãn để phân loại và tìm kiếm
- `status` (enum, optional) - Trạng thái: 'draft', 'published', 'archived' (default: 'draft')
- `scope` (enum, optional) - Phạm vi truy cập: 'public', 'org', 'private' (default: 'private')

**Inherited from BaseSchema:**
- `_id` - MongoDB ObjectId
- `owner` - User ID của người sở hữu
- `createdBy` - User ID người tạo
- `updatedBy` - User ID người cập nhật
- `deletedAt` - Soft delete timestamp
- `metadata` - Custom metadata object
- `createdAt`, `updatedAt` - Timestamps

## Features

- ✅ Full CRUD operations
- ✅ JWT Authentication
- ✅ Pagination support
- ✅ Statistics aggregation (by type, status)
- ✅ Full-text search on summary and content
- ✅ Label indexing for fast filtering
- ✅ Soft delete
- ✅ Swagger documentation

## API Endpoints

### 1. Create Document

```bash
curl -X POST http://localhost:3001/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "API Integration Guide",
    "content": "This guide explains how to integrate with our REST API...",
    "type": "markdown",
    "labels": ["api", "guide", "integration"],
    "status": "draft",
    "scope": "private"
  }'
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "summary": "API Integration Guide",
  "content": "This guide explains how to integrate with our REST API...",
  "type": "markdown",
  "labels": ["api", "guide", "integration"],
  "status": "draft",
  "scope": "private",
  "owner": "user123",
  "createdBy": "user123",
  "updatedBy": "user123",
  "createdAt": "2025-12-04T16:00:00.000Z",
  "updatedAt": "2025-12-04T16:00:00.000Z"
}
```

### 2. List All Documents (with Pagination & Statistics)

```bash
curl -X GET "http://localhost:3001/documents?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "summary": "API Integration Guide",
      "type": "markdown",
      "labels": ["api", "guide"],
      "status": "draft",
      "createdAt": "2025-12-04T16:00:00.000Z"
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

### 3. Get Document by ID

```bash
curl -X GET "http://localhost:3001/documents/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Update Document

```bash
curl -X PATCH "http://localhost:3001/documents/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Updated API Integration Guide",
    "status": "published",
    "labels": ["api", "guide", "integration", "rest"]
  }'
```

### 5. Delete Document (Soft Delete)

```bash
curl -X DELETE "http://localhost:3001/documents/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer $TOKEN"
```

## Example Use Cases

### Create HTML Document

```bash
curl -X POST http://localhost:3001/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "User Onboarding Guide",
    "content": "<h1>Welcome</h1><p>Follow these steps to get started...</p>",
    "type": "html",
    "labels": ["onboarding", "user-guide", "tutorial"]
  }'
```

### Create JSON Configuration Document

```bash
curl -X POST http://localhost:3001/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "AI Agent Configuration Template",
    "content": "{\"model\": \"gpt-4\", \"temperature\": 0.7, \"maxTokens\": 2000}",
    "type": "json",
    "labels": ["config", "template", "ai-agent"]
  }'
```

### Publish a Draft Document

```bash
curl -X PATCH "http://localhost:3001/documents/$DOCUMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published",
    "scope": "org"
  }'
```

## Testing Steps

1. **Start CBM Service:**
   ```bash
   npx nx serve cbm
   ```

2. **Get Auth Token from IAM Service:**
   ```bash
   TOKEN=$(curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "password"}' \
     | jq -r '.accessToken')
   ```

3. **Create a test document:**
   ```bash
   curl -X POST http://localhost:3001/documents \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "summary": "Test Document",
       "content": "This is a test document content.",
       "type": "text",
       "labels": ["test", "sample"]
     }'
   ```

4. **List all documents:**
   ```bash
   curl -X GET "http://localhost:3001/documents?page=1&limit=5" \
     -H "Authorization: Bearer $TOKEN" | jq
   ```

## Indexes

The following indexes are created for performance:
- `{ type: 1, status: 1 }` - Compound index for filtering
- `{ labels: 1 }` - Array index for label search
- `{ summary: 'text', content: 'text' }` - Full-text search
- `{ createdAt: -1 }` - Sort by creation date

## Architecture Notes

- **Based on Tool Module**: This module follows the same pattern as the Tool module in AIWM service
- **BaseService**: Extends BaseService for automatic CRUD operations with RBAC
- **Statistics**: Automatically aggregates statistics by type and status on list endpoint
- **No Dependencies**: Unlike Tool module, Document has no external dependencies (no Agent checking)
- **Modern Pattern**: Uses modern controller pattern (no BaseController), @CurrentUser decorator
