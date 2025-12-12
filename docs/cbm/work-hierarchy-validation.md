# Work Hierarchy Validation

## Overview
Work module enforces strict hierarchy rules based on work type to maintain a clean and logical work structure.

## Hierarchy Rules

### 1. Epic (Top Level)
- **Cannot have parent**: Epic is the highest level in the hierarchy
- **Auto-enforcement**: If creating epic with `parentId`, API will reject with error
- **Automatic behavior**: `parentId` is automatically set to `null` for epics

**Example - Creating Epic:**
```bash
# ✅ Correct - Epic without parent
curl -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q1 Feature Development",
    "type": "epic",
    "reporter": {"type": "user", "id": "68dcf365f6a92c0d4911b619"}
  }'

# ❌ Error - Epic with parent
curl -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q1 Feature Development",
    "type": "epic",
    "parentId": "693bd401e313d1c3edfb403d",
    "reporter": {"type": "user", "id": "68dcf365f6a92c0d4911b619"}
  }'
# Error: "Epic cannot have a parent. Remove parentId or change work type."
```

### 2. Task (Middle Level)
- **Optional parent**: Task can exist independently or belong to an epic
- **Parent must be epic**: If `parentId` is provided, it must reference an epic
- **Validation**: System checks parent exists and is of type `epic`

**Example - Creating Task:**
```bash
# ✅ Correct - Task without parent (independent)
curl -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user authentication",
    "type": "task",
    "reporter": {"type": "user", "id": "68dcf365f6a92c0d4911b619"}
  }'

# ✅ Correct - Task with epic parent
curl -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user authentication",
    "type": "task",
    "parentId": "693bd401e313d1c3edfb403d",
    "reporter": {"type": "user", "id": "68dcf365f6a92c0d4911b619"}
  }'

# ❌ Error - Task with task parent
curl -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user authentication",
    "type": "task",
    "parentId": "693bd573ca40d831e0ef55cb",
    "reporter": {"type": "user", "id": "68dcf365f6a92c0d4911b619"}
  }'
# Error: "Task can only have epic as parent. Found parent type: task"
```

### 3. Subtask (Bottom Level)
- **Must have parent**: Subtask cannot exist independently
- **Parent must be task**: `parentId` must reference a task (not epic or subtask)
- **Required field**: Creating subtask without `parentId` will fail

**Example - Creating Subtask:**
```bash
# ✅ Correct - Subtask with task parent
curl -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Write unit tests for login endpoint",
    "type": "subtask",
    "parentId": "693bd573ca40d831e0ef55cb",
    "reporter": {"type": "user", "id": "68dcf365f6a92c0d4911b619"}
  }'

# ❌ Error - Subtask without parent
curl -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Write unit tests for login endpoint",
    "type": "subtask",
    "reporter": {"type": "user", "id": "68dcf365f6a92c0d4911b619"}
  }'
# Error: "Subtask must have a parentId. Provide a task ID as parent."

# ❌ Error - Subtask with epic parent
curl -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Write unit tests",
    "type": "subtask",
    "parentId": "693bd401e313d1c3edfb403d",
    "reporter": {"type": "user", "id": "68dcf365f6a92c0d4911b619"}
  }'
# Error: "Subtask can only have task as parent. Found parent type: epic"
```

## Visual Hierarchy

```
Epic (no parent)
├── Task (parent: epic or null)
│   ├── Subtask (parent: task)
│   ├── Subtask (parent: task)
│   └── Subtask (parent: task)
├── Task (parent: epic or null)
│   └── Subtask (parent: task)
└── Task (parent: epic or null)

Task (independent, no parent)
├── Subtask (parent: task)
└── Subtask (parent: task)
```

## Update Behavior

When updating work type or parentId, the same validation rules apply:

### Changing Type

**Example - Converting Task to Epic:**
```bash
# System will automatically clear parentId when changing to epic
curl -X PATCH http://localhost:3001/works/{taskId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "epic"
  }'
# Result: type changed to "epic", parentId automatically set to null
```

**Example - Converting Epic to Task:**
```bash
# ✅ Can convert epic to task (parentId remains null)
curl -X PATCH http://localhost:3001/works/{epicId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task"
  }'

# ✅ Can convert and set parent in same request
curl -X PATCH http://localhost:3001/works/{epicId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task",
    "parentId": "693bd401e313d1c3edfb403d"
  }'
```

