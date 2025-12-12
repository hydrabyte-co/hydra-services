import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new agent - MVP Minimal Version
 */
export class CreateAgentDto {
  @ApiProperty({ description: 'Agent name', example: 'Customer Support Agent' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Agent description', example: 'AI agent for customer support' })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Agent status',
    enum: ['active', 'inactive', 'busy'],
    example: 'active'
  })
  @IsEnum(['active', 'inactive', 'busy'])
  status: string;

  @ApiPropertyOptional({ description: 'Instruction ID (optional)', required: false })
  @IsOptional()
  @IsString()
  instructionId?: string;

  @ApiPropertyOptional({ description: 'Guardrail ID (optional)', required: false })
  @IsOptional()
  @IsString()
  guardrailId?: string;

  @ApiProperty({ description: 'Node ID where agent runs', example: 'node-gpu-001' })
  @IsString()
  nodeId: string;

  @ApiPropertyOptional({ description: 'Agent tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * DTO for updating an existing agent - MVP Minimal Version
 */
export class UpdateAgentDto {
  @ApiPropertyOptional({ description: 'Agent name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Agent description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Agent status',
    enum: ['active', 'inactive', 'busy'],
    required: false
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'busy'])
  status?: string;

  @ApiPropertyOptional({ description: 'Instruction ID', required: false })
  @IsOptional()
  @IsString()
  instructionId?: string;

  @ApiPropertyOptional({ description: 'Guardrail ID', required: false })
  @IsOptional()
  @IsString()
  guardrailId?: string;

  @ApiPropertyOptional({ description: 'Node ID', required: false })
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiPropertyOptional({ description: 'Agent tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
