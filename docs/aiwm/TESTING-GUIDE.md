# Deployment Inference API - Manual Testing Guide

## Overview

This guide provides step-by-step curl commands for manually testing the deployment inference API with API-based models.

**Testing Environment:**
- Base URL: `http://localhost:3003` (development)
- IAM URL: `http://localhost:3000` (authentication)
- Requires: IAM service running, AIWM service running, MongoDB accessible

---

## Prerequisites

### 1. Environment Setup

Ensure services are running:

```bash
# Terminal 1: Start IAM service
npx nx serve iam

# Terminal 2: Start AIWM service
npx nx serve aiwm
```

### 2. Get Authentication Token

```bash
# Login to IAM service
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "username",
    "password": "..."
  }'
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "691eba08517f917943ae1fa1",
    "username": "username",
    "status": "active",
    "roles": ["organization.owner"],
    "orgId": "691eb9e6517f917943ae1f9d"
  }
}
```

**Export Token:**
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Test Scenario 1: OpenAI Integration

### Step 1.1: Create OpenAI Model

```bash
curl -X POST http://localhost:3003/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4 Turbo",
    "type": "llm",
    "description": "OpenAI GPT-4 Turbo with 128K context window",
    "deploymentType": "api-based",
    "provider": "openai",
    "apiEndpoint": "https://api.openai.com",
    "modelIdentifier": "gpt-4-turbo-2024-11-20",
    "apiConfig": {
      "apiKey": "sk-proj-YOUR_OPENAI_API_KEY_HERE",
      "organization": "org-YOUR_ORG_ID_HERE"
    },
    "scope": "org"
  }'
```

**Expected Response:**
```json
{
  "_id": "67a1b2c3d4e5f6g7h8i9j0k1",
  "name": "GPT-4 Turbo",
  "type": "llm",
  "description": "OpenAI GPT-4 Turbo with 128K context window",
  "deploymentType": "api-based",
  "provider": "openai",
  "status": "active",
  "apiEndpoint": "https://api.openai.com",
  "modelIdentifier": "gpt-4-turbo-2024-11-20",
  "scope": "org",
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z"
}
```

**Save Model ID:**
```bash
export MODEL_ID="67a1b2c3d4e5f6g7h8i9j0k1"
```

### Step 1.2: Create Deployment

```bash
curl -X POST http://localhost:3003/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"GPT-4 Production\",
    \"description\": \"Production deployment for GPT-4 Turbo\",
    \"modelId\": \"$MODEL_ID\"
  }"
```

**Expected Response:**
```json
{
  "_id": "67a1b2c3d4e5f6g7h8i9j0k2",
  "name": "GPT-4 Production",
  "description": "Production deployment for GPT-4 Turbo",
  "modelId": "67a1b2c3d4e5f6g7h8i9j0k1",
  "status": "running",
  "requestCount": 0,
  "totalTokens": 0,
  "totalCost": 0,
  "createdAt": "2025-01-20T10:35:00.000Z",
  "updatedAt": "2025-01-20T10:35:00.000Z"
}
```

**Save Deployment ID:**
```bash
export DEPLOYMENT_ID="67a1b2c3d4e5f6g7h8i9j0k2"
```

### Step 1.3: Send Chat Completion Request

```bash
curl -X POST http://localhost:3003/deployments/$DEPLOYMENT_ID/inference/v1/chat/completions \
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
```

**Expected Response (from OpenAI):**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1705752000,
  "model": "gpt-4-turbo-2024-11-20",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The capital of France is Paris. It is the largest city in France and serves as the country's political, economic, and cultural center."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 28,
    "total_tokens": 53
  }
}
```

### Step 1.4: Verify Usage Tracking

```bash
curl -X GET http://localhost:3003/deployments/$DEPLOYMENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (note updated counters):**
```json
{
  "_id": "67a1b2c3d4e5f6g7h8i9j0k2",
  "name": "GPT-4 Production",
  "status": "running",
  "requestCount": 1,
  "totalTokens": 53,
  "totalCost": 0,
  ...
}
```

---

## Test Scenario 2: Anthropic Integration

### Step 2.1: Create Anthropic Model

