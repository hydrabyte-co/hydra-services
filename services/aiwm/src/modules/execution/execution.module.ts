import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { Execution, ExecutionSchema } from './execution.schema';
import { ExecutionService } from './execution.service';
import { ExecutionController } from './execution.controller';
import { ExecutionOrchestrator } from './execution.orchestrator';
import { ExecutionTimeoutMonitor } from './execution-timeout.monitor';
import { NodeModule } from '../node/node.module';

/**
 * ExecutionModule - Workflow orchestration module
 *
 * Provides:
 * - Execution entity (multi-step workflow tracking)
 * - ExecutionService (CRUD operations)
 * - ExecutionOrchestrator (workflow management)
 * - ExecutionController (REST API)
 * - ExecutionTimeoutMonitor (timeout handling)
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Execution.name, schema: ExecutionSchema },
    ]),
    ScheduleModule.forRoot(), // For @Interval decorator
    forwardRef(() => NodeModule), // For NodeGateway access
  ],
  controllers: [ExecutionController],
  providers: [
    ExecutionService,
    ExecutionOrchestrator,
    ExecutionTimeoutMonitor,
  ],
  exports: [
    ExecutionService,
    ExecutionOrchestrator,
    ExecutionTimeoutMonitor,
  ],
})
export class ExecutionModule {}
