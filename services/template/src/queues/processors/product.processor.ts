import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from '../../config/queue.config';

@Processor(QUEUE_NAMES.PRODUCTS)
export class ProductProcessor extends WorkerHost {
  private readonly logger = new Logger(ProductProcessor.name);

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case QUEUE_EVENTS.PRODUCT_CREATED:
        return this.handleProductCreated(job.data);
      case QUEUE_EVENTS.PRODUCT_UPDATED:
        return this.handleProductUpdated(job.data);
      case QUEUE_EVENTS.PRODUCT_DELETED:
        return this.handleProductDeleted(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return null;
    }
  }

  private async handleProductCreated(data: any) {
    this.logger.log(`Product created: ${JSON.stringify(data.data)}`);
    // Add your business logic here
    // Examples: send notification, update inventory, sync to warehouse, etc.
    return { processed: true, event: QUEUE_EVENTS.PRODUCT_CREATED };
  }

  private async handleProductUpdated(data: any) {
    this.logger.log(`Product updated: ${JSON.stringify(data.data)}`);
    // Add your business logic here
    return { processed: true, event: QUEUE_EVENTS.PRODUCT_UPDATED };
  }

  private async handleProductDeleted(data: any) {
    this.logger.log(`Product deleted: ${JSON.stringify(data.data)}`);
    // Add your business logic here
    return { processed: true, event: QUEUE_EVENTS.PRODUCT_DELETED };
  }
}
