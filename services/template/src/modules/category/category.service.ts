import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseService } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Category } from './category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';
import { CategoryProducer } from '../../queues/producers/category.producer';

@Injectable()
export class CategoryService extends BaseService<Category> {

  constructor(
    @InjectModel(Category.name) categoryModel: Model<Category>,
    private readonly categoryProducer: CategoryProducer,
  ) {
    super(categoryModel as any);
  }

  async create(createCategoryDto: CreateCategoryDto, context: RequestContext): Promise<Category> {
    // BaseService handles permissions, ownership, save, and generic logging
    const saved = await super.create(createCategoryDto, context);

    // Business-specific logging with details
    this.logger.info('Category created with details', {
      id: (saved as any)._id,
      name: saved.name,
      description: saved.description,
      isActive: saved.isActive,
      createdBy: context.userId
    });

    // Emit event to queue
    await this.categoryProducer.emitCategoryCreated(saved);

    return saved as Category;
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto, context: RequestContext): Promise<Category | null> {
    // BaseService handles permissions, update, and generic logging
    const updated = await super.update(new Types.ObjectId(id) as any, updateCategoryDto, context);

    if (updated) {
      // Business-specific logging with details
      this.logger.info('Category updated with details', {
        id: (updated as any)._id,
        name: updated.name,
        description: updated.description,
        updatedBy: context.userId
      });

      // Emit event to queue
      await this.categoryProducer.emitCategoryUpdated(updated);
    }

    return updated;
  }

  async remove(id: string, context: RequestContext): Promise<void> {
    // BaseService handles soft delete, permissions, and generic logging
    const result = await super.softDelete(new Types.ObjectId(id) as any, context);

    if (result) {
      // Business-specific logging
      this.logger.info('Category soft deleted with details', {
        id,
        deletedBy: context.userId
      });

      // Emit event to queue
      await this.categoryProducer.emitCategoryDeleted(id);
    }
  }
}
