# Template Service Production-Ready Upgrade

**Document Version:** 1.0
**Date:** 2025-10-16
**Status:** Requirements

---

## 📋 Executive Summary

This document outlines the requirements and implementation plan to upgrade the Template Service from a basic demonstration to a **production-ready** reference implementation. The upgrade focuses on four key areas: Health Monitoring, RBAC Integration, Error Standardization, and Audit Trail Enhancement.

---

## 🎯 Objectives

1. Make Template Service production-ready and suitable as a reference for all future microservices
2. Leverage existing BaseService capabilities (pagination, soft delete, RBAC)
3. Standardize error responses across all services
4. Provide health monitoring for deployment and operations
5. Enhance audit trail for compliance and debugging

---

## 📊 Current State Analysis

### ✅ What Template Service Already Has

| Feature | Status | Location |
|---------|--------|----------|
| CRUD Operations | ✅ Complete | Category, Product modules |
| Event-Driven Architecture | ✅ Complete | BullMQ + Redis queues |
| Async Processing | ✅ Complete | Report generation |
| JWT Authentication | ✅ Complete | `@UseGuards(JwtAuthGuard)` |
| MongoDB Integration | ✅ Complete | Mongoose ODM |
| API Documentation | ✅ Complete | Swagger/OpenAPI |
| Validation | ✅ Complete | class-validator DTOs |
| Logging | ✅ Complete | Colored logger utility |

### ✅ What BaseService Provides (Currently Unused)

| Feature | Status | Location |
|---------|--------|----------|
| Pagination | ✅ Available | `libs/base/src/lib/base.service.ts:59-84` |
| Soft Delete | ✅ Available | `libs/base/src/lib/base.service.ts:146-170` |
| Hard Delete | ✅ Available | `libs/base/src/lib/base.service.ts:125-144` |
| RBAC Permissions | ✅ Available | `createRoleBasedPermissions()` |
| Ownership Enforcement | ✅ Available | Multi-tenant ready |
| Filtering & Sorting | ✅ Available | `FindManyOptions` interface |

### ⚠️ Gaps to Address

1. **Health Monitoring** - No health check endpoint
2. **RBAC Integration** - Template service not using BaseService RBAC
3. **Error Standardization** - Inconsistent error response formats
4. **Audit Trail** - Missing `createdBy` and `updatedBy` fields

---

## 🔧 Technical Requirements

### PRIORITY 4: Health Check Endpoint

#### Requirement

Provide a `/health` endpoint that returns:
- **Overall status**: `ok` or `error`
- **Database status**: MongoDB connection health
- **Cache status**: Redis connection health (if applicable)
- **System info**: version, git commit, uptime, environment

#### Acceptance Criteria

1. Endpoint: `GET /health` (no authentication required)
2. Response format:
```json
{
  "status": "ok",
  "info": {
    "version": "1.0.0",
    "gitCommit": "1acbbb8",
    "uptime": 3600.5,
    "environment": "production"
  },
  "details": {
    "database": {
      "status": "up",
      "responseTime": 15
    },
    "cache": {
      "status": "up",
      "responseTime": 2
    }
  }
}
```
3. Return 200 if all systems healthy, 503 if any critical system down
4. Response time < 1 second

#### Implementation Details

**Location:** `libs/base/src/modules/health/`

**Files to create:**
- `health.module.ts` - NestJS module
- `health.controller.ts` - Controller with health check logic
- `health.service.ts` - Business logic for checks

**Dependencies:**
```json
{
  "@nestjs/terminus": "^10.x.x"
}
```

**Git Commit Detection:**
- Environment variable: `GIT_COMMIT_SHA`
- Build-time injection via CI/CD
- Fallback: `"unknown"`

**Integration:**
- Import `HealthModule` in template service `AppModule`
- Configure MongoDB and Redis indicators
- No authentication guard (public endpoint)

---

### PRIORITY 1: RBAC Integration with BaseService

#### Requirement

Integrate Template Service (Category, Product) with BaseService to leverage built-in RBAC, pagination, soft delete, and ownership enforcement.

#### Current Issues

1. Template services implement their own CRUD without BaseService
2. No permission checking (anyone with JWT can do anything)
3. No ownership enforcement (no multi-tenancy support)
4. No pagination (returns all records)
5. Hard delete instead of soft delete

#### Acceptance Criteria

1. `CategoryService` and `ProductService` extend `BaseService<T>`
2. All CRUD operations pass `RequestContext` parameter
3. Permission checking enabled:
   - `allowRead` - For GET operations
   - `allowWrite` - For POST/PUT operations
   - `allowDelete` - For DELETE operations (soft delete)
   - `allowAdministrative` - For hard delete (admin only)
