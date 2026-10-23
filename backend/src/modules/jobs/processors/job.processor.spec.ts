import { Test, TestingModule } from '@nestjs/testing';
import { JobProcessor } from './job.processor';
import { EMAIL_PROVIDER } from '../../../integrations/email-provider';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { DomainEventType, OutboxEventEntity } from '../../outbox/interfaces/outbox.interface';
import { NotificationType, OutboxEventStatus } from '@prisma/client';

describe('JobProcessor', () => {
  let processor: JobProcessor;

  const mockEmailProvider = {
    sendEmail: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  const mockCustomerUser = {
    id: 'u-cust-1',
    email: 'cust@example.com',
    name: 'Ramesh Patel',
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
    tenantMembership: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobProcessor,
        {
          provide: EMAIL_PROVIDER,
          useValue: mockEmailProvider,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    processor = module.get<JobProcessor>(JobProcessor);
    jest.clearAllMocks();
  });

  describe('processSendEmailJob', () => {
    it('should invoke email provider successfully', async () => {
      mockEmailProvider.sendEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      await expect(
        processor.processSendEmailJob({
          to: 'customer@example.com',
          subject: 'Test Subject',
          text: 'Hello world',
        }),
      ).resolves.toBeUndefined();

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          subject: 'Test Subject',
        }),
      );
    });

    it('should throw error when email delivery reports failure', async () => {
      mockEmailProvider.sendEmail.mockResolvedValue({
        success: false,
        error: 'SMTP relay down',
      });

      await expect(
        processor.processSendEmailJob({
          to: 'customer@example.com',
          subject: 'Test Subject',
        }),
      ).rejects.toThrow('SMTP relay down');
    });
  });

  describe('processNotificationJob', () => {
    it('should invoke notifications service', async () => {
      mockNotificationsService.createNotification.mockResolvedValue({
        id: 'n1',
        title: 'Alert',
      });

      await processor.processNotificationJob({
        recipientUserId: 'u1',
        tenantId: 't1',
        type: NotificationType.ORDER_CREATED,
        title: 'Order Placed',
        message: 'Order was placed',
      });

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserId: 'u1',
          title: 'Order Placed',
        }),
      );
    });
  });

  describe('processDomainEvent - ORDER_CREATED', () => {
    it('should dispatch email & in-app alerts to customer and in-app alert to seller', async () => {
      mockEmailProvider.sendEmail.mockResolvedValue({ success: true, messageId: 'm1' });
      mockNotificationsService.createNotification.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockCustomerUser);

      mockPrisma.tenantMembership.findFirst.mockResolvedValue({
        id: 'mem-1',
        user: { id: 'u-seller-1', email: 'seller@example.com', name: 'Artisan Owner' },
      });

      const event: OutboxEventEntity = {
        id: 'evt-order-1',
        tenantId: 'tenant-1',
        eventType: DomainEventType.ORDER_CREATED,
        payload: {
          orderId: 'order-101',
          orderNumber: 'GS-20261022-ABCDE',
          userId: 'u-cust-1',
          totalAmount: 1500,
          currency: 'INR',
        },
        status: OutboxEventStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
        lastError: null,
        scheduledAt: new Date(),
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await processor.processDomainEvent(event);

      // 1. Email sent to customer
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'cust@example.com',
          subject: 'Order Confirmed: #GS-20261022-ABCDE',
        }),
      );

      // 2. Customer in-app notification
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserId: 'u-cust-1',
          type: NotificationType.ORDER_CREATED,
          title: 'Order #GS-20261022-ABCDE Confirmed',
        }),
      );

      // 3. Seller in-app notification
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserId: 'u-seller-1',
          type: NotificationType.ORDER_CREATED,
          title: 'New Order Received: #GS-20261022-ABCDE',
        }),
      );
    });
  });

  describe('processDomainEvent - PAYMENT_SUCCEEDED', () => {
    it('should notify customer of confirmed payment', async () => {
      mockEmailProvider.sendEmail.mockResolvedValue({ success: true, messageId: 'm2' });
      mockNotificationsService.createNotification.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockCustomerUser);

      const event: OutboxEventEntity = {
        id: 'evt-pay-1',
        tenantId: 'tenant-1',
        eventType: DomainEventType.PAYMENT_SUCCEEDED,
        payload: {
          paymentId: 'pay-1',
          orderId: 'order-101',
          orderNumber: 'GS-20261022-ABCDE',
          userId: 'u-cust-1',
          amount: 1500,
          currency: 'INR',
        },
        status: OutboxEventStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
        lastError: null,
        scheduledAt: new Date(),
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await processor.processDomainEvent(event);

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'cust@example.com',
          subject: 'Payment Successful: #GS-20261022-ABCDE',
        }),
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserId: 'u-cust-1',
          type: NotificationType.PAYMENT_SUCCEEDED,
        }),
      );
    });
  });

  describe('processDomainEvent - SHIPMENT_DISPATCHED', () => {
    it('should notify customer with carrier and tracking info', async () => {
      mockEmailProvider.sendEmail.mockResolvedValue({ success: true, messageId: 'm3' });
      mockNotificationsService.createNotification.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockCustomerUser);

      const event: OutboxEventEntity = {
        id: 'evt-ship-1',
        tenantId: 'tenant-1',
        eventType: DomainEventType.SHIPMENT_DISPATCHED,
        payload: {
          shipmentId: 'ship-1',
          orderId: 'order-101',
          orderNumber: 'GS-20261022-ABCDE',
          userId: 'u-cust-1',
          trackingNumber: 'DELHIVERY-12345',
          carrierName: 'Delhivery Surface',
        },
        status: OutboxEventStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
        lastError: null,
        scheduledAt: new Date(),
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await processor.processDomainEvent(event);

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'cust@example.com',
          subject: 'Order Dispatched: #GS-20261022-ABCDE',
        }),
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserId: 'u-cust-1',
          type: NotificationType.SHIPMENT_DISPATCHED,
          title: 'Order #GS-20261022-ABCDE Dispatched',
        }),
      );
    });
  });

  describe('processDomainEvent - SUBSCRIPTION_ACTIVATED', () => {
    it('should notify store owner of active plan', async () => {
      mockEmailProvider.sendEmail.mockResolvedValue({ success: true, messageId: 'm4' });
      mockNotificationsService.createNotification.mockResolvedValue(null);

      mockPrisma.tenantMembership.findFirst.mockResolvedValue({
        id: 'mem-1',
        user: { id: 'u-seller-1', email: 'seller@example.com', name: 'Artisan Owner' },
      });

      const event: OutboxEventEntity = {
        id: 'evt-sub-1',
        tenantId: 'tenant-1',
        eventType: DomainEventType.SUBSCRIPTION_ACTIVATED,
        payload: {
          subscriptionId: 'sub-1',
          planTier: 'GROWTH',
        },
        status: OutboxEventStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
        lastError: null,
        scheduledAt: new Date(),
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await processor.processDomainEvent(event);

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'seller@example.com',
          subject: 'GauShilp OS Subscription Activated: GROWTH',
        }),
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserId: 'u-seller-1',
          type: NotificationType.SUBSCRIPTION_ACTIVATED,
          title: 'Subscription Activated: GROWTH',
        }),
      );
    });
  });
});
