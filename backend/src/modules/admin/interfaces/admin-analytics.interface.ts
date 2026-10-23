export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

export interface PlatformOverviewAnalytics {
  tenants: {
    total: number;
    active: number;
    suspended: number;
    publishedStores: number;
  };
  orders: {
    totalOrders: number;
    grossOrderValue: number;
    averageOrderValue: number;
  };
  payments: {
    collectedRevenue: number;
    refundedAmount: number;
    netRevenue: number;
    failedPaymentCount: number;
    failureRatePercentage: number;
  };
  subscriptions: {
    totalActive: number;
    monthlyRecurringRevenue: number;
    annualRecurringRevenue: number;
    subscriptionInvoicedRevenue: number;
  };
  system: {
    deadLetterJobsCount: number;
  };
  generatedAt: string;
}

export interface TenantAnalyticsResponse {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  pendingTenants: number;
  publishedStores: number;
  registrationsOverTime: {
    date: string;
    count: number;
  }[];
}

export interface OrderAnalyticsResponse {
  totalOrders: number;
  grossOrderValue: number;
  averageOrderValue: number;
  byStatus: Record<string, number>;
  ordersOverTime: {
    date: string;
    orderCount: number;
    orderValue: number;
  }[];
}

export interface SubscriptionAnalyticsResponse {
  totalActive: number;
  totalTrialing: number;
  totalPastDue: number;
  totalCancelled: number;
  totalExpired: number;
  byPlan: {
    planId: string;
    planName: string;
    planSlug: string;
    count: number;
  }[];
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
}

export interface PaymentAnalyticsResponse {
  totalAttempts: number;
  successfulCount: number;
  successfulAmount: number;
  failedCount: number;
  failedAmount: number;
  refundedCount: number;
  refundedAmount: number;
  netRevenue: number;
  subscriptionInvoicedRevenue: number;
  failureRatePercentage: number;
}
