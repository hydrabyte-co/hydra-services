import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { RequestContext, createLogger } from '@hydrabyte/shared';
import { Product, ProductDocument } from './product.schema';
import { CreateProductDto, UpdateProductDto } from './product.dto';
import { ProductProducer } from '../../queues/producers/product.producer';

@Injectable()
export class ProductService extends BaseService<Product> {
  private readonly logger = createLogger('ProductService');

  constructor(
    @InjectModel(Product.name) productModel: Model<ProductDocument>,
    private readonly productProducer: ProductProducer,
  ) {
    super(productModel);
  }

  async create(createProductDto: CreateProductDto, context: RequestContext): Promise<Product> {
    this.logger.debug('Creating product', createProductDto);

    const saved = await super.create(createProductDto, context);

    this.logger.info('Product created successfully', {
      id: saved._id,
      name: saved.name
    });

    await this.productProducer.emitProductCreated(saved);

    return saved as Product;
  }

  async findAll(options: FindManyOptions, context: RequestContext): Promise<FindManyResult<Product>> {
    this.logger.debug('Fetching products with options', options);

    const result = await super.findAll(options, context);

    this.logger.info('Products retrieved', {
      count: result.data.length,
      total: result.pagination.total,
      page: result.pagination.page
    });

    return result;
  }

  async findOne(id: string, context: RequestContext): Promise<Product | null> {
    this.logger.debug('Fetching product by ID', { id });

    const product = await super.findById(new Types.ObjectId(id), context);

    if (!product) {
      this.logger.warn('Product not found', { id });
    }

    return product;
  }

  async findByCategory(categoryId: string, options: FindManyOptions, context: RequestContext): Promise<FindManyResult<Product>> {
    this.logger.debug('Fetching products by category', { categoryId });

    const filterOptions = {
      ...options,
      filter: { ...options.filter, categoryId }
    };

    return super.findAll(filterOptions, context);
  }

  async update(id: string, updateProductDto: UpdateProductDto, context: RequestContext): Promise<Product | null> {
    this.logger.debug('Updating product', { id, data: updateProductDto });

    const updated = await super.update(new Types.ObjectId(id), updateProductDto, context);

    if (updated) {
      this.logger.info('Product updated successfully', {
        id: updated._id,
        name: updated.name
      });

      await this.productProducer.emitProductUpdated(updated);
    } else {
      this.logger.warn('Product not found for update', { id });
    }

    return updated;
  }

  async remove(id: string, context: RequestContext): Promise<void> {
    this.logger.debug('Soft deleting product', { id });

    const result = await super.softDelete(new Types.ObjectId(id), context);

    if (result) {
      this.logger.info('Product soft deleted successfully', { id });

      await this.productProducer.emitProductDeleted(id);
    } else {
      this.logger.warn('Product not found for deletion', { id });
    }
  }

  async countByCategory(categoryId: string): Promise<number> {
    return this.model.countDocuments({ categoryId, isDeleted: false }).exec();
  }
}
