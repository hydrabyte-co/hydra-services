# Configuration Management API - Test Examples

**Service:** AIWM
**Port:** 3003
**Base URL:** `http://localhost:3003`
**Auth:** JWT Bearer Token required for CRUD operations

---

## 🔐 Authentication

All CRUD endpoints require JWT authentication. Get a token from IAM service:

```bash
# Login to get token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "username",
    "password": "your-password"
  }' | jq -r '.token')

echo "Token: $TOKEN"
```

---

## 📋 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/configurations` | ✅ | List configs (no values) |
| GET | `/configurations/:key` | ✅ | Get config with value |
| POST | `/configurations` | ✅ | Create/update config |
| PATCH | `/configurations/:key` | ✅ | Update config |
| DELETE | `/configurations/:key` | ✅ | Delete config |
| GET | `/configurations-metadata/all` | ❌ | Get all metadata (public) |
| GET | `/configurations-metadata/:key` | ❌ | Get key metadata (public) |

---

## 1. List Configurations (WITHOUT values)

**Endpoint:** `GET /configurations`

```bash
# List all configurations
curl -X GET "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq

# Filter by active status
curl -X GET "http://localhost:3003/configurations?isActive=true" \
  -H "Authorization: Bearer $TOKEN" | jq

# Pagination
curl -X GET "http://localhost:3003/configurations?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Response:**
```json
{
  "data": [
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d0e",
      "key": "s3.endpoint",
      "isActive": true,
      "metadata": {
        "displayName": "S3 Endpoint",
        "description": "S3-compatible storage endpoint URL",
        "dataType": "url",
        "isRequired": true,
        "example": "https://minio.example.com"
      },
      "notes": "Primary MinIO instance",
      "createdAt": "2025-12-03T10:00:00.000Z",
      "updatedAt": "2025-12-03T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 23
  },
  "statistics": {
    "total": 23,
    "active": 20,
    "inactive": 3
  }
}
```

**Note:** ❌ No "value" field in list response (secure by default)

---

## 2. Get Configuration Detail (WITH value)

**Endpoint:** `GET /configurations/:key`

```bash
# Get S3 endpoint configuration
curl -X GET "http://localhost:3003/configurations/s3.endpoint" \
  -H "Authorization: Bearer $TOKEN" | jq

# Get SMTP configuration
curl -X GET "http://localhost:3003/configurations/smtp.host" \
  -H "Authorization: Bearer $TOKEN" | jq

# Get Discord webhook
curl -X GET "http://localhost:3003/configurations/discord.webhook_url" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Response:**
```json
{
  "_id": "675a1b2c3d4e5f6a7b8c9d0e",
  "key": "s3.endpoint",
  "value": "https://minio.example.com",
  "isActive": true,
  "metadata": {
    "displayName": "S3 Endpoint",
    "description": "S3-compatible storage endpoint URL",
    "dataType": "url",
    "isRequired": true,
    "validation": {
      "pattern": "^https?://.+"
    },
    "example": "https://minio.example.com"
  },
  "notes": "Primary MinIO instance",
  "createdBy": "675a1b2c3d4e5f6a7b8c9d10",
  "updatedBy": "675a1b2c3d4e5f6a7b8c9d10",
  "createdAt": "2025-12-03T10:00:00.000Z",
  "updatedAt": "2025-12-03T10:00:00.000Z"
}
```

**Note:** ✅ Value included in detail response

---

## 3. Create/Update Configuration

**Endpoint:** `POST /configurations`

### 3.1. S3 Configuration

```bash
# Create S3 endpoint
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "s3.endpoint",
    "value": "https://minio.example.com",
    "notes": "Primary MinIO instance for production"
  }' | jq

# Create S3 access key
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "s3.access_key",
    "value": "AKIAIOSFODNN7EXAMPLE"
  }' | jq

# Create S3 secret key
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "s3.secret_key",
    "value": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }' | jq
```

### 3.2. SMTP Configuration

