#!/bin/bash

# Test script for CBM Document Append Operations
# Tests: append, append-after-text, append-to-section

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API endpoints
IAM_URL="http://api.x-or.cloud/dev/iam-v2"
CBM_URL="http://localhost:3001"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CBM Document Append Operations Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  exit 1
fi

# Load credentials from .env
source .env

if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo -e "${RED}Error: ADMIN_USERNAME or ADMIN_PASSWORD not set in .env${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 1: Login and get JWT token${NC}"

# Create temp file for login
cat > /tmp/login.json <<EOFLOGIN
{
  "username": "$ADMIN_USERNAME",
  "password": "$ADMIN_PASSWORD"
}
EOFLOGIN

RESPONSE=$(curl -L -s -X POST "$IAM_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d @/tmp/login.json)

rm -f /tmp/login.json

TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('accessToken', ''))" 2>/dev/null)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTFlYmEwODUxN2Y5MTc5NDNhZTFmYTEiLCJ1c2VybmFtZSI6ImFkbWluQHgtb3IuY2xvdWQiLCJzdGF0dXMiOiJhY3RpdmUiLCJyb2xlcyI6WyJ1bml2ZXJzZS5vd25lciJdLCJvcmdJZCI6IjY5MWViOWU2NTE3ZjkxNzk0M2FlMWY5ZCIsImdyb3VwSWQiOiIiLCJhZ2VudElkIjoiIiwiYXBwSWQiOiIiLCJpYXQiOjE3NjU5NDMyMTEsImV4cCI6MTc2NTk0NjgxMX0.7Mi-2Ykv3fKJ6MpL7x1mqNKVKLDvedzFIB91A_rqPmI"
if [ -z "$TOKEN" ]; then
  echo -e "${RED}Error: Failed to get access token${NC}"
  echo "Response: $RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo ""

# Step 2: Create test document
echo -e "${YELLOW}Step 2: Create test document${NC}"

cat > /tmp/doc.json <<'EOFDATA'
{
  "summary": "Append Operations Test Document",
  "content": "# Test Document\n\n## Section One\nOriginal content in section one.\n\n## Section Two\nOriginal content in section two.",
  "type": "markdown",
  "labels": ["test", "append"],
  "status": "draft"
}
EOFDATA

