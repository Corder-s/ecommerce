import { Test, TestingModule } from '@nestjs/testing';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionStatus, BillingInterval } from '@prisma/client';

describe('AdminSubscriptionsService', () => {
  let service: AdminSubscriptionsService;
  let mockPrisma: any;

  const mockPlan = {
    id: 'plan-growth',
    name: 'Growth Artisan',
    slug: 'growth',
    description: 'Growing artisan store',
    priceMonthly: 1999,
    priceAnnual: 19990,
    currency: 'INR',
    maxProducts: 250,
    maxStaffMembers: 5,
    customDomainEnabled: true,
    analyticsEnabled: true,
    prioritySupport: true,
    isActive: true,
    _count: { subscriptions: 4 },
  };

  const mockSubscription = {
    id: 'sub-1',
    tenantId: 'tenant-1',
    planId: 'plan-growth',
    status: SubscriptionStatus.ACTIVE,
    billingInterval: BillingInterval.MONTHLY,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    providerSubscriptionId: 'sub_rzp_123',
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: {
      id: 'tenant-1',
      businessName: 'Vedic Clayworks',
      storeSlug: 'vedic-clayworks',
      status: 'ACTIVE',
      contactEmail: 'vedic@gaushilp.com',
    },
    plan: mockPlan,
    invoices: [],
  };

  beforeEach(async () => {
    mockPrisma = {
      subscription: {
        count: jest.fn().mockImplementation((args) => {
          if (args?.where?.status === SubscriptionStatus.ACTIVE) return Promise.resolve(4);
          if (args?.where?.status === SubscriptionStatus.TRIALING) return Promise.resolve(1);
          if (args?.where?.status === SubscriptionStatus.PAST_DUE) return Promise.resolve(0);
          if (args?.where?.status === SubscriptionStatus.CANCELLED) return Promise.resolve(1);
          if (args?.where?.status === SubscriptionStatus.EXPIRED) return Promise.resolve(0);
          return Promise.resolve(6);
        }),
        findMany: jest.fn().mockResolvedValue([mockSubscription]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'sub-1') return Promise.resolve(mockSubscription);
          return Promise.resolve(null);
        }),
      },
      subscriptionPlan: {
        findMany: jest.fn().mockResolvedValue([mockPlan]),
      },
      subscriptionInvoice: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: 7996 },
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminSubscriptionsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AdminSubscriptionsService>(AdminSubscriptionsService);
  });

  it('should list subscriptions with pagination', async () => {
    const res = await service.listSubscriptions({ page: 1, limit: 10 });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].plan.name).toBe('Growth Artisan');
    expect(res.data[0].tenant.storeSlug).toBe('vedic-clayworks');
  });

  it('should get subscription details', async () => {
    const res = await service.getSubscriptionDetails('sub-1');
    expect(res.id).toBe('sub-1');
    expect(res.plan.maxProducts).toBe(250);
  });

  it('should throw NotFoundException for invalid subscription', async () => {
    await expect(service.getSubscriptionDetails('unknown-sub')).rejects.toThrow(NotFoundException);
  });

  it('should calculate subscription summary and MRR accurately', async () => {
    const summary = await service.getSubscriptionSummary();
    expect(summary.statusBreakdown.total).toBe(6);
    expect(summary.statusBreakdown.active).toBe(4);
    expect(summary.planDistribution).toHaveLength(1);
    expect(summary.planDistribution[0].activeSubscriberCount).toBe(4);
    expect(summary.revenueMetrics.monthlyRecurringRevenue).toBe(1999);
    expect(summary.revenueMetrics.annualRecurringRevenue).toBe(23988);
    expect(summary.revenueMetrics.totalInvoicedPaidRevenue).toBe(7996);
  });
});
