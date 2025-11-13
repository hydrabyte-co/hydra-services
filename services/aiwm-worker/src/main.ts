/**
 * AIWM Worker - Worker Node Client
 * Connects to AIWM Controller and manages GPU resources, deployments, and models
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const logger = new Logger('WorkerBootstrap');

  // Get environment variables
  const nodeId = process.env['NODE_ID'];
  const nodeName = process.env['NODE_NAME'] || 'worker-node';
  const controllerUrl = process.env['CONTROLLER_WS_URL'];

  logger.log('========================================');
  logger.log('🤖 AIWM Worker Node Starting...');
  logger.log('========================================');
  logger.log(`📝 Node ID: ${nodeId}`);
  logger.log(`🏷️  Node Name: ${nodeName}`);
  logger.log(`🔗 Controller: ${controllerUrl}`);
  logger.log('========================================');

  // Worker will automatically connect via WebSocketClientService onModuleInit
  logger.log('✅ Worker node initialized');
  logger.log('📡 Connecting to controller...');

  // Keep process running
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
