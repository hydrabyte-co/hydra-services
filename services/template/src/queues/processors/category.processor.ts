import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from '../../config/queue.config';

@Processor(QUEUE_NAMES.CATEGORIES)
export class CategoryProcessor extends WorkerHost {
  private readonly logger = new Logger(CategoryProcessor.name);

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case QUEUE_EVENTS.CATEGORY_CREATED:
        return this.handleCategoryCreated(job.data);
      case QUEUE_EVENTS.CATEGORY_UPDATED:
        return this.handleCategoryUpdated(job.data);
      case QUEUE_EVENTS.CATEGORY_DELETED:
        return this.handleCategoryDeleted(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return null;
    }
  }

  private async handleCategoryCreated(data: any) {
    this.logger.log(`Category created: ${JSON.stringify(data.data)}`);
    // Add your business logic here
    // Examples: send notification, update cache, sync to other services, etc.
    return { processed: true, event: QUEUE_EVENTS.CATEGORY_CREATED };
  }

  private async handleCategoryUpdated(data: any) {
    this.logger.log(`Category updated: ${JSON.stringify(data.data)}`);
    // Add your business logic here
    return { processed: true, event: QUEUE_EVENTS.CATEGORY_UPDATED };
  }

  private async handleCategoryDeleted(data: any) {
    this.logger.log(`Category deleted: ${JSON.stringify(data.data)}`);
    // Add your business logic here
    return { processed: true, event: QUEUE_EVENTS.CATEGORY_DELETED };
  }
}
