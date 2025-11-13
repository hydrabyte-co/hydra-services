import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseService } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Model as ModelEntity, ModelDocument } from './model.schema';
import { CreateModelDto, UpdateModelDto } from './model.dto';
import { ModelProducer } from '../../queues/producers/model.producer';

@Injectable()
export class ModelService extends BaseService<ModelEntity> {

  constructor(
    @InjectModel(ModelEntity.name) modelModel: Model<ModelEntity>,
    private readonly modelProducer: ModelProducer,
  ) {
    super(modelModel as any);
  }

  async create(createModelDto: CreateModelDto, context: RequestContext): Promise<ModelEntity> {
    // BaseService handles permissions, ownership, save, and generic logging
    const saved = await super.create(createModelDto, context);

    // Business-specific logging with details
    this.logger.info('Model created with details', {
      id: (saved as any)._id,
      modelId: saved.modelId,
      name: saved.name,
      version: saved.version,
      type: saved.type,
      framework: saved.framework,
      repository: saved.repository,
      fileSize: saved.fileSize,
      nodeId: saved.nodeId,
      createdBy: context.userId
    });

    // Emit event to queue
    await this.modelProducer.emitModelCreated(saved);

    return saved as ModelEntity;
  }

  async updateModel(id: string, updateModelDto: UpdateModelDto, context: RequestContext): Promise<ModelEntity | null> {
    // Convert string to ObjectId for BaseService
    const objectId = new Types.ObjectId(id);
    const updated = await super.update(objectId as any, updateModelDto as any, context);

    if (updated) {
      // Business-specific logging with details
      this.logger.info('Model updated with details', {
        id: (updated as any)._id,
        modelId: updated.modelId,
        name: updated.name,
        version: updated.version,
        type: updated.type,
        framework: updated.framework,
        repository: updated.repository,
        fileSize: updated.fileSize,
        nodeId: updated.nodeId,
        updatedBy: context.userId
      });

      // Emit event to queue
      await this.modelProducer.emitModelUpdated(updated);
    }

    return updated;
  }

  async remove(id: string, context: RequestContext): Promise<void> {
    // BaseService handles soft delete, permissions, and generic logging
    const result = await super.softDelete(new Types.ObjectId(id) as any, context);

    if (result) {
      // Business-specific logging
      this.logger.info('Model soft deleted with details', {
        id,
        deletedBy: context.userId
      });

      // Emit event to queue
      await this.modelProducer.emitModelDeleted(id);
    }
  }
}