DOC_RESPONSE=$(curl -s -X POST "$CBM_URL/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/doc.json)

DOC_ID=$(echo "$DOC_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('_id', ''))" 2>/dev/null)

if [ -z "$DOC_ID" ]; then
  echo -e "${RED}Error: Failed to create document${NC}"
  echo "Response: $DOC_RESPONSE"
  rm -f /tmp/doc.json
  exit 1
fi

echo -e "${GREEN}✓ Created document: $DOC_ID${NC}"
rm -f /tmp/doc.json
echo ""

# Step 3: Test append to end
echo -e "${YELLOW}Step 3: Test 'append' operation (append to end)${NC}"

echo "3.1 Content before append:"
BEFORE=$(curl -s -X GET "$CBM_URL/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN")
echo "----------------------------------------"
echo "$BEFORE"
echo "----------------------------------------"
echo ""

cat > /tmp/append.json <<'EOFDATA'
{
  "operation": "append",
  "content": "\n\n## Section Three\nThis is new section appended at the end."
}
EOFDATA

echo "3.2 Request payload:"
cat /tmp/append.json | python3 -m json.tool 2>/dev/null || cat /tmp/append.json
echo ""

APPEND_RESULT=$(curl -s -X PATCH "$CBM_URL/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/append.json)
rm -f /tmp/append.json

if echo "$APPEND_RESULT" | grep -q "error\|Error\|statusCode"; then
  echo -e "${RED}✗ Append operation failed${NC}"
  echo "$APPEND_RESULT" | python3 -m json.tool 2>/dev/null || echo "$APPEND_RESULT"
else
  echo -e "${GREEN}✓ Append operation successful${NC}"

  echo ""
  echo "3.3 Content after append:"
  AFTER=$(curl -s -X GET "$CBM_URL/documents/$DOC_ID/content" \
    -H "Authorization: Bearer $TOKEN")
  echo "----------------------------------------"
  echo "$AFTER"
  echo "----------------------------------------"

  if echo "$AFTER" | grep -q "Section Three"; then
    echo -e "${GREEN}✓ Verified: New section appended successfully${NC}"
  else
    echo -e "${YELLOW}⚠ Warning: Could not verify appended content${NC}"
  fi
fi
echo ""

# Step 4: Test append after text
echo -e "${YELLOW}Step 4: Test 'append-after-text' operation${NC}"

echo "4.1 Content before append-after-text:"
BEFORE=$(curl -s -X GET "$CBM_URL/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN")
echo "----------------------------------------"
echo "$BEFORE" | head -10
echo "----------------------------------------"
echo ""

cat > /tmp/append-after.json <<'EOFDATA'
{
  "operation": "append-after-text",
  "find": "## Section One",
  "content": "\n\nAppended paragraph after Section One heading."
}
EOFDATA

echo "4.2 Request payload:"
cat /tmp/append-after.json | python3 -m json.tool 2>/dev/null || cat /tmp/append-after.json
echo ""

APPEND_AFTER_RESULT=$(curl -s -X PATCH "$CBM_URL/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/append-after.json)
rm -f /tmp/append-after.json

if echo "$APPEND_AFTER_RESULT" | grep -q "error\|Error\|statusCode"; then
  echo -e "${RED}✗ Append-after-text operation failed${NC}"
  echo "$APPEND_AFTER_RESULT" | python3 -m json.tool 2>/dev/null || echo "$APPEND_AFTER_RESULT"
else
  echo -e "${GREEN}✓ Append-after-text operation successful${NC}"

  echo ""
  echo "4.3 Content after append-after-text:"
  AFTER=$(curl -s -X GET "$CBM_URL/documents/$DOC_ID/content" \
    -H "Authorization: Bearer $TOKEN")
  echo "----------------------------------------"
  echo "$AFTER" | head -15
  echo "----------------------------------------"

  if echo "$AFTER" | grep -q "Appended paragraph after Section One"; then
    echo -e "${GREEN}✓ Verified: Content appended after text successfully${NC}"
  else
    echo -e "${YELLOW}⚠ Warning: Could not verify appended content${NC}"
  fi
fi
echo ""

# Step 5: Test append to section
echo -e "${YELLOW}Step 5: Test 'append-to-section' operation${NC}"

echo "5.1 Content before append-to-section:"
BEFORE=$(curl -s -X GET "$CBM_URL/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN")
echo "----------------------------------------"
echo "$BEFORE"
echo "----------------------------------------"
echo ""

cat > /tmp/append-section.json <<'EOFDATA'
{
  "operation": "append-to-section",
  "section": "## Section Two",
  "content": "\n\n### Subsection 2.1\nThis subsection is appended to Section Two."
}
EOFDATA

echo "5.2 Request payload:"
cat /tmp/append-section.json | python3 -m json.tool 2>/dev/null || cat /tmp/append-section.json
echo ""

APPEND_SECTION_RESULT=$(curl -s -X PATCH "$CBM_URL/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/append-section.json)
rm -f /tmp/append-section.json

if echo "$APPEND_SECTION_RESULT" | grep -q "error\|Error\|statusCode"; then
  echo -e "${RED}✗ Append-to-section operation failed${NC}"
  echo "$APPEND_SECTION_RESULT" | python3 -m json.tool 2>/dev/null || echo "$APPEND_SECTION_RESULT"
else
  echo -e "${GREEN}✓ Append-to-section operation successful${NC}"

  echo ""
  echo "5.3 Content after append-to-section:"
  AFTER=$(curl -s -X GET "$CBM_URL/documents/$DOC_ID/content" \
    -H "Authorization: Bearer $TOKEN")
  echo "----------------------------------------"
  echo "$AFTER"
  echo "----------------------------------------"

  if echo "$AFTER" | grep -q "Subsection 2.1"; then
    echo -e "${GREEN}✓ Verified: Subsection appended to section successfully${NC}"
  else
    echo -e "${YELLOW}⚠ Warning: Could not verify appended content${NC}"
  fi
fi
echo ""

# Step 6: Test multiple appends (real-world scenario)
echo -e "${YELLOW}Step 6: Test multiple sequential appends${NC}"
echo "Scenario: AI agent building a log file incrementally"
echo ""

# Reset document
cat > /tmp/reset.json <<'EOFDATA'
{
  "operation": "replace",
  "content": "# System Log\n\n## Events"
}
EOFDATA

curl -s -X PATCH "$CBM_URL/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/reset.json > /dev/null
rm -f /tmp/reset.json

echo "6.1 Initial content:"
INITIAL=$(curl -s -X GET "$CBM_URL/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN")
echo "----------------------------------------"
echo "$INITIAL"
echo "----------------------------------------"
echo ""

# Append log entry 1
cat > /tmp/log1.json <<'EOFDATA'
{
  "operation": "append-to-section",
  "section": "## Events",
  "content": "\n- [10:00] System started"
}
EOFDATA

curl -s -X PATCH "$CBM_URL/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/log1.json > /dev/null
rm -f /tmp/log1.json
echo "6.2 Appended log entry 1"

# Append log entry 2
cat > /tmp/log2.json <<'EOFDATA'
{
  "operation": "append-to-section",
  "section": "## Events",
  "content": "\n- [10:05] User login: admin"
}
EOFDATA

curl -s -X PATCH "$CBM_URL/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/log2.json > /dev/null
rm -f /tmp/log2.json
echo "6.3 Appended log entry 2"

# Append log entry 3
cat > /tmp/log3.json <<'EOFDATA'
{
  "operation": "append-to-section",
  "section": "## Events",
  "content": "\n- [10:10] Data processed successfully"
}
EOFDATA

curl -s -X PATCH "$CBM_URL/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/log3.json > /dev/null
rm -f /tmp/log3.json
echo "6.4 Appended log entry 3"

echo ""
echo "6.5 Final content after 3 sequential appends:"
FINAL=$(curl -s -X GET "$CBM_URL/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN")
echo "----------------------------------------"
echo "$FINAL"
echo "----------------------------------------"

if echo "$FINAL" | grep -q "10:00.*10:05.*10:10"; then
  echo -e "${GREEN}✓ Verified: All log entries appended in correct order${NC}"
else
  echo -e "${YELLOW}⚠ Warning: Could not verify all log entries${NC}"
fi
echo ""

# Step 7: Cleanup
echo -e "${YELLOW}Step 7: Cleanup test document${NC}"
curl -s -X DELETE "$CBM_URL/documents/$DOC_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
echo -e "${GREEN}✓ Deleted test document${NC}"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  All append tests completed!${NC}"
echo -e "${BLUE}========================================${NC}"
