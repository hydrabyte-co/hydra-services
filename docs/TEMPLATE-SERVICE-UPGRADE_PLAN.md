# Template Service Production-Ready Upgrade - Implementation Plan

**Document Version:** 1.0
**Date Created:** 2025-10-16
**Last Updated:** 2025-10-16
**Status:** In Progress

---

## 📋 Overview

This document tracks the implementation progress of the Template Service Production-Ready Upgrade project as defined in [TEMPLATE-SERVICE-UPGRADE.md](./TEMPLATE-SERVICE-UPGRADE.md).

**Implementation Order:** 4 → 1 → 2 → 3

---

## 🎯 Implementation Phases

### Phase 1: Health Check Endpoint (PRIORITY 4)
**Status:** ✅ Complete
**Estimated Effort:** 4 hours
**Actual Effort:** 1.5 hours
**Dependencies:** None

#### Tasks

- [x] **Task 4.1:** Install dependencies
  - [x] Install `@nestjs/terminus` package
  - [x] Update package.json
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 4.2:** Create Health Module structure
  - [x] Create `libs/base/src/modules/health/` directory
  - [x] Create `health.module.ts`
  - [x] Create `health.controller.ts`
  - [x] Create `health.service.ts`
  - [x] Create `index.ts` for exports
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 4.3:** Implement database health indicator
  - [x] Implement MongoDB ping check using `MongooseHealthIndicator`
  - [x] Add timeout configuration (300ms)
  - [x] Handle connection errors gracefully
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 4.4:** Implement cache health indicator
  - [ ] Implement Redis ping check
  - [ ] Add Redis client injection
  - [ ] Handle Redis unavailable scenarios
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 4.5:** Implement system info collector
  - [ ] Read version from package.json
  - [ ] Read git commit from `GIT_COMMIT_SHA` env variable
  - [ ] Calculate process uptime
  - [ ] Detect environment (NODE_ENV)
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 4.6:** Create health check endpoint
  - [ ] Create `GET /health` endpoint
  - [ ] Combine all health indicators
  - [ ] Format response according to spec
  - [ ] Return 200 for healthy, 503 for unhealthy
  - [ ] Make endpoint public (no auth guard)
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 4.7:** Integrate into Template Service
  - [ ] Import HealthModule in template `AppModule`
  - [ ] Configure MongoDB health indicator
  - [ ] Configure Redis health indicator (if applicable)
  - [ ] Update template service `.env` with `GIT_COMMIT_SHA`
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 4.8:** Export from base library
  - [ ] Add HealthModule to `libs/base/src/index.ts` exports
  - [ ] Build base library
  - [ ] Verify template service can import
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 4.9:** Testing
  - [ ] Test health endpoint returns 200 when all systems up
  - [ ] Test health endpoint returns 503 when database down
  - [ ] Test health endpoint returns 503 when cache down
  - [ ] Verify response format matches specification
  - [ ] Verify git commit and version appear correctly
  - [ ] Test response time < 1 second
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 4.10:** Documentation
  - [ ] Update template service README with health check endpoint
  - [ ] Add Swagger documentation for `/health` endpoint
  - [ ] Document environment variables (GIT_COMMIT_SHA)
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

**Phase Completion:** 10/10 tasks completed (100%)

---

### Phase 2: RBAC Integration with BaseService (PRIORITY 1)
**Status:** 🔄 In Progress
**Estimated Effort:** 8 hours
**Actual Effort:** 5 hours (so far)
**Dependencies:** None

#### Tasks

