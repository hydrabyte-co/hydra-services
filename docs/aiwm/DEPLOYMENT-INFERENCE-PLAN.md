# Deployment Inference Implementation Plan

## 📋 Overview

Implement unified deployment inference system supporting both API-based and self-hosted models with automatic request proxying to AI providers.

**Priority:** API-based deployments first, self-hosted as placeholder for Phase 2

**Timeline:** 2-3 days

---

## 🎯 Goals

### Phase 1: API-based Deployments (MVP)
- ✅ Support API-based model deployments (OpenAI, Anthropic, Google)
- ✅ Unified inference endpoint: `POST /deployments/:id/inference/*`
- ✅ Automatic credential injection from model config
- ✅ Usage tracking (request count, tokens)
- ✅ Transparent error forwarding

### Phase 2: Self-hosted Deployments (Placeholder)
- 📝 TODO comments for future implementation
- 📝 Structure ready for worker integration

### Phase 3: Advanced Features (Future)
- 🔮 PII redaction middleware
- 🔮 Guardrails validation
- 🔮 Request/response logging
- 🔮 Cost tracking

---

## 📐 Architecture Decisions

### ✅ Confirmed Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Model Status (API-based)** | `'active'` immediately | No validation at creation, lazy validation at inference time |
| **Deployment Schema** | Reference Model, no duplication | Model is single source of truth for provider config |
| **Deployment Status (API-based)** | `'running'` | Reuse existing enum, no new status needed |
| **Proxy Approach** | Dumb Proxy with path append | Simple, flexible, auto-append path from client request |
| **API Endpoint Storage** | Base URL only | Client appends path like `/v1/chat/completions` |
| **Error Handling** | Transparent (forward as-is) | User sees provider errors directly |
| **PII/Guardrails** | TODO Phase 3 | Focus on core functionality first |

### 🔧 API Endpoint Design

**User Integration Pattern:**

```bash
# Without our system (direct to provider)
POST https://api.openai.com/v1/chat/completions
Headers: Authorization: Bearer sk-...
Body: { model: "gpt-4", messages: [...] }

# With our system (via deployment)
POST https://api.x-or.cloud/aiwm/deployments/:id/inference/v1/chat/completions
Headers: Authorization: Bearer <user-jwt-token>
Body: { messages: [...] }  # model auto-injected

# We auto-append path and inject credentials:
# Request path: /v1/chat/completions
# Target: model.apiEndpoint + /v1/chat/completions
# Headers: model.apiConfig (apiKey, etc.)
```

**Path Mapping Logic:**
```
User request: POST /deployments/:id/inference/v1/chat/completions
Extract path: /v1/chat/completions
Build target: model.apiEndpoint + /v1/chat/completions
Forward with: model.apiConfig credentials
```

---

## 📊 Current State Analysis

### ✅ Already Implemented

1. **Model Schema** ([model.schema.ts](../../services/aiwm/src/modules/model/model.schema.ts))
   - ✅ `deploymentType: 'self-hosted' | 'api-based'`
   - ✅ `provider`, `apiEndpoint`, `modelIdentifier`
   - ✅ `apiConfig: Record<string, string>` for credentials

2. **Deployment Schema** ([deployment.schema.ts](../../services/aiwm/src/modules/deployment/deployment.schema.ts))
   - ✅ Basic fields: `modelId`, `nodeId`, `resourceId`
   - ✅ Status enum
   - ⚠️ Need to add: `requestCount`, `totalTokens`

3. **Proxy Service** ([proxy.service.ts](../../services/aiwm/src/modules/deployment/proxy.service.ts))
   - ✅ HTTP proxy functionality
   - ✅ Error handling
   - ✅ Header sanitization
   - ✅ Currently used for self-hosted deployments

4. **Queue System**
   - ✅ Bull Queue configured
   - ✅ DeploymentProducer with events
   - ⚠️ Processors not implemented yet

### 🔨 Need to Implement

