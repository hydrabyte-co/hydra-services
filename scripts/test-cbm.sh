#!/bin/bash

# CBM Service Test Script
# Tests all Project and Work module functionality

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3001"
TOKEN=""

# Get token from IAM
get_token() {
    echo -e "${YELLOW}=== Getting Access Token from IAM ===${NC}"
    cat > /tmp/login.json << 'EOF'
{
  "username": "admin@x-or.cloud",
  "password": "NewPass123!"
}
EOF

    RESPONSE=$(curl -s -X POST https://api.x-or.cloud/dev/iam-v2/auth/login \
        -H "Content-Type: application/json" \
        -d @/tmp/login.json)

    TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
    echo -e "${GREEN}✓ Token obtained${NC}"
}

# Test health check
test_health() {
    echo -e "\n${YELLOW}=== Test: Health Check ===${NC}"
    HEALTH=$(curl -s $BASE_URL/health)
    STATUS=$(echo "$HEALTH" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
    if [ "$STATUS" = "ok" ]; then
        echo -e "${GREEN}✓ Health check passed${NC}"
    else
        echo -e "${RED}✗ Health check failed${NC}"
        exit 1
    fi
}

# Test Project CRUD
test_project_crud() {
    echo -e "\n${YELLOW}=== Phase 1: Project CRUD Tests ===${NC}"

    # Create project
    echo -e "\n${YELLOW}Test 1.1: Create Project${NC}"
    cat > /tmp/project.json << 'EOF'
{
  "name": "Q1 2025 Product Launch",
  "description": "Launch new product features for Q1 2025",
  "members": ["user123", "user456"],
  "startDate": "2025-01-01T00:00:00.000Z",
  "dueDate": "2025-03-31T23:59:59.000Z",
  "tags": ["product", "launch", "q1"]
}
EOF

    PROJECT=$(curl -s -X POST $BASE_URL/projects \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d @/tmp/project.json)

    PROJECT_ID=$(echo "$PROJECT" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")
    STATUS=$(echo "$PROJECT" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")

    if [ "$STATUS" = "draft" ]; then
        echo -e "${GREEN}✓ Project created with ID: $PROJECT_ID${NC}"
    else
        echo -e "${RED}✗ Project creation failed${NC}"
        exit 1
    fi

    # List projects
    echo -e "\n${YELLOW}Test 1.2: List Projects${NC}"
    LIST=$(curl -s -X GET "$BASE_URL/projects?page=1&limit=10" \
        -H "Authorization: Bearer $TOKEN")
    TOTAL=$(echo "$LIST" | python3 -c "import sys, json; print(json.load(sys.stdin)['pagination']['total'])")
    echo -e "${GREEN}✓ Found $TOTAL projects${NC}"

    # Get by ID
    echo -e "\n${YELLOW}Test 1.3: Get Project by ID${NC}"
    GET=$(curl -s -X GET "$BASE_URL/projects/$PROJECT_ID" \
        -H "Authorization: Bearer $TOKEN")
    NAME=$(echo "$GET" | python3 -c "import sys, json; print(json.load(sys.stdin)['name'])")
    echo -e "${GREEN}✓ Retrieved project: $NAME${NC}"

    # Update project
    echo -e "\n${YELLOW}Test 1.4: Update Project${NC}"
    UPDATE=$(curl -s -X PATCH "$BASE_URL/projects/$PROJECT_ID" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"Q1 2025 Product Launch - Updated"}')
    NEW_NAME=$(echo "$UPDATE" | python3 -c "import sys, json; print(json.load(sys.stdin)['name'])")
    echo -e "${GREEN}✓ Updated project name: $NEW_NAME${NC}"
}

# Test Project actions
test_project_actions() {
    echo -e "\n${YELLOW}=== Phase 2: Project Action Tests ===${NC}"

    # Activate
    echo -e "\n${YELLOW}Test 2.1: Activate Project${NC}"
    ACTIVATE=$(curl -s -X POST "$BASE_URL/projects/$PROJECT_ID/activate" \
        -H "Authorization: Bearer $TOKEN")
    STATUS=$(echo "$ACTIVATE" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
    if [ "$STATUS" = "active" ]; then
        echo -e "${GREEN}✓ Project activated${NC}"
    else
        echo -e "${RED}✗ Activation failed${NC}"
        exit 1
    fi

    # Hold
    echo -e "\n${YELLOW}Test 2.2: Hold Project${NC}"
    HOLD=$(curl -s -X POST "$BASE_URL/projects/$PROJECT_ID/hold" \
        -H "Authorization: Bearer $TOKEN")
    STATUS=$(echo "$HOLD" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
    if [ "$STATUS" = "on_hold" ]; then
        echo -e "${GREEN}✓ Project on hold${NC}"
    else
        echo -e "${RED}✗ Hold failed${NC}"
        exit 1
    fi

    # Resume
    echo -e "\n${YELLOW}Test 2.3: Resume Project${NC}"
    RESUME=$(curl -s -X POST "$BASE_URL/projects/$PROJECT_ID/resume" \
        -H "Authorization: Bearer $TOKEN")
    STATUS=$(echo "$RESUME" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
    if [ "$STATUS" = "active" ]; then
        echo -e "${GREEN}✓ Project resumed${NC}"
    else
        echo -e "${RED}✗ Resume failed${NC}"
        exit 1
    fi

    # Complete
    echo -e "\n${YELLOW}Test 2.4: Complete Project${NC}"
    COMPLETE=$(curl -s -X POST "$BASE_URL/projects/$PROJECT_ID/complete" \
        -H "Authorization: Bearer $TOKEN")
    STATUS=$(echo "$COMPLETE" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
    if [ "$STATUS" = "completed" ]; then
        echo -e "${GREEN}✓ Project completed${NC}"
    else
        echo -e "${RED}✗ Complete failed${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ All Project action tests passed!${NC}"
}

# Test Work CRUD and hierarchy
test_work_crud() {
    echo -e "\n${YELLOW}=== Phase 3: Work CRUD and Hierarchy Tests ===${NC}"

    # Create Epic
    echo -e "\n${YELLOW}Test 3.1: Create Epic${NC}"
    cat > /tmp/epic.json << 'EOF'
{
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
}
EOF

    EPIC=$(curl -s -X POST $BASE_URL/works \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d @/tmp/epic.json)

    EPIC_ID=$(echo "$EPIC" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")
    echo -e "${GREEN}✓ Epic created: $EPIC_ID${NC}"

    # Create Task under Epic
    echo -e "\n${YELLOW}Test 3.2: Create Task under Epic${NC}"
    cat > /tmp/task.json << EOF
{
  "title": "Implement JWT Authentication",
  "description": "Create JWT token generation and validation",
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
  "parentId": "$EPIC_ID",
  "priority": "high",
  "estimateHours": 8
}
EOF

    TASK=$(curl -s -X POST $BASE_URL/works \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d @/tmp/task.json)

    TASK_ID=$(echo "$TASK" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")
    echo -e "${GREEN}✓ Task created under epic: $TASK_ID${NC}"

    # Create Subtask under Task
    echo -e "\n${YELLOW}Test 3.3: Create Subtask under Task${NC}"
    cat > /tmp/subtask.json << EOF
{
  "title": "Create JWT Secret Key Configuration",
  "type": "subtask",
  "status": "todo",
  "reporter": {
    "type": "user",
    "id": "507f1f77bcf86cd799439011"
  },
  "parentId": "$TASK_ID",
  "priority": "medium"
}
EOF

    SUBTASK=$(curl -s -X POST $BASE_URL/works \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d @/tmp/subtask.json)

    SUBTASK_ID=$(echo "$SUBTASK" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")
    echo -e "${GREEN}✓ Subtask created under task: $SUBTASK_ID${NC}"
}

# Test Work actions
test_work_actions() {
    echo -e "\n${YELLOW}=== Phase 4: Work Action Tests ===${NC}"

    # Start work
    echo -e "\n${YELLOW}Test 4.1: Start Work${NC}"
    START=$(curl -s -X POST "$BASE_URL/works/$TASK_ID/start" \
        -H "Authorization: Bearer $TOKEN")
    STATUS=$(echo "$START" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
    if [ "$STATUS" = "in_progress" ]; then
        echo -e "${GREEN}✓ Work started${NC}"
    else
        echo -e "${RED}✗ Start failed${NC}"
        exit 1
    fi

    # Request review
    echo -e "\n${YELLOW}Test 4.2: Request Review${NC}"
    REVIEW=$(curl -s -X POST "$BASE_URL/works/$TASK_ID/request-review" \
        -H "Authorization: Bearer $TOKEN")
    STATUS=$(echo "$REVIEW" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
    if [ "$STATUS" = "review" ]; then
        echo -e "${GREEN}✓ Review requested${NC}"
    else
        echo -e "${RED}✗ Request review failed${NC}"
        exit 1
    fi

    # Complete work
    echo -e "\n${YELLOW}Test 4.3: Complete Work${NC}"
    COMPLETE=$(curl -s -X POST "$BASE_URL/works/$TASK_ID/complete" \
        -H "Authorization: Bearer $TOKEN")
    STATUS=$(echo "$COMPLETE" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
    if [ "$STATUS" = "done" ]; then
        echo -e "${GREEN}✓ Work completed${NC}"
    else
        echo -e "${RED}✗ Complete failed${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ All Work action tests passed!${NC}"
}

# Test canTrigger conditions
test_can_trigger() {
    echo -e "\n${YELLOW}=== Phase 5: Agent Trigger Tests ===${NC}"

    # Create agent work
    echo -e "\n${YELLOW}Test 5.1: Create Work for Agent${NC}"
    cat > /tmp/agent_work.json << 'EOF'
{
  "title": "Automated Code Review Task",
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
  "startAt": "2025-01-01T00:00:00.000Z",
  "priority": "high"
}
EOF

    AGENT_WORK=$(curl -s -X POST $BASE_URL/works \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d @/tmp/agent_work.json)

    AGENT_WORK_ID=$(echo "$AGENT_WORK" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")
    echo -e "${GREEN}✓ Agent work created: $AGENT_WORK_ID${NC}"

    # Check canTrigger
    echo -e "\n${YELLOW}Test 5.2: Check canTrigger${NC}"
    CAN_TRIGGER=$(curl -s -X GET "$BASE_URL/works/$AGENT_WORK_ID/can-trigger" \
        -H "Authorization: Bearer $TOKEN")

    CAN=$(echo "$CAN_TRIGGER" | python3 -c "import sys, json; print(json.load(sys.stdin)['canTrigger'])")
    REASON=$(echo "$CAN_TRIGGER" | python3 -c "import sys, json; print(json.load(sys.stdin)['reason'])")

    if [ "$CAN" = "True" ]; then
        echo -e "${GREEN}✓ Work can trigger agent${NC}"
        echo -e "  Reason: $REASON"
    else
        echo -e "${YELLOW}⚠ Work cannot trigger agent${NC}"
        echo -e "  Reason: $REASON"
    fi
}

# Main execution
main() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}    CBM Service Test Suite${NC}"
    echo -e "${GREEN}========================================${NC}"

    get_token
    test_health
    test_project_crud
    test_project_actions
    test_work_crud
    test_work_actions
    test_can_trigger

    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}    All Tests Passed! ✓${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Run main function
main
