import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsDate,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new project
 * MongoDB _id will be used as the primary identifier
 */
export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'Q1 2025 Product Launch',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Launch new product features for Q1 2025',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Array of member user IDs',
    example: ['user123', 'user456'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  members?: string[];

  @ApiPropertyOptional({
    description: 'Project start date',
    example: '2025-01-01T00:00:00.000Z',
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Project due date',
    example: '2025-03-31T23:59:59.000Z',
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['product', 'launch', 'q1'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Array of document IDs',
    example: ['doc123', 'doc456'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @ApiPropertyOptional({
    description: 'Project status',
    enum: ['draft', 'active', 'on_hold', 'completed', 'archived'],
    example: 'draft',
    default: 'draft',
  })
  @IsOptional()
  @IsEnum(['draft', 'active', 'on_hold', 'completed', 'archived'])
  status?: string;
}

/**
 * DTO for updating an existing project
 * All fields are optional
 */
export class UpdateProjectDto {
  @ApiPropertyOptional({
    description: 'Project name',
    example: 'Q1 2025 Product Launch - Updated',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Updated description...',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Array of member user IDs',
    example: ['user123', 'user456', 'user789'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  members?: string[];

  @ApiPropertyOptional({
    description: 'Project start date',
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Project due date',
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['product', 'launch', 'q1', 'priority'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Array of document IDs',
    example: ['doc123', 'doc456', 'doc789'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @ApiPropertyOptional({
    description: 'Project status',
    enum: ['draft', 'active', 'on_hold', 'completed', 'archived'],
    example: 'active',
  })
  @IsOptional()
  @IsEnum(['draft', 'active', 'on_hold', 'completed', 'archived'])
  status?: string;
}