1. **Schema Updates**
   - Add usage tracking fields to Deployment
   - Update DTO validation

2. **Service Layer**
   - Update `DeploymentService.create()` validation
   - Implement `proxyInference()` method
   - Implement provider-specific proxy logic

3. **Controller**
   - Add catch-all inference endpoint
   - Path extraction and forwarding

4. **Documentation**
   - API examples for each provider
   - Integration guide

---

## 🛠️ Implementation Tasks

### Task 1: Schema & DTO Updates

**File:** `services/aiwm/src/modules/deployment/deployment.schema.ts`

**Changes:**
```typescript
@Schema({ timestamps: true })
export class Deployment extends BaseSchema {
  // ... existing fields

  // NEW: Usage tracking
  @Prop({ default: 0 })
  requestCount?: number;

  @Prop({ default: 0 })
  totalTokens?: number;

  @Prop({ default: 0 })
  totalCost?: number; // Optional: for cost tracking

  // TODO Phase 3: PII & Guardrails
  // @Prop()
  // guardrailId?: string;

  // @Prop({ default: true })
  // piiEnabled?: boolean;
}
```

**Index Updates:**
```typescript
DeploymentSchema.index({ modelId: 1, status: 1 });
DeploymentSchema.index({ requestCount: -1 }); // For top deployments query
```

**Status:** 🔲 Not Started

---

### Task 2: Model Service - Status Update

**File:** `services/aiwm/src/modules/model/model.service.ts`

**Changes:**
```typescript
async create(createData: Partial<ModelEntity>, context: RequestContext) {
  // Set initial status based on deploymentType
  if (!createData.status) {
    if (createData.deploymentType === 'self-hosted') {
      createData.status = 'queued'; // Will be downloaded later
    } else if (createData.deploymentType === 'api-based') {
      createData.status = 'active'; // Ready immediately (no pre-validation)
    }
  }

  return super.create(createData, context) as Promise<ModelEntity | null>;
}
```

**Status:** 🔲 Not Started

---

### Task 3: Deployment Service - Create Validation

**File:** `services/aiwm/src/modules/deployment/deployment.service.ts`

**Changes:**
```typescript
async create(createData: Partial<Deployment>, context: RequestContext) {
  const { modelId } = createData;

  // 1. Validate Model exists and is active
  const model = await this.modelModel
    .findById(modelId)
    .where('isDeleted').equals(false)
    .lean()
    .exec();

  if (!model) {
    throw new BadRequestException(`Model with ID ${modelId} not found`);
  }

  if (model.status !== 'active') {
    throw new BadRequestException(
      `Model "${model.name}" must be in 'active' status. Current status: ${model.status}`
    );
  }

  // 2. Type-specific validation
  if (model.deploymentType === 'self-hosted') {
    // Require nodeId + resourceId
    if (!createData.nodeId || !createData.resourceId) {
      throw new BadRequestException(
        'nodeId and resourceId are required for self-hosted deployments'
      );
    }

    // Validate Node and Resource (existing logic)
    const node = await this.nodeModel.findById(createData.nodeId)
      .where('isDeleted').equals(false).lean().exec();
    if (!node) {
      throw new BadRequestException(`Node with ID ${createData.nodeId} not found`);
    }
    if (node.status !== 'online') {
      throw new BadRequestException(
        `Node "${node.name}" must be 'online'. Current status: ${node.status}`
      );
    }

    const resource = await this.resourceModel.findById(createData.resourceId)
      .where('isDeleted').equals(false).lean().exec();
    if (!resource) {
      throw new BadRequestException(`Resource with ID ${createData.resourceId} not found`);
    }
    if (resource.resourceType !== 'inference-container') {
      throw new BadRequestException(
        `Resource "${resource.name}" must be 'inference-container'. Current type: ${resource.resourceType}`
      );
    }

    // Set status = 'queued' (worker will deploy later)
    createData.status = 'queued';

  } else if (model.deploymentType === 'api-based') {
    // No nodeId/resourceId required
    if (createData.nodeId || createData.resourceId) {
      throw new BadRequestException(
        'nodeId and resourceId should not be provided for API-based deployments'
      );
    }

    // Set status = 'running' immediately (no container deployment needed)
    createData.status = 'running';
  }

  // 3. Create deployment
  const deployment = await super.create(createData, context);

  // 4. Emit queue event (for monitoring/logging)
  await this.deploymentProducer.emitDeploymentCreated(deployment);

  return deployment as Deployment;
}
```

