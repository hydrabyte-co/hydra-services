import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  ValidateNested,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationEventType,
  NotificationSeverity,
} from '../notification.schema';

/**
 * DTO for notification metadata
 */
export class NotificationMetadataDto {
  @ApiPropertyOptional({ description: 'Correlation ID for tracking' })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  orgId?: string;

  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Agent ID' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiProperty({ description: 'Timestamp in ISO format' })
  @IsString()
  timestamp: string;
}

/**
 * DTO for notification recipients
 */
export class NotificationRecipientsDto {
  @ApiPropertyOptional({
    description: 'Array of user IDs to receive notification',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    description: 'Array of organization IDs to receive notification',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  orgIds?: string[];

  @ApiPropertyOptional({
    description: 'Array of agent IDs to receive notification',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentIds?: string[];

  @ApiPropertyOptional({ description: 'Broadcast to all connected clients' })
  @IsOptional()
  @IsBoolean()
  broadcast?: boolean;
}

/**
 * DTO for creating a notification
 */
export class CreateNotificationDto {
  @ApiProperty({
    description: 'Event type',
    enum: NotificationEventType,
    example: NotificationEventType.SYSTEM_NOTIFICATION,
  })
  @IsEnum(NotificationEventType)
  event: NotificationEventType;

  @ApiPropertyOptional({
    description:
      'Title (for system.notification, service.alert, agent.event)',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description:
      'Message (for system.notification, service.alert, agent.event)',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description:
      'Severity (for system.notification, service.alert, agent.event)',
    enum: NotificationSeverity,
  })
  @IsOptional()
  @IsEnum(NotificationSeverity)
  severity?: NotificationSeverity;

  @ApiPropertyOptional({
    description: 'Event name (for service.event, agent.event)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Notification metadata' })
  @ValidateNested()
  @Type(() => NotificationMetadataDto)
  notificationMetadata: NotificationMetadataDto;

  @ApiPropertyOptional({
    description: 'Additional data payload',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty({ description: 'Notification recipients' })
  @ValidateNested()
  @Type(() => NotificationRecipientsDto)
  recipients: NotificationRecipientsDto;
}
