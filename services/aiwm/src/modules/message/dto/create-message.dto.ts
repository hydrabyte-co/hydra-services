import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({
    description: 'ID of the conversation this message belongs to (optional for WebSocket, auto-detected from connection)',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({
    description: 'Message role (OpenAI/Anthropic standard)',
    enum: ['user', 'assistant', 'system', 'tool'],
    example: 'user',
  })
  @IsEnum(['user', 'assistant', 'system', 'tool'])
  role: 'user' | 'assistant' | 'system' | 'tool';

  @ApiProperty({
    description: 'Message content (text)',
    example: 'Please analyze the sales data for Q1 2025',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'ID of participant who sent this message (userId or agentId)',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  @IsString()
  @IsOptional()
  participantId?: string;

  @ApiProperty({
    description: 'Message type for special rendering',
    enum: ['text', 'thinking', 'tool_call', 'tool_result', 'error', 'system'],
    example: 'text',
    required: false,
  })
  @IsEnum(['text', 'thinking', 'tool_call', 'tool_result', 'error', 'system'])
  @IsOptional()
  type?: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'error' | 'system';

  @ApiProperty({
    description: 'Parent message ID for threading/replies',
    example: '507f1f77bcf86cd799439013',
    required: false,
  })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({
    description: 'File attachments (URLs or document references)',
    example: ['https://s3.amazonaws.com/bucket/file.pdf', 'document:doc-xyz789'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @ApiProperty({
    description: 'Agent thinking/reasoning',
    example: {
      content: 'Let me analyze the data step by step...',
      visible: true,
      duration: 1200,
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  thinking?: {
    content: string;
    visible: boolean;
    duration: number;
  };

  @ApiProperty({
    description: 'Tool calls made by agent',
    example: [
      {
        id: 'call_abc123',
        type: 'mcp_tool',
        function: {
          name: 'web_search',
          arguments: '{"query":"sales data Q1"}',
        },
      },
    ],
    required: false,
    type: Array,
  })
  @IsArray()
  @IsOptional()
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;

  @ApiProperty({
    description: 'Tool execution results',
    example: [
      {
        toolCallId: 'call_abc123',
        toolName: 'web_search',
        result: { articles: [] },
        success: true,
        executionTime: 2340,
      },
    ],
    required: false,
    type: Array,
  })
  @IsArray()
  @IsOptional()
  toolResults?: Array<{
    toolCallId: string;
    toolName: string;
    result: any;
    success: boolean;
    error?: string;
    executionTime?: number;
  }>;

  @ApiProperty({
    description: 'Token usage statistics',
    example: {
      promptTokens: 450,
      completionTokens: 120,
      totalTokens: 570,
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  @ApiProperty({
    description: 'Response latency in milliseconds',
    example: 2300,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  latency?: number;

  @ApiProperty({
    description: 'Error message if message failed',
    example: 'API rate limit exceeded',
    required: false,
  })
  @IsString()
  @IsOptional()
  error?: string;

  @ApiProperty({
    description: 'Message status',
    enum: ['sending', 'sent', 'delivered', 'failed'],
    example: 'sent',
    required: false,
  })
  @IsEnum(['sending', 'sent', 'delivered', 'failed'])
  @IsOptional()
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
}
