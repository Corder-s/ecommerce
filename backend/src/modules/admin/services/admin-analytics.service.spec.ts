import { Test, TestingModule } from '@nestjs/testing';
import { AdminAnalyticsService } from './admin-analytics.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { OrderStatus, BillingInterval } from '@prisma/client';

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      tenant: {
        count: jest.fn().mockImplementation((args) => {
          if (args?.where?.status === 'ACTIVE') return Promise.resolve(10);
          if (args?.where?.status === 'SUSPENDED') return Promise.resolve(2);
          if (args?.where?.isPublished) return Promise.resolve(8);
          return Promise.resolve(12);
        }),
        findMany: jest
          .fn()
          .mockResolvedValue([
            { createdAt: new Date('2026-10-01T10:00:00Z') },
            { createdAt: new Date('2026-10-01T12:00:00Z') },
            { createdAt: new Date('2026-10-02T15:00:00Z') },
          ]),
      },
      order: {
        aggregate: jest.fn().mockResolvedValue({
          _count: { id: 25 },
          _sum: { totalAmount: 50000 },
          _avg: { totalAmount: 2000 },
        }),
        count: jest.fn().mockResolvedValue(2), // cancelled count
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ord-1',
            status: OrderStatus.DELIVERED,
            totalAmount: 2000,
            createdAt: new Date('2026-10-01T10:00:00Z'),
          },
          {
            id: 'ord-2',
            status: OrderStatus.CONFIRMED,
            totalAmount: 3000,
            createdAt: new Date('2026-10-02T10:00:00Z'),
          },
        ]),
      },
      paymentRecord: {
        aggregate: jest.fn().mockImplementation((args) => {
          if (args?.where?.status === 'FAILED') {
            return Promise.resolve({
              _count: { id: 3 },
              _sum: { amount: 6000 },
            });
          }
          return Promise.resolve({
            _count: { id: 20 },
            _sum: { amount: 48000 },
          });
        }),
        count: jest.fn().mockImplementation((args) => {
          if (args?.where?.status === 'FAILED') return Promise.resolve(3);
          return Promise.resolve(25);
        }),
      },
      refundRecord: {
        aggregate: jest.fn().mockResolvedValue({
          _count: { id: 1 },
          _sum: { amount: 2000 },
        }),
      },
      subscription: {
        count: jest.fn().mockResolvedValue(5),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sub-1',
            billingInterval: BillingInterval.MONTHLY,
            plan: { priceMonthly: 1999 },
          },
        ]),
      },
      subscriptionPlan: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            name: 'Growth',
            slug: 'growth',
            _count: { subscriptions: 5 },
          },
        ]),
      },
      subscriptionInvoice: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: 9995 },
        }),
      },
      outboxEvent: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminAnalyticsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AdminAnalyticsService>(AdminAnalyticsService);
  });

  describe('Date Range Validation', () => {
    it('should validate and parse valid ISO date range', () => {
      const res = service.validateDateRange({
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-20T23:59:59.999Z',
      });
      expect(res.startDate).toBeInstanceOf(Date);
      expect(res.endDate).toBeInstanceOf(Date);
    });

    it('should reject inverted date range (startDate > endDate)', () => {
      expect(() =>
        service.validateDateRange({
          startDate: '2026-10-20T00:00:00.000Z',
          endDate: '2026-10-01T00:00:00.000Z',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject range exceeding 365 days', () => {
      expect(() =>
        service.validateDateRange({
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2026-01-01T00:00:00.000Z',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('Overview Analytics', () => {
    it('should return overview metrics accurately', async () => {
      const res = await service.getOverview({});
      expect(res.tenants.total).toBe(12);
      expect(res.tenants.active).toBe(10);
      expect(res.orders.grossOrderValue).toBe(50000);
      expect(res.orders.totalOrders).toBe(27); // 25 valid + 2 cancelled
      expect(res.payments.collectedRevenue).toBe(48000);
      expect(res.payments.refundedAmount).toBe(2000);
      expect(res.payments.netRevenue).toBe(46000);
      expect(res.subscriptions.monthlyRecurringRevenue).toBe(1999);
      expect(res.subscriptions.subscriptionInvoicedRevenue).toBe(9995);
      expect(res.system.deadLetterJobsCount).toBe(0);
    });
  });

  describe('Tenant Analytics', () => {
    it('should group registrations into daily buckets', async () => {
      const res = await service.getTenantAnalytics({});
      expect(res.totalTenants).toBe(12);
      expect(res.registrationsOverTime).toEqual([
        { date: '2026-10-01', count: 2 },
        { date: '2026-10-02', count: 1 },
      ]);
    });
  });

  describe('Payment Analytics', () => {
    it('should compute payment metrics and failure rate', async () => {
      const res = await service.getPaymentAnalytics({});
      expect(res.totalAttempts).toBe(25);
      expect(res.successfulAmount).toBe(48000);
      expect(res.refundedAmount).toBe(2000);
      expect(res.netRevenue).toBe(46000);
      expect(res.failedCount).toBe(3);
      expect(res.failureRatePercentage).toBe(12); // 3 / 25 * 100
    });
  });
});