### Changing Parent

**Example - Assigning Task to Epic:**
```bash
curl -X PATCH http://localhost:3001/works/{taskId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parentId": "693bd401e313d1c3edfb403d"
  }'
```

**Example - Removing Parent from Task:**
```bash
curl -X PATCH http://localhost:3001/works/{taskId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parentId": null
  }'
```

## Validation Implementation

### Service Methods

#### `validateAndSetParentId(data, context)`
Called during **create** and **update** operations to enforce hierarchy rules.

**Logic:**
1. **Epic**: Reject if parentId provided, force to null
2. **Task**: If parentId provided, verify parent exists and is epic
3. **Subtask**: Require parentId, verify parent exists and is task

**Location**: `work.service.ts` lines 92-156

### Error Messages

| Scenario | Error Message |
|----------|---------------|
| Epic with parent | `Epic cannot have a parent. Remove parentId or change work type.` |
| Task with non-epic parent | `Task can only have epic as parent. Found parent type: {type}` |
| Subtask without parent | `Subtask must have a parentId. Provide a task ID as parent.` |
| Subtask with non-task parent | `Subtask can only have task as parent. Found parent type: {type}` |
| Parent not found | `Parent work {id} not found` |

## Ownership & Access Control

All parent validation respects ownership:
- Uses `findById()` which applies ownership filters
- User can only reference works within their organization
- Parent must be owned by same organization as child

## Testing Scenarios

### Test 1: Create Work Hierarchy
```bash
# 1. Create epic
EPIC_ID=$(curl -s -X POST http://localhost:3001/works -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"title":"Q1 Epic","type":"epic","reporter":{"type":"user","id":"68dcf365f6a92c0d4911b619"}}' | jq -r '._id')

# 2. Create task under epic
TASK_ID=$(curl -s -X POST http://localhost:3001/works -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"title\":\"Auth Task\",\"type\":\"task\",\"parentId\":\"$EPIC_ID\",\"reporter\":{\"type\":\"user\",\"id\":\"68dcf365f6a92c0d4911b619\"}}" | jq -r '._id')

# 3. Create subtask under task
SUBTASK_ID=$(curl -s -X POST http://localhost:3001/works -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"title\":\"Unit Tests\",\"type\":\"subtask\",\"parentId\":\"$TASK_ID\",\"reporter\":{\"type\":\"user\",\"id\":\"68dcf365f6a92c0d4911b619\"}}" | jq -r '._id')
```

### Test 2: Invalid Hierarchies (Should Fail)
```bash
# Epic with parent - should fail
curl -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Invalid Epic\",\"type\":\"epic\",\"parentId\":\"$EPIC_ID\",\"reporter\":{\"type\":\"user\",\"id\":\"68dcf365f6a92c0d4911b619\"}}"

# Subtask without parent - should fail
curl -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Invalid Subtask","type":"subtask","reporter":{"type":"user","id":"68dcf365f6a92c0d4911b619"}}'

# Task with task parent - should fail
curl -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Invalid Task\",\"type\":\"task\",\"parentId\":\"$TASK_ID\",\"reporter\":{\"type\":\"user\",\"id\":\"68dcf365f6a92c0d4911b619\"}}"
```

### Test 3: Type Conversion
```bash
# Convert task to subtask (add required parent)
curl -X PATCH http://localhost:3001/works/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"subtask\",\"parentId\":\"$ANOTHER_TASK_ID\"}"
```

## Benefits

1. **Data Integrity**: Prevents invalid work structures
2. **Clear Organization**: Maintains logical work breakdown
3. **Ownership Respect**: All validations respect multi-tenancy
4. **Automatic Enforcement**: Rules apply on both create and update
5. **Clear Error Messages**: Developers know exactly what went wrong

## Migration Notes

If you have existing Work documents that violate these rules:

1. **Find violations**:
```javascript
// Epics with parents
db.works.find({ type: 'epic', parentId: { $ne: null } })

// Subtasks without parents
db.works.find({ type: 'subtask', parentId: null })

// Tasks with non-epic parents
// (requires aggregation to check parent type)
```

2. **Fix violations** before deploying new validation:
```javascript
// Clear parentId from epics
db.works.updateMany(
  { type: 'epic' },
  { $set: { parentId: null } }
)
```