4. Ownership automatically enforced on create
5. Responses include pagination metadata
6. Soft delete by default, hard delete requires admin

#### Implementation Details

**Step 1: Update Schemas**

```typescript
// services/template/src/modules/category/category.schema.ts
import { BaseSchema } from '@hydrabyte/base';

@Schema({ timestamps: true })
export class Category extends BaseSchema {
  // Remove: createdAt, updatedAt, deletedAt, isDeleted, owner
  // These are inherited from BaseSchema

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;
}
```

**Step 2: Update Services**

```typescript
// services/template/src/modules/category/category.service.ts
import { BaseService } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';

@Injectable()
export class CategoryService extends BaseService<Category> {
  private readonly logger = createLogger('CategoryService');

  constructor(
    @InjectModel(Category.name) categoryModel: Model<Category>,
    private readonly categoryProducer: CategoryProducer,
  ) {
    super(categoryModel);
  }

  // Override create to add queue event
  async create(
    createCategoryDto: CreateCategoryDto,
    context: RequestContext
  ): Promise<Category> {
    this.logger.debug('Creating category', createCategoryDto);

    // BaseService handles permissions, ownership, save
    const created = await super.create(createCategoryDto, context);

    this.logger.info('Category created successfully', {
      id: created._id,
      name: created.name
    });

    // Emit queue event
    await this.categoryProducer.emitCategoryCreated(created);

    return created;
  }

  // Override findAll to add queue event (optional)
  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<Category>> {
    this.logger.debug('Fetching categories with options', options);

    const result = await super.findAll(options, context);

    this.logger.info('Categories retrieved', {
      count: result.data.length,
      total: result.pagination.total
    });

    return result;
  }

  // Use softDelete from BaseService (no override needed)
  // Use update, findById from BaseService (no override needed)
}
```

**Step 3: Create RequestContext Decorator**

```typescript
// libs/base/src/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from '@hydrabyte/shared';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // From JWT payload

    return {
      userId: user.sub || user.userId || '',
      username: user.username || '',
      roles: user.roles || [],
      orgId: user.orgId || '',
      groupId: user.groupId || '',
      agentId: user.agentId || '',
      appId: user.appId || '',
    } as RequestContext;
  },
);
```

**Step 4: Update Controllers**

```typescript
// services/template/src/modules/category/category.controller.ts
import { CurrentUser } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';

@Controller('categories')
export class CategoryController {
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.categoryService.create(dto, context);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('filter') filter?: string,
    @Query('sort') sort?: string,
    @CurrentUser() context: RequestContext
  ) {
    const options: FindManyOptions = {
      page: Number(page),
      limit: Number(limit),
      filter: filter ? JSON.parse(filter) : {},
      sort: sort ? JSON.parse(sort) : { createdAt: -1 },
    };

    return this.categoryService.findAll(options, context);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    // Soft delete by default
    await this.categoryService.softDelete(new Types.ObjectId(id), context);
    return { message: 'Category deleted successfully' };
  }
}
```

**Step 5: Update API Response Examples**

Before (no pagination):
```json
[
  { "_id": "1", "name": "Electronics" },
  { "_id": "2", "name": "Books" }
]
```

After (with pagination):
```json
{
  "data": [
    { "_id": "1", "name": "Electronics", "createdAt": "..." },
    { "_id": "2", "name": "Books", "createdAt": "..." }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  }
}
```

#### Testing Requirements

1. Test permission denied scenarios (403 Forbidden)
2. Test soft delete (record marked as deleted, not removed)
3. Test hard delete (requires admin role)
4. Test pagination with different page sizes
5. Test filtering and sorting
6. Test ownership enforcement (multi-tenant scenarios)

---

### PRIORITY 2: Error Standardization

#### Requirement

Standardize all error responses across the service with consistent format including timestamp, path, correlation ID, and validation errors.

#### Current Issues

1. Inconsistent error formats from different sources
2. Validation errors format differs from HTTP exceptions
3. No timestamp on errors
4. No correlation ID for tracing
5. No request path in error response

#### Acceptance Criteria

1. All errors return consistent JSON format
2. Include correlation ID for request tracing
3. Include timestamp and request path
4. Validation errors clearly separated
5. HTTP status codes correctly mapped

#### Standard Error Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    "name should not be empty",
    "price must be a positive number"
  ],
  "timestamp": "2025-10-06T10:30:45.123Z",
  "path": "/api/categories",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Implementation Details

**Location:** `libs/base/src/filters/`

