import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from '../../config/queue.config';

@Processor(QUEUE_NAMES.MODELS)
export class ModelProcessor extends WorkerHost {
  private readonly logger = new Logger(ModelProcessor.name);

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case QUEUE_EVENTS.MODEL_CREATED:
        return this.handleModelCreated(job.data);
      case QUEUE_EVENTS.MODEL_UPDATED:
        return this.handleModelUpdated(job.data);
      case QUEUE_EVENTS.MODEL_DELETED:
        return this.handleModelDeleted(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return null;
    }
  }

  private async handleModelCreated(data: any) {
    this.logger.log(`Model created: ${JSON.stringify(data.data)}`);
    // Add your business logic here
    // Examples: send notification, update model registry, sync to storage, etc.
    return { processed: true, event: QUEUE_EVENTS.MODEL_CREATED };
  }

  private async handleModelUpdated(data: any) {
    this.logger.log(`Model updated: ${JSON.stringify(data.data)}`);
    // Add your business logic here
    return { processed: true, event: QUEUE_EVENTS.MODEL_UPDATED };
  }

  private async handleModelDeleted(data: any) {
    this.logger.log(`Model deleted: ${JSON.stringify(data.data)}`);
    // Add your business logic here
    return { processed: true, event: QUEUE_EVENTS.MODEL_DELETED };
  }
}
