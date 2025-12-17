import { IsString, IsEnum, IsArray, IsOptional, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Tool } from '../tool/tool.schema';
import { Instruction } from '../instruction/instruction.schema';

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
    enum: ['active', 'inactive', 'busy', 'suspended'],
    example: 'active'
  })
  @IsEnum(['active', 'inactive', 'busy', 'suspended'])
  status: string;

  @ApiPropertyOptional({
    description: 'Agent type',
    enum: ['managed', 'autonomous'],
    example: 'managed',
    required: false
  })
  @IsOptional()
  @IsEnum(['managed', 'autonomous'])
  type?: string;

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

  @ApiPropertyOptional({ description: 'Secret for agent authentication (will be hashed)', required: false })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ description: 'Allowed tool IDs (whitelist)', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedToolIds?: string[];

  @ApiPropertyOptional({
    description: 'Runtime configuration with flat structure using prefixes (auth_, claude_, discord_, telegram_)',
    required: false,
    example: {
      auth_roles: ['agent'],
      claude_model: 'claude-3-5-sonnet-latest',
      claude_maxTurns: 100,
      claude_permissionMode: 'bypassPermissions',
      discord_token: 'xxx',
      discord_channelIds: ['123', '456']
    }
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
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
    enum: ['active', 'inactive', 'busy', 'suspended'],
    required: false
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'busy', 'suspended'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Agent type',
    enum: ['managed', 'autonomous'],
    required: false
  })
  @IsOptional()
  @IsEnum(['managed', 'autonomous'])
  type?: string;

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

  @ApiPropertyOptional({ description: 'Allowed tool IDs (whitelist)', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedToolIds?: string[];

  @ApiPropertyOptional({
    description: 'Runtime configuration with flat structure using prefixes (auth_, claude_, discord_, telegram_)',
    required: false,
    example: {
      auth_roles: ['agent'],
      claude_model: 'claude-3-5-sonnet-latest',
      claude_maxTurns: 100,
      claude_permissionMode: 'bypassPermissions',
      discord_token: 'xxx',
      discord_channelIds: ['123', '456']
    }
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

/**
 * DTO for agent connection/authentication
 */
export class AgentConnectDto {
  @ApiProperty({ description: 'Agent secret for authentication', example: 'agent-secret-key-here' })
  @IsNotEmpty()
  @IsString()
  secret: string;
}

/**
 * Response DTO for agent connection
 * Matches IAM TokenData structure with agent-specific additions
 */
export class AgentConnectResponseDto {
  @ApiProperty({ description: 'JWT access token (contains agentId, username, roles, orgId)', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ description: 'Token expiration time in seconds', example: 86400 })
  expiresIn: number;

  @ApiProperty({ description: 'Refresh token (not implemented for agents)', example: null, nullable: true })
  refreshToken: string | null;

  @ApiProperty({ description: 'Refresh token expiration in seconds', example: 0 })
  refreshExpiresIn: number;

  @ApiProperty({ description: 'Token type', example: 'bearer' })
  tokenType: string;

  @ApiProperty({
    description: 'MCP server configurations (HTTP transport format)',
    example: {
      'cbm-tools': {
        type: 'http',
        url: 'http://localhost:3305/mcp',
        headers: { Authorization: 'Bearer ...' }
      }
    }
  })
  mcpServers: Record<string, {
    type: string;
    url: string;
    headers: Record<string, string>;
  }>;

  @ApiProperty({ description: 'Merged instruction text for agent' })
  instruction: string;

  @ApiProperty({ description: 'Agent runtime settings/configuration' })
  settings: Record<string, unknown>;
}

/**
 * DTO for agent heartbeat
 */
export class AgentHeartbeatDto {
  @ApiProperty({
    description: 'Current agent status',
    enum: ['online', 'busy', 'idle'],
    example: 'online'
  })
  @IsEnum(['online', 'busy', 'idle'])
  status: string;

  @ApiPropertyOptional({ description: 'Optional metrics', required: false })
  @IsOptional()
  @IsObject()
  metrics?: Record<string, unknown>;
}

/**
 * Response DTO for credentials regeneration
 */
export class AgentCredentialsResponseDto {
  @ApiProperty({ description: 'Agent ID' })
  agentId: string;

  @ApiProperty({ description: 'Plain text secret (show only once)' })
  secret: string;

  @ApiProperty({ description: 'Pre-formatted .env configuration snippet' })
  envConfig: string;

  @ApiProperty({ description: 'Installation script (placeholder/sample)' })
  installScript: string;
}
