import { PartialType } from '@nestjs/swagger';
import { CreateNotificationDto } from './create-notification.dto';

/**
 * DTO for updating a notification
 * Extends CreateNotificationDto with all fields optional
 */
export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {}
