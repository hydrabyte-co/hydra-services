import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';
import { Node } from '../node/node.schema';

export type AgentDocument = Agent & Document;

@Schema({ timestamps: true })
export class Agent extends BaseSchema {
  @Prop({ required: true, unique: true })
  agentId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true, enum: ['active', 'inactive', 'busy'] })
  status: string;

  @Prop({ required: true })
  capabilities: string[];

  @Prop({ required: true, type: String, ref: 'Node' })
  nodeId: string;

  @Prop({ default: 0 })
  totalTasks: number;

  @Prop({ default: 0 })
  completedTasks: number;

  @Prop({ default: 0 })
    failedTasks: number;

  @Prop({ default: 0 })
    averageResponseTime: number;

  @Prop({ default: 0 })
    averageLatency: number;

  @Prop()
    lastTask?: Date;

  @Prop()
    lastHeartbeat?: Date;

  @Prop({ default: true })
    isActive: boolean;

  @Prop({ default: [] })
    permissions: string[];

  @Prop({ default: [] })
    tags: string[];

  // @Prop() - Removed to avoid BaseSchema conflict
  // metadata?: Record<string, string>;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);