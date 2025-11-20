import { IsString, IsEnum, IsArray, IsNumber, IsBoolean, IsOptional, IsObject, ValidateNested, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AgentConfiguration {
  @ApiProperty({ description: 'Model ID to use for agent', example: 'model-123' })
  @IsString()
  modelId: string;

  @ApiProperty({ description: 'Maximum tokens per response', example: 1000 })
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

  @ApiProperty({ description: 'Maximum retry attempts', example: 3 })
  @IsNumber()
  @Min(0)
  maxRetries: number;
}

export class CreateAgentDto {
  @ApiProperty({ description: 'Unique agent identifier' })
  @IsString()
  agentId: string;

  @ApiProperty({ description: 'Agent name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Agent description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Agent role' })
  @IsString()
  role: string;

  @ApiProperty({ description: 'Agent status', enum: ['active', 'inactive', 'busy'] })
  @IsEnum(['active', 'inactive', 'busy'])
  status: string;

  @ApiProperty({ description: 'Agent capabilities', type: [String] })
  @IsArray()
  @IsString({ each: true })
  capabilities: string[];

  @ApiProperty({ description: 'Agent configuration', type: AgentConfiguration })
  @IsObject()
  @ValidateNested()
  configuration: AgentConfiguration;

  @ApiProperty({ description: 'Instruction ID (optional)', required: false })
  @IsOptional()
  @IsString()
  instructionId?: string;

  @ApiProperty({ description: 'Node ID where agent runs' })
  @IsString()
  nodeId: string;

  @ApiProperty({ description: 'Agent permissions', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiProperty({ description: 'Agent tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateAgentDto {
  @ApiProperty({ description: 'Agent name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Agent description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Agent role', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: 'Agent status', enum: ['active', 'inactive', 'busy'], required: false })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'busy'])
  status?: string;

  @ApiProperty({ description: 'Agent capabilities', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @ApiProperty({ description: 'Agent configuration', required: false, type: AgentConfiguration })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  configuration?: AgentConfiguration;

  @ApiProperty({ description: 'Instruction ID', required: false })
  @IsOptional()
  @IsString()
  instructionId?: string;

  @ApiProperty({ description: 'Node ID', required: false })
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiProperty({ description: 'Agent permissions', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiProperty({ description: 'Agent tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Active status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}