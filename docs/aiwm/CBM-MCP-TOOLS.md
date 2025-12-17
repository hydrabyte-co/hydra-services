# CBM MCP Tools Specification

This document defines all MCP (Model Context Protocol) tools for CBM service integration.

**Total Tools:** 36 (1 existing + 35 to be added)

---

## 🗂️ A. DOCUMENT MANAGEMENT (13 tools)

### CRUD Operations (6 tools)

| # | Tool Name | Method | Path | Input Parameters | Description |
|---|-----------|--------|------|------------------|-------------|
| 1 | ✅ `GetDocumentContent` | GET | `/documents/{id}/content` | `id: string` | **Already exists** - Get raw document content with MIME type |
| 2 | `CreateDocument` | POST | `/documents` | `summary: string`<br>`content: string`<br>`type: 'html'\|'text'\|'markdown'\|'json'`<br>`labels: string[]`<br>`status?: 'draft'\|'published'\|'archived'`<br>`scope?: 'public'\|'org'\|'private'` | Create a new document |
| 3 | `ListDocuments` | GET | `/documents` | `page?: number`<br>`limit?: number`<br>`search?: string`<br>`sort?: string`<br>`status?: string`<br>`type?: string` | List documents with pagination and statistics |
| 4 | `GetDocument` | GET | `/documents/{id}` | `id: string` | Get document metadata (excludes content field) |
| 5 | `UpdateDocument` | PATCH | `/documents/{id}` | `id: string`<br>`summary?: string`<br>`labels?: string[]`<br>`status?: string`<br>`scope?: string` | Update document metadata (NO content parameter) |
| 6 | `DeleteDocument` | DELETE | `/documents/{id}` | `id: string` | Soft delete document |

### Replace Operations (4 tools)

| # | Tool Name | Method | Path | Input Parameters | Description |
|---|-----------|--------|------|------------------|-------------|
| 7 | `ReplaceDocumentContent` | PATCH | `/documents/{id}/content` | `id: string`<br>`content: string` | Replace entire document content<br>**Operation:** `replace` |
| 8 | `ReplaceDocumentText` | PATCH | `/documents/{id}/content` | `id: string`<br>`find: string`<br>`replace: string` | Find and replace text (case-sensitive)<br>**Operation:** `find-replace-text` |
| 9 | `ReplaceDocumentRegex` | PATCH | `/documents/{id}/content` | `id: string`<br>`pattern: string`<br>`replace: string`<br>`flags?: string` | Find and replace with regex (supports capture groups)<br>**Operation:** `find-replace-regex` |
| 10 | `ReplaceDocumentMarkdown` | PATCH | `/documents/{id}/content` | `id: string`<br>`section: string`<br>`sectionContent: string` | Replace entire markdown section<br>**Operation:** `find-replace-markdown` |

### Append Operations (3 tools - Token Efficient)

| # | Tool Name | Method | Path | Input Parameters | Description |
|---|-----------|--------|------|------------------|-------------|
| 11 | `AppendToDocument` | PATCH | `/documents/{id}/content` | `id: string`<br>`content: string` | Append content to end of document<br>**Operation:** `append`<br>**Token Savings:** 95-99% |
| 12 | `AppendToDocumentAfterText` | PATCH | `/documents/{id}/content` | `id: string`<br>`find: string`<br>`content: string` | Append content after text match<br>**Operation:** `append-after-text`<br>**Token Savings:** 95-99% |
| 13 | `AppendToDocumentAfterMarkdownSection` | PATCH | `/documents/{id}/content` | `id: string`<br>`section: string`<br>`content: string` | Append content at end of markdown section<br>**Operation:** `append-to-section`<br>**Token Savings:** 95-99% |

---

## 📊 B. PROJECT MANAGEMENT (10 tools)

### CRUD Operations (5 tools)

