import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../queue.config';
import {
  SystemNotificationQueueEvent,
  ServiceEventQueueEvent,
  ServiceAlertQueueEvent,
  AgentEventQueueEvent,
} from '../queue.types';

/**
 * NotificationProducer
 * Produces events to the 'noti' queue
 */
@Injectable()
export class NotificationProducer {
  private readonly logger = new Logger(NotificationProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.NOTI)
    private readonly notiQueue: Queue,
  ) {}

  /**
   * Emit system.notification event to queue
   */
  async emitSystemNotification(
    data: SystemNotificationQueueEvent['data'],
  ): Promise<void> {
    const event: SystemNotificationQueueEvent = {
      event: 'system.notification',
      data,
    };

    await this.notiQueue.add('system.notification', event, {
      removeOnComplete: true,
      removeOnFail: 100, // Keep last 100 failed jobs for debugging
    });

    this.logger.log(`Queued system.notification: ${data.title}`);
  }

  /**
   * Emit service.event to queue
   */
  async emitServiceEvent(
    data: ServiceEventQueueEvent['data'],
  ): Promise<void> {
    const event: ServiceEventQueueEvent = {
      event: 'service.event',
      data,
    };

    await this.notiQueue.add('service.event', event, {
      removeOnComplete: true,
      removeOnFail: 100,
    });

    this.logger.log(`Queued service.event: ${data.name}`);
  }

  /**
   * Emit service.alert to queue
   */
  async emitServiceAlert(data: ServiceAlertQueueEvent['data']): Promise<void> {
    const event: ServiceAlertQueueEvent = {
      event: 'service.alert',
      data,
    };

    await this.notiQueue.add('service.alert', event, {
      removeOnComplete: true,
      removeOnFail: 100,
      priority: this.getPriority(data.severity),
    });

    this.logger.log(
      `Queued service.alert: ${data.title} (${data.severity})`,
    );
  }

  /**
   * Emit agent.event to queue
   */
  async emitAgentEvent(data: AgentEventQueueEvent['data']): Promise<void> {
    const event: AgentEventQueueEvent = {
      event: 'agent.event',
      data,
    };

    await this.notiQueue.add('agent.event', event, {
      removeOnComplete: true,
      removeOnFail: 100,
    });

    this.logger.log(`Queued agent.event: ${data.name}`);
  }

  /**
   * Get priority based on severity
   */
  private getPriority(severity: string): number {
    const priorityMap: Record<string, number> = {
      critical: 1,
      high: 2,
      normal: 3,
      low: 4,
    };
    return priorityMap[severity] || 3;
  }
}
