import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BaseService,
  FindManyOptions,
  FindManyResult,
  PaginationQueryDto,
} from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Agent, AgentDocument } from './agent.schema';
import { CreateAgentDto, UpdateAgentDto } from './agent.dto';
import { AgentProducer } from '../../queues/producers/agent.producer';

@Injectable()
export class AgentService extends BaseService<Agent> {
  constructor(
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    private readonly agentProducer: AgentProducer
  ) {
    super(agentModel as any);
  }

  /**
   * Override findById to support populate
   * If query has 'populate=instruction', populate the instructionId field
   */
  async findById(
    id: any,
    context: RequestContext,
    query?: any
  ): Promise<Agent | null> {
    const shouldPopulate = query?.populate === 'instruction';

    if (shouldPopulate) {
      const agent = await this.agentModel
        .findOne({ _id: id, isDeleted: false })
        .populate('instructionId')
        .exec();
      return agent as Agent;
    }

    return super.findById(id, context);
  }

  /**
   * Override findAll to handle statistics aggregation
   */
  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<Agent>> {
    const findResult = await super.findAll(options, context);
    // Aggregate statistics by status
    const statusStats = await super.aggregate(
      [
        { $match: { ...options.filter } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ],
      context
    );

    // Build statistics object
    const statistics: any = {
      total: findResult.pagination.total,
      byStatus: {},
      byType: {},
    };

    // Map status statistics
    statusStats.forEach((stat: any) => {
      statistics.byStatus[stat._id] = stat.count;
    });

    findResult.statistics = statistics;
    return findResult;
  }

  async create(
    createAgentDto: CreateAgentDto,
    context: RequestContext
  ): Promise<Agent> {
    // BaseService handles permissions, ownership, save, and generic logging
    const saved = await super.create(createAgentDto, context);

    // Business-specific logging with details
    this.logger.info('Agent created with details', {
      id: (saved as any)._id,
      name: saved.name,
      status: saved.status,
      nodeId: saved.nodeId,
      instructionId: saved.instructionId,
      guardrailId: saved.guardrailId,
      createdBy: context.userId,
    });

    // Emit event to queue
    await this.agentProducer.emitAgentCreated(saved);

    return saved as Agent;
  }

  async updateAgent(
    id: string,
    updateAgentDto: UpdateAgentDto,
    context: RequestContext
  ): Promise<Agent | null> {
    // Convert string to ObjectId for BaseService
    const objectId = new Types.ObjectId(id);
    const updated = await super.update(
      objectId as any,
      updateAgentDto as any,
      context
    );

    if (updated) {
      // Business-specific logging with details
      this.logger.info('Agent updated with details', {
        id: (updated as any)._id,
        name: updated.name,
        status: updated.status,
        nodeId: updated.nodeId,
        instructionId: updated.instructionId,
        guardrailId: updated.guardrailId,
        updatedBy: context.userId,
      });

      // Emit event to queue
      await this.agentProducer.emitAgentUpdated(updated);
    }

    return updated as Agent;
  }

  async remove(id: string, context: RequestContext): Promise<void> {
    // BaseService handles soft delete, permissions, and generic logging
    const result = await super.softDelete(
      new Types.ObjectId(id) as any,
      context
    );

    if (result) {
      // Business-specific logging
      this.logger.info('Agent soft deleted with details', {
        id,
        deletedBy: context.userId,
      });

      // Emit event to queue
      await this.agentProducer.emitAgentDeleted(id);
    }
  }
}
