# Configuration Management System - Proposal

**Author:** Backend Dev Team
**Date:** 2025-12-03
**Status:** 📋 Proposal - Awaiting Review

---

## TL;DR - Executive Summary

**Yêu cầu:** Hệ thống quản lý cấu hình tập trung cho AIWM services

**Mục đích:**
- Quản lý các key-value configs cho dịch vụ bên ngoài (Object Storage, SMTP, Webhooks)
- Key và description là predefined enums/constants
- User chỉ nhập values
- Support encrypted storage cho sensitive values (passwords, tokens, secrets)

**Scope:**
- Config CRUD API
- Predefined config keys với descriptions
- Encrypted storage cho sensitive values
- Config validation
- Config history/audit trail
- Service consumer SDK

**Timeline:** 1-2 tuần
**Complexity:** Medium
**LOC Estimate:** ~1500 lines

---

## 1. Current Problem

### Hiện Trạng:
❌ **Configuration Scattered:**
- Environment variables ở nhiều nơi (.env files)
- Hard-coded values trong code
- Không có centralized management
- Khó update configs mà không restart service
- Không có audit trail cho config changes

❌ **Security Issues:**
- Secrets exposed trong environment variables
- Không có encryption cho sensitive data
- Không có access control cho configs

❌ **No Validation:**
- Sai format (VD: SMTP port là string thay vì number)
- Missing required configs
- Invalid values (VD: sai S3 endpoint format)

---

## 2. Proposed Solution

### **Configuration Management Module**

**Core Features:**
1. ✅ Predefined config keys với metadata
2. ✅ Key-value storage với encryption
3. ✅ Validation theo config type
4. ✅ CRUD API với RBAC
5. ✅ Audit trail cho config changes
6. ✅ Service consumer SDK
7. ✅ Config versioning/history
8. ✅ Hot reload (no service restart needed)

---

## 3. Architecture Design

### 3.1. Config Key Registry

**Predefined Config Keys (Enums/Constants):**

```typescript
enum ConfigCategory {
  OBJECT_STORAGE = 'object-storage',
  EMAIL = 'email',
  NOTIFICATION = 'notification',
  AUTHENTICATION = 'authentication',
  MONITORING = 'monitoring',
  INTEGRATION = 'integration',
}

enum ConfigKey {
  // Object Storage (MinIO/S3)
  S3_ENDPOINT = 's3.endpoint',
  S3_ACCESS_KEY = 's3.access_key',
  S3_SECRET_KEY = 's3.secret_key',
  S3_BUCKET_MODELS = 's3.bucket.models',
  S3_BUCKET_LOGS = 's3.bucket.logs',
  S3_REGION = 's3.region',
  S3_USE_SSL = 's3.use_ssl',

  // SMTP Email
  SMTP_HOST = 'smtp.host',
  SMTP_PORT = 'smtp.port',
  SMTP_USER = 'smtp.user',
  SMTP_PASSWORD = 'smtp.password',
  SMTP_FROM_EMAIL = 'smtp.from_email',
  SMTP_FROM_NAME = 'smtp.from_name',
  SMTP_USE_TLS = 'smtp.use_tls',

  // Discord Webhook
  DISCORD_WEBHOOK_URL = 'discord.webhook_url',
  DISCORD_ALERT_CHANNEL = 'discord.alert_channel',
  DISCORD_USERNAME = 'discord.username',

  // Telegram Bot
  TELEGRAM_BOT_TOKEN = 'telegram.bot_token',
  TELEGRAM_CHAT_ID = 'telegram.chat_id',
  TELEGRAM_ALERT_ENABLED = 'telegram.alert_enabled',

  // Slack Webhook
  SLACK_WEBHOOK_URL = 'slack.webhook_url',
  SLACK_CHANNEL = 'slack.channel',
  SLACK_USERNAME = 'slack.username',

  // Generic Webhook
  WEBHOOK_URL = 'webhook.url',
  WEBHOOK_SECRET = 'webhook.secret',
  WEBHOOK_TIMEOUT = 'webhook.timeout',

  // OAuth Providers
  GOOGLE_CLIENT_ID = 'oauth.google.client_id',
  GOOGLE_CLIENT_SECRET = 'oauth.google.client_secret',
  GITHUB_CLIENT_ID = 'oauth.github.client_id',
  GITHUB_CLIENT_SECRET = 'oauth.github.client_secret',

  // Monitoring
  PROMETHEUS_ENDPOINT = 'monitoring.prometheus.endpoint',
  GRAFANA_API_KEY = 'monitoring.grafana.api_key',
  SENTRY_DSN = 'monitoring.sentry.dsn',

  // LLM Providers
  OPENAI_API_KEY = 'llm.openai.api_key',
  ANTHROPIC_API_KEY = 'llm.anthropic.api_key',
  GROQ_API_KEY = 'llm.groq.api_key',
}
```

