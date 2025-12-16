import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { Agent, AgentSchema } from './agent.schema';
import { Instruction, InstructionSchema } from '../instruction/instruction.schema';
import { Tool, ToolSchema } from '../tool/tool.schema';
import { QueueModule } from '../../queues/queue.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Agent.name, schema: AgentSchema },
      { name: Instruction.name, schema: InstructionSchema },
      { name: Tool.name, schema: ToolSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    QueueModule,
  ],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService, MongooseModule],
})
export class AgentModule {}