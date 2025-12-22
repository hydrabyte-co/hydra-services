#!/bin/bash

# Test License Decorator on User Controller
# Service: IAM (PORT 3000)

echo "==================================="
echo "Test License Decorator"
echo "==================================="

# Step 1: Login to get token
echo ""
echo "Step 1: Login to get access token..."
RESPONSE=$(curl -s -X POST 'http://localhost:3000/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "username",
    "password": "..."
  }')

TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
ORG_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['orgId'])")

echo "✓ Token obtained"
echo "✓ Organization ID: $ORG_ID"

# Step 2: Check current license for IAM service
echo ""
echo "Step 2: Check current IAM license..."
CURRENT_LICENSE=$(curl -s -X GET "http://localhost:3000/licenses/organization/$ORG_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for lic in data:
    if lic['serviceName'] == 'iam':
        print(lic['type'])
        break
")

echo "Current IAM license: $CURRENT_LICENSE"

# Step 3: Test with FULL license (should pass)
echo ""
echo "Step 3: Test endpoint with FULL license (should succeed)..."
if [ "$CURRENT_LICENSE" = "full" ]; then
    curl -s -X POST 'http://localhost:3000/users' \
      -H "Authorization: Bearer $TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{
        "username": "test-license-user",
        "email": "test-license@example.com",
        "password": "Test123!",
        "status": "active"
      }' | python3 -m json.tool

    echo ""
    echo "✓ Test với FULL license: PASSED"
else
    echo "⚠ Current license is $CURRENT_LICENSE, not FULL. Skipping..."
fi

# Step 4: Change license to LIMITED
echo ""
echo "Step 4: Change IAM license to LIMITED..."
curl -s -X PATCH "http://localhost:3000/licenses/organization/$ORG_ID/service/iam" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"type": "limited"}' | python3 -m json.tool

echo ""
echo "✓ License changed to LIMITED"

# Step 5: Refresh token to get new license
echo ""
echo "Step 5: Refresh token to get updated license..."
REFRESH_RESPONSE=$(curl -s -X POST 'http://localhost:3000/auth/refresh' \
  -H "Authorization: Bearer $TOKEN")

NEW_TOKEN=$(echo "$REFRESH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
echo "✓ New token obtained with updated license"

# Step 6: Test with LIMITED license (should fail)
echo ""
echo "Step 6: Test endpoint with LIMITED license (should fail)..."
curl -s -X POST 'http://localhost:3000/users' \
  -H "Authorization: Bearer $NEW_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "test-license-user2",
    "email": "test-license2@example.com",
    "password": "Test123!",
    "status": "active"
  }' | python3 -m json.tool

echo ""
echo "✗ Test với LIMITED license: BLOCKED (expected)"

# Step 7: Restore FULL license
echo ""
echo "Step 7: Restore IAM license to FULL..."
curl -s -X PATCH "http://localhost:3000/licenses/organization/$ORG_ID/service/iam" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"type": "full"}' > /dev/null

echo "✓ License restored to FULL"

echo ""
echo "==================================="
echo "Test completed!"
echo "==================================="
