import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus, BillingInterval, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import {
  SUBSCRIPTION_PROVIDER_TOKEN,
  ISubscriptionProvider,
} from '../../integrations/subscription-provider';
import { EntitlementsService } from './entitlements.service';
import { OutboxService } from '../outbox/outbox.service';
import { DomainEventType } from '../outbox/interfaces/outbox.interface';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import {
  PlanResponse,
  CurrentSubscriptionResponse,
  SubscriptionInvoiceResponse,
  CheckoutSubscriptionResponse,
} from './dto/subscription-response.dto';

import { CACHE_SERVICE, ICacheService, CacheKeys, CacheTTL } from '../../common/cache';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly entitlementsService: EntitlementsService,
    @Inject(SUBSCRIPTION_PROVIDER_TOKEN)
    private readonly subscriptionProvider: ISubscriptionProvider,
    @Optional() private readonly outboxService?: OutboxService,
    @Optional() @Inject(CACHE_SERVICE) private readonly cacheService?: ICacheService,
  ) {}

  /**
   * Lists all available SaaS subscription plans.
   */
  async listPlans(): Promise<PlanResponse[]> {
    const cacheKey = CacheKeys.platformPlans();
    const cached = await this.cacheService?.get<PlanResponse[]>(cacheKey);
    if (cached) {
      return cached;
    }

    await this.entitlementsService.ensureDefaultPlansExist();

    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });

    const result = plans.map((p) => this.mapPlanToResponse(p));
    await this.cacheService?.set(cacheKey, result, CacheTTL.PLANS);
    return result;
  }

  /**
   * Retrieves current subscription details and usage limits for a tenant.
   */
  async getCurrentSubscription(tenantId: string): Promise<CurrentSubscriptionResponse> {
    await this.entitlementsService.ensureDefaultPlansExist();

    let subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    // If tenant does not have a subscription row, initialize with Starter plan
    if (!subscription) {
      const starterPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { slug: 'starter' },
      });

      const now = new Date();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(now.getFullYear() + 1);

      subscription = await this.prisma.subscription.create({
        data: {
          tenantId,
          planId: starterPlan!.id,
          status: SubscriptionStatus.ACTIVE,
          billingInterval: BillingInterval.MONTHLY,
          currentPeriodStart: now,
          currentPeriodEnd: oneYearLater,
        },
        include: { plan: true },
      });
    }

    const [productCount, staffCount] = await Promise.all([
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.tenantMembership.count({ where: { tenantId } }),
    ]);

    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      status: subscription.status,
      billingInterval: subscription.billingInterval,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      cancelledAt: subscription.cancelledAt ? subscription.cancelledAt.toISOString() : null,
      plan: this.mapPlanToResponse(subscription.plan),
      usage: {
        productCount,
        maxProducts: subscription.plan.maxProducts,
        staffCount,
        maxStaffMembers: subscription.plan.maxStaffMembers,
      },
    };
  }

  /**
   * Initiates a SaaS subscription checkout/upgrade session.
   */
  async createSubscriptionCheckout(
    tenantId: string,
    user: AuthenticatedUser,
    dto: CreateSubscriptionCheckoutDto,
  ): Promise<CheckoutSubscriptionResponse> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { slug: dto.planSlug },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException(`Subscription plan "${dto.planSlug}" not found`);
    }

    const isAnnual = dto.billingInterval === BillingInterval.ANNUAL;
    const amount = Number(isAnnual ? plan.priceAnnual : plan.priceMonthly);

    // Call provider integration
    const session = await this.subscriptionProvider.createSubscriptionSession({
      tenantId,
      planId: plan.id,
      planSlug: plan.slug,
      interval: dto.billingInterval,
      amount,
      currency: plan.currency,
      customerEmail: user.email || undefined,
    });

    // Record or update subscription record
    const now = new Date();
    const periodEnd = new Date(now);
    if (isAnnual) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId: plan.id,
        billingInterval: dto.billingInterval,
        status: SubscriptionStatus.ACTIVE,
        providerSubscriptionId: session.providerSubscriptionId,
        providerCustomerId: session.providerCustomerId || null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
      create: {
        tenantId,
        planId: plan.id,
        billingInterval: dto.billingInterval,
        status: SubscriptionStatus.ACTIVE,
        providerSubscriptionId: session.providerSubscriptionId,
        providerCustomerId: session.providerCustomerId || null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    // Record initial billing invoice if paid
    if (amount > 0) {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });

      await this.prisma.subscriptionInvoice.create({
        data: {
          subscriptionId: sub!.id,
          tenantId,
          invoiceNumber,
          amount: new Prisma.Decimal(amount),
          currency: plan.currency,
          status: 'PAID',
          billingReason: `Subscription to ${plan.name} (${dto.billingInterval})`,
          periodStart: now,
          periodEnd,
          paidAt: now,
          providerInvoiceId: session.providerSubscriptionId,
        },
      });
    }

    this.logger.log(
      `Tenant ${tenantId} subscribed to ${plan.name} (${dto.billingInterval}) via session ${session.providerSubscriptionId}`,
    );

    return {
      provider: session.provider,
      providerSubscriptionId: session.providerSubscriptionId,
      checkoutUrl: session.checkoutUrl,
      status: session.status,
      plan: this.mapPlanToResponse(plan),
      billingInterval: dto.billingInterval,
    };
  }

  /**
   * Cancels a store's subscription.
   */
  async cancelSubscription(tenantId: string, dto: CancelSubscriptionDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    if (subscription.providerSubscriptionId) {
      await this.subscriptionProvider.cancelSubscription(
        subscription.providerSubscriptionId,
        dto.cancelAtPeriodEnd ?? true,
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        cancelAtPeriodEnd: dto.cancelAtPeriodEnd ?? true,
        ...(dto.cancelAtPeriodEnd === false
          ? {
              status: SubscriptionStatus.CANCELLED,
              cancelledAt: new Date(),
            }
          : {}),
      },
      include: { plan: true },
    });

    this.logger.log(
      `Subscription cancelled for tenant ${tenantId} (immediate: ${!dto.cancelAtPeriodEnd})`,
    );

    return {
      success: true,
      tenantId: updated.tenantId,
      status: updated.status,
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      cancelledAt: updated.cancelledAt,
    };
  }

  /**
   * Lists past billing invoices for a tenant.
   */
  async getBillingHistory(tenantId: string): Promise<SubscriptionInvoiceResponse[]> {
    const invoices = await this.prisma.subscriptionInvoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.amount),
      currency: inv.currency,
      status: inv.status,
      billingReason: inv.billingReason,
      periodStart: inv.periodStart.toISOString(),
      periodEnd: inv.periodEnd.toISOString(),
      paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
      createdAt: inv.createdAt.toISOString(),
    }));
  }

  /**
   * Processes verified SaaS billing webhooks.
   */
  async handleSubscriptionWebhook(
    provider: string,
    rawBody: Record<string, unknown>,
    signature: string,
    headers: Record<string, string | string[]>,
  ) {
    const webhookSecret =
      this.configService.get<string>('subscriptions.webhookSecret') ||
      'sandbox_subscription_webhook_secret';

    // 1. Verify cryptographic signature
    const isValid = this.subscriptionProvider.verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret,
    );

    if (!isValid) {
      this.logger.warn(`Rejected subscription webhook from "${provider}": Invalid signature`);
      throw new UnauthorizedException('Invalid subscription webhook signature');
    }

    // 2. Parse event payload
    const event = this.subscriptionProvider.parseWebhookEvent(rawBody, headers);

    // 3. Replay Protection
    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider,
          eventId: event.eventId,
        },
      },
    });

    if (existing) {
      this.logger.log(`Duplicate subscription webhook ignored: ${event.eventId}`);
      return { received: true, duplicate: true, eventId: event.eventId };
    }

    // 4. Save webhook audit record
    await this.prisma.paymentWebhookEvent.create({
      data: {
        provider,
        eventId: event.eventId,
        eventType: event.eventType,
        payload: rawBody as unknown as Prisma.InputJsonValue,
        processed: true,
      },
    });

    // 5. Look up subscription
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId: event.tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      this.logger.warn(`Subscription webhook event for unknown tenant ${event.tenantId}`);
      return { received: true, eventId: event.eventId, message: 'Tenant not found' };
    }

    // 6. State transitions based on webhook event
    if (
      event.eventType === 'subscription.renewed' ||
      event.eventType === 'subscription.activated'
    ) {
      const now = new Date();
      const periodEnd = event.periodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await this.prisma.subscription.update({
        where: { tenantId: event.tenantId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: event.periodStart || now,
          currentPeriodEnd: periodEnd,
        },
      });

      if (event.amount && event.amount > 0) {
        const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        await this.prisma.subscriptionInvoice.create({
          data: {
            subscriptionId: subscription.id,
            tenantId: event.tenantId,
            invoiceNumber,
            amount: new Prisma.Decimal(event.amount),
            currency: event.currency || 'INR',
            status: 'PAID',
            billingReason: `Subscription renewal: ${subscription.plan.name}`,
            periodStart: event.periodStart || now,
            periodEnd,
            paidAt: now,
            providerInvoiceId: event.providerSubscriptionId,
          },
        });
      }

      if (this.outboxService) {
        await this.outboxService.createEvent({
          eventType:
            event.eventType === 'subscription.activated'
              ? DomainEventType.SUBSCRIPTION_ACTIVATED
              : DomainEventType.SUBSCRIPTION_STATUS_CHANGED,
          tenantId: event.tenantId,
          payload: {
            subscriptionId: subscription.id,
            planTier: subscription.plan.slug,
            status: SubscriptionStatus.ACTIVE,
          },
        });
      }
    } else if (event.eventType === 'subscription.payment_failed') {
      await this.prisma.subscription.update({
        where: { tenantId: event.tenantId },
        data: {
          status: SubscriptionStatus.PAST_DUE,
        },
      });
      this.logger.warn(`Subscription marked PAST_DUE for tenant ${event.tenantId}`);

      if (this.outboxService) {
        await this.outboxService.createEvent({
          eventType: DomainEventType.SUBSCRIPTION_STATUS_CHANGED,
          tenantId: event.tenantId,
          payload: {
            subscriptionId: subscription.id,
            status: SubscriptionStatus.PAST_DUE,
            previousStatus: subscription.status,
          },
        });
      }
    } else if (event.eventType === 'subscription.cancelled') {
      await this.prisma.subscription.update({
        where: { tenantId: event.tenantId },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      if (this.outboxService) {
        await this.outboxService.createEvent({
          eventType: DomainEventType.SUBSCRIPTION_STATUS_CHANGED,
          tenantId: event.tenantId,
          payload: {
            subscriptionId: subscription.id,
            status: SubscriptionStatus.CANCELLED,
            previousStatus: subscription.status,
          },
        });
      }
    } else if (event.eventType === 'subscription.expired') {
      await this.prisma.subscription.update({
        where: { tenantId: event.tenantId },
        data: {
          status: SubscriptionStatus.EXPIRED,
        },
      });

      if (this.outboxService) {
        await this.outboxService.createEvent({
          eventType: DomainEventType.SUBSCRIPTION_STATUS_CHANGED,
          tenantId: event.tenantId,
          payload: {
            subscriptionId: subscription.id,
            status: SubscriptionStatus.EXPIRED,
            previousStatus: subscription.status,
          },
        });
      }
    }

    return {
      received: true,
      eventId: event.eventId,
      eventType: event.eventType,
      status: 'PROCESSED',
    };
  }

  // ===========================================================================
  // Mapping Helpers
  // ===========================================================================

  private mapPlanToResponse(plan: any): PlanResponse {
    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      priceMonthly: Number(plan.priceMonthly),
      priceAnnual: Number(plan.priceAnnual),
      currency: plan.currency,
      maxProducts: plan.maxProducts,
      maxStaffMembers: plan.maxStaffMembers,
      customDomainEnabled: plan.customDomainEnabled,
      analyticsEnabled: plan.analyticsEnabled,
      prioritySupport: plan.prioritySupport,
    };
  }
}
