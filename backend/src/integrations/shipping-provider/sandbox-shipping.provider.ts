import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IShippingProvider,
  CreateShipmentInput,
  CreateShipmentResult,
  TrackShipmentResult,
  CarrierEligibilityInput,
  CarrierEligibilityResult,
  ShippingWebhookPayload,
} from './interfaces/shipping-provider.interface';

@Injectable()
export class SandboxShippingProvider implements IShippingProvider {
  readonly providerName = 'sandbox';
  private readonly logger = new Logger(SandboxShippingProvider.name);

  /**
   * Evaluates product catalogue and packaging dimensions against carrier acceptance guidelines.
   * Specialises in handmade gaushala goods (cow dung cakes, wood, diyas, dhoop, statues).
   */
  checkCarrierEligibility(input: CarrierEligibilityInput): CarrierEligibilityResult {
    const { packageWeight, packageLength, packageWidth, packageHeight, carrierCode, itemNames } =
      input;

    // 1. Strict weight bounds
    if (packageWeight <= 0) {
      return {
        isEligible: false,
        reason: 'Package weight must be greater than zero kg.',
      };
    }

    if (packageWeight > 70) {
      return {
        isEligible: false,
        reason:
          'Package exceeds maximum courier parcel limit of 70kg. Requires specialized LTL freight transport.',
      };
    }

    // 2. Dimensional checks
    if (packageLength !== undefined && packageLength <= 0) {
      return { isEligible: false, reason: 'Package length must be positive.' };
    }
    if (packageWidth !== undefined && packageWidth <= 0) {
      return { isEligible: false, reason: 'Package width must be positive.' };
    }
    if (packageHeight !== undefined && packageHeight <= 0) {
      return { isEligible: false, reason: 'Package height must be positive.' };
    }

    if (
      packageLength &&
      packageWidth &&
      packageHeight &&
      (packageLength > 200 || packageWidth > 200 || packageHeight > 200)
    ) {
      return {
        isEligible: false,
        reason: 'No single package dimension may exceed 200cm for standard courier carriage.',
      };
    }

    // 3. Category & Product Specific Carrier Constraints
    const carrier = (carrierCode || 'standard').toLowerCase();
    const hasCowDungWood = itemNames.some(
      (name) =>
        name.toLowerCase().includes('wood') ||
        name.toLowerCase().includes('lakdi') ||
        name.toLowerCase().includes('kanda') ||
        name.toLowerCase().includes('kande'),
    );

    if (carrier.includes('air') && hasCowDungWood && packageWeight > 10) {
      return {
        isEligible: false,
        reason:
          'Commercial air freight restricts bulk cow dung wood or heavy bio-mass parcels exceeding 10kg. Please choose standard surface cargo or road transport.',
        recommendedCarrier: 'surface_cargo',
      };
    }

    return {
      isEligible: true,
      recommendedCarrier: carrierCode || 'surface_cargo',
    };
  }

  /**
   * Creates a sandbox shipment reservation and issues a deterministic/unique tracking number.
   */
  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const eligibility = this.checkCarrierEligibility({
      packageWeight: input.packageWeight,
      packageLength: input.packageLength,
      packageWidth: input.packageWidth,
      packageHeight: input.packageHeight,
      carrierCode: input.carrierCode,
      itemNames: input.items.map((i) => i.productName),
    });

    if (!eligibility.isEligible) {
      throw new BadRequestException(`Carrier eligibility check failed: ${eligibility.reason}`);
    }

