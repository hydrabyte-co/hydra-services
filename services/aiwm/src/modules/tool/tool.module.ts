import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ToolController } from './tool.controller';
import { ToolService } from './tool.service';
import { Tool, ToolSchema } from './tool.schema';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tool.name, schema: ToolSchema }]),
    AgentModule, // Import AgentModule to access Agent model for dependency checking
  ],
  controllers: [ToolController],
  providers: [ToolService],
  exports: [ToolService, MongooseModule],
})
export class ToolModule {}