### 3.2. Config Metadata

**Each config key has metadata:**

```typescript
interface ConfigKeyMetadata {
  key: ConfigKey;
  category: ConfigCategory;
  displayName: string;
  description: string;
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'url' | 'email';
  isSensitive: boolean; // If true, encrypt value
  isRequired: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string; // Regex pattern
    minLength?: number;
    maxLength?: number;
    min?: number; // For numbers
    max?: number;
    enum?: string[]; // Allowed values
  };
  example?: string;
}

// Example metadata definitions
const CONFIG_METADATA: Record<ConfigKey, ConfigKeyMetadata> = {
  [ConfigKey.S3_ENDPOINT]: {
    key: ConfigKey.S3_ENDPOINT,
    category: ConfigCategory.OBJECT_STORAGE,
    displayName: 'S3 Endpoint',
    description: 'S3-compatible storage endpoint URL (MinIO, AWS S3, etc.)',
    dataType: 'url',
    isSensitive: false,
    isRequired: true,
    validation: {
      pattern: '^https?://.+',
    },
    example: 'https://minio.example.com',
  },
  [ConfigKey.S3_SECRET_KEY]: {
    key: ConfigKey.S3_SECRET_KEY,
    category: ConfigCategory.OBJECT_STORAGE,
    displayName: 'S3 Secret Key',
    description: 'S3 secret access key for authentication',
    dataType: 'string',
    isSensitive: true, // ✅ Will be encrypted
    isRequired: true,
    validation: {
      minLength: 16,
    },
    example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  },
  [ConfigKey.SMTP_PORT]: {
    key: ConfigKey.SMTP_PORT,
    category: ConfigCategory.EMAIL,
    displayName: 'SMTP Port',
    description: 'SMTP server port (25, 465 for SSL, 587 for TLS)',
    dataType: 'number',
    isSensitive: false,
    isRequired: true,
    defaultValue: 587,
    validation: {
      min: 1,
      max: 65535,
      enum: ['25', '465', '587', '2525'],
    },
    example: '587',
  },
  [ConfigKey.DISCORD_WEBHOOK_URL]: {
    key: ConfigKey.DISCORD_WEBHOOK_URL,
    category: ConfigCategory.NOTIFICATION,
    displayName: 'Discord Webhook URL',
    description: 'Discord webhook URL for sending alerts and notifications',
    dataType: 'url',
    isSensitive: true, // ✅ Contains token in URL
    isRequired: false,
    validation: {
      pattern: '^https://discord.com/api/webhooks/.+',
    },
    example: 'https://discord.com/api/webhooks/123456789/abcdefg...',
  },
  // ... more metadata definitions
};
```

### 3.3. Database Schema

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@hydrabyte/base';

@Schema({ timestamps: true })
export class Configuration extends BaseSchema {
  @Prop({
    required: true,
    enum: Object.values(ConfigKey),
    unique: true,
    index: true,
  })
  key!: string; // ConfigKey enum value

  @Prop({ required: true })
  value!: string; // Encrypted if isSensitive=true

  @Prop({ required: true, enum: Object.values(ConfigCategory) })
  category!: string;

  @Prop({ default: false })
  isEncrypted!: boolean; // Marks if value is encrypted

  @Prop({ default: false })
  isActive!: boolean; // Enable/disable config

  @Prop()
  lastModifiedBy?: string; // User ID who last modified

  @Prop()
  lastModifiedAt?: Date;

  @Prop()
  notes?: string; // Admin notes for this config

  // BaseSchema provides: owner, createdBy, updatedBy, deletedAt, metadata, timestamps
}

export const ConfigurationSchema = SchemaFactory.createForClass(Configuration);

