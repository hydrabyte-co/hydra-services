# CBM Service Test Scenarios

## Overview

This document provides comprehensive test scenarios for the Project and Work modules in the CBM (Core Business Management) service. All tests require JWT authentication obtained from IAM service.

**Base URL:** `http://localhost:3001`
**IAM Login URL:** `https://api.x-or.cloud/dev/iam-v2/auth/login`

---

## Prerequisites

### 1. Get Access Token from IAM

```bash
# Login to get access token
TOKEN=$(curl -s -X POST 'https://api.x-or.cloud/dev/iam-v2/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "username",
    "password": "..."
  }' | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

echo "Token: $TOKEN"
```

### 2. Start CBM Service

```bash
# Start CBM service on port 3001
npx nx serve cbm

# Verify health check
curl http://localhost:3001/health
```

---

## Test Phase 1: Project Module

### Test 1.1: Create Project (Draft Status)

**Objective:** Create a new project with draft status

```bash
PROJECT_DRAFT=$(curl -s -X POST http://localhost:3001/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2025 Product Launch",
    "description": "Launch new product features for Q1 2025",
    "members": ["user123", "user456"],
    "startDate": "2025-01-01T00:00:00.000Z",
    "dueDate": "2025-03-31T23:59:59.000Z",
    "tags": ["product", "launch", "q1"],
    "documents": ["doc123"]
  }' | python3 -m json.tool)

echo "$PROJECT_DRAFT"
PROJECT_ID=$(echo "$PROJECT_DRAFT" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")
echo "Created Project ID: $PROJECT_ID"
```

**Expected Result:**
- Status: 201 Created
- Response includes `_id`, `status: "draft"`, `owner`, `createdBy`, `createdAt`

---

### Test 1.2: List All Projects

**Objective:** List projects with pagination and statistics

```bash
curl -s -X GET "http://localhost:3001/projects?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- Response includes `data[]`, `pagination`, `statistics.byStatus`

---

### Test 1.3: Get Project by ID

**Objective:** Retrieve specific project details

```bash
curl -s -X GET "http://localhost:3001/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- Response includes all project fields

---

### Test 1.4: Update Project

**Objective:** Update project fields

```bash
curl -s -X PATCH "http://localhost:3001/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2025 Product Launch - Updated",
    "members": ["user123", "user456", "user789"],
    "tags": ["product", "launch", "q1", "priority"]
  }' | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- Response shows updated fields

---

### Test 1.5: Activate Project (draft → active)

**Objective:** Transition project from draft to active status

```bash
curl -s -X POST "http://localhost:3001/projects/$PROJECT_ID/activate" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `status: "active"`

---

### Test 1.6: Hold Project (active → on_hold)

**Objective:** Put active project on hold

```bash
curl -s -X POST "http://localhost:3001/projects/$PROJECT_ID/hold" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `status: "on_hold"`

---

### Test 1.7: Resume Project (on_hold → active)

**Objective:** Resume held project

```bash
curl -s -X POST "http://localhost:3001/projects/$PROJECT_ID/resume" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `status: "active"`

---

### Test 1.8: Complete Project (active → completed)

**Objective:** Mark project as completed

```bash
curl -s -X POST "http://localhost:3001/projects/$PROJECT_ID/complete" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `status: "completed"`

---

### Test 1.9: Archive Project (completed → archived)

**Objective:** Archive completed project

```bash
curl -s -X POST "http://localhost:3001/projects/$PROJECT_ID/archive" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `status: "archived"`

---

### Test 1.10: Soft Delete Project

**Objective:** Soft delete archived project

```bash
curl -s -X DELETE "http://localhost:3001/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- Response includes `deletedAt` timestamp

---

### Test 1.11: Invalid State Transition (Error Case)

**Objective:** Verify state machine validation

```bash
# Create new draft project
PROJECT_DRAFT2=$(curl -s -X POST http://localhost:3001/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project for Invalid Transition",
    "status": "draft"
  }')

