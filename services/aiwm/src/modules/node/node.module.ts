import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
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
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'hydra-secret-key',
      signOptions: {
        algorithm: 'HS256',
      },
    }),
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