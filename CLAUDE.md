# CLAUDE.md

This file provides guidance to AI Agent when working with code in this repository.

## Agent Info
1. **Agent Name**: `backend-dev`

## Development Workflow Principles

### Handling Change Requests
When there are mandatory change requests, follow these steps:
1. **Discuss** - Gather all necessary information and requirements
2. **Propose** - Present implementation method and detailed plan
3. **Approve** - Get confirmation before proceeding
4. **Create Branch** - Create a new git branch for the implementation
5. **Implement** - Execute the approved plan
6. **Update** - Modify related documentation and tests

### Task Management
- **Use micro-task principle**: Break down complex tasks into small, manageable todos to avoid output token limits (6k limit)
- Create granular todo items for each discrete action (e.g., separate todos for each file to edit, each function to implement)
- Mark todos as completed immediately after finishing each micro-task
- Keep responses concise by focusing on one micro-task at a time

### Issue-Based Workflow
When receiving new development requests, follow this workflow:

1. **Create Issue**: For every development request, create a new issue in MCP VOA system with status "backlog"
3. **Populate Information**: Fill in known information and mark missing information as placeholders
4. **Request Review**: Ask user to review issue, provide missing information, and approve before implementation
5. **Execute**: Once approved, change status to "in-progress" and implement the solution
6. **Track Progress**: Update issue progress and status throughout implementation
7. **Complete**: Mark issue as "done" when finished

#### Issue Content Guidelines
- **Scope**: Keep requests focused on small features (2-3 files max, single endpoint/module)
- **Template Flexibility**: Adapt the template content based on request type and complexity
- **Testing Requirements**: Always include build verification, service testing, and API testing with curl commands
- **Clear Expectations**: Define exact acceptance criteria and expected outcomes

#### Common Request Types
- **API Development**: Creating new endpoints
- **API Modification**: Updating existing endpoints
- **API Testing**: Validating endpoint behavior
- **Module Addition**: Adding new modules to services
- **Bug Investigation**: Analyzing and fixing issues
- **New Service Creation**: Creating new microservices (see prompt templates below)

## Common Development Commands

### Build Commands
```bash
# Build all projects
npx nx run-many --target=build --all

# Build specific service
npx nx build iam
npx nx build cbm

# Build with development configuration
npx nx build iam --configuration=development
```

### Development Server
```bash
# Serve a specific service (with hot reload)
npx nx serve iam
npx nx serve cbm

# Serve with production configuration
npx nx serve iam --configuration=production
```

### Testing
```bash
# Run all tests
npx nx run-many --target=test --all

# Run tests for specific project
npx nx test iam
npx nx test cbm
npx nx test shared
npx nx test base

# Run tests with coverage
npx nx test iam --coverage

# Run e2e tests
npx nx test iam-e2e
npx nx test cbm-e2e
```

### Linting
```bash
# Lint all projects
npx nx run-many --target=lint --all

# Lint specific project
npx nx lint iam
npx nx lint cbm

# Lint with auto-fix
npx nx lint iam --fix
```

### Other Useful Commands
```bash
# Show dependency graph
npx nx graph

# Show project details
npx nx show project iam
npx nx show projects

# Generate new NestJS application
npx nx g @nx/nest:app <app-name>

# Generate new library
npx nx g @nx/node:lib <lib-name>
```

## High-Level Architecture

### Monorepo Structure
This is an Nx monorepo using NestJS framework for microservices architecture with the following key components:

**Services** (`/services/`):
- **IAM** (Identity & Access Management) - Port 3000
  - User management with MongoDB/Mongoose
  - Organization management
  - JWT authentication strategy
  - Password encryption utilities
  
- **CBM** (Core Business Management) - Port 3001
  - Basic service structure ready for business logic

**Libraries** (`/libs/`):
- **base** - Shared base classes and utilities
  - Base DTOs, controllers, services, and schemas
  - JWT strategy and auth guards
  - Reusable NestJS components
  
- **shared** - Cross-service shared code
  - Service configuration (ports, hosts, database URIs)
  - Common constants and enums (roles, service names)
  - Authentication utilities and logging helpers
  - TypeScript types for auth and services

### Service Communication Pattern
- Services are configured to run on different ports (IAM: 3000, CBM: 3001)
- Each service has its own MongoDB database with a common prefix pattern
- Authentication is handled centrally through the IAM service
- Shared libraries ensure consistent interfaces and utilities across services

