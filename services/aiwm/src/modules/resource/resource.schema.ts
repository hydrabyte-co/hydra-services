import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';
import { ResourceType, ResourceStatus } from './enums';

export type ResourceDocument = Resource & Document;

/**
 * Resource - Unified management for all resource types
 * V1: Metadata-only (CRUD API với mock responses cho actions)
 * V2: Actual deployment via worker
 */
@Schema({ timestamps: true })
export class Resource extends BaseSchema {
  @Prop({ required: true, maxlength: 100 })
  name!: string;

  @Prop({ maxlength: 500 })
  description?: string;

  @Prop({
    required: true,
    enum: Object.values(ResourceType),
    type: String,
  })
  resourceType!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Node',
    required: true,
  })
  nodeId!: MongooseSchema.Types.ObjectId;

  @Prop({
    required: true,
    enum: Object.values(ResourceStatus),
    type: String,
    default: ResourceStatus.QUEUED,
  })
  status!: string;

  // Type-specific configuration (discriminated union)
  // Can be InferenceContainerConfig | ApplicationContainerConfig | VirtualMachineConfig
  @Prop({ type: Object, required: true })
  config!: Record<string, any>;

  // Runtime information (set when resource is deployed)
  @Prop(
    raw({
      id: { type: String }, // Container ID or VM ID
      endpoint: { type: String }, // Access endpoint
      allocatedGPU: [{ type: String }], // GPU device IDs
      allocatedCPU: { type: Number }, // CPU cores
      allocatedRAM: { type: Number }, // RAM in GB
      startedAt: { type: Date },
      stoppedAt: { type: Date },
    }),
  )
  runtime?: {
    id?: string;
    endpoint?: string;
    allocatedGPU?: string[];
    allocatedCPU?: number;
    allocatedRAM?: number;
    startedAt?: Date;
    stoppedAt?: Date;
  };

  // Health monitoring
  @Prop()
  lastHealthCheck?: Date;

  @Prop()
  errorMessage?: string;

  // BaseSchema provides: owner, createdBy, updatedBy, deletedAt, metadata, timestamps
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);

// Indexes for performance
ResourceSchema.index({ resourceType: 1, status: 1 });
ResourceSchema.index({ nodeId: 1 });
ResourceSchema.index({ status: 1 });
ResourceSchema.index({ 'runtime.id': 1 });
ResourceSchema.index({ name: 'text', description: 'text' }); // Text search
