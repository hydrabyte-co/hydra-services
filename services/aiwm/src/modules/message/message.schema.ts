import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';
import { Conversation } from '../conversation/conversation.schema';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message extends BaseSchema {
  // Reference to conversation
  @Prop({ required: true, type: String, ref: 'Conversation', index: true })
  conversationId: string;

  // Participant that sent this message (userId or agentId)
  @Prop({ required: false, type: String })
  participantId?: string;

  // Message role: 'user' | 'assistant' | 'system' | 'tool' (OpenAI/Anthropic standard)
  @Prop({
    required: true,
    enum: ['user', 'assistant', 'system', 'tool'],
    index: true,
  })
  role: 'user' | 'assistant' | 'system' | 'tool';

  // Message content (text)
  @Prop({ required: true, type: String })
  content: string;

  // Message type: 'text', 'thinking', 'tool_call', 'tool_result', 'error', 'system'
  @Prop({
    required: false,
    enum: ['text', 'thinking', 'tool_call', 'tool_result', 'error', 'system'],
    default: 'text',
  })
  type?: string;

  // Name (for function/tool messages)
  @Prop({ required: false })
  name?: string;

  // Parent message ID (for threading/replies)
  @Prop({ required: false, type: String, ref: 'Message' })
  parentId?: string;

  // Tool calls made by agent (MCP tools)
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true },
        function: {
          name: { type: String, required: true },
          arguments: { type: String, required: true },
        },
      },
    ],
    required: false,
  })
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;

  // Tool results (responses from tools)
  @Prop({
    type: [
      {
        toolCallId: { type: String, required: true },
        toolName: { type: String, required: true },
        result: { type: Object, required: true },
        success: { type: Boolean, required: true },
        error: { type: String, required: false },
        executionTime: { type: Number, required: false },
      },
    ],
    required: false,
  })
  toolResults?: Array<{
    toolCallId: string;
    toolName: string;
    result: any;
    success: boolean;
    error?: string;
    executionTime?: number;
  }>;

  // Agent thinking/reasoning (Claude Code style)
  @Prop({ type: Object, required: false })
  thinking?: {
    content: string;
    visible: boolean;
    duration: number;
  };

  // Token usage for this message
  @Prop({
    type: {
      promptTokens: { type: Number, required: true },
      completionTokens: { type: Number, required: true },
      totalTokens: { type: Number, required: true },
    },
    required: false,
  })
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  // Response latency (ms)
  @Prop({ required: false })
  latency?: number;

  // Error information (if failed)
  @Prop({ required: false })
  error?: string;

  // Message status: 'sending', 'sent', 'delivered', 'failed'
  @Prop({
    required: false,
    enum: ['sending', 'sent', 'delivered', 'failed'],
    default: 'sent',
  })
  status?: string;

  // Simplified attachments (string array)
  // Parse by prefix: https://, document:
  @Prop({ type: [String], required: false })
  attachments?: string[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes for performance
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ conversationId: 1, role: 1 });
MessageSchema.index({ participantId: 1, createdAt: -1 });
MessageSchema.index({ type: 1 });
MessageSchema.index({ parentId: 1 });