**Status:** 🔲 Not Started

---

### Task 4: Deployment Service - Inference Proxy

**File:** `services/aiwm/src/modules/deployment/deployment.service.ts`

**New Methods:**
```typescript
/**
 * Proxy inference request to appropriate endpoint
 * Supports both API-based and self-hosted deployments
 */
async proxyInference(
  deploymentId: string,
  path: string,
  req: Request,
  res: Response,
  context: RequestContext
): Promise<void> {
  // 1. Get deployment
  const deployment = await this.deploymentModel
    .findById(deploymentId)
    .where('isDeleted').equals(false)
    .lean()
    .exec();

  if (!deployment) {
    throw new NotFoundException(`Deployment with ID ${deploymentId} not found`);
  }

  if (deployment.status !== 'running') {
    throw new BadRequestException(
      `Deployment is not running. Current status: ${deployment.status}`
    );
  }

  // 2. Get model
  const model = await this.modelModel
    .findById(deployment.modelId)
    .where('isDeleted').equals(false)
    .lean()
    .exec();

  if (!model) {
    throw new NotFoundException(`Model not found for deployment`);
  }

  // TODO Phase 3: Apply PII redaction
  // const sanitizedBody = await this.piiService.redact(req.body, context);

  // TODO Phase 3: Apply Guardrails validation
  // if (deployment.guardrailId) {
  //   await this.guardrailService.validate(sanitizedBody, deployment.guardrailId, context);
  // }

  // 3. Route based on deployment type
  if (model.deploymentType === 'api-based') {
    await this.proxyToAPIProvider(model, deployment, path, req, res);
  } else if (model.deploymentType === 'self-hosted') {
    await this.proxyToSelfHosted(deployment, path, req, res);
  }
}

/**
 * Proxy to AI Provider (OpenAI, Anthropic, Google, etc.)
 */
private async proxyToAPIProvider(
  model: ModelEntity,
  deployment: Deployment,
  path: string,
  req: Request,
  res: Response
): Promise<void> {
  const { apiEndpoint, apiConfig, modelIdentifier } = model;

  if (!apiEndpoint || !apiConfig) {
    throw new BadRequestException('Model API configuration is incomplete');
  }

  // Build target URL
  const targetUrl = `${apiEndpoint}${path}`;

  this.logger.log(
    `Proxying to API provider: ${model.provider} - ${targetUrl}`
  );

  // Build headers with authentication
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add provider-specific authentication
  if (apiConfig.apiKey) {
    // OpenAI, Google style
    headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
  }
  if (apiConfig['x-api-key']) {
    // Anthropic style
    headers['x-api-key'] = apiConfig['x-api-key'];
  }

  // Add provider-specific headers
  if (apiConfig.organization) {
    headers['OpenAI-Organization'] = apiConfig.organization;
  }
  if (apiConfig['anthropic-version']) {
    headers['anthropic-version'] = apiConfig['anthropic-version'];
  }

  // Add custom headers (prefixed with 'header-')
  Object.keys(apiConfig).forEach(key => {
    if (key.startsWith('header-')) {
      const headerName = key.replace('header-', '');
      headers[headerName] = apiConfig[key];
    }
  });

  // Inject model identifier if not in request body
  let requestBody = req.body;
  if (modelIdentifier && !requestBody.model) {
    requestBody = { ...requestBody, model: modelIdentifier };
  }

  try {
    // Make request to AI provider
    const startTime = Date.now();
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: requestBody,
      headers,
      timeout: 300000, // 5 minutes
      validateStatus: () => true, // Accept all status codes (forward errors)
      maxRedirects: 5,
    });

    const duration = Date.now() - startTime;

    // Log success/failure
    this.logger.log(
      `Provider response: ${response.status} - Duration: ${duration}ms`
    );

    // Update usage stats (async, don't block response)
    this.updateUsageStats(deployment._id, response.data).catch(err => {
      this.logger.error(`Failed to update usage stats: ${err.message}`);
    });

    // Forward response to client
    res.status(response.status);
    res.json(response.data);

  } catch (error: any) {
    this.logger.error(`Provider request failed: ${error.message}`);

    // Forward error from provider (transparent)
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      throw new BadGatewayException('AI provider is unreachable');
    } else if (error.code === 'ETIMEDOUT') {
      throw new GatewayTimeoutException('Request to AI provider timed out');
    } else {
      throw new BadGatewayException('Failed to connect to AI provider');
    }
  }
}

/**
 * Proxy to self-hosted container endpoint
 * TODO Phase 2: Implement with worker integration
 */
private async proxyToSelfHosted(
  deployment: Deployment,
  path: string,
  req: Request,
  res: Response
): Promise<void> {
  // TODO Phase 2: Get container endpoint from Resource + Node
  // const endpoint = await this.getDeploymentEndpoint(deployment._id.toString());
  // const targetUrl = `${endpoint}${path}`;
  // await this.proxyService.proxyRequest(targetUrl, req, res, { timeout: 300000 });

  throw new NotImplementedException(
    'Self-hosted deployment inference is not yet implemented. ' +
    'This will be available in Phase 2 with worker integration.'
  );
}

/**
 * Update deployment usage statistics
 */
private async updateUsageStats(
  deploymentId: ObjectId,
  responseData: any
): Promise<void> {
  const usage = responseData.usage || {};
  const totalTokens = usage.total_tokens || 0;

  await this.deploymentModel.findByIdAndUpdate(deploymentId, {
    $inc: {
      requestCount: 1,
      totalTokens: totalTokens,
    },
  });
}
```

