import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeploymentController } from './deployment.controller';
import { DeploymentService } from './deployment.service';
import { Deployment, DeploymentSchema } from './deployment.schema';
import { Model, ModelSchema } from '../model/model.schema';
import { Node, NodeSchema } from '../node/node.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Deployment.name, schema: DeploymentSchema },
      { name: Model.name, schema: ModelSchema },
      { name: Node.name, schema: NodeSchema },
    ]),
  ],
  controllers: [DeploymentController],
  providers: [DeploymentService],
  exports: [DeploymentService, MongooseModule],
})
export class DeploymentModule {}