/**
 * Notification Service - Real-time Notification System
 * Handles system notifications, service events, and agent actions via WebSocket and REST API
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionFilter } from '@hydrabyte/base';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable WebSocket support with Socket.IO
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Global exception filter for standardized error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Notification Service API')
    .setDescription('Real-time notification system with WebSocket support - System notifications, service events, and agent actions')
    .setVersion('1.0.0')
    .addTag('notifications', 'Notification management endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Notification Service API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env['PORT'] || 3002;
  await app.listen(port);

  Logger.log(`🚀 Notification Service is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 API Documentation available at: http://localhost:${port}/api-docs`);
  Logger.log(`🔌 WebSocket available at: ws://localhost:${port}/notifications`);
  Logger.log(`📊 Redis: ${process.env['REDIS_HOST']}:${process.env['REDIS_PORT']}`);
  Logger.log(`💾 MongoDB: ${process.env['MONGODB_URI']}`);
}

bootstrap();
