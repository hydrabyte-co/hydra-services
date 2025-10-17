# Template Service - Microservices Pattern Reference

A comprehensive NestJS microservice template demonstrating modern architecture patterns including CRUD operations, Event-Driven Architecture with BullMQ, and async report generation.

## 🎯 Purpose

This template service serves as a **reference implementation** for creating new microservices in the Hydra Services ecosystem. It demonstrates:

- ✅ Complete CRUD operations with MongoDB/Mongoose
- ✅ Event-Driven Architecture using BullMQ + Redis
- ✅ Queue-based async processing (Publisher/Subscriber pattern)
- ✅ Module organization and dependency management
- ✅ Swagger/OpenAPI documentation
- ✅ TypeScript best practices
- ✅ Validation with class-validator

## 📁 Service Architecture

### Modules

```
services/template/
├── src/
│   ├── modules/
│   │   ├── category/          # Category CRUD + Events
│   │   ├── product/           # Product CRUD + Events (references Category)
│   │   └── report/            # Report generation (uses Category & Product)
│   ├── queues/
│   │   ├── producers/         # Event publishers
│   │   ├── processors/        # Event consumers
│   │   ├── queue.module.ts    # BullMQ configuration
│   │   └── processors.module.ts
│   ├── config/
│   │   ├── redis.config.ts    # Redis connection settings
│   │   └── queue.config.ts    # Queue names and event types
│   └── app.module.ts
├── reports/                   # Generated report files
└── .env                       # Environment configuration
```

### Key Design Patterns

1. **Entity Modules** (`category`, `product`):
   - Full CRUD with Mongoose schemas
   - Emit events to queues after DB operations
   - Controller → Service → Repository → Queue Producer

2. **Utility Module** (`report`):
   - No entity/schema
   - Uses services from other modules
   - Triggers async jobs via queue

3. **Queue System**:
   - 3 separate queues: `categories.queue`, `products.queue`, `reports.queue`
   - Publisher/Subscriber pattern
   - Processors handle async business logic

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- MongoDB running on `10.10.0.100:27017` (or update `.env`)
- Redis running on `127.0.0.1:6379` (or update `.env`)

### 2. Install Dependencies

Already installed at monorepo root level.

### 3. Configure Environment

Edit `services/template/.env`:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://10.10.0.100:27017/hydra-template

