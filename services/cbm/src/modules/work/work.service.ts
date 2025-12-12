import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Work } from './work.schema';

/**
 * WorkService
 * Manages work entities with action-based state transitions and validation
 * Extends BaseService for automatic CRUD operations
 */
@Injectable()
export class WorkService extends BaseService<Work> {
  constructor(
    @InjectModel(Work.name) private workModel: Model<Work>
  ) {
    super(workModel);
  }

  /**
   * Override create to validate reporter/assignee and parentId
   */
  async create(data: any, context: RequestContext): Promise<Work> {
    // Validate reporter exists and isDeleted = false
    await this.validateEntityExists(data.reporter.type, data.reporter.id);

    // Validate assignee if provided
    if (data.assignee) {
      await this.validateEntityExists(data.assignee.type, data.assignee.id);
    }

    // Validate parentId if provided
    if (data.parentId) {
      await this.validateParentId(data.parentId, data.type, context);
    }

    return super.create(data as any, context) as Promise<Work>;
  }

  /**
   * Override update to validate reporter/assignee and parentId
   */
  async update(id: ObjectId, data: any, context: RequestContext): Promise<Work | null> {
    // Validate reporter if being updated
    if (data.reporter) {
      await this.validateEntityExists(data.reporter.type, data.reporter.id);
    }

    // Validate assignee if being updated
    if (data.assignee) {
      await this.validateEntityExists(data.assignee.type, data.assignee.id);
    }

    // Validate parentId if being updated
    if (data.parentId !== undefined) {
      const work = await this.findById(id, context);
      if (!work) {
        throw new BadRequestException('Work not found');
      }
      await this.validateParentId(data.parentId, work.type, context);
    }

    return super.update(id, data, context);
  }

  /**
   * Validate that entity (user/agent) exists and isDeleted = false
   * Note: This is a placeholder - actual implementation would query IAM/AIWM services
   */
  private async validateEntityExists(type: 'user' | 'agent', id: string): Promise<void> {
    // TODO: Implement actual validation by calling IAM (for user) or AIWM (for agent) services
    // For now, we just check that id is a valid ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${type} ID format: ${id}`);
    }

