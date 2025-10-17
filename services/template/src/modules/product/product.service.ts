import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Product } from './product.schema';
import { CreateProductDto, UpdateProductDto } from './product.dto';
import { ProductProducer } from '../../queues/producers/product.producer';

@Injectable()
export class ProductService extends BaseService<Product> {

  constructor(
    @InjectModel(Product.name) productModel: Model<Product>,
    private readonly productProducer: ProductProducer,
  ) {
    super(productModel as any);
  }

  async create(createProductDto: CreateProductDto, context: RequestContext): Promise<Product> {
    // BaseService handles permissions, ownership, save, and generic logging
    const saved = await super.create(createProductDto, context);

    // Business-specific logging with details
    this.logger.info('Product created with details', {
      id: (saved as any)._id,
      name: saved.name,
      price: saved.price,
      stock: saved.stock,
      categoryId: saved.categoryId,
      createdBy: context.userId
    });

    // Emit event to queue
    await this.productProducer.emitProductCreated(saved);

    return saved as Product;
  }

  async findByCategory(categoryId: string, options: FindManyOptions, context: RequestContext): Promise<FindManyResult<Product>> {
    // Business-specific method - add category filter
    const filterOptions = {
      ...options,
      filter: { ...options.filter, categoryId }
    };

    // BaseService handles the rest
    return super.findAll(filterOptions, context);
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto, context: RequestContext): Promise<Product | null> {
    // BaseService handles permissions, update, and generic logging
    const updated = await super.update(new Types.ObjectId(id) as any, updateProductDto as any, context);

    if (updated) {
      // Business-specific logging with details
      this.logger.info('Product updated with details', {
        id: (updated as any)._id,
        name: updated.name,
        price: updated.price,
        stock: updated.stock,
        updatedBy: context.userId
      });

      // Emit event to queue
      await this.productProducer.emitProductUpdated(updated);
    }

    return updated;
  }

  async remove(id: string, context: RequestContext): Promise<void> {
    // BaseService handles soft delete, permissions, and generic logging
    const result = await super.softDelete(new Types.ObjectId(id) as any, context);

    if (result) {
      // Business-specific logging
      this.logger.info('Product soft deleted with details', {
        id,
        deletedBy: context.userId
      });

      // Emit event to queue
      await this.productProducer.emitProductDeleted(id);
    }
  }

  async countByCategory(categoryId: string): Promise<number> {
    return this.model.countDocuments({ categoryId, isDeleted: false }).exec();
  }
}
