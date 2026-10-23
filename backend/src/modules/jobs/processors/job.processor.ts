import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EMAIL_PROVIDER, IEmailProvider } from '../../../integrations/email-provider';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SendEmailJobPayload, CreateNotificationJobPayload } from '../interfaces/job.interface';
import { OutboxEventEntity, DomainEventType } from '../../outbox/interfaces/outbox.interface';
import { NotificationType } from '@prisma/client';

@Injectable()
export class JobProcessor {
  private readonly logger = new Logger(JobProcessor.name);

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: IEmailProvider,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Processes an email delivery job.
   */
  async processSendEmailJob(payload: SendEmailJobPayload): Promise<void> {
    this.logger.log(`Executing email job to ${payload.to} with subject "${payload.subject}"`);
    try {
      const result = await this.emailProvider.sendEmail({
        to: payload.to,
        recipientName: payload.recipientName,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        metadata: payload.metadata,
        idempotencyKey: payload.idempotencyKey,
      });

      if (!result.success) {
        throw new Error(result.error || 'Email delivery failed');
      }

      this.logger.log(`Email job succeeded: messageId ${result.messageId}`);
    } catch (error) {
      this.logger.error(
        `Email job failed for ${payload.to}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Processes an in-app notification creation job.
   */
  async processNotificationJob(payload: CreateNotificationJobPayload): Promise<void> {
    this.logger.log(
      `Executing in-app notification job for user ${payload.recipientUserId}: "${payload.title}"`,
    );
    try {
      await this.notificationsService.createNotification(payload);
    } catch (error) {
      this.logger.error(
        `Notification job failed for user ${payload.recipientUserId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Processes transactional outbox domain events and translates them into appropriate
   * customer/seller emails and in-app notifications.
   */
  async processDomainEvent(event: OutboxEventEntity): Promise<void> {
    this.logger.log(`Processing domain event: ${event.eventType} (Event ID: ${event.id})`);

    const payload = event.payload;

    switch (event.eventType) {
      case DomainEventType.ORDER_CREATED:
        await this.handleOrderCreated(payload, event.tenantId);
        break;

      case DomainEventType.ORDER_CANCELLED:
        await this.handleOrderCancelled(payload, event.tenantId);
        break;

      case DomainEventType.PAYMENT_SUCCEEDED:
        await this.handlePaymentSucceeded(payload, event.tenantId);
        break;

      case DomainEventType.PAYMENT_FAILED:
        await this.handlePaymentFailed(payload, event.tenantId);
        break;

      case DomainEventType.SHIPMENT_DISPATCHED:
        await this.handleShipmentDispatched(payload, event.tenantId);
        break;

      case DomainEventType.SHIPMENT_DELIVERED:
        await this.handleShipmentDelivered(payload, event.tenantId);
        break;

      case DomainEventType.SUBSCRIPTION_ACTIVATED:
        await this.handleSubscriptionActivated(payload, event.tenantId);
        break;

      case DomainEventType.SUBSCRIPTION_STATUS_CHANGED:
        await this.handleSubscriptionStatusChanged(payload, event.tenantId);
        break;

      default:
        this.logger.warn(`Unrecognized domain event type: ${event.eventType}. Skipping.`);
        break;
    }
  }

  // ================= Private Event Handlers =================

  private async resolveCustomerUser(
    payload: Record<string, unknown>,
  ): Promise<{ id: string; email: string; name: string } | null> {
    const userId = (payload.userId || payload.customerId) as string | undefined;
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        return { id: user.id, email: user.email, name: user.name };
      }
    }

    const orderId = payload.orderId as string | undefined;
    if (orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true },
      });
      if (order?.user) {
        return { id: order.user.id, email: order.user.email, name: order.user.name };
      }
    }

