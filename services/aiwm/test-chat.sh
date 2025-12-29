#!/bin/bash

# Chat WebSocket Test Script
# Prerequisites:
# 1. AIWM service running on localhost:3003
# 2. Valid JWT token in TOKEN variable
# 3. Redis running on localhost:6379

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get token from login
echo -e "${BLUE}=== Step 1: Login and Get Token ===${NC}"
RESPONSE=$(curl -s -X POST 'https://api.x-or.cloud/dev/iam-v2/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
  "username": "admin@x-or.cloud",
  "password": "NewPass123!"
}')

TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
echo -e "${GREEN}✓ Token obtained${NC}"
echo "Token: ${TOKEN:0:50}..."

# Create conversation
echo -e "\n${BLUE}=== Step 2: Create Conversation ===${NC}"
CONV_RESPONSE=$(curl -s -X POST "http://localhost:3003/conversations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Chat Conversation",
    "description": "Testing chat WebSocket functionality",
    "agentId": "test-agent-123",
    "tags": ["test", "websocket"]
  }')

CONV_ID=$(echo "$CONV_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")
echo -e "${GREEN}✓ Conversation created${NC}"
echo "Conversation ID: $CONV_ID"
echo "$CONV_RESPONSE" | python3 -m json.tool | head -20

# Send first message via REST API
echo -e "\n${BLUE}=== Step 3: Send Message via REST API ===${NC}"
MSG_RESPONSE=$(curl -s -X POST "http://localhost:3003/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONV_ID\",
    \"role\": \"user\",
    \"content\": \"Hello! This is a test message.\",
    \"status\": \"sent\"
  }")

MSG_ID=$(echo "$MSG_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])")
echo -e "${GREEN}✓ Message sent${NC}"
echo "Message ID: $MSG_ID"
echo "$MSG_RESPONSE" | python3 -m json.tool | head -15

# Get conversation messages
echo -e "\n${BLUE}=== Step 4: Get Conversation Messages ===${NC}"
curl -s -X GET "http://localhost:3003/messages/conversation/$CONV_ID?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Send multiple messages to trigger auto-summary (10 messages)
echo -e "\n${BLUE}=== Step 5: Send 9 More Messages (Total 10 for Auto-Summary) ===${NC}"
for i in {2..10}; do
  curl -s -X POST "http://localhost:3003/messages" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"conversationId\": \"$CONV_ID\",
      \"role\": \"user\",
      \"content\": \"Test message #$i\",
      \"status\": \"sent\"
    }" > /dev/null
  echo -e "${GREEN}✓ Message $i sent${NC}"
done

# Wait for auto-summary to be generated
echo -e "\n${YELLOW}⏳ Waiting 3 seconds for auto-summary generation...${NC}"
sleep 3

# Check if summary was generated
echo -e "\n${BLUE}=== Step 6: Check Auto-Generated Summary ===${NC}"
CONV_WITH_SUMMARY=$(curl -s -X GET "http://localhost:3003/conversations/$CONV_ID" \
  -H "Authorization: Bearer $TOKEN")

SUMMARY=$(echo "$CONV_WITH_SUMMARY" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('contextSummary', 'No summary yet'))")
echo -e "${GREEN}✓ Context Summary:${NC}"
echo "$SUMMARY"

# Get message statistics
echo -e "\n${BLUE}=== Step 7: Get Message Statistics ===${NC}"
curl -s -X GET "http://localhost:3003/messages/conversation/$CONV_ID/statistics" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Test search
echo -e "\n${BLUE}=== Step 8: Search Messages ===${NC}"
curl -s -X GET "http://localhost:3003/messages/conversation/$CONV_ID/search?q=test" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Found {len(data)} messages')"

# Get last 3 messages
echo -e "\n${BLUE}=== Step 9: Get Last 3 Messages ===${NC}"
curl -s -X GET "http://localhost:3003/messages/conversation/$CONV_ID/last/3" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Test attachment validation
echo -e "\n${BLUE}=== Step 10: Test Attachment Validation ===${NC}"
echo "Sending message with valid attachments..."
curl -s -X POST "http://localhost:3003/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONV_ID\",
    \"role\": \"user\",
    \"content\": \"Message with attachments\",
    \"attachments\": [\"https://example.com/file.pdf\", \"document:doc-123\"]
  }" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'✓ Message with {len(d.get(\"attachments\", []))} attachments created')"

# Archive conversation
echo -e "\n${BLUE}=== Step 11: Archive Conversation ===${NC}"
curl -s -X POST "http://localhost:3003/conversations/$CONV_ID/archive" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'Status: {d[\"status\"]}')"

# Get user conversations
echo -e "\n${BLUE}=== Step 12: Get User Conversations ===${NC}"
curl -s -X GET "http://localhost:3003/conversations/my-conversations" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Total conversations: {len(data)}')"

echo -e "\n${GREEN}=== ✓ All Tests Completed ===${NC}"
echo -e "\n${YELLOW}Note: WebSocket tests require a separate client (see test-chat-websocket.js)${NC}"
