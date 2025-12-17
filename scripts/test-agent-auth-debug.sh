#!/bin/bash

# Debug Agent Authentication Flow
# Tests connect + heartbeat with detailed logging

AIWM_URL="${AIWM_URL:-http://localhost:3003}"
AGENT_ID="6940db70d67065262c2e17ed"
AGENT_SECRET="NewPass123!"

echo "=== Agent Authentication Debug Test ==="
echo "AIWM URL: $AIWM_URL"
echo "Agent ID: $AGENT_ID"
echo ""

# Step 1: Connect and get token
echo "Step 1: Agent Connect"
echo "====================="

CONNECT_RESPONSE=$(curl -s -X POST "$AIWM_URL/agents/$AGENT_ID/connect" \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"$AGENT_SECRET\"}")

echo "Connect Response (first 500 chars):"
echo "$CONNECT_RESPONSE" | python3 -c "import sys; print(sys.stdin.read()[:500])"
echo ""

# Extract token
TOKEN=$(echo "$CONNECT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('accessToken', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get access token"
  echo "Full response:"
  echo "$CONNECT_RESPONSE" | python3 -m json.tool
  exit 1
fi

echo "✅ Got access token"
echo "Token (first 30 chars): ${TOKEN:0:30}..."
echo "Token (last 30 chars): ...${TOKEN: -30}"
echo ""

# Decode token to inspect payload (without verification)
echo "Token Payload (decoded without verification):"
echo "$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -m json.tool
echo ""

# Step 2: Test heartbeat
echo "Step 2: Agent Heartbeat"
echo "======================="

HEARTBEAT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$AIWM_URL/agents/$AGENT_ID/heartbeat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"idle"}')

HTTP_STATUS=$(echo "$HEARTBEAT_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$HEARTBEAT_RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo "Response:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Heartbeat successful!"
else
  echo "❌ Heartbeat failed with status: $HTTP_STATUS"
  echo ""
  echo "=== Debugging Info ==="
  echo "1. Check server logs for JWT secret hash mismatch"
  echo "2. Verify JWT_SECRET environment variable is set correctly"
  echo "3. Look for JwtStrategy and AgentService initialization logs"
fi
