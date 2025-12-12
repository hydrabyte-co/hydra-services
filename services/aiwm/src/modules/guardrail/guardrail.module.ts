import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Guardrail, GuardrailSchema } from './guardrail.schema';
import { GuardrailService } from './guardrail.service';
import { GuardrailController } from './guardrail.controller';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Guardrail.name, schema: GuardrailSchema },
    ]),
    AgentModule,
  ],
  controllers: [GuardrailController],
  providers: [GuardrailService],
  exports: [GuardrailService],
})
export class GuardrailModule {}
