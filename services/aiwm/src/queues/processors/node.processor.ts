import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from '../../config/queue.config';

@Processor(QUEUE_NAMES.NODES)
export class NodeProcessor extends WorkerHost {
  private readonly logger = new Logger(NodeProcessor.name);

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case QUEUE_EVENTS.NODE_CREATED:
        return this.handleNodeCreated(job.data);
      case QUEUE_EVENTS.NODE_UPDATED:
        return this.handleNodeUpdated(job.data);
      case QUEUE_EVENTS.NODE_DELETED:
        return this.handleNodeDeleted(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return null;
    }
  }

  private async handleNodeCreated(data: any) {
    this.logger.log(`Node created: ${JSON.stringify(data.data)}`);
    // Add your business logic here
    // Examples: send notification, update cache, sync to other services, etc.
    return { processed: true, event: QUEUE_EVENTS.NODE_CREATED };
  }

  private async handleNodeUpdated(data: any) {
    this.logger.log(`Node updated: ${JSON.stringify(data.data)}`);
    // Add your business logic here
    return { processed: true, event: QUEUE_EVENTS.NODE_UPDATED };
  }

  private async handleNodeDeleted(data: any) {
    this.logger.log(`Node deleted: ${JSON.stringify(data.data)}`);
    // Add your business logic here
    return { processed: true, event: QUEUE_EVENTS.NODE_DELETED };
  }
}