**Status:** 🔲 Not Started

---

### Task 5: Deployment Controller - Inference Endpoint

**File:** `services/aiwm/src/modules/deployment/deployment.controller.ts`

**New Endpoint:**
```typescript
/**
 * Unified inference endpoint for both API-based and self-hosted deployments
 * Extracts path after /inference and forwards to target endpoint
 */
@All(':id/inference/*')
@ApiOperation({
  summary: 'Proxy inference request to deployment endpoint',
  description:
    'Unified endpoint for both API-based and self-hosted deployments.\n\n' +
    '**For API-based deployments:**\n' +
    '- Automatically injects model credentials from deployment config\n' +
    '- Forwards request to AI provider (OpenAI, Anthropic, Google, etc.)\n' +
    '- Path is appended to model.apiEndpoint\n\n' +
    '**For self-hosted deployments:**\n' +
    '- Forwards to container endpoint (vLLM, Triton)\n' +
    '- TODO: Will be implemented in Phase 2\n\n' +
    '**Usage Examples:**\n' +
    '```bash\n' +
    '# OpenAI-style chat completion\n' +
    'POST /deployments/{id}/inference/v1/chat/completions\n' +
    'Body: {\n' +
    '  "messages": [{"role": "user", "content": "Hello"}],\n' +
    '  "temperature": 0.7\n' +
    '}\n\n' +
    '# Anthropic-style messages\n' +
    'POST /deployments/{id}/inference/v1/messages\n' +
    'Body: {\n' +
    '  "messages": [{"role": "user", "content": "Hello"}],\n' +
    '  "max_tokens": 1024\n' +
    '}\n' +
    '```\n\n' +
    '**Note:** Request body format depends on the target AI provider.',
})
@ApiResponse({ status: 200, description: 'Inference completed successfully' })
@ApiResponse({ status: 400, description: 'Invalid request or deployment not ready' })
@ApiResponse({ status: 404, description: 'Deployment not found' })
@ApiResponse({ status: 502, description: 'AI provider unreachable' })
@ApiResponse({ status: 504, description: 'Request timeout' })
async proxyInference(
  @Param('id') id: string,
  @Req() req: Request,
  @Res() res: Response,
  @CurrentUser() context: RequestContext,
) {
  // Extract path after /inference
  const basePath = `/deployments/${id}/inference`;
  const originalUrl = req.originalUrl || req.url;
  const pathIndex = originalUrl.indexOf(basePath);

  if (pathIndex === -1) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Failed to extract target path',
      error: 'Internal Server Error',
    });
  }

  const targetPath = originalUrl.substring(pathIndex + basePath.length);

  // Proxy request
  try {
    await this.deploymentService.proxyInference(id, targetPath, req, res, context);
  } catch (error: any) {
    // Handle NestJS exceptions
    if (!res.headersSent) {
      const status = error.status || 500;
      res.status(status).json({
        statusCode: status,
        message: error.message || 'Internal server error',
        error: error.name || 'Error',
      });
    }
  }
}
```

**Update existing proxy endpoint:**
```typescript
// Rename to avoid confusion
@All(':id/proxy/*')
@ApiOperation({
  summary: '[Advanced] Direct proxy to self-hosted container',
  description:
    'For advanced users who need direct access to container endpoints. ' +
    'Use /inference endpoint for standard inference requests.\n\n' +
    'This endpoint is only available for self-hosted deployments.'
})
async proxyDirect(
  @Param('id') id: string,
  @Req() req: Request,
  @Res() res: Response,
  @CurrentUser() context: RequestContext,
) {
  // Add validation: only allow self-hosted deployments
  const deployment = await this.deploymentService.findById(id as any, context);
  const model = await this.modelModel.findById(deployment.modelId);

  if (model.deploymentType !== 'self-hosted') {
    return res.status(400).json({
      statusCode: 400,
      message: 'Direct proxy is only available for self-hosted deployments. Use /inference endpoint instead.',
      error: 'Bad Request',
    });
  }

  // Existing proxy logic...
}
```

**Status:** 🔲 Not Started

---

### Task 6: Update Model DTO - API Config Examples

**File:** `services/aiwm/src/modules/model/model.dto.ts`

**Updates:**
```typescript
@ApiPropertyOptional({
  description:
    'API endpoint base URL (required if deploymentType=api-based).\n\n' +
    'Provide base URL without specific paths. Paths will be appended by clients.\n\n' +
    '**Examples by Provider:**\n' +
    '- OpenAI: `https://api.openai.com`\n' +
    '- Anthropic: `https://api.anthropic.com`\n' +
    '- Google: `https://generativelanguage.googleapis.com`\n' +
    '- Azure OpenAI: `https://{resource}.openai.azure.com`\n\n' +
    '**Client Usage:**\n' +
    '```\n' +
    'POST /deployments/{id}/inference/v1/chat/completions\n' +
    '→ Proxies to: {apiEndpoint}/v1/chat/completions\n' +
    '```',
  example: 'https://api.openai.com',
})
@ValidateIf((o) => o.deploymentType === 'api-based')
@IsString()
apiEndpoint?: string;

