import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ISubscriptionProvider,
  CreateSubscriptionSessionInput,
  SubscriptionSessionOutput,
  SubscriptionWebhookEventPayload,
} from './interfaces/subscription-provider.interface';

@Injectable()
export class SandboxSubscriptionProvider implements ISubscriptionProvider {
  readonly providerName = 'sandbox';
  private readonly logger = new Logger(SandboxSubscriptionProvider.name);

  /**
   * Simulates creating a subscription checkout session with the billing provider.
   */
  async createSubscriptionSession(
    input: CreateSubscriptionSessionInput,
  ): Promise<SubscriptionSessionOutput> {
    const providerSubscriptionId = `sub_sbx_${crypto.randomBytes(8).toString('hex')}`;
    const providerCustomerId = `cus_sbx_${crypto.randomBytes(8).toString('hex')}`;
    const checkoutUrl = `https://sandbox-billing.gaushilp.local/subscribe?sub=${providerSubscriptionId}&tenant=${input.tenantId}&plan=${input.planSlug}`;

    this.logger.log(
      `Created sandbox subscription session: ${providerSubscriptionId} for tenant ${input.tenantId} (plan: ${input.planSlug}, interval: ${input.interval})`,
    );

    return {
      provider: this.providerName,
      providerSubscriptionId,
      providerCustomerId,
      checkoutUrl,
      status: 'ACTIVE',
    };
  }

  /**
   * Cryptographically verifies HMAC-SHA256 signature for incoming subscription webhooks.
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
      this.logger.error(`Subscription signature verification error: ${err.message}`);
      return false;
    }
  }

  /**
   * Parses and validates raw webhook event payload from subscription provider.
   */
  parseWebhookEvent(body: Record<string, unknown>): SubscriptionWebhookEventPayload {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid webhook payload: body must be an object');
    }

    const eventId = String(body.eventId || body.id || '');
    const eventType = String(body.eventType || body.event || body.type || '');
    const data = (body.data && typeof body.data === 'object' ? body.data : body) as Record<
      string,
      unknown
    >;

    const providerSubscriptionId = String(
      data.providerSubscriptionId || data.subscriptionId || data.id || '',
    );
    const tenantId = String(data.tenantId || '');
    const planSlug = data.planSlug ? String(data.planSlug) : undefined;
    const amount = data.amount ? Number(data.amount) : undefined;
    const currency = data.currency ? String(data.currency).toUpperCase() : undefined;
    const failureReason = data.failureReason ? String(data.failureReason) : undefined;

    const periodStart = data.periodStart
      ? new Date(data.periodStart as string | number)
      : undefined;
    const periodEnd = data.periodEnd ? new Date(data.periodEnd as string | number) : undefined;

    if (!eventId) {
      throw new BadRequestException('Webhook payload missing required field: eventId');
    }

    if (!eventType) {
      throw new BadRequestException('Webhook payload missing required field: eventType');
    }

    if (!tenantId) {
      throw new BadRequestException('Webhook payload missing required field: tenantId');
    }

    return {
      eventId,
      eventType,
      providerSubscriptionId,
      tenantId,
      planSlug,
      amount,
      currency,
      periodStart,
      periodEnd,
      failureReason,
      rawPayload: body,
    };
  }

  /**
   * Cancels subscription with billing provider.
   */
  async cancelSubscription(
    providerSubscriptionId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<{ success: boolean }> {
    this.logger.log(
      `Cancelled sandbox subscription: ${providerSubscriptionId} (cancelAtPeriodEnd: ${cancelAtPeriodEnd})`,
    );
    return { success: true };
  }

  /**
   * Utility for tests: Generates a valid HMAC-SHA256 signature for a payload.
   */
  generateTestSignature(payload: string | Record<string, unknown>, secret: string): string {
    const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
  }
}