# Redis Configuration (for BullMQ)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Service Configuration
PORT=3002
NODE_ENV=development
```

### 4. Start Service

```bash
npx nx serve template
```

Service will be available at:
- **API**: http://localhost:3002/api
- **Swagger Docs**: http://localhost:3002/api-docs
- **Health Check**: http://localhost:3002/api/health

## 🏥 Health Check

The service provides a `/health` endpoint for monitoring service health, suitable for deployment health checks, load balancers, and monitoring systems.

### Endpoint

```
GET /api/health
```

**No authentication required** - This endpoint is public for monitoring purposes.

### Response Format

```json
{
  "status": "ok",
  "info": {
    "version": "1.0.0",
    "gitCommit": "1acbbb8",
    "uptime": 143.69,
    "environment": "development"
  },
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Service is healthy - all systems operational |
| 503 | Service is unhealthy - one or more critical systems down |

### Health Indicators

- **database**: MongoDB connection status
- **info.version**: Application version from package.json
- **info.gitCommit**: Git commit SHA (from `GIT_COMMIT_SHA` env variable)
- **info.uptime**: Process uptime in seconds
- **info.environment**: Current environment (development/production)

### Example Usage

```bash
# Check service health
curl http://localhost:3002/api/health

# Check with detailed HTTP status
curl -i http://localhost:3002/api/health

# Use in Docker health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3002/api/health || exit 1
```

### Configuration

Set the `GIT_COMMIT_SHA` environment variable to display the current deployment version:

```env
# In .env file
GIT_COMMIT_SHA=1acbbb8

# Or via CI/CD
export GIT_COMMIT_SHA=$(git rev-parse --short HEAD)
```

## 🔐 Authentication

All API endpoints (Category, Product) are **protected** with JWT authentication using `@UseGuards(JwtAuthGuard)`.

### Getting a Token

First, authenticate with the IAM service to obtain a JWT token:

```bash
# Login to IAM service
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tonyh",
    "password": "123zXc_-"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "68dcf365f6a92c0d4911b619",
    "username": "tonyh"
  }
}
```

### Using the Token

Include the token in the `Authorization` header for all API requests:

```bash
# Set token as environment variable
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Make authenticated request
curl -X GET http://localhost:3002/api/categories \
  -H "Authorization: Bearer $TOKEN"
```

### Authentication Implementation

The template service uses `@UseGuards(JwtAuthGuard)` from `@hydrabyte/base`:

```typescript
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@hydrabyte/base';

@ApiTags('categories')
@ApiBearerAuth('JWT-auth')
@Controller('categories')
export class CategoryController {
  @Post()
  @UseGuards(JwtAuthGuard)  // Requires valid JWT token
  async create(@Body() dto: CreateCategoryDto) {
    // ...
  }
}
```

### Unauthorized Access

Requests without a valid token will receive a `401 Unauthorized` response:

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

## 🔐 Role-Based Access Control (RBAC)

All API endpoints enforce **Role-Based Access Control** using the BaseService from `@hydrabyte/base`. Permissions are automatically calculated based on the user's role in the JWT token.

### Permission System

The RBAC system supports hierarchical roles with different scopes:

| Role | Scope | Read | Write | Delete | Administrative |
|------|-------|------|-------|--------|----------------|
| `universe.owner` | Universe | ✅ | ✅ | ✅ | ✅ |
| `universe.admin` | Universe | ✅ | ✅ | ✅ | ❌ |
| `org.owner` | Organization | ✅ | ✅ | ✅ | ✅ |
| `org.admin` | Organization | ✅ | ✅ | ✅ | ❌ |
| `org.member` | Organization | ✅ | ✅ | ❌ | ❌ |
| `group.owner` | Group | ✅ | ✅ | ✅ | ✅ |
| `group.member` | Group | ✅ | ❌ | ❌ | ❌ |

### Permission Enforcement

**Create Operation** (POST):
- Requires: `allowWrite: true`
- Auto-populates: `owner.orgId`, `owner.userId`, `owner.groupId`

**Read Operations** (GET):
- Requires: `allowRead: true`
- Auto-filters by ownership scope (org/group/user)

**Update Operation** (PUT):
- Requires: `allowWrite: true`
- Only owner or higher scope can modify

**Delete Operation** (DELETE):
- Requires: `allowDelete: true`
- Soft delete (sets `isDeleted: true`)

### Permission Denied Response

When a user lacks required permissions, the API returns `403 Forbidden`:

```json
{
  "statusCode": 403,
  "message": "You do not have permission to <operation>"
}
```

### Multi-Tenant Isolation

The RBAC system automatically enforces **multi-tenant data isolation**:

- **Organization-scoped** roles only see data from their organization
- **Group-scoped** roles only see data from their group
- **Universe-scoped** roles see all data

Example: User A (orgId: X) creates a category. User B (orgId: Y) **cannot see** User A's category.

### RBAC Logging

All permission checks are logged automatically:

```
[DEBUG] [CategoryService] Creating entity
{
  "userId": "68dcf365f6a92c0d4911b619"
}
Role-Based Permissions: {
  role: 'universe.owner',
  scope: 'universe',
  roleName: 'owner',
  permissions: {
    allowRead: true,
    allowWrite: true,
    allowDelete: true,
    allowAdministrative: true,
    scope: 'universe',
    filter: {}
  }
}
```

## 📄 Pagination & Filtering

All `GET` collection endpoints support **pagination**, **filtering**, and **sorting**.

### Pagination Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 10 | Items per page (max: 100) |
| `filter[field]` | string | - | Filter by field value |
| `sort` | string | - | Sort fields (prefix `-` for descending) |

### Pagination Response Format

All paginated endpoints return a consistent response structure:

```json
{
  "data": [
    {
      "_id": "68f1d03f81d7fb554e63e4d3",
      "name": "Electronics",
      "description": "Electronic devices",
      "isActive": true,
      "createdAt": "2025-10-17T05:12:31.894Z",
      "updatedAt": "2025-10-17T05:12:31.894Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

### Pagination Examples

**Basic pagination:**
```bash
# Get first page (5 items per page)
curl "http://localhost:3002/api/categories?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Get second page
curl "http://localhost:3002/api/categories?page=2&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

**Filtering by field:**
```bash
# Filter categories by name
curl "http://localhost:3002/api/categories?filter[name]=Electronics" \
  -H "Authorization: Bearer $TOKEN"

# Filter products by category
curl "http://localhost:3002/api/products?filter[categoryId]=68f1d03f81d7fb554e63e4d3" \
  -H "Authorization: Bearer $TOKEN"

# Filter active items only
curl "http://localhost:3002/api/categories?filter[isActive]=true" \
  -H "Authorization: Bearer $TOKEN"
```

**Sorting:**
```bash
# Sort by creation date (newest first)
curl "http://localhost:3002/api/categories?sort=-createdAt" \
  -H "Authorization: Bearer $TOKEN"

# Sort by name (ascending)
curl "http://localhost:3002/api/categories?sort=name" \
  -H "Authorization: Bearer $TOKEN"

# Multiple sort fields
curl "http://localhost:3002/api/categories?sort=-createdAt,name" \
  -H "Authorization: Bearer $TOKEN"
```

**Combined query:**
```bash
# Page 2, 10 items, active only, sorted by name
curl "http://localhost:3002/api/categories?page=2&limit=10&filter[isActive]=true&sort=name" \
  -H "Authorization: Bearer $TOKEN"
```

### Soft Delete Behavior

Deleted records are **not permanently removed** from the database. Instead, they are marked with:

```json
{
  "isDeleted": true,
  "deletedAt": "2025-10-17T05:13:54.946Z"
}
```

Soft-deleted records are **automatically hidden** from all `GET` queries (findAll, findById).

To view deleted records, administrators would need a separate endpoint (not currently implemented).

## 📚 API Documentation

### Category Endpoints

| Method | Endpoint | Description | Permission Required | Pagination |
|--------|----------|-------------|---------------------|------------|
| POST | `/api/categories` | Create category | `allowWrite: true` | ❌ |
| GET | `/api/categories` | Get all categories | `allowRead: true` | ✅ |
| GET | `/api/categories/:id` | Get category by ID | `allowRead: true` | ❌ |
| PUT | `/api/categories/:id` | Update category | `allowWrite: true` | ❌ |
| DELETE | `/api/categories/:id` | Soft delete category | `allowDelete: true` | ❌ |

**Example - Create Category:**
```bash
curl -X POST http://localhost:3002/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Electronics",
    "description": "Electronic devices and accessories",
    "isActive": true
  }'
```

**Response (201 Created):**
```json
{
  "_id": "68f1d03f81d7fb554e63e4d3",
  "owner": {
    "orgId": "68dd05b175d9e3c17bf97f60",
    "userId": "68dcf365f6a92c0d4911b619",
    "groupId": "",
    "agentId": "",
    "appId": ""
  },
  "name": "Electronics",
  "description": "Electronic devices and accessories",
  "isActive": true,
  "createdAt": "2025-10-17T05:12:31.894Z",
  "updatedAt": "2025-10-17T05:12:31.894Z",
  "__v": 0
}
```

**Example - Get All Categories (with pagination):**
```bash
curl "http://localhost:3002/api/categories?page=1&limit=10&sort=-createdAt" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "_id": "68f1d03f81d7fb554e63e4d3",
      "name": "Electronics",
      "description": "Electronic devices and accessories",
      "isActive": true,
      "createdAt": "2025-10-17T05:12:31.894Z",
      "updatedAt": "2025-10-17T05:12:31.894Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

### Product Endpoints

| Method | Endpoint | Description | Permission Required | Pagination |
|--------|----------|-------------|---------------------|------------|
| POST | `/api/products` | Create product | `allowWrite: true` | ❌ |
| GET | `/api/products` | Get all products | `allowRead: true` | ✅ |
| GET | `/api/products?categoryId=xxx` | Filter by category | `allowRead: true` | ✅ |
| GET | `/api/products/:id` | Get product by ID | `allowRead: true` | ❌ |
| PUT | `/api/products/:id` | Update product | `allowWrite: true` | ❌ |
| DELETE | `/api/products/:id` | Soft delete product | `allowDelete: true` | ❌ |

**Example - Create Product:**
```bash
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "iPhone 15 Pro",
    "description": "Latest iPhone",
    "price": 999.99,
    "stock": 50,
    "categoryId": "68f1d03f81d7fb554e63e4d3",
    "isActive": true
  }'
