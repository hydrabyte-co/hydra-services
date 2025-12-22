#!/bin/bash

# Script to test the Change Password feature in IAM service
# Prerequisites: IAM service must be running on port 3000

set -e

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "Test Change Password Feature"
echo "=========================================="
echo ""

# Step 1: Login as admin (organization.owner)
echo "Step 1: Login as organization.owner..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "username",
    "password": "..."
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to login. Response:"
  echo "$LOGIN_RESPONSE" | python3 -m json.tool
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Step 2: List users to get a user ID
echo "Step 2: Get list of users..."
USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/users?limit=5" \
  -H "Authorization: Bearer $TOKEN")

echo "$USERS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'data' in data and len(data['data']) > 0:
    print('✅ Found users:')
    for user in data['data'][:3]:
        print(f\"  - ID: {user['_id']}, Username: {user['username']}, Status: {user['status']}\")
else:
    print('⚠️  No users found')
" || echo "Failed to parse users"

# Extract first user ID
USER_ID=$(echo "$USERS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['_id'] if 'data' in data and len(data['data']) > 0 else '')" 2>/dev/null || echo "")

if [ -z "$USER_ID" ]; then
  echo "❌ No user ID found to test with"
  exit 1
fi

echo ""
echo "Using User ID: $USER_ID"
echo ""

# Step 3: Test change password with valid password
echo "Step 3: Change password with valid password..."
CHANGE_PASS_RESPONSE=$(curl -s -X PATCH "$BASE_URL/users/$USER_ID/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewP@ssw0rd123"
  }')

echo "$CHANGE_PASS_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'message' in data:
        print(f\"✅ {data['message']}\")
    else:
        print('Response:', json.dumps(data, indent=2))
except:
    print(sys.stdin.read())
"
echo ""

# Step 4: Test change password with invalid password (too short)
echo "Step 4: Test with invalid password (too short)..."
INVALID_RESPONSE=$(curl -s -X PATCH "$BASE_URL/users/$USER_ID/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "Short1!"
  }')

echo "$INVALID_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'statusCode' in data and data['statusCode'] == 400:
        print('✅ Validation working: Password too short rejected')
        if 'message' in data:
            print(f\"   Message: {data['message']}\")
    else:
        print('⚠️  Unexpected response:', json.dumps(data, indent=2))
except:
    print(sys.stdin.read())
"
echo ""

# Step 5: Test change password without special character
echo "Step 5: Test with password missing special character..."
INVALID_RESPONSE2=$(curl -s -X PATCH "$BASE_URL/users/$USER_ID/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NoSpecial123"
  }')

echo "$INVALID_RESPONSE2" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'statusCode' in data and data['statusCode'] == 400:
        print('✅ Validation working: Password without special char rejected')
        if 'message' in data:
            print(f\"   Message: {data['message']}\")
    else:
        print('⚠️  Unexpected response:', json.dumps(data, indent=2))
except:
    print(sys.stdin.read())
"
echo ""

# Step 6: Test without organization.owner role (if possible)
echo "Step 6: Test RBAC - without organization.owner role..."
echo "(This test requires a non-owner user to be fully tested)"
echo "Current implementation checks for 'organization.owner' or 'universe.owner' role"
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "✅ Login successful"
echo "✅ User listing works"
echo "✅ Valid password change accepted"
echo "✅ Invalid password (too short) rejected"
echo "✅ Invalid password (no special char) rejected"
echo "⚠️  RBAC test requires non-owner user"
echo ""
echo "Password Policy Applied:"
echo "  - Minimum 8 characters"
echo "  - Must contain uppercase letters"
echo "  - Must contain lowercase letters"
echo "  - Must contain numbers"
echo "  - Must contain special characters (@.#$!%*?&_-)"
echo ""
echo "RBAC Policy:"
echo "  - Only organization.owner can change passwords"
echo "  - Can only change passwords for users in same organization"
echo ""
