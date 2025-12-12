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
 * DTO for creating a new PII pattern
 * MongoDB _id will be used as the primary identifier
 */
export class CreatePiiDto {
  @ApiProperty({
    description: 'Human-readable name for the PII pattern',
    example: 'Email Address',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: 'Type of PII pattern',
    enum: ['email', 'phone', 'credit_card', 'ssn', 'api_key', 'custom'],
    example: 'email',
  })
  @IsEnum(['email', 'phone', 'credit_card', 'ssn', 'api_key', 'custom'])
  type!: string;

  @ApiProperty({
    description: 'Regex pattern as string for detecting PII',
    example: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
  })
  @IsString()
  @MinLength(1)
  pattern!: string;

  @ApiProperty({
    description: 'Replacement text for redacting detected PII',
    example: '[EMAIL_REDACTED]',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  replacement!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of what this pattern detects',
    example: 'Detects email addresses in standard format',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this pattern is enabled',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Locale/region for region-specific patterns',
    example: 'vn',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({
    description: 'PII pattern status',
    enum: ['active', 'inactive'],
    example: 'active',
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorizing PII patterns',
    example: ['common', 'gdpr', 'vietnam'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * DTO for updating an existing PII pattern
 * All fields are optional
 */
export class UpdatePiiDto {
  @ApiPropertyOptional({
    description: 'Human-readable name for the PII pattern',
    example: 'Email Address (Updated)',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Type of PII pattern',
    enum: ['email', 'phone', 'credit_card', 'ssn', 'api_key', 'custom'],
    example: 'email',
  })
  @IsOptional()
  @IsEnum(['email', 'phone', 'credit_card', 'ssn', 'api_key', 'custom'])
  type?: string;

  @ApiPropertyOptional({
    description: 'Regex pattern as string for detecting PII',
    example: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  pattern?: string;

  @ApiPropertyOptional({
    description: 'Replacement text for redacting detected PII',
    example: '[EMAIL_REDACTED]',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  replacement?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of what this pattern detects',
    example: 'Updated description...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this pattern is enabled',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Locale/region for region-specific patterns',
    example: 'us',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({
    description: 'PII pattern status',
    enum: ['active', 'inactive'],
    example: 'inactive',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorizing PII patterns',
    example: ['common', 'gdpr', 'hipaa'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
