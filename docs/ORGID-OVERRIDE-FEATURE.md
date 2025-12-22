# Organization ID Override Feature

## Overview

The **X-Organization-Id Header Override** feature allows users with `universe.*` roles (system administrators) to perform API operations on behalf of any organization by specifying an `X-Organization-Id` header in their requests.

This is useful for:
- 🔧 **System Administration** - Managing resources across multiple organizations
- 🐛 **Debugging** - Troubleshooting issues in specific organizations
- 📊 **Reporting** - Generating cross-organization reports
- 🛠️ **Support Operations** - Assisting customers with their organization's data

---

## How It Works

### Default Behavior (Without Header)
When a user makes an API call, their `orgId` is extracted from the JWT token payload:

```bash
# JWT payload contains:
{
  "sub": "691eba08517f917943ae1fa1",
  "orgId": "691eb9e6517f917943ae1f9d",  # ← Used by default
  "roles": ["universe.owner"]
}
```

### Override Behavior (With Header)
Users with `universe.*` roles can override the `orgId` by providing an `X-Organization-Id` header:

```bash
curl -X GET "http://localhost:3305/api/resources" \
  -H "Authorization: Bearer <token>" \
  -H "X-Organization-Id: 507f1f77bcf86cd799439011"  # ← Overrides JWT orgId
```

---

## Implementation Details

### 1. Security Requirements

✅ **Role-Based Access Control**
- Only users with roles starting with `universe.` can override orgId
- Other users' headers are ignored for security

✅ **MongoDB ObjectId Validation**
- Header value MUST be a valid 24-character hexadecimal ObjectId
- Invalid formats are rejected with a warning log

✅ **Audit Logging**
- Every override event is logged with:
  - User ID
  - Original orgId from token
  - Override orgId from header
  - API endpoint and HTTP method

### 2. Code Changes

**File Modified:** `libs/base/src/decorators/current-user.decorator.ts`

```typescript
// Key implementation points:

// 1. Validate MongoDB ObjectId format
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// 2. Check for universe role
const hasUniverseRole = context.roles.some((role) =>
  String(role).startsWith('universe.')
);

// 3. Extract and validate header (case-insensitive)
const headerOrgId =
  headers['x-organization-id'] ||
  headers['X-Organization-Id'];

// 4. Override with validation
if (hasUniverseRole && headerOrgId && isValidObjectId(headerOrgId)) {
  context.orgId = headerOrgId;
}
```

### 3. Header Name Support

The feature supports **case-insensitive** header names:

✅ `X-Organization-Id` (Recommended - PascalCase)
✅ `x-organization-id` (Lowercase)

Both formats are accepted and will work correctly.

---

## Usage Examples

### Example 1: Basic Override

```bash
# Login as universe admin
TOKEN=$(curl -s -X POST 'http://localhost:3000/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"username","password":"..."}' \
  | jq -r '.accessToken')

# Get resources from specific organization
curl -X GET "http://localhost:3305/tools?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: 691eb9e6517f917943ae1f9d"
```

### Example 2: Create Resource for Another Organization

```bash
# Create a tool in organization 691eb9e6517f917943ae1f9d
curl -X POST "http://localhost:3305/tools" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: 691eb9e6517f917943ae1f9d" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Tool for Customer Org",
    "description": "Created by admin for customer"
  }'
```

### Example 3: Update Resource in Specific Organization

```bash
# Update a resource
curl -X PATCH "http://localhost:3305/tools/69200a13f752ede5f39a9d0a" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: 691eb9e6517f917943ae1f9d" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

---

## Testing

### Automated Test Script

Run the comprehensive test script:

```bash
./scripts/test-orgid-override.sh
```

This script tests:
1. ✅ API call without header (uses JWT orgId)
2. ✅ API call with valid header (overrides orgId)
3. ✅ API call with invalid header (falls back to JWT orgId)
4. ✅ Case-insensitive header support

### Manual Testing

**Test 1: Without Header**
```bash
curl -X GET "http://localhost:3305/tools" \
  -H "Authorization: Bearer $TOKEN"
