export interface CreatePaymentSessionInput {
  orderId: string;
  orderNumber: string;
  tenantId: string;
  amount: number;
  currency: string;
  customer: {
    id: string;
    email?: string | null;
    name?: string | null;
  };
  metadata?: Record<string, string>;
}

export interface PaymentSessionOutput {
  provider: string;
  providerPaymentId: string;
  providerOrderId?: string;
  clientSecret?: string;
  checkoutUrl?: string;
  status: 'PENDING' | 'REQUIRES_ACTION';
}

export interface WebhookEventPayload {
  eventId: string;
  eventType: string; // 'payment.succeeded' | 'payment.failed' | 'payment.cancelled'
  providerPaymentId: string;
  orderId: string;
  tenantId?: string;
  amount: number;
  currency: string;
  rawPayload: Record<string, unknown>;
  failureReason?: string;
}

export interface RefundRequestInput {
  paymentRecordId: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  reason?: string;
}

export interface RefundResponseOutput {
  providerRefundId: string;
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  amount: number;
}

export interface IPaymentProvider {
  readonly providerName: string;
  createPaymentSession(input: CreatePaymentSessionInput): Promise<PaymentSessionOutput>;
  verifyWebhookSignature(
    rawBody: string | Buffer | Record<string, unknown>,
    signature: string,
    secret: string,
  ): boolean;
  parseWebhookEvent(
    body: Record<string, unknown>,
    headers?: Record<string, string | string[]>,
  ): WebhookEventPayload;
  processRefund(input: RefundRequestInput): Promise<RefundResponseOutput>;
}