// Indexes
ConfigurationSchema.index({ key: 1 });
ConfigurationSchema.index({ category: 1 });
ConfigurationSchema.index({ isActive: 1 });
```

### 3.4. Config History Schema

```typescript
@Schema({ timestamps: true })
export class ConfigurationHistory extends BaseSchema {
  @Prop({ required: true })
  configKey!: string; // ConfigKey

  @Prop({ required: true })
  oldValue?: string; // Previous value (encrypted if sensitive)

  @Prop({ required: true })
  newValue!: string; // New value (encrypted if sensitive)

  @Prop({ required: true })
  changedBy!: string; // User ID

  @Prop({ required: true })
  action!: 'create' | 'update' | 'delete' | 'activate' | 'deactivate';

  @Prop()
  reason?: string; // Reason for change

  @Prop()
  ipAddress?: string; // Source IP

  @Prop()
  userAgent?: string; // User agent
}
```

---

## 4. API Design

### 4.1. REST Endpoints

```typescript
// Configuration CRUD
POST   /configurations              // Create config
GET    /configurations              // List configs (values masked if sensitive)
GET    /configurations/:key         // Get config by key
PATCH  /configurations/:key         // Update config value
DELETE /configurations/:key         // Delete config (soft delete)

// Config Management
POST   /configurations/:key/activate    // Activate config
POST   /configurations/:key/deactivate  // Deactivate config
GET    /configurations/:key/history     // Get change history
POST   /configurations/:key/test        // Test config (e.g., test SMTP connection)

// Bulk Operations
GET    /configurations/by-category/:category  // Get all configs in category
POST   /configurations/bulk-update             // Update multiple configs
POST   /configurations/validate                // Validate config set

// Metadata
GET    /configurations/metadata           // Get all config key metadata
GET    /configurations/metadata/:key      // Get metadata for specific key
GET    /configurations/categories         // List all categories
```

### 4.2. Request/Response Examples

#### Create Configuration

```json
POST /configurations
{
  "key": "s3.endpoint",
  "value": "https://minio.example.com",
  "notes": "Primary MinIO instance"
}

// Response:
{
  "_id": "675a1b2c3d4e5f6a7b8c9d0e",
  "key": "s3.endpoint",
  "value": "https://minio.example.com",
  "category": "object-storage",
  "isEncrypted": false,
  "isActive": true,
  "metadata": {
    "displayName": "S3 Endpoint",
    "description": "S3-compatible storage endpoint URL",
    "dataType": "url",
    "isSensitive": false,
    "isRequired": true
  },
  "createdAt": "2025-12-03T12:00:00.000Z",
  "updatedAt": "2025-12-03T12:00:00.000Z"
}
```

#### Create Sensitive Configuration

```json
POST /configurations
{
  "key": "s3.secret_key",
  "value": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}

// Response:
{
  "_id": "675a1b2c3d4e5f6a7b8c9d0f",
  "key": "s3.secret_key",
  "value": "********", // ✅ Masked in response
  "category": "object-storage",
  "isEncrypted": true,
  "isActive": true,
  "metadata": {
    "displayName": "S3 Secret Key",
    "description": "S3 secret access key for authentication",
    "dataType": "string",
    "isSensitive": true,
    "isRequired": true
  },
  "createdAt": "2025-12-03T12:00:00.000Z",
  "updatedAt": "2025-12-03T12:00:00.000Z"
}
```

#### List Configurations

```json
GET /configurations?category=object-storage

// Response:
{
  "data": [
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d0e",
      "key": "s3.endpoint",
      "value": "https://minio.example.com",
      "category": "object-storage",
      "isEncrypted": false,
      "isActive": true
    },
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d0f",
      "key": "s3.secret_key",
      "value": "********", // ✅ Sensitive values masked
      "category": "object-storage",
      "isEncrypted": true,
      "isActive": true
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 2 },
  "statistics": {
    "total": 2,
    "byCategory": {
      "object-storage": 2
    },
    "active": 2,
    "encrypted": 1
  }
}
```

#### Test Configuration

```json
POST /configurations/smtp.host/test

// For SMTP, test sends email
// Response:
{
  "success": true,
  "message": "SMTP connection successful",
  "details": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "testEmailSent": true
  }
}

