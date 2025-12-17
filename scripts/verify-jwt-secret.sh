#!/bin/bash

# Verify JWT Secret Mismatch
# This script helps identify which JWT_SECRET was used to sign the token

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTQwZGI3MGQ2NzA2NTI2MmMyZTE3ZWQiLCJ1c2VybmFtZSI6ImFnZW50OjY5NDBkYjcwZDY3MDY1MjYyYzJlMTdlZCIsInN0YXR1cyI6ImFjdGl2ZSIsInJvbGVzIjpbIm9yZ2FuaXphdGlvbi5vd25lciJdLCJvcmdJZCI6IjY5MWViOWU2NTE3ZjkxNzk0M2FlMWY5ZCIsImdyb3VwSWQiOiIiLCJhZ2VudElkIjoiNjk0MGRiNzBkNjcwNjUyNjJjMmUxN2VkIiwidXNlcklkIjoiIiwidHlwZSI6ImFnZW50IiwiaWF0IjoxNzY1OTUwMDExLCJleHAiOjE3NjYwMzY0MTF9.jpIF1AaA66mmq343Pgm4t4MYdzcTzha2K8sHzw74Yr0"

echo "=== JWT Token Analysis ==="
echo ""

# Decode header
echo "Header:"
echo "$TOKEN" | cut -d'.' -f1 | base64 -d 2>/dev/null | python3 -m json.tool
echo ""

# Decode payload
echo "Payload:"
echo "$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -m json.tool
echo ""

# Extract signature
SIGNATURE=$(echo "$TOKEN" | cut -d'.' -f3)
echo "Signature: $SIGNATURE"
echo ""

# Test with different secrets
echo "=== Testing with different JWT secrets ==="
echo ""

# Create a Node.js script to verify token with different secrets
cat > /tmp/verify-jwt.js <<'EOF'
const jwt = require('jsonwebtoken');

const token = process.argv[2];
const secrets = [
  'R4md0m_S3cr3t',
  'your-secret-key',
  process.env.JWT_SECRET || 'not-set',
];

console.log('Testing token verification with different secrets:\n');

secrets.forEach((secret, index) => {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(secret).digest('hex').substring(0, 8);

  try {
    const decoded = jwt.verify(token, secret);
    console.log(`✅ SECRET ${index + 1}: "${secret}" (hash: ${hash}...)`);
    console.log('   → TOKEN IS VALID with this secret!');
    console.log('   → Payload:', JSON.stringify(decoded).substring(0, 100) + '...\n');
  } catch (error) {
    console.log(`❌ SECRET ${index + 1}: "${secret}" (hash: ${hash}...)`);
    console.log(`   → Error: ${error.message}\n`);
  }
});

// Also test with the secret that has hash 9266112b
console.log('\nCalculating which secret produces hash 9266112b...');
const targetHash = '9266112b';
const commonSecrets = [
  'R4md0m_S3cr3t',
  'your-secret-key',
  'NewPass123!',
  'hydrabyte-secret',
  'jwt-secret-key',
];

commonSecrets.forEach(secret => {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(secret).digest('hex').substring(0, 8);
  if (hash === targetHash) {
    console.log(`\n🎯 FOUND: Secret "${secret}" has hash ${targetHash}`);
    try {
      const decoded = jwt.verify(token, secret);
      console.log('   ✅ And it VALIDATES the token successfully!');
    } catch (error) {
      console.log(`   ❌ But it does NOT validate the token: ${error.message}`);
    }
  }
});
EOF

# Run the verification
node /tmp/verify-jwt.js "$TOKEN"

# Cleanup
rm /tmp/verify-jwt.js

echo ""
echo "=== Analysis ==="
echo "The server logs show hash: 9266112b..."
echo "If none of the above secrets validate the token, then:"
echo "  1. The token was signed with a DIFFERENT secret than what's currently in JWT_SECRET"
echo "  2. The server was restarted with a different JWT_SECRET after the token was issued"
echo "  3. There are multiple instances with different JWT_SECRET values"
