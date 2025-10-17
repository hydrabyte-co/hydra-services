import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Types } from 'mongoose';
import { NotificationService } from './notification.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationResponseDto,
  MarkReadDto,
} from './dto';

/**
 * NotificationController
 * Modern controller pattern with @CurrentUser decorator
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiTags('notifications')
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Create a new notification
   */
  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiCreatedResponse({
    description: 'Notification created successfully',
    type: NotificationResponseDto,
  })
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.notificationService.create(createNotificationDto, context);
  }

  /**
   * Get all notifications for current user
   */
  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiOkResponse({
    description: 'List of notifications',
    type: [NotificationResponseDto],
  })
  async findAll(
    @CurrentUser() context: RequestContext,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    return this.notificationService.getForUser(
      context.userId,
      limit || 50,
      skip || 0,
    );
  }

  /**
   * Get unread notifications count
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count for current user' })
  @ApiOkResponse({
    description: 'Unread count',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  async getUnreadCount(@CurrentUser() context: RequestContext) {
    const count = await this.notificationService.getUnreadCountForUser(
      context.userId,
    );
    return { count };
  }

  /**
   * Get unread notifications
   */
  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications for current user' })
  @ApiOkResponse({
    description: 'List of unread notifications',
    type: [NotificationResponseDto],
  })
  async getUnread(
    @CurrentUser() context: RequestContext,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.getUnreadForUser(context.userId, limit || 50);
  }

  /**
   * Get single notification by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiOkResponse({
    description: 'Notification details',
    type: NotificationResponseDto,
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    return this.notificationService.findById(new Types.ObjectId(id) as any, context);
  }

  /**
   * Mark notification as read
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiOkResponse({
    description: 'Notification marked as read',
    type: NotificationResponseDto,
  })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    return this.notificationService.markAsRead(id, context.userId);
  }

  /**
   * Update notification
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update notification' })
  @ApiOkResponse({
    description: 'Notification updated successfully',
    type: NotificationResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.notificationService.update(new Types.ObjectId(id) as any, updateNotificationDto as any, context);
  }

  /**
   * Soft delete notification
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification (soft delete)' })
  @ApiOkResponse({
    description: 'Notification deleted successfully',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    return this.notificationService.softDelete(new Types.ObjectId(id) as any, context);
  }
}
