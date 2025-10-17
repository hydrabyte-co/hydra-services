import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationEventType,
  NotificationSeverity,
  NotificationDeliveryStatus,
} from '../notification.schema';

/**
 * DTO for notification response
 */
export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  _id: string;

  @ApiProperty({
    description: 'Event type',
    enum: NotificationEventType,
  })
  event: NotificationEventType;

  @ApiPropertyOptional({ description: 'Title' })
  title?: string;

  @ApiPropertyOptional({ description: 'Message' })
  message?: string;

  @ApiPropertyOptional({
    description: 'Severity',
    enum: NotificationSeverity,
  })
  severity?: NotificationSeverity;

  @ApiPropertyOptional({ description: 'Event name' })
  name?: string;

  @ApiProperty({ description: 'Notification metadata' })
  notificationMetadata: {
    correlationId?: string;
    orgId?: string;
    userId?: string;
    agentId?: string;
    timestamp: string;
  };

  @ApiPropertyOptional({ description: 'Additional data payload' })
  data?: Record<string, any>;

  @ApiProperty({ description: 'Notification recipients' })
  recipients: {
    userIds: string[];
    orgIds: string[];
    agentIds: string[];
    broadcast: boolean;
  };

  @ApiProperty({
    description: 'Delivery status',
    enum: NotificationDeliveryStatus,
  })
  deliveryStatus: NotificationDeliveryStatus;

  @ApiProperty({ description: 'Array of user IDs who read this notification' })
  readByUserIds: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Soft delete timestamp' })
  deletedAt?: Date;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;

  @ApiProperty({ description: 'Last updated by user ID' })
  updatedBy: string;
}
