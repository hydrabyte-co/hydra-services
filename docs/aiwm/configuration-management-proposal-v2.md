# Configuration Management System - Proposal V2 (Simplified)

**Author:** Backend Dev Team
**Date:** 2025-12-03
**Status:** ✅ **Ready for Implementation**
**Version:** 2.0 (Simplified based on feedback)

---

## TL;DR - Executive Summary

**Yêu cầu:** Hệ thống quản lý cấu hình đơn giản cho AIWM services

**Changes from V1:**
- ❌ Bỏ ConfigCategory (không phân loại)
- ❌ Bỏ encryption (plain text storage)
- ✅ RBAC strict: Chỉ `organization.owner` access
- ✅ GET list: Không trả value (chỉ metadata)
- ✅ GET detail: Mới có value
- ✅ Chỉ 23 config keys (priority configs)

**Timeline:** 3-4 ngày
**Complexity:** Low-Medium
**LOC Estimate:** ~800 lines

---

## 1. Scope

### **Priority Config Groups (23 keys total):**

#### 1. Object Storage - MinIO/S3 (7 keys)
- `s3.endpoint`
- `s3.access_key`
- `s3.secret_key`
- `s3.bucket.models`
- `s3.bucket.logs`
- `s3.region`
- `s3.use_ssl`

#### 2. Email - SMTP (7 keys)
- `smtp.host`
- `smtp.port`
- `smtp.user`
- `smtp.password`
- `smtp.from_email`
- `smtp.from_name`
- `smtp.use_tls`

#### 3. Discord Webhook (3 keys)
- `discord.webhook_url`
- `discord.alert_channel`
- `discord.username`

#### 4. Telegram Bot (3 keys)
- `telegram.bot_token`
- `telegram.chat_id`
- `telegram.alert_enabled`

#### 5. LLM Providers (3 keys)
- `llm.openai.api_key`
- `llm.anthropic.api_key`
- `llm.groq.api_key`

---

## 2. Architecture Design (Simplified)

### 2.1. Config Key Enum

```typescript
/**
 * Configuration Keys
 * Predefined keys for system configurations
 */
export enum ConfigKey {
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

  // LLM Providers
  OPENAI_API_KEY = 'llm.openai.api_key',
  ANTHROPIC_API_KEY = 'llm.anthropic.api_key',
  GROQ_API_KEY = 'llm.groq.api_key',
}
```

### 2.2. Config Metadata

