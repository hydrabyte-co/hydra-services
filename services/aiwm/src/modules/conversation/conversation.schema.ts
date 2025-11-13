import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';
import { Agent } from '../agent/agent.schema';
import { Model } from '../model/model.schema';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation extends BaseSchema {
  @Prop({ required: true, unique: true })
  conversationId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: String, ref: 'Agent' })
  agentId: string;

  @Prop({ required: true, type: String, ref: 'Model' })
  modelId: string;

  @Prop({ required: true })
  conversationType: string;

  @Prop({ required: true })
  status: string;

  @Prop({ default: 0 })
  totalTokens: number;

  @Prop({ default: 0 })
  totalMessages: number;

  // @Prop() - Removed to avoid BaseSchema conflict
  // metadata?: Record<string, string>;

  @Prop({ default: [] })
  tags: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: [] })
  participants: [{
    userId: string;
    role: string;
    joinedAt: Date;
    leftAt?: Date;
  }];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);