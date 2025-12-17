/**
 * AIWM Service - AI Workflow Management Platform
 * Demonstrates GPU Node Management, Model Deployment, Agent Framework, and MCP Tool Integration
 *
 * Supports two modes:
 * - API mode (default): Full HTTP/WebSocket API server
 * - MCP mode: MCP protocol server for AI agent integration
 */

import { Logger } from '@nestjs/common';

const MODE = process.env.MODE || process.argv[2] || 'api';

async function bootstrap() {
  if (MODE === 'mcp') {
    // MCP Standalone Server mode
    const { bootstrapMcpServer } = await import('./bootstrap-mcp');
    await bootstrapMcpServer();
  } else {
    // API Server mode (default)
    const { bootstrapApiServer } = await import('./bootstrap-api');
    await bootstrapApiServer();
  }
}

bootstrap().catch((error) => {
  Logger.error('Failed to start AIWM Service:', error);
  process.exit(1);
});
