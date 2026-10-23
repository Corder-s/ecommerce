import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { generateKeyPair, SignJWT } from 'jose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TokenVerificationService } from '../src/modules/auth/token-verifier.service';
import { IdentityService } from '../src/modules/auth/identity.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  PlatformRole,
  ProductStatus,
  TenantStatus,
  TenantRole,
  OrderStatus,
  PaymentStatus,
  ReservationStatus,
  Prisma,
} from '@prisma/client';

describe('Order Management & Inventory Transactions (e2e)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let identityService: IdentityService;
  let prismaService: PrismaService;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';

  const validAddressId = 'a0000000-0000-4000-8000-000000000002';
  const validProductId = 'a0000000-0000-4000-8000-000000000001';
  const validTenantId = 'tenant-1';

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

    // Mock identity resolution for test users
    jest.spyOn(identityService, 'resolveUserFromToken').mockImplementation(async (payload) => {
      if (payload.sub === 'sub-customer-a') {
        return {
          id: 'customer-a-uuid',
          name: 'Customer A',
          email: 'customer-a@example.com',
          phone: '+919876543210',
          platformRole: PlatformRole.USER,
          memberships: [],
        };
      }
      if (payload.sub === 'sub-customer-b') {
        return {
          id: 'customer-b-uuid',
          name: 'Customer B',
          email: 'customer-b@example.com',
          phone: '+919876543211',
          platformRole: PlatformRole.USER,
          memberships: [],
        };
      }
      if (payload.sub === 'sub-seller-a') {
        return {
          id: 'seller-a-uuid',
          name: 'Seller A',
          email: 'seller-a@example.com',
          platformRole: PlatformRole.USER,
          memberships: [
            {
              id: 'mem-1',
              tenantId: 'tenant-1',
              role: TenantRole.STORE_OWNER,
              status: 'ACTIVE' as any,
            },
          ],
        };
      }
      return {
        id: 'seller-b-uuid',
        name: 'Seller B',
        email: 'seller-b@example.com',
        platformRole: PlatformRole.USER,
        memberships: [
          {
            id: 'mem-2',
            tenantId: 'tenant-2',
            role: TenantRole.STORE_OWNER,
            status: 'ACTIVE' as any,
          },
        ],
      };
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const generateToken = async (sub: string) => {
    return new SignJWT({ sub })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('1h')
      .sign(testKeyPair.privateKey);
  };

  // ===========================================================================
  // 1. Authentication & Access Control
  // ===========================================================================
  describe('Authentication Enforcement', () => {
    it('should reject unauthenticated order creation with 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ addressId: validAddressId })
        .expect(401);
    });

    it('should reject unauthenticated order listing with 401', () => {
      return request(app.getHttpServer()).get('/api/v1/orders').expect(401);
    });

    it('should reject unauthenticated order retrieval with 401', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders/a0000000-0000-4000-8000-000000000001')
        .expect(401);
    });
  });

  // ===========================================================================
  // 2. Order Creation & Atomic Inventory Reservation
  // ===========================================================================
  describe('Order Creation & Inventory Transactions', () => {
    const mockProduct = {
      id: validProductId,
      tenantId: validTenantId,
      name: 'Handcrafted Clay Diya',
      sku: 'DIY-01',
      price: new Prisma.Decimal(150),
      currency: 'INR',
      stock: 10,
      status: ProductStatus.PUBLISHED,
      tenant: {
        id: validTenantId,
        businessName: 'Vedic Pottery',
        storeSlug: 'vedic-pottery',
        isPublished: true,
        status: TenantStatus.ACTIVE,
      },
    };

    const mockCart = {
      id: 'cart-1',
      userId: 'customer-a-uuid',
      items: [
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: validProductId,
          quantity: 2,
          product: mockProduct,
        },
      ],
    };

    const mockSavedAddress = {
      id: validAddressId,
      userId: 'customer-a-uuid',
      fullName: 'Customer A',
      phone: '+919876543210',
      addressLine1: 'Vrindavan Enclave',
      addressLine2: null,
      city: 'Mathura',
      state: 'UP',
      postalCode: '281001',
      country: 'IN',
      landmark: null,
    };

    const orderFixture = {
      id: 'a0000000-0000-4000-8000-000000000010',
      orderNumber: 'GS-20261022-ORD01',
      userId: 'customer-a-uuid',
      tenantId: validTenantId,
      status: OrderStatus.PLACED,
      paymentStatus: PaymentStatus.PENDING,
      currency: 'INR',
      subtotal: new Prisma.Decimal(300),
      taxAmount: new Prisma.Decimal(0),
      shippingAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(300),
      shippingAddress: mockSavedAddress,
      customerNote: null,
      cancelReason: null,
      cancelledAt: null,
      items: [
        {
          id: 'item-ord-1',
          orderId: 'a0000000-0000-4000-8000-000000000010',
          productId: validProductId,
          productName: 'Handcrafted Clay Diya',
          sku: 'DIY-01',
          unitPrice: new Prisma.Decimal(150),
          quantity: 2,
          subtotal: new Prisma.Decimal(300),
          createdAt: new Date(),
        },
      ],
      reservations: [
        {
          id: 'res-1',
          productId: validProductId,
          quantity: 2,
          status: ReservationStatus.RESERVED,
          releasedAt: null,
          createdAt: new Date(),
        },
      ],
      statusHistory: [
        {
          id: 'hist-1',
          fromStatus: null,
          toStatus: OrderStatus.PLACED,
          changedBy: 'customer-a-uuid',
          reason: 'Order placed by customer',
          createdAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create an order, reserve inventory, and clear cart items (201)', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.cart, 'findUnique').mockResolvedValueOnce(mockCart as any);
      jest
        .spyOn(prismaService.customerAddress, 'findFirst')
        .mockResolvedValueOnce(mockSavedAddress as any);

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          order: { create: jest.fn().mockResolvedValue(orderFixture) },
          orderItem: { create: jest.fn().mockResolvedValue({}) },
          inventoryReservation: { create: jest.fn().mockResolvedValue({}) },
          orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
          cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
        };
        return cb(tx);
      });

      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(orderFixture as any);

      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId: validAddressId })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBe('a0000000-0000-4000-8000-000000000010');
          expect(res.body.orderNumber).toBe('GS-20261022-ORD01');
          expect(res.body.status).toBe(OrderStatus.PLACED);
          expect(res.body.paymentStatus).toBe(PaymentStatus.PENDING);
          expect(res.body.totalAmount.amount).toBe(300);
          expect(res.body.totalAmount.minorUnits).toBe(30000);
          expect(res.body.items).toHaveLength(1);
          expect(res.body.items[0].productName).toBe('Handcrafted Clay Diya');
        });
    });

    it('should support idempotent retries with idempotency-key header (no duplicate orders)', async () => {
      const token = await generateToken('sub-customer-a');

      const cachedResponse = {
        id: 'a0000000-0000-4000-8000-000000000010',
        orderNumber: 'GS-20261022-ORD01',
        status: OrderStatus.PLACED,
        totalAmount: { amount: 300, minorUnits: 30000, currency: 'INR', formatted: 'INR 300.00' },
      };

      jest.spyOn(prismaService.idempotencyRecord, 'findUnique').mockResolvedValueOnce({
        id: 'idem-1',
        response: cachedResponse,
        expiresAt: new Date(Date.now() + 100000),
      } as any);

      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('idempotency-key', 'client-retry-key-123')
        .send({ addressId: validAddressId })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBe('a0000000-0000-4000-8000-000000000010');
          expect(res.body.orderNumber).toBe('GS-20261022-ORD01');
        });
    });

    it('should reject order creation if cart is empty (400)', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.cart, 'findUnique').mockResolvedValueOnce({
        id: 'cart-1',
        items: [],
      } as any);

      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId: validAddressId })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.message).toContain('Your shopping cart is empty');
        });
    });

    it('should reject order creation if product has insufficient stock (409 Conflict)', async () => {
      const token = await generateToken('sub-customer-a');

      const outOfStockCart = {
        id: 'cart-1',
        userId: 'customer-a-uuid',
        items: [
          {
            id: 'item-1',
            quantity: 5,
            product: {
              ...mockProduct,
              stock: 2, // Requested 5, only 2 left
            },
          },
        ],
      };

      jest.spyOn(prismaService.cart, 'findUnique').mockResolvedValueOnce(outOfStockCart as any);
      jest
        .spyOn(prismaService.customerAddress, 'findFirst')
        .mockResolvedValueOnce(mockSavedAddress as any);

      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId: validAddressId })
        .expect(409)
        .expect((res) => {
          expect(res.body.error.message).toContain('Insufficient stock');
        });
    });

    it('should handle concurrency safely: reject order if stock is depleted during transaction (409 Conflict)', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.cart, 'findUnique').mockResolvedValueOnce(mockCart as any);
      jest
        .spyOn(prismaService.customerAddress, 'findFirst')
        .mockResolvedValueOnce(mockSavedAddress as any);

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          product: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) }, // Concurrent purchaser took the unit!
        };
        return cb(tx);
      });

      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId: validAddressId })
        .expect(409)
        .expect((res) => {
          expect(res.body.error.message).toContain('Insufficient stock');
        });
    });
  });

  // ===========================================================================
  // 3. Order Lifecycle State Machine & Permissions
  // ===========================================================================
  describe('Order State Machine & Role Security', () => {
    const orderFixture = {
      id: 'a0000000-0000-4000-8000-000000000010',
      orderNumber: 'GS-20261022-ORD01',
      userId: 'customer-a-uuid',
      tenantId: validTenantId,
      status: OrderStatus.PLACED,
      paymentStatus: PaymentStatus.PENDING,
      currency: 'INR',
      subtotal: new Prisma.Decimal(300),
      taxAmount: new Prisma.Decimal(0),
      shippingAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(300),
      shippingAddress: {},
      items: [],
      reservations: [],
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should allow authorized store staff to advance order status (200)', async () => {
      const tokenSellerA = await generateToken('sub-seller-a');

      jest
        .spyOn(prismaService.order, 'findUnique')
        .mockResolvedValueOnce(orderFixture as any)
        .mockResolvedValueOnce({
          ...orderFixture,
          status: OrderStatus.CONFIRMED,
        } as any);

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          order: { update: jest.fn().mockResolvedValue({}) },
          orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      return request(app.getHttpServer())
        .patch('/api/v1/orders/a0000000-0000-4000-8000-000000000010/status')
        .set('Authorization', `Bearer ${tokenSellerA}`)
        .send({
          status: OrderStatus.CONFIRMED,
          reason: 'Order confirmed and ready for packaging',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(OrderStatus.CONFIRMED);
        });
    });

    it('should prevent customers from advancing fulfillment status (403 Forbidden)', async () => {
      const tokenCustomerA = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(orderFixture as any);

      return request(app.getHttpServer())
        .patch('/api/v1/orders/a0000000-0000-4000-8000-000000000010/status')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({ status: OrderStatus.SHIPPED })
        .expect(403);
    });

    it('should reject invalid state transitions (e.g. PLACED -> DELIVERED) (400)', async () => {
      const tokenSellerA = await generateToken('sub-seller-a');

      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(orderFixture as any);

      return request(app.getHttpServer())
        .patch('/api/v1/orders/a0000000-0000-4000-8000-000000000010/status')
        .set('Authorization', `Bearer ${tokenSellerA}`)
        .send({ status: OrderStatus.DELIVERED })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.message).toContain('Invalid status transition');
        });
    });
  });

  // ===========================================================================
  // 4. Cancellation & Inventory Restoration
  // ===========================================================================
  describe('Cancellation & Stock Restoration', () => {
    const cancellableOrder = {
      id: 'a0000000-0000-4000-8000-000000000010',
      orderNumber: 'GS-20261022-ORD01',
      userId: 'customer-a-uuid',
      tenantId: validTenantId,
      status: OrderStatus.PLACED,
      paymentStatus: PaymentStatus.PENDING,
      currency: 'INR',
      subtotal: new Prisma.Decimal(300),
      taxAmount: new Prisma.Decimal(0),
      shippingAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(300),
      shippingAddress: {},
      items: [],
      reservations: [
        {
          id: 'res-1',
          productId: validProductId,
          quantity: 2,
          status: ReservationStatus.RESERVED,
        },
      ],
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should cancel PLACED order, restore stock, and release reservation (200)', async () => {
      const tokenCustomerA = await generateToken('sub-customer-a');

      jest
        .spyOn(prismaService.order, 'findUnique')
        .mockResolvedValueOnce(cancellableOrder as any)
        .mockResolvedValueOnce({
          ...cancellableOrder,
          status: OrderStatus.CANCELLED,
          cancelReason: 'Customer requested cancellation prior to packing',
          cancelledAt: new Date(),
        } as any);

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          inventoryReservation: {
            findMany: jest.fn().mockResolvedValue(cancellableOrder.reservations),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          product: { update: jest.fn().mockResolvedValue({}) },
          order: { update: jest.fn().mockResolvedValue({}) },
          orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      return request(app.getHttpServer())
        .post('/api/v1/orders/a0000000-0000-4000-8000-000000000010/cancel')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({ reason: 'Customer requested cancellation prior to packing' })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(OrderStatus.CANCELLED);
          expect(res.body.cancelReason).toBe('Customer requested cancellation prior to packing');
        });
    });

    it('should prevent Customer B from cancelling Customer A order (404 IDOR)', async () => {
      const tokenCustomerB = await generateToken('sub-customer-b');

      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(cancellableOrder as any);

      return request(app.getHttpServer())
        .post('/api/v1/orders/a0000000-0000-4000-8000-000000000010/cancel')
        .set('Authorization', `Bearer ${tokenCustomerB}`)
        .send({ reason: 'Malicious cancellation attempt' })
        .expect(404);
    });

    it('should reject cancellation of already SHIPPED orders (400)', async () => {
      const tokenCustomerA = await generateToken('sub-customer-a');

      const shippedOrder = {
        ...cancellableOrder,
        status: OrderStatus.SHIPPED,
      };

      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(shippedOrder as any);

      return request(app.getHttpServer())
        .post('/api/v1/orders/a0000000-0000-4000-8000-000000000010/cancel')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({ reason: 'Too late' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.message).toContain('Cannot cancel order with status "SHIPPED"');
        });
    });
  });

  // ===========================================================================
  // 5. Order Retrieval & Tenant Isolation
  // ===========================================================================
  describe('Order Details & Tenant Isolation', () => {
    const orderFixture = {
      id: 'a0000000-0000-4000-8000-000000000010',
      orderNumber: 'GS-20261022-ORD01',
      userId: 'customer-a-uuid',
      tenantId: validTenantId,
      status: OrderStatus.PLACED,
      paymentStatus: PaymentStatus.PENDING,
      currency: 'INR',
      subtotal: new Prisma.Decimal(300),
      taxAmount: new Prisma.Decimal(0),
      shippingAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(300),
      shippingAddress: {},
      items: [],
      reservations: [],
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should allow customer to view own order (200)', async () => {
      const tokenCustomerA = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(orderFixture as any);

      return request(app.getHttpServer())
        .get('/api/v1/orders/a0000000-0000-4000-8000-000000000010')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('a0000000-0000-4000-8000-000000000010');
        });
    });

    it('should prevent Customer B from viewing Customer A order (404 IDOR)', async () => {
      const tokenCustomerB = await generateToken('sub-customer-b');

      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(orderFixture as any);

      return request(app.getHttpServer())
        .get('/api/v1/orders/a0000000-0000-4000-8000-000000000010')
        .set('Authorization', `Bearer ${tokenCustomerB}`)
        .expect(404);
    });

    it('should allow store staff to view order for their store (200)', async () => {
      const tokenSellerA = await generateToken('sub-seller-a');

      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(orderFixture as any);

      return request(app.getHttpServer())
        .get('/api/v1/orders/a0000000-0000-4000-8000-000000000010')
        .set('Authorization', `Bearer ${tokenSellerA}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('a0000000-0000-4000-8000-000000000010');
        });
    });

    it('should prevent store staff from another store from viewing order (404 Tenant Isolation)', async () => {
      const tokenSellerB = await generateToken('sub-seller-b');

      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValueOnce(orderFixture as any);

      return request(app.getHttpServer())
        .get('/api/v1/orders/a0000000-0000-4000-8000-000000000010')
        .set('Authorization', `Bearer ${tokenSellerB}`)
        .expect(404);
    });
  });
});
