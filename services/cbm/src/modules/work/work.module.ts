import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { Work, WorkSchema } from './work.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Work.name, schema: WorkSchema }]),
  ],
  controllers: [WorkController],
  providers: [WorkService],
  exports: [WorkService, MongooseModule],
})
export class WorkModule {}
