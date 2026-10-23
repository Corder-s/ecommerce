import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { PlatformRole, NotificationType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: jest.Mocked<NotificationsService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-recip-1',
    name: 'Customer Test',
    email: 'cust@example.com',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  beforeEach(async () => {
    const mockService = {
      getUserNotifications: jest.fn(),
      getUnreadCount: jest.fn(),
      markNotificationAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get(NotificationsService);
  });

  it('should list notifications for current authenticated user', async () => {
    const mockResponse = {
      notifications: [
        {
          id: 'n1',
          recipientUserId: mockUser.id,
          tenantId: 't1',
          type: NotificationType.ORDER_CREATED,
          title: 'Order Placed',
          message: 'Order placed',
          data: null,
          readAt: null,
          isRead: false,
          createdAt: new Date(),
        },
      ],
      total: 1,
      unreadCount: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    service.getUserNotifications.mockResolvedValue(mockResponse);

    const result = await controller.listNotifications(mockUser, { page: 1, limit: 20 });
    expect(result).toBe(mockResponse);
    expect(service.getUserNotifications).toHaveBeenCalledWith(mockUser, { page: 1, limit: 20 });
  });

  it('should return unread count', async () => {
    service.getUnreadCount.mockResolvedValue({ unreadCount: 3 });

    const result = await controller.getUnreadCount(mockUser);
    expect(result).toEqual({ unreadCount: 3 });
    expect(service.getUnreadCount).toHaveBeenCalledWith(mockUser);
  });

  it('should mark an individual notification as read', async () => {
    const mockNotification = {
      id: 'n1',
      recipientUserId: mockUser.id,
      tenantId: 't1',
      type: NotificationType.ORDER_CREATED,
      title: 'Order Placed',
      message: 'Order placed',
      data: null,
      readAt: new Date(),
      isRead: true,
      createdAt: new Date(),
    };
    service.markNotificationAsRead.mockResolvedValue(mockNotification);

    const result = await controller.markAsRead(mockUser, 'n1');
    expect(result).toBe(mockNotification);
    expect(service.markNotificationAsRead).toHaveBeenCalledWith(mockUser, 'n1');
  });

  it('should mark all unread notifications as read', async () => {
    service.markAllAsRead.mockResolvedValue({ count: 5, success: true });

    const result = await controller.markAllAsRead(mockUser);
    expect(result).toEqual({ count: 5, success: true });
    expect(service.markAllAsRead).toHaveBeenCalledWith(mockUser);
  });
});
