import { Model, ObjectId } from 'mongoose';
import {
  RequestContext,
  createRoleBasedPermissions,
  PermissionContext,
} from '@hydrabyte/shared';
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

export class BaseService<
  Entity,
  CreateDTO,
  UpdateDTO
> {
  constructor(protected readonly model: Model<Entity>) {}

  async create(data: CreateDTO, context: RequestContext): Promise<Entity> {
    const created = new this.model(data);
    const { permissions } = createRoleBasedPermissions(context);
    if (!permissions.allowCreate) {
      throw new ForbiddenException('You do not have permission to create.');
    }
    const saved = await created.save();
    // Loại bỏ isDeleted và deletedAt khỏi kết quả trả về
    const obj = saved.toObject ? saved.toObject() : saved;
    delete (obj as any).isDeleted;
    delete (obj as any).deletedAt;
    return obj as Entity;
  }

  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<Entity>> {
    const { filter = {}, sort, page = 1, limit = 10 } = options;
    filter['isDeleted'] = false;
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-isDeleted -deletedAt')
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: { page, limit, total } };
  }

  async findById(
    id: ObjectId,
    context: RequestContext
  ): Promise<Entity | null> {
    return this.model
      .findOne({ _id: id, isDeleted: false })
      .select('-isDeleted -deletedAt')
      .exec();
  }

  async update(
    id: ObjectId,
    updateData: UpdateDTO,
    context: RequestContext
  ): Promise<Entity | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          isDeleted: false,
        },
        updateData,
        { new: true }
      )
      .select('-isDeleted -deletedAt')
      .exec();
  }

  async hardDelete(
    id: ObjectId,
    context: RequestContext
  ): Promise<Entity | null> {
    const deleted = await this.model
      .findOneAndDelete({ _id: id, isDeleted: false })
      .exec();
    if (!deleted) return null;
    // Trả về chỉ _id và deletedAt (nếu có)
    return {
      _id: deleted._id,
      deletedAt: new Date(),
    } as any;
  }

  async softDelete(
    id: ObjectId,
    context: RequestContext
  ): Promise<Entity | null> {
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      )
      .exec();
    if (!updated) return null;
    // Trả về chỉ _id và deletedAt
    return {
      _id: updated._id,
      deletedAt: new Date(),
    } as any;
  }
}
