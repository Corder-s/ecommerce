import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Notification, NotificationType, Prisma } from '@prisma/client';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    recipientUserId: string;
    tenantId?: string | null;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        recipientUserId: data.recipientUserId,
        tenantId: data.tenantId || null,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data as Prisma.InputJsonValue,
      },
    });
  }

  async findRecentSimilar(
    recipientUserId: string,
    title: string,
    since: Date,
  ): Promise<Notification | null> {
    return this.prisma.notification.findFirst({
      where: {
        recipientUserId,
        title,
        createdAt: { gte: since },
      },
    });
  }

  async findByUser(
    userId: string,
    options: {
      unreadOnly?: boolean;
      type?: NotificationType;
      page: number;
      limit: number;
    },
  ): Promise<{ notifications: Notification[]; total: number }> {
    const skip = (options.page - 1) * options.limit;
    const where: Prisma.NotificationWhereInput = {
      recipientUserId: userId,
      ...(options.unreadOnly ? { readAt: null } : {}),
      ...(options.type ? { type: options.type } : {}),
    };

    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { notifications, total };
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        recipientUserId: userId,
        readAt: null,
      },
    });
  }

  async findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientUserId: userId },
    });

    if (!notification) {
      return null;
    }

    if (notification.readAt) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    return this.prisma.notification.updateMany({
      where: {
        recipientUserId: userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }
}
