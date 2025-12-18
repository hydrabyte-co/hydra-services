#!/bin/bash

# Test DocumentManagement built-in MCP tool
# This script tests the DocumentManagement builtin tool integration

echo "======================================"
echo "DocumentManagement Built-in MCP Tool Test"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
IAM_URL="http://localhost:3000"
CBM_URL="http://localhost:3001"
AIWM_URL="http://localhost:3003"
MCP_URL="http://localhost:3306"

echo -e "${BLUE}Step 1: Login to get token${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$IAM_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@x-or.cloud",
    "password": "NewPass123!"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to get token${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Token obtained${NC}"
echo ""

# Extract user info from token payload
USER_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['_id'])" 2>/dev/null)
ORG_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['orgId'])" 2>/dev/null)

echo -e "${BLUE}Step 2: Create a test agent with DocumentManagement tool${NC}"

# First, create a DocumentManagement tool in AIWM
TOOL_RESPONSE=$(curl -s -X POST "$AIWM_URL/tools" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DocumentManagement",
    "description": "Built-in tool for managing documents in CBM service",
    "type": "builtin",
    "status": "active"
  }')

TOOL_ID=$(echo "$TOOL_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])" 2>/dev/null)

if [ -z "$TOOL_ID" ]; then
  echo -e "${RED}✗ Failed to create DocumentManagement tool${NC}"
  echo "Response: $TOOL_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ DocumentManagement tool created: $TOOL_ID${NC}"
echo ""

# Create an agent with this tool
AGENT_RESPONSE=$(curl -s -X POST "$AIWM_URL/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"DocumentManager Agent\",
    \"description\": \"Agent for testing DocumentManagement builtin tool\",
    \"status\": \"active\",
    \"allowedToolIds\": [\"$TOOL_ID\"]
  }")

AGENT_ID=$(echo "$AGENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])" 2>/dev/null)

if [ -z "$AGENT_ID" ]; then
  echo -e "${RED}✗ Failed to create agent${NC}"
  echo "Response: $AGENT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Agent created: $AGENT_ID${NC}"
echo ""

echo -e "${BLUE}Step 3: Generate agent JWT token${NC}"

# Generate JWT for the agent
AGENT_TOKEN_RESPONSE=$(curl -s -X POST "$AIWM_URL/agents/$AGENT_ID/token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expiresIn": 3600
  }')

AGENT_TOKEN=$(echo "$AGENT_TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$AGENT_TOKEN" ]; then
  echo -e "${RED}✗ Failed to generate agent token${NC}"
  echo "Response: $AGENT_TOKEN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Agent token generated${NC}"
echo ""

echo -e "${BLUE}Step 4: Test MCP Server - List Tools${NC}"

# Test MCP tools/list endpoint
MCP_LIST_RESPONSE=$(curl -s -X POST "$MCP_URL" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }')

echo "MCP Tools List Response:"
echo "$MCP_LIST_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$MCP_LIST_RESPONSE"
echo ""

# Check if DocumentManagement tools are present
TOOL_COUNT=$(echo "$MCP_LIST_RESPONSE" | python3 -c "import sys, json; tools = json.load(sys.stdin).get('result', {}).get('tools', []); print(len([t for t in tools if 'cbm_document' in t.get('name', '')]))" 2>/dev/null)

if [ "$TOOL_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Found $TOOL_COUNT DocumentManagement tools${NC}"
else
  echo -e "${RED}✗ No DocumentManagement tools found${NC}"
fi

echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "Tool ID: ${GREEN}$TOOL_ID${NC}"
echo -e "Agent ID: ${GREEN}$AGENT_ID${NC}"
echo -e "DocumentManagement Tools: ${GREEN}$TOOL_COUNT${NC}"
echo ""

echo -e "${BLUE}To test with MCP Inspector:${NC}"
echo "1. Start MCP Inspector"
echo "2. Use Direct Mode with URL: $MCP_URL"
echo "3. Add header: Authorization: Bearer $AGENT_TOKEN"
echo "4. List tools and call DocumentManagement operations"
