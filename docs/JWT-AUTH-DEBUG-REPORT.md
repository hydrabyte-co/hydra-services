# JWT Authentication Debug Report

## Issue Summary

Agent heartbeat endpoint returns `401 Unauthorized` with error: `"invalid signature"`

## Root Cause Identified

**JWT Secret Mismatch Between Signing and Verification**

### Evidence

1. **Token was signed with**: `R4md0m_S3cr3t` (hash: `1a5d07b8...`)
   - Verified by signature validation in [verify-jwt-secret.py](../scripts/verify-jwt-secret.py)

2. **Server is using for verification**: Unknown secret (hash: `9266112b...`)
   - From server logs: `[JwtStrategy] JWT Strategy initialized with secret hash: 9266112b...`

3. **Error from passport-jwt**: `{"name":"JsonWebTokenError","message":"invalid signature"}`
   - From server logs: `[JwtAuthGuard] Info: {"name":"JsonWebTokenError","message":"invalid signature"}`

### Authentication Flow Analysis

```
✅ JwtAuthGuard.canActivate() - Called
✅ Authorization header - Present (Bearer token)
✅ super.canActivate() - Called to trigger JwtStrategy
✅ JwtStrategy - Initialized and running
✅ JwtStrategy.validate() - Attempted
❌ Signature verification - FAILED (invalid signature)
❌ handleRequest() - Received null user + error info
❌ 401 Unauthorized - Returned to client
```

## Server Logs

```
[JwtAuthGuard] canActivate called for POST /agents/6940db70d67065262c2e17ed/heartbeat
[JwtAuthGuard] Authorization header: Bearer eyJhbGciOiJIUzI1NiIsInR...
[JwtAuthGuard] Calling super.canActivate() to trigger JwtStrategy
[JwtAuthGuard] handleRequest called
[JwtAuthGuard] Error: none
[JwtAuthGuard] User: null
[JwtAuthGuard] Info: {"name":"JsonWebTokenError","message":"invalid signature"}
```