PROJECT_ID2=$(echo "$PROJECT_DRAFT2" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")

# Try to complete draft project (should fail)
curl -s -X POST "http://localhost:3001/projects/$PROJECT_ID2/complete" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 400 Bad Request
- Error message: "Cannot complete project with status: draft. Only active projects can be completed."

---

### Test 1.12: Filter Projects by Status

**Objective:** Filter projects by status

```bash
# Create active project
PROJECT_ACTIVE=$(curl -s -X POST http://localhost:3001/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Active Project Test",
    "status": "draft"
  }')

ACTIVE_ID=$(echo "$PROJECT_ACTIVE" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")

curl -s -X POST "http://localhost:3001/projects/$ACTIVE_ID/activate" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Filter by status
curl -s -X GET "http://localhost:3001/projects?filter[status]=active" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- Only active projects returned
- Statistics show count by status

---

## Test Phase 2: Work Module - CRUD Operations

### Test 2.1: Create Work (Epic)

**Objective:** Create an epic work item

```bash
EPIC=$(curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User Authentication System",
    "description": "Implement complete authentication system",
    "type": "epic",
    "status": "backlog",
    "reporter": {
      "type": "user",
      "id": "507f1f77bcf86cd799439011"
    },
    "priority": "high",
    "tags": ["authentication", "security"]
  }' | python3 -m json.tool)

echo "$EPIC"
EPIC_ID=$(echo "$EPIC" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")
echo "Created Epic ID: $EPIC_ID"
```

**Expected Result:**
- Status: 201 Created
- Response includes epic with `type: "epic"`, `status: "backlog"`

---

### Test 2.2: Create Work (Task under Epic)

**Objective:** Create a task work item with parent epic

```bash
TASK=$(curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Implement JWT Authentication\",
    \"description\": \"Create JWT token generation and validation\",
    \"type\": \"task\",
    \"status\": \"todo\",
    \"reporter\": {
      \"type\": \"user\",
      \"id\": \"507f1f77bcf86cd799439011\"
    },
    \"assignee\": {
      \"type\": \"user\",
      \"id\": \"507f1f77bcf86cd799439012\"
    },
    \"parentId\": \"$EPIC_ID\",
    \"priority\": \"high\",
    \"estimateHours\": 8,
    \"tags\": [\"jwt\", \"authentication\"]
  }" | python3 -m json.tool)

echo "$TASK"
TASK_ID=$(echo "$TASK" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")
echo "Created Task ID: $TASK_ID"
```

**Expected Result:**
- Status: 201 Created
- Response includes task with `parentId: "$EPIC_ID"`

---

### Test 2.3: Create Work (Subtask under Task)

**Objective:** Create a subtask work item with parent task

```bash
SUBTASK=$(curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Create JWT Secret Key Configuration\",
    \"description\": \"Set up environment variable for JWT secret\",
    \"type\": \"subtask\",
    \"status\": \"todo\",
    \"reporter\": {
      \"type\": \"user\",
      \"id\": \"507f1f77bcf86cd799439011\"
    },
    \"assignee\": {
      \"type\": \"user\",
      \"id\": \"507f1f77bcf86cd799439012\"
    },
    \"parentId\": \"$TASK_ID\",
    \"priority\": \"medium\",
    \"estimateHours\": 1
  }" | python3 -m json.tool)

echo "$SUBTASK"
SUBTASK_ID=$(echo "$SUBTASK" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")
echo "Created Subtask ID: $SUBTASK_ID"
```

**Expected Result:**
- Status: 201 Created
- Response includes subtask with `parentId: "$TASK_ID"`

---

### Test 2.4: Invalid Hierarchy (Subtask → Subtask)

**Objective:** Verify hierarchy validation (subtask cannot have subtask parent)

```bash
# Try to create subtask with subtask parent (should fail)
curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Invalid Subtask\",
    \"type\": \"subtask\",
    \"status\": \"todo\",
    \"reporter\": {
      \"type\": \"user\",
      \"id\": \"507f1f77bcf86cd799439011\"
    },
    \"parentId\": \"$SUBTASK_ID\"
  }" | python3 -m json.tool
