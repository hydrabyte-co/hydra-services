#!/bin/bash

# Quick setup script for DocumentManagement built-in tool
# Returns agent token for MCP Inspector

echo "======================================"
echo "Setup DocumentManagement Tool"
echo "======================================"

# Configuration
IAM_URL="http://localhost:3000"
AIWM_URL="http://localhost:3003"

# Step 1: Login
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$IAM_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "username",
    "password": "..."
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in"

# Step 2: Create DocumentManagement tool
echo ""
echo "Step 2: Creating DocumentManagement tool..."
TOOL_RESPONSE=$(curl -s -X POST "$AIWM_URL/tools" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DocumentManagement",
    "description": "Built-in tool for managing documents in CBM service - includes create, list, get, update, delete operations",
    "type": "builtin",
    "status": "active"
  }')

TOOL_ID=$(echo "$TOOL_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])" 2>/dev/null)

if [ -z "$TOOL_ID" ]; then
  echo "❌ Failed to create tool"
  echo "$TOOL_RESPONSE"
  exit 1
fi

echo "✅ Tool created: $TOOL_ID"

# Step 3: Create agent
echo ""
echo "Step 3: Creating agent..."
AGENT_RESPONSE=$(curl -s -X POST "$AIWM_URL/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"DocumentManager Agent\",
    \"description\": \"AI agent with DocumentManagement capability\",
    \"status\": \"active\",
    \"allowedToolIds\": [\"$TOOL_ID\"]
  }")

AGENT_ID=$(echo "$AGENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])" 2>/dev/null)

if [ -z "$AGENT_ID" ]; then
  echo "❌ Failed to create agent"
  echo "$AGENT_RESPONSE"
  exit 1
fi

echo "✅ Agent created: $AGENT_ID"

# Step 4: Generate agent token
echo ""
echo "Step 4: Generating agent token..."
AGENT_TOKEN_RESPONSE=$(curl -s -X POST "$AIWM_URL/agents/$AGENT_ID/token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expiresIn": 86400
  }')

AGENT_TOKEN=$(echo "$AGENT_TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$AGENT_TOKEN" ]; then
  echo "❌ Failed to generate token"
  echo "$AGENT_TOKEN_RESPONSE"
  exit 1
fi

echo "✅ Agent token generated (valid for 24 hours)"

# Summary
echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "📋 Summary:"
echo "  Tool ID:  $TOOL_ID"
echo "  Agent ID: $AGENT_ID"
echo ""
echo "🔑 Agent Token (copy this):"
echo "$AGENT_TOKEN"
echo ""
echo "🧪 MCP Inspector Configuration:"
echo "  1. Open MCP Inspector in browser"
echo "  2. Select 'Direct Mode'"
echo "  3. URL: http://localhost:3306"
echo "  4. Add header:"
echo "     Key: Authorization"
echo "     Value: Bearer $AGENT_TOKEN"
echo "  5. Click 'Connect'"
echo ""
echo "📝 Quick Test Commands:"
echo ""
echo "# List tools"
echo "curl -X POST http://localhost:3306 \\"
echo "  -H \"Authorization: Bearer $AGENT_TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'"
echo ""
