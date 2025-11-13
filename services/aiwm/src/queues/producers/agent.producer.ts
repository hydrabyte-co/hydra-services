import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from '../../config/queue.config';

@Injectable()
export class AgentProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.AGENTS) private agentQueue: Queue,
  ) {}

  async emitAgentCreated(agent: any) {
    await this.agentQueue.add(QUEUE_EVENTS.AGENT_CREATED, {
      event: QUEUE_EVENTS.AGENT_CREATED,
      data: agent,
      timestamp: new Date().toISOString(),
    });
  }

  async emitAgentUpdated(agent: any) {
    await this.agentQueue.add(QUEUE_EVENTS.AGENT_UPDATED, {
      event: QUEUE_EVENTS.AGENT_UPDATED,
      data: agent,
      timestamp: new Date().toISOString(),
    });
  }

  async emitAgentDeleted(agentId: string) {
    await this.agentQueue.add(QUEUE_EVENTS.AGENT_DELETED, {
      event: QUEUE_EVENTS.AGENT_DELETED,
      data: { id: agentId },
      timestamp: new Date().toISOString(),
    });
  }
}