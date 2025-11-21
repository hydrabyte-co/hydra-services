import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type ModelDocument = Model & Document;

/**
 * Model - AI/ML Models Registry
 * Simple MVP version supporting both self-hosted and API-based models
 * Uses MongoDB _id as the primary identifier
 */
@Schema({ timestamps: true })
export class Model extends BaseSchema {
  // Core fields (both deployment types)
  @Prop({ required: true, maxlength: 100 })
  name!: string; // e.g., "GPT-4 Turbo", "Llama-3-8B"

  @Prop({ required: true, enum: ['llm', 'embedding', 'diffusion', 'classifier'] })
  type!: string;

  @Prop({ required: true, maxlength: 500 })
  description!: string;

  @Prop({ required: true })
  version!: string; // e.g., "1.0", "2024-11-20"

  @Prop({ required: true, enum: ['self-hosted', 'api-based'] })
  deploymentType!: string; // Distinguishes between self-hosted GPU models and API-forwarded models

  // Status lifecycle
  @Prop({
    required: true,
    enum: ['active', 'inactive', 'queued', 'downloading', 'deploying', 'error'],
    default: 'queued',
  })
  status!: string; // active: ready for inference, inactive: disabled, queued: waiting, downloading: from HF, deploying: to node, error: failed

  // Self-hosted model fields (required if deploymentType = 'self-hosted')
  @Prop()
  repository?: string; // HuggingFace repo, e.g., "meta-llama/Llama-3-8B"

  @Prop({ enum: ['pytorch', 'tensorflow', 'onnx', 'huggingface'] })
  framework?: string; // Model framework

  @Prop()
  fileName?: string; // Model file name

  @Prop()
  fileSize?: number; // In bytes

  @Prop()
  downloadPath?: string; // Local/MinIO path after download

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Node' })
  nodeId?: MongooseSchema.Types.ObjectId; // GPU node for deployment

  // API-based model fields (required if deploymentType = 'api-based')
  @Prop()
  provider?: string; // 'openai', 'anthropic', 'google', 'azure', 'cohere'

  @Prop()
  apiEndpoint?: string; // e.g., "https://api.openai.com/v1"

  @Prop()
  modelIdentifier?: string; // API model name, e.g., "gpt-4-turbo", "claude-3-sonnet-20240229"

  @Prop({ default: true })
  requiresApiKey?: boolean; // Does this model need API key?

  @Prop({ type: Object })
  apiConfig?: Record<string, string>; // API authentication and configuration
  // Store API keys, bearer tokens, custom headers, rate limits, etc.
  // Example: { "apiKey": "sk-...", "organization": "org-...", "customHeader": "value" }

  // Access control
  @Prop({ required: true, enum: ['public', 'org', 'private'], default: 'public' })
  scope!: string;

  // BaseSchema provides: owner, createdBy, updatedBy, deletedAt, metadata, timestamps
  // _id is automatically provided by MongoDB
}

export const ModelSchema = SchemaFactory.createForClass(Model);

// Indexes for performance
ModelSchema.index({ type: 1, status: 1 });
ModelSchema.index({ deploymentType: 1 });
ModelSchema.index({ provider: 1 }); // For API-based models
ModelSchema.index({ nodeId: 1 }); // For self-hosted models
ModelSchema.index({ name: 'text', description: 'text' }); // Text search
