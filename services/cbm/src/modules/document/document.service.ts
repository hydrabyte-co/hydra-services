import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Document } from './document.schema';

/**
 * DocumentService
 * Manages document entities (user or AI agent generated documents)
 * Extends BaseService for automatic CRUD operations
 */
@Injectable()
export class DocumentService extends BaseService<Document> {
  constructor(
    @InjectModel(Document.name) private documentModel: Model<Document>
  ) {
    super(documentModel);
  }

  /**
   * Override findById to exclude content field
   */
  async findById(
    id: ObjectId,
    context: RequestContext
  ): Promise<Document | null> {
    return this.documentModel
      .findOne({ _id: id, deletedAt: null })
      .select('-content')
      .lean()
      .exec() as Promise<Document | null>;
  }

  /**
   * Find document by ID with full content (for /content endpoint)
   */
  async findByIdWithContent(
    id: ObjectId,
    context: RequestContext
  ): Promise<Document | null> {
    return this.documentModel
      .findOne({ _id: id, deletedAt: null })
      .lean()
      .exec() as Promise<Document | null>;
  }

  /**
   * Override findAll to handle statistics aggregation and optimize response
   * Aggregates by type and status
   * Excludes 'content' field to reduce response size (using projection for performance)
   */
  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<Document>> {
    const findResult = await super.findAll(options, context);

    // Exclude content field from results to reduce response size
    findResult.data = findResult.data.map((doc: any) => {
      // Convert Mongoose document to plain object
      const plainDoc = doc.toObject ? doc.toObject() : doc;
      const { content, ...rest } = plainDoc;
      return rest as Document;
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
}
