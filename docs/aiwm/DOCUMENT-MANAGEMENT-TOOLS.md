# DocumentManagement Built-in Tools

## Overview

DocumentManagement provides 14 built-in MCP tools for comprehensive document operations including CRUD, search & replace, and content append operations.

## Tools List

### CRUD Operations (7 tools)

1. **CreateDocument**
   - Create a new document with summary, content, type, labels, status, scope
   - Input: `{ summary, content, type, labels?, status?, scope? }`
   - Returns: Created document object

2. **ListDocuments**
   - List documents with pagination, search, and filters
   - Input: `{ page?, limit?, search?, type?, status?, scope? }`
   - Returns: Paginated list with statistics

3. **GetDocument**
   - Get document metadata by ID
   - Input: `{ id }`
   - Returns: Document object with metadata

4. **GetDocumentContent**
   - Get document content by ID with appropriate MIME type
   - Input: `{ id }`
   - Returns: Raw content

5. **UpdateDocument**
   - Update document metadata (summary, labels, status, scope)
   - Input: `{ id, summary?, labels?, status?, scope? }`
   - Returns: Updated document object

6. **UpdateDocumentContent**
   - Generic update with multiple operation types (deprecated - use specific tools below)
   - Input: `{ id, operation, content, findText?, findPattern?, sectionTitle? }`
   - Returns: Updated document object

7. **DeleteDocument**
   - Soft delete a document
   - Input: `{ id }`
   - Returns: Success message

---

### Content Manipulation Operations (7 tools)

#### Replace Operations

8. **ReplaceDocumentContent**
   - Replace entire document content
   - Input: `{ id, content }`
   - API: `PATCH /documents/:id/content` with `operation: 'replace'`
   - Example:
     ```json
     {
       "id": "65f1a2b3c4d5e6f7g8h9i0j1",
       "content": "# New Document\n\nThis is completely new content."
     }
     ```

9. **SearchAndReplaceTextInDocument**
   - Find and replace text (case-sensitive)
   - Input: `{ id, find, replace }`
   - API: `PATCH /documents/:id/content` with `operation: 'find-replace-text'`
   - Example:
     ```json
     {
       "id": "65f1a2b3c4d5e6f7g8h9i0j1",
       "find": "old API endpoint",
       "replace": "new API endpoint"
     }
     ```

10. **SearchAndReplaceRegexInDocument**
    - Find and replace using regex pattern
    - Input: `{ id, pattern, replace, flags? }`
    - API: `PATCH /documents/:id/content` with `operation: 'find-replace-regex'`
    - Example:
      ```json
      {
        "id": "65f1a2b3c4d5e6f7g8h9i0j1",
        "pattern": "TODO:\\s*.*",
        "replace": "DONE: Completed",
        "flags": "gi"
      }
      ```

11. **ReplaceMarkdownSectionInDocument**
    - Replace entire markdown section by heading
    - Input: `{ id, section, sectionContent }`
    - API: `PATCH /documents/:id/content` with `operation: 'find-replace-markdown'`
    - Example:
      ```json
      {
        "id": "65f1a2b3c4d5e6f7g8h9i0j1",
        "section": "## API Specification",
        "sectionContent": "## API Specification\n\nNew API docs here..."
      }
      ```

#### Append Operations

12. **AppendToDocument**
    - Append content to end of document
    - Input: `{ id, content }`
    - API: `PATCH /documents/:id/content` with `operation: 'append'`
    - Example:
      ```json
      {
        "id": "65f1a2b3c4d5e6f7g8h9i0j1",
        "content": "\n\n## Additional Notes\n\nThis is appended content."
      }
      ```

13. **AppendAfterTextInDocument**
    - Append content after specific text
    - Input: `{ id, find, content }`
    - API: `PATCH /documents/:id/content` with `operation: 'append-after-text'`
    - Example:
      ```json
      {
        "id": "65f1a2b3c4d5e6f7g8h9i0j1",
        "find": "## Installation",
        "content": "\n\n### Prerequisites\n\nYou need Node.js 18+..."
      }
      ```

14. **AppendToMarkdownSectionInDocument**
    - Append content to end of markdown section
    - Input: `{ id, section, content }`
    - API: `PATCH /documents/:id/content` with `operation: 'append-to-section'`
    - Example:
      ```json
      {
        "id": "65f1a2b3c4d5e6f7g8h9i0j1",
        "section": "## API Endpoints",
        "content": "\n\n### New Endpoint\n\n`GET /api/v2/users`"
      }
      ```

---

## Response Optimization

All tools automatically **sanitize responses** to optimize token usage for LLM by removing:
- `owner` - Owner object metadata
- `createdBy` - Creator user ID
- `updatedBy` - Last updater user ID
- `__v` - MongoDB version key

This reduces response size by ~30-40% while preserving essential information.

---

## Architecture

### File Structure

```
services/aiwm/src/mcp/builtin/cbm/document-management/
├── schemas.ts      # Zod validation schemas for all 14 tools
├── executors.ts    # Executor functions with sanitization logic
├── tools.ts        # Tool registration with metadata
├── types.ts        # TypeScript type definitions (if any)
└── utils.ts        # Helper functions (if any)
```

### Key Features

1. **Zod Validation** - All inputs validated with detailed schemas
2. **Error Handling** - Comprehensive try-catch with user-friendly messages
3. **Token Optimization** - Response sanitization removes metadata
4. **Type Safety** - Full TypeScript support
5. **Consistent Patterns** - All tools follow same structure

### Integration

Tools are registered in `services/aiwm/src/bootstrap-mcp.ts`:
- Category: `DocumentManagement`
- Type: `builtin`
- Configuration: Fetches `cbm.base_url` from Configuration module
- Authentication: Uses JWT from agent token

---

## Usage Example

### From MCP Client

```typescript
// List documents
const result = await mcpClient.callTool('ListDocuments', {
  page: 1,
  limit: 10,
  search: 'API',
  type: 'markdown'
});

// Search and replace
await mcpClient.callTool('SearchAndReplaceTextInDocument', {
  id: '65f1a2b3c4d5e6f7g8h9i0j1',
  find: 'version 1.0',
  replace: 'version 2.0'
});

// Append to section
await mcpClient.callTool('AppendToMarkdownSectionInDocument', {
  id: '65f1a2b3c4d5e6f7g8h9i0j1',
  section: '## Changelog',
  content: '\n\n### v2.0.0 - 2025-01-15\n- New feature added'
});
```

---

## Naming Convention

All tools follow **PascalCase with "Document" keyword** pattern:
- ✅ `CreateDocument`, `ListDocuments`, `GetDocument`
- ✅ `SearchAndReplaceTextInDocument`
- ✅ `AppendToMarkdownSectionInDocument`
- ❌ `cbm_document_create` (old naming)

This provides:
- Clear namespace (Document*)
- LLM-friendly naming
- Consistency across tools

---

## Related Documentation

- [MCP Configuration Fix](./MCP-CONFIGURATION-FIX.md) - How CBM base URL is fetched
- [CBM Document API](../../services/cbm/src/modules/document/README.md) - Backend API docs
- [AIWM README](../../services/aiwm/README.md) - AIWM service overview

---

## Date

Created: 2025-12-18
Updated: 2025-12-18
