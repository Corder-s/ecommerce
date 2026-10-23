import { PaymentRecordStatus, RefundStatus } from '@prisma/client';

export interface PaymentAttemptResponse {
  id: string;
  attemptNumber: number;
  status: PaymentRecordStatus;
  amount: number;
  currency: string;
  providerReference?: string | null;
  failureReason?: string | null;
  createdAt: string;
}

export interface RefundRecordResponse {
  id: string;
  amount: number;
  currency: string;
  providerRefundId?: string | null;
  reason?: string | null;
  status: RefundStatus;
  createdAt: string;
}

export interface PaymentRecordResponse {
  id: string;
  orderId: string;
  tenantId: string;
  userId: string;
  provider: string;
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
  paymentMethod?: string | null;
  errorMessage?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  attempts?: PaymentAttemptResponse[];
  refunds?: RefundRecordResponse[];
}

export interface InitiatePaymentResponse {
  paymentRecordId: string;
  provider: string;
  providerPaymentId: string;
  providerOrderId?: string;
  clientSecret?: string;
  checkoutUrl?: string;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
}
