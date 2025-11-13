import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';
import { Conversation } from '../conversation/conversation.schema';
import { Agent } from '../agent/agent.schema';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message extends BaseSchema {
  @Prop({ required: true, type: String, ref: 'Conversation' })
  conversationId: string;

  @Prop({ required: true, type: String, ref: 'Agent' })
  agentId: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: false })
  name?: string;

  @Prop({ required: false })
    functionCall?: {
      name: string;
      arguments: Record<string, any>;
    };

  @Prop({ required: false })
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;

  @Prop({ required: false })
    toolResults?: Array<{
      toolCallId: string;
      result: any;
    }>;

  @Prop({ required: false })
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };

  @Prop({ required: false })
    latency?: number;

  @Prop({ required: false })
    responseTime?: number;

  @Prop({ required: false })
    error?: string;

  // @Prop() - Removed to avoid BaseSchema conflict
  // metadata?: Record<string, any>;

  @Prop({ default: true })
    isActive: true;
}

export const MessageSchema = SchemaFactory.createForClass(Message);