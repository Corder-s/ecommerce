export interface PaymentWebhookResult {
  received: boolean;
  duplicate?: boolean;
  eventId?: string;
  eventType?: string;
  status?: string;
  message?: string;
}
