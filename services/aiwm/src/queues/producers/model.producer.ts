import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from '../../config/queue.config';

@Injectable()
export class ModelProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.MODELS) private modelQueue: Queue,
  ) {}

  async emitModelCreated(model: any) {
    await this.modelQueue.add(QUEUE_EVENTS.MODEL_CREATED, {
      event: QUEUE_EVENTS.MODEL_CREATED,
      data: model,
      timestamp: new Date().toISOString(),
    });
  }

  async emitModelUpdated(model: any) {
    await this.modelQueue.add(QUEUE_EVENTS.MODEL_UPDATED, {
      event: QUEUE_EVENTS.MODEL_UPDATED,
      data: model,
      timestamp: new Date().toISOString(),
    });
  }

  async emitModelDeleted(modelId: string) {
    await this.modelQueue.add(QUEUE_EVENTS.MODEL_DELETED, {
      event: QUEUE_EVENTS.MODEL_DELETED,
      data: { id: modelId },
      timestamp: new Date().toISOString(),
    });
  }
}