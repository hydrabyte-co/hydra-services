import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { RequestContext, createLogger } from '@hydrabyte/shared';
import { Category } from './category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';
import { CategoryProducer } from '../../queues/producers/category.producer';

@Injectable()
export class CategoryService extends BaseService<Category> {
  private readonly logger = createLogger('CategoryService');

  constructor(
    @InjectModel(Category.name) categoryModel: Model<Category>,
    private readonly categoryProducer: CategoryProducer,
  ) {
    super(categoryModel as any);
  }

  async create(createCategoryDto: CreateCategoryDto, context: RequestContext): Promise<Category> {
    this.logger.debug('Creating category', createCategoryDto);

    // BaseService handles permissions, ownership, and save
    const saved = await super.create(createCategoryDto, context);

    this.logger.info('Category created successfully', {
      id: (saved as any)._id,
      name: saved.name
    });

    // Emit event to queue
    await this.categoryProducer.emitCategoryCreated(saved);

    return saved as Category;
  }

  async findAll(options: FindManyOptions, context: RequestContext): Promise<FindManyResult<Category>> {
    this.logger.debug('Fetching categories with options', options);

    // BaseService handles permissions, filtering, pagination
    const result = await super.findAll(options, context);

    this.logger.info('Categories retrieved', {
      count: result.data.length,
      total: result.pagination.total,
      page: result.pagination.page
    });

    return result;
  }

  async findOne(id: string, context: RequestContext): Promise<Category | null> {
    this.logger.debug('Fetching category by ID', { id });

    const category = await super.findById(new Types.ObjectId(id) as any, context);

    if (!category) {
      this.logger.warn('Category not found', { id });
    }

    return category;
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto, context: RequestContext): Promise<Category | null> {
    this.logger.debug('Updating category', { id, data: updateCategoryDto });

    // BaseService handles permissions and update
    const updated = await super.update(new Types.ObjectId(id) as any, updateCategoryDto, context);

    if (updated) {
      this.logger.info('Category updated successfully', {
        id: (updated as any)._id,
        name: updated.name
      });

      // Emit event to queue
      await this.categoryProducer.emitCategoryUpdated(updated);
    } else {
      this.logger.warn('Category not found for update', { id });
    }

    return updated;
  }

  async remove(id: string, context: RequestContext): Promise<void> {
    this.logger.debug('Soft deleting category', { id });

    // BaseService handles soft delete with permissions
    const result = await super.softDelete(new Types.ObjectId(id) as any, context);

    if (result) {
      this.logger.info('Category soft deleted successfully', { id });

      // Emit event to queue
      await this.categoryProducer.emitCategoryDeleted(id);
    } else {
      this.logger.warn('Category not found for deletion', { id });
    }
  }
}
