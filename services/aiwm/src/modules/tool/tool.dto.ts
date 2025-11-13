import { IsString, IsEnum, IsArray, IsBoolean, IsOptional, IsObject, ValidateNested, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToolParameters {
  @ApiProperty({ description: 'Parameter type', enum: ['object', 'array'] })
  @IsEnum(['object', 'array'])
  type: string;

  @ApiProperty({ description: 'Parameter properties schema' })
  @IsObject()
  properties: Record<string, any>;

  @ApiProperty({ description: 'Required parameter names' })
  @IsArray()
  @IsString({ each: true })
  required: string[];
}

export class ToolResponseFormat {
  @ApiProperty({ description: 'Response type', enum: ['object', 'array', 'string', 'number', 'boolean'] })
  @IsEnum(['object', 'array', 'string', 'number', 'boolean'])
  type: string;

  @ApiProperty({ description: 'Response schema' })
  @IsObject()
  schema: Record<string, any>;
}

export class ToolUsage {
  @ApiProperty({ description: 'Usage timestamp' })
  @IsObject()
  timestamp: Date;

  @ApiProperty({ description: 'Agent ID that used the tool' })
  @IsString()
  agentId: string;

  @ApiProperty({ description: 'Arguments used' })
  @IsObject()
  arguments: Record<string, any>;

  @ApiProperty({ description: 'Tool result' })
  @IsObject()
  result: any;

  @ApiProperty({ description: 'Response latency in ms' })
  @IsNumber()
  latency: number;

  @ApiProperty({ description: 'Whether usage was successful' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Error message if failed', required: false })
  @IsOptional()
  @IsString()
  error?: string;
}

export class ToolExample {
  @ApiProperty({ description: 'Example title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Example description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Example arguments' })
  @IsObject()
  arguments: Record<string, any>;

  @ApiProperty({ description: 'Expected output' })
  @IsObject()
  expectedOutput: any;
}

export class CreateToolDto {
  @ApiProperty({ description: 'Unique tool identifier' })
  @IsString()
  toolId: string;

  @ApiProperty({ description: 'Tool name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tool description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Tool type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Tool category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Tool provider' })
  @IsString()
  provider: string;

  @ApiProperty({ description: 'Tool endpoint URL' })
  @IsString()
  endpoint: string;

  @ApiProperty({ description: 'Tool version' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Tool status', enum: ['active', 'inactive', 'deprecated'] })
  @IsEnum(['active', 'inactive', 'deprecated'])
  status: string;

  @ApiProperty({ description: 'Tool parameters', type: ToolParameters })
  @IsObject()
  @ValidateNested()
  parameters: ToolParameters;

  @ApiProperty({ description: 'Response format', type: ToolResponseFormat })
  @IsObject()
  @ValidateNested()
  responseFormat: ToolResponseFormat;

  @ApiProperty({ description: 'Tool tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateToolDto {
  @ApiProperty({ description: 'Tool name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Tool description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Tool status', enum: ['active', 'inactive', 'deprecated'], required: false })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'deprecated'])
  status?: string;

  @ApiProperty({ description: 'Tool parameters', required: false, type: ToolParameters })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  parameters?: ToolParameters;

  @ApiProperty({ description: 'Response format', required: false, type: ToolResponseFormat })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  responseFormat?: ToolResponseFormat;

  @ApiProperty({ description: 'Tool version', required: false })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ description: 'Tool endpoint', required: false })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiProperty({ description: 'Tool tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Documentation URL', required: false })
  @IsOptional()
  @IsString()
  documentation?: string;
}