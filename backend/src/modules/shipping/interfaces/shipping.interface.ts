import { ShipmentStatus, OrderStatus, PaymentStatus } from '@prisma/client';

export const VALID_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.PENDING]: [ShipmentStatus.READY_TO_SHIP, ShipmentStatus.CANCELLED],
  [ShipmentStatus.READY_TO_SHIP]: [ShipmentStatus.SHIPPED, ShipmentStatus.CANCELLED],
  [ShipmentStatus.SHIPPED]: [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELIVERY_FAILED,
    ShipmentStatus.RETURN_TO_ORIGIN,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.IN_TRANSIT]: [
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELIVERY_FAILED,
    ShipmentStatus.RETURN_TO_ORIGIN,
  ],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.DELIVERY_FAILED,
    ShipmentStatus.RETURN_TO_ORIGIN,
  ],
  [ShipmentStatus.DELIVERY_FAILED]: [
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.RETURN_TO_ORIGIN,
    ShipmentStatus.DELIVERED,
  ],
  [ShipmentStatus.RETURN_TO_ORIGIN]: [],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.CANCELLED]: [],
};

export interface ShipmentEventResponse {
  id: string;
  status: ShipmentStatus;
  description: string;
  location?: string | null;
  eventTimestamp: Date;
  source: string;
  createdAt: Date;
}

export interface MonetaryCost {
  currency: string;
  amount: number;
  formatted: string;
}

export interface ShipmentResponse {
  id: string;
  tenantId: string;
  orderId: string;
  provider: string;
  trackingNumber: string | null;
  status: ShipmentStatus;
  packageWeight: number;
  packageLength: number | null;
  packageWidth: number | null;
  packageHeight: number | null;
  shippingCost: MonetaryCost;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  carrierNote: string | null;
  events?: ShipmentEventResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerTrackingEvent {
  status: ShipmentStatus;
  description: string;
  location?: string | null;
  eventTimestamp: Date;
}

export interface CustomerShipmentItem {
  id: string;
  provider: string;
  trackingNumber: string | null;
  status: ShipmentStatus;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  events: CustomerTrackingEvent[];
}

export interface CustomerTrackingResponse {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  currency: string;
  shipments: CustomerShipmentItem[];
}

export interface ReadyOrderSummary {
  orderId: string;
  orderNumber: string;
  tenantId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  totalAmount: {
    currency: string;
    amount: number;
    formatted: string;
  };
  itemCount: number;
  shippingAddress: Record<string, unknown>;
  shipmentsCount: number;
}

export interface ReadyOrdersListResponse {
  orders: ReadyOrderSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