```typescript
interface ConfigKeyMetadata {
  key: ConfigKey;
  displayName: string;
  description: string;
  dataType: 'string' | 'number' | 'boolean' | 'url' | 'email';
  isRequired: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string; // Regex
    minLength?: number;
    maxLength?: number;
    min?: number; // For numbers
    max?: number;
    enum?: string[]; // Allowed values
  };
  example?: string;
}

/**
 * Config Metadata Registry
 * Predefined metadata for all config keys
 */
export const CONFIG_METADATA: Record<ConfigKey, ConfigKeyMetadata> = {
  // Object Storage
  [ConfigKey.S3_ENDPOINT]: {
    key: ConfigKey.S3_ENDPOINT,
    displayName: 'S3 Endpoint',
    description: 'S3-compatible storage endpoint URL (MinIO, AWS S3)',
    dataType: 'url',
    isRequired: true,
    validation: {
      pattern: '^https?://.+',
    },
    example: 'https://minio.example.com',
  },
  [ConfigKey.S3_ACCESS_KEY]: {
    key: ConfigKey.S3_ACCESS_KEY,
    displayName: 'S3 Access Key',
    description: 'S3 access key ID for authentication',
    dataType: 'string',
    isRequired: true,
    validation: {
      minLength: 3,
      maxLength: 128,
    },
    example: 'AKIAIOSFODNN7EXAMPLE',
  },
  [ConfigKey.S3_SECRET_KEY]: {
    key: ConfigKey.S3_SECRET_KEY,
    displayName: 'S3 Secret Key',
    description: 'S3 secret access key for authentication',
    dataType: 'string',
    isRequired: true,
    validation: {
      minLength: 16,
    },
    example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  },
  [ConfigKey.S3_BUCKET_MODELS]: {
    key: ConfigKey.S3_BUCKET_MODELS,
    displayName: 'S3 Bucket for Models',
    description: 'S3 bucket name for storing AI models',
    dataType: 'string',
    isRequired: true,
    validation: {
      pattern: '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$',
    },
    example: 'hydra-models',
  },
  [ConfigKey.S3_BUCKET_LOGS]: {
    key: ConfigKey.S3_BUCKET_LOGS,
    displayName: 'S3 Bucket for Logs',
    description: 'S3 bucket name for storing logs',
    dataType: 'string',
    isRequired: false,
    validation: {
      pattern: '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$',
    },
    example: 'hydra-logs',
  },
  [ConfigKey.S3_REGION]: {
    key: ConfigKey.S3_REGION,
    displayName: 'S3 Region',
    description: 'S3 region (for AWS S3)',
    dataType: 'string',
    isRequired: false,
    defaultValue: 'us-east-1',
    example: 'us-east-1',
  },
  [ConfigKey.S3_USE_SSL]: {
    key: ConfigKey.S3_USE_SSL,
    displayName: 'S3 Use SSL',
    description: 'Use SSL/TLS for S3 connection',
    dataType: 'boolean',
    isRequired: false,
    defaultValue: 'true',
    validation: {
      enum: ['true', 'false'],
    },
  },

  // SMTP Email
  [ConfigKey.SMTP_HOST]: {
    key: ConfigKey.SMTP_HOST,
    displayName: 'SMTP Host',
    description: 'SMTP server hostname',
    dataType: 'string',
    isRequired: true,
    example: 'smtp.gmail.com',
  },
  [ConfigKey.SMTP_PORT]: {
    key: ConfigKey.SMTP_PORT,
    displayName: 'SMTP Port',
    description: 'SMTP server port (25, 465 SSL, 587 TLS)',
    dataType: 'number',
    isRequired: true,
    defaultValue: '587',
    validation: {
      min: 1,
      max: 65535,
    },
    example: '587',
  },
  [ConfigKey.SMTP_USER]: {
    key: ConfigKey.SMTP_USER,
    displayName: 'SMTP Username',
    description: 'SMTP authentication username',
    dataType: 'string',
    isRequired: true,
    example: 'notifications@example.com',
  },
  [ConfigKey.SMTP_PASSWORD]: {
    key: ConfigKey.SMTP_PASSWORD,
    displayName: 'SMTP Password',
    description: 'SMTP authentication password',
    dataType: 'string',
    isRequired: true,
    validation: {
      minLength: 1,
    },
    example: 'app-specific-password',
  },
  [ConfigKey.SMTP_FROM_EMAIL]: {
    key: ConfigKey.SMTP_FROM_EMAIL,
    displayName: 'SMTP From Email',
    description: 'Email address to use as sender',
    dataType: 'email',
    isRequired: true,
    validation: {
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    },
    example: 'noreply@hydra.ai',
  },
  [ConfigKey.SMTP_FROM_NAME]: {
    key: ConfigKey.SMTP_FROM_NAME,
    displayName: 'SMTP From Name',
    description: 'Sender name to display',
    dataType: 'string',
    isRequired: false,
    defaultValue: 'Hydra AI Platform',
    example: 'Hydra AI Platform',
  },
  [ConfigKey.SMTP_USE_TLS]: {
    key: ConfigKey.SMTP_USE_TLS,
    displayName: 'SMTP Use TLS',
    description: 'Use TLS/STARTTLS for SMTP connection',
    dataType: 'boolean',
    isRequired: false,
    defaultValue: 'true',
    validation: {
      enum: ['true', 'false'],
    },
  },

  // Discord
  [ConfigKey.DISCORD_WEBHOOK_URL]: {
    key: ConfigKey.DISCORD_WEBHOOK_URL,
    displayName: 'Discord Webhook URL',
    description: 'Discord webhook URL for sending alerts',
    dataType: 'url',
    isRequired: false,
    validation: {
      pattern: '^https://discord.com/api/webhooks/.+',
    },
    example: 'https://discord.com/api/webhooks/123456789/abcdefg...',
  },
  [ConfigKey.DISCORD_ALERT_CHANNEL]: {
    key: ConfigKey.DISCORD_ALERT_CHANNEL,
    displayName: 'Discord Alert Channel',
    description: 'Discord channel name for alerts',
    dataType: 'string',
    isRequired: false,
    example: 'hydra-alerts',
  },
  [ConfigKey.DISCORD_USERNAME]: {
    key: ConfigKey.DISCORD_USERNAME,
    displayName: 'Discord Bot Username',
    description: 'Display name for Discord bot',
    dataType: 'string',
    isRequired: false,
    defaultValue: 'Hydra Bot',
    example: 'Hydra Bot',
  },

  // Telegram
  [ConfigKey.TELEGRAM_BOT_TOKEN]: {
    key: ConfigKey.TELEGRAM_BOT_TOKEN,
    displayName: 'Telegram Bot Token',
    description: 'Telegram bot API token',
    dataType: 'string',
    isRequired: false,
    validation: {
      pattern: '^[0-9]{8,10}:[A-Za-z0-9_-]{35}$',
    },
    example: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
  },
  [ConfigKey.TELEGRAM_CHAT_ID]: {
    key: ConfigKey.TELEGRAM_CHAT_ID,
    displayName: 'Telegram Chat ID',
    description: 'Telegram chat/channel ID for alerts',
    dataType: 'string',
    isRequired: false,
    example: '-1001234567890',
  },
  [ConfigKey.TELEGRAM_ALERT_ENABLED]: {
    key: ConfigKey.TELEGRAM_ALERT_ENABLED,
    displayName: 'Telegram Alerts Enabled',
    description: 'Enable/disable Telegram alerts',
    dataType: 'boolean',
    isRequired: false,
    defaultValue: 'false',
    validation: {
      enum: ['true', 'false'],
    },
  },

  // LLM Providers
  [ConfigKey.OPENAI_API_KEY]: {
    key: ConfigKey.OPENAI_API_KEY,
    displayName: 'OpenAI API Key',
    description: 'OpenAI API key for GPT models',
    dataType: 'string',
    isRequired: false,
    validation: {
      pattern: '^sk-[A-Za-z0-9]{32,}$',
    },
    example: 'sk-proj-...',
  },
  [ConfigKey.ANTHROPIC_API_KEY]: {
    key: ConfigKey.ANTHROPIC_API_KEY,
    displayName: 'Anthropic API Key',
    description: 'Anthropic API key for Claude models',
    dataType: 'string',
    isRequired: false,
    validation: {
      pattern: '^sk-ant-[A-Za-z0-9-_]{32,}$',
    },
    example: 'sk-ant-api03-...',
  },
  [ConfigKey.GROQ_API_KEY]: {
    key: ConfigKey.GROQ_API_KEY,
    displayName: 'Groq API Key',
    description: 'Groq API key for fast inference',
    dataType: 'string',
    isRequired: false,
    validation: {
      pattern: '^gsk_[A-Za-z0-9]{32,}$',
    },
    example: 'gsk_...',
  },
};
```