@ApiPropertyOptional({
  description:
    'API authentication and configuration (required if deploymentType=api-based).\n\n' +
    '**Standard Keys:**\n' +
    '- `apiKey`: API key for Bearer authentication (OpenAI, Google)\n' +
    '- `x-api-key`: API key for x-api-key header (Anthropic)\n' +
    '- `organization`: Organization ID (OpenAI)\n' +
    '- `anthropic-version`: API version (Anthropic)\n\n' +
    '**Custom Headers:**\n' +
    'Prefix with `header-` to add custom headers:\n' +
    '- `header-X-Custom`: Adds `X-Custom` header\n\n' +
    '**Examples:**\n' +
    '```json\n' +
    '// OpenAI\n' +
    '{\n' +
    '  "apiKey": "sk-proj-...",\n' +
    '  "organization": "org-..."\n' +
    '}\n\n' +
    '// Anthropic\n' +
    '{\n' +
    '  "x-api-key": "sk-ant-...",\n' +
    '  "anthropic-version": "2023-06-01"\n' +
    '}\n\n' +
    '// Google\n' +
    '{\n' +
    '  "apiKey": "AIza..."\n' +
    '}\n' +
    '```',
  example: {
    apiKey: 'sk-proj-...',
    organization: 'org-...',
  },
})
@ValidateIf((o) => o.deploymentType === 'api-based')
@IsObject()
apiConfig?: Record<string, string>;
```

**Status:** 🔲 Not Started

---

### Task 7: Documentation - Integration Guide

**File:** `docs/aiwm/API-DEPLOYMENT-INFERENCE.md`

**Content:** Complete integration examples for each provider (OpenAI, Anthropic, Google)

**Status:** 🔲 Not Started

---

## 📝 Provider Integration Examples

### OpenAI Integration

**1. Create API-based Model:**
```bash
POST /models
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "GPT-4 Turbo",
  "type": "llm",
  "description": "OpenAI GPT-4 Turbo with 128K context",
  "deploymentType": "api-based",
  "provider": "openai",
  "apiEndpoint": "https://api.openai.com",
  "modelIdentifier": "gpt-4-turbo-2024-11-20",
  "apiConfig": {
    "apiKey": "sk-proj-...",
    "organization": "org-..."
  },
  "scope": "org"
}
```

**2. Create Deployment:**
```bash
POST /deployments
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "GPT-4 Production",
  "description": "Production deployment for GPT-4 Turbo",
  "modelId": "67a1b2c3d4e5f6g7h8i9j0k1"
}

