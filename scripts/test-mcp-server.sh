#!/bin/bash

# Test MCP Server with JWT authentication
# Agent JWT Token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTQwZGI3MGQ2NzA2NTI2MmMyZTE3ZWQiLCJ1c2VybmFtZSI6ImFnZW50OjY5NDBkYjcwZDY3MDY1MjYyYzJlMTdlZCIsInN0YXR1cyI6ImFjdGl2ZSIsInJvbGVzIjpbIm9yZ2FuaXphdGlvbi5vd25lciJdLCJvcmdJZCI6IjY5MWViOWU2NTE3ZjkxNzk0M2FlMWY5ZCIsImdyb3VwSWQiOiIiLCJhZ2VudElkIjoiNjk0MGRiNzBkNjcwNjUyNjJjMmUxN2VkIiwidXNlcklkIjoiIiwidHlwZSI6ImFnZW50IiwiaWF0IjoxNzY1OTA4OTE2LCJleHAiOjE3NjU5OTUzMTZ9.sde_-c491rR2TVMo9h5u-mlaLj9TebS667QPYABoc28"
MCP_URL="http://localhost:3306"

echo "=== Step 1: Initialize MCP Session ==="
echo ""

INIT_RESPONSE=$(curl -s -X POST "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {
        "roots": {
          "listChanged": true
        },
        "sampling": {}
      },
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }')

echo "Initialize Response:"
echo "$INIT_RESPONSE" | python3 -m json.tool
echo ""

# Extract session ID from initialize response
SESSION_ID=$(echo "$INIT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('result', {}).get('sessionId', ''))" 2>/dev/null || echo "")

if [ -z "$SESSION_ID" ]; then
  echo "Warning: No session ID in initialize response, generating one"
  SESSION_ID=$(uuidgen)
fi

echo "Session ID: $SESSION_ID"
echo ""

echo "=== Step 2: Send initialized notification ==="
echo ""

curl -s -X POST "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "notifications/initialized"
  }' > /dev/null

echo "Initialized notification sent"
echo ""

echo "=== Step 3: List Tools ==="
echo ""

LIST_RESPONSE=$(curl -s -X POST "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }')

echo "List Tools Response:"
echo "$LIST_RESPONSE" | python3 -m json.tool
echo ""

echo "=== Step 4: Call Tool (cbm_document_getContent) ==="
echo ""

CALL_RESPONSE=$(curl -s -X POST "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "cbm_document_getContent",
      "arguments": {
        "documentId": "test-doc-123"
      }
    }
  }')

echo "Call Tool Response:"
echo "$CALL_RESPONSE" | python3 -m json.tool
echo ""

echo "=== Test Complete ==="