```

**Expected Result:**
- Status: 400 Bad Request
- Error message: "Subtask cannot have another subtask as parent"

---

### Test 2.5: List All Works

**Objective:** List works with pagination and statistics

```bash
curl -s -X GET "http://localhost:3001/works?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- Response includes `data[]`, `pagination`, `statistics.byStatus`, `statistics.byType`

---

### Test 2.6: Get Work by ID

**Objective:** Retrieve specific work details

```bash
curl -s -X GET "http://localhost:3001/works/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- Response includes all work fields

---

### Test 2.7: Update Work

**Objective:** Update work fields

```bash
curl -s -X PATCH "http://localhost:3001/works/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement JWT Authentication - Updated",
    "priority": "critical",
    "estimateHours": 12
  }' | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- Response shows updated fields

---

## Test Phase 3: Work Action Endpoints

### Test 3.1: Start Work (todo → in_progress)

**Objective:** Transition work from todo to in_progress

```bash
curl -s -X POST "http://localhost:3001/works/$TASK_ID/start" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `status: "in_progress"`

---

### Test 3.2: Request Review (in_progress → review)

**Objective:** Request review for in-progress work

```bash
curl -s -X POST "http://localhost:3001/works/$TASK_ID/request-review" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `status: "review"`

---

### Test 3.3: Complete Work (review → done)

**Objective:** Complete work after review

```bash
curl -s -X POST "http://localhost:3001/works/$TASK_ID/complete" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `status: "done"`

---

### Test 3.4: Reopen Work (done → in_progress)

**Objective:** Reopen completed work

```bash
curl -s -X POST "http://localhost:3001/works/$TASK_ID/reopen" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `status: "in_progress"`

---

### Test 3.5: Block Work (in_progress → blocked)

**Objective:** Block work in progress

```bash
curl -s -X POST "http://localhost:3001/works/$TASK_ID/block" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `status: "blocked"`

---

### Test 3.6: Unblock Work (blocked → in_progress)

**Objective:** Unblock work

```bash
curl -s -X POST "http://localhost:3001/works/$TASK_ID/unblock" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `status: "in_progress"`

---

### Test 3.7: Cancel Work (any → cancelled)

**Objective:** Cancel work from any status

```bash
curl -s -X POST "http://localhost:3001/works/$SUBTASK_ID/cancel" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `status: "cancelled"`

---

### Test 3.8: Soft Delete Work

**Objective:** Soft delete cancelled work

```bash
curl -s -X DELETE "http://localhost:3001/works/$SUBTASK_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- Response includes `deletedAt` timestamp

---

## Test Phase 4: Agent Trigger Conditions

### Test 4.1: Create Work Assigned to Agent

**Objective:** Create work assigned to an agent (not user)

```bash
AGENT_WORK=$(curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Automated Code Review Task",
    "description": "Review pull request automatically",
    "type": "task",
    "status": "todo",
    "reporter": {
      "type": "user",
      "id": "507f1f77bcf86cd799439011"
    },
    "assignee": {
      "type": "agent",
      "id": "507f1f77bcf86cd799439999"
    },
    "startAt": "2025-01-15T10:00:00.000Z",
    "priority": "high"
  }' | python3 -m json.tool)

echo "$AGENT_WORK"
AGENT_WORK_ID=$(echo "$AGENT_WORK" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")
echo "Created Agent Work ID: $AGENT_WORK_ID"
```

**Expected Result:**
- Status: 201 Created
- `assignee.type: "agent"`

---

### Test 4.2: Check canTrigger - Future startAt (Should Fail)

**Objective:** Verify work cannot trigger if startAt is in the future

```bash
curl -s -X GET "http://localhost:3001/works/$AGENT_WORK_ID/can-trigger" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `canTrigger: false`
- `reason: "Work is scheduled to start at <future_date>, current time is <now>"`

---

### Test 4.3: Update startAt to Past Date

**Objective:** Update work to have past startAt date

```bash
curl -s -X PATCH "http://localhost:3001/works/$AGENT_WORK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startAt": "2025-01-01T00:00:00.000Z"
  }' | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `startAt` updated to past date