```bash
# Create SMTP host
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "smtp.host",
    "value": "smtp.gmail.com"
  }' | jq

# Create SMTP port
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "smtp.port",
    "value": "587"
  }' | jq

# Create SMTP credentials
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "smtp.user",
    "value": "notifications@example.com"
  }' | jq
```

### 3.3. Discord Configuration

```bash
# Create Discord webhook
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "discord.webhook_url",
    "value": "https://discord.com/api/webhooks/123456789/abcdefghijklmnop",
    "notes": "Production alerts channel"
  }' | jq
```

### 3.4. LLM API Keys

```bash
# Create OpenAI API key
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "llm.openai.api_key",
    "value": "sk-proj-abc123..."
  }' | jq

# Create Anthropic API key
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "llm.anthropic.api_key",
    "value": "sk-ant-api03-xyz789..."
  }' | jq
```

---

## 4. Update Configuration

**Endpoint:** `PATCH /configurations/:key`

```bash
# Update S3 endpoint
curl -X PATCH "http://localhost:3003/configurations/s3.endpoint" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "https://minio-new.example.com",
    "notes": "Migrated to new MinIO cluster"
  }' | jq

# Update configuration status
curl -X PATCH "http://localhost:3003/configurations/discord.webhook_url" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false,
    "notes": "Temporarily disabled for maintenance"
  }' | jq

# Update only notes
curl -X PATCH "http://localhost:3003/configurations/smtp.host" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Updated configuration notes"
  }' | jq
```

---

## 5. Delete Configuration

**Endpoint:** `DELETE /configurations/:key`

```bash
# Delete configuration (soft delete)
curl -X DELETE "http://localhost:3003/configurations/discord.webhook_url" \
  -H "Authorization: Bearer $TOKEN" | jq

# Response
{
  "success": true,
  "message": "Configuration deleted successfully",
  "key": "discord.webhook_url"
}
```

---

## 6. Get All Metadata (Public)

**Endpoint:** `GET /configurations-metadata/all`

```bash
# Get all configuration metadata (no auth required)
curl -X GET "http://localhost:3003/configurations-metadata/all" | jq
```

**Response:**
```json
{
  "data": [
    {
      "key": "s3.endpoint",
      "displayName": "S3 Endpoint",
      "description": "S3-compatible storage endpoint URL",
      "dataType": "url",
      "isRequired": true,
      "validation": {
        "pattern": "^https?://.+"
      },
      "example": "https://minio.example.com"
    },
    {
      "key": "smtp.host",
      "displayName": "SMTP Host",
      "description": "SMTP server hostname",
      "dataType": "string",
      "isRequired": true,
      "example": "smtp.gmail.com"
    }
  ],
  "total": 23
}
```

---

## 7. Get Metadata by Key (Public)

**Endpoint:** `GET /configurations-metadata/:key`

```bash
# Get metadata for S3 endpoint
curl -X GET "http://localhost:3003/configurations-metadata/s3.endpoint" | jq

# Get metadata for SMTP port
curl -X GET "http://localhost:3003/configurations-metadata/smtp.port" | jq
```

**Response:**
```json
{
  "key": "s3.endpoint",
  "displayName": "S3 Endpoint",
  "description": "S3-compatible storage endpoint URL",
  "dataType": "url",
  "isRequired": true,
  "validation": {
    "pattern": "^https?://.+"
  },
  "example": "https://minio.example.com"
}
```

---

## 🧪 Quick Test Script

```bash
#!/bin/bash

# Configuration Management API Test Script

# 1. Get JWT token
echo "1. Getting JWT token..."
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"username","password":"your-password"}' \
  | jq -r '.token')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  exit 1
fi
echo "✅ Token obtained"

# 2. Create S3 configuration
echo -e "\n2. Creating S3 endpoint configuration..."
curl -s -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "s3.endpoint",
    "value": "https://minio.example.com",
    "notes": "Test configuration"
  }' | jq

# 3. List all configurations
echo -e "\n3. Listing all configurations..."
curl -s -X GET "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# 4. Get configuration detail
echo -e "\n4. Getting S3 endpoint detail..."
curl -s -X GET "http://localhost:3003/configurations/s3.endpoint" \
  -H "Authorization: Bearer $TOKEN" | jq '.value'

# 5. Update configuration
echo -e "\n5. Updating S3 endpoint..."
curl -s -X PATCH "http://localhost:3003/configurations/s3.endpoint" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Updated via test script"
  }' | jq '.notes'

# 6. Get metadata (public)
echo -e "\n6. Getting metadata (no auth)..."
curl -s -X GET "http://localhost:3003/configurations-metadata/all" \
  | jq '.total'

echo -e "\n✅ All tests completed!"
```

