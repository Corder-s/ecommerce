import { SubscriptionStatus, BillingInterval } from '@prisma/client';

export interface PlanResponse {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  maxProducts: number;
  maxStaffMembers: number;
  customDomainEnabled: boolean;
  analyticsEnabled: boolean;
  prioritySupport: boolean;
}

export interface CurrentSubscriptionResponse {
  id: string;
  tenantId: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string | null;
  plan: PlanResponse;
  usage: {
    productCount: number;
    maxProducts: number;
    staffCount: number;
    maxStaffMembers: number;
  };
}

export interface SubscriptionInvoiceResponse {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  billingReason?: string | null;
  periodStart: string;
  periodEnd: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface CheckoutSubscriptionResponse {
  provider: string;
  providerSubscriptionId: string;
  checkoutUrl?: string;
  status: string;
  plan: PlanResponse;
  billingInterval: BillingInterval;
}
