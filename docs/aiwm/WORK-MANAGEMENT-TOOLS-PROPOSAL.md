# WorkManagement Built-in Tools - Đề Xuất

## Phân Tích CBM Work API

### Endpoints Hiện Có

**CRUD Operations:**
- `POST /works` - Create work
- `GET /works` - List works (pagination)
- `GET /works/:id` - Get work by ID
- `PATCH /works/:id` - Update work
- `DELETE /works/:id` - Soft delete work (chỉ khi done/cancelled)

**Workflow Actions (State Transitions):**
- `POST /works/:id/start` - Start work (todo → in_progress)
- `POST /works/:id/block` - Block work (in_progress → blocked) + reason
- `POST /works/:id/unblock` - Unblock work (blocked → in_progress)
- `POST /works/:id/request-review` - Request review (in_progress → review)
- `POST /works/:id/complete` - Complete work (review → done)
- `POST /works/:id/reopen` - Reopen work (done → in_progress)
- `POST /works/:id/cancel` - Cancel work (any → cancelled)

**Utility:**
- `GET /works/:id/can-trigger` - Check if work can trigger agent

---

## Đề Xuất Naming Convention

Theo pattern của DocumentManagement, tất cả tools phải có từ **"Work"** trong tên.

---

## Đề Xuất Tools (Tổng: 15 tools)

### Group 1: CRUD Operations (5 tools)

#### 1. CreateWork
- **Mô tả:** Create a new work item (epic/task/subtask)
- **Input:**
  ```typescript
  {
    title: string,              // Required
    description?: string,       // Markdown
    type: 'epic' | 'task' | 'subtask',
    projectId?: string,
    reporter: { type: 'agent' | 'user', id: string },
    assignee?: { type: 'agent' | 'user', id: string },
    dueDate?: Date,
    startAt?: Date,
    status?: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'cancelled' | 'review' | 'done',
    dependencies?: string[],
    parentId?: string,          // For subtasks
    documents?: string[]
  }
  ```
- **Output:** Created work object (sanitized)

#### 2. ListWorks
- **Mô tả:** List works with pagination and filters
- **Input:**
  ```typescript
  {
    page?: number,
    limit?: number,
    search?: string,
    type?: 'epic' | 'task' | 'subtask',
    status?: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'cancelled' | 'review' | 'done',
    projectId?: string,
    assigneeId?: string,
    reporterId?: string
  }
  ```
- **Output:** Paginated list with statistics (sanitized)

#### 3. GetWork
- **Mô tả:** Get work details by ID
- **Input:** `{ id: string }`
- **Output:** Work object (sanitized)

#### 4. UpdateWork
- **Mô tả:** Update work metadata (title, description, assignee, etc.)
- **Note:** Cannot update type, status, reason (use workflow tools)
- **Input:**
  ```typescript
  {
    id: string,
    title?: string,
    description?: string,
    projectId?: string,
    reporter?: { type, id },
    assignee?: { type, id },
    dueDate?: Date,
    startAt?: Date,
    dependencies?: string[],
    parentId?: string,
    documents?: string[]
  }
  ```
- **Output:** Updated work object (sanitized)

#### 5. DeleteWork
- **Mô tả:** Soft delete work (only when status is done/cancelled)
- **Input:** `{ id: string }`
- **Output:** Success message

---

### Group 2: Workflow State Transitions (7 tools)

#### 6. StartWork
- **Mô tả:** Start work - transition from todo to in_progress
- **Input:** `{ id: string }`
- **API:** `POST /works/:id/start`
- **Output:** Updated work object (sanitized)

#### 7. BlockWork
- **Mô tả:** Block work with reason - transition from in_progress to blocked
- **Input:**
  ```typescript
  {
    id: string,
    reason: string  // Required: why the work is blocked
  }
  ```
- **API:** `POST /works/:id/block`
- **Output:** Updated work object (sanitized)

#### 8. UnblockWork
- **Mô tả:** Unblock work - transition from blocked to in_progress
- **Input:** `{ id: string }`
- **API:** `POST /works/:id/unblock`
- **Output:** Updated work object (sanitized)

#### 9. RequestReviewForWork
- **Mô tả:** Request review - transition from in_progress to review
- **Input:** `{ id: string }`
- **API:** `POST /works/:id/request-review`
- **Output:** Updated work object (sanitized)

#### 10. CompleteWork
- **Mô tả:** Complete work - transition from review to done
- **Input:** `{ id: string }`
- **API:** `POST /works/:id/complete`
- **Output:** Updated work object (sanitized)

#### 11. ReopenWork
- **Mô tả:** Reopen completed work - transition from done to in_progress
- **Input:** `{ id: string }`
- **API:** `POST /works/:id/reopen`
- **Output:** Updated work object (sanitized)

#### 12. CancelWork
- **Mô tả:** Cancel work from any status - transition to cancelled
- **Input:** `{ id: string }`
- **API:** `POST /works/:id/cancel`
- **Output:** Updated work object (sanitized)

---

