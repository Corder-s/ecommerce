import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { generateKeyPair, SignJWT } from 'jose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TokenVerificationService } from '../src/modules/auth/token-verifier.service';
import { IdentityService } from '../src/modules/auth/identity.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  PlatformRole,
  TenantRole,
  OrderStatus,
  PaymentStatus,
  PaymentRecordStatus,
  RefundStatus,
  SubscriptionStatus,
  BillingInterval,
  Prisma,
} from '@prisma/client';

describe('Payment Gateway & SaaS Subscriptions (Step 8 e2e)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let identityService: IdentityService;
  let prismaService: PrismaService;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';
  const PAYMENT_WEBHOOK_SECRET = 'sandbox_payment_webhook_secret';
  const SUBSCRIPTION_WEBHOOK_SECRET = 'sandbox_subscription_webhook_secret';

  const customerId = 'c0000000-0000-4000-8000-000000000001';
  const strangerId = 'c0000000-0000-4000-8000-000000000002';
  const sellerId = 's0000000-0000-4000-8000-000000000001';
  const tenantId = 't0000000-0000-4000-8000-000000000001';

  const testOrderId = 'order-uuid-1111-2222-3333-444444444444';
  const cancelledOrderId = 'order-uuid-cancelled-0000-000000000000';
  const paymentRecordId = 'pay-rec-1111-2222-3333-444444444444';

  let customerToken: string;
  let strangerToken: string;
  let sellerToken: string;

  const mockPlacedOrder = {
    id: testOrderId,
    orderNumber: 'GS-20261022-ORD01',
    userId: customerId,
    tenantId,
    status: OrderStatus.PLACED,
    paymentStatus: PaymentStatus.PENDING,
    totalAmount: new Prisma.Decimal(1150.0),
    currency: 'INR',
    tenant: { id: tenantId, businessName: 'Gaushala Organic Dairy' },
    items: [],
  };

  const mockCancelledOrder = {
    ...mockPlacedOrder,
    id: cancelledOrderId,
    status: OrderStatus.CANCELLED,
    totalAmount: new Prisma.Decimal(500.0),
    cancelReason: 'Customer requested cancellation',
    cancelledAt: new Date(),
  };

  const mockPaymentRecord = {
    id: paymentRecordId,
    orderId: testOrderId,
    tenantId,
    userId: customerId,
    provider: 'sandbox',
    providerPaymentId: 'pay_sbx_test1',
    providerOrderId: 'ord_sbx_test1',
    amount: new Prisma.Decimal(1150.0),
    currency: 'INR',
    status: PaymentRecordStatus.PENDING,
    paymentMethod: 'card',
    errorMessage: null,
    paidAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    attempts: [
      {
        id: 'att-1',
        paymentRecordId,
        attemptNumber: 1,
        providerReference: 'pay_sbx_test1',
        status: PaymentRecordStatus.PENDING,
        amount: new Prisma.Decimal(1150.0),
        currency: 'INR',
        createdAt: new Date(),
      },
    ],
    refunds: [],
  };

  const mockGrowthPlan = {
    id: 'plan-growth',
    name: 'Growth Gaushala',
    slug: 'growth',
    description: 'Growth tier',
    priceMonthly: new Prisma.Decimal(999),
    priceAnnual: new Prisma.Decimal(9990),
    currency: 'INR',
    maxProducts: 250,
    maxStaffMembers: 5,
    customDomainEnabled: true,
    analyticsEnabled: true,
    prioritySupport: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    testKeyPair = await generateKeyPair('RS256');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    tokenVerifierService = moduleFixture.get<TokenVerificationService>(TokenVerificationService);
    tokenVerifierService.setCustomKeyProvider(testKeyPair.publicKey);

    identityService = moduleFixture.get<IdentityService>(IdentityService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    jest.spyOn(identityService, 'resolveUserFromToken').mockImplementation(async (payload) => {
      if (payload.sub === 'sub-customer') {
        return {
          id: customerId,
          name: 'Customer One',
          email: 'customer@example.com',
          platformRole: PlatformRole.USER,
          memberships: [],
        };
      }
      if (payload.sub === 'sub-stranger') {
        return {
          id: strangerId,
          name: 'Stranger User',
          email: 'stranger@example.com',
          platformRole: PlatformRole.USER,
          memberships: [],
        };
      }
      if (payload.sub === 'sub-seller') {
        return {
          id: sellerId,
          name: 'Store Owner',
          email: 'owner@example.com',
          platformRole: PlatformRole.USER,
          memberships: [
            {
              id: 'mem-1',
              tenantId,
              role: TenantRole.STORE_OWNER,
              status: 'ACTIVE' as any,
            },
          ],
        };
      }
      return {
        id: 'anon-id',
        name: 'Anonymous User',
        email: 'anon@example.com',
        platformRole: PlatformRole.USER,
        memberships: [],
      };
    });

    await app.init();

    const generateToken = async (sub: string) => {
      return new SignJWT({ sub })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime('1h')
        .sign(testKeyPair.privateKey);
    };

    customerToken = await generateToken('sub-customer');
    strangerToken = await generateToken('sub-stranger');
    sellerToken = await generateToken('sub-seller');
  });

  afterAll(async () => {
    await app.close();
  });

  const generateSignature = (payload: any, secret: string) => {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
  };

  // ===========================================================================
  // 1. Customer-to-Seller Payment Flow
  // ===========================================================================
  describe('Customer Payments Flow', () => {
    it('POST /api/v1/orders/:orderId/payments - should initiate payment for placed order', async () => {
      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(mockPlacedOrder as any);
      jest.spyOn(prismaService.paymentRecord, 'findFirst').mockResolvedValueOnce(null);

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          paymentRecord: { create: jest.fn().mockResolvedValue({ id: paymentRecordId }) },
          paymentAttempt: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${testOrderId}/payments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethod: 'card' })
        .expect(201);

      expect(res.body).toBeDefined();
      expect(res.body.paymentRecordId).toBe(paymentRecordId);
      expect(res.body.provider).toBe('sandbox');
      expect(res.body.amount).toBe(1150);
      expect(res.body.currency).toBe('INR');
      expect(res.body.status).toBe('PENDING');
    });

    it('POST /api/v1/orders/:orderId/payments - should reject payment attempt by stranger (IDOR protection)', async () => {
      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(mockPlacedOrder as any);

      await request(app.getHttpServer())
        .post(`/api/v1/orders/${testOrderId}/payments`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({})
        .expect(404);
    });

    it('POST /api/v1/orders/:orderId/payments - should reject payment for cancelled order', async () => {
      jest
        .spyOn(prismaService.order, 'findUnique')
        .mockResolvedValueOnce(mockCancelledOrder as any);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${cancelledOrderId}/payments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(400);

      expect(JSON.stringify(res.body)).toContain('Cannot initiate payment for a cancelled order');
    });

    it('GET /api/v1/orders/:orderId/payments - should list payment attempts for order', async () => {
      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(mockPlacedOrder as any);
      jest
        .spyOn(prismaService.paymentRecord, 'findMany')
        .mockResolvedValueOnce([mockPaymentRecord as any]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${testOrderId}/payments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(paymentRecordId);
    });
  });

  // ===========================================================================
  // 2. Customer Payment Webhooks & Verification
  // ===========================================================================
  describe('Customer Payment Webhook Security', () => {
    it('POST /api/v1/webhooks/payments/sandbox - should reject webhook without signature', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/payments/sandbox')
        .send({ eventId: 'evt_1', eventType: 'payment.succeeded' })
        .expect(400);
    });

    it('POST /api/v1/webhooks/payments/sandbox - should reject invalid HMAC signature', async () => {
      const payload = {
        eventId: 'evt_sig_fail',
        eventType: 'payment.succeeded',
        orderId: testOrderId,
      };

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/payments/sandbox')
        .set('x-signature', '0000000000000000000000000000000000000000000000000000000000000000')
        .send(payload)
        .expect(401);
    });

    it('POST /api/v1/webhooks/payments/sandbox - should process valid payment.succeeded webhook and mark order PAID and CONFIRMED', async () => {
      const payload = {
        eventId: `evt_succ_${Date.now()}`,
        eventType: 'payment.succeeded',
        orderId: testOrderId,
        providerPaymentId: `pay_sbx_${Date.now()}`,
        amount: 1150.0,
        currency: 'INR',
      };

      const sig = generateSignature(payload, PAYMENT_WEBHOOK_SECRET);

      jest.spyOn(prismaService.paymentWebhookEvent, 'findUnique').mockResolvedValueOnce(null);
      jest.spyOn(prismaService.paymentWebhookEvent, 'create').mockResolvedValueOnce({} as any);
      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(mockPlacedOrder as any);
      jest
        .spyOn(prismaService.paymentRecord, 'findFirst')
        .mockResolvedValueOnce(mockPaymentRecord as any);

      const updateRecordSpy = jest.fn().mockResolvedValue({});
      const createAttemptSpy = jest.fn().mockResolvedValue({});
      const updateOrderSpy = jest.fn().mockResolvedValue({});
      const createHistorySpy = jest.fn().mockResolvedValue({});

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          paymentRecord: { update: updateRecordSpy },
          paymentAttempt: { create: createAttemptSpy },
          order: { update: updateOrderSpy },
          orderStatusHistory: { create: createHistorySpy },
        };
        return cb(tx);
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/webhooks/payments/sandbox')
        .set('x-signature', sig)
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe('SUCCEEDED');
      expect(updateOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
          }),
        }),
      );
    });

    it('POST /api/v1/webhooks/payments/sandbox - should safely ignore duplicate webhook events (replay attack defense)', async () => {
      const eventId = `evt_dup_${Date.now()}`;
      const payload = {
        eventId,
        eventType: 'payment.succeeded',
        orderId: testOrderId,
        providerPaymentId: 'pay_sbx_dup',
        amount: 1150.0,
        currency: 'INR',
      };

      const sig = generateSignature(payload, PAYMENT_WEBHOOK_SECRET);

      jest.spyOn(prismaService.paymentWebhookEvent, 'findUnique').mockResolvedValueOnce({
        id: 'wh-1',
        eventId,
        processed: true,
      } as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/webhooks/payments/sandbox')
        .set('x-signature', sig)
        .send(payload)
        .expect(200);

      expect(res.body.received).toBe(true);
      expect(res.body.duplicate).toBe(true);
    });

    it('POST /api/v1/webhooks/payments/sandbox - should flag late payment on cancelled order without resurrecting order state', async () => {
      const payload = {
        eventId: `evt_late_${Date.now()}`,
        eventType: 'payment.succeeded',
        orderId: cancelledOrderId,
        providerPaymentId: `pay_sbx_late_${Date.now()}`,
        amount: 500.0,
        currency: 'INR',
      };

      const sig = generateSignature(payload, PAYMENT_WEBHOOK_SECRET);

      jest.spyOn(prismaService.paymentWebhookEvent, 'findUnique').mockResolvedValueOnce(null);
      jest.spyOn(prismaService.paymentWebhookEvent, 'create').mockResolvedValueOnce({} as any);
      jest
        .spyOn(prismaService.order, 'findUnique')
        .mockResolvedValueOnce(mockCancelledOrder as any);
      jest
        .spyOn(prismaService.paymentRecord, 'findFirst')
        .mockResolvedValueOnce(mockPaymentRecord as any);

      const updateRecordSpy = jest.fn().mockResolvedValue({});
      const createAttemptSpy = jest.fn().mockResolvedValue({});

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          paymentRecord: { update: updateRecordSpy },
          paymentAttempt: { create: createAttemptSpy },
        };
        return cb(tx);
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/webhooks/payments/sandbox')
        .set('x-signature', sig)
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe('RECONCILIATION_REQUIRED');
      expect(updateRecordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PaymentRecordStatus.SUCCEEDED,
            errorMessage: expect.stringContaining('LATE PAYMENT RECONCILIATION NEEDED'),
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // 3. Refund Workflow
  // ===========================================================================
  describe('Refund Workflows', () => {
    const succeededPayment = {
      ...mockPaymentRecord,
      status: PaymentRecordStatus.SUCCEEDED,
      refunds: [],
    };

    it('POST /api/v1/payments/:paymentId/refunds - should reject refund from regular customer', async () => {
      jest
        .spyOn(prismaService.paymentRecord, 'findUnique')
        .mockResolvedValueOnce(succeededPayment as any);

      await request(app.getHttpServer())
        .post(`/api/v1/payments/${paymentRecordId}/refunds`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ amount: 150 })
        .expect(403);
    });

    it('POST /api/v1/payments/:paymentId/refunds - should allow store owner to issue partial refund', async () => {
      jest
        .spyOn(prismaService.paymentRecord, 'findUnique')
        .mockResolvedValueOnce(succeededPayment as any);

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          refundRecord: {
            create: jest.fn().mockResolvedValue({
              id: 'ref-1',
              amount: new Prisma.Decimal(250.0),
              currency: 'INR',
              providerRefundId: 'ref_sbx_999',
              reason: 'Customer return for one item',
              status: RefundStatus.SUCCEEDED,
              createdAt: new Date(),
            }),
          },
          paymentRecord: { update: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/payments/${paymentRecordId}/refunds`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          amount: 250,
          reason: 'Customer return for one item',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.amount).toBe(250);
      expect(res.body.status).toBe('SUCCEEDED');
    });
  });

  // ===========================================================================
  // 4. SaaS Subscriptions & Entitlements
  // ===========================================================================
  describe('SaaS Subscriptions Flow', () => {
    it('GET /api/v1/subscriptions/plans - should list active subscription plans', async () => {
      jest.spyOn(prismaService.subscriptionPlan, 'count').mockResolvedValueOnce(3);
      jest
        .spyOn(prismaService.subscriptionPlan, 'findMany')
        .mockResolvedValueOnce([mockGrowthPlan as any]);

      const res = await request(app.getHttpServer()).get('/api/v1/subscriptions/plans').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].slug).toBe('growth');
    });

    it('GET /api/v1/subscriptions/current - should return current store subscription', async () => {
      jest.spyOn(prismaService.subscriptionPlan, 'count').mockResolvedValueOnce(3);
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValueOnce({
        id: 'sub-1',
        tenantId,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: BillingInterval.MONTHLY,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        plan: mockGrowthPlan,
      } as any);

      jest.spyOn(prismaService.product, 'count').mockResolvedValueOnce(15);
      jest.spyOn(prismaService.tenantMembership, 'count').mockResolvedValueOnce(2);

      const res = await request(app.getHttpServer())
        .get('/api/v1/subscriptions/current')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.tenantId).toBe(tenantId);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.plan.slug).toBe('growth');
      expect(res.body.usage.productCount).toBe(15);
    });

    it('POST /api/v1/subscriptions/checkout - should upgrade subscription plan', async () => {
      jest
        .spyOn(prismaService.subscriptionPlan, 'findUnique')
        .mockResolvedValueOnce(mockGrowthPlan as any);
      jest.spyOn(prismaService.subscription, 'upsert').mockResolvedValueOnce({} as any);
      jest
        .spyOn(prismaService.subscription, 'findUnique')
        .mockResolvedValueOnce({ id: 'sub-1' } as any);
      jest.spyOn(prismaService.subscriptionInvoice, 'create').mockResolvedValueOnce({} as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/subscriptions/checkout')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          planSlug: 'growth',
          billingInterval: 'MONTHLY',
        })
        .expect(201);

      expect(res.body.providerSubscriptionId).toBeDefined();
      expect(res.body.plan.slug).toBe('growth');
      expect(res.body.status).toBe('ACTIVE');
    });

    it('GET /api/v1/subscriptions/billing-history - should list past invoices', async () => {
      jest.spyOn(prismaService.subscriptionInvoice, 'findMany').mockResolvedValueOnce([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-TEST-001',
          amount: new Prisma.Decimal(999.0),
          currency: 'INR',
          status: 'PAID',
          billingReason: 'Growth subscription',
          periodStart: new Date(),
          periodEnd: new Date(),
          paidAt: new Date(),
          createdAt: new Date(),
        } as any,
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/subscriptions/billing-history')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].amount).toBe(999);
      expect(res.body[0].status).toBe('PAID');
    });

    it('POST /api/v1/subscriptions/cancel - should cancel subscription at period end', async () => {
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValueOnce({
        id: 'sub-1',
        tenantId,
        status: SubscriptionStatus.ACTIVE,
        providerSubscriptionId: 'sub_sbx_test1',
      } as any);

      jest.spyOn(prismaService.subscription, 'update').mockResolvedValueOnce({
        id: 'sub-1',
        tenantId,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: true,
        cancelledAt: null,
      } as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/subscriptions/cancel')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('x-tenant-id', tenantId)
        .send({ cancelAtPeriodEnd: true })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.cancelAtPeriodEnd).toBe(true);
    });

    it('POST /api/v1/webhooks/subscriptions/sandbox - should verify signed subscription webhook', async () => {
      const payload = {
        eventId: `sub_evt_${Date.now()}`,
        eventType: 'subscription.renewed',
        tenantId,
        providerSubscriptionId: `sub_sbx_${Date.now()}`,
        amount: 999.0,
        currency: 'INR',
      };

      const sig = generateSignature(payload, SUBSCRIPTION_WEBHOOK_SECRET);

      jest.spyOn(prismaService.paymentWebhookEvent, 'findUnique').mockResolvedValueOnce(null);
      jest.spyOn(prismaService.paymentWebhookEvent, 'create').mockResolvedValueOnce({} as any);
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValueOnce({
        id: 'sub-1',
        tenantId,
        plan: mockGrowthPlan,
      } as any);
      jest.spyOn(prismaService.subscription, 'update').mockResolvedValueOnce({} as any);
      jest.spyOn(prismaService.subscriptionInvoice, 'create').mockResolvedValueOnce({} as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/webhooks/subscriptions/sandbox')
        .set('x-signature', sig)
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe('PROCESSED');
    });
  });
});