```

**Example - Get Products by Category (with pagination):**
```bash
curl "http://localhost:3002/api/products?filter[categoryId]=68f1d03f81d7fb554e63e4d3&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Report Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/reports/product-summary` | Generate product summary report (async) | ❌ No |

**Example - Trigger Report Generation:**
```bash
curl -X POST http://localhost:3002/api/reports/product-summary
```

Response:
```json
{
  "reportType": "product-summary",
  "status": "queued",
  "message": "Report generation has been queued with job ID: 1"
}
```

Report will be generated asynchronously and saved to `/services/template/reports/`.

## 🔄 Event-Driven Flow

### Category/Product CRUD Flow

```
1. Client → POST /api/categories
2. CategoryController → CategoryService.create()
3. CategoryService:
   - Save to MongoDB
   - Emit event → categories.queue
4. CategoryProcessor:
   - Listen to categories.queue
   - Process event (logging, notifications, etc.)
```

### Report Generation Flow

```
1. Client → POST /api/reports/product-summary
2. ReportController → ReportProducer.emitReportGenerate()
3. Event queued → reports.queue
4. ReportProcessor:
   - Listen to reports.queue
   - Use ProductService + CategoryService
   - Generate JSON report
   - Save to /reports/ folder
```

## 📊 Queue Events

