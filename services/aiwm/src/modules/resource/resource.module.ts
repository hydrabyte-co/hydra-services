import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resource, ResourceSchema } from './resource.schema';
import { ResourceService } from './resource.service';
import { ResourceController } from './resource.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resource.name, schema: ResourceSchema },
    ]),
  ],
  controllers: [ResourceController],
  providers: [ResourceService],
  exports: [ResourceService],
})
export class ResourceModule {}
