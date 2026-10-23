import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { SubscriptionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface EntitlementCheckResult {
  allowed: boolean;
  current: number;
  max: number;
  planName: string;
}

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seeds initial SaaS subscription plans if database table is empty.
   */
  async ensureDefaultPlansExist(): Promise<void> {
    const count = await this.prisma.subscriptionPlan.count();
    if (count > 0) {
      return;
    }

    this.logger.log('Seeding default GauShilp OS subscription plans...');

    const defaultPlans = [
      {
        name: 'Starter Artisan',
        slug: 'starter',
        description: 'For independent artisans and rural self-help groups starting out',
        priceMonthly: new Prisma.Decimal(0),
        priceAnnual: new Prisma.Decimal(0),
        currency: 'INR',
        maxProducts: 25,
        maxStaffMembers: 1,
        customDomainEnabled: false,
        analyticsEnabled: false,
        prioritySupport: false,
      },
      {
        name: 'Growth Gaushala',
        slug: 'growth',
        description: 'For growing gaushalas and artisan cooperatives expanding their reach',
        priceMonthly: new Prisma.Decimal(999),
        priceAnnual: new Prisma.Decimal(9990),
        currency: 'INR',
        maxProducts: 250,
        maxStaffMembers: 5,
        customDomainEnabled: true,
        analyticsEnabled: true,
        prioritySupport: false,
      },
      {
        name: 'Pro Guild',
        slug: 'pro',
        description: 'Full-featured enterprise platform for large cooperatives and brands',
        priceMonthly: new Prisma.Decimal(2499),
        priceAnnual: new Prisma.Decimal(24990),
        currency: 'INR',
        maxProducts: 2000,
        maxStaffMembers: 20,
        customDomainEnabled: true,
        analyticsEnabled: true,
        prioritySupport: true,
      },
    ];

    for (const plan of defaultPlans) {
      await this.prisma.subscriptionPlan.upsert({
        where: { slug: plan.slug },
        update: {},
        create: plan,
      });
    }

    this.logger.log('Default subscription plans successfully seeded.');
  }

  /**
   * Retrieves active plan for a tenant or defaults to starter tier if no active plan exists.
   */
  async getTenantActivePlan(tenantId: string) {
    await this.ensureDefaultPlansExist();

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (
      subscription &&
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.currentPeriodEnd > new Date()
    ) {
      return subscription.plan;
    }

    // Fall back to default Starter plan
    const starterPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { slug: 'starter' },
    });

    if (!starterPlan) {
      // In case it was somehow deleted, get first available plan
      const anyPlan = await this.prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { priceMonthly: 'asc' },
      });
      return anyPlan!;
    }

    return starterPlan;
  }

  /**
   * Enforces product creation limit based on tenant's active plan.
   * Throws ForbiddenException if product limit has been exceeded.
   */
  async assertCanAddProduct(tenantId: string): Promise<EntitlementCheckResult> {
    const plan = await this.getTenantActivePlan(tenantId);
    const productCount = await this.prisma.product.count({
      where: { tenantId },
    });

    if (productCount >= plan.maxProducts) {
      throw new ForbiddenException(
        `Subscription plan limit reached: Your current "${plan.name}" plan allows up to ${plan.maxProducts} products. Please upgrade your GauShilp OS subscription to add more products.`,
      );
    }

    return {
      allowed: true,
      current: productCount,
      max: plan.maxProducts,
      planName: plan.name,
    };
  }

  /**
   * Checks staff member limit based on tenant's active plan.
   */
  async assertCanAddStaff(tenantId: string): Promise<EntitlementCheckResult> {
    const plan = await this.getTenantActivePlan(tenantId);
    const staffCount = await this.prisma.tenantMembership.count({
      where: { tenantId },
    });

    if (staffCount >= plan.maxStaffMembers) {
      throw new ForbiddenException(
        `Subscription plan limit reached: Your current "${plan.name}" plan allows up to ${plan.maxStaffMembers} team members. Please upgrade your GauShilp OS subscription to invite more staff.`,
      );
    }

    return {
      allowed: true,
      current: staffCount,
      max: plan.maxStaffMembers,
      planName: plan.name,
    };
  }

  /**
   * Verifies if a tenant's active plan includes a specific feature flag.
   */
  async hasFeature(
    tenantId: string,
    feature: 'customDomainEnabled' | 'analyticsEnabled' | 'prioritySupport',
  ): Promise<boolean> {
    const plan = await this.getTenantActivePlan(tenantId);
    return Boolean(plan[feature]);
  }
}
