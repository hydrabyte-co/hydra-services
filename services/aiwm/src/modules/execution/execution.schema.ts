import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type ExecutionDocument = Execution & Document;
export type ExecutionStepDocument = ExecutionStep & Document;

/**
 * ExecutionStep - Embedded subdocument
 * Represents a single step in an execution workflow
 */
@Schema({ _id: false, timestamps: false })
export class ExecutionStep {
  @Prop({ required: true })
  index!: number; // 0, 1, 2, ... (execution order)

  @Prop({ required: true })
  name!: string; // e.g., 'Download model', 'Start container'

  @Prop()
  description?: string;

  @Prop({
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
    default: 'pending',
  })
  status!: string;

  @Prop({ default: 0, min: 0, max: 100 })
  progress!: number;

  // WebSocket command to execute
  @Prop({ type: Object })
  command?: {
    type: string; // e.g., 'model.download', 'deployment.create'
    resource: {
      type: string;
      id: string;
    };
    data: Record<string, any>;
  };

  // Node assignment
  @Prop()
  nodeId?: string; // Which node executes this step

  // Timing
  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  timeoutSeconds?: number; // Step specific timeout

  // Result
  @Prop({ type: Object })
  result?: Record<string, any>;

  @Prop({ type: Object })
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  // Message tracking
  @Prop()
  sentMessageId?: string; // WebSocket message ID sent

  @Prop()
  receivedMessageId?: string; // WebSocket message ID received

  // Dependencies
  @Prop({ type: [Number], default: [] })
  dependsOn!: number[]; // Indexes of steps that must complete first

  @Prop({ default: false })
  optional!: boolean; // Can be skipped if failed
}

export const ExecutionStepSchema = SchemaFactory.createForClass(ExecutionStep);

/**
 * Execution - Main entity for workflow orchestration
 * Tracks multi-step execution workflows using pure event-based approach
 */
@Schema({ timestamps: true })
export class Execution extends BaseSchema {
  @Prop({ required: true, unique: true })
  executionId!: string; // UUID v4

  @Prop({ required: true })
  name!: string; // Human-readable execution name

  @Prop()
  description?: string;

  // Execution type and category
  @Prop({
    required: true,
    enum: ['deployment', 'model', 'agent', 'maintenance', 'batch'],
  })
  category!: string;

  @Prop({ required: true })
  type!: string; // e.g., 'deploy-model', 'download-model', 'setup-agent'

  // Status tracking
  @Prop({
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'],
    default: 'pending',
  })
  status!: string;

  @Prop({ default: 0, min: 0, max: 100 })
  progress!: number; // Percentage (0-100)

  // Parent-child relationship for composite executions
  @Prop({ type: String, ref: 'Execution' })
  parentExecutionId?: string;

  @Prop({ type: [String], default: [] })
  childExecutionIds!: string[];

  // Steps (embedded documents)
  @Prop({ type: [ExecutionStepSchema], default: [] })
  steps!: ExecutionStep[];

  // Related resources
  @Prop()
  resourceType?: string; // 'deployment', 'model', 'node', 'agent'

  @Prop()
  resourceId?: string; // Foreign key to related resource

  // Node assignment
  @Prop({ type: String, ref: 'Node' })
  nodeId?: string; // Primary node executing this execution

  @Prop({ type: [String], default: [] })
  involvedNodeIds!: string[]; // All nodes involved in execution

  // Timing
  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ required: true })
  timeoutSeconds!: number; // Execution timeout in seconds

  @Prop()
  timeoutAt?: Date; // Calculated timeout deadline

  // Result and error tracking
  @Prop({ type: Object })
  result?: Record<string, any>; // Execution result data

  @Prop({ type: Object })
  error?: {
    code: string;
    message: string;
    details?: any;
    nodeId?: string; // Which node caused the error
    stepIndex?: number; // Which step failed
  };

  // WebSocket message tracking
  @Prop({ type: [String], default: [] })
  sentMessageIds!: string[]; // WebSocket messages sent for this execution

  @Prop({ type: [String], default: [] })
  receivedMessageIds!: string[]; // WebSocket messages received

  // Retry configuration
  @Prop({ default: 0 })
  retryCount!: number; // Number of retry attempts

  @Prop({ default: 3 })
  maxRetries!: number; // Maximum retry attempts

  @Prop({ type: [Date], default: [] })
  retryAttempts!: Date[]; // Timestamps of retry attempts

  // BaseSchema provides: owner, createdBy, updatedBy, deletedAt, metadata, etc.
}

export const ExecutionSchema = SchemaFactory.createForClass(Execution);

// Indexes for performance
ExecutionSchema.index({ executionId: 1 }, { unique: true });
ExecutionSchema.index({ status: 1, createdAt: -1 });
ExecutionSchema.index({ parentExecutionId: 1 });
ExecutionSchema.index({ resourceType: 1, resourceId: 1 });
ExecutionSchema.index({ nodeId: 1, status: 1 });
ExecutionSchema.index({ timeoutAt: 1 }, { sparse: true });
ExecutionSchema.index({ 'steps.status': 1 });
