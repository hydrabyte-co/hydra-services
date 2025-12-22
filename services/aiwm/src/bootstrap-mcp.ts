/**
 * MCP Server Bootstrap
 * Standalone MCP protocol server for AI agent integration
 *
 * Step-by-step implementation:
 * 1. NestJS Standalone with DB/Cache connection logging
 * 2. Basic MCP Server with SDK
 * 3. Tool registration and handler logic
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './app/app.module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { randomUUID } from 'node:crypto';
import { ToolService } from './modules/tool/tool.service';
import { AgentService } from './modules/agent/agent.service';
import { ConfigurationService } from './modules/configuration/configuration.service';
import { ConfigKey as ConfigKeyEnum } from './modules/configuration/enums/config-key.enum';
import { RequestContext } from '@hydrabyte/shared';
import { Types } from 'mongoose';
import * as z from 'zod';
import { Tool } from './modules/tool/tool.schema';
import { getBuiltInToolsByCategory } from './mcp/builtin';
import { ExecutionContext as BuiltInExecutionContext } from './mcp/types';

const logger = new Logger('McpBootstrap');
const MCP_PORT = process.env.MCP_PORT
  ? parseInt(process.env.MCP_PORT || process.env.PORT, 10)
  : 3306;

export async function bootstrapMcpServer() {
  logger.log('=== Step 1: Starting NestJS Application Context ===');

  // Create NestJS application context (DI only, no HTTP server)
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  logger.log('✅ NestJS application context created successfully');

  // Log connection information
  const mongoUri = process.env.MONGODB_URI || 'mongodb://172.16.3.20:27017';
  const redisHost = process.env.REDIS_HOST || '172.16.2.100';
  const redisPort = process.env.REDIS_PORT || '6379';

  logger.log(`💾 MongoDB: ${mongoUri}`);
  logger.log(`📊 Redis: ${redisHost}:${redisPort}`);
  logger.log(`✅ Step 1 completed - NestJS context running`);

  // Step 2: Create MCP Server
  logger.log('=== Step 2: Creating MCP Server with SDK ===');

  const mcpServer = new McpServer({
    name: 'aiwm-mcp-server',
    version: '1.0.0',
    description: 'AIWM MCP Server for AI agent integration',
    websiteUrl: 'https://x-or.cloud',
  });

  logger.log('✅ MCP Server instance created');

  // Step 2.1: Get services from NestJS context
  const jwtService = app.get(JwtService);
  const toolService = app.get(ToolService);
  const agentService = app.get(AgentService);
  const configService = app.get(ConfigurationService);
  logger.log('✅ Services injected from NestJS context');

  // Step 3: Helper function to validate bearer token
  const validateBearerToken = async (
    authHeader: string | undefined
  ): Promise<any> => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header');
    }
    const token = authHeader.substring(7);
    try {
      const decoded = await jwtService.verifyAsync(token);
      return decoded;
    } catch (error) {
      logger.error('JWT verification failed:', error.message);
      // Don't log token for security reasons
      throw new Error(`Invalid or expired token: ${error.message}`);
    }
  };

  // Step 3.0: Helper function to execute API tools
  const executeApiTool = async (tool: any, args: any, tokenPayload: any) => {
    const execution = tool.execution;
    if (!execution) {
      throw new Error(`Tool ${tool.name} has no execution configuration`);
    }

    const {
      method,
      baseUrl,
      path,
      headers = {},
      authRequired = true,
    } = execution;

    // Replace path parameters with arguments
    let finalPath = path;
    for (const [key, value] of Object.entries(args)) {
      finalPath = finalPath.replace(
        `{${key}}`,
        encodeURIComponent(String(value))
      );
    }

    // Build full URL
    const url = `${baseUrl}${finalPath}`;

    // Prepare headers
    const requestHeaders: Record<string, string> = { ...headers };

    // Add JWT token if required
    if (authRequired && tokenPayload) {
      // Generate a new JWT token for the agent to call the service
      const jwtService = app.get(JwtService);
      const serviceToken = await jwtService.signAsync({
        sub: tokenPayload.sub,
        username: tokenPayload.username,
        status: tokenPayload.status,
        roles: tokenPayload.roles,
        orgId: tokenPayload.orgId,
        groupId: tokenPayload.groupId,
        agentId: tokenPayload.agentId,
        userId: tokenPayload.userId,
        type: tokenPayload.type,
      });
      requestHeaders['Authorization'] = `Bearer ${serviceToken}`;
    }

    logger.log(`📡 Calling API: ${method} ${url}`);

    // Log headers without exposing token
    const sanitizedHeaders = { ...requestHeaders };
    if (sanitizedHeaders['Authorization']) {
      sanitizedHeaders['Authorization'] = 'Bearer ***';
    }
    logger.debug(`Headers:`, sanitizedHeaders);

    // Make HTTP request
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API call failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // Get response content
    const contentType = response.headers.get('content-type') || '';
    let content: string;

    if (contentType.includes('application/json')) {
      const json = await response.json();
      content = JSON.stringify(json, null, 2);
    } else {
      content = await response.text();
    }

    logger.log(
      `✅ API call successful, response length: ${content.length} bytes`
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: content,
        },
      ],
    };
  };

  // Helper function to fetch service URLs from configuration
  const fetchServiceUrls = async (orgId: string, context: RequestContext) => {
    let cbmBaseUrl = 'http://localhost:3001'; // Default fallback
    try {
      logger.debug(`🔍 Fetching config key: ${ConfigKeyEnum.CBM_BASE_API_URL} for org: ${orgId}`);
      const cbmConfig = await configService.findByKey(ConfigKeyEnum.CBM_BASE_API_URL as any, context);

      logger.debug(`🔍 Config result:`, cbmConfig);

      if (cbmConfig && cbmConfig.value) {
        cbmBaseUrl = cbmConfig.value;
        logger.log(`📍 CBM Base URL from config: ${cbmBaseUrl}`);
      } else {
        logger.warn(`⚠️  No config found for key: ${ConfigKeyEnum.CBM_BASE_API_URL}, using default: ${cbmBaseUrl}`);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Error fetching CBM base URL from config:`, errorMsg);
      logger.warn(`⚠️  Using default CBM Base URL: ${cbmBaseUrl}`);
    }

    return { cbmBaseUrl };
  };

  // Step 3.1: Function to load and register tools for agent
  const registerToolsForAgent = async (tokenPayload: any, bearerToken: string) => {
    const { orgId, agentId, userId, roles, groupId } = tokenPayload;

    logger.log(`📋 Loading tools for agent: ${agentId} (org: ${orgId})`);

    // Build request context from token payload
    const context: RequestContext = {
      userId: userId || '',
      orgId: orgId || '',
      agentId: agentId || '',
      groupId: groupId || '',
      appId: '',
      roles: roles || [],
    };

    // Step 1: Fetch agent to get allowedToolIds
    const agent = await agentService.findById(agentId, context);
    if (!agent) {
      logger.warn(`Agent not found: ${agentId}`);
      return;
    }

    logger.log(
      `✅ Agent found: ${agent.name}, allowedToolIds: ${
        agent.allowedToolIds?.length || 0
      }`
    );

    // Step 2: If no allowed tools, skip registration
    if (!agent.allowedToolIds || agent.allowedToolIds.length === 0) {
      logger.log(`⚠️  Agent has no allowed tools, skipping registration`);
      return;
    }

    // Step 3: Convert string IDs to ObjectId for MongoDB query
    const toolObjectIds = agent.allowedToolIds;

    // Step 4: Fetch active tools from allowedToolIds whitelist
    const toolFilter = {
      //_id: { $in: toolObjectIds },
      status: 'active',
      //"owner.orgId": orgId,
      //isDeleted: false,
    };
    let tools: Tool[] = [];
    const findToolResult = await toolService.findAll(
      {
        ...toolFilter,
        limit: 100,
      },
      context
    );
    logger.log(`✅ Tool query returned ${findToolResult.pagination.total} total tools`, findToolResult.data.map(t => ({id: (t as any)._id, name: t.name, type: t.type})));
    if (findToolResult) {
      tools = findToolResult.data.filter((tool: any) =>
        toolObjectIds.some((id) => {
          logger.debug(`Comparing tool ID ${id.toString()} with tool._id ${tool._id.toString()} -> ${id.toString() === tool._id.toString()}`);
          return id.toString() === tool._id.toString();
        })
      );
    }
    logger.log(
      `✅ Found ${
        tools.length
      } active tools from allowedToolIds: ${agent.allowedToolIds.join(', ')}`
    );

    // Register each tool with MCP server
    for (const tool of tools) {
      // Handle builtin tools differently - register all sub-tools from category
      if (tool.type === 'builtin') {
        // Get all builtin tools in this category (e.g., DocumentManagement)
        const builtinTools = getBuiltInToolsByCategory(tool.name);

        if (builtinTools.length === 0) {
          logger.warn(`⚠️  No builtin tools found for category: ${tool.name}`);
          continue;
        }

        logger.log(`📦 Registering ${builtinTools.length} builtin tools from category: ${tool.name}`);

        // Register each sub-tool
        for (const builtinTool of builtinTools) {
          mcpServer.registerTool(
            builtinTool.name,
            {
              title: builtinTool.name,
              description: builtinTool.description,
              inputSchema: builtinTool.inputSchema,
            },
            async (args) => {
              logger.log(`🔧 Executing builtin tool: ${builtinTool.name}`);
              logger.debug(`Tool args:`, args);

              try {
                // Fetch service URLs dynamically on each execution
                const context: RequestContext = {
                  userId: tokenPayload.userId || tokenPayload.sub || '',
                  orgId: tokenPayload.orgId || '',
                  agentId: tokenPayload.agentId || '',
                  groupId: tokenPayload.groupId || '',
                  appId: '',
                  roles: tokenPayload.roles || [],
                };

                const serviceUrls = await fetchServiceUrls(tokenPayload.orgId, context);
                logger.debug(`🔍 Service URLs fetched for execution:`, serviceUrls);

                // Build execution context from token payload
                const executionContext: BuiltInExecutionContext = {
                  token: bearerToken,
                  userId: tokenPayload.userId || tokenPayload.sub,
                  orgId: tokenPayload.orgId,
                  agentId: tokenPayload.agentId,
                  groupId: tokenPayload.groupId,
                  roles: tokenPayload.roles,
                  cbmBaseUrl: serviceUrls.cbmBaseUrl, // Service URLs from configuration
                };

                return await builtinTool.executor(args, executionContext);
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error(`Builtin tool execution error for ${builtinTool.name}:`, error);
                return {
                  content: [
                    {
                      type: 'text' as const,
                      text: `Error executing builtin tool ${builtinTool.name}: ${errorMessage}`,
                    },
                  ],
                  isError: true,
                };
              }
            }
          );

          logger.log(`  ✅ Registered: ${builtinTool.name}`);
        }

        logger.log(`✅ All builtin tools registered for category: ${tool.name}`);
        continue;
      }

      // Handle non-builtin tools (api, mcp, custom)
      const inputSchema = tool.schema?.inputSchema || {};

      // Convert JSON Schema to Zod schema (simplified)
      const zodInputSchema: Record<string, z.ZodString> = {};
      if (
        inputSchema &&
        typeof inputSchema === 'object' &&
        'properties' in inputSchema
      ) {
        const props = inputSchema.properties as Record<string, any>;
        for (const key in props) {
          zodInputSchema[key] = z
            .string()
            .describe(props[key].description || key);
        }
      }

      mcpServer.registerTool(
        tool.name,
        {
          title: tool.name,
          description: tool.description,
          inputSchema:
            Object.keys(zodInputSchema).length > 0 ? zodInputSchema : undefined,
        },
        async (args) => {
          logger.log(`🔧 Executing tool: ${tool.name} (type: ${tool.type})`);
          logger.debug(`Tool args:`, args);

          try {
            // Handle different tool types
            if (tool.type === 'api') {
              return await executeApiTool(tool, args, tokenPayload);
            } else if (tool.type === 'mcp') {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `MCP tool ${tool.name} execution not yet implemented`,
                  },
                ],
              };
            } else if (tool.type === 'custom') {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Custom tool ${tool.name} execution not yet implemented`,
                  },
                ],
              };
            } else {
              throw new Error(`Unknown tool type: ${tool.type}`);
            }
          } catch (error: any) {
            logger.error(`Tool execution error for ${tool.name}:`, error);
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Error executing tool ${tool.name}: ${error.message}`,
                },
              ],
              isError: true,
            };
          }
        }
      );

      logger.log(`✅ Registered tool: ${tool.name} (${tool.type})`);
    }

    logger.log(`✅ All tools registered for org: ${orgId}`);
  };

  // Step 2.2: Setup Express app with Streamable HTTP transport
  const expressApp = createMcpExpressApp();

  // Enable CORS for MCP Inspector direct mode
  expressApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, mcp-session-id, mcp-protocol-version'
    );
    res.header('Access-Control-Expose-Headers', 'mcp-session-id');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Track which agents have registered tools (register once per agent)
  const registeredAgents = new Set<string>();

  // Track transports by session ID for session persistence
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  // Cleanup sessions after 30 minutes of inactivity
  const SESSION_TIMEOUT = 30 * 60 * 1000;
  const sessionTimers = new Map<string, NodeJS.Timeout>();

  const cleanupSession = async (sessionId: string) => {
    const transport = sessions.get(sessionId);
    if (transport) {
      logger.log(`🧹 Cleaning up session: ${sessionId}`);
      try {
        await transport.close();
      } catch (error) {
        logger.warn(`Error closing transport for session ${sessionId}:`, error);
      }
      sessions.delete(sessionId);
    }
    const timer = sessionTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      sessionTimers.delete(sessionId);
    }
  };

  const resetSessionTimeout = (sessionId: string) => {
    const existingTimer = sessionTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const timer = setTimeout(() => cleanupSession(sessionId), SESSION_TIMEOUT);
    sessionTimers.set(sessionId, timer);
  };

  // Step 3.2: Handle MCP POST requests with authentication
  expressApp.post('/', async (req, res) => {
    try {
      logger.debug(`Incoming request: ${req.body?.method || 'unknown'}`);

      // Step 3.2.1: Validate bearer token
      const authHeader = req.headers.authorization as string | undefined;
      let userContext: any;

      try {
        userContext = await validateBearerToken(authHeader);
        logger.log(
          `✅ Token validated for agent: ${
            userContext.agentId || userContext.sub
          } (org: ${userContext.orgId})`
        );
      } catch (error) {
        logger.error('Authentication failed:', error);
        return res.status(401).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Authentication required' },
          id: null,
        });
      }

      // Step 3.2.2: Register tools for this agent once (if not already registered)
      const agentKey = `${userContext.orgId}:${userContext.agentId}`;
      const bearerToken = authHeader?.substring(7) || ''; // Extract token from "Bearer xxx"

      if (!registeredAgents.has(agentKey)) {
        try {
          await registerToolsForAgent(userContext, bearerToken);
          registeredAgents.add(agentKey);
        } catch (error) {
          logger.error('Failed to register tools:', error);
          return res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Failed to load tools' },
            id: null,
          });
        }
      } else {
        logger.debug(`Tools already registered for agent: ${agentKey}`);
      }

      // Step 3.2.3: Get or create transport for this session
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && sessions.has(sessionId)) {
        // Reuse existing transport for this session
        const existingTransport = sessions.get(sessionId);
        if (!existingTransport) {
          throw new Error(`Session ${sessionId} not found in map`);
        }
        transport = existingTransport;
        logger.debug(`♻️  Reusing existing session: ${sessionId}`);
        resetSessionTimeout(sessionId);
      } else {
        // Create new transport for new session
        const newSessionId = sessionId || randomUUID();
        logger.log(`🆕 Creating new session: ${newSessionId}`);

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
        });

        // Connect transport to MCP server
        await mcpServer.connect(transport);
        logger.debug('Transport connected to MCP server');

        // Store transport for future requests
        sessions.set(newSessionId, transport);
        resetSessionTimeout(newSessionId);
      }

      // Handle the request - transport will persist session state
      await transport.handleRequest(req, res, req.body);

      // Don't close transport - keep it alive for future requests in this session
    } catch (error) {
      logger.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  logger.log('✅ Streamable HTTP transport configured');

  // Step 2.3: Start HTTP server
  const server = expressApp.listen(MCP_PORT, () => {
    logger.log(`🚀 MCP Server listening on: http://localhost:${MCP_PORT}`);
    logger.log(`📡 Protocol: Streamable HTTP (POST + SSE)`);
    logger.log('✅ Step 2 completed - MCP Server ready');
    logger.log('📝 Next: Register tools and handlers (Step 3)');
    logger.log('💡 Press Ctrl+C to stop');
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.log('Shutting down gracefully...');

    // Close MCP server
    await mcpServer.close();

    // Close HTTP server
    server.close(() => {
      logger.log('HTTP server closed');
    });

    // Close NestJS context
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
