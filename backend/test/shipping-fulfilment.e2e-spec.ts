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
  ShipmentStatus,
  Prisma,
} from '@prisma/client';

describe('Shipping, Fulfilment & Order Tracking (Step 9 e2e)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let identityService: IdentityService;
  let prismaService: PrismaService;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';
  const SHIPPING_WEBHOOK_SECRET = 'sandbox_shipping_webhook_secret';

  const customerId = 'c0000000-0000-4000-8000-000000000001';
  const strangerId = 'c0000000-0000-4000-8000-000000000002';
  const sellerId = 's0000000-0000-4000-8000-000000000001';
  const otherSellerId = 's0000000-0000-4000-8000-000000000002';
  const tenantId = 't0000000-0000-4000-8000-000000000001';
  const otherTenantId = 't0000000-0000-4000-8000-000000000002';

  const testOrderId = 'order-uuid-9999-1111-2222-333333333333';
  const cancelledOrderId = 'order-uuid-cancelled-9999-000000000000';
  const shipmentId = 'shipment-uuid-9999-1111-2222-333333333333';
  const trackingNumber = 'GS-TRK-TEST-99999';

  let customerToken: string;
  let strangerToken: string;
  let sellerToken: string;
  let otherSellerToken: string;

  const mockOrder = {
    id: testOrderId,
    orderNumber: 'GS-20261022-ORD99',
    userId: customerId,
    tenantId,
    status: OrderStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PAID,
    subtotal: new Prisma.Decimal(1200.0),
    taxAmount: new Prisma.Decimal(0.0),
    shippingAmount: new Prisma.Decimal(100.0),
    totalAmount: new Prisma.Decimal(1300.0),
    currency: 'INR',
    shippingAddress: {
      fullName: 'Customer One',
      phone: '+919876543210',
      addressLine1: '42 Vedic Marg',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      postalCode: '221001',
      country: 'IN',
    },
    items: [
      {
        id: 'item-1',
        orderId: testOrderId,
        productId: 'prod-1',
        productName: 'Handcrafted Cow Dung Diya (Pack of 12)',
        sku: 'DIYA-12PK',
        unitPrice: new Prisma.Decimal(600.0),
        quantity: 2,
        subtotal: new Prisma.Decimal(1200.0),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    shipments: [],
  };

  const mockShipment = {
    id: shipmentId,
    tenantId,
    orderId: testOrderId,
    provider: 'sandbox',
    trackingNumber,
    status: ShipmentStatus.READY_TO_SHIP,
    packageWeight: new Prisma.Decimal(1.5),
    packageLength: new Prisma.Decimal(25.0),
    packageWidth: new Prisma.Decimal(15.0),
    packageHeight: new Prisma.Decimal(10.0),
    shippingCost: new Prisma.Decimal(85.0),
    currency: 'INR',
    shippedAt: null,
    deliveredAt: null,
    carrierNote: 'Fragile: Terracotta & Cow dung diyas',
    createdAt: new Date(),
    updatedAt: new Date(),
    events: [
      {
        id: 'evt-1',
        tenantId,
        shippingRecordId: shipmentId,
        status: ShipmentStatus.READY_TO_SHIP,
        description: 'Shipment created and ready for courier pickup',
        location: 'Varanasi Artisan Workshop',
        eventTimestamp: new Date(),
        source: 'SELLER_PORTAL',
        createdAt: new Date(),
      },
    ],
    order: {
      ...mockOrder,
      shipments: [],
    },
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
    identityService = moduleFixture.get<IdentityService>(IdentityService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    tokenVerifierService.setCustomKeyProvider(testKeyPair.publicKey);

    jest.spyOn(identityService, 'resolveUserFromToken').mockImplementation(async (payload) => {
      if (payload.sub === 'auth0|customer-1') {
        return {
          id: customerId,
          email: 'customer@example.com',
          name: 'Customer One',
          platformRole: PlatformRole.USER,
          memberships: [],
        };
      }
      if (payload.sub === 'auth0|stranger-2') {
        return {
          id: strangerId,
          email: 'stranger@example.com',
          name: 'Stranger',
          platformRole: PlatformRole.USER,
          memberships: [],
        };
      }
      if (payload.sub === 'auth0|seller-1') {
        return {
          id: sellerId,
          email: 'seller@example.com',
          name: 'Artisan Seller',
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
      if (payload.sub === 'auth0|seller-2') {
        return {
          id: otherSellerId,
          email: 'other_seller@example.com',
          name: 'Other Seller',
          platformRole: PlatformRole.USER,
          memberships: [
            {
              id: 'mem-2',
              tenantId: otherTenantId,
              role: TenantRole.STORE_OWNER,
              status: 'ACTIVE' as any,
            },
          ],
        };
      }
      throw new Error('User not found');
    });

    // Generate test JWT strings
    const signToken = async (sub: string, email: string) => {
      return new SignJWT({ email, sub })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setSubject(sub)
        .setExpirationTime('1h')
        .sign(testKeyPair.privateKey);
    };

    customerToken = await signToken('auth0|customer-1', 'customer@example.com');
    strangerToken = await signToken('auth0|stranger-2', 'stranger@example.com');
    sellerToken = await signToken('auth0|seller-1', 'seller@example.com');
    otherSellerToken = await signToken('auth0|seller-2', 'other_seller@example.com');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.spyOn(prismaService, '$transaction').mockImplementation(async (cb: any) => {
      return cb(prismaService);
    });
  });

  describe('GET /api/v1/shipping/orders/ready', () => {
    it('should return 200 with ready orders for authorized store seller', async () => {
      jest.spyOn(prismaService.order, 'count').mockResolvedValue(1);
      jest.spyOn(prismaService.order, 'findMany').mockResolvedValue([
        {
          ...mockOrder,
          shipments: [],
        } as any,
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/shipping/orders/ready')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.orders[0].orderNumber).toBe('GS-20261022-ORD99');
      expect(res.body.orders[0].itemCount).toBe(2);
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/shipping/orders/ready')
        .set('x-tenant-id', tenantId)
        .expect(401);
    });

    it('should return 403 when seller attempts cross-tenant access to another store orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/shipping/orders/ready')
        .set('Authorization', `Bearer ${otherSellerToken}`)
        .set('x-tenant-id', tenantId)
        .expect(403);

      expect(res.body.error?.message || res.body.message).toContain('Access denied');
    });
  });

  describe('POST /api/v1/orders/:orderId/shipments', () => {
    it('should return 201 and create shipment with valid parameters and tracking number', async () => {
      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prismaService.shippingRecord, 'create').mockResolvedValue(mockShipment as any);
      jest
        .spyOn(prismaService.shipmentEvent, 'create')
        .mockResolvedValue(mockShipment.events[0] as any);
      jest.spyOn(prismaService.order, 'update').mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PROCESSING,
      } as any);
      jest.spyOn(prismaService.orderStatusHistory, 'create').mockResolvedValue({} as any);
      jest.spyOn(prismaService.shippingRecord, 'findUnique').mockResolvedValue(mockShipment as any);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${testOrderId}/shipments`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          packageWeight: 1.5,
          packageLength: 25.0,
          packageWidth: 15.0,
          packageHeight: 10.0,
          shippingCost: 85.0,
          carrierNote: 'Fragile: Terracotta & Cow dung diyas',
        })
        .expect(201);

      expect(res.body.id).toBe(shipmentId);
      expect(res.body.trackingNumber).toBe(trackingNumber);
      expect(res.body.status).toBe('READY_TO_SHIP');
      expect(res.body.packageWeight).toBe(1.5);
    });

    it('should return 400 when package weight is zero or negative', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${testOrderId}/shipments`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          packageWeight: 0,
        })
        .expect(400);
    });

    it('should return 400 when carrier eligibility check fails (air freight of heavy cow dung wood)', async () => {
      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValue({
        ...mockOrder,
        items: [
          {
            id: 'item-2',
            productName: 'Sacred Havan Cow Dung Wood Logs (5kg pack)',
            quantity: 3,
            sku: 'WOOD-5KG',
          },
        ],
      } as any);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${testOrderId}/shipments`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          packageWeight: 15.0,
          carrierCode: 'express_air',
        })
        .expect(400);

      expect(res.body.error?.message || res.body.message).toContain(
        'Carrier acceptance check failed',
      );
    });

    it('should return 400 when attempting to ship a cancelled order', async () => {
      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValue({
        ...mockOrder,
        id: cancelledOrderId,
        status: OrderStatus.CANCELLED,
      } as any);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${cancelledOrderId}/shipments`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          packageWeight: 2.0,
        })
        .expect(400);

      expect(res.body.error?.message || res.body.message).toContain(
        'Cannot create shipment for a cancelled order',
      );
    });
  });

  describe('POST /api/v1/shipments/:shipmentId/dispatch & Status Updates', () => {
    it('should return 200 and dispatch shipment to SHIPPED status, advancing order to SHIPPED', async () => {
      jest
        .spyOn(prismaService.shippingRecord, 'findUnique')
        .mockResolvedValueOnce(mockShipment as any)
        .mockResolvedValueOnce(mockShipment as any)
        .mockResolvedValueOnce({
          ...mockShipment,
          status: ShipmentStatus.SHIPPED,
          shippedAt: new Date(),
        } as any);

      jest.spyOn(prismaService.shippingRecord, 'update').mockResolvedValue({} as any);
      jest.spyOn(prismaService.shipmentEvent, 'create').mockResolvedValue({} as any);
      jest.spyOn(prismaService.order, 'update').mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.inventoryReservation, 'updateMany')
        .mockResolvedValue({ count: 1 } as any);
      jest.spyOn(prismaService.orderStatusHistory, 'create').mockResolvedValue({} as any);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/shipments/${shipmentId}/dispatch`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.status).toBe('SHIPPED');
    });

    it('should return 400 when attempting an invalid backward status transition', async () => {
      jest.spyOn(prismaService.shippingRecord, 'findUnique').mockResolvedValue({
        ...mockShipment,
        status: ShipmentStatus.DELIVERED,
      } as any);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          status: 'READY_TO_SHIP',
        })
        .expect(400);

      expect(res.body.error?.message || res.body.message).toContain('Invalid status transition');
    });
  });

  describe('GET /api/v1/customers/me/orders/:orderId/tracking (IDOR Protection)', () => {
    it('should return 200 with sanitized milestone tracking info for customer who owns the order', async () => {
      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValue({
        ...mockOrder,
        shipments: [mockShipment],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/customers/me/orders/${testOrderId}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.orderId).toBe(testOrderId);
      expect(res.body.orderNumber).toBe('GS-20261022-ORD99');
      expect(res.body.shipments).toHaveLength(1);
      expect(res.body.shipments[0].trackingNumber).toBe(trackingNumber);
      expect(res.body.shipments[0].events).toHaveLength(1);
      // Verify internal costs and notes are NOT leaked to the customer
      expect(res.body.shipments[0].shippingCost).toBeUndefined();
      expect(res.body.shipments[0].carrierNote).toBeUndefined();
    });

    it('should return 404 when another stranger attempts to track an order they do not own (IDOR rejection)', async () => {
      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValue({
        ...mockOrder,
        shipments: [mockShipment],
      } as any);

      await request(app.getHttpServer())
        .get(`/api/v1/customers/me/orders/${testOrderId}/tracking`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/webhooks/shipping/:provider (Carrier Webhooks & Security)', () => {
    it('should return 401 when webhook is missing signature or has an invalid signature', async () => {
      const payload = {
        trackingNumber,
        status: 'DELIVERED',
        description: 'Package handed over to customer',
      };

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/shipping/sandbox')
        .set('x-signature', 'invalid-hmac-hash')
        .send(payload)
        .expect(401);
    });

    it('should return 200 and process verified carrier webhook with valid HMAC signature', async () => {
      const payload = {
        eventId: 'evt-carrier-1234',
        trackingNumber,
        status: 'DELIVERED',
        description: 'Package delivered at Varanasi doorstep',
        timestamp: new Date().toISOString(),
      };
      const rawPayload = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', SHIPPING_WEBHOOK_SECRET)
        .update(rawPayload)
        .digest('hex');

      jest.spyOn(prismaService.shippingRecord, 'findFirst').mockResolvedValue({
        ...mockShipment,
        status: ShipmentStatus.OUT_FOR_DELIVERY,
      } as any);
      jest.spyOn(prismaService.shipmentEvent, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.shipmentEvent, 'create').mockResolvedValue({} as any);
      jest.spyOn(prismaService.shippingRecord, 'update').mockResolvedValue({} as any);
      jest.spyOn(prismaService.order, 'update').mockResolvedValue({} as any);
      jest.spyOn(prismaService.orderStatusHistory, 'create').mockResolvedValue({} as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/webhooks/shipping/sandbox')
        .set('x-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(res.body.processed).toBe(true);
    });

    it('should idempotently handle duplicate webhook events without duplicate history creation', async () => {
      const payload = {
        eventId: 'evt-carrier-duplicate',
        trackingNumber,
        status: 'IN_TRANSIT',
        description: 'Sorting completed at hub',
        timestamp: '2026-10-22T12:00:00.000Z',
      };
      const rawPayload = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', SHIPPING_WEBHOOK_SECRET)
        .update(rawPayload)
        .digest('hex');

      jest.spyOn(prismaService.shippingRecord, 'findFirst').mockResolvedValue(mockShipment as any);
      jest.spyOn(prismaService.shipmentEvent, 'findFirst').mockResolvedValue({
        id: 'existing-event-id',
      } as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/webhooks/shipping/sandbox')
        .set('x-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(res.body.deduplicated).toBe(true);
    });
  });
});
