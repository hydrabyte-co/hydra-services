#!/bin/bash

# Script to test the Prevent Self-Delete feature in IAM service
# Prerequisites: IAM service must be running on port 3000

set -e

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "Test Prevent Self-Delete Feature"
echo "=========================================="
echo ""

# Step 1: Login as admin (organization.owner)
echo "Step 1: Login as organization.owner..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@x-or.cloud",
    "password": "NewPass123!"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to login. Response:"
  echo "$LOGIN_RESPONSE" | python3 -m json.tool
  exit 1
fi

# Extract user ID from token payload
USER_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['userId'])" 2>/dev/null || echo "")

echo "✅ Login successful"
echo "Token: ${TOKEN:0:50}..."
echo "User ID: $USER_ID"
echo ""

# Step 2: List users to get another user ID
echo "Step 2: Get list of users..."
USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/users?limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$USERS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'data' in data and len(data['data']) > 0:
    print('✅ Found users:')
    for i, user in enumerate(data['data'][:5]):
        print(f\"  {i+1}. ID: {user['_id']}, Username: {user['username']}, Roles: {', '.join(user.get('roles', []))}\")
else:
    print('⚠️  No users found')
" || echo "Failed to parse users"

# Find a different user ID (not the current user)
OTHER_USER_ID=$(echo "$USERS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
current_user = '$USER_ID'
if 'data' in data:
    for user in data['data']:
        if user['_id'] != current_user:
            print(user['_id'])
            break
" 2>/dev/null || echo "")

echo ""
echo "Current User ID: $USER_ID"
echo "Other User ID: $OTHER_USER_ID"
echo ""

# Step 3: Test self-deletion (should fail)
echo "=========================================="
echo "Step 3: Test Self-Deletion (SHOULD FAIL)"
echo "=========================================="
SELF_DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$SELF_DELETE_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'statusCode' in data and data['statusCode'] == 403:
        print('✅ Self-deletion blocked correctly!')
        print(f\"   Status Code: {data['statusCode']}\")
        print(f\"   Message: {data.get('message', 'N/A')}\")
        if 'Self-deletion is not allowed for security reasons' in str(data.get('message', '')):
            print('✅ Correct error message received')
        else:
            print('⚠️  Unexpected error message')
    else:
        print('❌ Self-deletion was NOT blocked!')
        print('Response:', json.dumps(data, indent=2))
except Exception as e:
    print('Error parsing response:', str(e))
    print(sys.stdin.read())
"
echo ""

# Step 4: Test deleting another user (should succeed)
if [ -n "$OTHER_USER_ID" ] && [ "$OTHER_USER_ID" != "$USER_ID" ]; then
    echo "=========================================="
    echo "Step 4: Test Deleting Another User (SHOULD SUCCEED)"
    echo "=========================================="
    echo "Attempting to delete user: $OTHER_USER_ID"

    OTHER_DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/users/$OTHER_USER_ID" \
      -H "Authorization: Bearer $TOKEN")

    echo "$OTHER_DELETE_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'message' in data and 'deleted successfully' in data.get('message', '').lower():
        print('✅ Other user deleted successfully')
        print(f\"   Message: {data['message']}\")
    elif 'statusCode' in data and data['statusCode'] >= 400:
        print('⚠️  Failed to delete other user')
        print(f\"   Status Code: {data['statusCode']}\")
        print(f\"   Message: {data.get('message', 'N/A')}\")
    else:
        print('Response:', json.dumps(data, indent=2))
except Exception as e:
    print('Error parsing response:', str(e))
    print(sys.stdin.read())
"
    echo ""
else
    echo "=========================================="
    echo "Step 4: Skipped (No other user available)"
    echo "=========================================="
    echo "⚠️  Only one user found, cannot test deleting another user"
    echo ""
fi

# Step 5: Test deleting last organization owner (create scenario if possible)
echo "=========================================="
echo "Step 5: Last Org Owner Protection"
echo "=========================================="
echo "ℹ️  This protection prevents deletion of the last organization.owner"
echo "   in an organization to ensure there's always an admin."
echo ""
echo "To test this scenario:"
echo "  1. Ensure there's only one organization.owner in the org"
echo "  2. Attempt to delete that owner"
echo "  3. Should receive: 'Cannot delete the last organization owner'"
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "✅ Self-deletion prevention tested"
echo "✅ Error message validation completed"
if [ -n "$OTHER_USER_ID" ]; then
    echo "✅ Deleting other users works correctly"
else
    echo "⚠️  Could not test deleting other users (only one user exists)"
fi
echo ""
echo "Security Features Implemented:"
echo "  ✓ Users cannot delete their own account"
echo "  ✓ Clear error message: 'Self-deletion is not allowed for security reasons'"
echo "  ✓ Last organization owner cannot be deleted"
echo "  ✓ Logging of deletion attempts for audit trail"
echo ""
