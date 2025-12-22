# Universe Scope Control Decorators

## Overview

Khi người dùng có role `universe.*` (system administrator), họ có khả năng:
1. **Override orgId** qua header `X-Organization-Id` để làm việc với org cụ thể
2. **Truy cập cross-organization data** khi không có header override

Để kiểm soát behavior này, hệ thống cung cấp **2 decorators**:
- `@UniverseScopeOnly()` - Bỏ qua header override, giữ universe scope
- `@RequireUniverseRole()` - Chặn non-universe users, chỉ cho admin

---

## 📘 Decorator 1: `@UniverseScopeOnly()`

### Mục đích
Đánh dấu endpoints **bỏ qua** header `X-Organization-Id` để giữ nguyên universe scope.

### Khi nào dùng?
- ✅ Endpoints cần xem **cross-organization data**
- ✅ Statistics/reports tổng hợp nhiều orgs
- ✅ Endpoints có logic RBAC riêng (cho phép org users xem data của mình)

### Security Level: ⭐⭐ Medium
- Universe users: Thấy tất cả orgs (header bị ignore)
- Org users: Vẫn có thể access (bị filter theo org của họ)

### Implementation

```typescript
import { UniverseScopeOnly } from '@hydrabyte/base';

@Controller('tools')
export class ToolController {

  @Get('/statistics')
  @UniverseScopeOnly() // 👈 Ignore X-Organization-Id header
  @UseGuards(JwtAuthGuard)
  async getStatistics(@CurrentUser() context: RequestContext) {
    // Universe user: context.roles = ['universe.owner']
    //                context.orgId = JWT orgId (header ignored)
    //                → BaseService returns all orgs' data

    // Org owner:     context.roles = ['organization.owner']
    //                context.orgId = JWT orgId
    //                → BaseService filters by their org

    return this.service.getStatistics(context);
  }
}
```

### Behavior Matrix

| User Role | Header Sent | Resulting Context | Data Visible |
|-----------|-------------|-------------------|--------------|
| universe.owner | ❌ None | `universe.owner`, orgId from JWT | All orgs |
| universe.owner | ✅ Valid orgId | `universe.owner`, **header ignored** | All orgs |
| organization.owner | ❌ None | `organization.owner`, orgId from JWT | Own org only |
| organization.owner | ✅ Valid orgId | `organization.owner`, **header ignored** | Own org only |

---

## 🔒 Decorator 2: `@RequireUniverseRole()`

### Mục đích
Chặn hoàn toàn non-universe users, chỉ cho phép system administrators truy cập.

### Khi nào dùng?
- ✅ **System configuration** endpoints
- ✅ **Organization management** (CRUD organizations)
- ✅ **User management** (list all users across orgs)
- ✅ **Audit logs** (cross-org security events)
- ✅ **Sensitive admin operations**

### Security Level: ⭐⭐⭐ High
- Universe users: ✅ Access granted
- Org users: ❌ 403 Forbidden

### Implementation

```typescript
import { RequireUniverseRole, UniverseRoleGuard } from '@hydrabyte/base';

@Controller('organizations')
export class OrganizationController {

  @Get()
  @RequireUniverseRole() // 👈 Only universe.* roles allowed
  @UseGuards(JwtAuthGuard, UniverseRoleGuard) // 👈 Must include guard
  async findAll(@CurrentUser() context: RequestContext) {
    // Only universe users can reach here
    // Org users will get 403 Forbidden
    return this.service.findAll({}, context);
  }

  @Post()
  @RequireUniverseRole()
  @UseGuards(JwtAuthGuard, UniverseRoleGuard)
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() context: RequestContext
  ) {
    // Only universe users can create orgs
    return this.service.create(dto, context);
  }
}
```

### Behavior Matrix

| User Role | Access Result | Response |
|-----------|---------------|----------|
| universe.owner | ✅ Allowed | Data returned |
| universe.editor | ✅ Allowed | Data returned (if role exists) |
| organization.owner | ❌ Blocked | 403 Forbidden |
| group.owner | ❌ Blocked | 403 Forbidden |
| Any non-universe | ❌ Blocked | 403 Forbidden |

### Error Response

```json
{
  "statusCode": 403,
  "message": "This endpoint requires universe-level permissions. Only system administrators can access this resource.",
  "timestamp": "2024-12-15T10:30:00.000Z",
  "path": "/organizations",
  "correlationId": "abc-123-def"
}
```

---

## 🎯 Combined Usage

### Scenario 1: Universe-only + Ignore Header

**Use Case:** System settings endpoint - chỉ admin xem được, không bị ảnh hưởng bởi header

```typescript
@Get('/system-settings')
@RequireUniverseRole()        // 👈 Block non-universe users
@UniverseScopeOnly()          // 👈 Ignore header override
@UseGuards(JwtAuthGuard, UniverseRoleGuard)
async getSettings(@CurrentUser() context: RequestContext) {
  // context.roles = ['universe.owner'] (always)
  // context.orgId = JWT orgId (header ignored)
  return this.settingsService.getGlobalSettings();
}
```

