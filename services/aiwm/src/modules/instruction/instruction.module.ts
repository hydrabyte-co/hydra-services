import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Instruction, InstructionSchema } from './instruction.schema';
import { InstructionService } from './instruction.service';
import { InstructionController } from './instruction.controller';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Instruction.name, schema: InstructionSchema },
    ]),
    AgentModule,
  ],
  controllers: [InstructionController],
  providers: [InstructionService],
  exports: [InstructionService],
})
export class InstructionModule {}
