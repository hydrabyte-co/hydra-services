#!/bin/bash

# Fix tool execution configuration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check credentials
if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo -e "${RED}✗ Error: ADMIN_USERNAME and ADMIN_PASSWORD required${NC}"
  exit 1
fi

echo -e "${YELLOW}Authenticating...${NC}"

# Login
LOGIN_RESPONSE=$(curl -s -X POST 'https://api.x-or.cloud/dev/iam-v2/auth/login' \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Authentication failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Authenticated${NC}\n"

# Tool ID
TOOL_ID="69415f4a56f90924a9b9537a"
CBM_BASE_URL="${CBM_BASE_URL:-https://api.x-or.cloud/dev/cbm}"

echo -e "${YELLOW}Updating tool execution configuration...${NC}"

# Update tool with execution field
curl -s -X PATCH "https://api.x-or.cloud/dev/aiwm/tools/$TOOL_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"execution\": {
      \"method\": \"GET\",
      \"baseUrl\": \"$CBM_BASE_URL\",
      \"path\": \"/documents/{id}/content\",
      \"headers\": {
        \"Content-Type\": \"application/json\"
      }
    }
  }" | python3 -m json.tool

echo ""
echo -e "${GREEN}✓ Tool updated successfully!${NC}"
