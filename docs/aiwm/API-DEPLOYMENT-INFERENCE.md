# Deployment Inference API - Integration Guide

## Overview

This guide demonstrates how to use the unified deployment inference API to integrate with both API-based and self-hosted AI models.

**Base URL:** `http://localhost:3003` (development) or `https://api.x-or.cloud/aiwm` (production)

**Authentication:** All requests require JWT Bearer token from IAM service

---

## Quick Start

### 1. Get Authentication Token

```bash
# Login to get JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "username",
    "password": "..."
  }'

# Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}

# Export token for subsequent requests
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Create API-based Model

```bash
curl -X POST http://localhost:3003/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4 Turbo",
    "type": "llm",
    "description": "OpenAI GPT-4 Turbo with 128K context",
    "deploymentType": "api-based",
    "provider": "openai",
    "apiEndpoint": "https://api.openai.com",
    "modelIdentifier": "gpt-4-turbo-2024-11-20",
    "apiConfig": {
      "apiKey": "sk-proj-YOUR_OPENAI_API_KEY",
      "organization": "org-YOUR_ORG_ID"
    },
    "scope": "org"
  }'

# Response:
{
  "_id": "67a1b2c3d4e5f6g7h8i9j0k1",
  "name": "GPT-4 Turbo",
  "status": "active",  // Ready immediately!
  ...
}
```

### 3. Create Deployment

```bash
curl -X POST http://localhost:3003/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4 Production",
    "description": "Production deployment for GPT-4 Turbo",
    "modelId": "67a1b2c3d4e5f6g7h8i9j0k1"
  }'

# Response:
{
  "_id": "67a1b2c3d4e5f6g7h8i9j0k2",
  "name": "GPT-4 Production",
  "modelId": "67a1b2c3d4e5f6g7h8i9j0k1",
  "status": "running",  // Ready to handle inference!
  "requestCount": 0,
  "totalTokens": 0,
  ...
}
```

### 4. Send Inference Request

```bash
curl -X POST http://localhost:3003/deployments/67a1b2c3d4e5f6g7h8i9j0k2/inference/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'

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

---

## Provider-Specific Integration

### OpenAI Integration

#### 1. Create Model

```bash
curl -X POST http://localhost:3003/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4 Turbo",
    "type": "llm",
    "description": "OpenAI GPT-4 Turbo",
    "deploymentType": "api-based",
    "provider": "openai",
    "apiEndpoint": "https://api.openai.com",
    "modelIdentifier": "gpt-4-turbo-2024-11-20",
    "apiConfig": {
      "apiKey": "sk-proj-...",
      "organization": "org-..."
    },
    "scope": "org"
  }'
```

#### 2. Create Deployment

```bash
curl -X POST http://localhost:3003/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4 Production",
    "description": "Production deployment",
    "modelId": "MODEL_ID_FROM_STEP_1"
  }'
```

#### 3. Chat Completions

```bash
curl -X POST http://localhost:3003/deployments/DEPLOYMENT_ID/inference/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

#### 4. Embeddings

```bash
curl -X POST http://localhost:3003/deployments/DEPLOYMENT_ID/inference/v1/embeddings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "The quick brown fox",
    "model": "text-embedding-3-small"
  }'
```

---

### Anthropic Integration

#### 1. Create Model

```bash
curl -X POST http://localhost:3003/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

#### 2. Create Deployment

```bash
curl -X POST http://localhost:3003/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Claude Production",
    "description": "Claude 3.5 Sonnet deployment",
    "modelId": "MODEL_ID_FROM_STEP_1"
  }'
```

#### 3. Messages API

```bash
curl -X POST http://localhost:3003/deployments/DEPLOYMENT_ID/inference/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What is the capital of France?"
      }
    ],
    "max_tokens": 1024
  }'
```

---

### Google AI Integration

#### 1. Create Model

```bash
curl -X POST http://localhost:3003/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

#### 2. Create Deployment

```bash
curl -X POST http://localhost:3003/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gemini Production",
    "description": "Gemini Pro deployment",
    "modelId": "MODEL_ID_FROM_STEP_1"
  }'
```

#### 3. Generate Content

```bash
curl -X POST http://localhost:3003/deployments/DEPLOYMENT_ID/inference/v1beta/models/gemini-pro:generateContent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "What is the capital of France?"
          }
        ]
      }
    ]
  }'
```

---

## Usage Tracking

### Get Deployment Statistics

```bash
curl -X GET http://localhost:3003/deployments/DEPLOYMENT_ID \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "_id": "...",
  "name": "GPT-4 Production",
  "status": "running",
  "requestCount": 42,      // Total requests
  "totalTokens": 15234,    // Total tokens used
  "totalCost": 0,          // Reserved for future
  ...
}
```

### List All Deployments with Stats

```bash
curl -X GET "http://localhost:3003/deployments?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "data": [
    {
      "_id": "...",
      "name": "GPT-4 Production",
      "requestCount": 42,
      "totalTokens": 15234,
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3
  },
  "statistics": {
    "total": 3,
    "byStatus": {
      "running": 2,
      "stopped": 1
    }
  }
}
```

---

## Error Handling

### Common Errors

#### 1. Model Not Active

```bash
# Request:
curl -X POST http://localhost:3003/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"modelId": "INACTIVE_MODEL_ID", ...}'

