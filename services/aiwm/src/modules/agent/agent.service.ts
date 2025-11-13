import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseService } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Agent, AgentDocument } from './agent.schema';
import { CreateAgentDto, UpdateAgentDto } from './agent.dto';
import { AgentProducer } from '../../queues/producers/agent.producer';

@Injectable()
export class AgentService extends BaseService<Agent> {

  constructor(
    @InjectModel(Agent.name) agentModel: Model<AgentDocument>,
    private readonly agentProducer: AgentProducer,
  ) {
    super(agentModel as any);
  }

  async create(createAgentDto: CreateAgentDto, context: RequestContext): Promise<Agent> {
    // BaseService handles permissions, ownership, save, and generic logging
    const saved = await super.create(createAgentDto, context);

    // Business-specific logging with details
    this.logger.info('Agent created with details', {
      id: (saved as any)._id,
      agentId: saved.agentId,
      name: saved.name,
      role: saved.role,
      status: saved.status,
      capabilities: saved.capabilities,
      nodeId: saved.nodeId,
      createdBy: context.userId
    });

    // Emit event to queue
    await this.agentProducer.emitAgentCreated(saved);

    return saved as Agent;
  }

  async updateAgent(id: string, updateAgentDto: UpdateAgentDto, context: RequestContext): Promise<Agent | null> {
    // Convert string to ObjectId for BaseService
    const objectId = new Types.ObjectId(id);
    const updated = await super.update(objectId as any, updateAgentDto as any, context);

    if (updated) {
      // Business-specific logging with details
      this.logger.info('Agent updated with details', {
        id: (updated as any)._id,
        agentId: updated.agentId,
        name: updated.name,
        role: updated.role,
        status: updated.status,
        capabilities: updated.capabilities,
        nodeId: updated.nodeId,
        updatedBy: context.userId
      });

      // Emit event to queue
      await this.agentProducer.emitAgentUpdated(updated);
    }

    return updated as Agent;
  }

  async remove(id: string, context: RequestContext): Promise<void> {
    // BaseService handles soft delete, permissions, and generic logging
    const result = await super.softDelete(new Types.ObjectId(id) as any, context);

    if (result) {
      // Business-specific logging
      this.logger.info('Agent soft deleted with details', {
        id,
        deletedBy: context.userId
      });

      // Emit event to queue
      await this.agentProducer.emitAgentDeleted(id);
    }
  }
}