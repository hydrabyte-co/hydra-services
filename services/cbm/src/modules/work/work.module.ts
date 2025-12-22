import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { Work, WorkSchema } from './work.schema';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Work.name, schema: WorkSchema }]),
    NotificationModule,
  ],
  controllers: [WorkController],
  providers: [WorkService],
  exports: [WorkService, MongooseModule],
})
export class WorkModule {}