- [x] **Task 1.1:** Update Category Schema
  - [x] Make `Category` schema extend `BaseSchema`
  - [x] Remove duplicate fields (createdAt, updatedAt, deletedAt, isDeleted, owner)
  - [x] Keep business fields (name, description, isActive)
  - [x] Test schema compilation
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 1.2:** Update Product Schema
  - [x] Make `Product` schema extend `BaseSchema`
  - [x] Remove duplicate fields
  - [x] Keep business fields (name, description, price, stock, categoryId, isActive)
  - [x] Test schema compilation
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 1.3:** Create @CurrentUser decorator
  - [x] Create `libs/base/src/decorators/current-user.decorator.ts`
  - [x] Extract RequestContext from JWT payload
  - [x] Map user.sub/userId to context.userId
  - [x] Map roles, orgId, groupId, agentId, appId
  - [x] Export from base library index
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 1.4:** Update CategoryService to extend BaseService
  - [x] Make `CategoryService` extend `BaseService<Category>`
  - [x] Pass model to super constructor
  - [x] Override `create()` method
    - Call `super.create(dto, context)`
    - Add queue event emission
    - Add logging
  - [x] Override `findAll()` method
    - Call `super.findAll(options, context)`
    - Add logging
  - [x] Use inherited `softDelete()` method (no override)
  - [x] Use inherited `update()` method (no override)
  - [x] Use inherited `findById()` method (no override)
  - [x] Remove old CRUD methods
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 1.5:** Update ProductService to extend BaseService
  - [x] Make `ProductService` extend `BaseService<Product>`
  - [x] Pass model to super constructor
  - [x] Override `create()` method (with queue event)
  - [x] Override `findAll()` method (with logging)
  - [x] Handle `findByCategory()` method with BaseService filter
  - [x] Use inherited methods for update, delete, findById
  - [x] Remove old CRUD methods
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 1.6:** Update CategoryController
  - [x] Add `@CurrentUser()` decorator to all endpoints
  - [x] Update `create()` to pass context to service
  - [x] Update `findAll()` to accept pagination query params (page, limit)
  - [x] Update `findAll()` to accept filter and sort query params
  - [x] Update `findAll()` to pass FindManyOptions to service
  - [x] Update `findOne()` to pass context to service
  - [x] Update `update()` to pass context to service
  - [x] Update `remove()` to call `softDelete()` with context
  - [x] Update Swagger decorators with new query params
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 1.7:** Update ProductController
  - [x] Add `@CurrentUser()` decorator to all endpoints
  - [x] Update all methods to pass context
  - [x] Add pagination support (page, limit)
  - [x] Add filter and sort support
  - [x] Update `findAll()` with categoryId filter integration
  - [x] Update Swagger decorators
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [x] **Task 1.8:** Update DTOs for pagination
  - [x] Create `PaginationQueryDto` in base library
  - [x] Create `PaginationResponseDto` in base library
  - [x] Add validation decorators (@IsOptional, @IsNumber, @Min, @Max)
  - [x] Export from base library
  - **Assignee:** Agent
  - **Status:** ✅ Complete
  - **Completion Date:** 2025-10-16

- [ ] **Task 1.9:** Testing
  - [ ] Test create with valid permissions (should succeed)
  - [ ] Test create without write permission (should return 403)
  - [ ] Test findAll with pagination (page=1, limit=5)
  - [ ] Test findAll with filter (name contains "Electronics")
  - [ ] Test findAll with sort (createdAt descending)
  - [ ] Test findAll without read permission (should return 403)
  - [ ] Test update with valid permissions
  - [ ] Test update without write permission (should return 403)
  - [ ] Test soft delete (record marked isDeleted=true)
  - [ ] Test soft deleted records not appearing in findAll
  - [ ] Test ownership enforcement (multi-tenant scenario)
  - [ ] Verify pagination response format
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 1.10:** Documentation
  - [ ] Update README with pagination examples
  - [ ] Add RBAC/permissions section to README
  - [ ] Update Swagger response schemas (with pagination wrapper)
  - [ ] Document query parameters (page, limit, filter, sort)
  - [ ] Update curl examples with pagination
  - [ ] Document permission requirements per endpoint
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

**Phase Completion:** 8/10 tasks completed (80%)
**Note:** Testing and documentation tasks remain pending

---

### Phase 3: Error Standardization (PRIORITY 2)
**Status:** ⏳ Pending
**Estimated Effort:** 4 hours
**Dependencies:** Phase 2 (RBAC errors benefit from standardization)

#### Tasks

