import { Injectable, Logger } from '@nestjs/common';
import { getNotificationConfig } from '../../config/notification.config';
import { Work } from '../work/work.schema';
import { RequestContext } from '@hydrabyte/shared';

export type NotificationEventType =
  | 'work.created'
  | 'work.assigned'
  | 'work.status_changed'
  | 'work.blocked'
  | 'work.review_requested'
  | 'work.completed';

export interface NotificationEvent {
  type: NotificationEventType;
  workId: string;
  work: Work;
  actor: RequestContext;
  previousStatus?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly config = getNotificationConfig();

  /**
   * Send notification asynchronously (fire-and-forget)
   * Does not block the main request
   */
  async notify(event: NotificationEvent): Promise<void> {
    // Fire-and-forget pattern - don't await
    this.sendNotificationAsync(event).catch(err => {
      this.logger.error(`Failed to send notification: ${err.message}`, err.stack);
    });
  }

  /**
   * Async notification sender
   */
  private async sendNotificationAsync(event: NotificationEvent): Promise<void> {
    if (this.config.discord.enabled) {
      await this.sendDiscordNotification(event);
    }

    // Future: Send to email, NOTI service, etc.
  }

  /**
   * Send notification to Discord webhook
   */
  private async sendDiscordNotification(event: NotificationEvent): Promise<void> {
    try {
      const message = this.formatDiscordMessage(event);

      const response = await fetch(this.config.discord.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook returned ${response.status}`);
      }

      this.logger.log(`Discord notification sent for ${event.type}: ${event.workId}`);
    } catch (error: any) {
      this.logger.error(`Discord notification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format notification for Discord
   */
  private formatDiscordMessage(event: NotificationEvent): any {
    const { work, type, actor, previousStatus } = event;

    const colorMap: Record<NotificationEventType, number> = {
      'work.created': 0x00ff00,       // Green
      'work.assigned': 0x0099ff,      // Blue
      'work.status_changed': 0xffaa00, // Orange
      'work.blocked': 0xff0000,       // Red
      'work.review_requested': 0xaa00ff, // Purple
      'work.completed': 0x00ffaa,     // Teal
    };

    const descriptions: Record<NotificationEventType, string> = {
      'work.created': `New work created by ${actor.userId}`,
      'work.assigned': `Work assigned to ${work.assignee?.type} ${work.assignee?.id}`,
      'work.status_changed': `Status changed from ${previousStatus} to ${work.status}`,
      'work.blocked': `Work blocked: ${work.reason || 'No reason provided'}`,
      'work.review_requested': `Work ready for review`,
      'work.completed': `Work completed successfully`,
    };

    return {
      embeds: [{
        title: `[${work.type.toUpperCase()}] ${work.title}`,
        description: descriptions[type],
        color: colorMap[type],
        fields: [
          { name: 'Status', value: work.status, inline: true },
          { name: 'Type', value: work.type, inline: true },
          { name: 'ID', value: (work as any)._id.toString(), inline: true },
        ],
        timestamp: new Date().toISOString(),
      }]
    };
  }
}
