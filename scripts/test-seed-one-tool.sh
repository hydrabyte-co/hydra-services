#!/bin/bash

# Test script to seed a single tool: cbm_documents_getContent

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
AIWM_BASE_URL="${AIWM_BASE_URL:-https://api.x-or.cloud/dev/aiwm}"
CBM_BASE_URL="${CBM_BASE_URL:-https://api.x-or.cloud/dev/cbm}"

# Check credentials
if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo -e "${RED}✗ Error: ADMIN_USERNAME and ADMIN_PASSWORD required${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 1: Authenticating...${NC}"

# Login
LOGIN_RESPONSE=$(curl -s -X POST 'https://api.x-or.cloud/dev/iam-v2/auth/login' \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Authentication failed${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Authenticated${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Create tool
echo -e "${YELLOW}Step 2: Creating cbm_documents_getContent tool...${NC}"

TOOL_JSON="{
  \"name\": \"cbm_documents_getContent\",
  \"description\": \"Get document content with appropriate MIME type\",
  \"type\": \"api\",
  \"category\": \"data\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {
        \"id\": {\"type\": \"string\", \"description\": \"Document ID\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"string\",
      \"description\": \"Document content as text\"
    }
  },
  \"execution\": {
    \"method\": \"GET\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/documents/{id}/content\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

echo "Request URL: ${AIWM_BASE_URL}/tools"
echo "Request Body:"
echo "$TOOL_JSON" | python3 -m json.tool
echo ""

RESPONSE=$(curl -s -X POST "${AIWM_BASE_URL}/tools" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$TOOL_JSON")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE" | python3 -m json.tool

TOOL_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('_id', ''))" 2>/dev/null || echo "")

if [ -z "$TOOL_ID" ]; then
  echo -e "${RED}✗ Failed to create tool${NC}"
  exit 1
else
  echo ""
  echo -e "${GREEN}✓ Tool created successfully!${NC}"
  echo -e "${GREEN}Tool ID: $TOOL_ID${NC}"
fi
