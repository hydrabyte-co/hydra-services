import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsObject, IsArray, Min, ValidateNested, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResourceRequirements {
  @ApiProperty({ description: 'CPU cores required', example: 2 })
  @IsNumber()
  @Min(1)
  cpu: number;

  @ApiProperty({ description: 'Memory in GB required', example: 4 })
  @IsNumber()
  @Min(1)
  memory: number;

  @ApiProperty({ description: 'GPU count required', example: 1 })
  @IsNumber()
  @Min(0)
  gpu: number;

  @ApiProperty({ description: 'Storage in GB required', example: 10 })
  @IsNumber()
  @Min(1)
  storage: number;
}

export class DeploymentConfig {
  @ApiProperty({ description: 'Maximum tokens for generation', example: 1000 })
  @IsNumber()
  @Min(1)
  maxTokens: number;

  @ApiProperty({ description: 'Temperature for generation', example: 0.7 })
  @IsNumber()
  @Min(0)
  temperature: number;

  @ApiProperty({ description: 'Timeout in seconds', example: 30 })
  @IsNumber()
  @Min(1)
  timeout: number;

  @ApiProperty({ description: 'Concurrent requests', example: 5 })
  @IsNumber()
  @Min(1)
  concurrency: number;
}

export class DeploymentEvent {
  @ApiProperty({ description: 'Event timestamp' })
  @IsDate()
  timestamp: Date;

  @ApiProperty({ description: 'Event type', enum: ['info', 'warning', 'error'] })
  @IsEnum(['info', 'warning', 'error'])
  event: string;

  @ApiProperty({ description: 'Event message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Event severity', enum: ['info', 'warning', 'error'] })
  @IsEnum(['info', 'warning', 'error'])
  severity: string;
}

export class CreateDeploymentDto {
  @ApiProperty({ description: 'Unique deployment identifier' })
  @IsString()
  deploymentId: string;

  @ApiProperty({ description: 'Deployment name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Deployment description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Environment', enum: ['development', 'staging', 'production'] })
  @IsEnum(['development', 'staging', 'production'])
  environment: string;

  @ApiProperty({ description: 'Model ID to deploy' })
  @IsString()
  modelId: string;

  @ApiProperty({ description: 'Node ID to deploy on' })
  @IsString()
  nodeId: string;

  @ApiProperty({ description: 'Deployment type', enum: ['single', 'distributed', 'batch'] })
  @IsEnum(['single', 'distributed', 'batch'])
  deploymentType: string;

  @ApiProperty({ description: 'Number of replicas', default: 1 })
  @IsNumber()
  @Min(1)
  replicas?: number;

  @ApiProperty({ description: 'Hardware profile', enum: ['cpu', 'gpu', 'multi-gpu'], default: 'cpu' })
  @IsEnum(['cpu', 'gpu', 'multi-gpu'])
  hardwareProfile?: string;
}

export class UpdateDeploymentDto {
  @ApiProperty({ description: 'Deployment name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Deployment description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Environment', enum: ['development', 'staging', 'production'], required: false })
  @IsOptional()
  @IsEnum(['development', 'staging', 'production'])
  environment?: string;

  @ApiProperty({ description: 'Status', enum: ['queued', 'deploying', 'running', 'stopped', 'failed'], required: false })
  @IsOptional()
  @IsEnum(['queued', 'deploying', 'running', 'stopped', 'failed'])
  status?: string;

  @ApiProperty({ description: 'Model ID to deploy', required: false })
  @IsOptional()
  @IsString()
  modelId?: string;

  @ApiProperty({ description: 'Node ID to deploy on', required: false })
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiProperty({ description: 'Deployment type', enum: ['single', 'distributed', 'batch'], required: false })
  @IsOptional()
  @IsEnum(['single', 'distributed', 'batch'])
  deploymentType?: string;

  @ApiProperty({ description: 'Number of replicas', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  replicas?: number;

  @ApiProperty({ description: 'Hardware profile', enum: ['cpu', 'gpu', 'multi-gpu'], required: false })
  @IsOptional()
  @IsEnum(['cpu', 'gpu', 'multi-gpu'])
  hardwareProfile?: string;

  @ApiProperty({ description: 'Running status', required: false })
  @IsOptional()
  @IsBoolean()
  isRunning?: boolean;

  @ApiProperty({ description: 'Container name', required: false })
  @IsOptional()
  @IsString()
  containerName?: string;

  @ApiProperty({ description: 'Container port', required: false })
  @IsOptional()
  @IsNumber()
  containerPort?: number;

  @ApiProperty({ description: 'Endpoint URL', required: false })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiProperty({ description: 'Total inferences', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalInferences?: number;

  @ApiProperty({ description: 'Average latency in ms', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  averageLatency?: number;

  @ApiProperty({ description: 'Uptime in seconds', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  uptime?: number;

  @ApiProperty({ description: 'Last health check', required: false })
  @IsOptional()
  @IsDate()
  lastHealthCheck?: Date;

  @ApiProperty({ description: 'Deployment events', required: false, type: [DeploymentEvent] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  events?: DeploymentEvent[];
}