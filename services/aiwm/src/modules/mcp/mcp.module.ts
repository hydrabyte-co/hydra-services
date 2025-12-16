import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { Agent, AgentSchema } from '../agent/agent.schema';
import { Tool, ToolSchema } from '../tool/tool.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Agent.name, schema: AgentSchema },
      { name: Tool.name, schema: ToolSchema },
    ]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [McpController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