// For Discord webhook
POST /configurations/discord.webhook_url/test
// Sends test message to Discord

// For S3
POST /configurations/s3.endpoint/test
// Tests bucket connection and lists buckets
```

#### Get Configuration History

```json
GET /configurations/s3.secret_key/history

// Response:
{
  "configKey": "s3.secret_key",
  "history": [
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d10",
      "action": "update",
      "oldValue": "********",
      "newValue": "********",
      "changedBy": "admin@x-or.cloud",
      "reason": "Rotate secret key for security",
      "timestamp": "2025-12-03T12:00:00.000Z",
      "ipAddress": "192.168.1.100"
    },
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d11",
      "action": "create",
      "newValue": "********",
      "changedBy": "admin@x-or.cloud",
      "reason": "Initial setup",
      "timestamp": "2025-12-01T10:00:00.000Z"
    }
  ]
}
```

---

## 5. Service Consumer SDK

### 5.1. ConfigService for Internal Use

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Configuration } from './configuration.schema';
import { ConfigKey } from './enums/config-key.enum';
import * as crypto from 'crypto';

@Injectable()
export class ConfigService {
  private cache: Map<string, any> = new Map();
  private encryptionKey: string;

  constructor(
    @InjectModel(Configuration.name) private configModel: Model<Configuration>
  ) {
    this.encryptionKey = process.env.CONFIG_ENCRYPTION_KEY || 'default-key-change-me';
    this.initializeCache();
  }

  /**
   * Get configuration value by key
   * Returns decrypted value if encrypted
   */
  async get<T = string>(key: ConfigKey): Promise<T | null> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Query from DB
    const config = await this.configModel.findOne({
      key,
      isActive: true,
      deletedAt: null
    });

    if (!config) {
      return null;
    }

    // Decrypt if needed
    const value = config.isEncrypted
      ? this.decrypt(config.value)
      : config.value;

    // Parse based on metadata type
    const parsedValue = this.parseValue(key, value);

    // Cache it
    this.cache.set(key, parsedValue);

    return parsedValue as T;
  }

  /**
   * Get configuration with default fallback
   */
  async getOrDefault<T = string>(key: ConfigKey, defaultValue: T): Promise<T> {
    const value = await this.get<T>(key);
    return value !== null ? value : defaultValue;
  }

  /**
   * Get all configs in a category
   */
  async getByCategory(category: ConfigCategory): Promise<Record<string, any>> {
    const configs = await this.configModel.find({
      category,
      isActive: true,
      deletedAt: null
    });

    const result: Record<string, any> = {};
    for (const config of configs) {
      const value = config.isEncrypted
        ? this.decrypt(config.value)
        : config.value;
      result[config.key] = this.parseValue(config.key, value);
    }

    return result;
  }

  /**
   * Check if required configs are set
   */
  async validateRequiredConfigs(category?: ConfigCategory): Promise<{
    valid: boolean;
    missing: ConfigKey[];
  }> {
    const requiredKeys = this.getRequiredKeys(category);
    const missing: ConfigKey[] = [];

    for (const key of requiredKeys) {
      const value = await this.get(key);
      if (value === null) {
        missing.push(key);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Hot reload cache (called when config changes)
   */
  async reloadCache(key?: ConfigKey): Promise<void> {
    if (key) {
      this.cache.delete(key);
      await this.get(key); // Reload single key
    } else {
      this.cache.clear();
      await this.initializeCache(); // Reload all
    }
  }

  // Private helper methods
  private encrypt(value: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decrypt(encrypted: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private parseValue(key: ConfigKey, value: string): any {
    const metadata = CONFIG_METADATA[key];

    switch (metadata.dataType) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true' || value === '1';
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }

  private async initializeCache(): Promise<void> {
    // Preload commonly used configs
    // ...
  }

  private getRequiredKeys(category?: ConfigCategory): ConfigKey[] {
    return Object.values(ConfigKey).filter(key => {
      const metadata = CONFIG_METADATA[key];
      return metadata.isRequired &&
             (!category || metadata.category === category);
    });
  }
}
```

### 5.2. Usage Examples

