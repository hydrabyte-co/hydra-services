import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  ValidateIf,
  IsObject,
} from 'class-validator';

/**
 * DTO for creating a new model
 * MongoDB _id will be used as the primary identifier
 */
export class CreateModelDto {
  // Core fields (both deployment types)
  @ApiProperty({
    description: 'Model name (include version in name)',
    example: 'GPT-4.1-2024-11-20',
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Model type',
    enum: ['llm', 'vision', 'embedding', 'voice'],
    example: 'llm',
  })
  @IsEnum(['llm', 'vision', 'embedding', 'voice'])
  type!: string;

  @ApiProperty({
    description: 'Model description',
    example: 'OpenAI GPT-4.1 with 128K context and vision capabilities',
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @ApiProperty({
    description: 'Deployment type',
    enum: ['self-hosted', 'api-based'],
    example: 'api-based',
  })
  @IsEnum(['self-hosted', 'api-based'])
  deploymentType!: string;

  // Self-hosted specific fields (conditional validation)
  @ApiPropertyOptional({
    description: 'HuggingFace repository (required if deploymentType=self-hosted)',
    example: 'meta-llama/Llama-3-8B',
  })
  @ValidateIf((o) => o.deploymentType === 'self-hosted')
  @IsString()
  repository?: string;

  @ApiPropertyOptional({
    description: 'Model framework (required if deploymentType=self-hosted)',
    enum: ['vllm', 'triton'],
    example: 'vllm',
  })
  @ValidateIf((o) => o.deploymentType === 'self-hosted')
  @IsEnum(['vllm', 'triton'])
  framework?: string;

  @ApiPropertyOptional({
    description: 'Model file name (required if deploymentType=self-hosted)',
    example: 'model.safetensors',
  })
  @ValidateIf((o) => o.deploymentType === 'self-hosted')
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes (required if deploymentType=self-hosted)',
    example: 8589934592,
  })
  @ValidateIf((o) => o.deploymentType === 'self-hosted')
  @IsNumber()
  @Min(1)
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'Download path for model files',
    example: '/models/llama-3-8b',
  })
  @IsOptional()
  @IsString()
  downloadPath?: string;

  @ApiPropertyOptional({
    description: 'GPU node ID for deployment',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  nodeId?: string;

  // API-based specific fields (conditional validation)
  @ApiPropertyOptional({
    description: 'AI provider (required if deploymentType=api-based)',
    example: 'openai',
  })
  @ValidateIf((o) => o.deploymentType === 'api-based')
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    description: 'API endpoint URL (required if deploymentType=api-based)',
    example: 'https://api.openai.com/v1',
  })
  @ValidateIf((o) => o.deploymentType === 'api-based')
  @IsString()
  apiEndpoint?: string;

  @ApiPropertyOptional({
    description: 'Model identifier in provider API (required if deploymentType=api-based)',
    example: 'gpt-4-turbo-2024-11-20',
  })
  @ValidateIf((o) => o.deploymentType === 'api-based')
  @IsString()
  modelIdentifier?: string;

  @ApiPropertyOptional({
    description: 'API authentication and configuration (required if deploymentType=api-based)',
    example: {
      apiKey: 'sk-...',
      organization: 'org-...',
      customHeader: 'value',
      rateLimit: '100'
    },
  })
  @IsOptional()
  @IsObject()
  apiConfig?: Record<string, string>;

  // Status is auto-initialized: self-hosted → 'queued', api-based → 'validating'
  // Common optional fields

  @ApiPropertyOptional({
    description: 'Access scope',
    enum: ['public', 'org', 'private'],
    example: 'public',
    default: 'public',
  })
  @IsOptional()
  @IsEnum(['public', 'org', 'private'])
  scope?: string;
}

/**
 * DTO for updating an existing model
 * All fields are optional
 */
export class UpdateModelDto {
  @ApiPropertyOptional({
    description: 'Model name (include version in name)',
    example: 'GPT-4.1-2024-12-01',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Model description',
    example: 'Updated description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Model type',
    enum: ['llm', 'vision', 'embedding', 'voice'],
    example: 'llm',
  })
  @IsOptional()
  @IsEnum(['llm', 'vision', 'embedding', 'voice'])
  type?: string;

  @ApiPropertyOptional({
    description: 'HuggingFace repository',
    example: 'meta-llama/Llama-3.1-8B-Instruct',
  })
  @IsOptional()
  @IsString()
  repository?: string;

  @ApiPropertyOptional({
    description: 'Model framework',
    enum: ['vllm', 'triton'],
    example: 'vllm',
  })
  @IsOptional()
  @IsEnum(['vllm', 'triton'])
  framework?: string;

  @ApiPropertyOptional({
    description: 'Model file name',
    example: 'model.safetensors',
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 8589934592,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'Download path',
    example: '/models/llama-3-8b-updated',
  })
  @IsOptional()
  @IsString()
  downloadPath?: string;

  @ApiPropertyOptional({
    description: 'GPU node ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiPropertyOptional({
    description: 'AI provider',
    example: 'openai',
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    description: 'API endpoint URL',
    example: 'https://api.openai.com/v2',
  })
  @IsOptional()
  @IsString()
  apiEndpoint?: string;

  @ApiPropertyOptional({
    description: 'Model identifier in provider API',
    example: 'gpt-4-turbo-2024-12-01',
  })
  @IsOptional()
  @IsString()
  modelIdentifier?: string;

  @ApiPropertyOptional({
    description: 'API authentication and configuration',
    example: {
      apiKey: 'sk-updated...',
      organization: 'org-updated...',
      customHeader: 'new-value'
    },
  })
  @IsOptional()
  @IsObject()
  apiConfig?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Model status (use activate/deactivate APIs instead of direct update)',
    enum: [
      'queued', 'downloading', 'downloaded', 'deploying', 'active', 'inactive',
      'download-failed', 'deploy-failed', 'validating', 'invalid-credentials', 'error'
    ],
    example: 'active',
  })
  @IsOptional()
  @IsEnum([
    'queued', 'downloading', 'downloaded', 'deploying', 'active', 'inactive',
    'download-failed', 'deploy-failed', 'validating', 'invalid-credentials', 'error'
  ])
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
