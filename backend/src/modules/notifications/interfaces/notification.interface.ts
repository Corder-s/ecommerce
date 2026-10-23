import { NotificationType } from '@prisma/client';

export interface NotificationResponse {
  id: string;
  recipientUserId: string;
  tenantId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  readAt: Date | null;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationListResponse {
  notifications: NotificationResponse[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}
