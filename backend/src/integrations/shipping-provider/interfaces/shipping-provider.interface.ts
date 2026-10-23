export interface ShippingRecipient {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ShippingItemSummary {
  productName: string;
  quantity: number;
  sku?: string | null;
}

export interface CreateShipmentInput {
  orderId: string;
  orderNumber: string;
  tenantId: string;
  recipient: ShippingRecipient;
  packageWeight: number; // in kg
  packageLength?: number; // in cm
  packageWidth?: number; // in cm
  packageHeight?: number; // in cm
  items: ShippingItemSummary[];
  carrierCode?: string;
  carrierNote?: string;
  customTrackingNumber?: string;
}

export interface CreateShipmentResult {
  provider: string;
  trackingNumber: string;
  carrierReference?: string;
  estimatedDeliveryDays?: number;
  initialStatus: string;
}

export interface TrackingEventItem {
  status: string;
  description: string;
  location?: string;
  timestamp: Date;
}

export interface TrackShipmentResult {
  trackingNumber: string;
  status: string;
  location?: string;
  description: string;
  timestamp: Date;
  events: TrackingEventItem[];
}

export interface CarrierEligibilityInput {
  packageWeight: number;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  carrierCode?: string;
  itemNames: string[];
}

export interface CarrierEligibilityResult {
  isEligible: boolean;
  reason?: string;
  recommendedCarrier?: string;
}

export interface ShippingWebhookPayload {
  eventId: string;
  eventType: string; // e.g., 'shipment.in_transit', 'shipment.delivered'
  provider: string;
  trackingNumber: string;
  status: string; // mapped to ShipmentStatus
  description: string;
  location?: string;
  eventTimestamp: Date;
  rawPayload: Record<string, unknown>;
}

export interface IShippingProvider {
  readonly providerName: string;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  trackShipment(trackingNumber: string): Promise<TrackShipmentResult>;
  cancelShipment(trackingNumber: string): Promise<{ success: boolean; reason?: string }>;
  checkCarrierEligibility(input: CarrierEligibilityInput): CarrierEligibilityResult;
  verifyWebhookSignature(
    rawBody: string | Buffer | Record<string, unknown>,
    signature: string,
    secret: string,
  ): boolean;
  parseWebhookEvent(
    body: Record<string, unknown>,
    headers?: Record<string, string | string[]>,
  ): ShippingWebhookPayload;
}
