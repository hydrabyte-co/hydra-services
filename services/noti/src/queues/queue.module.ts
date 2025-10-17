import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getBullModuleConfig, registerNotiQueue } from './queue.config';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationProducer } from './producers/notification.producer';
import { NotificationModule } from '../modules/notification/notification.module';

@Module({
  imports: [
    getBullModuleConfig(new ConfigService()),
    registerNotiQueue(),
    NotificationModule, // Import to access NotificationGateway and NotificationService
  ],
  providers: [NotificationProcessor, NotificationProducer],
  exports: [NotificationProducer],
})
export class QueueModule {}