### 2.3. Database Schema

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
  value!: string; // Plain text (no encryption)

  @Prop({ default: true })
  isActive!: boolean; // Enable/disable config

  @Prop()
  notes?: string; // Admin notes

  // BaseSchema provides: owner, createdBy, updatedBy, deletedAt, timestamps
}

export const ConfigurationSchema = SchemaFactory.createForClass(Configuration);

// Indexes
ConfigurationSchema.index({ key: 1 });
ConfigurationSchema.index({ isActive: 1 });
```

---

## 3. API Design

### 3.1. REST Endpoints

```typescript
// Configuration Management
GET    /configurations              // List configs (NO VALUE - only metadata)
GET    /configurations/:key         // Get config with VALUE
POST   /configurations              // Create/Update config
DELETE /configurations/:key         // Delete config (soft delete)

// Metadata
GET    /configurations/metadata     // Get all config metadata
GET    /configurations/metadata/:key // Get metadata for specific key
```

### 3.2. API Examples

#### List Configurations (No Values)

```bash
GET /configurations
Authorization: Bearer <organization.owner token>

# Response:
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
      "createdAt": "2025-12-03T12:00:00.000Z",
      "updatedAt": "2025-12-03T12:00:00.000Z"
    },
    {
      "_id": "675a1b2c3d4e5f6a7b8c9d0f",
      "key": "s3.secret_key",
      "isActive": true,
      "metadata": {
        "displayName": "S3 Secret Key",
        "description": "S3 secret access key for authentication",
        "dataType": "string",
        "isRequired": true,
        "example": "wJalrXUtnFEMI/K7MDENG/..."
      },
      "notes": null,
      "createdAt": "2025-12-03T12:00:00.000Z",
      "updatedAt": "2025-12-03T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 23
  },
  "statistics": {
    "total": 23,
    "active": 20,
    "inactive": 3
  }
}