### Scenario 2: Mixed Access + Ignore Header

**Use Case:** Statistics endpoint - universe xem tất cả, org owner xem của mình

```typescript
@Get('/tools/statistics')
@UniverseScopeOnly()          // 👈 Ignore header, let RBAC handle
@UseGuards(JwtAuthGuard)
async getStatistics(@CurrentUser() context: RequestContext) {
  // Universe user: See all orgs
  // Org owner: See their org only (BaseService filters)
  return this.service.getStatistics(context);
}
```

### Scenario 3: Universe Override Enabled (Default)

**Use Case:** CRUD operations - universe có thể impersonate org owner

```typescript
@Post('/tools')
@UseGuards(JwtAuthGuard)
async create(
  @Body() dto: CreateToolDto,
  @CurrentUser() context: RequestContext
) {
  // WITHOUT header:
  //   Universe: context.roles = ['universe.owner'], sees all orgs
  //   Org owner: context.roles = ['organization.owner'], sees own org

  // WITH header (X-Organization-Id: xxx):
  //   Universe: context.roles = ['organization.owner'], context.orgId = xxx
  //            → Behaves as org owner of that org
  //   Org owner: Header ignored (security)

  return this.service.create(dto, context);
}
```

---

## 📊 Decision Matrix

| Endpoint Type | Non-Universe Access | Universe Header Override | Decorators |
|---------------|---------------------|-------------------------|------------|
| **System Admin Only** | ❌ Block | ❌ Ignore | `@RequireUniverseRole()` + `@UniverseScopeOnly()` |
| **Cross-Org Reports** | ✅ Allow (filtered) | ❌ Ignore | `@UniverseScopeOnly()` |
| **Standard CRUD** | ✅ Allow | ✅ Enable | None (default behavior) |
| **Org Management** | ❌ Block | ✅ Enable | `@RequireUniverseRole()` only |

---

## 🔍 Common Use Cases

### 1. Organization Management

```typescript
@Controller('organizations')
export class OrganizationController {
  // List all orgs - universe only, no header override
  @Get()
  @RequireUniverseRole()
  @UniverseScopeOnly()
  @UseGuards(JwtAuthGuard, UniverseRoleGuard)
  async findAll() { /* ... */ }

  // Create org - universe only, can use header
  @Post()
  @RequireUniverseRole()
  @UseGuards(JwtAuthGuard, UniverseRoleGuard)
  async create(@Body() dto, @CurrentUser() ctx) { /* ... */ }

  // Get specific org - universe only, can use header
  @Get(':id')
  @RequireUniverseRole()
  @UseGuards(JwtAuthGuard, UniverseRoleGuard)
  async findOne(@Param('id') id) { /* ... */ }
}
```

### 2. Cross-Organization Statistics

```typescript
@Controller('statistics')
export class StatisticsController {
  // Global stats - mixed access
  @Get('/global')
  @UniverseScopeOnly()
  @UseGuards(JwtAuthGuard)
  async getGlobal(@CurrentUser() context: RequestContext) {
    // Universe: All orgs data
    // Org owner: Their org only
    return this.service.getGlobalStats(context);
  }
}
```

### 3. Standard Resource CRUD

```typescript
@Controller('tools')
export class ToolController {
  // List tools - universe can impersonate
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() context: RequestContext
  ) {
    // Universe without header: See all orgs
    // Universe with header: See specific org (impersonate org owner)
    // Org owner: See their org only
    return this.service.findAll(query, context);
  }

  // Create tool - universe can impersonate
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateToolDto,
    @CurrentUser() context: RequestContext
  ) {
    // Universe with header: Create for that org (as org owner)
    // Org owner: Create for their org
    return this.service.create(dto, context);
  }
}
```

### 4. System Settings

```typescript
@Controller('system-settings')
export class SystemSettingsController {
  // System config - universe only, no override
  @Get()
  @RequireUniverseRole()
  @UniverseScopeOnly()
  @UseGuards(JwtAuthGuard, UniverseRoleGuard)
  async getSettings() {
    // Only universe users, header ignored
    return this.settingsService.getAll();
  }

  @Patch()
  @RequireUniverseRole()
  @UniverseScopeOnly()
  @UseGuards(JwtAuthGuard, UniverseRoleGuard)
  async updateSettings(@Body() dto) {
    // Only universe users, header ignored
    return this.settingsService.update(dto);
  }
}
```

---

## 🔒 Security Considerations

### ✅ What's Protected

1. **Role Validation**
   - `@RequireUniverseRole()` checks JWT roles (cryptographically signed)
   - Impossible to forge roles without secret key

2. **Scope Isolation**
   - `@UniverseScopeOnly()` prevents header manipulation
   - Non-universe users cannot escalate privileges via header