```typescript
// In any service
@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  async uploadToS3(file: Buffer) {
    // Get S3 configs
    const endpoint = await this.configService.get(ConfigKey.S3_ENDPOINT);
    const accessKey = await this.configService.get(ConfigKey.S3_ACCESS_KEY);
    const secretKey = await this.configService.get(ConfigKey.S3_SECRET_KEY);
    const bucket = await this.configService.get(ConfigKey.S3_BUCKET_MODELS);

    // Use configs
    const s3Client = new S3Client({
      endpoint,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    // Upload file...
  }

  async sendEmail(to: string, subject: string, body: string) {
    // Get SMTP configs as a group
    const smtpConfig = await this.configService.getByCategory(
      ConfigCategory.EMAIL
    );

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig['smtp.host'],
      port: smtpConfig['smtp.port'],
      secure: smtpConfig['smtp.use_tls'],
      auth: {
        user: smtpConfig['smtp.user'],
        pass: smtpConfig['smtp.password'],
      },
    });

    // Send email...
  }

  async sendDiscordAlert(message: string) {
    const webhookUrl = await this.configService.get(
      ConfigKey.DISCORD_WEBHOOK_URL
    );

    if (!webhookUrl) {
      this.logger.warn('Discord webhook not configured');
      return;
    }

    // Send to Discord...
  }
}
```

---

## 6. Security Features

### 6.1. Encryption

**AES-256 Encryption for Sensitive Values:**
- Automatic encryption based on `isSensitive` metadata
- Encryption key stored in environment (not in DB)
- Values encrypted before save, decrypted on retrieval
- Masked in API responses (show `********`)

### 6.2. Access Control

**RBAC Permissions:**
- `configuration.read` - View configs (sensitive values masked)
- `configuration.read.sensitive` - View decrypted sensitive values
- `configuration.create` - Create new configs
- `configuration.update` - Update config values
- `configuration.delete` - Delete configs
- `configuration.manage` - Full access including history

**Permission Matrix:**
```
Role              | Read | Read Sensitive | Create | Update | Delete | Manage
------------------|------|----------------|--------|--------|--------|--------
Admin             | ✅   | ✅             | ✅     | ✅     | ✅     | ✅
DevOps            | ✅   | ✅             | ✅     | ✅     | ❌     | ✅
Developer         | ✅   | ❌             | ❌     | ❌     | ❌     | ❌
Service (API Key) | ✅   | ✅             | ❌     | ❌     | ❌     | ❌
```

### 6.3. Audit Trail

**Complete History Tracking:**
- Every config change logged to ConfigurationHistory
- Captures: old value, new value, who, when, why, from where (IP)
- Immutable history (cannot delete)
- Searchable audit logs

---

## 7. Validation System

### 7.1. Validation Rules

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

