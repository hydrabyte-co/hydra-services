import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new instruction
 */
export class CreateInstructionDto {
  @ApiProperty({
    description: 'Unique identifier for the instruction (UUID v4)',
    example: 'inst-cs-agent-v1',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  instructionId!: string;

  @ApiProperty({
    description: 'Human-readable name for the instruction',
    example: 'Customer Support Agent v1',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the instruction',
    example: 'Instructions for customer support AI agent',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Main system prompt for the agent',
    example:
      'You are a helpful customer support agent. Always be polite, professional, and empathetic.',
  })
  @IsString()
  @MinLength(10)
  systemPrompt!: string;

  @ApiPropertyOptional({
    description: 'Step-by-step guidelines for the agent',
    example: [
      'Always greet customers warmly',
      'Listen carefully to understand the issue',
      'Provide clear step-by-step solutions',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guidelines?: string[];

  @ApiPropertyOptional({
    description: 'Tags for categorizing instructions',
    example: ['customer-service', 'support', 'polite'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether the instruction is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for updating an existing instruction
 * All fields are optional
 */
export class UpdateInstructionDto {
  @ApiPropertyOptional({
    description: 'Human-readable name for the instruction',
    example: 'Customer Support Agent v2',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the instruction',
    example: 'Updated instructions for customer support AI agent',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Main system prompt for the agent',
    example: 'Updated system prompt...',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  systemPrompt?: string;

  @ApiPropertyOptional({
    description: 'Step-by-step guidelines for the agent',
    example: ['New guideline 1', 'New guideline 2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guidelines?: string[];

  @ApiPropertyOptional({
    description: 'Tags for categorizing instructions',
    example: ['customer-service', 'support', 'empathetic'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether the instruction is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
