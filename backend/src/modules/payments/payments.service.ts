import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentStatus,
  PaymentRecordStatus,
  RefundStatus,
  PlatformRole,
  TenantRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { PAYMENT_PROVIDER_TOKEN, IPaymentProvider } from '../../integrations/payment-provider';
import { OutboxService } from '../outbox/outbox.service';
import { DomainEventType } from '../outbox/interfaces/outbox.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import {
  InitiatePaymentResponse,
  PaymentRecordResponse,
  RefundRecordResponse,
} from './dto/payment-response.dto';
import { PaymentWebhookResult } from './interfaces/payment.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(PAYMENT_PROVIDER_TOKEN)
    private readonly paymentProvider: IPaymentProvider,
    @Optional() private readonly outboxService?: OutboxService,
  ) {}

  /**
   * Initiates a customer payment for an eligible order.
   * Records a payment attempt and establishes payment tracking.
   */
  async initiateOrderPayment(
    user: AuthenticatedUser,
    orderId: string,
    dto: CreatePaymentDto,
  ): Promise<InitiatePaymentResponse> {
    // 1. Fetch order with tenant and items
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tenant: true,
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // 2. Ownership / Tenant access enforcement
    const isOwner = order.userId === user.id;
    const isSuperAdmin = user.platformRole === PlatformRole.SUPER_ADMIN;

    if (!isOwner && !isSuperAdmin) {
      throw new NotFoundException('Order not found');
    }

    // 3. Eligibility checks
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot initiate payment for a cancelled order');
    }

    if (order.status !== OrderStatus.PLACED) {
      throw new BadRequestException(
        `Cannot initiate payment for order in "${order.status}" status. Only newly placed orders can enter payment flow.`,
      );
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new ConflictException('This order has already been paid in full');
    }

    if (order.paymentStatus === PaymentStatus.REFUNDED) {
      throw new BadRequestException('This order was refunded and cannot be paid again');
    }

    const orderTotal = Number(order.totalAmount);
    if (orderTotal <= 0) {
      throw new BadRequestException('Invalid order total amount');
    }

    // 4. Find or create PaymentRecord
    const paymentRecord = await this.prisma.paymentRecord.findFirst({
      where: {
        orderId: order.id,
        status: { in: [PaymentRecordStatus.PENDING, PaymentRecordStatus.REQUIRES_ACTION] },
      },
      include: { attempts: true },
      orderBy: { createdAt: 'desc' },
    });

    const attemptNumber = paymentRecord ? paymentRecord.attempts.length + 1 : 1;

    // 5. Call Payment Provider adapter
    const session = await this.paymentProvider.createPaymentSession({
      orderId: order.id,
      orderNumber: order.orderNumber,
      tenantId: order.tenantId,
      amount: orderTotal,
      currency: order.currency,
      customer: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      metadata: {
        paymentMethod: dto.paymentMethod || 'standard',
        returnUrl: dto.returnUrl || '',
      },
    });

    // 6. Record Payment and Attempt transactionally
    const finalRecord = await this.prisma.$transaction(async (tx) => {
      let recordId: string;

      if (paymentRecord) {
        recordId = paymentRecord.id;
        await tx.paymentRecord.update({
          where: { id: recordId },
          data: {
            provider: session.provider,
            providerPaymentId: session.providerPaymentId,
            providerOrderId: session.providerOrderId || null,
            paymentMethod: dto.paymentMethod || null,
            status: PaymentRecordStatus.PENDING,
          },
        });
      } else {
        const created = await tx.paymentRecord.create({
          data: {
            orderId: order.id,
            tenantId: order.tenantId,
            userId: user.id,
            provider: session.provider,
            providerPaymentId: session.providerPaymentId,
            providerOrderId: session.providerOrderId || null,
            amount: new Prisma.Decimal(orderTotal),
            currency: order.currency,
            status: PaymentRecordStatus.PENDING,
            paymentMethod: dto.paymentMethod || null,
          },
        });
        recordId = created.id;
      }

      await tx.paymentAttempt.create({
        data: {
          paymentRecordId: recordId,
          attemptNumber,
          providerReference: session.providerPaymentId,
          status: PaymentRecordStatus.PENDING,
          amount: new Prisma.Decimal(orderTotal),
          currency: order.currency,
          rawResponse: session as unknown as Prisma.InputJsonValue,
        },
      });

      return recordId;
    });

    this.logger.log(
      `Payment session initiated: record=${finalRecord}, order=${order.orderNumber}, attempt=${attemptNumber}`,
    );

    return {
      paymentRecordId: finalRecord,
      provider: session.provider,
      providerPaymentId: session.providerPaymentId,
      providerOrderId: session.providerOrderId,
      clientSecret: session.clientSecret,
      checkoutUrl: session.checkoutUrl,
      amount: orderTotal,
      currency: order.currency,
      status: PaymentRecordStatus.PENDING,
    };
  }

  /**
   * Retrieves payments and attempts associated with an order.
   * Access allowed to customer order owner, tenant staff, or super admin.
   */
  async listOrderPayments(
    user: AuthenticatedUser,
    orderId: string,
  ): Promise<PaymentRecordResponse[]> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertOrderReadAccess(user, order.userId, order.tenantId);

    const records = await this.prisma.paymentRecord.findMany({
      where: { orderId },
      include: {
        attempts: { orderBy: { attemptNumber: 'desc' } },
        refunds: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapPaymentRecordToResponse(r));
  }

  /**
   * Retrieves a single payment record by ID.
   */
  async getPaymentById(user: AuthenticatedUser, paymentId: string): Promise<PaymentRecordResponse> {
    const record = await this.prisma.paymentRecord.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
        attempts: { orderBy: { attemptNumber: 'desc' } },
        refunds: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!record) {
      throw new NotFoundException('Payment record not found');
    }

    this.assertOrderReadAccess(user, record.userId, record.tenantId);

    return this.mapPaymentRecordToResponse(record);
  }

  /**
   * Processes a verified webhook event from the customer payment provider.
   * Enforces HMAC cryptographic verification, idempotency replay protection,
   * transaction integrity, and handles late payment reconciliation.
   */
  async handlePaymentWebhook(
    provider: string,
    rawBody: Record<string, unknown>,
    signature: string,
    headers: Record<string, string | string[]>,
  ): Promise<PaymentWebhookResult> {
    const webhookSecret =
      this.configService.get<string>('payments.webhookSecret') || 'sandbox_payment_webhook_secret';

    // 1. Verify cryptographic signature
    const isValidSignature = this.paymentProvider.verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret,
    );

    if (!isValidSignature) {
      this.logger.warn(`Rejected payment webhook from provider "${provider}": Invalid signature`);
      throw new UnauthorizedException('Invalid payment webhook signature');
    }

    // 2. Parse and validate payload
    const event = this.paymentProvider.parseWebhookEvent(rawBody, headers);

    // 3. Replay Protection: Check if eventId was already processed
    const existingEvent = await this.prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider,
          eventId: event.eventId,
        },
      },
    });

    if (existingEvent) {
      this.logger.log(
        `Duplicate webhook event ignored: provider=${provider}, eventId=${event.eventId}`,
      );
      return {
        received: true,
        duplicate: true,
        eventId: event.eventId,
        eventType: event.eventType,
        message: 'Event already processed',
      };
    }

    // 4. Record webhook event for idempotency audit log
    await this.prisma.paymentWebhookEvent.create({
      data: {
        provider,
        eventId: event.eventId,
        eventType: event.eventType,
        payload: rawBody as unknown as Prisma.InputJsonValue,
        processed: true,
      },
    });

    // 5. Look up corresponding order
    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      include: { tenant: true },
    });

    if (!order) {
      this.logger.error(`Webhook referenced non-existent order: ${event.orderId}`);
      throw new NotFoundException(`Order not found for event ${event.eventId}`);
    }

    // Tenant isolation verification if tenantId was passed in event
    if (event.tenantId && event.tenantId !== order.tenantId) {
      this.logger.error(
        `Webhook tenant mismatch: event tenant ${event.tenantId} does not match order tenant ${order.tenantId}`,
      );
      throw new BadRequestException('Tenant mismatch on webhook payment');
    }

    // 6. Look up or locate payment record
    let paymentRecord = await this.prisma.paymentRecord.findFirst({
      where: {
        orderId: order.id,
        OR: [
          { providerPaymentId: event.providerPaymentId },
          { status: PaymentRecordStatus.PENDING },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!paymentRecord) {
      paymentRecord = await this.prisma.paymentRecord.create({
        data: {
          orderId: order.id,
          tenantId: order.tenantId,
          userId: order.userId,
          provider,
          providerPaymentId: event.providerPaymentId || null,
          amount: new Prisma.Decimal(event.amount || Number(order.totalAmount)),
          currency: event.currency || order.currency,
          status: PaymentRecordStatus.PENDING,
        },
      });
    }

    // 7. Process based on event type
    if (event.eventType === 'payment.succeeded' || event.eventType === 'payment.captured') {
      // Validate currency and amount
      const expectedAmount = Number(order.totalAmount);
      const receivedAmount = event.amount > 0 ? event.amount : expectedAmount;

      if (Math.abs(receivedAmount - expectedAmount) > 0.01) {
        this.logger.error(
          `Payment amount mismatch on order ${order.orderNumber}: expected ${expectedAmount}, received ${receivedAmount}`,
        );
        throw new BadRequestException('Payment amount does not match order total');
      }

      if (event.currency && event.currency !== order.currency) {
        this.logger.error(
          `Payment currency mismatch on order ${order.orderNumber}: expected ${order.currency}, received ${event.currency}`,
        );
        throw new BadRequestException('Payment currency mismatch');
      }

      // Check order state: LATE PAYMENT HANDLING POLICY
      if (order.status === OrderStatus.CANCELLED) {
        this.logger.warn(
          `LATE PAYMENT RECEIVED: Order ${order.orderNumber} was already CANCELLED and stock restored. Flagging payment for safe reconciliation.`,
        );

        await this.prisma.$transaction(async (tx) => {
          await tx.paymentRecord.update({
            where: { id: paymentRecord!.id },
            data: {
              status: PaymentRecordStatus.SUCCEEDED,
              providerPaymentId: event.providerPaymentId || paymentRecord!.providerPaymentId,
              paidAt: new Date(),
              errorMessage:
                'LATE PAYMENT RECONCILIATION NEEDED: Payment succeeded after order was already CANCELLED. Automatic stock restoration was preserved. Customer must be refunded or order manually re-confirmed.',
            },
          });

          await tx.paymentAttempt.create({
            data: {
              paymentRecordId: paymentRecord!.id,
              attemptNumber: 1,
              status: PaymentRecordStatus.SUCCEEDED,
              amount: new Prisma.Decimal(receivedAmount),
              currency: event.currency || order.currency,
              providerReference: event.providerPaymentId,
              rawResponse: event.rawPayload as unknown as Prisma.InputJsonValue,
            },
          });
        });

        return {
          received: true,
          eventId: event.eventId,
          eventType: event.eventType,
          status: 'RECONCILIATION_REQUIRED',
          message: 'Payment received on cancelled order; flagged for reconciliation',
        };
      }

      // Standard active order payment verification
      await this.prisma.$transaction(async (tx) => {
        // Update payment record
        await tx.paymentRecord.update({
          where: { id: paymentRecord!.id },
          data: {
            status: PaymentRecordStatus.SUCCEEDED,
            providerPaymentId: event.providerPaymentId || paymentRecord!.providerPaymentId,
            paidAt: new Date(),
            errorMessage: null,
          },
        });

        // Update / create payment attempt
        await tx.paymentAttempt.create({
          data: {
            paymentRecordId: paymentRecord!.id,
            attemptNumber: 1,
            status: PaymentRecordStatus.SUCCEEDED,
            amount: new Prisma.Decimal(receivedAmount),
            currency: event.currency || order.currency,
            providerReference: event.providerPaymentId,
            rawResponse: event.rawPayload as unknown as Prisma.InputJsonValue,
          },
        });

        // Advance Order payment status to PAID and status to CONFIRMED
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
          },
        });

        // Record status change in history
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.CONFIRMED,
            changedBy: `WEBHOOK:${provider.toUpperCase()}`,
            reason: `Payment of ${receivedAmount} ${order.currency} verified via provider webhook (${event.eventId})`,
          },
        });

        // Record outbox event for payment confirmation
        if (this.outboxService) {
          await this.outboxService.createEvent(
            {
              eventType: DomainEventType.PAYMENT_SUCCEEDED,
              tenantId: order.tenantId,
              payload: {
                paymentId: paymentRecord!.id,
                orderId: order.id,
                orderNumber: order.orderNumber,
                amount: receivedAmount,
                currency: order.currency,
                userId: order.userId,
              },
            },
            tx,
          );
        }
      });

      this.logger.log(
        `Order ${order.orderNumber} successfully marked PAID and CONFIRMED via webhook ${event.eventId}`,
      );

      return {
        received: true,
        eventId: event.eventId,
        eventType: event.eventType,
        status: 'SUCCEEDED',
        message: 'Payment processed and order confirmed',
      };
    } else if (event.eventType === 'payment.failed') {
      await this.prisma.$transaction(async (tx) => {
        await tx.paymentRecord.update({
          where: { id: paymentRecord!.id },
          data: {
            status: PaymentRecordStatus.FAILED,
            errorMessage: event.failureReason || 'Payment failed with provider',
          },
        });

        await tx.paymentAttempt.create({
          data: {
            paymentRecordId: paymentRecord!.id,
            attemptNumber: 1,
            status: PaymentRecordStatus.FAILED,
            amount: new Prisma.Decimal(event.amount || Number(order.totalAmount)),
            currency: event.currency || order.currency,
            failureReason: event.failureReason || 'Payment failure reported by provider',
            rawResponse: event.rawPayload as unknown as Prisma.InputJsonValue,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.FAILED,
          },
        });

        // Record outbox event for payment failure
        if (this.outboxService) {
          await this.outboxService.createEvent(
            {
              eventType: DomainEventType.PAYMENT_FAILED,
              tenantId: order.tenantId,
              payload: {
                paymentId: paymentRecord!.id,
                orderId: order.id,
                orderNumber: order.orderNumber,
                amount: Number(order.totalAmount),
                currency: order.currency,
                userId: order.userId,
                failureReason: event.failureReason || 'Payment failed with provider',
              },
            },
            tx,
          );
        }
      });

      this.logger.log(`Payment failed recorded for order ${order.orderNumber}`);

      return {
        received: true,
        eventId: event.eventId,
        eventType: event.eventType,
        status: 'FAILED',
        message: 'Payment failure recorded',
      };
    } else if (event.eventType === 'payment.cancelled') {
      await this.prisma.paymentRecord.update({
        where: { id: paymentRecord.id },
        data: {
          status: PaymentRecordStatus.CANCELLED,
          errorMessage: 'Checkout session cancelled by customer',
        },
      });

      return {
        received: true,
        eventId: event.eventId,
        eventType: event.eventType,
        status: 'CANCELLED',
      };
    }

    return {
      received: true,
      eventId: event.eventId,
      eventType: event.eventType,
      status: 'IGNORED',
      message: `Event type ${event.eventType} did not trigger a state transition`,
    };
  }

  /**
   * Processes a refund for a previously successful customer payment.
   * Authorized only for store owners, staff, or super admins.
   */
  async refundPayment(
    user: AuthenticatedUser,
    paymentId: string,
    dto: RefundPaymentDto,
  ): Promise<RefundRecordResponse> {
    const payment = await this.prisma.paymentRecord.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
        refunds: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    // Caller must be staff of the store tenant or super admin
    this.assertTenantStaff(user, payment.tenantId);

    if (
      payment.status !== PaymentRecordStatus.SUCCEEDED &&
      payment.status !== PaymentRecordStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        `Cannot refund payment in "${payment.status}" status. Only SUCCEEDED payments can be refunded.`,
      );
    }

    const totalPaid = Number(payment.amount);
    const existingRefunded = payment.refunds
      .filter((r) => r.status === RefundStatus.SUCCEEDED)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const remainingRefundable = totalPaid - existingRefunded;

    if (dto.amount > remainingRefundable + 0.001) {
      throw new BadRequestException(
        `Refund amount (${dto.amount}) exceeds remaining refundable balance (${remainingRefundable.toFixed(2)})`,
      );
    }

    // Call provider refund adapter
    const providerRefund = await this.paymentProvider.processRefund({
      paymentRecordId: payment.id,
      providerPaymentId: payment.providerPaymentId || '',
      amount: dto.amount,
      currency: payment.currency,
      reason: dto.reason,
    });

    // Record refund transactionally
    const newTotalRefunded = existingRefunded + dto.amount;
    const isFullRefund = Math.abs(newTotalRefunded - totalPaid) < 0.01;

    const refund = await this.prisma.$transaction(async (tx) => {
      const refundRecord = await tx.refundRecord.create({
        data: {
          paymentRecordId: payment.id,
          orderId: payment.orderId,
          tenantId: payment.tenantId,
          amount: new Prisma.Decimal(dto.amount),
          currency: payment.currency,
          providerRefundId: providerRefund.providerRefundId,
          reason: dto.reason || null,
          status: RefundStatus.SUCCEEDED,
        },
      });

      await tx.paymentRecord.update({
        where: { id: payment.id },
        data: {
          status: isFullRefund
            ? PaymentRecordStatus.REFUNDED
            : PaymentRecordStatus.PARTIALLY_REFUNDED,
        },
      });

      if (isFullRefund) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
          },
        });
      }

      return refundRecord;
    });

    this.logger.log(
      `Refund processed: payment=${payment.id}, amount=${dto.amount}, providerRef=${providerRefund.providerRefundId}`,
    );

    return {
      id: refund.id,
      amount: Number(refund.amount),
      currency: refund.currency,
      providerRefundId: refund.providerRefundId,
      reason: refund.reason,
      status: refund.status,
      createdAt: refund.createdAt.toISOString(),
    };
  }

  // ===========================================================================
  // Access Control & Mapping Helpers
  // ===========================================================================

  private assertOrderReadAccess(
    user: AuthenticatedUser,
    orderUserId: string,
    orderTenantId: string,
  ): void {
    if (user.platformRole === PlatformRole.SUPER_ADMIN) {
      return;
    }

    if (orderUserId === user.id) {
      return;
    }

    const staffRoles: TenantRole[] = [
      TenantRole.STORE_OWNER,
      TenantRole.STORE_MANAGER,
      TenantRole.STORE_STAFF,
    ];

    const hasStaffRole = user.memberships?.some(
      (m) => m.tenantId === orderTenantId && staffRoles.includes(m.role),
    );

    if (hasStaffRole) {
      return;
    }

    throw new NotFoundException('Payment or order not found');
  }

  private assertTenantStaff(user: AuthenticatedUser, tenantId: string): void {
    if (user.platformRole === PlatformRole.SUPER_ADMIN) {
      return;
    }

    const staffRoles: TenantRole[] = [
      TenantRole.STORE_OWNER,
      TenantRole.STORE_MANAGER,
      TenantRole.STORE_STAFF,
    ];

    const hasStaffRole = user.memberships?.some(
      (m) => m.tenantId === tenantId && staffRoles.includes(m.role),
    );

    if (!hasStaffRole) {
      throw new ForbiddenException(
        'You do not have store administration permissions for this store',
      );
    }
  }

  private mapPaymentRecordToResponse(record: any): PaymentRecordResponse {
    return {
      id: record.id,
      orderId: record.orderId,
      tenantId: record.tenantId,
      userId: record.userId,
      provider: record.provider,
      providerPaymentId: record.providerPaymentId,
      providerOrderId: record.providerOrderId,
      amount: Number(record.amount),
      currency: record.currency,
      status: record.status,
      paymentMethod: record.paymentMethod,
      errorMessage: record.errorMessage,
      paidAt: record.paidAt ? record.paidAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      attempts: record.attempts?.map((a: any) => ({
        id: a.id,
        attemptNumber: a.attemptNumber,
        status: a.status,
        amount: Number(a.amount),
        currency: a.currency,
        providerReference: a.providerReference,
        failureReason: a.failureReason,
        createdAt: a.createdAt.toISOString(),
      })),
      refunds: record.refunds?.map((r: any) => ({
        id: r.id,
        amount: Number(r.amount),
        currency: r.currency,
        providerRefundId: r.providerRefundId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