### Queue Names (config/queue.config.ts)

```typescript
QUEUE_NAMES = {
  CATEGORIES: 'categories.queue',
  PRODUCTS: 'products.queue',
  REPORTS: 'reports.queue',
}
```

### Event Types

```typescript
QUEUE_EVENTS = {
  CATEGORY_CREATED: 'category.created',
  CATEGORY_UPDATED: 'category.updated',
  CATEGORY_DELETED: 'category.deleted',
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  REPORT_GENERATE: 'report.generate',
}
```

## 📝 Logging Utility

### Colored Logger from `@hydrabyte/shared`

The template service demonstrates usage of the custom colored logger utility.

**Features:**
- ✅ **Color-coded** log levels (INFO: Cyan, DEBUG: Yellow, WARN: Magenta, ERROR: Red)
- ✅ **Timestamps** for all log entries
- ✅ **Context** tags (module/service name)
- ✅ **Structured data** formatting (JSON)
- ✅ **Environment-aware** (DEBUG logs hidden in production)

### Usage Examples

**Method 1: Create Logger Instance**
```typescript
import { createLogger } from '@hydrabyte/shared';

export class CategoryService {
  private readonly logger = createLogger('CategoryService');

  async create(dto: CreateCategoryDto) {
    this.logger.debug('Creating category', dto);

    const saved = await this.save(dto);

    this.logger.info('Category created successfully', {
      id: saved._id,
      name: saved.name
    });

    return saved;
  }
}
```

