/* eslint-disable @typescript-eslint/no-unused-vars */
import { Model, ObjectId } from 'mongoose';
import { RequestContext, createRoleBasedPermissions, createLogger } from '@hydrabyte/shared';
import { ForbiddenException } from '@nestjs/common';

export interface FindManyResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
export interface FindManyOptions {
  filter?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  page?: number;
  limit?: number;
}

export class BaseService<Entity> {
  protected readonly logger;

  constructor(protected readonly model: Model<Entity>) {
    // Automatically get service name from child class
    const serviceName = this.constructor.name;
    this.logger = createLogger(serviceName);
  }

  /**
   * Enforce ownership by setting owner fields from context
   */
  private enforceOwnership(data: any, context: RequestContext): any {
    return {
      ...data,
      owner: {
        orgId: context.orgId || '',
        groupId: context.groupId || '',
        userId: context.userId || '',
        agentId: context.agentId || '',
        appId: context.appId || '',
      },
    };
  }

  async create(data: any, context: RequestContext): Promise<Partial<Entity>> {
    this.logger.debug('Creating entity', { userId: context.userId });

    const permissions = createRoleBasedPermissions(context);
    if (!permissions.allowWrite) {
      this.logger.warn('Create permission denied', { userId: context.userId, roles: context.roles });
      throw new ForbiddenException('You do not have permission to create.');
    }

    // Enforce ownership
    const dataWithOwner = this.enforceOwnership(data, context);
    const created = new this.model(dataWithOwner);
    const saved = await created.save();

    this.logger.info('Entity created', { id: (saved as any)._id, userId: context.userId });

    // Remove internal fields and password from result
    const obj = saved.toObject ? saved.toObject() : saved;
    delete (obj as any).isDeleted;
    delete (obj as any).deletedAt;
    delete (obj as any).password;
    return obj as Entity;
  }

  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<Entity>> {
    this.logger.debug('Finding entities', { page: options.page, limit: options.limit, userId: context.userId });

    const permissions = createRoleBasedPermissions(context);
    if (!permissions.allowRead) {
      this.logger.warn('Read permission denied', { userId: context.userId, roles: context.roles });
      throw new ForbiddenException('You do not have permission to read.');
    }

    const { filter = {}, sort, page = 1, limit = 10 } = options;

    // Merge user filter with scope-based filter
    const finalFilter = { ...filter, ...permissions.filter, isDeleted: false };

    const [data, total] = await Promise.all([
      this.model
        .find(finalFilter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-isDeleted -deletedAt -password')
        .exec(),
      this.model.countDocuments(finalFilter).exec(),
    ]);

    this.logger.info('Entities retrieved', { count: data.length, total, page, userId: context.userId });

    return { data, pagination: { page, limit, total } };
  }

  async findById(
    id: ObjectId,
    context: RequestContext
  ): Promise<Entity | null> {
    this.logger.debug('Finding entity by ID', { id: id.toString(), userId: context.userId });

    const permissions = createRoleBasedPermissions(context);
    if (!permissions.allowRead) {
      this.logger.warn('Read permission denied', { userId: context.userId, roles: context.roles });
      throw new ForbiddenException('You do not have permission to read.');
    }

    const condition = { _id: id, ...permissions.filter, isDeleted: false };
    const entity = await this.model
      .findOne(condition)
      .select('-isDeleted -deletedAt -password')
      .exec();

    if (entity) {
      this.logger.debug('Entity found', { id: id.toString() });
    } else {
      this.logger.debug('Entity not found', { id: id.toString() });
    }

    return entity;
  }

  async update(
    id: ObjectId,
    updateData: Partial<Entity>,
    context: RequestContext
  ): Promise<Entity | null> {
    this.logger.debug('Updating entity', { id: id.toString(), userId: context.userId });

    const permissions = createRoleBasedPermissions(context);
    if (!permissions.allowWrite) {
      this.logger.warn('Update permission denied', { userId: context.userId, roles: context.roles });
      throw new ForbiddenException('You do not have permission to update.');
    }

    const condition = { _id: id, ...permissions.filter, isDeleted: false };

    // Prevent updating owner fields and password
    const sanitizedData = { ...updateData };
    delete (sanitizedData as any).owner;
    delete (sanitizedData as any).password;

    const updated = await this.model
      .findOneAndUpdate(condition, sanitizedData, { new: true })
      .select('-isDeleted -deletedAt -password')
      .exec();

    if (updated) {
      this.logger.info('Entity updated', { id: id.toString(), userId: context.userId });
    } else {
      this.logger.warn('Entity not found for update', { id: id.toString() });
    }

    return updated;
  }

  async hardDelete(
    id: ObjectId,
    context: RequestContext
  ): Promise<Entity | null> {
    const permissions = createRoleBasedPermissions(context);
    if (!permissions.allowAdministrative) {
      throw new ForbiddenException(
        'You do not have administrative permission for hard delete.'
      );
    }

    const condition = { _id: id, ...permissions.filter, isDeleted: false };
    const deleted = await this.model.findOneAndDelete(condition).exec();
    if (!deleted) return null;

    return {
      _id: deleted._id,
      deletedAt: new Date(),
    } as any;
  }

  async softDelete(
    id: ObjectId,
    context: RequestContext
  ): Promise<Entity | null> {
    this.logger.debug('Soft deleting entity', { id: id.toString(), userId: context.userId });

    const permissions = createRoleBasedPermissions(context);
    if (!permissions.allowDelete) {
      this.logger.warn('Delete permission denied', { userId: context.userId, roles: context.roles });
      throw new ForbiddenException('You do not have permission to delete.');
    }

    const condition = { _id: id, ...permissions.filter, isDeleted: false };
    const updated = await this.model
      .findOneAndUpdate(
        condition,
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      )
      .exec();

    if (updated) {
      this.logger.info('Entity soft deleted', { id: id.toString(), userId: context.userId });
    } else {
      this.logger.warn('Entity not found for deletion', { id: id.toString() });
    }

    if (!updated) return null;

    return {
      _id: updated._id,
      deletedAt: new Date(),
    } as any;
  }
}
