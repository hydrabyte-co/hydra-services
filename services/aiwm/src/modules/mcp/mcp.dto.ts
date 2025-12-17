import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

/**
 * MCP Tools List Request
 * Empty body as per MCP protocol
 */
export class McpToolsListRequest {
  // Empty - no parameters needed
}

/**
 * MCP Tool definition (subset of Tool schema for MCP protocol)
 */
export class McpTool {
  @ApiProperty({ description: 'Tool name', example: 'cbm_documents_createOne' })
  name: string;

  @ApiProperty({ description: 'Tool description' })
  description: string;

  @ApiProperty({
    description: 'JSON Schema for tool input parameters',
    example: {
      type: 'object',
      required: ['summary', 'content'],
      properties: {
        summary: { type: 'string', maxLength: 500 },
        content: { type: 'string' }
      }
    }
  })
  inputSchema: object;
}

/**
 * MCP Tools List Response
 */
export class McpToolsListResponse {
  @ApiProperty({ description: 'Array of available tools', type: [McpTool] })
  tools: McpTool[];
}

/**
 * MCP Tool Call Request
 */
export class McpToolCallRequest {
  @ApiProperty({ description: 'Tool name to execute', example: 'cbm_documents_createOne' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Tool arguments as key-value pairs',
    example: {
      summary: 'Meeting notes',
      content: 'Discussion about Q1 planning',
      type: 'markdown'
    }
  })
  @IsNotEmpty()
  @IsObject()
  arguments: Record<string, any>;
}

/**
 * MCP Content item
 */
export class McpContent {
  @ApiProperty({ description: 'Content type', example: 'text' })
  type: string;

  @ApiProperty({ description: 'Content text (JSON stringified for API responses)' })
  text: string;
}

/**
 * MCP Tool Call Response
 */
export class McpToolCallResponse {
  @ApiProperty({ description: 'Array of content items', type: [McpContent] })
  content: McpContent[];
}

/**
 * MCP Error Response
 */
export class McpErrorResponse {
  @ApiProperty({
    description: 'Error details',
    example: {
      code: 'TOOL_EXECUTION_FAILED',
      message: 'Failed to execute tool: cbm_documents_createOne',
      details: {
        statusCode: 400,
        message: 'Validation failed: summary is required'
      }
    }
  })
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * JSON-RPC 2.0 Request
 */
export class JsonRpcRequest {
  @ApiProperty({ description: 'JSON-RPC version', example: '2.0' })
  @IsString()
  @IsNotEmpty()
  jsonrpc: string;

  @ApiProperty({ description: 'Request ID', example: 0 })
  @IsNotEmpty()
  id: number | string;

  @ApiProperty({ description: 'Method name', example: 'initialize' })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiPropertyOptional({ description: 'Method parameters' })
  @IsOptional()
  params?: any;
}

/**
 * JSON-RPC 2.0 Success Response
 */
export class JsonRpcSuccessResponse {
  @ApiProperty({ description: 'JSON-RPC version', example: '2.0' })
  jsonrpc: string;

  @ApiProperty({ description: 'Request ID (same as request)', example: 0 })
  id: number | string;

  @ApiProperty({ description: 'Result data' })
  result: any;
}

/**
 * JSON-RPC 2.0 Error Response
 */
export class JsonRpcErrorResponse {
  @ApiProperty({ description: 'JSON-RPC version', example: '2.0' })
  jsonrpc: string;

  @ApiProperty({ description: 'Request ID (same as request)', example: 0 })
  id: number | string;

  @ApiProperty({
    description: 'Error object',
    example: {
      code: -32601,
      message: 'Method not found'
    }
  })
  error: {
    code: number;
    message: string;
    data?: any;
  };
}