---

### Test 4.4: Check canTrigger - Valid Conditions (Should Pass)

**Objective:** Verify work can trigger when all conditions met

```bash
curl -s -X GET "http://localhost:3001/works/$AGENT_WORK_ID/can-trigger" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `canTrigger: true`
- `reason: "All conditions met: assigned to agent, startAt time reached, status is ready, not blocked"`

---

### Test 4.5: Block Work and Check canTrigger (Should Fail)

**Objective:** Verify blocked work cannot trigger

```bash
# First start the work
curl -s -X POST "http://localhost:3001/works/$AGENT_WORK_ID/start" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Then block it
curl -s -X POST "http://localhost:3001/works/$AGENT_WORK_ID/block" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Check canTrigger
curl -s -X GET "http://localhost:3001/works/$AGENT_WORK_ID/can-trigger" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `canTrigger: false`
- `reason: "Work status is 'blocked', must be 'todo' or 'in_progress'"`

---

### Test 4.6: Update blockedBy and Check canTrigger (Should Fail)

**Objective:** Verify work with blockedBy array cannot trigger

```bash
# Unblock first
curl -s -X POST "http://localhost:3001/works/$AGENT_WORK_ID/unblock" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Add blockedBy
curl -s -X PATCH "http://localhost:3001/works/$AGENT_WORK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blockedBy": ["507f1f77bcf86cd799439001", "507f1f77bcf86cd799439002"]
  }' > /dev/null

# Check canTrigger
curl -s -X GET "http://localhost:3001/works/$AGENT_WORK_ID/can-trigger" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `canTrigger: false`
- `reason: "Work is blocked by 2 other work(s): <work_ids>"`

---

### Test 4.7: Remove blockedBy and Check canTrigger (Should Pass)

**Objective:** Verify work can trigger after removing blockers

```bash
# Remove blockedBy
curl -s -X PATCH "http://localhost:3001/works/$AGENT_WORK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blockedBy": []
  }' > /dev/null

# Check canTrigger
curl -s -X GET "http://localhost:3001/works/$AGENT_WORK_ID/can-trigger" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `canTrigger: true`
- `reason: "All conditions met..."`

---

### Test 4.8: Work Assigned to User (Should Fail)

**Objective:** Verify work assigned to user cannot trigger agent

```bash
USER_WORK=$(curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Manual Review Task",
    "type": "task",
    "status": "todo",
    "reporter": {
      "type": "user",
      "id": "507f1f77bcf86cd799439011"
    },
    "assignee": {
      "type": "user",
      "id": "507f1f77bcf86cd799439012"
    },
    "startAt": "2025-01-01T00:00:00.000Z"
  }')

USER_WORK_ID=$(echo "$USER_WORK" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")

curl -s -X GET "http://localhost:3001/works/$USER_WORK_ID/can-trigger" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `canTrigger: false`
- `reason: "Work is not assigned to an agent"`

---

### Test 4.9: Work Without startAt (Should Fail)

**Objective:** Verify work without startAt cannot trigger

```bash
NO_START_WORK=$(curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "No Start Date Task",
    "type": "task",
    "status": "todo",
    "reporter": {
      "type": "user",
      "id": "507f1f77bcf86cd799439011"
    },
    "assignee": {
      "type": "agent",
      "id": "507f1f77bcf86cd799439999"
    }
  }')

