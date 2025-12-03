import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { RequestContext, ToolInUseException } from '@hydrabyte/shared';
import { Tool } from './tool.schema';
import { Agent } from '../agent/agent.schema';

/**
 * ToolService
 * Manages tool entities (MCP and built-in tools)
 * Extends BaseService for automatic CRUD operations
 */
@Injectable()
export class ToolService extends BaseService<Tool> {
  constructor(
    @InjectModel(Tool.name) private toolModel: Model<Tool>,
    @InjectModel(Agent.name) private readonly agentModel: Model<Agent>
  ) {
    super(toolModel);
  }

  /**
   * Helper method to check if tool is being used by active agents
   * @param toolId - Tool ID to check
   * @returns Array of active agents using this tool
   */
  private async checkActiveAgentDependencies(
    toolId: ObjectId
  ): Promise<Array<{ id: string; name: string }>> {
    // Agent schema has toolIds: string[] field
    const activeAgents = await this.agentModel
      .find({
        toolIds: toolId.toString(),
        isDeleted: false,
      })
      .select('_id name')
      .lean()
      .exec();

    return activeAgents.map((agent) => ({
      id: agent._id.toString(),
      name: agent.name,
    }));
  }

  /**
   * Override update method to validate status changes
   * Prevents deactivating tools that are in use by active agents
   */
  async update(
    id: ObjectId,
    updateData: Partial<Tool>,
    context: RequestContext
  ): Promise<Tool | null> {
    // Check if status is being changed to 'inactive'
    if (updateData.status === 'inactive') {
      const activeAgents = await this.checkActiveAgentDependencies(id);
      if (activeAgents.length > 0) {
        throw new ToolInUseException(activeAgents, 'deactivate');
      }
    }

    // Call parent update method
    return super.update(id, updateData, context);
  }

  /**
   * Override softDelete method to validate dependencies
   * Prevents deleting tools that are in use by active agents
   */
  async softDelete(
    id: ObjectId,
    context: RequestContext
  ): Promise<Tool | null> {
    const activeAgents = await this.checkActiveAgentDependencies(id);
    if (activeAgents.length > 0) {
      throw new ToolInUseException(activeAgents, 'delete');
    }

    // Call parent softDelete method
    return super.softDelete(id, context);
  }

  /**
   * Override findAll to handle statistics aggregation
   */
  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<Tool>> {
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
}