class ConfigValidator {
  validate(key: ConfigKey, value: string): ValidationResult {
    const metadata = CONFIG_METADATA[key];
    const errors: string[] = [];

    // Type validation
    switch (metadata.dataType) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`Value must be a number`);
        }
        break;
      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          errors.push(`Value must be true/false or 1/0`);
        }
        break;
      case 'url':
        try {
          new URL(value);
        } catch {
          errors.push(`Value must be a valid URL`);
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`Value must be a valid email`);
        }
        break;
      case 'json':
        try {
          JSON.parse(value);
        } catch {
          errors.push(`Value must be valid JSON`);
        }
        break;
    }

    // Pattern validation
    if (metadata.validation?.pattern) {
      const regex = new RegExp(metadata.validation.pattern);
      if (!regex.test(value)) {
        errors.push(`Value does not match required pattern`);
      }
    }

    // Length validation
    if (metadata.validation?.minLength && value.length < metadata.validation.minLength) {
      errors.push(`Value must be at least ${metadata.validation.minLength} characters`);
    }

    if (metadata.validation?.maxLength && value.length > metadata.validation.maxLength) {
      errors.push(`Value must be at most ${metadata.validation.maxLength} characters`);
    }

    // Enum validation
    if (metadata.validation?.enum && !metadata.validation.enum.includes(value)) {
      errors.push(`Value must be one of: ${metadata.validation.enum.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

### 7.2. Connection Testing

**Test Functions by Category:**

```typescript
// Test SMTP connection
async testSmtpConfig(): Promise<TestResult> {
  const config = await this.configService.getByCategory(ConfigCategory.EMAIL);

  const transporter = nodemailer.createTransport({
    host: config['smtp.host'],
    port: config['smtp.port'],
    auth: {
      user: config['smtp.user'],
      pass: config['smtp.password'],
    },
  });

  try {
    await transporter.verify();
    return { success: true, message: 'SMTP connection successful' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// Test S3 connection
async testS3Config(): Promise<TestResult> {
  const config = await this.configService.getByCategory(ConfigCategory.OBJECT_STORAGE);

  const s3Client = new S3Client({
    endpoint: config['s3.endpoint'],
    credentials: {
      accessKeyId: config['s3.access_key'],
      secretAccessKey: config['s3.secret_key'],
    },
  });

  try {
    const buckets = await s3Client.send(new ListBucketsCommand({}));
    return {
      success: true,
      message: 'S3 connection successful',
      details: { bucketsFound: buckets.Buckets?.length }
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// Test Discord webhook
async testDiscordWebhook(): Promise<TestResult> {
  const url = await this.configService.get(ConfigKey.DISCORD_WEBHOOK_URL);

  try {
    const response = await axios.post(url, {
      content: '🧪 Test message from Hydra Configuration System',
      username: 'Hydra Config Test',
    });
    return { success: true, message: 'Discord webhook test successful' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
```

---

## 8. Implementation Plan

### Phase 1: Foundation (Week 1 - Days 1-3)
- [ ] Create Configuration module structure
- [ ] Define ConfigKey enum (50+ keys)
- [ ] Define ConfigCategory enum
- [ ] Create CONFIG_METADATA registry
- [ ] Implement Configuration schema
- [ ] Implement ConfigurationHistory schema
- [ ] Setup encryption utils

### Phase 2: Core API (Week 1 - Days 4-5)
- [ ] ConfigurationService với CRUD
- [ ] Encryption/Decryption logic
- [ ] ConfigurationController với all endpoints
- [ ] DTOs with validation
- [ ] RBAC integration

### Phase 3: Consumer SDK (Week 2 - Days 1-2)
- [ ] ConfigService for service consumers
- [ ] Cache implementation
- [ ] Hot reload mechanism
- [ ] Helper methods (get, getByCategory, getOrDefault)

### Phase 4: Testing & Validation (Week 2 - Days 3-4)
- [ ] Validation system
- [ ] Connection test functions
- [ ] Unit tests
- [ ] Integration tests
- [ ] API documentation

### Phase 5: Polish (Week 2 - Day 5)
- [ ] Audit trail queries
- [ ] Bulk operations
- [ ] Import/Export configs
- [ ] Documentation
- [ ] Migration scripts

---

## 9. Benefits

### For Developers:
✅ **Centralized Management** - All configs trong một chỗ
✅ **Type-Safe** - Enums cho keys, không typo
✅ **Auto-Complete** - IDE suggestions cho config keys
✅ **No Restart** - Hot reload configs
✅ **Easy Access** - `configService.get(ConfigKey.SMTP_HOST)`

### For Admins:
✅ **Web UI** - Manage configs qua API/Portal
✅ **Validation** - Catch errors trước khi save
✅ **Test Connections** - Test SMTP/S3/Webhooks
✅ **Audit Trail** - See who changed what when
✅ **Security** - Encrypted sensitive values

### For Security:
✅ **Encrypted Storage** - Secrets encrypted at rest
✅ **Access Control** - RBAC for config management
✅ **Masked Values** - Sensitive values hidden in logs/responses
✅ **Audit Logs** - Complete history of changes
✅ **No .env Files** - No secrets in source code

---

## 10. Example Use Cases

### Use Case 1: Setup Object Storage

```bash
# Admin creates S3 configs via API
curl -X POST http://localhost:3003/configurations \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "key": "s3.endpoint",
    "value": "https://minio.example.com"
  }'

curl -X POST http://localhost:3003/configurations \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "key": "s3.access_key",
    "value": "AKIAIOSFODNN7EXAMPLE"
  }'

curl -X POST http://localhost:3003/configurations \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "key": "s3.secret_key",
    "value": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }'

# Test S3 connection
curl -X POST http://localhost:3003/configurations/s3.endpoint/test \
  -H "Authorization: Bearer $TOKEN"

# Service automatically uses these configs
// In ModelService
const s3Endpoint = await this.configService.get(ConfigKey.S3_ENDPOINT);
// Works immediately, no restart needed!
```

### Use Case 2: Setup Email Notifications

```bash
# Setup SMTP
curl -X POST http://localhost:3003/configurations \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"key": "smtp.host", "value": "smtp.gmail.com"}'

curl -X POST http://localhost:3003/configurations \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"key": "smtp.port", "value": "587"}'

curl -X POST http://localhost:3003/configurations \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"key": "smtp.user", "value": "notifications@example.com"}'

curl -X POST http://localhost:3003/configurations \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"key": "smtp.password", "value": "app-specific-password"}'

# Test SMTP
curl -X POST http://localhost:3003/configurations/smtp.host/test

# Service sends emails automatically
await this.notificationService.sendEmail(
  'user@example.com',
  'Model Deployment Complete',
  'Your model has been deployed successfully'
);
```

### Use Case 3: Setup Discord Alerts

```bash
# Setup Discord webhook
curl -X POST http://localhost:3003/configurations \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "key": "discord.webhook_url",
    "value": "https://discord.com/api/webhooks/123/abc..."
  }'

# Test webhook
curl -X POST http://localhost:3003/configurations/discord.webhook_url/test

# Service sends alerts
await this.alertService.sendAlert(
  'GPU node offline',
  'Node GPU-01 has been offline for 5 minutes'
);
// Automatically uses Discord webhook
```

---

## 11. Technical Considerations

### 11.1. Performance
- **Caching:** In-memory cache for frequently accessed configs
- **Hot Reload:** Event-based cache invalidation
- **Lazy Loading:** Load configs on demand
- **Batch Queries:** Get multiple configs in one query

### 11.2. Security
- **Encryption:** AES-256 for sensitive values
- **Key Management:** Encryption key from environment, rotatable
- **Access Control:** RBAC with granular permissions
- **Audit Trail:** Immutable history logs

### 11.3. Scalability
- **Sharding:** MongoDB sharding if needed
- **Read Replicas:** Scale reads with replicas
- **Cache Distribution:** Redis for distributed cache (future)

### 11.4. Reliability
- **Validation:** Pre-save validation prevents bad configs
- **Testing:** Test connections before activating
- **Rollback:** Keep history for easy rollback
- **Defaults:** Fallback to defaults if config missing

---

## 12. Future Enhancements (V2+)

### V2 Features:
- [ ] Config templates (pre-configured sets)
- [ ] Environment-based configs (dev/staging/prod)
- [ ] Config approval workflow
- [ ] Scheduled config changes
- [ ] Config comparison/diff tool
- [ ] Import/Export configs (JSON/YAML)

### V3 Features:
- [ ] Web UI for config management
- [ ] Config validation webhooks
- [ ] Integration with HashiCorp Vault
- [ ] Config versioning (git-like)
- [ ] AI-assisted config suggestions
- [ ] Monitoring dashboards

---

## 13. Questions for Discussion

### 13.1. Config Keys
- Có cần thêm config keys nào không? (Database, Cache, Queue, etc.)
- Priority keys nào cần implement trước?

### 13.2. Security
- Encryption algorithm OK? (AES-256)
- Key rotation strategy?
- Có cần 2FA cho sensitive config changes?

### 13.3. UI/UX
- Web UI cần ngay V1 hay V2?
- Category-based UI layout?

### 13.4. Testing
- Auto-test tất cả configs hay chỉ test on-demand?
- Test schedule (daily/weekly)?

---

## 14. Conclusion

**Recommendation:** ✅ **PROCEED** với Configuration Management Module

**Why:**
1. ✅ **Critical Need** - Hiện tại configs scattered, không secure
2. ✅ **Clear Design** - Predefined keys, metadata-driven, type-safe
3. ✅ **Security** - Encryption, RBAC, audit trail
4. ✅ **Developer-Friendly** - Easy to use SDK, hot reload
5. ✅ **Scalable** - Extensible architecture

**Timeline:** 1-2 tuần (10 working days)
**LOC:** ~1500 lines
**Complexity:** Medium
**Risk:** Low

---

**Next Steps:**
1. Review và approve proposal
2. Answer discussion questions
3. Start Phase 1 implementation
4. Define additional config keys if needed

---

**Document Status:** 📋 Awaiting Review
