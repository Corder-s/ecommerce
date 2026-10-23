import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  PaymentRecordStatus,
  RefundStatus,
  PlatformRole,
  TenantRole,
  Prisma,
} from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PAYMENT_PROVIDER_TOKEN, IPaymentProvider } from '../../integrations/payment-provider';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

describe('PaymentsService (Step 8: Customer Payments & Webhook Security)', () => {
  let service: PaymentsService;
  let mockPrisma: any;
  let mockPaymentProvider: jest.Mocked<IPaymentProvider>;

  const customerUser: AuthenticatedUser = {
    id: 'user-customer-1',
    email: 'customer@example.com',
    name: 'Customer One',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const otherUser: AuthenticatedUser = {
    id: 'user-stranger-2',
    email: 'stranger@example.com',
    name: 'Stranger',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const storeOwnerUser: AuthenticatedUser = {
    id: 'user-owner-1',
    email: 'owner@example.com',
    name: 'Store Owner',
    platformRole: PlatformRole.USER,
    memberships: [
      {
        id: 'mem-1',
        tenantId: 'tenant-1',
        role: TenantRole.STORE_OWNER,
        status: 'ACTIVE' as any,
      },
    ],
  };

  const baseOrder = {
    id: 'order-1',
    orderNumber: 'GS-20261022-TEST1',
    userId: 'user-customer-1',
    tenantId: 'tenant-1',
    status: OrderStatus.PLACED,
    paymentStatus: PaymentStatus.PENDING,
    totalAmount: new Prisma.Decimal(1500.0),
    currency: 'INR',
    tenant: { id: 'tenant-1', businessName: 'Gaushala Organic Store' },
    items: [],
  };

  beforeEach(async () => {
    mockPrisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      paymentRecord: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      paymentAttempt: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      paymentWebhookEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refundRecord: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    };

    mockPaymentProvider = {
      providerName: 'sandbox',
      createPaymentSession: jest.fn().mockResolvedValue({
        provider: 'sandbox',
        providerPaymentId: 'pay_sbx_12345',
        providerOrderId: 'ord_sbx_12345',
        clientSecret: 'sec_sbx_12345',
        checkoutUrl: 'https://sandbox.checkout.local/12345',
        status: 'PENDING',
      }),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      parseWebhookEvent: jest.fn(),
      processRefund: jest.fn().mockResolvedValue({
        providerRefundId: 'ref_sbx_99999',
        status: 'SUCCEEDED',
        amount: 500,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test_secret'),
          },
        },
        {
          provide: PAYMENT_PROVIDER_TOKEN,
          useValue: mockPaymentProvider,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('initiateOrderPayment', () => {
    it('should successfully initiate payment for eligible PLACED order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
      mockPrisma.paymentRecord.findFirst.mockResolvedValue(null);
      mockPrisma.paymentRecord.create.mockResolvedValue({ id: 'rec-1' });

      const result = await service.initiateOrderPayment(customerUser, 'order-1', {
        paymentMethod: 'card',
      });

      expect(result).toBeDefined();
      expect(result.paymentRecordId).toBe('rec-1');
      expect(result.providerPaymentId).toBe('pay_sbx_12345');
      expect(result.amount).toBe(1500);
      expect(mockPaymentProvider.createPaymentSession).toHaveBeenCalled();
      expect(mockPrisma.paymentAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentRecordId: 'rec-1',
            attemptNumber: 1,
            status: PaymentRecordStatus.PENDING,
          }),
        }),
      );
    });

    it('should reject payment initiation for another user order (IDOR Protection)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(baseOrder);

      await expect(service.initiateOrderPayment(otherUser, 'order-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject payment initiation for a CANCELLED order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.CANCELLED,
      });

      await expect(service.initiateOrderPayment(customerUser, 'order-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject payment initiation for an already PAID order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        paymentStatus: PaymentStatus.PAID,
      });

      await expect(service.initiateOrderPayment(customerUser, 'order-1', {})).rejects.toThrow(
        ConflictException,
      );
    });

    it('should increment attemptNumber on retry for existing pending record', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
      mockPrisma.paymentRecord.findFirst.mockResolvedValue({
        id: 'rec-1',
        attempts: [{ id: 'att-1' }],
      });

      await service.initiateOrderPayment(customerUser, 'order-1', {});

      expect(mockPrisma.paymentAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentRecordId: 'rec-1',
            attemptNumber: 2,
          }),
        }),
      );
    });
  });

  describe('handlePaymentWebhook (Webhook Security & Replay Protection)', () => {
    it('should reject invalid HMAC signature with UnauthorizedException', async () => {
      mockPaymentProvider.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handlePaymentWebhook('sandbox', { eventId: 'evt_1' }, 'bad_sig', {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should ignore duplicate webhook events safely without re-processing', async () => {
      mockPaymentProvider.verifyWebhookSignature.mockReturnValue(true);
      mockPaymentProvider.parseWebhookEvent.mockReturnValue({
        eventId: 'evt_dup_1',
        eventType: 'payment.succeeded',
        providerPaymentId: 'pay_123',
        orderId: 'order-1',
        amount: 1500,
        currency: 'INR',
        rawPayload: {},
      });

      mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue({
        id: 'wh-1',
        eventId: 'evt_dup_1',
        processed: true,
      });

      const res = await service.handlePaymentWebhook(
        'sandbox',
        { eventId: 'evt_dup_1' },
        'valid_sig',
        {},
      );

      expect(res.received).toBe(true);
      expect(res.duplicate).toBe(true);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should advance order to PAID and CONFIRMED on verified payment.succeeded webhook', async () => {
      mockPaymentProvider.verifyWebhookSignature.mockReturnValue(true);
      mockPaymentProvider.parseWebhookEvent.mockReturnValue({
        eventId: 'evt_new_1',
        eventType: 'payment.succeeded',
        providerPaymentId: 'pay_123',
        orderId: 'order-1',
        amount: 1500,
        currency: 'INR',
        rawPayload: {},
      });

      mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
      mockPrisma.paymentRecord.findFirst.mockResolvedValue({
        id: 'rec-1',
        providerPaymentId: 'pay_123',
      });

      const res = await service.handlePaymentWebhook(
        'sandbox',
        { eventId: 'evt_new_1' },
        'valid_sig',
        {},
      );

      expect(res.status).toBe('SUCCEEDED');
      expect(mockPrisma.paymentRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-1' },
          data: expect.objectContaining({
            status: PaymentRecordStatus.SUCCEEDED,
          }),
        }),
      );
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
          }),
        }),
      );
    });

    it('should flag late payment on CANCELLED order for reconciliation and NOT mark order PAID', async () => {
      mockPaymentProvider.verifyWebhookSignature.mockReturnValue(true);
      mockPaymentProvider.parseWebhookEvent.mockReturnValue({
        eventId: 'evt_late_1',
        eventType: 'payment.succeeded',
        providerPaymentId: 'pay_123',
        orderId: 'order-1',
        amount: 1500,
        currency: 'INR',
        rawPayload: {},
      });

      mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.CANCELLED,
      });
      mockPrisma.paymentRecord.findFirst.mockResolvedValue({
        id: 'rec-1',
        providerPaymentId: 'pay_123',
      });

      const res = await service.handlePaymentWebhook(
        'sandbox',
        { eventId: 'evt_late_1' },
        'valid_sig',
        {},
      );

      expect(res.status).toBe('RECONCILIATION_REQUIRED');
      // Order status MUST NOT be overwritten to CONFIRMED
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
      // Payment record updated with reconciliation note
      expect(mockPrisma.paymentRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-1' },
          data: expect.objectContaining({
            status: PaymentRecordStatus.SUCCEEDED,
            errorMessage: expect.stringContaining('LATE PAYMENT RECONCILIATION NEEDED'),
          }),
        }),
      );
    });

    it('should reject payment webhook if amount does not match order total', async () => {
      mockPaymentProvider.verifyWebhookSignature.mockReturnValue(true);
      mockPaymentProvider.parseWebhookEvent.mockReturnValue({
        eventId: 'evt_mismatch_1',
        eventType: 'payment.succeeded',
        providerPaymentId: 'pay_123',
        orderId: 'order-1',
        amount: 500, // Expected 1500
        currency: 'INR',
        rawPayload: {},
      });

      mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.order.findUnique.mockResolvedValue(baseOrder);

      await expect(
        service.handlePaymentWebhook('sandbox', { eventId: 'evt_mismatch_1' }, 'valid_sig', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should record payment failure on payment.failed webhook without releasing inventory twice', async () => {
      mockPaymentProvider.verifyWebhookSignature.mockReturnValue(true);
      mockPaymentProvider.parseWebhookEvent.mockReturnValue({
        eventId: 'evt_fail_1',
        eventType: 'payment.failed',
        providerPaymentId: 'pay_123',
        orderId: 'order-1',
        amount: 1500,
        currency: 'INR',
        failureReason: 'Insufficient funds on customer card',
        rawPayload: {},
      });

      mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
      mockPrisma.paymentRecord.findFirst.mockResolvedValue({
        id: 'rec-1',
      });

      const res = await service.handlePaymentWebhook(
        'sandbox',
        { eventId: 'evt_fail_1' },
        'valid_sig',
        {},
      );

      expect(res.status).toBe('FAILED');
      expect(mockPrisma.paymentRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PaymentRecordStatus.FAILED,
          }),
        }),
      );
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentStatus: PaymentStatus.FAILED,
          }),
        }),
      );
    });
  });

  describe('refundPayment', () => {
    const succeededPayment = {
      id: 'pay-rec-1',
      orderId: 'order-1',
      tenantId: 'tenant-1',
      amount: new Prisma.Decimal(1500.0),
      currency: 'INR',
      status: PaymentRecordStatus.SUCCEEDED,
      providerPaymentId: 'pay_sbx_12345',
      refunds: [],
      order: baseOrder,
    };

    it('should allow authorized store owner to process a partial refund', async () => {
      mockPrisma.paymentRecord.findUnique.mockResolvedValue(succeededPayment);
      mockPrisma.refundRecord.create.mockResolvedValue({
        id: 'ref-rec-1',
        amount: new Prisma.Decimal(500.0),
        currency: 'INR',
        providerRefundId: 'ref_sbx_99999',
        reason: 'Customer request',
        status: RefundStatus.SUCCEEDED,
        createdAt: new Date(),
      });

      const result = await service.refundPayment(storeOwnerUser, 'pay-rec-1', {
        amount: 500,
        reason: 'Customer request',
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(500);
      expect(mockPaymentProvider.processRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 500,
        }),
      );
      expect(mockPrisma.paymentRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PaymentRecordStatus.PARTIALLY_REFUNDED },
        }),
      );
    });

    it('should reject refund exceeding total payment amount', async () => {
      mockPrisma.paymentRecord.findUnique.mockResolvedValue(succeededPayment);

      await expect(
        service.refundPayment(storeOwnerUser, 'pay-rec-1', { amount: 2000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject refund requested by regular customer without store permissions', async () => {
      mockPrisma.paymentRecord.findUnique.mockResolvedValue(succeededPayment);

      await expect(
        service.refundPayment(customerUser, 'pay-rec-1', { amount: 500 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
