import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from '../../config/queue.config';

@Injectable()
export class NodeProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.NODES) private nodeQueue: Queue,
  ) {}

  async emitNodeCreated(node: any) {
    await this.nodeQueue.add(QUEUE_EVENTS.NODE_CREATED, {
      event: QUEUE_EVENTS.NODE_CREATED,
      data: node,
      timestamp: new Date().toISOString(),
    });
  }

  async emitNodeUpdated(node: any) {
    await this.nodeQueue.add(QUEUE_EVENTS.NODE_UPDATED, {
      event: QUEUE_EVENTS.NODE_UPDATED,
      data: node,
      timestamp: new Date().toISOString(),
    });
  }

  async emitNodeDeleted(nodeId: string) {
    await this.nodeQueue.add(QUEUE_EVENTS.NODE_DELETED, {
      event: QUEUE_EVENTS.NODE_DELETED,
      data: { id: nodeId },
      timestamp: new Date().toISOString(),
    });
  }
}