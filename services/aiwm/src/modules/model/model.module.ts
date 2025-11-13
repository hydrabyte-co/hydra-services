import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModelController } from './model.controller';
import { ModelService } from './model.service';
import { Model, ModelSchema } from './model.schema';
import { QueueModule } from '../../queues/queue.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Model.name, schema: ModelSchema }]),
    QueueModule,
  ],
  controllers: [ModelController],
  providers: [ModelService],
  exports: [ModelService, MongooseModule],
})
export class ModelModule {}