---

## 📊 Validation Examples

### Valid Configurations

```bash
# Valid URL
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "s3.endpoint",
    "value": "https://minio.example.com"
  }'
# ✅ Success

# Valid email
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "smtp.from_email",
    "value": "noreply@example.com"
  }'
# ✅ Success

# Valid number
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "smtp.port",
    "value": "587"
  }'
# ✅ Success

# Valid boolean
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "s3.use_ssl",
    "value": "true"
  }'
# ✅ Success
```

### Invalid Configurations (Will Fail Validation)

```bash
# Invalid URL
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "s3.endpoint",
    "value": "not-a-valid-url"
  }'
# ❌ Error: Value must be a valid URL

# Invalid email
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "smtp.from_email",
    "value": "invalid-email"
  }'
# ❌ Error: Value must be a valid email

# Invalid number (string)
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "smtp.port",
    "value": "not-a-number"
  }'
# ❌ Error: Value must be a number

# Port out of range
curl -X POST "http://localhost:3003/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "smtp.port",
    "value": "99999"
  }'
# ❌ Error: Value must be at most 65535
```

---

## 🔍 Testing All 23 Config Keys

```bash
# Object Storage (7 keys)
for key in s3.endpoint s3.access_key s3.secret_key s3.bucket.models s3.bucket.logs s3.region s3.use_ssl; do
  echo "Testing: $key"
  curl -s -X GET "http://localhost:3003/configurations-metadata/$key" \
    -H "Authorization: Bearer $TOKEN" | jq '.displayName'
done

# SMTP (7 keys)
for key in smtp.host smtp.port smtp.user smtp.password smtp.from_email smtp.from_name smtp.use_tls; do
  echo "Testing: $key"
  curl -s -X GET "http://localhost:3003/configurations-metadata/$key" \
    -H "Authorization: Bearer $TOKEN" | jq '.displayName'
done

# Discord (3 keys)
for key in discord.webhook_url discord.alert_channel discord.username; do
  echo "Testing: $key"
  curl -s -X GET "http://localhost:3003/configurations-metadata/$key" \
    -H "Authorization: Bearer $TOKEN" | jq '.displayName'
done

# Telegram (3 keys)
for key in telegram.bot_token telegram.chat_id telegram.alert_enabled; do
  echo "Testing: $key"
  curl -s -X GET "http://localhost:3003/configurations-metadata/$key" \
    -H "Authorization: Bearer $TOKEN" | jq '.displayName'
done

# LLM APIs (3 keys)
for key in llm.openai.api_key llm.anthropic.api_key llm.groq.api_key; do
  echo "Testing: $key"
  curl -s -X GET "http://localhost:3003/configurations-metadata/$key" \
    -H "Authorization: Bearer $TOKEN" | jq '.displayName'
done
```

---

## 📝 Notes

**Security:**
- All CRUD endpoints require JWT authentication
- List endpoint returns NO values (metadata only)
- Detail endpoint returns WITH value
- Metadata endpoints are public (no auth needed)

**Validation:**
- Server-side validation against metadata rules
- Type checking (string, number, boolean, url, email)
- Pattern validation (regex)
- Length validation (min/max)
- Range validation (for numbers)

**Caching:**
- ConfigService provides cached access for internal services
- Cache initialized on module startup
- Hot reload available via `reloadKey()` or `reloadCache()`

**Status Codes:**
- `200` - Success (GET, PATCH, DELETE)
- `201` - Created (POST)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found (config key doesn't exist)