**Method 2: Direct Function Calls**
```typescript
import { logInfo, logDebug, logError, logWarn } from '@hydrabyte/shared';

logInfo('User logged in', { userId: '123', username: 'john' });
logDebug('Query executed', { query: 'SELECT * FROM users', duration: '45ms' });
logWarn('Deprecated API used', { endpoint: '/api/v1/old' });
logError('Database connection failed', { error: err.message, host: 'localhost' });
```

### Log Levels

| Level | Color | Use Case | Production |
|-------|-------|----------|------------|
| **DEBUG** | Yellow | Development debugging, detailed flow | Hidden |
| **INFO** | Cyan | General information, successful operations | Shown |
| **WARN** | Magenta | Warnings, deprecated usage | Shown |
| **ERROR** | Red | Errors, exceptions | Shown |

### Output Format

```
[2025-10-06 08:57:40] [INFO] [CategoryService] Category created successfully
{
  "id": "68e38484e05bb8cc523e5561",
  "name": "Books"
}

[2025-10-06 08:57:53] [DEBUG] [ReportService] Data collected for report
{
  "categoriesCount": 3,
  "productsCount": 1
}
```

### Additional Utilities

```typescript
import { logSeparator, logSection } from '@hydrabyte/shared';

// Print separator line
logSeparator(); // ────────────────────────────────────────

// Print section header
logSection('Report Generation');
// ────────────────────────────────────────
//   Report Generation
// ────────────────────────────────────────
```

### Best Practices

1. **Use logger instance per class/service**
   ```typescript
   private readonly logger = createLogger('ServiceName');
   ```

2. **Log at appropriate levels**
   - `debug`: Input parameters, internal state
   - `info`: Successful operations, milestones
   - `warn`: Recoverable issues, deprecation
   - `error`: Failures, exceptions

3. **Include context data**
   ```typescript
   this.logger.info('Operation completed', {
     id: resource.id,
     duration: Date.now() - startTime,
     status: 'success'
   });
   ```

4. **Don't log sensitive data**
   ```typescript
   // ❌ Bad
   this.logger.debug('User data', { password: user.password });

   // ✅ Good
   this.logger.debug('User data', {
     id: user.id,
     username: user.username
   });
   ```

## 🛠️ Creating a New Service from Template

### Method 1: Clone and Customize

```bash
# 1. Copy template service
cp -r services/template services/your-new-service
cp -r services/template-e2e services/your-new-service-e2e

# 2. Update project.json
# Edit services/your-new-service/project.json
# Change all "template" references to "your-new-service"

# 3. Update .env
# Edit services/your-new-service/.env
# Change PORT, MONGODB_URI database name

# 4. Rename modules
# Rename category → your-entity-1
# Rename product → your-entity-2
# Rename report → your-utility-module

# 5. Update nx.json and .vscode/launch.json
# Add your new service configuration

# 6. Update imports and module references throughout the code
```

### Method 2: Using Nx Generator (Future)

```bash
# TODO: Create custom Nx generator
npx nx g @your-workspace:service your-new-service --template=template
```

## 📝 Customization Checklist

When creating a new service from this template:

- [ ] Update service name in `project.json`
- [ ] Update port in `.env` (avoid conflicts)
- [ ] Update MongoDB database name in `.env`
- [ ] Rename entity modules to match your domain
- [ ] Update Swagger title/description in `main.ts`
- [ ] Update queue names in `config/queue.config.ts`
- [ ] Customize event types in `config/queue.config.ts`
- [ ] Update Mongoose schemas for your entities
- [ ] Update DTOs with proper validation rules
- [ ] Customize processor logic for your business needs
- [ ] Update README.md with your service specifics
- [ ] Add/remove modules as needed

## 🔍 Code Structure Highlights

### Avoiding Circular Dependencies

