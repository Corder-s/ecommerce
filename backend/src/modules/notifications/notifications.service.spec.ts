import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationType, PlatformRole } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { NotificationRepository } from './notification.repository';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: jest.Mocked<NotificationRepository>;

  const mockUser: AuthenticatedUser = {
    id: 'user-recipient-1',
    name: 'Gau Artisan',
    email: 'artisan@example.com',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const mockOtherUser: AuthenticatedUser = {
    id: 'user-recipient-2',
    name: 'Other User',
    email: 'other@example.com',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const mockNotification = {
    id: 'notif-1',
    recipientUserId: 'user-recipient-1',
    tenantId: 'tenant-1',
    type: NotificationType.ORDER_CREATED,
    title: 'New Order Received: #GS-1001',
    message: 'You received a new order for INR 1,200.',
    data: { orderId: 'ord-1', orderNumber: 'GS-1001' },
    readAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepo = {
      findByUser: jest.fn(),
      countUnread: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      findRecentSimilar: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repository = module.get(NotificationRepository);
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications strictly scoped to user (IDOR prevention)', async () => {
      repository.findByUser.mockResolvedValue({
        notifications: [mockNotification],
        total: 1,
      });
      repository.countUnread.mockResolvedValue(1);

      const result = await service.getUserNotifications(mockUser, { page: 1, limit: 10 });

      expect(repository.findByUser).toHaveBeenCalledWith(mockUser.id, {
        unreadOnly: undefined,
        type: undefined,
        page: 1,
        limit: 10,
      });
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].id).toBe('notif-1');
      expect(result.notifications[0].isRead).toBe(false);
      expect(result.unreadCount).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should sanitize page and limit boundaries correctly', async () => {
      repository.findByUser.mockResolvedValue({
        notifications: [],
        total: 0,
      });
      repository.countUnread.mockResolvedValue(0);

      await service.getUserNotifications(mockUser, { page: -5, limit: 999 });

      expect(repository.findByUser).toHaveBeenCalledWith(mockUser.id, {
        unreadOnly: undefined,
        type: undefined,
        page: 1,
        limit: 100, // Capped at max 100
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user badge', async () => {
      repository.countUnread.mockResolvedValue(5);

      const result = await service.getUnreadCount(mockUser);

      expect(repository.countUnread).toHaveBeenCalledWith(mockUser.id);
      expect(result.unreadCount).toBe(5);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark an owned notification as read', async () => {
      repository.markAsRead.mockResolvedValue({
        ...mockNotification,
        readAt: new Date(),
      });

      const result = await service.markNotificationAsRead(mockUser, 'notif-1');

      expect(repository.markAsRead).toHaveBeenCalledWith('notif-1', mockUser.id);
      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    });

    it('should throw NotFoundException if notification does not exist or belongs to another user (IDOR check)', async () => {
      repository.markAsRead.mockResolvedValue(null);

      await expect(service.markNotificationAsRead(mockOtherUser, 'notif-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(repository.markAsRead).toHaveBeenCalledWith('notif-1', mockOtherUser.id);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications for caller as read', async () => {
      repository.markAllAsRead.mockResolvedValue({ count: 4 });

      const result = await service.markAllAsRead(mockUser);

      expect(repository.markAllAsRead).toHaveBeenCalledWith(mockUser.id);
      expect(result.count).toBe(4);
      expect(result.success).toBe(true);
    });
  });

  describe('createNotification', () => {
    it('should create notification successfully when not duplicate', async () => {
      repository.findRecentSimilar.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        recipientUserId: mockUser.id,
        tenantId: 'tenant-1',
        type: NotificationType.ORDER_CREATED,
        title: 'New Order Received: #GS-1001',
        message: 'You received a new order for INR 1,200.',
        data: { orderId: 'ord-1' },
      });

      expect(result).toBeDefined();
      expect(result?.title).toBe('New Order Received: #GS-1001');
      expect(result?.isRead).toBe(false);
    });

    it('should deduplicate and skip creation if similar notification was sent in last 60 seconds', async () => {
      repository.findRecentSimilar.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        recipientUserId: mockUser.id,
        tenantId: 'tenant-1',
        type: NotificationType.ORDER_CREATED,
        title: 'New Order Received: #GS-1001',
        message: 'You received a new order for INR 1,200.',
      });

      expect(result).toBeNull();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });
});
