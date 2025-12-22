/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { customQueryParser } from '@hydrabyte/base';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure Express to use custom query parser
  // Supports: filter[search]=123, filter.search=123, filter[metadata.discordUserId]=123
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('query parser', customQueryParser);
  const globalPrefix = '';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
