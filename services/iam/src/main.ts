/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SERVICE_CONFIG } from '@hydrabyte/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  // initialize SERVICE_CONFIG from environment variables
  SERVICE_CONFIG.iam.mongodbUri = `${process.env.MONGODB_URI}/${SERVICE_CONFIG.iam.name}`;

  const app = await NestFactory.create(AppModule);
  
  // Setup global validation pipe  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );
  
  const globalPrefix = '';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