# Response:
{
  "statusCode": 400,
  "message": "Model \"GPT-4\" must be in 'active' status to create deployment. Current status: inactive",
  "error": "Bad Request"
}
```

#### 2. Deployment Not Running

```bash
# Request:
curl -X POST http://localhost:3003/deployments/STOPPED_DEPLOYMENT/inference/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ ... }'

# Response:
{
  "statusCode": 400,
  "message": "Deployment is not running. Current status: stopped",
  "error": "Bad Request"
}
```

#### 3. Invalid API Key (Provider Error)

```bash
# Request:
curl -X POST http://localhost:3003/deployments/DEPLOYMENT_ID/inference/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ ... }'

# Response (forwarded from OpenAI):
{
  "error": {
    "message": "Incorrect API key provided",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_api_key"
  }
}
```

#### 4. Provider Unreachable

```bash
# Response:
{
  "statusCode": 502,
  "message": "AI provider is unreachable",
  "error": "Bad Gateway"
}
```

#### 5. Request Timeout

```bash
# Response:
{
  "statusCode": 504,
  "message": "Request to AI provider timed out",
  "error": "Gateway Timeout"
}
```

---

## Best Practices

### 1. Model Configuration

**✅ DO:**
- Use descriptive model names that include version info
- Store API keys securely (consider using environment variables)
- Set appropriate `scope` based on access requirements

**❌ DON'T:**
- Hardcode API keys in application code
- Use generic names like "Model 1"
- Share API keys across multiple models unnecessarily

### 2. Deployment Management

**✅ DO:**
- Create separate deployments for different environments (dev, staging, prod)
- Monitor `requestCount` and `totalTokens` regularly
- Use meaningful deployment names and descriptions

**❌ DON'T:**
- Create multiple deployments for the same model without reason
- Delete deployments without stopping them first
- Ignore error messages and status changes

### 3. Inference Requests

**✅ DO:**
- Handle provider-specific response formats appropriately
- Implement retry logic for transient errors (502, 504)
- Monitor token usage to manage costs

**❌ DON'T:**
- Assume all providers use the same request/response format
- Retry on authentication errors (401, 403)
- Send extremely large payloads without chunking

---

## Advanced Usage

### Custom Headers

Add custom headers to provider requests:

```bash
curl -X POST http://localhost:3003/models \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    ...
    "apiConfig": {
      "apiKey": "...",
      "header-X-Custom-ID": "my-app-id",
      "header-X-Request-Source": "mobile-app"
    }
  }'
```

These headers will be automatically added to all requests to the AI provider.

### Multiple Models from Same Provider

You can create multiple models from the same provider with different configurations:

```bash
# GPT-4 Turbo
curl -X POST http://localhost:3003/models \
  -d '{"name": "GPT-4 Turbo", "modelIdentifier": "gpt-4-turbo-2024-11-20", ...}'

# GPT-3.5 Turbo (cost-effective)
curl -X POST http://localhost:3003/models \
  -d '{"name": "GPT-3.5 Turbo", "modelIdentifier": "gpt-3.5-turbo", ...}'
```

Then route different use cases to different deployments based on requirements.

---

## Troubleshooting

### Issue: "Model not found"

**Cause:** Model ID is incorrect or model was soft-deleted

**Solution:**
```bash
# List all models
curl -X GET http://localhost:3003/models \
  -H "Authorization: Bearer $TOKEN"

# Verify model status
curl -X GET http://localhost:3003/models/MODEL_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Issue: "Cannot create deployment for api-based model with nodeId"

**Cause:** Trying to provide `nodeId` or `resourceId` for API-based deployment

**Solution:**
```bash
# ❌ Wrong
curl -X POST http://localhost:3003/deployments \
  -d '{"modelId": "...", "nodeId": "...", "resourceId": "..."}'

# ✅ Correct
curl -X POST http://localhost:3003/deployments \
  -d '{"modelId": "...", "name": "...", "description": "..."}'
```

### Issue: Provider returns 401/403 errors

**Cause:** Invalid API credentials in model configuration

**Solution:**
```bash
# Update model with correct credentials
curl -X PUT http://localhost:3003/models/MODEL_ID \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "apiConfig": {
      "apiKey": "CORRECT_API_KEY",
      ...
    }
  }'
```

---

## API Reference

### Model Endpoints

- `POST /models` - Create model
- `GET /models` - List models with pagination
- `GET /models/:id` - Get model details
- `PUT /models/:id` - Update model
- `DELETE /models/:id` - Soft delete model
- `POST /models/:id/activate` - Activate model
- `POST /models/:id/deactivate` - Deactivate model

### Deployment Endpoints

- `POST /deployments` - Create deployment
- `GET /deployments` - List deployments with pagination
- `GET /deployments/:id` - Get deployment details
- `PUT /deployments/:id` - Update deployment
- `DELETE /deployments/:id` - Soft delete deployment
- `POST /deployments/:id/start` - Start deployment
- `POST /deployments/:id/stop` - Stop deployment
- `POST /deployments/:id/inference/*` - **Unified inference endpoint**

---

## Related Documentation

- [Model API Documentation](./API-MODEL.md)
- [Deployment API Documentation](./API-DEPLOYMENT.md)
- [AIWM Service README](../../services/aiwm/README.md)
- [Kaisar AI Ops Overview](../KAISAR-AI-OPS-OVERVIEW.md)

---

## Support

For issues or questions:
- Check existing documentation
- Review error messages carefully (they contain helpful details)
- Verify API credentials and model configuration
- Check deployment status before sending inference requests

**Last Updated:** 2025-01-20
