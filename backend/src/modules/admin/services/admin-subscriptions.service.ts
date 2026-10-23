import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SubscriptionQueryDto } from '../dto/subscription-query.dto';
import { SubscriptionStatus, Prisma, BillingInterval } from '@prisma/client';

@Injectable()
export class AdminSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves a paginated list of platform SaaS subscriptions.
   */
  async listSubscriptions(query: SubscriptionQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.planSlug) {
      where.plan = {
        slug: query.planSlug,
      };
    }

    const [total, subscriptions] = await Promise.all([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: {
              id: true,
              businessName: true,
              storeSlug: true,
              status: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              slug: true,
              priceMonthly: true,
              priceAnnual: true,
              currency: true,
            },
          },
        },
      }),
    ]);

    return {
      data: subscriptions.map((s) => ({
        id: s.id,
        tenantId: s.tenantId,
        tenant: s.tenant,
        plan: {
          id: s.plan.id,
          name: s.plan.name,
          slug: s.plan.slug,
          priceMonthly: Number(s.plan.priceMonthly),
          priceAnnual: Number(s.plan.priceAnnual),
          currency: s.plan.currency,
        },
        status: s.status,
        billingInterval: s.billingInterval,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        cancelledAt: s.cancelledAt,
        createdAt: s.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves full details for a subscription, including plan limits and invoice history.
   */
  async getSubscriptionDetails(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        tenant: {
          select: {
            id: true,
            businessName: true,
            storeSlug: true,
            status: true,
            contactEmail: true,
          },
        },
        plan: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID "${subscriptionId}" was not found.`);
    }

    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      tenant: subscription.tenant,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        slug: subscription.plan.slug,
        description: subscription.plan.description,
        priceMonthly: Number(subscription.plan.priceMonthly),
        priceAnnual: Number(subscription.plan.priceAnnual),
        currency: subscription.plan.currency,
        maxProducts: subscription.plan.maxProducts,
        maxStaffMembers: subscription.plan.maxStaffMembers,
        customDomainEnabled: subscription.plan.customDomainEnabled,
        analyticsEnabled: subscription.plan.analyticsEnabled,
        prioritySupport: subscription.plan.prioritySupport,
      },
      status: subscription.status,
      billingInterval: subscription.billingInterval,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      cancelledAt: subscription.cancelledAt,
      providerSubscriptionId: subscription.providerSubscriptionId,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      invoices: subscription.invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.amount),
        currency: inv.currency,
        status: inv.status,
        billingReason: inv.billingReason,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        paidAt: inv.paidAt,
        createdAt: inv.createdAt,
      })),
    };
  }

  /**
   * Calculates platform subscription metrics:
   * Status distribution, grouped counts by plan, MRR, ARR, and paid invoice revenue.
   */
  async getSubscriptionSummary() {
    const [
      totalCount,
      activeCount,
      trialingCount,
      pastDueCount,
      cancelledCount,
      expiredCount,
      activeSubscriptions,
      plans,
      invoicedRevenueAgg,
    ] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.TRIALING } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELLED } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      this.prisma.subscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        include: { plan: true },
      }),
      this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              subscriptions: {
                where: { status: SubscriptionStatus.ACTIVE },
              },
            },
          },
        },
      }),
      this.prisma.subscriptionInvoice.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    // Calculate MRR from active subscriptions
    let monthlyRecurringRevenue = 0;
    for (const sub of activeSubscriptions) {
      if (sub.billingInterval === BillingInterval.MONTHLY) {
        monthlyRecurringRevenue += Number(sub.plan.priceMonthly);
      } else if (sub.billingInterval === BillingInterval.ANNUAL) {
        // Amortized monthly value of annual plan
        monthlyRecurringRevenue += Number(sub.plan.priceAnnual) / 12;
      }
    }

    const annualRecurringRevenue = monthlyRecurringRevenue * 12;

    return {
      statusBreakdown: {
        total: totalCount,
        active: activeCount,
        trialing: trialingCount,
        pastDue: pastDueCount,
        cancelled: cancelledCount,
        expired: expiredCount,
      },
      planDistribution: plans.map((p) => ({
        planId: p.id,
        name: p.name,
        slug: p.slug,
        priceMonthly: Number(p.priceMonthly),
        priceAnnual: Number(p.priceAnnual),
        activeSubscriberCount: p._count.subscriptions,
      })),
      revenueMetrics: {
        monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
        annualRecurringRevenue: Math.round(annualRecurringRevenue * 100) / 100,
        totalInvoicedPaidRevenue: Number(invoicedRevenueAgg._sum.amount || 0),
      },
    };
  }
}
