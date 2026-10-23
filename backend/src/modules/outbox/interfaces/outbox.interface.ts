import { OutboxEventStatus } from '@prisma/client';

export enum DomainEventType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SHIPMENT_DISPATCHED = 'SHIPMENT_DISPATCHED',
  SHIPMENT_DELIVERED = 'SHIPMENT_DELIVERED',
  SUBSCRIPTION_ACTIVATED = 'SUBSCRIPTION_ACTIVATED',
  SUBSCRIPTION_STATUS_CHANGED = 'SUBSCRIPTION_STATUS_CHANGED',
}

export interface CreateOutboxEventInput {
  eventType: DomainEventType | string;
  tenantId?: string | null;
  payload: Record<string, unknown>;
  scheduledAt?: Date;
  maxRetries?: number;
}

export interface OutboxEventEntity {
  id: string;
  tenantId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  status: OutboxEventStatus;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  scheduledAt: Date;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
