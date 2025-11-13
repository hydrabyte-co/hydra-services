import { IsString, IsEnum, IsArray, IsOptional, IsNumber, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConversationParticipant {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Participant role' })
  @IsString()
  role: string;

  @ApiProperty({ description: 'Join timestamp' })
  @IsObject()
  joinedAt: Date;

  @ApiProperty({ description: 'Leave timestamp', required: false })
  @IsOptional()
  @IsObject()
  leftAt?: Date;
}

export class CreateConversationDto {
  @ApiProperty({ description: 'Unique conversation identifier' })
  @IsString()
  conversationId: string;

  @ApiProperty({ description: 'Conversation title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Conversation description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Agent ID' })
  @IsString()
  agentId: string;

  @ApiProperty({ description: 'Model ID' })
  @IsString()
  modelId: string;

  @ApiProperty({ description: 'Conversation type' })
  @IsString()
  conversationType: string;

  @ApiProperty({ description: 'Conversation status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Conversation participants', required: false, type: [ConversationParticipant] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  participants?: ConversationParticipant[];

  @ApiProperty({ description: 'Conversation tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateConversationDto {
  @ApiProperty({ description: 'Conversation title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Conversation description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Conversation status', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Agent ID', required: false })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiProperty({ description: 'Model ID', required: false })
  @IsOptional()
  @IsString()
  modelId?: string;

  @ApiProperty({ description: 'Conversation participants', required: false, type: [ConversationParticipant] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  participants?: ConversationParticipant[];

  @ApiProperty({ description: 'Conversation tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Active status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}