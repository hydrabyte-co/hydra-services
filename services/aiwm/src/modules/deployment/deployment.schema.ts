import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type DeploymentDocument = Deployment & Document;

/**
 * Deployment - Model Deployment Records
 * Simplified MVP version for deploying self-hosted models on GPU nodes
 * Uses MongoDB _id as the primary identifier
 */
@Schema({ timestamps: true })
export class Deployment extends BaseSchema {
  // Core fields
  @Prop({ required: true, maxlength: 100 })
  name!: string; // e.g., "Llama 3.1 8B - Production"

  @Prop({ required: true, maxlength: 500 })
  description!: string;

  // References
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Model', required: true })
  modelId!: MongooseSchema.Types.ObjectId; // Model to deploy

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Node', required: true })
  nodeId!: MongooseSchema.Types.ObjectId; // GPU node for deployment

  // Status lifecycle
  @Prop({
    required: true,
    enum: ['queued', 'deploying', 'running', 'stopping', 'stopped', 'failed', 'error'],
    default: 'queued',
  })
  status!: string;
  // 'queued': Waiting for deployment
  // 'deploying': Currently being deployed to node
  // 'running': Successfully deployed and running
  // 'stopping': Being stopped
  // 'stopped': Stopped by user
  // 'failed': Deployment failed
  // 'error': Runtime error

  // Container info (set after deployment)
  @Prop()
  containerId?: string; // Docker container ID

  @Prop()
  containerName?: string; // Container name, e.g., "deployment-{_id}"

  @Prop()
  dockerImage?: string; // Docker image used, e.g., "nvcr.io/nvidia/tritonserver:24.01"

  @Prop()
  containerPort?: number; // Container port (1024-65535)

  // GPU allocation
  @Prop()
  gpuDevice?: string; // GPU device IDs, e.g., "0" or "0,1" for multi-GPU

  // Networking
  @Prop()
  endpoint?: string; // API endpoint URL, e.g., "http://node-ip:port/v1/models/{model}"

  // Error handling
  @Prop()
  errorMessage?: string; // Error details if status = 'failed' or 'error'

  // Health monitoring
  @Prop()
  lastHealthCheck?: Date; // Last successful health check

  // BaseSchema provides: owner, createdBy, updatedBy, deletedAt, metadata, timestamps
  // _id is automatically provided by MongoDB
}

export const DeploymentSchema = SchemaFactory.createForClass(Deployment);

// Indexes for performance
DeploymentSchema.index({ status: 1 });
DeploymentSchema.index({ modelId: 1 });
DeploymentSchema.index({ nodeId: 1 });
DeploymentSchema.index({ name: 'text', description: 'text' }); // Text search
