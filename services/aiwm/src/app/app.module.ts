import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import {
  HealthModule,
  JwtStrategy,
  CorrelationIdMiddleware,
} from '@hydrabyte/base';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NodeModule } from '../modules/node/node.module';
import { ModelModule } from '../modules/model/model.module';
import { InstructionModule } from '../modules/instruction/instruction.module';
import { DeploymentModule } from '../modules/deployment/deployment.module';
import { AgentModule } from '../modules/agent/agent.module';
import { ExecutionModule } from '../modules/execution/execution.module';
import { QueueModule } from '../queues/queue.module';
import { ProcessorsModule } from '../queues/processors.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env['MONGODB_URI'] || 'mongodb://localhost:27017/hydra-aiwm'
    ),
    PassportModule,
    HealthModule,
    QueueModule,
    NodeModule,
    ModelModule,
    InstructionModule,
    DeploymentModule,
    AgentModule,
    ExecutionModule,
    ProcessorsModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply correlation ID middleware to all routes
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
