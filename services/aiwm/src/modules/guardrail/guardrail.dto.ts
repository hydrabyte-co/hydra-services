import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new guardrail
 * MongoDB _id will be used as the primary identifier
 */
export class CreateGuardrailDto {
  @ApiProperty({
    description: 'Human-readable name for the guardrail',
    example: 'VTV Safe Content Filter',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the guardrail policy',
    example: 'Standard content filter for VTV public-facing agents',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this guardrail is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'List of blocked keywords',
    example: ['violence', 'hack', 'illegal'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedKeywords?: string[];

  @ApiPropertyOptional({
    description: 'List of blocked topics',
    example: ['political', 'medical', 'legal'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedTopics?: string[];

  @ApiPropertyOptional({
    description: 'Custom message to show when content is blocked',
    example: 'I cannot assist with that request due to content restrictions.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customMessage?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorizing guardrails',
    example: ['vtv', 'public', 'strict'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Guardrail status',
    enum: ['active', 'inactive'],
    example: 'active',
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}

/**
 * DTO for updating an existing guardrail
 * All fields are optional
 */
export class UpdateGuardrailDto {
  @ApiPropertyOptional({
    description: 'Human-readable name for the guardrail',
    example: 'VTV Safe Content Filter v2',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the guardrail policy',
    example: 'Updated content filter for VTV agents',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this guardrail is active',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'List of blocked keywords',
    example: ['violence', 'hack', 'illegal', 'weapon'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedKeywords?: string[];

  @ApiPropertyOptional({
    description: 'List of blocked topics',
    example: ['political', 'religious', 'adult'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedTopics?: string[];

  @ApiPropertyOptional({
    description: 'Custom message to show when content is blocked',
    example: 'Xin lỗi, em không thể hỗ trợ yêu cầu này.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customMessage?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorizing guardrails',
    example: ['vtv', 'public', 'moderate'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Guardrail status',
    enum: ['active', 'inactive'],
    example: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}
