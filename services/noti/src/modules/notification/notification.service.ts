import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseService } from '@hydrabyte/base';
import {
  Notification,
  NotificationDocument,
  NotificationDeliveryStatus,
} from './notification.schema';
import { CreateNotificationDto, UpdateNotificationDto } from './dto';

/**
 * NotificationService
 * Extends BaseService to inherit CRUD operations with RBAC and audit trail
 */
@Injectable()
export class NotificationService extends BaseService<Notification> {
  protected readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {
    super(notificationModel as any);
  }

  /**
   * Mark notification as read by a user
   * @param notificationId - Notification ID
   * @param userId - User ID marking as read
   */
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationModel.findById(notificationId);

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Add userId to readByUserIds if not already present
    if (!notification.readByUserIds.includes(userId)) {
      notification.readByUserIds.push(userId);
      await notification.save();
    }

    return notification;
  }

  /**
   * Get unread notifications for a user
   * @param userId - User ID
   * @param limit - Maximum number of notifications to return
   */
  async getUnreadForUser(
    userId: string,
    limit = 50,
  ): Promise<Notification[]> {
    return this.notificationModel
      .find({
        $or: [
          { 'recipients.userIds': userId },
          { 'recipients.broadcast': true },
        ],
        readByUserIds: { $ne: userId },
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get unread count for a user
   * @param userId - User ID
   */
  async getUnreadCountForUser(userId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({
        $or: [
          { 'recipients.userIds': userId },
          { 'recipients.broadcast': true },
        ],
        readByUserIds: { $ne: userId },
        deletedAt: null,
      })
      .exec();
  }

  /**
   * Get notifications for a user (read and unread)
   * @param userId - User ID
   * @param limit - Maximum number of notifications to return
   * @param skip - Number of notifications to skip
   */
  async getForUser(
    userId: string,
    limit = 50,
    skip = 0,
  ): Promise<Notification[]> {
    return this.notificationModel
      .find({
        $or: [
          { 'recipients.userIds': userId },
          { 'recipients.broadcast': true },
        ],
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get notifications for an organization
   * @param orgId - Organization ID
   * @param limit - Maximum number of notifications to return
   * @param skip - Number of notifications to skip
   */
  async getForOrg(
    orgId: string,
    limit = 50,
    skip = 0,
  ): Promise<Notification[]> {
    return this.notificationModel
      .find({
        $or: [
          { 'recipients.orgIds': orgId },
          { 'recipients.broadcast': true },
        ],
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get notifications for an agent
   * @param agentId - Agent ID
   * @param limit - Maximum number of notifications to return
   * @param skip - Number of notifications to skip
   */
  async getForAgent(
    agentId: string,
    limit = 50,
    skip = 0,
  ): Promise<Notification[]> {
    return this.notificationModel
      .find({
        $or: [
          { 'recipients.agentIds': agentId },
          { 'recipients.broadcast': true },
        ],
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Update delivery status
   * @param notificationId - Notification ID
   * @param status - New delivery status
   */
  async updateDeliveryStatus(
    notificationId: string,
    status: NotificationDeliveryStatus,
  ): Promise<Notification> {
    const notification = await this.notificationModel.findByIdAndUpdate(
      notificationId,
      { deliveryStatus: status },
      { new: true },
    );

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification;
  }

  /**
   * Delete old notifications (cleanup job)
   * @param olderThanDays - Delete notifications older than X days
   */
  async deleteOldNotifications(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.notificationModel.deleteMany({
      createdAt: { $lt: cutoffDate },
      deletedAt: { $ne: null },
    });

    this.logger.log(
      `Deleted ${result.deletedCount} old notifications older than ${olderThanDays} days`,
    );

    return result.deletedCount;
  }
}
