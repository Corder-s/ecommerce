import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  NotificationResponse,
  NotificationListResponse,
  UnreadCountResponse,
} from './interfaces/notification.interface';
import { CreateNotificationJobPayload } from '../jobs/interfaces/job.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly repository: NotificationRepository) {}

  /**
   * Retrieves paginated in-app notifications for the authenticated user.
   * Scoped strictly to the caller (IDOR defense).
   */
  async getUserNotifications(
    user: AuthenticatedUser,
    query: NotificationQueryDto,
  ): Promise<NotificationListResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const [{ notifications, total }, unreadCount] = await Promise.all([
      this.repository.findByUser(user.id, {
        unreadOnly: query.unreadOnly,
        type: query.type,
        page,
        limit,
      }),
      this.repository.countUnread(user.id),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        recipientUserId: n.recipientUserId,
        tenantId: n.tenantId,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data as Record<string, unknown> | null,
        readAt: n.readAt,
        isRead: n.readAt !== null,
        createdAt: n.createdAt,
      })),
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves current count of unread notifications for caller badge display.
   */
  async getUnreadCount(user: AuthenticatedUser): Promise<UnreadCountResponse> {
    const unreadCount = await this.repository.countUnread(user.id);
    return { unreadCount };
  }

  /**
   * Marks a single notification as read with strict ownership validation.
   */
  async markNotificationAsRead(
    user: AuthenticatedUser,
    notificationId: string,
  ): Promise<NotificationResponse> {
    const updated = await this.repository.markAsRead(notificationId, user.id);

    if (!updated) {
      throw new NotFoundException('Notification not found or access denied');
    }

    return {
      id: updated.id,
      recipientUserId: updated.recipientUserId,
      tenantId: updated.tenantId,
      type: updated.type,
      title: updated.title,
      message: updated.message,
      data: updated.data as Record<string, unknown> | null,
      readAt: updated.readAt,
      isRead: true,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Marks all unread notifications for caller as read.
   */
  async markAllAsRead(user: AuthenticatedUser): Promise<{ count: number; success: boolean }> {
    const { count } = await this.repository.markAllAsRead(user.id);
    this.logger.log(`Marked ${count} notifications as read for user: ${user.id}`);
    return { count, success: true };
  }

  /**
   * Creates an in-app notification with built-in deduplication.
   * If an identical notification was sent to the same user within the last 60 seconds,
   * skips duplicate persistence to prevent user alert fatigue.
   */
  async createNotification(
    payload: CreateNotificationJobPayload,
  ): Promise<NotificationResponse | null> {
    const sixtySecondsAgo = new Date(Date.now() - 60000);
    const existingRecent = await this.repository.findRecentSimilar(
      payload.recipientUserId,
      payload.title,
      sixtySecondsAgo,
    );

    if (existingRecent) {
      this.logger.log(
        `Deduplicated duplicate in-app notification: "${payload.title}" for user ${payload.recipientUserId}`,
      );
      return null;
    }

    const created = await this.repository.create({
      recipientUserId: payload.recipientUserId,
      tenantId: payload.tenantId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
    });

    this.logger.log(
      `In-app notification created: [${created.type}] "${created.title}" for user ${created.recipientUserId}`,
    );

    return {
      id: created.id,
      recipientUserId: created.recipientUserId,
      tenantId: created.tenantId,
      type: created.type,
      title: created.title,
      message: created.message,
      data: created.data as Record<string, unknown> | null,
      readAt: created.readAt,
      isRead: false,
      createdAt: created.createdAt,
    };
  }
}
