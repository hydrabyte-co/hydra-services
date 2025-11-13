import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType, DeploymentStatus } from '../../enum/websocket';
import { IDeploymentEvent } from '../../interfaces/websocket';

/**
 * Deployment status data
 */
export class DeploymentStatusDataDto {
  @IsString()
  @IsNotEmpty()
  deploymentId!: string;

  @IsString()
  @IsNotEmpty()
  nodeId!: string;

  // Status info
  @IsEnum(DeploymentStatus)
  status!: DeploymentStatus;

  @IsEnum(DeploymentStatus)
  @IsOptional()
  previousStatus?: DeploymentStatus;

  // Runtime info
  @IsString()
  @IsOptional()
  containerId?: string;

  @IsString()
  @IsOptional()
  containerName?: string;

  @IsString()
  @IsOptional()
  endpoint?: string;

  // Resource usage
  @IsString()
  @IsOptional()
  gpuDeviceId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  gpuMemoryUsed?: number; // MB

  @IsNumber()
  @Min(0)
  @IsOptional()
  cpuCores?: number;

  // Metrics
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalInferences?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  averageLatency?: number; // ms

  @IsNumber()
  @Min(0)
  @IsOptional()
  uptimeSeconds?: number;

  // Health
  @IsString()
  @IsOptional()
  lastHealthCheck?: string; // ISO 8601

  @IsEnum(['healthy', 'unhealthy', 'unknown'])
  @IsOptional()
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';

  // Events
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  @IsOptional()
  events?: IDeploymentEvent[];
}

/**
 * Deployment status message (Worker → Controller)
 */
export class DeploymentStatusDto {
  @IsEnum(MessageType)
  type!: MessageType.DEPLOYMENT_STATUS;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => DeploymentStatusDataDto)
  data!: DeploymentStatusDataDto;
}