# ✅ Note: NO "value" field in list response
```

#### Get Configuration Detail (With Value)

```bash
GET /configurations/s3.endpoint
Authorization: Bearer <organization.owner token>

# Response:
{
  "_id": "675a1b2c3d4e5f6a7b8c9d0e",
  "key": "s3.endpoint",
  "value": "https://minio.example.com",  # ✅ Value included
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
  "createdAt": "2025-12-03T12:00:00.000Z",
  "updatedAt": "2025-12-03T12:00:00.000Z"
}
```

#### Create/Update Configuration

```bash
POST /configurations
Authorization: Bearer <organization.owner token>
Content-Type: application/json

{
  "key": "s3.endpoint",
  "value": "https://minio.example.com",
  "notes": "Primary MinIO instance"
}

# Response:
{
  "_id": "675a1b2c3d4e5f6a7b8c9d0e",
  "key": "s3.endpoint",
  "value": "https://minio.example.com",
  "isActive": true,
  "notes": "Primary MinIO instance",
  "metadata": { ... },
  "createdAt": "2025-12-03T12:00:00.000Z",
  "updatedAt": "2025-12-03T12:00:00.000Z"
}
```

#### Delete Configuration

```bash
DELETE /configurations/s3.endpoint
Authorization: Bearer <organization.owner token>

# Response:
{
  "success": true,
  "message": "Configuration deleted",
  "key": "s3.endpoint"
}
```

#### Get All Metadata

```bash
GET /configurations/metadata

