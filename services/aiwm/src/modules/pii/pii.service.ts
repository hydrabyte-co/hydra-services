import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Pii } from './pii.schema';

/**
 * PiiService
 * Manages PII pattern entities for data protection
 * Extends BaseService for automatic CRUD operations
 */
@Injectable()
export class PiiService extends BaseService<Pii> {
  constructor(@InjectModel(Pii.name) private piiModel: Model<Pii>) {
    super(piiModel);
  }

  /**
   * Override findAll to handle statistics aggregation
   */
  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<Pii>> {
    const findResult = await super.findAll(options, context);

    // Aggregate statistics by status and type
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

  /**
   * Get all active and enabled PII patterns
   * Used by PII detection utility
   */
  async getActivePatterns(context: RequestContext): Promise<Pii[]> {
    return this.piiModel
      .find({
        status: 'active',
        enabled: true,
        isDeleted: false,
        'owner.orgId': context.orgId,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
}