```bash
curl -X POST http://localhost:3003/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Claude 3.5 Sonnet",
    "type": "llm",
    "description": "Anthropic Claude 3.5 Sonnet - Balanced intelligence and speed",
    "deploymentType": "api-based",
    "provider": "anthropic",
    "apiEndpoint": "https://api.anthropic.com",
    "modelIdentifier": "claude-3-5-sonnet-20241022",
    "apiConfig": {
      "x-api-key": "sk-ant-YOUR_ANTHROPIC_API_KEY_HERE",
      "anthropic-version": "2023-06-01"
    },
    "scope": "org"
  }'
```

**Expected Response:**
```json
{
  "_id": "67a1b2c3d4e5f6g7h8i9j0k3",
  "name": "Claude 3.5 Sonnet",
  "type": "llm",
  "deploymentType": "api-based",
  "provider": "anthropic",
  "status": "active",
  ...
}
```

**Save Model ID:**
```bash
export CLAUDE_MODEL_ID="67a1b2c3d4e5f6g7h8i9j0k3"
```

### Step 2.2: Create Deployment

```bash
curl -X POST http://localhost:3003/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Claude Production\",
    \"description\": \"Production deployment for Claude 3.5 Sonnet\",
    \"modelId\": \"$CLAUDE_MODEL_ID\"
  }"
```

**Save Deployment ID:**
```bash
export CLAUDE_DEPLOYMENT_ID="67a1b2c3d4e5f6g7h8i9j0k4"
```

### Step 2.3: Send Messages Request

```bash
curl -X POST http://localhost:3003/deployments/$CLAUDE_DEPLOYMENT_ID/inference/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {
        "role": "user",
        "content": "What is the capital of France?"
      }
    ],
    "max_tokens": 1024
  }'
```

**Expected Response (from Anthropic):**
```json
{
  "id": "msg_abc123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "The capital of France is Paris."
    }
  ],
  "model": "claude-3-5-sonnet-20241022",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 15,
    "output_tokens": 10
  }
}
```

---

## Test Scenario 3: Google AI Integration

### Step 3.1: Create Google Model

```bash
curl -X POST http://localhost:3003/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gemini Pro",
    "type": "llm",
    "description": "Google Gemini Pro - Multimodal reasoning",
    "deploymentType": "api-based",
    "provider": "google",
    "apiEndpoint": "https://generativelanguage.googleapis.com",
    "modelIdentifier": "gemini-pro",
    "apiConfig": {
      "apiKey": "AIza_YOUR_GOOGLE_API_KEY_HERE"
    },
    "scope": "org"
  }'
```

**Save Model ID:**
```bash
export GEMINI_MODEL_ID="67a1b2c3d4e5f6g7h8i9j0k5"
```

### Step 3.2: Create Deployment

```bash
curl -X POST http://localhost:3003/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Gemini Production\",
    \"description\": \"Production deployment for Gemini Pro\",
    \"modelId\": \"$GEMINI_MODEL_ID\"
  }"
```

**Save Deployment ID:**
```bash
export GEMINI_DEPLOYMENT_ID="67a1b2c3d4e5f6g7h8i9j0k6"
```

### Step 3.3: Send Generate Content Request

```bash
curl -X POST http://localhost:3003/deployments/$GEMINI_DEPLOYMENT_ID/inference/v1beta/models/gemini-pro:generateContent \
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

**Expected Response (from Google):**
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "The capital of France is Paris."
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP"
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 8,
    "candidatesTokenCount": 7,
    "totalTokenCount": 15
  }
}
```

---

## Test Scenario 4: Error Cases

### Case 4.1: Model Not Active

```bash
# First deactivate the model
curl -X POST http://localhost:3003/models/$MODEL_ID/deactivate \
  -H "Authorization: Bearer $TOKEN"

# Try to create deployment with inactive model
curl -X POST http://localhost:3003/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Deployment\",
    \"description\": \"Should fail\",
    \"modelId\": \"$MODEL_ID\"
  }"
```

**Expected Error:**
```json
{
  "statusCode": 400,
  "message": "Model \"GPT-4 Turbo\" must be in 'active' status to create deployment. Current status: inactive",
  "error": "Bad Request"
}
```

### Case 4.2: Deployment Not Running