### Group 3: Utility Tools (3 tools)

#### 13. CheckIfWorkCanTriggerAgent
- **Mô tả:** Check if work meets conditions to trigger agent execution
- **Conditions Checked:**
  - Assigned to an agent
  - startAt time has been reached
  - Status is ready (not blocked, not cancelled)
  - All dependencies met
- **Input:** `{ id: string }`
- **API:** `GET /works/:id/can-trigger`
- **Output:** `{ canTrigger: boolean, reasons?: string[] }`

#### 14. AddDocumentsToWork
- **Mô tả:** Add document IDs to work's documents array
- **Input:**
  ```typescript
  {
    id: string,
    documentIds: string[]  // Array of document IDs to add
  }
  ```
- **Implementation:** Fetch current work, merge documentIds with existing, call UpdateWork
- **Output:** Updated work object (sanitized)

#### 15. RemoveDocumentsFromWork
- **Mô tả:** Remove document IDs from work's documents array
- **Input:**
  ```typescript
  {
    id: string,
    documentIds: string[]  // Array of document IDs to remove
  }
  ```
- **Implementation:** Fetch current work, filter out documentIds, call UpdateWork
- **Output:** Updated work object (sanitized)

---

## Work Status Workflow Diagram

```
backlog ──────────────────────┐
                              ↓
                            todo
                              ↓
                       [StartWork]
                              ↓
                        in_progress ←──────────┐
                              ↓                 │
                    ┌─────────┼─────────┐      │
                    ↓         ↓         ↓      │
              [BlockWork] [RequestReview] [CancelWork]
                    ↓         ↓              ↓
                 blocked    review      cancelled
                    ↓         ↓
              [UnblockWork] [CompleteWork]
                    │         ↓
                    │       done
                    │         ↓
                    └──── [ReopenWork]
```

---

## Response Optimization

Giống DocumentManagement, tất cả tools sẽ **sanitize responses** để tối ưu token:
- Loại bỏ: `owner`, `createdBy`, `updatedBy`, `__v`
- Giảm ~30-40% kích thước response

---

## Proposed File Structure

```
services/aiwm/src/mcp/builtin/cbm/work-management/
├── schemas.ts      # 15 Zod schemas
├── executors.ts    # 15 executor functions
├── tools.ts        # 15 tool definitions
└── utils.ts        # Helper: sanitizeWork, sanitizeWorks
```

---

## Naming Pattern Summary

| API Endpoint | Tool Name |
|-------------|-----------|
| `POST /works` | **CreateWork** |
| `GET /works` | **ListWorks** |
| `GET /works/:id` | **GetWork** |
| `PATCH /works/:id` | **UpdateWork** |
| `DELETE /works/:id` | **DeleteWork** |
| `POST /works/:id/start` | **StartWork** |
| `POST /works/:id/block` | **BlockWork** |
| `POST /works/:id/unblock` | **UnblockWork** |
| `POST /works/:id/request-review` | **RequestReviewForWork** |
| `POST /works/:id/complete` | **CompleteWork** |
| `POST /works/:id/reopen` | **ReopenWork** |
| `POST /works/:id/cancel` | **CancelWork** |
| `GET /works/:id/can-trigger` | **CheckIfWorkCanTriggerAgent** |
| (Helper) | **AddDocumentsToWork** |
| (Helper) | **RemoveDocumentsFromWork** |

---

## Key Differences from DocumentManagement

1. **Complex Data Types:**
   - Work has nested objects: `reporter`, `assignee` (type + id)
   - Arrays: `dependencies`, `documents`

2. **State Machine:**
   - Work has strict workflow transitions
   - 7 workflow action tools vs 0 in Document

3. **Business Logic:**
   - Delete only allowed when done/cancelled
   - Blocking requires reason
   - Agent trigger validation

4. **No Content Manipulation:**
   - Document có search/replace, append operations
   - Work chỉ có CRUD + workflow transitions

---

## Questions for Anh

1. **Tool #13 naming**: "CheckIfWorkCanTriggerAgent" hơi dài, anh có muốn rút ngắn thành "CanWorkTriggerAgent" không?

2. **Tools #14, #15** (AddDocuments/RemoveDocuments):
   - Có nên tách riêng hay merge vào UpdateWork?
   - Hiện tại user có thể dùng UpdateWork với toàn bộ array documents mới

3. **ListWorks filters**:
   - Có cần thêm filters cho `assigneeId`, `reporterId`, `projectId` không?
   - Hay chỉ dùng search text?

4. **Response format cho CheckIfWorkCanTriggerAgent**:
   - Trả về `{ canTrigger: boolean, reasons?: string[] }`?
   - Hay format khác?

---

## Next Steps

Nếu anh approve đề xuất này, em sẽ:
1. Tạo schemas.ts với 15 Zod schemas
2. Tạo executors.ts với 15 executor functions + sanitization
3. Tạo tools.ts để register 15 tools
4. Build và test
5. Tạo documentation đầy đủ

Anh review và cho em feedback nhé!