**Files to create:**
- `http-exception.filter.ts` - Global exception filter
- `index.ts` - Export filter

**Implementation:**

```typescript
// libs/base/src/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: any[];
  timestamp: string;
  path: string;
  correlationId: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getHttpStatus(exception);
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: this.getErrorMessage(exception),
      errors: this.getValidationErrors(exception),
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: this.getCorrelationId(request),
    };

    // Log error for monitoring
    console.error('[GlobalExceptionFilter]', {
      ...errorResponse,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json(errorResponse);
  }

  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response === 'object' && response !== null) {
        const msg = (response as any).message;
        return Array.isArray(msg) ? 'Validation failed' : msg || 'Internal server error';
      }
    }
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'Internal server error';
  }

  private getValidationErrors(exception: unknown): any[] | undefined {
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse() as any;
      if (response.message && Array.isArray(response.message)) {
        return response.message;
      }
    }
    return undefined;
  }

  private getCorrelationId(request: Request): string {
    // Check if correlation ID already exists in headers
    const existingId = request.headers['x-correlation-id'];
    if (existingId && typeof existingId === 'string') {
      return existingId;
    }
    // Generate new correlation ID
    return uuidv4();
  }
}
```

**Integration in Template Service:**

```typescript
// services/template/src/main.ts
import { GlobalExceptionFilter } from '@hydrabyte/base';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ... rest of configuration
}
```

**Correlation ID Middleware (Optional Enhancement):**

```typescript
// libs/base/src/middleware/correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req.headers['x-correlation-id'] = correlationId as string;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
```

#### Error Types Coverage

| Error Type | Status Code | Example |
|------------|-------------|---------|
| Validation Error | 400 | Empty required fields |
| Unauthorized | 401 | Missing/invalid JWT |
| Forbidden | 403 | Insufficient permissions |
| Not Found | 404 | Entity not found |
| Conflict | 409 | Duplicate entry |
| Internal Error | 500 | Uncaught exceptions |

#### Testing Requirements

1. Test validation errors (class-validator)
2. Test HTTP exceptions (NotFoundException, etc.)
3. Test uncaught exceptions (500)
4. Test correlation ID propagation
5. Verify timestamp format (ISO 8601)
6. Verify path is correct

---

### PRIORITY 3: Audit Trail Enhancement

#### Requirement

Add `createdBy` and `updatedBy` fields to BaseSchema to track which user created/modified each record.

#### Current State

BaseSchema already has:
- `createdAt: Date`
- `updatedAt: Date`
- `deletedAt: Date | null`
- `isDeleted: boolean`
- `owner: { orgId, groupId, userId, agentId, appId }`

#### Acceptance Criteria

1. Add `createdBy: string` (userId) to BaseSchema
2. Add `updatedBy: string` (userId) to BaseSchema
3. Auto-populate on create (from RequestContext)
4. Auto-populate on update (from RequestContext)
5. Fields are read-only (cannot be manually set by clients)
6. Fields included in API responses

#### Implementation Details

**Step 1: Update BaseSchema**

```typescript
// libs/base/src/lib/base.schema.ts
@Schema()
export abstract class BaseSchema {
  // ... existing fields ...

  @Prop({ type: String, default: '' })
  createdBy: string; // userId who created this record

  @Prop({ type: String, default: '' })
  updatedBy: string; // userId who last updated this record
}
```

**Step 2: Update BaseService**

```typescript
// libs/base/src/lib/base.service.ts
async create(data: any, context: RequestContext): Promise<Partial<Entity>> {
  const permissions = createRoleBasedPermissions(context);
  if (!permissions.allowWrite) {
    throw new ForbiddenException('You do not have permission to create.');
  }

  const dataWithOwner = this.enforceOwnership(data, context);

  // Add audit trail
  const dataWithAudit = {
    ...dataWithOwner,
    createdBy: context.userId,
    updatedBy: context.userId,
  };

  const created = new this.model(dataWithAudit);
  const saved = await created.save();

  // Remove internal fields
  const obj = saved.toObject ? saved.toObject() : saved;
  delete (obj as any).isDeleted;
  delete (obj as any).deletedAt;
  delete (obj as any).password;
  return obj as Entity;
}

async update(
  id: ObjectId,
  updateData: Partial<Entity>,
  context: RequestContext
): Promise<Entity | null> {
  const permissions = createRoleBasedPermissions(context);
  if (!permissions.allowWrite) {
    throw new ForbiddenException('You do not have permission to update.');
  }

  const condition = { _id: id, ...permissions.filter, isDeleted: false };

  // Prevent updating protected fields
  const sanitizedData = { ...updateData };
  delete (sanitizedData as any).owner;
  delete (sanitizedData as any).password;
  delete (sanitizedData as any).createdBy; // Cannot change creator

  // Add audit trail
  const dataWithAudit = {
    ...sanitizedData,
    updatedBy: context.userId,
  };

  return this.model
    .findOneAndUpdate(condition, dataWithAudit, { new: true })
    .select('-isDeleted -deletedAt -password')
    .exec();
}
```

