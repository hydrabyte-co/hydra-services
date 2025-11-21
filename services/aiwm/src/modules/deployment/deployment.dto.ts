import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

/**
 * DTO for creating a new deployment
 * MongoDB _id will be used as the primary identifier
 */
export class CreateDeploymentDto {
  @ApiProperty({
    description: 'Deployment name',
    example: 'Llama 3.1 8B - Production',
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Deployment description',
    example: 'Production deployment of Llama 3.1 8B model on GPU node 1',
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @ApiProperty({
    description: 'Model ID to deploy (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  modelId!: string;

  @ApiProperty({
    description: 'Node ID to deploy on (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  nodeId!: string;

  // Optional fields for advanced configuration
  @ApiPropertyOptional({
    description: 'GPU device IDs to use',
    example: '0',
  })
  @IsOptional()
  @IsString()
  gpuDevice?: string;

  @ApiPropertyOptional({
    description: 'Docker image to use for deployment',
    example: 'nvcr.io/nvidia/tritonserver:24.01',
  })
  @IsOptional()
  @IsString()
  dockerImage?: string;

  @ApiPropertyOptional({
    description: 'Container port (1024-65535)',
    example: 8000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1024)
  @Max(65535)
  containerPort?: number;

  @ApiPropertyOptional({
    description: 'Deployment status',
    enum: ['queued', 'deploying', 'running', 'stopping', 'stopped', 'failed', 'error'],
    example: 'queued',
    default: 'queued',
  })
  @IsOptional()
  @IsEnum(['queued', 'deploying', 'running', 'stopping', 'stopped', 'failed', 'error'])
  status?: string;
}

/**
 * DTO for updating an existing deployment
 * All fields are optional
 */
export class UpdateDeploymentDto {
  @ApiPropertyOptional({
    description: 'Deployment name',
    example: 'Llama 3.1 8B - Production Updated',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Deployment description',
    example: 'Updated description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Deployment status',
    enum: ['queued', 'deploying', 'running', 'stopping', 'stopped', 'failed', 'error'],
    example: 'running',
  })
  @IsOptional()
  @IsEnum(['queued', 'deploying', 'running', 'stopping', 'stopped', 'failed', 'error'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Container ID',
    example: 'abc123def456',
  })
  @IsOptional()
  @IsString()
  containerId?: string;

  @ApiPropertyOptional({
    description: 'Container name',
    example: 'deployment-507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  containerName?: string;

  @ApiPropertyOptional({
    description: 'Docker image used',
    example: 'nvcr.io/nvidia/tritonserver:24.01',
  })
  @IsOptional()
  @IsString()
  dockerImage?: string;

  @ApiPropertyOptional({
    description: 'Container port',
    example: 8000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1024)
  @Max(65535)
  containerPort?: number;

  @ApiPropertyOptional({
    description: 'GPU device IDs',
    example: '0,1',
  })
  @IsOptional()
  @IsString()
  gpuDevice?: string;

  @ApiPropertyOptional({
    description: 'API endpoint URL',
    example: 'http://192.168.1.100:8000/v1/models/llama-3.1-8b',
  })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({
    description: 'Error message',
    example: 'Failed to allocate GPU memory',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Last health check timestamp',
    example: '2025-01-20T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  lastHealthCheck?: Date;
}