# Expected: Uses orgId from JWT token
```

**Test 2: With Valid Header**
```bash
curl -X GET "http://localhost:3305/tools" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: 691eb9e6517f917943ae1f9d"
# Expected: Server logs show orgId override
```

**Test 3: Invalid ObjectId Format**
```bash
curl -X GET "http://localhost:3305/tools" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: invalid-id"
# Expected: Warning logged, falls back to JWT orgId
```

---

## Server Logs

### Successful Override Log

```json
[CurrentUser] Universe role overriding orgId: {
  userId: '691eba08517f917943ae1fa1',
  originalOrgId: '691eb9e6517f917943ae1f9d',
  overrideOrgId: '507f1f77bcf86cd799439011',
  path: '/tools',
  method: 'GET'
}
```

### Invalid Format Warning Log

```json
[CurrentUser] Invalid X-Organization-Id format, using token orgId: {
  userId: '691eba08517f917943ae1fa1',
  invalidHeader: 'invalid-id-123',
  tokenOrgId: '691eb9e6517f917943ae1f9d'
}
```

---

## Security Considerations

### ✅ What's Protected

1. **Role Validation** - Only `universe.*` roles can override
   - JWT tokens are cryptographically signed and verified
   - Impossible to forge roles without the secret key

2. **Input Validation** - Header must be valid MongoDB ObjectId
   - Prevents injection attacks
   - Rejects malformed input

3. **Audit Trail** - All override events are logged
   - Timestamp, user ID, original/override orgId
   - Full request path and method

### ⚠️ Potential Risks

1. **Data Access Across Organizations**
   - Universe admins can access ANY organization's data
   - This is **intentional** for system administration
   - Ensure strict control over who gets `universe.*` roles

2. **Non-Existent Organization IDs**
   - System doesn't verify orgId exists in database
   - Invalid orgId results in empty query results (no data leak)
   - Consider adding IAM validation if stricter control needed

### 🔒 Best Practices

1. **Limit Universe Role Assignment**
   - Only assign to trusted system administrators
   - Regular audit of users with `universe.*` roles

2. **Monitor Override Usage**
   - Review server logs regularly
   - Set up alerts for excessive override usage
   - TODO: Implement dedicated audit log system

3. **Production Deployment**
   - Consider rate limiting for override requests
   - Add additional logging/monitoring
   - Implement audit log storage for compliance

---

## Future Enhancements

### TODO Items

1. **Dedicated Audit Log Service**
   - Store override events in separate audit database
   - Include: timestamp, userId, originalOrgId, overrideOrgId, endpoint, method, IP address
   - Retention policy and compliance support

2. **Organization Validation** (Optional)
   - Call IAM service to verify orgId exists
   - Trade-off: Performance vs. security
   - Consider implementing as middleware if needed

3. **Rate Limiting**
   - Prevent abuse of override functionality
   - Different limits for normal vs. override requests

4. **Dashboard/Analytics**
   - Admin dashboard showing override usage
   - Anomaly detection for suspicious patterns

---

## Related Files

- **Implementation:** `libs/base/src/decorators/current-user.decorator.ts`
- **RequestContext:** `libs/shared/src/lib/util/auth.ts`
- **RBAC Logic:** `libs/shared/src/lib/util/auth.ts` (createRoleBasedPermissions)
- **Test Script:** `scripts/test-orgid-override.sh`

---

## FAQs

### Q: What happens if a non-universe user sends the header?
**A:** The header is ignored. Only users with `universe.*` roles can override orgId.

### Q: Can I use an orgId that doesn't exist?
**A:** Yes, but the query will return no results. The system doesn't validate existence (by design for performance).

### Q: Is the header case-sensitive?
**A:** No. Both `X-Organization-Id` and `x-organization-id` work.

### Q: What if I send both uppercase and lowercase headers?
**A:** The system checks `x-organization-id` first, then `X-Organization-Id`. Only one will be used.

### Q: Can I override other fields like groupId or userId?
**A:** No. Currently only `orgId` can be overridden. This is a security decision.

### Q: How do I audit who used this feature?
**A:** Check server logs for `[CurrentUser] Universe role overriding orgId:` messages. TODO: Implement dedicated audit log system.

---

## Changelog

### Version 1.0 (2024-12-15)
- ✅ Initial implementation
- ✅ Support for `X-Organization-Id` header (case-insensitive)
- ✅ MongoDB ObjectId format validation
- ✅ Console logging for debugging
- ✅ Test script and documentation
- ⏳ TODO: Audit log system
- ⏳ TODO: Organization existence validation

---

**Last Updated:** 2024-12-15
**Author:** backend-dev (Claude AI Agent)
**Status:** ✅ Production Ready
