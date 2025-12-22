import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UtilController } from './util.controller';
import { UtilService } from './util.service';
import { ConfigurationModule } from '../configuration/configuration.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigurationModule, // For ConfigService to access llm.openai.api_key
  ],
  controllers: [UtilController],
  providers: [UtilService],
  exports: [UtilService],
})
export class UtilModule {}