    // Placeholder logic - in production, call external service:
    // if (type === 'user') {
    //   const user = await iamService.getUser(id);
    //   if (!user || user.isDeleted) throw new BadRequestException(`User ${id} not found or deleted`);
    // } else {
    //   const agent = await aiwmService.getAgent(id);
    //   if (!agent || agent.isDeleted) throw new BadRequestException(`Agent ${id} not found or deleted`);
    // }
  }

  /**
   * Validate parentId hierarchy rules
   */
  private async validateParentId(parentId: string, workType: string, context: RequestContext): Promise<void> {
    if (!parentId) return;

    // Check parent exists - use findById which respects ownership
    const parent = await this.findById(new Types.ObjectId(parentId) as any, context);
    if (!parent) {
      throw new BadRequestException(`Parent work ${parentId} not found`);
    }

    // Validate hierarchy: subtask can only have task/epic parent, not another subtask
    if (workType === 'subtask' && parent.type === 'subtask') {
      throw new BadRequestException('Subtask cannot have another subtask as parent');
    }
  }

  /**
   * Override findAll to handle statistics aggregation and optimize response
   * Aggregates by status and type
   * Excludes 'description' field to reduce response size
   */
  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<Work>> {
    const findResult = await super.findAll(options, context);

    // Exclude description field from results to reduce response size
    findResult.data = findResult.data.map((work: any) => {
      // Convert Mongoose document to plain object
      const plainWork = work.toObject ? work.toObject() : work;
      const { description, ...rest } = plainWork;
      return rest as Work;
    });

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

    // Aggregate statistics by type
    const typeStats = await super.aggregate(
      [
        { $match: { ...options.filter } },
        {
          $group: {
            _id: '$type',
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

    // Map type statistics
    typeStats.forEach((stat: any) => {
      statistics.byType[stat._id] = stat.count;
    });

    findResult.statistics = statistics;
    return findResult;
  }

  // =============== Action Methods ===============

  /**
   * Action: Start work
   * Transition: todo → in_progress
   */
  async startWork(
    id: ObjectId,
    context: RequestContext
  ): Promise<Work> {
    const work = await this.findById(id, context);
    if (!work) {
      throw new BadRequestException('Work not found');
    }

    if (work.status !== 'todo') {
      throw new BadRequestException(
        `Cannot start work with status: ${work.status}. Only todo works can be started.`
      );
    }

    return this.update(
      id,
      { status: 'in_progress' } as any,
      context
    ) as Promise<Work>;
  }

  /**
   * Action: Block work
   * Transition: in_progress → blocked
   */
  async blockWork(
    id: ObjectId,
    context: RequestContext
  ): Promise<Work> {
    const work = await this.findById(id, context);
    if (!work) {
      throw new BadRequestException('Work not found');
    }

    if (work.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot block work with status: ${work.status}. Only in_progress works can be blocked.`
      );
    }

    return this.update(
      id,
      { status: 'blocked' } as any,
      context
    ) as Promise<Work>;
  }

  /**
   * Action: Unblock work
   * Transition: blocked → in_progress
   */
  async unblockWork(
    id: ObjectId,
    context: RequestContext
  ): Promise<Work> {
    const work = await this.findById(id, context);
    if (!work) {
      throw new BadRequestException('Work not found');
    }

    if (work.status !== 'blocked') {
      throw new BadRequestException(
        `Cannot unblock work with status: ${work.status}. Only blocked works can be unblocked.`
      );
    }

    return this.update(
      id,
      { status: 'in_progress' } as any,
      context
    ) as Promise<Work>;
  }

  /**
   * Action: Request review
   * Transition: in_progress → review
   */
  async requestReview(
    id: ObjectId,
    context: RequestContext
  ): Promise<Work> {
    const work = await this.findById(id, context);
    if (!work) {
      throw new BadRequestException('Work not found');
    }

    if (work.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot request review for work with status: ${work.status}. Only in_progress works can request review.`
      );
    }

    return this.update(
      id,
      { status: 'review' } as any,
      context
    ) as Promise<Work>;
  }

  /**
   * Action: Complete work
   * Transition: review → done
   */
  async completeWork(
    id: ObjectId,
    context: RequestContext
  ): Promise<Work> {
    const work = await this.findById(id, context);
    if (!work) {
      throw new BadRequestException('Work not found');
    }

    if (work.status !== 'review') {
      throw new BadRequestException(
        `Cannot complete work with status: ${work.status}. Only review works can be completed.`
      );
    }

    return this.update(
      id,
      { status: 'done' } as any,
      context
    ) as Promise<Work>;
  }

  /**
   * Action: Reopen work
   * Transition: done → in_progress
   */
  async reopenWork(
    id: ObjectId,
    context: RequestContext
  ): Promise<Work> {
    const work = await this.findById(id, context);
    if (!work) {
      throw new BadRequestException('Work not found');
    }

    if (work.status !== 'done') {
      throw new BadRequestException(
        `Cannot reopen work with status: ${work.status}. Only done works can be reopened.`
      );
    }

    return this.update(
      id,
      { status: 'in_progress' } as any,
      context
    ) as Promise<Work>;
  }

  /**
   * Action: Cancel work
   * Transition: any → cancelled
   */
  async cancelWork(
    id: ObjectId,
    context: RequestContext
  ): Promise<Work> {
    const work = await this.findById(id, context);
    if (!work) {
      throw new BadRequestException('Work not found');
    }

    if (work.status === 'cancelled') {
      throw new BadRequestException('Work is already cancelled');
    }

    return this.update(
      id,
      { status: 'cancelled' } as any,
      context
    ) as Promise<Work>;
  }

  /**
   * Override softDelete to validate status
   * Only allow deletion when status is 'done' or 'cancelled'
   */
  async softDelete(
    id: ObjectId,
    context: RequestContext
  ): Promise<Work | null> {
    const work = await this.findById(id, context);
    if (!work) {
      throw new BadRequestException('Work not found');
    }

    if (!['done', 'cancelled'].includes(work.status)) {
      throw new BadRequestException(
        `Cannot delete work with status: ${work.status}. Only done or cancelled works can be deleted.`
      );
    }

    return super.softDelete(id, context);
  }

  /**
   * Check if work can trigger agent execution
   * A work can trigger agent when:
   * 1. Assignee is an agent (not a user)
   * 2. Work has startAt date/time set
   * 3. Current time >= startAt time
   * 4. Status is 'todo' or 'in_progress'
   * 5. Work is not blocked (blockedBy array is empty)
   */
  async canTriggerAgent(
    id: ObjectId,
    context: RequestContext
  ): Promise<{
    canTrigger: boolean;
    reason: string;
    work: Work | null;
  }> {
    const work = await this.findById(id, context);

    if (!work) {
      return {
        canTrigger: false,
        reason: 'Work not found',
        work: null,
      };
    }

    // Check 1: Assignee must be an agent
    if (!work.assignee || work.assignee.type !== 'agent') {
      return {
        canTrigger: false,
        reason: 'Work is not assigned to an agent',
        work,
      };
    }

    // Check 2: Must have startAt date
    if (!work.startAt) {
      return {
        canTrigger: false,
        reason: 'Work does not have a startAt date/time',
        work,
      };
    }

    // Check 3: Current time must be >= startAt
    const now = new Date();
    const startAt = new Date(work.startAt);
    if (now < startAt) {
      return {
        canTrigger: false,
        reason: `Work is scheduled to start at ${startAt.toISOString()}, current time is ${now.toISOString()}`,
        work,
      };
    }

    // Check 4: Status must be todo or in_progress
    if (!['todo', 'in_progress'].includes(work.status)) {
      return {
        canTrigger: false,
        reason: `Work status is '${work.status}', must be 'todo' or 'in_progress'`,
        work,
      };
    }

    // Check 5: Must not be blocked
    if (work.blockedBy && work.blockedBy.length > 0) {
      return {
        canTrigger: false,
        reason: `Work is blocked by ${work.blockedBy.length} other work(s): ${work.blockedBy.join(', ')}`,
        work,
      };
    }

    // All conditions met
    return {
      canTrigger: true,
      reason: 'All conditions met: assigned to agent, startAt time reached, status is ready, not blocked',
      work,
    };
  }
}
