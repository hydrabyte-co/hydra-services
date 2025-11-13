import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type ToolDocument = Tool & Document;

@Schema({ timestamps: true })
export class Tool extends BaseSchema {
  @Prop({ required: true, unique: true })
  toolId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  endpoint: string;

  @Prop({ required: true })
  version: string;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ required: true })
  parameters: {
    type: 'object' | 'array';
    properties: Record<string, any>;
    required: string[];
  };

  @Prop({ required: true })
  responseFormat: {
    type: 'object' | 'array' | 'string' | 'number' | 'boolean';
    schema: Record<string, any>;
  };

  @Prop({ default: [] })
  usage: [{
    timestamp: Date;
    agentId: string;
    arguments: Record<string, any>;
    result: any;
    latency: number;
    success: boolean;
    error?: string;
  }];

  @Prop({ default: 0 })
  totalUsage: number;

  @Prop({ default: 0 })
  totalFailures: number;

  @Prop({ default: 0 })
    averageLatency: number;

  @Prop({ default: [] })
  tags: string[];

  @Prop()
  documentation?: string;

  @Prop()
  examples?: Array<{
    title: string;
    description: string;
    arguments: Record<string, any>;
    expectedOutput: any;
  }>;

  @Prop({ default: true })
  isActive: boolean;
}

export const ToolSchema = SchemaFactory.createForClass(Tool);