# Response:
{
  "_id": "67a1b2c3d4e5f6g7h8i9j0k2",
  "name": "GPT-4 Production",
  "modelId": "67a1b2c3d4e5f6g7h8i9j0k1",
  "status": "running",  // Ready immediately!
  "requestCount": 0,
  "totalTokens": 0,
  "createdAt": "2025-01-20T10:00:00.000Z",
  ...
}
```

**3. Send Inference Request:**
```bash
POST /deployments/67a1b2c3d4e5f6g7h8i9j0k2/inference/v1/chat/completions
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 150
}

# Response (from OpenAI):
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4-turbo-2024-11-20",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The capital of France is Paris."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 8,
    "total_tokens": 33
  }
}
```

**What Happens Behind the Scenes:**
```
1. Client → POST /deployments/:id/inference/v1/chat/completions
2. Extract path: /v1/chat/completions
3. Get model config:
   - apiEndpoint = "https://api.openai.com"
   - apiConfig = { apiKey: "sk-proj-...", organization: "org-..." }
4. Build target: https://api.openai.com/v1/chat/completions
5. Inject headers:
   - Authorization: Bearer sk-proj-...
   - OpenAI-Organization: org-...
6. Inject model: "model": "gpt-4-turbo-2024-11-20"
7. Forward request → OpenAI
8. Update stats: requestCount++, totalTokens += 33
9. Return response to client (transparent)
```

---

### Anthropic Integration

**1. Create API-based Model:**
```bash
POST /models
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Claude 3.5 Sonnet",
  "type": "llm",
  "description": "Anthropic Claude 3.5 Sonnet",
  "deploymentType": "api-based",
  "provider": "anthropic",
  "apiEndpoint": "https://api.anthropic.com",
  "modelIdentifier": "claude-3-5-sonnet-20241022",
  "apiConfig": {
    "x-api-key": "sk-ant-...",
    "anthropic-version": "2023-06-01"
  },
  "scope": "org"
}
```

**2. Create Deployment:**
```bash
POST /deployments
{
  "name": "Claude Production",
  "description": "Production deployment for Claude 3.5",
  "modelId": "67a1b2c3d4e5f6g7h8i9j0k3"
}
```

**3. Send Inference Request:**
```bash
POST /deployments/:id/inference/v1/messages
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ],
  "max_tokens": 1024
}