NO_START_WORK_ID=$(echo "$NO_START_WORK" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")

curl -s -X GET "http://localhost:3001/works/$NO_START_WORK_ID/can-trigger" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 200 OK
- `canTrigger: false`
- `reason: "Work does not have a startAt date/time"`

---

## Test Phase 5: Filter and Search

### Test 5.1: Filter Works by Status

**Objective:** Filter works by status

```bash
curl -s -X GET "http://localhost:3001/works?filter[status]=todo" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Only works with status "todo"
- Statistics updated accordingly

---

### Test 5.2: Filter Works by Type

**Objective:** Filter works by type

```bash
curl -s -X GET "http://localhost:3001/works?filter[type]=epic" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Only epic works returned
- Statistics show type distribution

---

### Test 5.3: Sort Works by Priority

**Objective:** Sort works by priority descending

```bash
curl -s -X GET "http://localhost:3001/works?sort=-priority" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Works sorted by priority (critical → high → medium → low)

---

## Test Phase 6: Error Handling

### Test 6.1: Create Work with Invalid Reporter

**Objective:** Verify reporter validation

```bash
curl -s -X POST http://localhost:3001/works \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Invalid Reporter Test",
    "type": "task",
    "status": "todo",
    "reporter": {
      "type": "user",
      "id": "invalid-id-format"
    }
  }' | python3 -m json.tool
```

**Expected Result:**
- Status: 400 Bad Request
- Error message: "Invalid user ID format: invalid-id-format"

---

### Test 6.2: Delete Work in Active Status (Should Fail)

**Objective:** Verify delete validation

```bash
# Try to delete work with in_progress status
curl -s -X DELETE "http://localhost:3001/works/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected Result:**
- Status: 400 Bad Request
- Error message: "Cannot delete work with status: in_progress. Only done or cancelled works can be deleted."

---

## Summary

### Test Execution Checklist

**Project Module:**
- [ ] Test 1.1 - Create draft project
- [ ] Test 1.2 - List all projects
- [ ] Test 1.3 - Get project by ID
- [ ] Test 1.4 - Update project
- [ ] Test 1.5 - Activate project
- [ ] Test 1.6 - Hold project
- [ ] Test 1.7 - Resume project
- [ ] Test 1.8 - Complete project
- [ ] Test 1.9 - Archive project
- [ ] Test 1.10 - Soft delete project
- [ ] Test 1.11 - Invalid state transition
- [ ] Test 1.12 - Filter by status

**Work Module - CRUD:**
- [ ] Test 2.1 - Create epic
- [ ] Test 2.2 - Create task under epic
- [ ] Test 2.3 - Create subtask under task
- [ ] Test 2.4 - Invalid hierarchy validation
- [ ] Test 2.5 - List all works
- [ ] Test 2.6 - Get work by ID
- [ ] Test 2.7 - Update work

**Work Module - Actions:**
- [ ] Test 3.1 - Start work
- [ ] Test 3.2 - Request review
- [ ] Test 3.3 - Complete work
- [ ] Test 3.4 - Reopen work
- [ ] Test 3.5 - Block work
- [ ] Test 3.6 - Unblock work
- [ ] Test 3.7 - Cancel work
- [ ] Test 3.8 - Soft delete work

**Agent Trigger:**
- [ ] Test 4.1 - Create agent work
- [ ] Test 4.2 - Check canTrigger (future startAt)
- [ ] Test 4.3 - Update startAt to past
- [ ] Test 4.4 - Check canTrigger (valid)
- [ ] Test 4.5 - Block and check canTrigger
- [ ] Test 4.6 - Add blockedBy and check
- [ ] Test 4.7 - Remove blockedBy and check
- [ ] Test 4.8 - User assigned work
- [ ] Test 4.9 - Work without startAt

**Filter & Search:**
- [ ] Test 5.1 - Filter by status
- [ ] Test 5.2 - Filter by type
- [ ] Test 5.3 - Sort by priority

**Error Handling:**
- [ ] Test 6.1 - Invalid reporter ID
- [ ] Test 6.2 - Delete active work

---

## Notes

1. **Authentication**: All tests require valid JWT token from IAM service
2. **Database State**: Tests create data incrementally - run in sequence
3. **Cleanup**: Use soft delete to clean up test data
4. **Variables**: Tests use shell variables to reference created IDs
5. **Python**: Uses `python3 -m json.tool` for JSON formatting
6. **Error Cases**: Negative tests verify validation logic

---

## Related Documentation

- [Project API Documentation](./project-api.md)
- [Work API Documentation](./work-api.md)
- [Frontend Integration Guide](./project-work-frontend-guide.md)