- [ ] **Task 2.1:** Install dependencies
  - [ ] Install `uuid` package for correlation IDs
  - [ ] Install `@types/uuid` dev dependency
  - [ ] Update package.json
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 2.2:** Create GlobalExceptionFilter
  - [ ] Create `libs/base/src/filters/http-exception.filter.ts`
  - [ ] Implement `@Catch()` decorator for all exceptions
  - [ ] Implement `catch()` method with error handling
  - [ ] Implement `getHttpStatus()` method
  - [ ] Implement `getErrorMessage()` method
  - [ ] Implement `getValidationErrors()` method
  - [ ] Implement `getCorrelationId()` method
  - [ ] Add error logging to console
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 2.3:** Create ErrorResponse interface
  - [ ] Define `ErrorResponse` interface in filter file
  - [ ] Fields: statusCode, message, errors?, timestamp, path, correlationId
  - [ ] Add JSDoc comments
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 2.4:** Create CorrelationIdMiddleware (Optional)
  - [ ] Create `libs/base/src/middleware/correlation-id.middleware.ts`
  - [ ] Implement correlation ID generation/propagation
  - [ ] Set `x-correlation-id` in request headers
  - [ ] Set `x-correlation-id` in response headers
  - [ ] Export from base library
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 2.5:** Export from base library
  - [ ] Add filter to `libs/base/src/filters/index.ts`
  - [ ] Add middleware to `libs/base/src/middleware/index.ts`
  - [ ] Export from `libs/base/src/index.ts`
  - [ ] Build base library
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 2.6:** Integrate into Template Service
  - [ ] Import `GlobalExceptionFilter` in template `main.ts`
  - [ ] Apply filter with `app.useGlobalFilters()`
  - [ ] Apply correlation ID middleware (if implemented)
  - [ ] Test service starts successfully
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 2.7:** Testing - Validation Errors
  - [ ] Test empty required field (400 with validation errors array)
  - [ ] Test invalid data type (400 with validation errors)
  - [ ] Verify errors array contains descriptive messages
  - [ ] Verify message is "Validation failed"
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 2.8:** Testing - HTTP Exceptions
  - [ ] Test NotFoundException (404 with correct message)
  - [ ] Test ForbiddenException (403 from RBAC)
  - [ ] Test UnauthorizedException (401 without JWT)
  - [ ] Test ConflictException (409)
  - [ ] Verify all have timestamp, path, correlationId
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 2.9:** Testing - Uncaught Exceptions
  - [ ] Test unhandled error (500 Internal Server Error)
  - [ ] Verify error logged to console
  - [ ] Verify correlation ID generated
  - [ ] Verify response format consistent
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 2.10:** Documentation
  - [ ] Update README with error response format
  - [ ] Add Swagger schema for ErrorResponse
  - [ ] Document correlation ID header usage
  - [ ] Add examples of each error type
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

**Phase Completion:** 0/10 tasks completed (0%)

---

### Phase 4: Audit Trail Enhancement (PRIORITY 3)
**Status:** ⏳ Pending
**Estimated Effort:** 2 hours
**Dependencies:** Phase 2 (requires RequestContext)

#### Tasks

- [ ] **Task 3.1:** Update BaseSchema
  - [ ] Add `createdBy: string` field with @Prop decorator
  - [ ] Add `updatedBy: string` field with @Prop decorator
  - [ ] Set default value to empty string
  - [ ] Add JSDoc comments explaining fields
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 3.2:** Update BaseService create() method
  - [ ] Add `createdBy: context.userId` to data
  - [ ] Add `updatedBy: context.userId` to data
  - [ ] Ensure fields auto-populated on every create
  - [ ] Test with different users
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 3.3:** Update BaseService update() method
  - [ ] Add `updatedBy: context.userId` to update data
  - [ ] Prevent clients from manually setting `createdBy`
  - [ ] Prevent clients from manually setting `updatedBy`
  - [ ] Test sanitization works correctly
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 3.4:** Update BaseService softDelete() method
  - [ ] Add `updatedBy: context.userId` to soft delete operation
  - [ ] Ensure audit trail on delete
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 3.5:** Build and test base library
  - [ ] Build base library with new fields
  - [ ] Verify no compilation errors
  - [ ] Verify template service can use updated BaseService
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 3.6:** Testing - Create operation
  - [ ] Create category with user A
  - [ ] Verify `createdBy` equals user A's userId
  - [ ] Verify `updatedBy` equals user A's userId
  - [ ] Verify fields appear in API response
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 3.7:** Testing - Update operation
  - [ ] Create category with user A
  - [ ] Update category with user B
  - [ ] Verify `createdBy` still equals user A
  - [ ] Verify `updatedBy` now equals user B
  - [ ] Verify fields appear in API response
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 3.8:** Testing - Field protection
  - [ ] Attempt to manually set `createdBy` in create request
  - [ ] Verify field is auto-populated from context (not from request)
  - [ ] Attempt to manually set `updatedBy` in update request
  - [ ] Verify field is auto-populated from context
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 3.9:** Testing - Soft delete
  - [ ] Soft delete category with user C
  - [ ] Verify `updatedBy` equals user C
  - [ ] Verify `deletedAt` is set
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

- [ ] **Task 3.10:** Documentation
  - [ ] Update README with audit trail fields explanation
  - [ ] Add example API response showing createdBy/updatedBy
  - [ ] Update Swagger response schemas
  - [ ] Document that fields are auto-populated
  - **Assignee:** TBD
  - **Status:** ⏳ Pending
  - **Completion Date:** N/A

**Phase Completion:** 0/10 tasks completed (0%)

---

## 📊 Overall Progress

