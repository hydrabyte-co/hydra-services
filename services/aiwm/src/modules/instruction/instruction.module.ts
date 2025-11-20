import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Instruction, InstructionSchema } from './instruction.schema';
import { InstructionService } from './instruction.service';
import { InstructionController } from './instruction.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Instruction.name, schema: InstructionSchema },
    ]),
  ],
  controllers: [InstructionController],
  providers: [InstructionService],
  exports: [InstructionService],
})
export class InstructionModule {}
