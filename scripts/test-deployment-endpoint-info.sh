#!/bin/bash

# Test script for deployment endpoint integration info
# This script demonstrates the new virtual "endpoint" field feature

set -e

echo "=========================================="
echo "Test: Deployment Endpoint Integration Info"
echo "=========================================="
echo ""

# Get fresh token
echo "Step 1: Authenticating..."
RESPONSE=$(curl -s -X POST 'https://api.x-or.cloud/dev/iam-v2/auth/login' \
  -H 'Content-Type: application/json' \
  -d @- <<'EOFLOGIN'
{
  "username": "admin@x-or.cloud",
  "password": "NewPass123!"
}
EOFLOGIN
)

TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
echo "✓ Authenticated successfully"
echo ""

# First, get list of deployments to find an ID
echo "Step 2: Listing deployments..."
DEPLOYMENTS=$(curl -s -X GET "http://localhost:3003/deployments?limit=1" \
  -H "Authorization: Bearer $TOKEN")

DEPLOYMENT_ID=$(echo "$DEPLOYMENTS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('data') and len(data['data']) > 0:
    print(data['data'][0]['_id'])
else:
    print('NOT_FOUND')
")

if [ "$DEPLOYMENT_ID" = "NOT_FOUND" ]; then
  echo "⚠ No deployments found. Please create a deployment first."
  echo ""
  echo "Example: Create a deployment via POST /deployments"
  exit 0
fi

echo "✓ Found deployment: $DEPLOYMENT_ID"
echo ""

# Test GET /deployments (list with endpoint info)
echo "Step 3: Testing GET /deployments (with endpoint field)"
echo "=========================================="
curl -s -X GET "http://localhost:3003/deployments?limit=1" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('data') and len(data['data']) > 0:
    deployment = data['data'][0]
    print(f\"Deployment: {deployment.get('name')}\")
    print(f\"Status: {deployment.get('status')}\")
    print()
    if 'endpoint' in deployment:
        endpoint = deployment['endpoint']
        print('✓ Endpoint field is present!')
        print()
        print('Endpoint URL:')
        print(f\"  {endpoint.get('url')}\")
        print()
        print('Headers:')
        for key, value in endpoint.get('headers', {}).items():
            print(f\"  {key}: {value}\")
        print()
        print('Sample Body:')
        print(json.dumps(endpoint.get('body', {}), indent=2))
        print()
        print('Integration Guide (first 500 chars):')
        guide = endpoint.get('description', '')
        print(guide[:500])
        if len(guide) > 500:
            print('...')
    else:
        print('✗ Endpoint field is missing!')
else:
    print('No deployments found')
"
echo ""

# Test GET /deployments/:id (single deployment with endpoint info)
echo "Step 4: Testing GET /deployments/:id (with endpoint field)"
echo "=========================================="
curl -s -X GET "http://localhost:3003/deployments/$DEPLOYMENT_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
deployment = json.load(sys.stdin)
print(f\"Deployment: {deployment.get('name')}\")
print(f\"Status: {deployment.get('status')}\")
print()
if 'endpoint' in deployment:
    endpoint = deployment['endpoint']
    print('✓ Endpoint field is present!')
    print()
    print('Full Endpoint Information:')
    print(json.dumps(endpoint, indent=2))
else:
    print('✗ Endpoint field is missing!')
"
echo ""

echo "=========================================="
echo "✓ Test completed successfully!"
echo "=========================================="