    return null;
  }

  private async handleOrderCreated(
    payload: Record<string, unknown>,
    tenantId: string | null,
  ): Promise<void> {
    const orderNumber = (payload.orderNumber as string) || 'N/A';
    const totalAmount = payload.totalAmount ? Number(payload.totalAmount) : 0;
    const currency = (payload.currency as string) || 'INR';

    // 1. Resolve Customer User & Email
    const customerUser = await this.resolveCustomerUser(payload);

    if (customerUser) {
      // Send Order Confirmation Email
      await this.processSendEmailJob({
        to: customerUser.email,
        recipientName: customerUser.name,
        subject: `Order Confirmed: #${orderNumber}`,
        text: `Hello ${customerUser.name},\n\nYour order #${orderNumber} for ${currency} ${totalAmount.toFixed(2)} has been placed successfully!\n\nThank you for shopping with us.`,
        html: `<h2>Order Confirmed: #${orderNumber}</h2><p>Your order for <strong>${currency} ${totalAmount.toFixed(2)}</strong> has been placed successfully!</p>`,
        idempotencyKey: `email_order_${orderNumber}_created`,
      });

      // In-app notification to customer
      await this.processNotificationJob({
        recipientUserId: customerUser.id,
        tenantId,
        type: NotificationType.ORDER_CREATED,
        title: `Order #${orderNumber} Confirmed`,
        message: `Your order for ${currency} ${totalAmount.toFixed(2)} has been placed successfully.`,
        data: { orderId: payload.orderId, orderNumber },
        idempotencyKey: `notif_customer_order_${orderNumber}`,
      });
    }

    // 2. Resolve Store Owner (Seller) for Tenant
    if (tenantId) {
      const storeOwnerMembership = await this.prisma.tenantMembership.findFirst({
        where: { tenantId, role: 'STORE_OWNER' },
        include: { user: true },
      });

      if (storeOwnerMembership?.user) {
        await this.processNotificationJob({
          recipientUserId: storeOwnerMembership.user.id,
          tenantId,
          type: NotificationType.ORDER_CREATED,
          title: `New Order Received: #${orderNumber}`,
          message: `You received a new order #${orderNumber} totaling ${currency} ${totalAmount.toFixed(2)}.`,
          data: { orderId: payload.orderId, orderNumber, totalAmount, currency },
          idempotencyKey: `notif_seller_order_${orderNumber}`,
        });
      }
    }
  }

  private async handleOrderCancelled(
    payload: Record<string, unknown>,
    tenantId: string | null,
  ): Promise<void> {
    const orderNumber = (payload.orderNumber as string) || 'N/A';
    const reason = (payload.reason as string) || 'Order cancelled by customer';

    const customerUser = await this.resolveCustomerUser(payload);

    if (customerUser) {
      await this.processSendEmailJob({
        to: customerUser.email,
        recipientName: customerUser.name,
        subject: `Order Cancelled: #${orderNumber}`,
        text: `Hello ${customerUser.name},\n\nYour order #${orderNumber} has been cancelled. Reason: ${reason}.`,
        html: `<h2>Order Cancelled: #${orderNumber}</h2><p>Your order has been cancelled.</p><p>Reason: ${reason}</p>`,
        idempotencyKey: `email_order_${orderNumber}_cancelled`,
      });

      await this.processNotificationJob({
        recipientUserId: customerUser.id,
        tenantId,
        type: NotificationType.ORDER_CANCELLED,
        title: `Order #${orderNumber} Cancelled`,
        message: `Your order #${orderNumber} was cancelled. Reason: ${reason}.`,
        data: { orderId: payload.orderId, orderNumber, reason },
        idempotencyKey: `notif_customer_cancel_${orderNumber}`,
      });
    }

    if (tenantId) {
      const storeOwner = await this.prisma.tenantMembership.findFirst({
        where: { tenantId, role: 'STORE_OWNER' },
        include: { user: true },
      });

      if (storeOwner?.user) {
        await this.processNotificationJob({
          recipientUserId: storeOwner.user.id,
          tenantId,
          type: NotificationType.ORDER_CANCELLED,
          title: `Order #${orderNumber} Cancelled`,
          message: `Order #${orderNumber} was cancelled. Reason: ${reason}.`,
          data: { orderId: payload.orderId, orderNumber, reason },
          idempotencyKey: `notif_seller_cancel_${orderNumber}`,
        });
      }
    }
  }

  private async handlePaymentSucceeded(
    payload: Record<string, unknown>,
    tenantId: string | null,
  ): Promise<void> {
    const orderNumber = (payload.orderNumber as string) || 'N/A';
    const amount = payload.amount ? Number(payload.amount) : 0;
    const currency = (payload.currency as string) || 'INR';

    const customerUser = await this.resolveCustomerUser(payload);

    if (customerUser) {
      await this.processSendEmailJob({
        to: customerUser.email,
        recipientName: customerUser.name,
        subject: `Payment Successful: #${orderNumber}`,
        text: `Your payment of ${currency} ${amount.toFixed(2)} for order #${orderNumber} was received successfully.`,
        html: `<h2>Payment Confirmed</h2><p>Your payment of <strong>${currency} ${amount.toFixed(2)}</strong> for order #${orderNumber} was received.</p>`,
        idempotencyKey: `email_payment_${payload.paymentId || orderNumber}_succeeded`,
      });

      await this.processNotificationJob({
        recipientUserId: customerUser.id,
        tenantId,
        type: NotificationType.PAYMENT_SUCCEEDED,
        title: `Payment Confirmed: #${orderNumber}`,
        message: `Payment of ${currency} ${amount.toFixed(2)} verified successfully.`,
        data: { orderId: payload.orderId, paymentId: payload.paymentId },
        idempotencyKey: `notif_payment_conf_${payload.paymentId || orderNumber}`,
      });
    }
  }

  private async handlePaymentFailed(
    payload: Record<string, unknown>,
    tenantId: string | null,
  ): Promise<void> {
    const orderNumber = (payload.orderNumber as string) || 'N/A';
    const failureReason = (payload.failureReason as string) || 'Transaction failed or was declined';

    const customerUser = await this.resolveCustomerUser(payload);

    if (customerUser) {
      await this.processSendEmailJob({
        to: customerUser.email,
        recipientName: customerUser.name,
        subject: `Payment Failed: #${orderNumber}`,
        text: `Payment attempt for order #${orderNumber} was unsuccessful. Reason: ${failureReason}. Please retry your payment.`,
        html: `<h2>Payment Failed</h2><p>Your payment attempt for order #${orderNumber} failed: ${failureReason}</p>`,
        idempotencyKey: `email_payment_${payload.paymentId || orderNumber}_failed`,
      });

      await this.processNotificationJob({
        recipientUserId: customerUser.id,
        tenantId,
        type: NotificationType.PAYMENT_FAILED,
        title: `Payment Failed: #${orderNumber}`,
        message: `Payment attempt failed: ${failureReason}. Please retry checkout.`,
        data: { orderId: payload.orderId, paymentId: payload.paymentId, failureReason },
        idempotencyKey: `notif_payment_fail_${payload.paymentId || orderNumber}`,
      });
    }
  }

  private async handleShipmentDispatched(
    payload: Record<string, unknown>,
    tenantId: string | null,
  ): Promise<void> {
    const orderNumber = (payload.orderNumber as string) || 'N/A';
    const carrierName = (payload.carrierName as string) || 'Standard Courier';
    const trackingNumber = (payload.trackingNumber as string) || 'N/A';

    const customerUser = await this.resolveCustomerUser(payload);

    if (customerUser) {
      await this.processSendEmailJob({
        to: customerUser.email,
        recipientName: customerUser.name,
        subject: `Order Dispatched: #${orderNumber}`,
        text: `Good news! Your order #${orderNumber} has been dispatched with ${carrierName}. Tracking number: ${trackingNumber}.`,
        html: `<h2>Order Dispatched!</h2><p>Order <strong>#${orderNumber}</strong> has been shipped via ${carrierName}.</p><p>Tracking Number: <strong>${trackingNumber}</strong></p>`,
        idempotencyKey: `email_shipment_${payload.shipmentId || trackingNumber}_dispatched`,
      });

      await this.processNotificationJob({
        recipientUserId: customerUser.id,
        tenantId,
        type: NotificationType.SHIPMENT_DISPATCHED,
        title: `Order #${orderNumber} Dispatched`,
        message: `Your package has shipped via ${carrierName}. Tracking: ${trackingNumber}`,
        data: {
          shipmentId: payload.shipmentId,
          orderId: payload.orderId,
          trackingNumber,
          carrierName,
        },
        idempotencyKey: `notif_shipment_disp_${payload.shipmentId || trackingNumber}`,
      });
    }
  }

  private async handleShipmentDelivered(
    payload: Record<string, unknown>,
    tenantId: string | null,
  ): Promise<void> {
    const orderNumber = (payload.orderNumber as string) || 'N/A';

    const customerUser = await this.resolveCustomerUser(payload);

    if (customerUser) {
      await this.processSendEmailJob({
        to: customerUser.email,
        recipientName: customerUser.name,
        subject: `Order Delivered: #${orderNumber}`,
        text: `Your order #${orderNumber} has been delivered. We hope you love your handcrafted purchase!`,
        html: `<h2>Order Delivered!</h2><p>Your order <strong>#${orderNumber}</strong> has been delivered.</p>`,
        idempotencyKey: `email_shipment_${payload.shipmentId || orderNumber}_delivered`,
      });

      await this.processNotificationJob({
        recipientUserId: customerUser.id,
        tenantId,
        type: NotificationType.SHIPMENT_DELIVERED,
        title: `Order #${orderNumber} Delivered`,
        message: `Your package for order #${orderNumber} was marked as delivered.`,
        data: { shipmentId: payload.shipmentId, orderId: payload.orderId },
        idempotencyKey: `notif_shipment_deliv_${payload.shipmentId || orderNumber}`,
      });
    }
  }

  private async handleSubscriptionActivated(
    payload: Record<string, unknown>,
    tenantId: string | null,
  ): Promise<void> {
    const planTier = (payload.planTier as string) || 'PRO';

    if (tenantId) {
      const storeOwner = await this.prisma.tenantMembership.findFirst({
        where: { tenantId, role: 'STORE_OWNER' },
        include: { user: true },
      });

      if (storeOwner?.user) {
        await this.processSendEmailJob({
          to: storeOwner.user.email,
          recipientName: storeOwner.user.name,
          subject: `GauShilp OS Subscription Activated: ${planTier}`,
          text: `Congratulations! Your subscription to the ${planTier} plan is now active.`,
          html: `<h2>Subscription Active</h2><p>Your store subscription to plan <strong>${planTier}</strong> has been activated.</p>`,
          idempotencyKey: `email_sub_${payload.subscriptionId}_activated`,
        });

        await this.processNotificationJob({
          recipientUserId: storeOwner.user.id,
          tenantId,
          type: NotificationType.SUBSCRIPTION_ACTIVATED,
          title: `Subscription Activated: ${planTier}`,
          message: `Your GauShilp OS ${planTier} plan is now active. Enjoy premium features!`,
          data: { subscriptionId: payload.subscriptionId, planTier },
          idempotencyKey: `notif_sub_${payload.subscriptionId}_activated`,
        });
      }
    }
  }

  private async handleSubscriptionStatusChanged(
    payload: Record<string, unknown>,
    tenantId: string | null,
  ): Promise<void> {
    const status = (payload.status as string) || 'UNKNOWN';

    if (tenantId) {
      const storeOwner = await this.prisma.tenantMembership.findFirst({
        where: { tenantId, role: 'STORE_OWNER' },
        include: { user: true },
      });

      if (storeOwner?.user) {
        await this.processSendEmailJob({
          to: storeOwner.user.email,
          recipientName: storeOwner.user.name,
          subject: `Subscription Status Update: ${status}`,
          text: `Your GauShilp OS store subscription status has changed to: ${status}.`,
          html: `<h2>Subscription Status Update</h2><p>Your subscription status has changed to <strong>${status}</strong>.</p>`,
          idempotencyKey: `email_sub_${payload.subscriptionId}_status_${status}`,
        });

        await this.processNotificationJob({
          recipientUserId: storeOwner.user.id,
          tenantId,
          type: NotificationType.SUBSCRIPTION_STATUS_CHANGED,
          title: `Subscription Status: ${status}`,
          message: `Your subscription status was updated to ${status}.`,
          data: { subscriptionId: payload.subscriptionId, status },
          idempotencyKey: `notif_sub_${payload.subscriptionId}_status_${status}`,
        });
      }
    }
  }
}