# Response:
{
  "data": [
    {
      "key": "s3.endpoint",
      "displayName": "S3 Endpoint",
      "description": "S3-compatible storage endpoint URL",
      "dataType": "url",
      "isRequired": true,
      "validation": { "pattern": "^https?://.+" },
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
    // ... all 23 config keys
  ],
  "total": 23
}

# ✅ Public endpoint (no auth needed) - only metadata, no values
```

---

## 4. RBAC - Access Control

### 4.1. Permissions

**Only `organization.owner` role can access configurations:**

```typescript
// In controller
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('organization.owner')
@Get()
async findAll() { ... }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('organization.owner')
@Get(':key')
async findOne(@Param('key') key: string) { ... }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('organization.owner')
@Post()
async createOrUpdate(@Body() dto: ConfigurationDto) { ... }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('organization.owner')
@Delete(':key')
async delete(@Param('key') key: string) { ... }
```

### 4.2. Permission Matrix

```
Role                  | List | Detail | Create | Update | Delete
----------------------|------|--------|--------|--------|--------
organization.owner    | ✅   | ✅     | ✅     | ✅     | ✅
organization.member   | ❌   | ❌     | ❌     | ❌     | ❌
universe.owner        | ❌   | ❌     | ❌     | ❌     | ❌
Other roles           | ❌   | ❌     | ❌     | ❌     | ❌
Service (internal)    | ✅   | ✅     | ❌     | ❌     | ❌
Public (metadata)     | ❌   | ❌     | ❌     | ❌     | ❌
```

**Note:**
- GET list: Returns configs WITHOUT values
- GET detail: Returns config WITH value
- Metadata endpoint: Public (no auth), no values

---

## 5. Service Consumer SDK

### 5.1. ConfigService for Internal Use

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Configuration } from './configuration.schema';
import { ConfigKey } from './enums/config-key.enum';

@Injectable()
export class ConfigService {
  private cache: Map<string, any> = new Map();

  constructor(
    @InjectModel(Configuration.name) private configModel: Model<Configuration>
  ) {
    this.initializeCache();
  }

  /**
   * Get configuration value by key
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
      isDeleted: false
    });

    if (!config) {
      return null;
    }

    // Parse based on metadata type
    const parsedValue = this.parseValue(key, config.value);

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
   * Get all active configs as object
   */
  async getAll(): Promise<Record<string, any>> {
    const configs = await this.configModel.find({
      isActive: true,
      isDeleted: false
    });

    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.key] = this.parseValue(config.key as ConfigKey, config.value);
    }

    return result;
  }

  /**
   * Hot reload cache
   */
  async reloadCache(key?: ConfigKey): Promise<void> {
    if (key) {
      this.cache.delete(key);
      await this.get(key);
    } else {
      this.cache.clear();
      await this.initializeCache();
    }
  }

  // Private helper methods
  private parseValue(key: ConfigKey, value: string): any {
    const metadata = CONFIG_METADATA[key];

    switch (metadata.dataType) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true' || value === '1';
      default:
        return value;
    }
  }

  private async initializeCache(): Promise<void> {
    // Preload all configs into cache
    await this.getAll();
  }
}
```

### 5.2. Usage Examples

```typescript
// In ModelService
@Injectable()
export class ModelService {
  constructor(private configService: ConfigService) {}

  async uploadModel(file: Buffer) {
    const endpoint = await this.configService.get(ConfigKey.S3_ENDPOINT);
    const accessKey = await this.configService.get(ConfigKey.S3_ACCESS_KEY);
    const secretKey = await this.configService.get(ConfigKey.S3_SECRET_KEY);
    const bucket = await this.configService.get(ConfigKey.S3_BUCKET_MODELS);

    const s3 = new S3Client({
      endpoint,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    // Upload to S3...
  }
}

// In NotificationService
@Injectable()
export class NotificationService {
  constructor(private configService: ConfigService) {}

  async sendEmail(to: string, subject: string, body: string) {
    const host = await this.configService.get(ConfigKey.SMTP_HOST);
    const port = await this.configService.get<number>(ConfigKey.SMTP_PORT);
    const user = await this.configService.get(ConfigKey.SMTP_USER);
    const pass = await this.configService.get(ConfigKey.SMTP_PASSWORD);

    const transporter = nodemailer.createTransport({
      host, port, auth: { user, pass }
    });

    // Send email...
  }

  async sendDiscordAlert(message: string) {
    const webhookUrl = await this.configService.get(ConfigKey.DISCORD_WEBHOOK_URL);

    if (!webhookUrl) {
      return; // Discord not configured
    }

    await axios.post(webhookUrl, { content: message });
  }
}
```

---

## 6. Validation System

### 6.1. Validation Service

```typescript
@Injectable()
export class ConfigValidationService {
  validate(key: ConfigKey, value: string): ValidationResult {
    const metadata = CONFIG_METADATA[key];
    const errors: string[] = [];

    // Type validation
    switch (metadata.dataType) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push('Value must be a number');
        }
        if (metadata.validation?.min && Number(value) < metadata.validation.min) {
          errors.push(`Value must be at least ${metadata.validation.min}`);
        }
        if (metadata.validation?.max && Number(value) > metadata.validation.max) {
          errors.push(`Value must be at most ${metadata.validation.max}`);
        }
        break;

      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          errors.push('Value must be true/false or 1/0');
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          errors.push('Value must be a valid URL');
        }
        break;

      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push('Value must be a valid email');
        }
        break;
    }

    // Pattern validation
    if (metadata.validation?.pattern) {
      const regex = new RegExp(metadata.validation.pattern);
      if (!regex.test(value)) {
        errors.push('Value does not match required pattern');
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

---

## 7. Implementation Plan

### Day 1: Foundation
- [ ] Create Configuration module structure
- [ ] Define ConfigKey enum (23 keys)
- [ ] Create CONFIG_METADATA registry
- [ ] Configuration schema
- [ ] ConfigurationModule setup

### Day 2: Core API
- [ ] ConfigurationService (CRUD)
- [ ] ConfigurationController (4 endpoints)
- [ ] DTOs with validation
- [ ] RBAC integration (organization.owner only)

### Day 3: Consumer SDK & Testing
- [ ] ConfigService for internal use
- [ ] Cache implementation
- [ ] Validation service
- [ ] Unit tests
- [ ] API tests

### Day 4: Polish & Documentation
- [ ] Swagger documentation
- [ ] API examples
- [ ] README
- [ ] Integration with existing services

---

## 8. File Structure

```
services/aiwm/src/modules/configuration/
├── enums/
│   ├── config-key.enum.ts          # ConfigKey enum (23 keys)
│   └── index.ts
├── constants/
│   ├── config-metadata.const.ts    # CONFIG_METADATA registry
│   └── index.ts
├── configuration.schema.ts         # Configuration schema
├── configuration.dto.ts            # DTOs
├── configuration.service.ts        # CRUD service
├── configuration.controller.ts     # REST API (4 endpoints)
├── configuration.module.ts         # NestJS module
├── config.service.ts               # Consumer SDK
├── config-validation.service.ts    # Validation
└── index.ts

libs/shared/src/lib/
└── config/
    └── config-key.enum.ts          # Export ConfigKey enum
```

---

## 9. Statistics

| Metric | Value |
|--------|-------|
| **Config Keys** | 23 |
| **API Endpoints** | 4 (list, detail, create, delete) |
| **Files** | 10 |
| **LOC Estimate** | ~800 lines |
| **Timeline** | 3-4 days |
| **Complexity** | Low-Medium |

---

## 10. Benefits

✅ **Simplified Design:**
- No categories - flat structure
- No encryption - plain text
- Strict RBAC - only org owners
- List without values - secure by default

✅ **Easy to Use:**
- `configService.get(ConfigKey.S3_ENDPOINT)`
- Type-safe with enums
- Auto-complete in IDE
- Hot reload (no restart)

✅ **Secure:**
- Only organization.owner access
- List endpoint hides values
- Audit trail via BaseSchema
- Validation before save

✅ **Maintainable:**
- Predefined keys (no arbitrary keys)
- Metadata in constants
- Easy to add new keys
- Well-documented

---

## 11. Comparison V1 vs V2

| Feature | V1 | V2 (Simplified) |
|---------|----|----|
| Config Keys | 50+ | 23 |
| Categories | 6 categories | ❌ No categories |
| Encryption | ✅ AES-256 | ❌ Plain text |
| Access Control | Granular RBAC | Strict (org owner only) |
| List Response | Values masked | ❌ No values |
| Detail Response | Full data | ✅ With value |
| Complexity | Medium-High | Low-Medium |
| Timeline | 10 days | 3-4 days |
| LOC | ~1500 | ~800 |

---

## 12. Conclusion

**Recommendation:** ✅ **PROCEED** với simplified design

**Why:**
1. ✅ **Simpler** - Bỏ categories và encryption giảm complexity
2. ✅ **Faster** - 3-4 ngày thay vì 10 ngày
3. ✅ **Secure** - Strict RBAC, list không trả values
4. ✅ **Sufficient** - 23 keys cover priority use cases
5. ✅ **Extensible** - Dễ add keys sau

**Next Steps:**
1. ✅ Approved by anh
2. Start Day 1 implementation
3. Review after Day 2
4. Deploy after Day 4

---

**Document Status:** ✅ Ready for Implementation
**Start Date:** TBD
**Expected Completion:** 3-4 days after start