# Response (from Anthropic):
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "The capital of France is Paris."
    }
  ],
  "model": "claude-3-5-sonnet-20241022",
  "usage": {
    "input_tokens": 15,
    "output_tokens": 8
  }
}
```

---

### Google AI Integration

**1. Create API-based Model:**
```bash
POST /models
{
  "name": "Gemini Pro",
  "type": "llm",
  "description": "Google Gemini Pro",
  "deploymentType": "api-based",
  "provider": "google",
  "apiEndpoint": "https://generativelanguage.googleapis.com",
  "modelIdentifier": "gemini-pro",
  "apiConfig": {
    "apiKey": "AIza..."
  },
  "scope": "org"
}
```

**2. Send Inference Request:**
```bash
POST /deployments/:id/inference/v1beta/models/gemini-pro:generateContent
{
  "contents": [
    {
      "parts": [
        {
          "text": "What is the capital of France?"
        }
      ]
    }
  ]
}
```

---

## 🧪 Testing Strategy

### Manual Testing Checklist

#### ✅ Model Creation
- [ ] Create API-based model (OpenAI) - verify status='active'
- [ ] Create API-based model (Anthropic) - verify status='active'
- [ ] Create API-based model (Google) - verify status='active'
- [ ] Try creating with missing apiConfig - should fail validation
- [ ] Try creating with missing apiEndpoint - should fail validation

#### ✅ Deployment Creation
- [ ] Create deployment for API-based model - verify status='running'
- [ ] Try creating with nodeId for API-based - should fail
- [ ] Try creating for inactive model - should fail
- [ ] Try creating for non-existent model - should fail

#### ✅ Inference Requests
- [ ] OpenAI chat completion - verify success response
- [ ] Anthropic messages - verify success response
- [ ] Google generateContent - verify success response
- [ ] Verify usage stats updated (requestCount++, totalTokens)
- [ ] Check deployment stats after 5 requests

#### ✅ Error Handling
- [ ] Invalid API key → verify provider error forwarded (401)
- [ ] Deployment not running → verify 400 error
- [ ] Deployment not found → verify 404 error
- [ ] Malformed request body → verify provider error forwarded
- [ ] Missing model field → verify auto-injected

#### ✅ Edge Cases
- [ ] Very long conversation history (> 100 messages)
- [ ] Request with streaming enabled (if supported)
- [ ] Concurrent requests (10+ simultaneous)
- [ ] Provider rate limiting response

---

## 📊 Success Metrics

### MVP Completion Criteria

- ✅ API-based models can be created with status='active'
- ✅ Deployments created with status='running' immediately
- ✅ Inference requests successfully proxied to 3 providers
- ✅ Usage stats (requestCount, totalTokens) tracked correctly
- ✅ Provider errors forwarded transparently
- ✅ Self-hosted deployments return NotImplementedException
- ✅ Swagger documentation complete with examples
- ✅ Manual testing passed for all scenarios

### Performance Targets

- **Inference latency overhead:** < 100ms (proxy processing time)
- **Concurrent requests:** Support > 100 req/s
- **Usage stats update:** Non-blocking (async)
- **Error rate:** < 0.1% for valid requests

---

## 🚀 Implementation Timeline

### Day 1: Schema & Service Foundation (6 hours)
- ✅ **Task 1:** Schema & DTO updates (2h)
  - Update deployment.schema.ts
  - Update deployment.dto.ts
  - Add indexes
- ✅ **Task 2:** Model service status update (1h)
  - Update model.service.ts create method
- ✅ **Task 3:** Deployment create validation (2h)
  - Update deployment.service.ts create method
  - Add type-specific validation
- ✅ **Build & Test** (1h)
  - Fix compilation errors
  - Test CRUD operations

### Day 2: Inference Implementation (7 hours)
- ✅ **Task 4:** Deployment service inference proxy (4h)
  - Implement proxyInference method
  - Implement proxyToAPIProvider
  - Implement updateUsageStats
  - Add TODO for self-hosted
- ✅ **Task 5:** Controller endpoint (2h)
  - Add catch-all inference endpoint
  - Update existing proxy endpoint
- ✅ **Build & Test** (1h)
  - Test with mock providers
  - Debug issues

### Day 3: Documentation & Testing (7 hours)
- ✅ **Task 6:** DTO examples (1h)
  - Update model.dto.ts with detailed examples
- ✅ **Task 7:** Integration guide (2h)
  - Write API-DEPLOYMENT-INFERENCE.md
  - Add curl examples for each provider
- ✅ **Manual Testing** (3h)
  - Test OpenAI integration
  - Test Anthropic integration
  - Test Google integration
  - Test error cases
- ✅ **Bug Fixes & Refinements** (1h)
  - Fix issues found during testing
  - Performance optimization

---

## 📝 Notes & Decisions Log

### 2025-01-20: Initial Planning
- **Decision:** Use "Dumb Proxy" approach - simple path append
- **Decision:** API-based models get status='active' immediately
- **Decision:** API-based deployments get status='running' immediately
- **Decision:** Store base URL in apiEndpoint, client appends path
- **Decision:** Forward provider errors as-is (transparent)
- **Decision:** PII/Guardrails deferred to Phase 3
- **Decision:** Self-hosted as placeholder with NotImplementedException
- **Decision:** Support OpenAI, Anthropic, Google in MVP

### Key Design Principles
1. **KISS:** Keep it simple, don't over-engineer
2. **User Control:** User provides correct format for each provider
3. **Transparency:** Forward provider errors as-is
4. **Future-Ready:** Structure supports Phase 2/3 enhancements

---

## 🔗 Related Documentation

- [Model API Docs](./API-MODEL.md)
- [Deployment API Docs](./API-DEPLOYMENT.md)
- [Kaisar AI Ops Overview](../KAISAR-AI-OPS-OVERVIEW.md)
- [AIWM Service README](../../services/aiwm/README.md)

---

## ✅ Completion Checklist

### Phase 1: API-based Deployments (MVP)
- [ ] Task 1: Schema & DTO updates
- [ ] Task 2: Model service status update
- [ ] Task 3: Deployment create validation
- [ ] Task 4: Deployment service inference proxy
- [ ] Task 5: Controller inference endpoint
- [ ] Task 6: DTO examples update
- [ ] Task 7: Integration guide documentation
- [ ] Build successful (no errors)
- [ ] Manual testing - OpenAI
- [ ] Manual testing - Anthropic
- [ ] Manual testing - Google
- [ ] Manual testing - Error cases
- [ ] Swagger documentation verified

### Phase 2: Self-hosted (Future)
- [ ] Worker implementation for model download
- [ ] Worker implementation for container deployment
- [ ] Self-hosted inference proxy implementation
- [ ] Container health monitoring
- [ ] Remove NotImplementedException

### Phase 3: Advanced Features (Future)
- [ ] PII redaction middleware
- [ ] Guardrails validation middleware
- [ ] Request/response logging to Execution module
- [ ] Cost calculation and tracking
- [ ] Rate limiting per deployment
- [ ] Analytics dashboard integration

---

**Status:** 🟡 Ready for Implementation

**Last Updated:** 2025-01-20

**Owner:** Backend Dev Team

**Next Step:** Start Task 1 - Schema & DTO Updates
