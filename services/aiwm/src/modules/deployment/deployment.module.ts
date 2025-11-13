import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeploymentController } from './deployment.controller';
import { DeploymentService } from './deployment.service';
import { Deployment, DeploymentSchema } from './deployment.schema';
import { ModelModule } from '../model/model.module';
import { NodeModule } from '../node/node.module';
import { QueueModule } from '../../queues/queue.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Deployment.name, schema: DeploymentSchema }]),
    ModelModule,
    NodeModule,
    QueueModule,
  ],
  controllers: [DeploymentController],
  providers: [DeploymentService],
  exports: [DeploymentService, MongooseModule],
})
export class DeploymentModule {}