3. **Impersonation Control**
   - Header override only works for universe users
   - Role changes to `organization.owner` for proper scoping

### ⚠️ Potential Risks

1. **Missing Guard**
   ```typescript
   // ❌ BAD: Decorator without guard
   @Get('/organizations')
   @RequireUniverseRole() // Decorator alone does nothing!
   async findAll() { /* ... */ }

   // ✅ GOOD: Decorator + Guard
   @Get('/organizations')
   @RequireUniverseRole()
   @UseGuards(JwtAuthGuard, UniverseRoleGuard) // 👈 Required!
   async findAll() { /* ... */ }
   ```

2. **Wrong Decorator Choice**
   ```typescript
   // ❌ BAD: Sensitive endpoint without RequireUniverseRole
   @Get('/system-settings')
   @UniverseScopeOnly() // Org users can still access!
   async getSettings() { /* ... */ }

   // ✅ GOOD: Both decorators
   @Get('/system-settings')
   @RequireUniverseRole()
   @UniverseScopeOnly()
   @UseGuards(JwtAuthGuard, UniverseRoleGuard)
   async getSettings() { /* ... */ }
   ```

3. **Frontend Always Sends Header**
   - Frontend sends `X-Organization-Id` on all requests
   - Backend must handle via `@UniverseScopeOnly()` where needed
   - This design simplifies frontend logic

---

## 📝 Server Logs

### Universe-Scope-Only Endpoint

```json
[CurrentUser] Universe-scope-only endpoint, ignoring X-Organization-Id header: {
  userId: '691eba08517f917943ae1fa1',
  path: '/organizations'
}
```

### Header Override (Impersonation)

```json
[CurrentUser] Universe user impersonating organization.owner: {
  userId: '691eba08517f917943ae1fa1',
  originalRole: ['universe.owner'],
  originalOrgId: '691eb9e6517f917943ae1f9d',
  impersonateOrgId: '507f1f77bcf86cd799439011',
  path: '/tools',
  method: 'POST'
}
```

### Access Denied (Non-Universe User)

```
ForbiddenException: This endpoint requires universe-level permissions. Only system administrators can access this resource.
```

---

## 🧪 Testing

### Test Script Structure

```bash
# 1. Login as universe.owner
TOKEN=$(curl -s -X POST 'http://localhost:3000/auth/login' \
  -d '{"username":"username","password":"..."}' | jq -r '.accessToken')

# 2. Test universe-only endpoint (should succeed)
curl -X GET "http://localhost:3000/organizations" \
  -H "Authorization: Bearer $TOKEN"

# 3. Test with header on universe-scope-only endpoint (header ignored)
curl -X GET "http://localhost:3000/organizations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: 507f1f77bcf86cd799439011"
# → Should still return all orgs, header ignored

# 4. Test standard CRUD with header (impersonation)
curl -X POST "http://localhost:3000/tools" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: 507f1f77bcf86cd799439011" \
  -d '{"name":"Test Tool"}'
# → Creates tool for org 507f1f77bcf86cd799439011
```

---

## 📚 Related Documentation

- **Implementation:**
  - `libs/base/src/decorators/universe-scope-only.decorator.ts`
  - `libs/base/src/guards/universe-role.guard.ts`
  - `libs/base/src/decorators/current-user.decorator.ts`

- **Usage Guide:** `docs/ORGID-OVERRIDE-FEATURE.md`
- **Test Script:** `scripts/test-orgid-override.sh`

---

## ❓ FAQs

### Q: Khi nào dùng `@UniverseScopeOnly()` vs `@RequireUniverseRole()`?

| Scenario | Decorator | Reason |
|----------|-----------|--------|
| Only admins can access | `@RequireUniverseRole()` | Block non-universe |
| Admins see all, users see theirs | `@UniverseScopeOnly()` | Mixed access, ignore header |
| Both above conditions | Both decorators | Maximum security |
| Normal CRUD operations | None | Enable impersonation |

### Q: Frontend luôn gửi header, có vấn đề gì không?
**A:** Không, backend sẽ tự xử lý:
- Endpoints với `@UniverseScopeOnly()` → Ignore header
- Endpoints khác → Process header (cho phép impersonation)
- Frontend đơn giản hơn, không cần logic phức tạp

### Q: Universe user có thể vượt qua `@RequireUniverseRole()` không?
**A:** Không thể. Guard check JWT roles (đã được sign), không thể giả mạo.

### Q: Org owner có thể fake universe role qua header không?
**A:** Không. Roles đến từ JWT token, không phải header.

### Q: Nếu quên `UniverseRoleGuard` thì sao?
**A:** `@RequireUniverseRole()` decorator không có tác dụng nếu thiếu guard. Always use both!

---

**Last Updated:** 2024-12-15
**Author:** backend-dev (Claude AI Agent)
**Status:** ✅ Production Ready