| # | Tool Name | Method | Path | Input Parameters | Description |
|---|-----------|--------|------|------------------|-------------|
| 14 | `CreateProject` | POST | `/projects` | `name: string`<br>`description?: string`<br>`startDate?: Date`<br>`endDate?: Date` | Create a new project |
| 15 | `ListProjects` | GET | `/projects` | `page?: number`<br>`limit?: number`<br>`sort?: string`<br>`status?: string`<br>`filter?: object` | List projects with pagination and statistics |
| 16 | `GetProject` | GET | `/projects/{id}` | `id: string` | Get project details |
| 17 | `UpdateProject` | PATCH | `/projects/{id}` | `id: string`<br>`name?: string`<br>`description?: string`<br>`startDate?: Date`<br>`endDate?: Date` | Update project information |
| 18 | `DeleteProject` | DELETE | `/projects/{id}` | `id: string` | Soft delete project (only completed/archived) |

### Workflow Actions (5 tools)

| # | Tool Name | Method | Path | Input Parameters | Status Transition | Description |
|---|-----------|--------|------|------------------|-------------------|-------------|
| 19 | `ActivateProject` | POST | `/projects/{id}/activate` | `id: string` | draft → active | Activate a project |
| 20 | `HoldProject` | POST | `/projects/{id}/hold` | `id: string` | active → on_hold | Put project on hold |
| 21 | `ResumeProject` | POST | `/projects/{id}/resume` | `id: string` | on_hold → active | Resume a held project |
| 22 | `CompleteProject` | POST | `/projects/{id}/complete` | `id: string` | active → completed | Mark project as completed |
| 23 | `ArchiveProject` | POST | `/projects/{id}/archive` | `id: string` | completed → archived | Archive a completed project |

---

## ✅ C. WORK MANAGEMENT (13 tools)

### CRUD Operations (5 tools)

| # | Tool Name | Method | Path | Input Parameters | Description |
|---|-----------|--------|------|------------------|-------------|
| 24 | `CreateWork` | POST | `/works` | `title: string`<br>`description?: string`<br>`projectId?: string`<br>`assignedTo?: string` | Create a new work item |
| 25 | `ListWorks` | GET | `/works` | `page?: number`<br>`limit?: number`<br>`sort?: string`<br>`status?: string`<br>`filter?: object` | List work items with pagination and statistics |
| 26 | `GetWork` | GET | `/works/{id}` | `id: string` | Get work item details |
| 27 | `UpdateWork` | PATCH | `/works/{id}` | `id: string`<br>`title?: string`<br>`description?: string`<br>`priority?: string` | Update work item information |
| 28 | `DeleteWork` | DELETE | `/works/{id}` | `id: string` | Soft delete work item (only done/cancelled) |

### Workflow Actions (7 tools)

| # | Tool Name | Method | Path | Input Parameters | Status Transition | Description |
|---|-----------|--------|------|------------------|-------------------|-------------|
| 29 | `StartWork` | POST | `/works/{id}/start` | `id: string` | todo → in_progress | Start working on a task |
| 30 | `BlockWork` | POST | `/works/{id}/block` | `id: string`<br>`reason: string` | in_progress → blocked | Block work item (reason required) |
| 31 | `UnblockWork` | POST | `/works/{id}/unblock` | `id: string` | blocked → in_progress | Unblock work item |
| 32 | `RequestReviewWork` | POST | `/works/{id}/request-review` | `id: string` | in_progress → review | Request review for work item |
| 33 | `CompleteWork` | POST | `/works/{id}/complete` | `id: string` | review → done | Mark work item as complete |
| 34 | `ReopenWork` | POST | `/works/{id}/reopen` | `id: string` | done → in_progress | Reopen completed work item |
| 35 | `CancelWork` | POST | `/works/{id}/cancel` | `id: string` | any → cancelled | Cancel work item |

### Special Operations (1 tool)