Template uses separate `QueueModule` and `ProcessorsModule`:

```typescript
// queue.module.ts - Only producers
@Module({
  imports: [BullModule.forRoot(...), BullModule.registerQueue(...)],
  providers: [CategoryProducer, ProductProducer, ReportProducer],
  exports: [CategoryProducer, ProductProducer, ReportProducer],
})

// processors.module.ts - Only processors
@Module({
  imports: [ReportModule],  // Can safely import service modules
  providers: [CategoryProcessor, ProductProcessor, ReportProcessor],
})
```

### Module Dependency Graph

```
AppModule
├── QueueModule (BullMQ config + Producers)
├── CategoryModule → QueueModule
├── ProductModule → QueueModule
├── ReportModule → ProductModule, CategoryModule, QueueModule
└── ProcessorsModule → ReportModule
```

## 🧪 Testing

### Manual Testing Flow

1. **Create Category:**
```bash
curl -X POST http://localhost:3002/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Electronics", "description": "Gadgets"}'
```
✅ Check logs: CategoryProcessor processes event

2. **Create Product:**
```bash
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Phone", "description": "Smartphone", "price": 699, "stock": 10, "categoryId": "<category-id>"}'
```
✅ Check logs: ProductProcessor processes event

3. **Generate Report:**
```bash
curl -X POST http://localhost:3002/api/reports/product-summary
```
✅ Check logs: ReportProcessor generates report
✅ Verify file created in `/services/template/reports/`

### Expected Log Output

```
[CategoryProcessor] Processing job 1 of type category.created
[CategoryProcessor] Category created: {...}

[ProductProcessor] Processing job 1 of type product.created
[ProductProcessor] Product created: {...}

[ReportProcessor] Processing job 1 of type report.generate
[ReportProcessor] Generating report: product-summary
[ReportProcessor] Report generated successfully: /path/to/report.json
```

## 🎓 Learning Resources

### Patterns Demonstrated

1. **CRUD Pattern**: Standard REST API with Mongoose
2. **Event Sourcing**: All state changes emit events
3. **CQRS (Light)**: Separate read (queries) and write (commands) concerns
4. **Async Processing**: Heavy operations offloaded to queues
5. **Module Composition**: Utility modules reuse entity module services

### Technologies Used

- **NestJS**: Framework
- **Mongoose**: MongoDB ODM
- **BullMQ**: Queue/Job processing
- **Redis**: Message broker for BullMQ
- **Swagger**: API documentation
- **class-validator**: DTO validation
- **TypeScript**: Type safety

## 📦 Dependencies

Key packages (already installed at root):

```json
{
  "@nestjs/mongoose": "^x.x.x",
  "@nestjs/bullmq": "^x.x.x",
  "@nestjs/swagger": "^x.x.x",
  "mongoose": "^x.x.x",
  "bullmq": "^x.x.x",
  "class-validator": "^x.x.x",
  "class-transformer": "^x.x.x"
}
```

## 🚨 Common Issues

### Redis Version Warning

```
It is highly recommended to use a minimum Redis version of 6.2.0
Current: 6.0.16
```

**Solution**: Upgrade Redis or ignore (BullMQ will still work)

### Circular Dependency Error

**Solution**: Check that `QueueModule` and `ProcessorsModule` are separated

### MongoDB Connection Failed

**Solution**: Verify `MONGODB_URI` in `.env` and MongoDB is running

## 📖 Additional Documentation

- **NestJS Docs**: https://docs.nestjs.com
- **BullMQ Docs**: https://docs.bullmq.io
- **Mongoose Docs**: https://mongoosejs.com
- **Swagger Docs**: https://swagger.io

## 🤝 Contributing

When improving this template:

1. Keep it generic and reusable
2. Document all patterns and decisions
3. Add examples for common use cases
4. Update this README

## 📄 License

Part of Hydra Services monorepo.

---

**Generated with Template Service v1.0.0**