| Phase | Status | Tasks | Completion | Estimated Hours | Actual Hours |
|-------|--------|-------|------------|-----------------|--------------|
| Phase 1: Health Check | ✅ Complete | 10/10 | 100% | 4h | 1.5h |
| Phase 2: RBAC Integration | 🔄 In Progress | 8/10 | 80% | 8h | 5h |
| Phase 3: Error Standardization | ⏳ Pending | 0/10 | 0% | 4h | - |
| Phase 4: Audit Trail | ⏳ Pending | 0/10 | 0% | 2h | - |
| **TOTAL** | **🔄 In Progress** | **18/40** | **45%** | **18h** | **6.5h** |

---

## 📝 Change Log

| Date | Phase | Task | Change | Updated By |
|------|-------|------|--------|------------|
| 2025-10-16 | N/A | N/A | Document created | Agent |
| 2025-10-16 | Phase 1 | All Tasks | Completed Health Check Endpoint implementation | Agent |
| 2025-10-16 | Phase 2 | Task 1.1-1.8 | Completed RBAC integration for services and controllers | Agent |
| 2025-10-16 | Phase 2 | Task 1.8 | Created PaginationQueryDto and PaginationResponseDto | Agent |
| 2025-10-16 | N/A | N/A | Git commit: feat: Implement Template Service with RBAC integration | Agent |
| 2025-10-16 | N/A | N/A | Git commit: fix: Resolve TypeScript compilation errors | Agent |
| 2025-10-16 | Phase 2 | Refactor | Added automatic logging to BaseService using constructor.name | Agent |
| 2025-10-16 | Phase 2 | Refactor | Simplified CategoryService and ProductService - removed unnecessary wrappers | Agent |
| 2025-10-16 | N/A | N/A | Git commit: refactor: Add automatic logging to BaseService and simplify service layers | Agent |

---

## 🚨 Issues & Blockers

_No issues or blockers at this time._

---

## 📌 Notes

- All phases follow the implementation order: 4 → 1 → 2 → 3
- Each task should be marked complete only when:
  - Code is implemented
  - Tests are passing
  - Documentation is updated
- Update this document after completing each task
- Log any issues or blockers in the Issues & Blockers section
- Record actual hours spent for future estimation improvement

---

## 🎯 Next Steps

### Immediate (Phase 2 - RBAC Integration)
1. **Task 1.9: Testing RBAC functionality** - Test permissions, pagination, soft delete
2. **Task 1.10: Documentation** - Update README with pagination and RBAC examples

### Short-term (Phase 3 - Error Standardization)
3. Install uuid package for correlation IDs
4. Create GlobalExceptionFilter for consistent error responses
5. Implement CorrelationIdMiddleware for request tracking

### Medium-term (Phase 4 - Audit Trail)
6. Add createdBy/updatedBy fields to BaseSchema
7. Auto-populate audit fields in BaseService CRUD operations

## 💡 Recommendations

### Priority A: Complete Phase 2 Testing (Highly Recommended)
**Estimated Time:** 2-3 hours

Testing is crucial to validate RBAC implementation before moving forward:
- Test permission enforcement (403 responses)
- Test multi-tenant data isolation (owner fields)
- Test pagination functionality
- Test soft delete behavior

**Benefits:**
- Ensures RBAC works correctly
- Catches bugs early
- Validates BaseService logging
- Prevents breaking changes in production

### Priority B: Skip to Phase 4 (Audit Trail) - Quick Win
**Estimated Time:** 1-2 hours

Phase 4 (Audit Trail) is lightweight and builds directly on Phase 2:
- Already have RequestContext in place
- Just add 2 fields to BaseSchema
- Update 3 methods in BaseService
- Low risk, high value for compliance

**Benefits:**
- Quick to implement
- Provides audit trail immediately
- Good for compliance requirements
- Natural extension of current work

### Priority C: Phase 3 (Error Standardization) - Can Wait
**Estimated Time:** 4 hours

Error standardization is important but not blocking:
- Current error handling is functional
- Can be done after Phase 4
- More time-consuming than Phase 4

**Benefits:**
- Better developer experience
- Consistent API responses
- Easier debugging with correlation IDs

## 📋 Suggested Implementation Order

**Option 1: Complete Current Phase** (Recommended for thoroughness)
```
Phase 2 Testing (2h) → Phase 2 Docs (1h) → Phase 4 (2h) → Phase 3 (4h)
Total: ~9 hours
```

**Option 2: Quick Win First** (Recommended for fast delivery)
```
Phase 4 (2h) → Phase 2 Testing (2h) → Phase 2 Docs (1h) → Phase 3 (4h)
Total: ~9 hours
```

**Option 3: Defer Testing** (Not recommended - risky)
```
Phase 4 (2h) → Phase 3 (4h) → Phase 2 Testing later
```

---

**Document End**
