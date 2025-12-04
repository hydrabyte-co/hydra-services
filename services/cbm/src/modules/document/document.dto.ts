import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new document
 * MongoDB _id will be used as the primary identifier
 */
export class CreateDocumentDto {
  @ApiProperty({
    description: 'Document summary/title',
    example: 'API Integration Guide',
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary!: string;

  @ApiProperty({
    description: 'Document main content',
    example: 'This guide explains how to integrate with our REST API...',
  })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiProperty({
    description: 'Content type',
    enum: ['html', 'text', 'markdown', 'json'],
    example: 'markdown',
  })
  @IsEnum(['html', 'text', 'markdown', 'json'])
  type!: string;

  @ApiProperty({
    description: 'Labels for categorization and search',
    example: ['api', 'guide', 'integration'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  labels!: string[];

  @ApiPropertyOptional({
    description: 'Document status',
    enum: ['draft', 'published', 'archived'],
    example: 'draft',
    default: 'draft',
  })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Access scope',
    enum: ['public', 'org', 'private'],
    example: 'private',
    default: 'private',
  })
  @IsOptional()
  @IsEnum(['public', 'org', 'private'])
  scope?: string;
}

/**
 * DTO for updating an existing document
 * All fields are optional
 */
export class UpdateDocumentDto {
  @ApiPropertyOptional({
    description: 'Document summary/title',
    example: 'Updated API Integration Guide',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional({
    description: 'Document main content',
    example: 'Updated content...',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({
    description: 'Content type',
    enum: ['html', 'text', 'markdown', 'json'],
    example: 'markdown',
  })
  @IsOptional()
  @IsEnum(['html', 'text', 'markdown', 'json'])
  type?: string;

  @ApiPropertyOptional({
    description: 'Labels for categorization and search',
    example: ['api', 'guide', 'integration', 'rest'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiPropertyOptional({
    description: 'Document status',
    enum: ['draft', 'published', 'archived'],
    example: 'published',
  })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Access scope',
    enum: ['public', 'org', 'private'],
    example: 'org',
  })
  @IsOptional()
  @IsEnum(['public', 'org', 'private'])
  scope?: string;
}
