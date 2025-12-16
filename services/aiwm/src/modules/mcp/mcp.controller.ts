import { Controller, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@hydrabyte/base';
import { McpService } from './mcp.service';
import {
  McpToolsListRequest,
  McpToolsListResponse,
  McpToolCallRequest,
  McpToolCallResponse,
  McpErrorResponse,
} from './mcp.dto';

@ApiTags('MCP')
@Controller('mcp')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  /**
   * MCP tools/list endpoint
   * Returns filtered tools based on agent's allowedToolIds
   */
  @Post('tools/list')
  @HttpCode(200)
  @ApiOperation({
    summary: 'List available tools for authenticated agent',
    description: 'Returns tools filtered by agent allowedToolIds. Only type=api and status=active tools are included.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tools list retrieved successfully',
    type: McpToolsListResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing agent JWT',
  })
  @ApiResponse({
    status: 404,
    description: 'Agent not found',
  })
  async listTools(
    @Req() req: any,
    @Body() _body: McpToolsListRequest,
  ): Promise<McpToolsListResponse> {
    // Extract agentId from JWT payload (set by JwtAuthGuard)
    const agentId = req.user?.agentId;

    if (!agentId) {
      throw new Error('Agent ID not found in JWT payload');
    }

    return this.mcpService.listTools(agentId);
  }

  /**
   * MCP tools/call endpoint
   * Executes a tool by proxying to CBM service
   */
  @Post('tools/call')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Execute a tool',
    description: 'Executes the specified tool with given arguments. Proxies request to CBM service with agent JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tool executed successfully',
    type: McpToolCallResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid arguments or tool not in allowed list',
    type: McpErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing agent JWT',
  })
  @ApiResponse({
    status: 404,
    description: 'Tool not found or agent not found',
    type: McpErrorResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - Tool execution failed',
    type: McpErrorResponse,
  })
  async callTool(
    @Req() req: any,
    @Body() request: McpToolCallRequest,
  ): Promise<McpToolCallResponse> {
    // Extract agentId from JWT payload
    const agentId = req.user?.agentId;

    if (!agentId) {
      throw new Error('Agent ID not found in JWT payload');
    }

    // Extract agent JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header missing or invalid');
    }
    const agentToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    return this.mcpService.executeTool(agentId, agentToken, request);
  }
}
