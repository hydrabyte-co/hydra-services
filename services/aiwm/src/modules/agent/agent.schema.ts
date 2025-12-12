import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type AgentDocument = Agent & Document;

/**
 * Agent Schema - MVP Minimal Version
 * AI agents that execute tasks using instructions, tools, and models
 * Simplified to essential fields only
 */
@Schema({ timestamps: true })
export class Agent extends BaseSchema {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ['active', 'inactive', 'busy'] })
  status: string;

  @Prop({ type: String, ref: 'Instruction' })
  instructionId?: string;

  @Prop({ type: String, ref: 'Guardrail' })
  guardrailId?: string;

  @Prop({ required: true, type: String, ref: 'Node' })
  nodeId: string;

  @Prop({ default: [] })
  tags: string[];

  // BaseSchema provides: owner, createdBy, updatedBy, deletedAt, metadata, timestamps
  // _id is automatically provided by MongoDB
}

export const AgentSchema = SchemaFactory.createForClass(Agent);

// Indexes for performance
AgentSchema.index({ status: 1, createdAt: -1 });
AgentSchema.index({ nodeId: 1 });
AgentSchema.index({ instructionId: 1 });
AgentSchema.index({ guardrailId: 1 });
AgentSchema.index({ tags: 1 });
AgentSchema.index({ name: 'text', description: 'text' });
