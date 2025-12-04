import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeploymentController } from './deployment.controller';
import { DeploymentService } from './deployment.service';
import { ProxyService } from './proxy.service';
import { Deployment, DeploymentSchema } from './deployment.schema';
import { Model, ModelSchema } from '../model/model.schema';
import { Node, NodeSchema } from '../node/node.schema';
import { Resource, ResourceSchema } from '../resource/resource.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Deployment.name, schema: DeploymentSchema },
      { name: Model.name, schema: ModelSchema },
      { name: Node.name, schema: NodeSchema },
      { name: Resource.name, schema: ResourceSchema },
    ]),
  ],
  controllers: [DeploymentController],
  providers: [DeploymentService, ProxyService],
  exports: [DeploymentService, MongooseModule],
})
export class DeploymentModule {}