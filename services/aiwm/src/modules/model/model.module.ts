import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModelController } from './model.controller';
import { ModelService } from './model.service';
import { Model, ModelSchema } from './model.schema';
import { Deployment, DeploymentSchema } from '../deployment/deployment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Model.name, schema: ModelSchema },
      { name: Deployment.name, schema: DeploymentSchema },
    ]),
  ],
  controllers: [ModelController],
  providers: [ModelService],
  exports: [ModelService, MongooseModule],
})
export class ModelModule {}