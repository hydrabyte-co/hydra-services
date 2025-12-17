#!/usr/bin/env python3
"""
Verify which JWT_SECRET was used to sign a token
"""

import hmac
import hashlib
import base64
import json

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTQwZGI3MGQ2NzA2NTI2MmMyZTE3ZWQiLCJ1c2VybmFtZSI6ImFnZW50OjY5NDBkYjcwZDY3MDY1MjYyYzJlMTdlZCIsInN0YXR1cyI6ImFjdGl2ZSIsInJvbGVzIjpbIm9yZ2FuaXphdGlvbi5vd25lciJdLCJvcmdJZCI6IjY5MWViOWU2NTE3ZjkxNzk0M2FlMWY5ZCIsImdyb3VwSWQiOiIiLCJhZ2VudElkIjoiNjk0MGRiNzBkNjcwNjUyNjJjMmUxN2VkIiwidXNlcklkIjoiIiwidHlwZSI6ImFnZW50IiwiaWF0IjoxNzY1OTUwMDExLCJleHAiOjE3NjYwMzY0MTF9.jpIF1AaA66mmq343Pgm4t4MYdzcTzha2K8sHzw74Yr0"

def get_secret_hash(secret):
    """Get first 8 chars of SHA256 hash of secret"""
    return hashlib.sha256(secret.encode()).hexdigest()[:8]

def verify_jwt_signature(token, secret):
    """Verify JWT signature with given secret"""
    parts = token.split('.')
    if len(parts) != 3:
        return False, "Invalid token format"

    header_payload = f"{parts[0]}.{parts[1]}"
    signature = parts[2]

    # Create signature using HMAC-SHA256
    expected_signature = base64.urlsafe_b64encode(
        hmac.new(
            secret.encode(),
            header_payload.encode(),
            hashlib.sha256
        ).digest()
    ).decode().rstrip('=')

    return signature == expected_signature, expected_signature

print("=== JWT Token Verification ===\n")

# Decode token parts
parts = TOKEN.split('.')
header = json.loads(base64.urlsafe_b64decode(parts[0] + '=='))
payload = json.loads(base64.urlsafe_b64decode(parts[1] + '=='))
signature = parts[2]

print("Header:", json.dumps(header, indent=2))
print("\nPayload:", json.dumps(payload, indent=2))
print(f"\nSignature: {signature}\n")

# Test with different secrets
secrets = [
    'R4md0m_S3cr3t',
    'your-secret-key',
    'NewPass123!',
    'hydrabyte-secret',
    'jwt-secret-key',
]

print("=== Testing with different JWT secrets ===\n")

found_match = False
for secret in secrets:
    secret_hash = get_secret_hash(secret)
    is_valid, expected_sig = verify_jwt_signature(TOKEN, secret)

    if is_valid:
        print(f"✅ SECRET: \"{secret}\" (hash: {secret_hash}...)")
        print(f"   → TOKEN IS VALID with this secret!")
        print(f"   → This is the secret that signed the token\n")
        found_match = True
    else:
        print(f"❌ SECRET: \"{secret}\" (hash: {secret_hash}...)")
        print(f"   → Signature mismatch")
        print(f"   → Expected: {expected_sig}")
        print(f"   → Got:      {signature}\n")

print("\n=== Analysis ===")
print("Server logs show hash: 9266112b...")
print(f"\nChecking which secret has hash 9266112b:")

for secret in secrets:
    secret_hash = get_secret_hash(secret)
    if secret_hash == '9266112b':
        print(f"🎯 FOUND: Secret \"{secret}\" has hash 9266112b")
        is_valid, _ = verify_jwt_signature(TOKEN, secret)
        if is_valid:
            print("   ✅ And it VALIDATES the token successfully!")
        else:
            print("   ❌ But it does NOT validate the token")

if not found_match:
    print("\n⚠️  CONCLUSION:")
    print("The token was signed with a DIFFERENT secret than any tested above.")
    print("This means:")
    print("  1. The JWT_SECRET on server is different from what's in the code")
    print("  2. Or the server was restarted with a different JWT_SECRET after token was issued")
    print("  3. Or there are multiple service instances with different JWT_SECRET values")
    print("\n💡 SOLUTION:")
    print("  Check the actual JWT_SECRET environment variable on the server:")
    print("  - SSH to server and run: echo $JWT_SECRET | sha256sum")
    print("  - Compare with hash: 9266112b...")
