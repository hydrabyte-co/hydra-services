/**
 * API Server Bootstrap
 * Full HTTP/WebSocket server for AIWM Service
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionFilter } from '@hydrabyte/base';
import { AppModule } from './app/app.module';
import { WsJwtAdapter } from './modules/node/ws-jwt.adapter';

export async function bootstrapApiServer() {
  const app = await NestFactory.create(AppModule);

  // Use WebSocket adapter with JWT authentication
  app.useWebSocketAdapter(new WsJwtAdapter(app));

  // Global exception filter for standardized error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('AIWM Service API')
    .setDescription('AI Workflow Management - GPU Nodes, Model Deployment, and Agent Framework')
    .setVersion('1.0.0')
    .addTag('nodes', 'GPU Node management endpoints')
    .addTag('models', 'Model registry endpoints')
    .addTag('deployments', 'Model deployment endpoints')
    .addTag('agents', 'AI Agent management endpoints')
    .addTag('tools', 'MCP Tool registry endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'AIWM Service API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3003;
  await app.listen(port);

  Logger.log(`🚀 AIWM Service is running on: http://localhost:${port}`);
  Logger.log(`📚 API Documentation available at: http://localhost:${port}/api-docs`);
  Logger.log(`🔌 WebSocket Gateway: ws://localhost:${port}/ws/node`);
  Logger.log(`📊 Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
  Logger.log(`💾 MongoDB: ${process.env.MONGODB_URI}`);
}