```bash
# First stop the deployment
curl -X POST http://localhost:3003/deployments/$DEPLOYMENT_ID/stop \
  -H "Authorization: Bearer $TOKEN"

# Try to send inference request
curl -X POST http://localhost:3003/deployments/$DEPLOYMENT_ID/inference/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Expected Error:**
```json
{
  "statusCode": 400,
  "message": "Deployment is not running. Current status: stopped",
  "error": "Bad Request"
}
```

### Case 4.3: Invalid API Key

```bash
# Create model with invalid API key
curl -X POST http://localhost:3003/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Key Test",
    "type": "llm",
    "deploymentType": "api-based",
    "provider": "openai",
    "apiEndpoint": "https://api.openai.com",
    "modelIdentifier": "gpt-3.5-turbo",
    "apiConfig": {
      "apiKey": "sk-invalid-key-123"
    },
    "scope": "org"
  }'

# Create deployment and try inference
# (assuming MODEL_ID_INVALID and DEPLOYMENT_ID_INVALID are set)

curl -X POST http://localhost:3003/deployments/$DEPLOYMENT_ID_INVALID/inference/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Test"}]
  }'
```

**Expected Error (forwarded from OpenAI):**
```json
{
  "error": {
    "message": "Incorrect API key provided: sk-inval***key-123. You can find your API key at https://platform.openai.com/account/api-keys.",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_api_key"
  }
}
```

### Case 4.4: Wrong Deployment Type

```bash
# Try to create API-based deployment with nodeId/resourceId
curl -X POST http://localhost:3003/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Wrong Type Test\",
    \"description\": \"Should fail\",
    \"modelId\": \"$MODEL_ID\",
    \"nodeId\": \"some-node-id\",
    \"resourceId\": \"some-resource-id\"
  }"
```

**Expected Error:**
```json
{
  "statusCode": 400,
  "message": "nodeId and resourceId should not be provided for API-based deployments",
  "error": "Bad Request"
}
```

---

## Test Scenario 5: List and Query Operations

### Step 5.1: List All Models

```bash
curl -X GET "http://localhost:3003/models?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "data": [
    {
      "_id": "67a1b2c3d4e5f6g7h8i9j0k1",
      "name": "GPT-4 Turbo",
      "status": "active",
      "deploymentType": "api-based",
      "provider": "openai",
      ...
    },
    {
      "_id": "67a1b2c3d4e5f6g7h8i9j0k3",
      "name": "Claude 3.5 Sonnet",
      "status": "active",
      "deploymentType": "api-based",
      "provider": "anthropic",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  },
  "statistics": {
    "total": 2,
    "byStatus": {
      "active": 2
    },
    "byType": {}
  }
}
```

### Step 5.2: Filter Models by Provider

```bash
curl -X GET "http://localhost:3003/models?filter[provider]=openai" \
  -H "Authorization: Bearer $TOKEN"
```

### Step 5.3: List All Deployments

```bash
curl -X GET "http://localhost:3003/deployments?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "data": [
    {
      "_id": "67a1b2c3d4e5f6g7h8i9j0k2",
      "name": "GPT-4 Production",
      "modelId": "67a1b2c3d4e5f6g7h8i9j0k1",
      "status": "running",
      "requestCount": 5,
      "totalTokens": 250,
      "totalCost": 0,
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "statistics": {
    "total": 1,
    "byStatus": {
      "running": 1
    }
  }
}
```

### Step 5.4: Get Specific Deployment

```bash
curl -X GET http://localhost:3003/deployments/$DEPLOYMENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Test Scenario 6: Multiple Requests (Load Testing)

### Step 6.1: Send Multiple Inference Requests

```bash
# Send 5 requests in a loop
for i in {1..5}; do
  echo "Request $i:"
  curl -X POST http://localhost:3003/deployments/$DEPLOYMENT_ID/inference/v1/chat/completions \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "messages": [
        {"role": "user", "content": "Count to '$i'"}
      ],
      "temperature": 0.7,
      "max_tokens": 50
    }' | jq '.usage'
  echo ""
done
```

### Step 6.2: Verify Aggregated Usage

```bash
curl -X GET http://localhost:3003/deployments/$DEPLOYMENT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '{requestCount, totalTokens, totalCost}'
```

---

## Test Scenario 7: Custom Headers

### Step 7.1: Create Model with Custom Headers

