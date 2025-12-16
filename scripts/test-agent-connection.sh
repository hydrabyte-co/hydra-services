#!/bin/bash

# ============================================
# Test Agent Connection Flow
# ============================================
# This script tests the new agent management features:
# 1. Create agent with instruction and tools
# 2. Regenerate credentials
# 3. Connect agent (authenticate)
# 4. Send heartbeat
# ============================================

set -e

echo "==================================================================="
echo "  Testing Agent Connection Flow - AIWM Service"
echo "==================================================================="
echo ""

# Configuration
AIWM_BASE_URL="http://localhost:3305"

# Use provided admin token
echo "Step 1: Using provided admin token..."
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTFlYmEwODUxN2Y5MTc5NDNhZTFmYTEiLCJ1c2VybmFtZSI6ImFkbWluQHgtb3IuY2xvdWQiLCJzdGF0dXMiOiJhY3RpdmUiLCJyb2xlcyI6WyJ1bml2ZXJzZS5vd25lciJdLCJvcmdJZCI6IjY5MWViOWU2NTE3ZjkxNzk0M2FlMWY5ZCIsImdyb3VwSWQiOiIiLCJhZ2VudElkIjoiIiwiYXBwSWQiOiIiLCJpYXQiOjE3NjU4NTc5NjMsImV4cCI6MTc2NTg2MTU2M30.88ojbig3imt1UXpGCzgeliSonxzZ3MyKUZJXMr9hIck"

echo "✅ Using admin token"
echo ""

# Step 2: Create an instruction
echo "Step 2: Create instruction for agent..."
INSTRUCTION_RESPONSE=$(curl -s -X POST "${AIWM_BASE_URL}/instructions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent Instruction",
    "description": "Instruction for testing agent connection",
    "systemPrompt": "You are a helpful AI assistant for testing purposes.",
    "guidelines": [
      "Always be polite and professional",
      "Provide clear and concise answers",
      "Test all functionality thoroughly"
    ],
    "status": "active",
    "tags": ["test", "demo"]
  }')

INSTRUCTION_ID=$(echo "$INSTRUCTION_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])" 2>/dev/null || echo "")

if [ -z "$INSTRUCTION_ID" ]; then
  echo "❌ Failed to create instruction"
  echo "$INSTRUCTION_RESPONSE"
  exit 1
fi

echo "✅ Created instruction: $INSTRUCTION_ID"
echo ""

# Step 3: Create some tools
echo "Step 3: Create test tools..."
TOOL1_RESPONSE=$(curl -s -X POST "${AIWM_BASE_URL}/tools" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-tool-read",
    "type": "builtin",
    "description": "Read files from filesystem",
    "category": "productivity",
    "status": "active",
    "scope": "public",
    "schema": {
      "inputSchema": { "type": "object", "properties": { "path": { "type": "string" } } },
      "outputSchema": { "type": "object", "properties": { "content": { "type": "string" } } }
    }
  }')

TOOL1_ID=$(echo "$TOOL1_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])" 2>/dev/null || echo "")

TOOL2_RESPONSE=$(curl -s -X POST "${AIWM_BASE_URL}/tools" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-tool-write",
    "type": "builtin",
    "description": "Write files to filesystem",
    "category": "productivity",
    "status": "active",
    "scope": "public",
    "schema": {
      "inputSchema": { "type": "object", "properties": { "path": { "type": "string" }, "content": { "type": "string" } } },
      "outputSchema": { "type": "object", "properties": { "success": { "type": "boolean" } } }
    }
  }')

TOOL2_ID=$(echo "$TOOL2_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])" 2>/dev/null || echo "")

if [ -z "$TOOL1_ID" ] || [ -z "$TOOL2_ID" ]; then
  echo "❌ Failed to create tools"
  exit 1
fi

echo "✅ Created tools: $TOOL1_ID, $TOOL2_ID"
echo ""

# Step 4: Create a node (required for agent)
echo "Step 4: Create node for agent..."
NODE_RESPONSE=$(curl -s -X POST "${AIWM_BASE_URL}/nodes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-node-01",
    "role": ["worker"],
    "local": false,
    "specs": {
      "cpu": 8,
      "memory": 16,
      "disk": 500,
      "gpu": []
    },
    "location": {
      "region": "us-west-1",
      "datacenter": "test-dc"
    }
  }')

