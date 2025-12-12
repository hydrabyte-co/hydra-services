# Work Module - Immutable Fields

## Overview
Certain fields in the Work entity cannot be updated via the standard PATCH endpoint to maintain data integrity and enforce proper workflow.

## Immutable Fields

### 1. `type` (Work Type)
- **Status**: ❌ **IMMUTABLE** - Cannot be changed after creation
- **Reason**: Changing type would break parent-child hierarchy relationships
- **Action**: Cannot be updated via PATCH `/works/:id`

**Example - Attempting to Change Type:**
```bash
# ❌ This will FAIL
curl -X PATCH http://localhost:3001/works/693bd573ca40d831e0ef55cb \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "epic"
  }'

# Error Response:
{
  "statusCode": 400,
  "message": "Cannot update work type. Type is immutable after creation.",
  "error": "Bad Request"
}
```

**Rationale:**
- Epic → Task: Would leave orphaned subtasks
- Task → Subtask: Would require parent, may have child subtasks
- Subtask → Epic: Would violate hierarchy (epic can't have parent)
- Type determines hierarchy rules, changing it mid-lifecycle creates inconsistencies

**Alternative:**
If you need to change work type, create a new work with the desired type.

---

### 2. `status` (Work Status)
- **Status**: ❌ **Cannot be updated directly**
- **Reason**: Status transitions must follow a controlled state machine
- **Action**: Use dedicated action endpoints instead

**Example - Attempting to Change Status:**
```bash
# ❌ This will FAIL
curl -X PATCH http://localhost:3001/works/693bd573ca40d831e0ef55cb \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress"
  }'

# Error Response:
{
  "statusCode": 400,
  "message": "Cannot update status directly. Use action endpoints: /start, /block, /unblock, /request-review, /complete, /reopen, /cancel",
  "error": "Bad Request"
}
```

**Correct Approach - Use Action Endpoints:**
```bash
# ✅ Start work (backlog/todo → in_progress)
curl -X POST http://localhost:3001/works/693bd573ca40d831e0ef55cb/start \
  -H "Authorization: Bearer $TOKEN"

# ✅ Block work (in_progress → blocked)
curl -X POST http://localhost:3001/works/693bd573ca40d831e0ef55cb/block \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Waiting for API design"}'

# ✅ Unblock work (blocked → in_progress)
curl -X POST http://localhost:3001/works/693bd573ca40d831e0ef55cb/unblock \
  -H "Authorization: Bearer $TOKEN"

# ✅ Request review (in_progress → review)
curl -X POST http://localhost:3001/works/693bd573ca40d831e0ef55cb/request-review \
  -H "Authorization: Bearer $TOKEN"

# ✅ Complete work (review → done)
curl -X POST http://localhost:3001/works/693bd573ca40d831e0ef55cb/complete \
  -H "Authorization: Bearer $TOKEN"

# ✅ Reopen work (done → in_progress)
curl -X POST http://localhost:3001/works/693bd573ca40d831e0ef55cb/reopen \
  -H "Authorization: Bearer $TOKEN"

# ✅ Cancel work (any → cancelled)
curl -X POST http://localhost:3001/works/693bd573ca40d831e0ef55cb/cancel \
  -H "Authorization: Bearer $TOKEN"
```

**Rationale:**
- Enforces valid state transitions
- Prevents skipping required steps
- Ensures business rules are followed (e.g., can't complete without review)
- Provides audit trail of state changes

---

### 3. `reason` (Block Reason)
- **Status**: ❌ **Cannot be updated directly**
- **Reason**: Managed automatically by block/unblock actions
- **Action**: Set via `/block` action, cleared by `/unblock` action

**Example - Attempting to Change Reason:**
```bash
# ❌ This will FAIL
curl -X PATCH http://localhost:3001/works/693bd573ca40d831e0ef55cb \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "New blocking reason"
  }'

# Error Response:
{
  "statusCode": 400,
  "message": "Cannot update reason directly. Reason is managed by block/unblock actions.",
  "error": "Bad Request"
}
```

**Correct Approach:**
```bash
# ✅ Block work with reason
curl -X POST http://localhost:3001/works/693bd573ca40d831e0ef55cb/block \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Waiting for database schema to be finalized"
  }'

# Result: status → blocked, reason → "Waiting for database schema..."

# ✅ Unblock work
curl -X POST http://localhost:3001/works/693bd573ca40d831e0ef55cb/unblock \
  -H "Authorization: Bearer $TOKEN"

# Result: status → in_progress, reason → null (cleared)
```

**Rationale:**
- Reason is tightly coupled with blocked status
- Automatically managed to prevent orphaned reasons
- Ensures reason exists when status is blocked
- Automatically cleared when work is unblocked

---

## Mutable Fields (Can be Updated via PATCH)

The following fields **CAN** be updated using PATCH `/works/:id`:

### ✅ Allowed Updates
```bash
curl -X PATCH http://localhost:3001/works/693bd573ca40d831e0ef55cb \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title",
    "description": "Updated description in markdown",
    "projectId": "693bd401e313d1c3edfb403d",
    "reporter": {
      "type": "user",
      "id": "68dcf365f6a92c0d4911b619"
    },
    "assignee": {
      "type": "agent",
      "id": "68e5f678bcdef234567890ab"
    },
    "dueDate": "2025-03-31T23:59:59.000Z",
    "startAt": "2025-01-20T09:00:00.000Z",
    "dependencies": ["693bd401e313d1c3edfb403d"],
    "parentId": "693bd401e313d1c3edfb403e",
    "documents": ["doc123", "doc456"]
  }'
```

**Field Details:**
- **title**: Work title (max 200 chars)
- **description**: Detailed markdown description (max 10000 chars)
- **projectId**: Associated project reference
- **reporter**: Who reported the work (user/agent)
- **assignee**: Who is assigned to work (user/agent)
- **dueDate**: Due date timestamp
- **startAt**: Scheduled start time for agent execution
- **dependencies**: Array of work IDs this work depends on
- **parentId**: Parent work ID (must respect hierarchy rules)
- **documents**: Array of document IDs attached to work

---

## UpdateWorkDto Schema

The `UpdateWorkDto` has been modified to exclude immutable fields:

```typescript
export class UpdateWorkDto {
  title?: string;              // ✅ Can update
  description?: string;         // ✅ Can update
  projectId?: string;          // ✅ Can update
  reporter?: ReporterAssigneeDto;  // ✅ Can update
  assignee?: ReporterAssigneeDto;  // ✅ Can update
  dueDate?: Date;              // ✅ Can update
  startAt?: Date;              // ✅ Can update
  dependencies?: string[];      // ✅ Can update
  parentId?: string;           // ✅ Can update (with hierarchy validation)
  documents?: string[];        // ✅ Can update

  // ❌ REMOVED - Cannot update
  // type?: string;
  // status?: string;
  // reason?: string;
}
```

---

## Error Messages Summary

| Field | Error Message |
|-------|--------------|
| `type` | `Cannot update work type. Type is immutable after creation.` |
| `status` | `Cannot update status directly. Use action endpoints: /start, /block, /unblock, /request-review, /complete, /reopen, /cancel` |
| `reason` | `Cannot update reason directly. Reason is managed by block/unblock actions.` |

---

## Implementation Details

### Service Layer Validation
**Location**: `work.service.ts` - `update()` method (lines 52-64)

```typescript
async update(id: ObjectId, data: any, context: RequestContext): Promise<Work | null> {
  // Block immutable fields
  if (data.type !== undefined) {
    throw new BadRequestException('Cannot update work type. Type is immutable after creation.');
  }

  if (data.status !== undefined) {
    throw new BadRequestException('Cannot update status directly. Use action endpoints...');
  }

  if (data.reason !== undefined) {
    throw new BadRequestException('Cannot update reason directly. Reason is managed by block/unblock actions.');
  }

  // ... continue with allowed field updates
}
```

### DTO Layer
**Location**: `work.dto.ts` - `UpdateWorkDto` class

Fields `type`, `status`, and `reason` have been removed from the DTO to prevent validation errors and provide clear API documentation.

---

## State Transition Diagram

```
backlog ────────> todo ────────> in_progress ──────> review ────> done
                    ↑                 │                           │
                    │                 ↓                           ↓
                    └─────────── blocked                     in_progress
                                                              (reopen)
                    any ──────────> cancelled
```

**Action Methods:**
- `POST /works/:id/start` - backlog/todo → in_progress
- `POST /works/:id/block` - in_progress → blocked (requires reason)
- `POST /works/:id/unblock` - blocked → in_progress (clears reason)
- `POST /works/:id/request-review` - in_progress → review
- `POST /works/:id/complete` - review → done
- `POST /works/:id/reopen` - done → in_progress
- `POST /works/:id/cancel` - any → cancelled

---

## Benefits

### Data Integrity
- **Type immutability**: Prevents hierarchy corruption
- **Controlled status changes**: Ensures valid state machine transitions
- **Automatic reason management**: Keeps reason synchronized with blocked status

### Clear API Contract
- **Explicit actions**: Developers know exactly how to change status
- **Predictable behavior**: Type never changes, hierarchy remains valid
- **Better audit trail**: Each state change is a distinct action

### Error Prevention
- **No accidental type changes**: Can't break parent-child relationships
- **No status skipping**: Must follow proper workflow
- **No orphaned reasons**: Reason always matches blocked status

---

## Migration Impact

### Breaking Changes
If you have existing code that updates these fields via PATCH:

**Before:**
```bash
# This no longer works
curl -X PATCH /works/:id -d '{"status": "done"}'
curl -X PATCH /works/:id -d '{"type": "epic"}'
curl -X PATCH /works/:id -d '{"reason": "Blocked by X"}'
```

**After:**
```bash
# Use action endpoints
curl -X POST /works/:id/complete
# Cannot change type at all
curl -X POST /works/:id/block -d '{"reason": "Blocked by X"}'
```

### Code Updates Required
Update client code to:
1. Remove `type` from update payloads (create new work instead)
2. Replace `status` updates with action endpoint calls
3. Replace `reason` updates with block/unblock actions

---

## Testing Scenarios

### Test 1: Verify Type is Immutable
```bash
# Create task
TASK_ID=$(curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task","type":"task","reporter":{"type":"user","id":"..."}}' \
  | jq -r '._id')

# Try to change type - should fail
curl -X PATCH http://localhost:3001/works/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"epic"}'

# Expected: 400 Bad Request - "Cannot update work type..."
```

### Test 2: Verify Status Uses Actions
```bash
# Try to update status directly - should fail
curl -X PATCH http://localhost:3001/works/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'

# Expected: 400 Bad Request - "Cannot update status directly..."

# Correct way - use action
curl -X POST http://localhost:3001/works/$TASK_ID/start \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK - status changed to "in_progress"
```

### Test 3: Verify Reason is Auto-Managed
```bash
# Try to update reason directly - should fail
curl -X PATCH http://localhost:3001/works/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Some reason"}'

# Expected: 400 Bad Request - "Cannot update reason directly..."

# Correct way - use block action
curl -X POST http://localhost:3001/works/$TASK_ID/block \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Waiting for review"}'

# Expected: 200 OK - status: "blocked", reason: "Waiting for review"
```
