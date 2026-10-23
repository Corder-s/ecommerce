import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IPaymentProvider,
  CreatePaymentSessionInput,
  PaymentSessionOutput,
  WebhookEventPayload,
  RefundRequestInput,
  RefundResponseOutput,
} from './interfaces/payment-provider.interface';

@Injectable()
export class SandboxPaymentProvider implements IPaymentProvider {
  readonly providerName = 'sandbox';
  private readonly logger = new Logger(SandboxPaymentProvider.name);

  /**
   * Simulates initiating a payment session with an external payment gateway.
   */
  async createPaymentSession(input: CreatePaymentSessionInput): Promise<PaymentSessionOutput> {
    const providerPaymentId = `pay_sbx_${crypto.randomBytes(8).toString('hex')}`;
    const providerOrderId = `ord_sbx_${crypto.randomBytes(8).toString('hex')}`;
    const clientSecret = `sec_sbx_${crypto.randomBytes(16).toString('hex')}`;
    const checkoutUrl = `https://sandbox-gateway.gaushilp.local/checkout?session=${providerPaymentId}&order=${input.orderNumber}`;

    this.logger.log(
      `Created sandbox payment session: ${providerPaymentId} for order ${input.orderNumber} (amount: ${input.amount} ${input.currency})`,
    );

    return {
      provider: this.providerName,
      providerPaymentId,
      providerOrderId,
      clientSecret,
      checkoutUrl,
      status: 'PENDING',
    };
  }

  /**
   * Cryptographically verifies HMAC-SHA256 signature for incoming webhooks.
   * Rejects empty or invalid signatures.
   */
  verifyWebhookSignature(
    rawBody: string | Buffer | Record<string, unknown>,
    signature: string,
    secret: string,
  ): boolean {
    if (!signature || !secret) {
      return false;
    }

    try {
      const payloadString =
        typeof rawBody === 'string'
          ? rawBody
          : Buffer.isBuffer(rawBody)
            ? rawBody.toString('utf8')
            : JSON.stringify(rawBody);

      // Support direct hex signature or "t=...,v1=..." formatted signatures
      let signatureHash = signature.trim();
      if (signature.includes('v1=')) {
        const parts = signature.split(',');
        for (const part of parts) {
          const [key, value] = part.split('=');
          if (key.trim() === 'v1' && value) {
            signatureHash = value.trim();
            break;
          }
        }
      }

      const expectedHash = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

      const expectedBuffer = Buffer.from(expectedHash, 'hex');
      const receivedBuffer = Buffer.from(signatureHash, 'hex');

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch (err) {
      this.logger.error(`Signature verification error: ${err.message}`);
      return false;
    }
  }

  /**
   * Parses and validates raw webhook event payload from provider.
   */
  parseWebhookEvent(body: Record<string, unknown>): WebhookEventPayload {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid webhook payload: body must be an object');
    }

    const eventId = String(body.eventId || body.id || '');
    const eventType = String(body.eventType || body.event || body.type || '');
    const data = (body.data && typeof body.data === 'object' ? body.data : body) as Record<
      string,
      unknown
    >;

    const orderId = String(data.orderId || data.order_id || '');
    const providerPaymentId = String(data.providerPaymentId || data.paymentId || data.id || '');
    const amount = Number(data.amount) || 0;
    const currency = String(data.currency || 'INR').toUpperCase();
    const tenantId = data.tenantId ? String(data.tenantId) : undefined;
    const failureReason = data.failureReason ? String(data.failureReason) : undefined;

    if (!eventId) {
      throw new BadRequestException('Webhook payload missing required field: eventId');
    }

    if (!eventType) {
      throw new BadRequestException('Webhook payload missing required field: eventType');
    }

    if (!orderId) {
      throw new BadRequestException('Webhook payload missing required field: orderId');
    }

    return {
      eventId,
      eventType,
      providerPaymentId,
      orderId,
      tenantId,
      amount,
      currency,
      failureReason,
      rawPayload: body,
    };
  }

  /**
   * Simulates processing a refund through the provider.
   */
  async processRefund(input: RefundRequestInput): Promise<RefundResponseOutput> {
    const providerRefundId = `ref_sbx_${crypto.randomBytes(8).toString('hex')}`;

    this.logger.log(
      `Processed sandbox refund: ${providerRefundId} for payment ${input.providerPaymentId} (amount: ${input.amount} ${input.currency})`,
    );

    return {
      providerRefundId,
      status: 'SUCCEEDED',
      amount: input.amount,
    };
  }

  /**
   * Utility for tests: Generates a valid HMAC-SHA256 signature for a payload.
   */
  generateTestSignature(payload: string | Record<string, unknown>, secret: string): string {
    const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
  }
}
