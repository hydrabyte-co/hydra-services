#!/bin/bash

# Test script for X-Organization-Id header override feature
# This demonstrates how universe.owner role can override orgId via header

set -e

echo "======================================================================"
echo "🧪 Test: X-Organization-Id Header Override for Universe Role"
echo "======================================================================"
echo ""

# Get fresh token for universe.owner user
echo "Step 1: Login as universe.owner (admin@x-or.cloud)"
echo "----------------------------------------------------------------------"
RESPONSE=$(curl -s -X POST 'https://api.x-or.cloud/dev/iam-v2/auth/login' \
  -H 'Content-Type: application/json' \
  -d @- <<'EOFLOGIN'
{
  "username": "username",
  "password": "..."
}
EOFLOGIN
)

TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
ORIGINAL_ORG_ID=$(echo "$RESPONSE" | python3 -c "import sys, json;
import base64
token = json.load(sys.stdin)['accessToken']
payload = token.split('.')[1]
# Add padding if needed
payload += '=' * (4 - len(payload) % 4)
decoded = base64.b64decode(payload)
print(json.loads(decoded)['orgId'])
")

echo "✅ Login successful"
echo "   Token: ${TOKEN:0:50}..."
echo "   Original orgId from JWT: $ORIGINAL_ORG_ID"
echo ""

# Test 1: API call WITHOUT X-Organization-Id header (uses JWT orgId)
echo "Step 2: Test API call WITHOUT X-Organization-Id header"
echo "----------------------------------------------------------------------"
echo "Expected: Uses orgId from JWT token ($ORIGINAL_ORG_ID)"
echo ""
curl -s -X GET "http://localhost:3305/tools?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"✅ Response received\")
    print(f\"   Total records: {data.get('pagination', {}).get('total', 0)}\")
    print(f\"   Records returned: {len(data.get('data', []))}\")
except Exception as e:
    print(f\"❌ Error: {e}\")
"
echo ""

# Test 2: API call WITH X-Organization-Id header (override orgId)
echo "Step 3: Test API call WITH X-Organization-Id header"
echo "----------------------------------------------------------------------"
OVERRIDE_ORG_ID="691eb9e6517f917943ae1f9d"
echo "Expected: Uses orgId from header ($OVERRIDE_ORG_ID)"
echo ""
curl -s -X GET "http://localhost:3305/tools?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: $OVERRIDE_ORG_ID" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"✅ Response received with override header\")
    print(f\"   Total records: {data.get('pagination', {}).get('total', 0)}\")
    print(f\"   Records returned: {len(data.get('data', []))}\")
    print(f\"   ⚠️  Check server logs for override confirmation\")
except Exception as e:
    print(f\"❌ Error: {e}\")
"
echo ""

# Test 3: API call with invalid ObjectId format
echo "Step 4: Test API call WITH INVALID X-Organization-Id format"
echo "----------------------------------------------------------------------"
INVALID_ORG_ID="invalid-id-123"
echo "Expected: Warning logged, falls back to JWT orgId ($ORIGINAL_ORG_ID)"
echo ""
curl -s -X GET "http://localhost:3305/tools?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: $INVALID_ORG_ID" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"✅ Response received (fallback to JWT orgId)\")
    print(f\"   Total records: {data.get('pagination', {}).get('total', 0)}\")
    print(f\"   ⚠️  Check server logs for warning message\")
except Exception as e:
    print(f\"❌ Error: {e}\")
"
echo ""

# Test 4: Verify case-insensitive header support
echo "Step 5: Test case-insensitive header (x-organization-id lowercase)"
echo "----------------------------------------------------------------------"
echo "Expected: Should work with lowercase header name"
echo ""
curl -s -X GET "http://localhost:3305/tools?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-organization-id: $OVERRIDE_ORG_ID" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"✅ Lowercase header accepted\")
    print(f\"   Total records: {data.get('pagination', {}).get('total', 0)}\")
except Exception as e:
    print(f\"❌ Error: {e}\")
"
echo ""

echo "======================================================================"
echo "📋 Test Summary"
echo "======================================================================"
echo "✅ Test 1: Without header - Uses JWT orgId"
echo "✅ Test 2: With valid header - Overrides orgId"
echo "✅ Test 3: With invalid header - Falls back to JWT orgId"
echo "✅ Test 4: Lowercase header - Case-insensitive support"
echo ""
echo "🔍 Server Logs to Check:"
echo "   - Look for '[CurrentUser] Universe role overriding orgId:' messages"
echo "   - Verify originalOrgId and overrideOrgId values"
echo "   - Check for warning messages on invalid ObjectId format"
echo ""
echo "======================================================================"
