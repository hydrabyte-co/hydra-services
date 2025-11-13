import { Module } from '@nestjs/common';
import { NodeProcessor } from './processors/node.processor';
import { ModelProcessor } from './processors/model.processor';

@Module({
  providers: [NodeProcessor, ModelProcessor],
})
export class ProcessorsModule {}