**Step 3: API Response Example**

```json
{
  "_id": "68e38484e05bb8cc523e5561",
  "name": "Electronics",
  "description": "Electronic devices",
  "isActive": true,
  "createdAt": "2025-10-06T08:30:00.000Z",
  "updatedAt": "2025-10-06T09:15:00.000Z",
  "createdBy": "68dcf365f6a92c0d4911b619",
  "updatedBy": "68dcf365f6a92c0d4911b620",
  "owner": {
    "orgId": "68dd05b175d9e3c17bf97f60",
    "groupId": "",
    "userId": "68dcf365f6a92c0d4911b619",
    "agentId": "",
    "appId": ""
  }
}
```

#### Testing Requirements

1. Verify `createdBy` set on create
2. Verify `updatedBy` updated on update
3. Verify clients cannot manually set these fields
4. Verify fields appear in responses
5. Test with different users (multi-user scenarios)

---

## 📝 Implementation Order

Based on dependencies and complexity:

1. **[PRIORITY 4] Health Check Endpoint** (Independent, quick win)
2. **[PRIORITY 1] RBAC Integration** (Foundation for everything else)
3. **[PRIORITY 2] Error Standardization** (Works better with RBAC errors)
4. **[PRIORITY 3] Audit Trail Enhancement** (Depends on RBAC context)

---

## 🧪 Testing Strategy

### Unit Tests
- BaseService methods with mocked model
- Health check indicators
- Exception filter error formatting
- Audit trail field population

### Integration Tests
- Full CRUD flow with BaseService
- Health check with real MongoDB/Redis
- Error responses from actual endpoints
- Permission checks with different roles

### E2E Tests
- Complete user journeys
- Multi-tenant scenarios
- Pagination edge cases
- Soft delete and restore flows

---

## 📊 Success Metrics

1. **Code Coverage**: Maintain >80% coverage
2. **Response Time**: All endpoints < 200ms (excluding async jobs)
3. **Error Rate**: < 0.1% uncaught exceptions
4. **Health Check**: 99.9% uptime detection
5. **Documentation**: 100% API endpoints documented in Swagger

---

## 🚀 Deployment Considerations

### Environment Variables

Add to `.env`:
```env
# Git commit SHA (injected by CI/CD)
GIT_COMMIT_SHA=1acbbb8

# Application version
APP_VERSION=1.0.0
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml (example)
env:
  GIT_COMMIT_SHA: ${{ github.sha }}
  APP_VERSION: ${{ github.ref_name }}
```

### Docker Build

```dockerfile
ARG GIT_COMMIT_SHA=unknown
ARG APP_VERSION=dev

ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
ENV APP_VERSION=${APP_VERSION}
```

---

## 📚 Documentation Updates Required

1. **README.md**
   - Update with pagination examples
   - Add RBAC/permissions section
   - Document health check endpoint
   - Add error response examples

2. **Swagger/OpenAPI**
   - Update response schemas with pagination
   - Document permission requirements
   - Add error response schemas
   - Document audit trail fields

3. **CLAUDE.md**
   - Update architecture section
   - Add BaseService usage guidelines
   - Document error handling standards

---

## 🔄 Rollback Plan

If issues arise during implementation:

1. **Health Check**: Simply remove HealthModule import (no data impact)
2. **RBAC Integration**: Keep old service methods, gradually migrate
3. **Error Filter**: Remove global filter, revert to NestJS defaults
4. **Audit Trail**: Non-breaking change (optional fields)

---

## ✅ Definition of Done

Each feature is considered complete when:

1. ✅ Code implemented and reviewed
2. ✅ Unit tests written and passing
3. ✅ Integration tests passing
4. ✅ Documentation updated (README, Swagger)
5. ✅ Manual testing completed
6. ✅ No breaking changes to existing API (unless documented)
7. ✅ Performance benchmarks met
8. ✅ Code merged to main branch

---

## 📞 Contacts & References

- **Project Repository**: `/usr/workspace/repos/hydra-services`
- **Base Service**: `libs/base/src/lib/base.service.ts`
- **Template Service**: `services/template/`
- **Shared Utilities**: `libs/shared/src/`

---

**Document End**
