/* eslint-disable @typescript-eslint/no-unused-vars */
import { Model, ObjectId } from 'mongoose';
import { RequestContext, createRoleBasedPermissions } from '@hydrabyte/shared';
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
  constructor(protected readonly model: Model<Entity>) {}

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
    const permissions = createRoleBasedPermissions(context);
    if (!permissions.allowWrite) {
      throw new ForbiddenException('You do not have permission to create.');
    }

    // Enforce ownership
    const dataWithOwner = this.enforceOwnership(data, context);
    const created = new this.model(dataWithOwner);
    const saved = await created.save();

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
    const permissions = createRoleBasedPermissions(context);
    if (!permissions.allowRead) {
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
    return { data, pagination: { page, limit, total } };
  }

  async findById(
    id: ObjectId,
    context: RequestContext
  ): Promise<Entity | null> {
    const permissions = createRoleBasedPermissions(context);
    if (!permissions.allowRead) {
      throw new ForbiddenException('You do not have permission to read.');
    }

    const condition = { _id: id, ...permissions.filter, isDeleted: false };
    return this.model
      .findOne(condition)
      .select('-isDeleted -deletedAt -password')
      .exec();
  }

  async update(
    id: ObjectId,
    updateData: Partial<Entity>,
    context: RequestContext
  ): Promise<Entity | null> {
    const permissions = createRoleBasedPermissions(context);
    if (!permissions.allowWrite) {
      throw new ForbiddenException('You do not have permission to update.');
    }

    const condition = { _id: id, ...permissions.filter, isDeleted: false };

    // Prevent updating owner fields and password
    const sanitizedData = { ...updateData };
    delete (sanitizedData as any).owner;
    delete (sanitizedData as any).password;

    return this.model
      .findOneAndUpdate(condition, sanitizedData, { new: true })
      .select('-isDeleted -deletedAt -password')
      .exec();
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
    const permissions = createRoleBasedPermissions(context);
    if (!permissions.allowDelete) {
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

    if (!updated) return null;

    return {
      _id: updated._id,
      deletedAt: new Date(),
    } as any;
  }
}
