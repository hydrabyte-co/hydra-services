import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConversationDto {
  @ApiProperty({
    description: 'Conversation title',
    example: 'Sales Analysis Q1 2025 - Updated',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Brief description of the conversation',
    example: 'Updated discussion about Q1 sales performance',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Conversation status',
    example: 'active',
    enum: ['active', 'archived', 'closed'],
    required: false,
  })
  @IsEnum(['active', 'archived', 'closed'])
  @IsOptional()
  status?: 'active' | 'archived' | 'closed';

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
