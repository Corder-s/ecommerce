import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import {
  PlatformOverviewAnalytics,
  TenantAnalyticsResponse,
  OrderAnalyticsResponse,
  SubscriptionAnalyticsResponse,
  PaymentAnalyticsResponse,
  AnalyticsDateRange,
} from '../interfaces/admin-analytics.interface';
import {
  TenantStatus,
  OrderStatus,
  PaymentRecordStatus,
  SubscriptionStatus,
  BillingInterval,
  RefundStatus,
  OutboxEventStatus,
} from '@prisma/client';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates and parses the date range. Enforces a maximum window of 365 days
   * to protect against unbounded database aggregation workloads.
   */
  validateDateRange(query: AnalyticsQueryDto): AnalyticsDateRange {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const startDate = query.startDate ? new Date(query.startDate) : defaultStart;
    const endDate = query.endDate ? new Date(query.endDate) : now;

    if (isNaN(startDate.getTime())) {
      throw new BadRequestException(
        'Invalid "startDate" parameter format. Must be an ISO-8601 string.',
      );
    }

    if (isNaN(endDate.getTime())) {
      throw new BadRequestException(
        'Invalid "endDate" parameter format. Must be an ISO-8601 string.',
      );
    }

    if (startDate > endDate) {
      throw new BadRequestException('"startDate" cannot be later than "endDate".');
    }

    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 365) {
      throw new BadRequestException(
        'Date range cannot exceed 365 days. Please refine your query window to prevent excessive workload.',
      );
    }

    return { startDate, endDate };
  }

  /**
   * Retrieves high-level overview metrics across tenants, orders, payments, subscriptions, and background jobs.
   */
  async getOverview(query: AnalyticsQueryDto): Promise<PlatformOverviewAnalytics> {
    const { startDate, endDate } = this.validateDateRange(query);

    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      publishedStores,
      orderAggregates,
      cancelledOrderCount,
      paymentSucceededAgg,
      failedPaymentCount,
      totalPaymentCount,
      refundSucceededAgg,
      activeSubscriptions,
      invoicedRevenueAgg,
      deadLetterJobsCount,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
      this.prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
      this.prisma.tenant.count({ where: { isPublished: true } }),
      // Non-cancelled orders within range for gross order value calculation
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: OrderStatus.CANCELLED },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: OrderStatus.CANCELLED,
        },
      }),
      // Succeeded payments (customer collected revenue)
      this.prisma.paymentRecord.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: PaymentRecordStatus.SUCCEEDED,
        },
        _sum: { amount: true },
      }),
      this.prisma.paymentRecord.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: PaymentRecordStatus.FAILED,
        },
      }),
      this.prisma.paymentRecord.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // Succeeded refunds
      this.prisma.refundRecord.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: RefundStatus.SUCCEEDED,
        },
        _sum: { amount: true },
      }),
      // Active subscriptions for MRR calculation
      this.prisma.subscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        include: { plan: true },
      }),
      // Paid subscription invoices
      this.prisma.subscriptionInvoice.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'PAID',
        },
        _sum: { amount: true },
      }),
      // Dead-letter events in outbox/job queue
      this.prisma.outboxEvent.count({
        where: { status: OutboxEventStatus.DEAD_LETTER },
      }),
    ]);

    // Financial calculations
    const grossOrderValue = Number(orderAggregates?._sum?.totalAmount || 0);
    const averageOrderValue = Number(orderAggregates?._avg?.totalAmount || 0);
    const totalOrders = (orderAggregates?._count?.id || 0) + cancelledOrderCount;

    const collectedRevenue = Number(paymentSucceededAgg._sum.amount || 0);
    const refundedAmount = Number(refundSucceededAgg._sum.amount || 0);
    const netRevenue = Math.max(0, collectedRevenue - refundedAmount);

    const failureRatePercentage =
      totalPaymentCount > 0
        ? Math.round((failedPaymentCount / totalPaymentCount) * 10000) / 100
        : 0;

    let monthlyRecurringRevenue = 0;
    for (const sub of activeSubscriptions) {
      if (sub.billingInterval === BillingInterval.MONTHLY) {
        monthlyRecurringRevenue += Number(sub.plan.priceMonthly);
      } else if (sub.billingInterval === BillingInterval.ANNUAL) {
        monthlyRecurringRevenue += Number(sub.plan.priceAnnual) / 12;
      }
    }
    const annualRecurringRevenue = monthlyRecurringRevenue * 12;
    const subscriptionInvoicedRevenue = Number(invoicedRevenueAgg._sum.amount || 0);

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
        publishedStores,
      },
      orders: {
        totalOrders,
        grossOrderValue: Math.round(grossOrderValue * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      },
      payments: {
        collectedRevenue: Math.round(collectedRevenue * 100) / 100,
        refundedAmount: Math.round(refundedAmount * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        failedPaymentCount,
        failureRatePercentage,
      },
      subscriptions: {
        totalActive: activeSubscriptions.length,
        monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
        annualRecurringRevenue: Math.round(annualRecurringRevenue * 100) / 100,
        subscriptionInvoicedRevenue: Math.round(subscriptionInvoicedRevenue * 100) / 100,
      },
      system: {
        deadLetterJobsCount,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves tenant growth and registration metrics over time.
   */
  async getTenantAnalytics(query: AnalyticsQueryDto): Promise<TenantAnalyticsResponse> {
    const { startDate, endDate } = this.validateDateRange(query);

    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      pendingTenants,
      publishedStores,
      tenantsInRange,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
      this.prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
      this.prisma.tenant.count({ where: { status: TenantStatus.PENDING } }),
      this.prisma.tenant.count({ where: { isPublished: true } }),
      this.prisma.tenant.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Group registrations by date (YYYY-MM-DD)
    const registrationsMap = new Map<string, number>();
    for (const t of tenantsInRange) {
      const dateKey = t.createdAt.toISOString().split('T')[0];
      registrationsMap.set(dateKey, (registrationsMap.get(dateKey) || 0) + 1);
    }

    const registrationsOverTime = Array.from(registrationsMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      pendingTenants,
      publishedStores,
      registrationsOverTime,
    };
  }

  /**
   * Retrieves order volume, gross merchandise value, and breakdown by status.
   */
  async getOrderAnalytics(query: AnalyticsQueryDto): Promise<OrderAnalyticsResponse> {
    const { startDate, endDate } = this.validateDateRange(query);

    const [orderAgg, ordersInRange] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: OrderStatus.CANCELLED },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    const dateMap = new Map<string, { count: number; value: number }>();

    for (const o of ordersInRange) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;

      const dateKey = o.createdAt.toISOString().split('T')[0];
      const current = dateMap.get(dateKey) || { count: 0, value: 0 };
      current.count += 1;
      if (o.status !== OrderStatus.CANCELLED) {
        current.value += Number(o.totalAmount);
      }
      dateMap.set(dateKey, current);
    }

    const ordersOverTime = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      orderCount: data.count,
      orderValue: Math.round(data.value * 100) / 100,
    }));

    return {
      totalOrders: ordersInRange.length,
      grossOrderValue: Math.round(Number(orderAgg._sum.totalAmount || 0) * 100) / 100,
      averageOrderValue: Math.round(Number(orderAgg._avg.totalAmount || 0) * 100) / 100,
      byStatus,
      ordersOverTime,
    };
  }

  /**
   * Retrieves subscription metrics, breakdown by plan, and recurring revenue.
   */
  async getSubscriptionAnalytics(query: AnalyticsQueryDto): Promise<SubscriptionAnalyticsResponse> {
    const { startDate, endDate } = this.validateDateRange(query);

    const [
      totalActive,
      totalTrialing,
      totalPastDue,
      totalCancelled,
      totalExpired,
      activeSubs,
      plans,
    ] = await Promise.all([
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.TRIALING } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.CANCELLED,
          updatedAt: { gte: startDate, lte: endDate },
        },
      }),
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
    ]);

    let monthlyRecurringRevenue = 0;
    for (const sub of activeSubs) {
      if (sub.billingInterval === BillingInterval.MONTHLY) {
        monthlyRecurringRevenue += Number(sub.plan.priceMonthly);
      } else if (sub.billingInterval === BillingInterval.ANNUAL) {
        monthlyRecurringRevenue += Number(sub.plan.priceAnnual) / 12;
      }
    }

    return {
      totalActive,
      totalTrialing,
      totalPastDue,
      totalCancelled,
      totalExpired,
      byPlan: plans.map((p) => ({
        planId: p.id,
        planName: p.name,
        planSlug: p.slug,
        count: p._count.subscriptions,
      })),
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
      annualRecurringRevenue: Math.round(monthlyRecurringRevenue * 12 * 100) / 100,
    };
  }

  /**
   * Retrieves payment transaction analytics, separating customer revenue from SaaS billing.
   */
  async getPaymentAnalytics(query: AnalyticsQueryDto): Promise<PaymentAnalyticsResponse> {
    const { startDate, endDate } = this.validateDateRange(query);

    const [totalAttempts, succeededAgg, failedAgg, refundedAgg, subscriptionInvoicedAgg] =
      await Promise.all([
        this.prisma.paymentRecord.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        this.prisma.paymentRecord.aggregate({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: PaymentRecordStatus.SUCCEEDED,
          },
          _count: { id: true },
          _sum: { amount: true },
        }),
        this.prisma.paymentRecord.aggregate({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: PaymentRecordStatus.FAILED,
          },
          _count: { id: true },
          _sum: { amount: true },
        }),
        this.prisma.refundRecord.aggregate({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: RefundStatus.SUCCEEDED,
          },
          _count: { id: true },
          _sum: { amount: true },
        }),
        this.prisma.subscriptionInvoice.aggregate({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: 'PAID',
          },
          _sum: { amount: true },
        }),
      ]);

    const successfulAmount = Number(succeededAgg._sum.amount || 0);
    const refundedAmount = Number(refundedAgg._sum.amount || 0);
    const netRevenue = Math.max(0, successfulAmount - refundedAmount);
    const failedCount = failedAgg._count.id || 0;

    const failureRatePercentage =
      totalAttempts > 0 ? Math.round((failedCount / totalAttempts) * 10000) / 100 : 0;

    return {
      totalAttempts,
      successfulCount: succeededAgg._count.id || 0,
      successfulAmount: Math.round(successfulAmount * 100) / 100,
      failedCount,
      failedAmount: Math.round(Number(failedAgg._sum.amount || 0) * 100) / 100,
      refundedCount: refundedAgg._count.id || 0,
      refundedAmount: Math.round(refundedAmount * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      subscriptionInvoicedRevenue:
        Math.round(Number(subscriptionInvoicedAgg._sum.amount || 0) * 100) / 100,
      failureRatePercentage,
    };
  }
}