    const trackingNumber =
      input.customTrackingNumber ||
      `GS-TRK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    this.logger.log(
      `Created shipment for Order ${input.orderNumber} with tracking number ${trackingNumber} via sandbox provider`,
    );

    return {
      provider: this.providerName,
      trackingNumber,
      carrierReference: `SANDBOX-AWB-${Date.now()}`,
      estimatedDeliveryDays: 4,
      initialStatus: 'READY_TO_SHIP',
    };
  }

  /**
   * Queries provider for tracking status.
   */
  async trackShipment(trackingNumber: string): Promise<TrackShipmentResult> {
    const now = new Date();
    return {
      trackingNumber,
      status: 'IN_TRANSIT',
      location: 'Regional Sorting Hub, New Delhi',
      description: 'Package scanned at automated sorting facility',
      timestamp: now,
      events: [
        {
          status: 'READY_TO_SHIP',
          description: 'Package manifest created by artisan seller',
          location: 'Artisan Workshop Hub',
          timestamp: new Date(now.getTime() - 86400000),
        },
        {
          status: 'SHIPPED',
          description: 'Package picked up by courier service agent',
          location: 'Origin Facility',
          timestamp: new Date(now.getTime() - 43200000),
        },
        {
          status: 'IN_TRANSIT',
          description: 'Package in transit to destination hub',
          location: 'Regional Sorting Hub, New Delhi',
          timestamp: now,
        },
      ],
    };
  }

  /**
   * Cancels a shipment with the carrier.
   */
  async cancelShipment(trackingNumber: string): Promise<{ success: boolean; reason?: string }> {
    this.logger.log(`Shipment cancelled with sandbox carrier: ${trackingNumber}`);
    return {
      success: true,
      reason: 'Shipment cancellation recorded by carrier',
    };
  }

  /**
   * Verifies carrier HMAC signature using constant-time comparison to prevent timing attacks.
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

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const actualBuf = Buffer.from(signature, 'utf8');

      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch (err) {
      this.logger.error(`Error verifying shipping webhook signature: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Parses carrier webhook payload into standardized ShippingWebhookPayload.
   */
  parseWebhookEvent(
    body: Record<string, unknown>,
    headers?: Record<string, string | string[]>,
  ): ShippingWebhookPayload {
    void headers;
    const eventId =
      (body.eventId as string) ||
      (body.id as string) ||
      `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const eventType =
      (body.eventType as string) || (body.event as string) || 'shipment.status_updated';
    const trackingNumber =
      (body.trackingNumber as string) ||
      (body.awb as string) ||
      ((body.data as Record<string, unknown>)?.trackingNumber as string);

    if (!trackingNumber) {
      throw new BadRequestException('Webhook payload missing trackingNumber');
    }

    const rawStatus = (
      (body.status as string) ||
      ((body.data as Record<string, unknown>)?.status as string) ||
      'IN_TRANSIT'
    ).toUpperCase();

    // Map provider-specific status strings to system ShipmentStatus
    let status = 'IN_TRANSIT';
    if (['DELIVERED', 'COMPLETED'].includes(rawStatus)) {
      status = 'DELIVERED';
    } else if (['OUT_FOR_DELIVERY', 'OUT_FOR_DISPATCH'].includes(rawStatus)) {
      status = 'OUT_FOR_DELIVERY';
    } else if (['IN_TRANSIT', 'DISPATCHED', 'IN_HUB'].includes(rawStatus)) {
      status = 'IN_TRANSIT';
    } else if (['SHIPPED', 'PICKED_UP'].includes(rawStatus)) {
      status = 'SHIPPED';
    } else if (['DELIVERY_FAILED', 'UNDELIVERED', 'FAILED_ATTEMPT'].includes(rawStatus)) {
      status = 'DELIVERY_FAILED';
    } else if (['RETURN_TO_ORIGIN', 'RTO', 'RETURNED'].includes(rawStatus)) {
      status = 'RETURN_TO_ORIGIN';
    } else if (['CANCELLED', 'VOID'].includes(rawStatus)) {
      status = 'CANCELLED';
    }

    const description =
      (body.description as string) ||
      ((body.data as Record<string, unknown>)?.description as string) ||
      `Shipment status updated to ${status}`;

    const location =
      (body.location as string) ||
      ((body.data as Record<string, unknown>)?.location as string) ||
      undefined;

    const eventTimestampStr =
      (body.timestamp as string) || ((body.data as Record<string, unknown>)?.timestamp as string);

    const eventTimestamp = eventTimestampStr ? new Date(eventTimestampStr) : new Date();

    return {
      eventId,
      eventType,
      provider: this.providerName,
      trackingNumber,
      status,
      description,
      location,
      eventTimestamp,
      rawPayload: body,
    };
  }
}