| # | Tool Name | Method | Path | Input Parameters | Description |
|---|-----------|--------|------|------------------|-------------|
| 36 | `CanWorkTrigger` | GET | `/works/{id}/can-trigger` | `id: string` | Check if work can trigger agent execution<br>Validates: assigned to agent, startAt time reached, status ready, not blocked |

---

## 📝 Tool Configuration Template

All tools follow this configuration structure:

```json
{
  "name": "ToolName",
  "type": "api",
  "description": "Tool description",
  "category": "data",
  "status": "active",
  "schema": {
    "inputSchema": {
      "type": "object",
      "required": ["param1"],
      "properties": {
        "param1": {
          "type": "string",
          "description": "Parameter description"
        }
      }
    },
    "outputSchema": {
      "type": "string",
      "description": "Output description"
    }
  },
  "execution": {
    "method": "GET|POST|PATCH|DELETE",
    "baseUrl": "https://api.x-or.cloud/dev/cbm",
    "path": "/resource/{id}",
    "headers": {
      "Content-Type": "application/json"
    },
    "authRequired": true
  },
  "scope": "org"
}
```

---

## 🎯 Implementation Phases

### Phase 1: Core CRUD (Priority)
- **Documents:** CreateDocument, ListDocuments, GetDocument, UpdateDocument, DeleteDocument (5 tools)
- **Projects:** CreateProject, ListProjects, GetProject, UpdateProject, DeleteProject (5 tools)
- **Works:** CreateWork, ListWorks, GetWork, UpdateWork, DeleteWork, CanWorkTrigger (6 tools)

**Subtotal:** 16 tools

### Phase 2: Document Content Operations
- **Replace:** ReplaceDocumentContent, ReplaceDocumentText, ReplaceDocumentRegex, ReplaceDocumentMarkdown (4 tools)
- **Append:** AppendToDocument, AppendToDocumentAfterText, AppendToDocumentAfterMarkdownSection (3 tools)

**Subtotal:** 7 tools

### Phase 3: Workflow Actions
- **Project Workflows:** ActivateProject, HoldProject, ResumeProject, CompleteProject, ArchiveProject (5 tools)
- **Work Workflows:** StartWork, BlockWork, UnblockWork, RequestReviewWork, CompleteWork, ReopenWork, CancelWork (7 tools)

**Subtotal:** 12 tools

---

## 🔗 API References

- **Document API:** `/docs/cbm/DOCUMENT-API.md`
- **Project API:** `/services/cbm/src/modules/project/project.controller.ts`
- **Work API:** `/services/cbm/src/modules/work/work.controller.ts`

---

## 📌 Naming Convention

All tools follow this pattern for easy agent recognition:

- **Format:** `[Action][Resource][Context]`
- **Examples:**
  - `GetDocumentContent` - Get Document's Content
  - `CreateProject` - Create a Project
  - `AppendToDocumentAfterText` - Append to Document After finding Text
  - `ReplaceDocumentMarkdown` - Replace Document's Markdown section

**Key:** All tools include the resource name (Document, Project, Work) to help agents identify which resource they operate on.

---

## 🚀 Seeding Script

The seed script is ready and can be executed to populate all 35 new tools into the database.

### Usage

```bash
# Run the seed script (MongoDB URI is optional)
./scripts/seed-cbm-tools.sh

# Or with custom MongoDB URI
MONGODB_URI=mongodb://your-host:27017 ./scripts/seed-cbm-tools.sh
```

### Files

- **TypeScript Seed:** `scripts/seed-cbm-tools.ts` - Contains all 35 tool definitions
- **Shell Script:** `scripts/seed-cbm-tools.sh` - Wrapper script for easy execution

### Next Steps

1. ✅ **Seed Script Created** - Run `./scripts/seed-cbm-tools.sh` to populate tools
2. Test each tool via MCP Inspector
3. Document usage examples for common agent workflows
4. Add integration tests for tool execution

---

**Last Updated:** 2025-12-17
**Status:** Specification Complete - Seed Script Ready
