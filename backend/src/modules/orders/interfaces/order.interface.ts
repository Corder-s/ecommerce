import { OrderStatus, PaymentStatus, ReservationStatus } from '@prisma/client';

export interface MonetaryAmount {
  currency: string;
  amount: number;
  minorUnits: number;
  formatted: string;
}

export interface OrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  sku: string | null;
  unitPrice: MonetaryAmount;
  quantity: number;
  subtotal: MonetaryAmount;
  createdAt: Date;
}

export interface OrderStatusHistoryResponse {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: string;
  reason: string | null;
  createdAt: Date;
}

export interface InventoryReservationResponse {
  id: string;
  productId: string;
  quantity: number;
  status: ReservationStatus;
  releasedAt: Date | null;
  createdAt: Date;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  userId: string;
  tenantId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  currency: string;
  subtotal: MonetaryAmount;
  taxAmount: MonetaryAmount;
  shippingAmount: MonetaryAmount;
  totalAmount: MonetaryAmount;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    landmark?: string | null;
  };
  customerNote: string | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
  items: OrderItemResponse[];
  reservations?: InventoryReservationResponse[];
  statusHistory?: OrderStatusHistoryResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderListResponse {
  orders: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