## Token Analysis

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "sub": "6940db70d67065262c2e17ed",
  "username": "agent:6940db70d67065262c2e17ed",
  "status": "active",
  "roles": ["organization.owner"],
  "orgId": "691eb9e6517f917943ae1f9d",
  "agentId": "6940db70d67065262c2e17ed",
  "userId": "",
  "type": "agent",
  "iat": 1765950011,
  "exp": 1766036411
}
```

**Signature:** `jpIF1AaA66mmq343Pgm4t4MYdzcTzha2K8sHzw74Yr0`

This signature is valid ONLY with secret: `R4md0m_S3cr3t`

## Configuration Analysis

### Code Configuration

1. **agent.module.ts:20** (AgentService - Token Signing)
   ```typescript
   JwtModule.register({
     secret: process.env.JWT_SECRET || 'R4md0m_S3cr3t',  // Must match JwtStrategy secret
     signOptions: { expiresIn: '24h' },
   }),
   ```

2. **jwt.strategy.ts:10** (JwtStrategy - Token Verification)
   ```typescript
   const jwtSecret = process.env['JWT_SECRET'] || 'R4md0m_S3cr3t';
   ```

Both use the same fallback: `R4md0m_S3cr3t`

### Environment Variable Issue

**The problem is that `process.env.JWT_SECRET` is SET on the server but to a DIFFERENT value:**

- If `JWT_SECRET` was undefined, both would use `R4md0m_S3cr3t` (hash: `1a5d07b8`) ✅
- Server shows hash: `9266112b` ❌
- This proves `JWT_SECRET` environment variable is set to something else

## Possible Causes

1. **Different JWT_SECRET in environment file**
   - `.env` file contains a different secret
   - Server's environment variables have different value

2. **Multiple service instances with different configs**
   - Load balancer routing to instances with different JWT_SECRET
   - Some instances restarted with new config

3. **JWT_SECRET was changed after token was issued**
   - Token signed with old secret
   - Server restarted with new secret
   - Old tokens become invalid

## Solutions

### Option 1: Find and Use Correct JWT_SECRET (Recommended)

1. **Check server environment variable:**
   ```bash
   # On server
   echo $JWT_SECRET | python3 -c "import sys, hashlib; print(hashlib.sha256(sys.stdin.read().strip().encode()).hexdigest()[:8])"
   ```
   Should output: `9266112b`

2. **Update code to use that secret**

3. **Restart all services to sync**

### Option 2: Force Reset to R4md0m_S3cr3t

1. **Ensure JWT_SECRET is NOT set in environment**
   ```bash
   unset JWT_SECRET
   ```

2. **Or explicitly set it:**
   ```bash
   export JWT_SECRET='R4md0m_S3cr3t'
   ```

3. **Restart all services**

4. **Verify hash on startup:**
   ```
   [JwtStrategy] JWT Strategy initialized with secret hash: 1a5d07b8...
   [AgentService] AgentService initialized with JWT secret hash: 1a5d07b8...
   ```

### Option 3: Use Proper Secret Management

1. **Generate strong secret:**
   ```bash
   openssl rand -hex 32
   ```

2. **Set consistently across all environments:**
   ```bash
   export JWT_SECRET='<generated-secret>'
   ```

3. **Update both signing and verification to use it**

4. **Restart all services**

5. **Invalidate all existing tokens** (users must reconnect)

## Verification Steps

After applying fix:

1. **Check logs show matching hashes:**
   ```
   [JwtStrategy] JWT Strategy initialized with secret hash: XXXXXXXX...
   [AgentService] AgentService initialized with JWT secret hash: XXXXXXXX...
   ```
   Both should be IDENTICAL

2. **Test connect endpoint:**
   ```bash
   curl -X POST 'https://api.x-or.cloud/dev/aiwm/agents/6940db70d67065262c2e17ed/connect' \
     -H 'Content-Type: application/json' \
     -d '{"secret":"624577f0190d1d1dd016f4d799769dd82faad2de180319b41df99550fb373c83"}'
   ```

3. **Verify token signature with Python:**
   ```bash
   python3 scripts/verify-jwt-secret.py
   ```
   Should show ✅ with the correct secret

4. **Test heartbeat endpoint:**
   ```bash
   curl -X POST 'https://api.x-or.cloud/dev/aiwm/agents/6940db70d67065262c2e17ed/heartbeat' \
     -H 'Authorization: Bearer <token>' \
     -H 'Content-Type: application/json' \
     -d '{"status":"idle"}'
   ```
   Should return 200 OK

5. **Check server logs for validation:**
   ```
   [JwtAuthGuard] handleRequest called
   [JwtAuthGuard] Error: none
   [JwtAuthGuard] User: {"sub":"6940db70d67065262c2e17ed",...}
   [JwtAuthGuard] Info: none
   ```
   User should NOT be null

## Files Modified for Debug

1. [libs/base/src/lib/auth.guard.ts](../libs/base/src/lib/auth.guard.ts) - Added detailed logging
2. [libs/base/src/lib/jwt.strategy.ts](../libs/base/src/lib/jwt.strategy.ts) - Added secret hash logging
3. [services/aiwm/src/modules/agent/agent.service.ts](../services/aiwm/src/modules/agent/agent.service.ts) - Added secret hash logging
4. [services/aiwm/src/modules/agent/agent.module.ts](../services/aiwm/src/modules/agent/agent.module.ts) - Fixed JWT secret sync

## Debug Scripts Created

1. [scripts/verify-jwt-secret.py](../scripts/verify-jwt-secret.py) - Verify which secret signed a token
2. [scripts/test-agent-auth-debug.sh](../scripts/test-agent-auth-debug.sh) - End-to-end auth flow test

## Next Steps

**IMMEDIATE ACTION REQUIRED:**

1. Check actual `JWT_SECRET` value on server
2. Identify which secret has hash `9266112b`
3. Either:
   - Update code to use that secret consistently, OR
   - Change server environment to use `R4md0m_S3cr3t`, OR
   - Generate new strong secret and deploy to all services
4. Restart all service instances
5. Verify hash logs match
6. Test authentication flow

## Related Issues

- Agent connect works (returns valid token)
- Agent heartbeat fails (401 Unauthorized)
- Error: "invalid signature"
- Root cause: JWT_SECRET mismatch between signing and verification
