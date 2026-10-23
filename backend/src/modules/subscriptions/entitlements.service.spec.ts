import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { EntitlementsService } from './entitlements.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('EntitlementsService (Step 8: Plan Limits & Entitlements)', () => {
  let service: EntitlementsService;
  let mockPrisma: any;

  const starterPlan = {
    id: 'plan-starter',
    name: 'Starter Artisan',
    slug: 'starter',
    maxProducts: 25,
    maxStaffMembers: 1,
    customDomainEnabled: false,
    analyticsEnabled: false,
    prioritySupport: false,
  };

  const proPlan = {
    id: 'plan-pro',
    name: 'Pro Guild',
    slug: 'pro',
    maxProducts: 2000,
    maxStaffMembers: 20,
    customDomainEnabled: true,
    analyticsEnabled: true,
    prioritySupport: true,
  };

  beforeEach(async () => {
    mockPrisma = {
      subscriptionPlan: {
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(starterPlan),
        findFirst: jest.fn().mockResolvedValue(starterPlan),
        upsert: jest.fn(),
      },
      subscription: {
        findUnique: jest.fn(),
      },
      product: {
        count: jest.fn(),
      },
      tenantMembership: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitlementsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<EntitlementsService>(EntitlementsService);
    jest.clearAllMocks();
  });

  describe('assertCanAddProduct', () => {
    it('should allow adding product when under plan limit', async () => {
      // Tenant has no explicit subscription -> defaults to starterPlan (limit 25)
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.product.count.mockResolvedValue(10);

      const result = await service.assertCanAddProduct('tenant-1');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(10);
      expect(result.max).toBe(25);
    });

    it('should throw ForbiddenException when product limit is reached', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.product.count.mockResolvedValue(25); // At limit

      await expect(service.assertCanAddProduct('tenant-1')).rejects.toThrow(ForbiddenException);
    });

    it('should allow higher limit when upgraded to Pro plan', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      mockPrisma.subscription.findUnique.mockResolvedValue({
        tenantId: 'tenant-1',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: future,
        plan: proPlan,
      });
      mockPrisma.product.count.mockResolvedValue(500); // 500 < 2000

      const result = await service.assertCanAddProduct('tenant-1');
      expect(result.allowed).toBe(true);
      expect(result.max).toBe(2000);
    });
  });

  describe('assertCanAddStaff', () => {
    it('should allow adding staff when under limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.tenantMembership.count.mockResolvedValue(0);

      const result = await service.assertCanAddStaff('tenant-1');
      expect(result.allowed).toBe(true);
      expect(result.max).toBe(1);
    });

    it('should throw ForbiddenException when staff limit is reached', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.tenantMembership.count.mockResolvedValue(1); // At limit for Starter

      await expect(service.assertCanAddStaff('tenant-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('hasFeature', () => {
    it('should return false for customDomain on Starter plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      const enabled = await service.hasFeature('tenant-1', 'customDomainEnabled');
      expect(enabled).toBe(false);
    });

    it('should return true for analytics on Pro plan', async () => {
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tenantId: 'tenant-1',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: future,
        plan: proPlan,
      });
      const enabled = await service.hasFeature('tenant-1', 'analyticsEnabled');
      expect(enabled).toBe(true);
    });
  });
});
