import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsArray, IsObject, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ModelConfig {
  @ApiProperty({ description: 'Maximum input size', example: 512 })
  @IsNumber()
  @Min(1)
  inputSize: number;

  @ApiProperty({ description: 'Maximum output size', example: 256 })
  @IsNumber()
  @Min(1)
  outputSize: number;

  @ApiProperty({ description: 'Required memory in GB', example: 4 })
  @IsNumber()
  @Min(1)
  memoryRequired: number;

  @ApiProperty({ description: 'Batch size', example: 1 })
  @IsNumber()
  @Min(1)
  batchSize: number;

  @ApiProperty({ description: 'Temperature for generation', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  temperature?: number;

  @ApiProperty({ description: 'Top-k sampling parameter', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  topK?: number;

  @ApiProperty({ description: 'Top-p sampling parameter', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;
}

export class CreateModelDto {
  @ApiProperty({ description: 'Unique model identifier' })
  @IsString()
  modelId: string;

  @ApiProperty({ description: 'Model name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Model description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Model version', example: '1.0.0' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Model type', enum: ['llm', 'diffusion', 'embedding', 'classifier'] })
  @IsEnum(['llm', 'diffusion', 'embedding', 'classifier'])
  type: string;

  @ApiProperty({ description: 'Model framework', enum: ['pytorch', 'tensorflow', 'onnx', 'huggingface'] })
  @IsEnum(['pytorch', 'tensorflow', 'onnx', 'huggingface'])
  framework: string;

  @ApiProperty({ description: 'Repository URL' })
  @IsString()
  repository: string;

  @ApiProperty({ description: 'Model file name' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiProperty({ description: 'Node ID where model is stored' })
  @IsString()
  nodeId: string;

  @ApiProperty({ description: 'Model tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Model configuration', required: true, type: ModelConfig })
  @IsObject()
  config: ModelConfig;
}

export class UpdateModelDto {
  @ApiProperty({ description: 'Model name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Model description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Model version', required: false })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ description: 'Model type', enum: ['llm', 'diffusion', 'embedding', 'classifier'], required: false })
  @IsOptional()
  @IsEnum(['llm', 'diffusion', 'embedding', 'classifier'])
  type?: string;

  @ApiProperty({ description: 'Model framework', enum: ['pytorch', 'tensorflow', 'onnx', 'huggingface'], required: false })
  @IsOptional()
  @IsEnum(['pytorch', 'tensorflow', 'onnx', 'huggingface'])
  framework?: string;

  @ApiProperty({ description: 'Repository URL', required: false })
  @IsOptional()
  @IsString()
  repository?: string;

  @ApiProperty({ description: 'Model file name', required: false })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({ description: 'File size in bytes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  fileSize?: number;

  @ApiProperty({ description: 'Download status', required: false })
  @IsOptional()
  @IsBoolean()
  isDownloaded?: boolean;

  @ApiProperty({ description: 'Download path', required: false })
  @IsOptional()
  @IsString()
  downloadPath?: string;

  @ApiProperty({ description: 'Active status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Model status', enum: ['queued', 'downloading', 'downloaded', 'failed'], required: false })
  @IsOptional()
  @IsEnum(['queued', 'downloading', 'downloaded', 'failed'])
  status?: string;

  @ApiProperty({ description: 'Download progress percentage', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  downloadProgress?: number;

  @ApiProperty({ description: 'Node ID', required: false })
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiProperty({ description: 'Model tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Model configuration', required: false, type: ModelConfig })
  @IsOptional()
  @IsObject()
  config?: ModelConfig;
}