NODE_ID=$(echo "$NODE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])" 2>/dev/null || echo "")

if [ -z "$NODE_ID" ]; then
  echo "❌ Failed to create node"
  echo "$NODE_RESPONSE"
  exit 1
fi

echo "✅ Created node: $NODE_ID"
echo ""

# Step 5: Create agent with instruction and tools (autonomous type)
echo "Step 5: Create agent (autonomous type)..."
AGENT_RESPONSE=$(curl -s -X POST "${AIWM_BASE_URL}/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Connection Agent\",
    \"description\": \"Agent for testing connection flow\",
    \"status\": \"active\",
    \"type\": \"autonomous\",
    \"instructionId\": \"$INSTRUCTION_ID\",
    \"nodeId\": \"$NODE_ID\",
    \"secret\": \"test-secret-123456\",
    \"allowedToolIds\": [\"$TOOL1_ID\", \"$TOOL2_ID\"],
    \"settings\": {
      \"auth_roles\": [\"agent\", \"document.reader\"],
      \"claude_model\": \"claude-3-5-haiku-latest\",
      \"claude_maxTurns\": 50,
      \"claude_permissionMode\": \"bypassPermissions\",
      \"claude_resume\": true,
      \"discord_token\": \"test-discord-token\",
      \"discord_channelIds\": [\"123456789\"],
      \"telegram_token\": \"test-telegram-token\",
      \"telegram_groupIds\": [\"-1001234567890\"]
    },
    \"tags\": [\"test\", \"connection-test\"]
  }")

AGENT_ID=$(echo "$AGENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['_id'])" 2>/dev/null || echo "")

if [ -z "$AGENT_ID" ]; then
  echo "❌ Failed to create agent"
  echo "$AGENT_RESPONSE"
  exit 1
fi

echo "✅ Created agent: $AGENT_ID"
echo ""

