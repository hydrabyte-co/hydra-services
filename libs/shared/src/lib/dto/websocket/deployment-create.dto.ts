import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  ValidateNested,
  IsEnum,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType, ResourceType } from '../../enum/websocket';
import { IResourceIdentification, IMessageMetadata } from '../../interfaces/websocket';

/**
 * Deployment create command data
 */
export class DeploymentCreateDataDto {
  // Model info
  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @IsString()
  @IsNotEmpty()
  modelPath!: string; // S3/MinIO path

  // Container config
  @IsString()
  @IsNotEmpty()
  containerName!: string;

  @IsString()
  @IsNotEmpty()
  containerImage!: string;

  @IsNumber()
  @Min(1024)
  @Max(65535)
  containerPort!: number;

  // GPU allocation
  @IsString()
  @IsNotEmpty()
  gpuDeviceId!: string; // '0', '1', etc.

  @IsNumber()
  @Min(1024)
  @IsOptional()
  gpuMemoryLimit?: number; // MB

  // Runtime config
  @IsObject()
  @IsOptional()
  environment?: Record<string, string>;

  // Health check
  @IsString()
  @IsOptional()
  healthCheckPath?: string;

  @IsNumber()
  @Min(5)
  @IsOptional()
  healthCheckInterval?: number; // seconds

  // Execution tracking (optional)
  @IsString()
  @IsOptional()
  executionId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stepIndex?: number;
}

/**
 * Deployment create command message (Controller → Worker)
 */
export class DeploymentCreateDto {
  @IsEnum(MessageType)
  type!: MessageType.DEPLOYMENT_CREATE;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  resource!: IResourceIdentification; // { type: 'deployment', id: 'deploy-abc123' }

  @IsObject()
  @ValidateNested()
  @Type(() => DeploymentCreateDataDto)
  data!: DeploymentCreateDataDto;

  @IsOptional()
  @IsObject()
  metadata?: IMessageMetadata;
}
