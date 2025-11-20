import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NodeController } from './node.controller';
import { NodeService } from './node.service';
import { Node, NodeSchema } from './node.schema';
import { NodeGateway } from './node.gateway';
import { NodeConnectionService } from './node-connection.service';
import { QueueModule } from '../../queues/queue.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Node.name, schema: NodeSchema }]),
    QueueModule,
  ],
  controllers: [NodeController],
  providers: [
    NodeService,
    NodeGateway,
    NodeConnectionService,
  ],
  exports: [NodeService, NodeGateway, NodeConnectionService, MongooseModule],
})
export class NodeModule {}