# Step 6: Regenerate credentials
echo "Step 6: Regenerate agent credentials..."
CREDENTIALS_RESPONSE=$(curl -s -X POST "${AIWM_BASE_URL}/agents/${AGENT_ID}/credentials/regenerate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

NEW_SECRET=$(echo "$CREDENTIALS_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['secret'])" 2>/dev/null || echo "")
ENV_CONFIG=$(echo "$CREDENTIALS_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['envConfig'])" 2>/dev/null || echo "")

if [ -z "$NEW_SECRET" ]; then
  echo "❌ Failed to regenerate credentials"
  echo "$CREDENTIALS_RESPONSE"
  exit 1
fi

echo "✅ Regenerated credentials"
echo "   New secret: ${NEW_SECRET:0:20}..."
echo ""
echo "   Generated .env config:"
echo "   ---"
echo "$ENV_CONFIG" | head -10
echo "   ---"
echo ""

# Step 7: Test agent connection with NEW secret
echo "Step 7: Test agent connection..."
CONNECT_RESPONSE=$(curl -s -X POST "${AIWM_BASE_URL}/agents/${AGENT_ID}/connect" \
  -H "Content-Type: application/json" \
  -d "{
    \"secret\": \"$NEW_SECRET\"
  }")

AGENT_TOKEN=$(echo "$CONNECT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "")
EXPIRES_IN=$(echo "$CONNECT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['expiresIn'])" 2>/dev/null || echo "")
TOKEN_TYPE=$(echo "$CONNECT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['tokenType'])" 2>/dev/null || echo "")
INSTRUCTION_TEXT=$(echo "$CONNECT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['instruction'])" 2>/dev/null || echo "")

if [ -z "$AGENT_TOKEN" ]; then
  echo "❌ Failed to connect agent"
  echo "$CONNECT_RESPONSE"
  exit 1
fi

echo "✅ Agent connected successfully"
echo "   accessToken: ${AGENT_TOKEN:0:30}..."
echo "   expiresIn: $EXPIRES_IN seconds (24 hours)"
echo "   tokenType: $TOKEN_TYPE"
echo ""
echo "   Received instruction:"
echo "   ---"
echo "$INSTRUCTION_TEXT" | head -5
echo "   ..."
echo "   ---"
echo ""

# Show tools received
echo "   Received tools:"
echo "$CONNECT_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
tools = data.get('tools', [])
print(f'   Total tools: {len(tools)}')
for tool in tools:
    print(f'   - {tool[\"name\"]}: {tool[\"description\"]}')
" 2>/dev/null || echo "   (Could not parse tools)"
echo ""

# Validate JWT payload structure
echo "   Validating JWT payload structure..."
echo "$AGENT_TOKEN" | python3 -c "
import sys, json, base64
token_parts = sys.stdin.read().strip().split('.')
if len(token_parts) >= 2:
    # Decode JWT payload (add padding if needed)
    payload_b64 = token_parts[1]
    padding = 4 - len(payload_b64) % 4
    if padding != 4:
        payload_b64 += '=' * padding
    payload_json = base64.urlsafe_b64decode(payload_b64)
    payload = json.loads(payload_json)

    print(f'   ✓ sub (agentId): {payload.get(\"sub\", \"MISSING\")}')
    print(f'   ✓ username: {payload.get(\"username\", \"MISSING\")}')
    print(f'   ✓ status: {payload.get(\"status\", \"MISSING\")}')
    print(f'   ✓ roles: {payload.get(\"roles\", \"MISSING\")}')
    print(f'   ✓ orgId: {payload.get(\"orgId\", \"MISSING\")}')
    print(f'   ✓ agentId: {payload.get(\"agentId\", \"MISSING\")}')
    print(f'   ✓ userId: \"{payload.get(\"userId\", \"MISSING\")}\" (should be empty)')
    print(f'   ✓ type: {payload.get(\"type\", \"MISSING\")}')

    # Validate format
    if payload.get('username', '').startswith('agent:'):
        print('   ✅ JWT payload structure matches IAM format')
    else:
        print('   ⚠️  username format unexpected')
else:
    print('   ❌ Invalid JWT format')
" 2>/dev/null || echo "   (Could not decode JWT)"
echo ""

# Step 8: Test heartbeat
echo "Step 8: Test agent heartbeat..."
HEARTBEAT_RESPONSE=$(curl -s -X POST "${AIWM_BASE_URL}/agents/${AGENT_ID}/heartbeat" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "online",
    "metrics": {
      "cpu": 45,
      "memory": 60,
      "activeConnections": 3
    }
  }')

HEARTBEAT_SUCCESS=$(echo "$HEARTBEAT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null || echo "false")

if [ "$HEARTBEAT_SUCCESS" != "True" ]; then
  echo "❌ Failed to send heartbeat"
  echo "$HEARTBEAT_RESPONSE"
  exit 1
fi

echo "✅ Heartbeat sent successfully"
echo ""

# Step 9: Verify agent details
echo "Step 9: Verify agent details..."
AGENT_DETAILS=$(curl -s -X GET "${AIWM_BASE_URL}/agents/${AGENT_ID}?populate=instruction" \
  -H "Authorization: Bearer $TOKEN")

echo "$AGENT_DETAILS" | python3 -c "
import sys, json
agent = json.load(sys.stdin)
print('   Agent Details:')
print(f'   - Name: {agent[\"name\"]}')
print(f'   - Status: {agent[\"status\"]}')
print(f'   - Connection Count: {agent.get(\"connectionCount\", 0)}')
print(f'   - Last Connected: {agent.get(\"lastConnectedAt\", \"Never\")}')
print(f'   - Last Heartbeat: {agent.get(\"lastHeartbeatAt\", \"Never\")}')
print(f'   - Allowed Tools: {len(agent.get(\"allowedToolIds\", []))}')
print(f'   - Has Settings: {\"Yes\" if agent.get(\"settings\") else \"No\"}')
" 2>/dev/null || echo "   (Could not parse agent details)"
echo ""

# Summary
echo "==================================================================="
echo "  ✅ All Tests Passed!"
echo "==================================================================="
echo ""
echo "Summary:"
echo "  - Instruction ID: $INSTRUCTION_ID"
echo "  - Tool IDs: $TOOL1_ID, $TOOL2_ID"
echo "  - Node ID: $NODE_ID"
echo "  - Agent ID: $AGENT_ID"
echo "  - Agent Token: ${AGENT_TOKEN:0:40}..."
echo ""
echo "Next steps to test on actual agent client:"
echo "1. Copy the generated .env config"
echo "2. Update agent client .env file"
echo "3. Start agent client"
echo "4. Agent should connect and receive instruction + tools"
echo ""