```bash
curl -X POST http://localhost:3003/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4 with Custom Headers",
    "type": "llm",
    "deploymentType": "api-based",
    "provider": "openai",
    "apiEndpoint": "https://api.openai.com",
    "modelIdentifier": "gpt-4-turbo",
    "apiConfig": {
      "apiKey": "sk-proj-YOUR_KEY",
      "header-X-Custom-App-ID": "my-app-12345",
      "header-X-Request-Source": "test-suite"
    },
    "scope": "org"
  }'
```

These custom headers will be automatically forwarded to OpenAI API with every request.

---

## Verification Checklist

After running tests, verify:

- [ ] Models created with `status: "active"` for API-based
- [ ] Deployments created with `status: "running"` for API-based models
- [ ] Inference requests return valid responses from providers
- [ ] `requestCount` increments after each inference request
- [ ] `totalTokens` increments with usage data from providers
- [ ] Error responses are properly forwarded from providers
- [ ] Validation errors prevent invalid operations
- [ ] List endpoints return correct pagination and statistics

---

## Troubleshooting

### Issue: "Unauthorized" (401)

**Cause:** Token expired or invalid

**Solution:**
```bash
# Get fresh token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "username", "password": "..."}'

# Update TOKEN variable
export TOKEN="new_token_here"
```

### Issue: Connection Refused

**Cause:** Services not running

**Solution:**
```bash
# Check if services are running
lsof -i :3000  # IAM
lsof -i :3003  # AIWM

# Start services if needed
npx nx serve iam
npx nx serve aiwm
```

### Issue: Model Creation Returns 400

**Cause:** Missing required fields or validation errors

**Solution:** Check error message and ensure all required fields are provided:
- `name`, `type`, `deploymentType`, `provider` are required
- `apiEndpoint` required for api-based
- `apiConfig` must contain valid provider credentials

---

## Quick Test Script

Save this as `test-inference.sh`:

```bash
#!/bin/bash

# Configuration
IAM_URL="http://localhost:3000"
AIWM_URL="http://localhost:3003"
USERNAME="username"
PASSWORD="..."
OPENAI_KEY="sk-proj-YOUR_KEY_HERE"

# Get token
echo "=== Getting Authentication Token ==="
TOKEN=$(curl -s -X POST $IAM_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" | jq -r '.accessToken')

echo "Token: ${TOKEN:0:50}..."

# Create model
echo -e "\n=== Creating Model ==="
MODEL_ID=$(curl -s -X POST $AIWM_URL/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test GPT-4\",
    \"type\": \"llm\",
    \"deploymentType\": \"api-based\",
    \"provider\": \"openai\",
    \"apiEndpoint\": \"https://api.openai.com\",
    \"modelIdentifier\": \"gpt-4-turbo\",
    \"apiConfig\": {\"apiKey\": \"$OPENAI_KEY\"},
    \"scope\": \"org\"
  }" | jq -r '._id')

echo "Model ID: $MODEL_ID"

# Create deployment
echo -e "\n=== Creating Deployment ==="
DEPLOYMENT_ID=$(curl -s -X POST $AIWM_URL/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Deployment\",
    \"description\": \"Auto-test deployment\",
    \"modelId\": \"$MODEL_ID\"
  }" | jq -r '._id')

echo "Deployment ID: $DEPLOYMENT_ID"

# Send inference request
echo -e "\n=== Sending Inference Request ==="
curl -s -X POST $AIWM_URL/deployments/$DEPLOYMENT_ID/inference/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Say hello!"}],
    "max_tokens": 50
  }' | jq '.'

# Check usage stats
echo -e "\n=== Checking Usage Stats ==="
curl -s -X GET $AIWM_URL/deployments/$DEPLOYMENT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '{requestCount, totalTokens}'

echo -e "\n=== Test Complete ==="
```

**Run:**
```bash
chmod +x test-inference.sh
./test-inference.sh
```

---

## Related Documentation

- [Integration Guide](./API-DEPLOYMENT-INFERENCE.md) - Developer integration guide
- [Implementation Plan](./DEPLOYMENT-INFERENCE-PLAN.md) - Technical implementation details
- [Model API](./API-MODEL.md) - Model management endpoints
- [Deployment API](./API-DEPLOYMENT.md) - Deployment management endpoints

---

**Last Updated:** 2025-01-20
