export interface CreateSubscriptionSessionInput {
  tenantId: string;
  planId: string;
  planSlug: string;
  interval: 'MONTHLY' | 'ANNUAL';
  amount: number;
  currency: string;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface SubscriptionSessionOutput {
  provider: string;
  providerSubscriptionId: string;
  providerCustomerId?: string;
  checkoutUrl?: string;
  status: 'ACTIVE' | 'TRIALING' | 'PENDING';
}

export interface SubscriptionWebhookEventPayload {
  eventId: string;
  eventType: string; // 'subscription.activated' | 'subscription.renewed' | 'subscription.payment_failed' | 'subscription.cancelled' | 'subscription.expired'
  providerSubscriptionId: string;
  tenantId: string;
  planSlug?: string;
  amount?: number;
  currency?: string;
  periodStart?: Date;
  periodEnd?: Date;
  failureReason?: string;
  rawPayload: Record<string, unknown>;
}

export interface ISubscriptionProvider {
  readonly providerName: string;
  createSubscriptionSession(
    input: CreateSubscriptionSessionInput,
  ): Promise<SubscriptionSessionOutput>;
  verifyWebhookSignature(
    rawBody: string | Buffer | Record<string, unknown>,
    signature: string,
    secret: string,
  ): boolean;
  parseWebhookEvent(
    body: Record<string, unknown>,
    headers?: Record<string, string | string[]>,
  ): SubscriptionWebhookEventPayload;
  cancelSubscription(
    providerSubscriptionId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<{ success: boolean }>;
}
