import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Conversation title',
    example: 'Sales Analysis Q1 2025',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Brief description of the conversation',
    example: 'Discussion about Q1 sales performance',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'ID of the agent handling this conversation',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @ApiProperty({
    description: 'Tags for categorization',
    example: ['sales', 'analysis', 'q1-2025'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
