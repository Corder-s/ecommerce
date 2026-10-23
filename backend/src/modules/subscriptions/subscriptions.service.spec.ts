import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SubscriptionStatus, BillingInterval, Prisma } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { EntitlementsService } from './entitlements.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  SUBSCRIPTION_PROVIDER_TOKEN,
  ISubscriptionProvider,
} from '../../integrations/subscription-provider';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

describe('SubscriptionsService (Step 8: SaaS Subscriptions & Lifecycle)', () => {
  let service: SubscriptionsService;
  let mockPrisma: any;
  let mockSubscriptionProvider: jest.Mocked<ISubscriptionProvider>;
  let mockEntitlements: any;

  const storeOwner: AuthenticatedUser = {
    id: 'user-owner-1',
    email: 'owner@example.com',
    name: 'Store Owner',
    platformRole: 'USER' as any,
    memberships: [],
  };

  const samplePlan = {
    id: 'plan-growth',
    name: 'Growth Gaushala',
    slug: 'growth',
    description: 'Growth tier',
    priceMonthly: new Prisma.Decimal(999),
    priceAnnual: new Prisma.Decimal(9990),
    currency: 'INR',
    maxProducts: 250,
    maxStaffMembers: 5,
    customDomainEnabled: true,
    analyticsEnabled: true,
    prioritySupport: false,
    isActive: true,
  };

  beforeEach(async () => {
    mockPrisma = {
      subscriptionPlan: {
        findMany: jest.fn().mockResolvedValue([samplePlan]),
        findUnique: jest.fn().mockResolvedValue(samplePlan),
      },
      subscription: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      product: {
        count: jest.fn().mockResolvedValue(15),
      },
      tenantMembership: {
        count: jest.fn().mockResolvedValue(2),
      },
      subscriptionInvoice: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      paymentWebhookEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    mockSubscriptionProvider = {
      providerName: 'sandbox',
      createSubscriptionSession: jest.fn().mockResolvedValue({
        provider: 'sandbox',
        providerSubscriptionId: 'sub_sbx_123',
        providerCustomerId: 'cus_sbx_123',
        checkoutUrl: 'https://sandbox.billing.local/sub_123',
        status: 'ACTIVE',
      }),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      parseWebhookEvent: jest.fn(),
      cancelSubscription: jest.fn().mockResolvedValue({ success: true }),
    };

    mockEntitlements = {
      ensureDefaultPlansExist: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test_subscription_secret'),
          },
        },
        {
          provide: EntitlementsService,
          useValue: mockEntitlements,
        },
        {
          provide: SUBSCRIPTION_PROVIDER_TOKEN,
          useValue: mockSubscriptionProvider,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    jest.clearAllMocks();
  });

  describe('listPlans', () => {
    it('should list all active subscription plans', async () => {
      const plans = await service.listPlans();
      expect(plans).toHaveLength(1);
      expect(plans[0].slug).toBe('growth');
      expect(plans[0].priceMonthly).toBe(999);
      expect(mockEntitlements.ensureDefaultPlansExist).toHaveBeenCalled();
    });
  });

  describe('getCurrentSubscription', () => {
    it('should return subscription details with resource usage', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        tenantId: 'tenant-1',
        status: SubscriptionStatus.ACTIVE,
        billingInterval: BillingInterval.MONTHLY,
        currentPeriodStart: now,
        currentPeriodEnd: future,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        plan: samplePlan,
      });

      const res = await service.getCurrentSubscription('tenant-1');
      expect(res).toBeDefined();
      expect(res.status).toBe(SubscriptionStatus.ACTIVE);
      expect(res.usage.productCount).toBe(15);
      expect(res.usage.maxProducts).toBe(250);
      expect(res.usage.staffCount).toBe(2);
      expect(res.usage.maxStaffMembers).toBe(5);
    });
  });

  describe('createSubscriptionCheckout', () => {
    it('should initiate checkout session with billing provider and upsert subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ id: 'sub-1' });

      const res = await service.createSubscriptionCheckout('tenant-1', storeOwner, {
        planSlug: 'growth',
        billingInterval: BillingInterval.MONTHLY,
      });

      expect(res).toBeDefined();
      expect(res.providerSubscriptionId).toBe('sub_sbx_123');
      expect(mockSubscriptionProvider.createSubscriptionSession).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          planSlug: 'growth',
          interval: BillingInterval.MONTHLY,
        }),
      );
      expect(mockPrisma.subscription.upsert).toHaveBeenCalled();
      expect(mockPrisma.subscriptionInvoice.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if plan slug does not exist', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.createSubscriptionCheckout('tenant-1', storeOwner, {
          planSlug: 'invalid-tier',
          billingInterval: BillingInterval.MONTHLY,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelSubscription', () => {
    it('should schedule cancellation at period end', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        tenantId: 'tenant-1',
        status: SubscriptionStatus.ACTIVE,
        providerSubscriptionId: 'sub_sbx_123',
      });
      mockPrisma.subscription.update.mockResolvedValue({
        tenantId: 'tenant-1',
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: true,
        cancelledAt: null,
      });

      const res = await service.cancelSubscription('tenant-1', {
        cancelAtPeriodEnd: true,
      });

      expect(res.success).toBe(true);
      expect(mockSubscriptionProvider.cancelSubscription).toHaveBeenCalledWith('sub_sbx_123', true);
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cancelAtPeriodEnd: true }),
        }),
      );
    });

    it('should support immediate cancellation when requested', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        tenantId: 'tenant-1',
        status: SubscriptionStatus.ACTIVE,
        providerSubscriptionId: 'sub_sbx_123',
      });
      mockPrisma.subscription.update.mockResolvedValue({
        tenantId: 'tenant-1',
        status: SubscriptionStatus.CANCELLED,
        cancelAtPeriodEnd: false,
        cancelledAt: new Date(),
      });

      const res = await service.cancelSubscription('tenant-1', {
        cancelAtPeriodEnd: false,
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SubscriptionStatus.CANCELLED,
          }),
        }),
      );
    });
  });

  describe('handleSubscriptionWebhook', () => {
    it('should reject invalid webhook signature', async () => {
      mockSubscriptionProvider.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleSubscriptionWebhook('sandbox', { eventId: 'evt-1' }, 'bad_sig', {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should prevent duplicate webhook processing via replay protection', async () => {
      mockSubscriptionProvider.verifyWebhookSignature.mockReturnValue(true);
      mockSubscriptionProvider.parseWebhookEvent.mockReturnValue({
        eventId: 'sub_evt_dup',
        eventType: 'subscription.renewed',
        providerSubscriptionId: 'sub_123',
        tenantId: 'tenant-1',
        rawPayload: {},
      });

      mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue({ id: 'evt-dup' });

      const res = await service.handleSubscriptionWebhook(
        'sandbox',
        { eventId: 'sub_evt_dup' },
        'valid_sig',
        {},
      );

      expect(res.received).toBe(true);
      expect(res.duplicate).toBe(true);
      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });

    it('should update subscription status to PAST_DUE on payment failure', async () => {
      mockSubscriptionProvider.verifyWebhookSignature.mockReturnValue(true);
      mockSubscriptionProvider.parseWebhookEvent.mockReturnValue({
        eventId: 'sub_evt_fail',
        eventType: 'subscription.payment_failed',
        providerSubscriptionId: 'sub_123',
        tenantId: 'tenant-1',
        rawPayload: {},
      });

      mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        tenantId: 'tenant-1',
        plan: samplePlan,
      });

      const res = await service.handleSubscriptionWebhook(
        'sandbox',
        { eventId: 'sub_evt_fail' },
        'valid_sig',
        {},
      );

      expect(res.status).toBe('PROCESSED');
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          data: { status: SubscriptionStatus.PAST_DUE },
        }),
      );
    });
  });
});
