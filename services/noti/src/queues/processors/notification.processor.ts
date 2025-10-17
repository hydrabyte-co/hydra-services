import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationGateway } from '../../modules/notification/notification.gateway';
import { NotificationService } from '../../modules/notification/notification.service';
import { QUEUE_NAMES } from '../queue.config';
import {
  NotificationQueueEvent,
  SystemNotificationQueueEvent,
  ServiceEventQueueEvent,
  ServiceAlertQueueEvent,
  AgentEventQueueEvent,
} from '../queue.types';

/**
 * NotificationProcessor
 * Processes events from the 'noti' queue and:
 * 1. Saves notification to database
 * 2. Emits event to WebSocket clients
 */
@Processor(QUEUE_NAMES.NOTI)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationGateway: NotificationGateway,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job<NotificationQueueEvent>): Promise<void> {
    const { event, data } = job.data;

    this.logger.log(`Processing ${event} event (Job ID: ${job.id})`);

    try {
      // Save notification to database
      const savedNotification = await this.saveNotification(job.data);

      // Add notificationId to metadata for WebSocket emission
      const notificationId = (savedNotification as any)._id.toString();

      // Emit to WebSocket based on event type
      switch (event) {
        case 'system.notification':
          await this.handleSystemNotification(
            job.data as SystemNotificationQueueEvent,
            notificationId,
          );
          break;

        case 'service.event':
          await this.handleServiceEvent(
            job.data as ServiceEventQueueEvent,
            notificationId,
          );
          break;

        case 'service.alert':
          await this.handleServiceAlert(
            job.data as ServiceAlertQueueEvent,
            notificationId,
          );
          break;

        case 'agent.event':
          await this.handleAgentEvent(
            job.data as AgentEventQueueEvent,
            notificationId,
          );
          break;

        default:
          this.logger.warn(`Unknown event type: ${event}`);
      }

      this.logger.log(`Successfully processed ${event} (Job ID: ${job.id})`);
    } catch (error) {
      this.logger.error(
        `Failed to process ${event} (Job ID: ${job.id}):`,
        error,
      );
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Save notification to database
   */
  private async saveNotification(queueEvent: NotificationQueueEvent) {
    const { event, data } = queueEvent;

    // Create notification document based on event type
    const notificationData: any = {
      event,
      notificationMetadata: data.metadata,
      recipients: data.recipients,
      data: (data as any).data || {},
    };

    // Add type-specific fields
    if ('title' in data) {
      notificationData.title = data.title;
    }
    if ('message' in data) {
      notificationData.message = data.message;
    }
    if ('severity' in data) {
      notificationData.severity = data.severity;
    }
    if ('name' in data) {
      notificationData.name = data.name;
    }

    // Save using NotificationService (will use system context for queue events)
    const systemContext = {
      userId: 'system',
      username: 'system',
      roles: ['system.admin'],
      orgId: data.metadata.orgId || '',
      groupId: '',
      agentId: (data.metadata as any).agentId || '',
      appId: '',
    };

    return await this.notificationService.create(
      notificationData,
      systemContext as any,
    );
  }

  /**
   * Handle system.notification event
   */
  private async handleSystemNotification(
    queueEvent: SystemNotificationQueueEvent,
    notificationId: string,
  ) {
    const { data } = queueEvent;

    this.notificationGateway.emitSystemNotification({
      title: data.title,
      message: data.message,
      severity: data.severity as any,
      notificationMetadata: {
        notificationId,
        ...data.metadata,
      },
      data: data.data,
      recipients: data.recipients,
    });
  }

  /**
   * Handle service.event
   */
  private async handleServiceEvent(
    queueEvent: ServiceEventQueueEvent,
    notificationId: string,
  ) {
    const { data } = queueEvent;

    this.notificationGateway.emitServiceEvent({
      name: data.name,
      notificationMetadata: {
        notificationId,
        ...data.metadata,
      },
      data: data.data,
      recipients: data.recipients,
    });
  }

  /**
   * Handle service.alert
   */
  private async handleServiceAlert(
    queueEvent: ServiceAlertQueueEvent,
    notificationId: string,
  ) {
    const { data } = queueEvent;

    this.notificationGateway.emitServiceAlert({
      title: data.title,
      message: data.message,
      severity: data.severity as any,
      notificationMetadata: {
        notificationId,
        ...data.metadata,
      },
      data: data.data,
      recipients: data.recipients,
    });
  }

  /**
   * Handle agent.event
   */
  private async handleAgentEvent(
    queueEvent: AgentEventQueueEvent,
    notificationId: string,
  ) {
    const { data } = queueEvent;

    this.notificationGateway.emitAgentEvent({
      name: data.name,
      title: data.title,
      message: data.message,
      severity: data.severity as any,
      notificationMetadata: {
        notificationId,
        ...data.metadata,
      },
      data: data.data,
      recipients: data.recipients,
    });
  }
}