### Database Architecture
- MongoDB with Mongoose ODM
- Each service has its own database: `{COMMON_CONFIG.DatabaseNamePrefix}{serviceName}`
- Base schemas provide common fields and patterns
- Connection URI from environment variable: `MONGODB_URI`

### Testing Strategy
- Unit tests alongside source files (`*.spec.ts`)
- E2E tests in separate projects (`*-e2e`)
- Jest configuration with TypeScript support
- Test setup includes global setup/teardown for E2E tests

### Configuration Management
- Environment variables via `@nestjs/config`
- Service-specific configurations in `shared` library
- Global configuration accessible across all services
- MongoDB URI and other secrets via environment variables

---

## 🚀 Creating New Services

### Quick Reference
When creating new microservices, use these prompt templates:

**📋 Detailed Guide:**
- File: `docs/PROMPT-NEW-SERVICE-CREATION.md`
- Use for: Complex services with multiple entities and special requirements

**⚡ Quick Template:**
- File: `docs/QUICK-PROMPT-NEW-SERVICE.md`
- Use for: Simple services with standard CRUD operations

### Standard Service Template
All new services MUST follow the **Template Service** pattern (`services/template/`):

**✅ Required Features (All Mandatory):**
1. **Health Check** - `/health` endpoint with database monitoring
2. **Error Standardization** - GlobalExceptionFilter with correlation IDs
3. **RBAC Integration** - BaseService with permission checks
4. **Audit Trail** - createdBy/updatedBy tracking
5. **Modern Controllers** - @CurrentUser decorator, no BaseController
6. **Swagger Documentation** - Full OpenAPI specs with error decorators
7. **JWT Authentication** - JwtStrategy + PassportModule
8. **Pagination Support** - PaginationQueryDto for list endpoints
9. **Soft Delete** - All entities support soft delete
10. **Correlation ID** - CorrelationIdMiddleware for request tracking

**📚 Reference Implementation:**
- **Primary Reference:** `services/template/` - Production-ready example
- **Upgraded Service:** `services/iam/` - Recently upgraded to new pattern
- **Documentation:** `docs/TEMPLATE-SERVICE-UPGRADE.md` - Feature details
- **Test Results:** `docs/TEST-RESULTS-PHASE2.md` - Example test scenarios

### Service Creation Workflow
1. **Read Prompt Templates** - Review `docs/QUICK-PROMPT-NEW-SERVICE.md`
2. **Customize Prompt** - Replace placeholders with service details
3. **Submit to Agent** - Paste prompt to Claude Code
4. **Confirm Understanding** - Wait for Agent to outline structure
5. **Incremental Development** - Agent creates service step-by-step
6. **Verify Build** - Run `npx nx build [SERVICE_NAME]`
7. **Test Endpoints** - Verify health check and APIs
8. **Review Documentation** - Check README has curl examples

### Common Patterns

**Schema Pattern:**
```typescript
import { BaseSchema } from '@hydrabyte/base';

@Schema({ timestamps: true })
export class MyEntity extends BaseSchema {
  @Prop({ required: true })
  name: string;
  // ... entity-specific fields
}
```

**Service Pattern:**
```typescript
import { BaseService } from '@hydrabyte/base';

@Injectable()
export class MyEntityService extends BaseService<MyEntity> {
  constructor(@InjectModel(MyEntity.name) model: Model<MyEntity>) {
    super(model);
  }
  // Override methods if needed
}
```

**Controller Pattern (Modern - NO BaseController):**
```typescript
import { JwtAuthGuard, CurrentUser, PaginationQueryDto,
         ApiCreateErrors, ApiReadErrors } from '@hydrabyte/base';

@Controller('my-entities')
export class MyEntityController {
  constructor(private readonly service: MyEntityService) {}

  @Get()
  @ApiReadErrors({ notFound: false })
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.service.findAll(query, context);
  }
}
```

### Port Allocation
Current services:
- IAM: 3000
- CBM: 3001
- Template: 3002

**Next available ports:** 3003, 3004, 3005, etc.

### Verification Checklist
After service creation:
```bash
# Build without errors
npx nx build [SERVICE_NAME]

# TypeScript compilation check
npx tsc --noEmit -p services/[SERVICE_NAME]/tsconfig.app.json

# Start service
npx nx serve [SERVICE_NAME]

# Test health endpoint
curl http://localhost:[PORT]/health

# View API documentation
open http://localhost:[PORT]/api-docs
```
