/**
 * GauShilp OS — Complete Purchase Workflow Real Integration Test
 *
 * Verification Environment:
 * - Genuine PostgreSQL 18 isolated database (port 5433: gaushilp_test)
 * - Supertest HTTP requests driving the full NestJS application pipeline
 * - Real Prisma transactions, state machines, guards, and DB tables
 * - Clear distinction:
 *     - REAL: Database queries, mutations, foreign keys, row state, inventory reservations,
 *             cart lifecycle, order state machine, shipment lifecycle, and IDOR/tenant isolation guards.
 *     - TEST ADAPTER / SANDBOX:
 *         * Auth tokens: Signed with test RS256 key pair verified via TokenVerificationService.setCustomKeyProvider()
 *         * Payment Gateway: Built-in SandboxPaymentProvider with HMAC-SHA256 webhook signatures
 *         * Shipping Courier: Built-in SandboxShippingProvider
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { generateKeyPair, SignJWT } from 'jose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TokenVerificationService } from '../src/modules/auth/token-verifier.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  PlatformRole,
  TenantRole,
  MembershipStatus,
  TenantStatus,
  OrderStatus,
  PaymentStatus,
  PaymentRecordStatus,
  ReservationStatus,
  ShipmentStatus,
} from '@prisma/client';

describe('GauShilp OS — Complete Purchase Workflow Verification (Real Integration)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let prismaService: PrismaService;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';
  const PAYMENT_WEBHOOK_SECRET = 'sandbox_payment_webhook_secret';

  // Test Entities
  const customerA = {
    id: '11111111-0000-4000-8000-000000000001',
    name: 'Customer Aarav',
    email: 'aarav.customer@gaushilp.test',
    sub: 'sub-customer-aarav',
  };

  const customerB = {
    id: '11111111-0000-4000-8000-000000000002',
    name: 'Stranger Rohan',
    email: 'rohan.stranger@gaushilp.test',
    sub: 'sub-customer-rohan',
  };

  const sellerA = {
    id: '22222222-0000-4000-8000-000000000001',
    name: 'Artisan Radhe',
    email: 'radhe.artisan@gaushilp.test',
    sub: 'sub-seller-radhe',
  };

  const sellerB = {
    id: '22222222-0000-4000-8000-000000000002',
    name: 'Artisan Govind',
    email: 'govind.artisan@gaushilp.test',
    sub: 'sub-seller-govind',
  };

  const tenantA = {
    id: '33333333-0000-4000-8000-000000000001',
    businessName: 'Vedic Cow Dung Craft Store',
    storeSlug: 'vedic-cow-dung-craft',
    status: TenantStatus.ACTIVE,
    isPublished: false, // Initially unpublished
  };

  const tenantB = {
    id: '33333333-0000-4000-8000-000000000002',
    businessName: 'Himalayan Organic Ghee Store',
    storeSlug: 'himalayan-organic-ghee',
    status: TenantStatus.ACTIVE,
    isPublished: true,
  };

  const categoryA = {
    id: '44444444-0000-4000-8000-000000000001',
    tenantId: tenantA.id,
    name: 'Organic Diyas',
    slug: 'organic-diyas',
  };

  let tokenCustomerA: string;
  let tokenCustomerB: string;
  let tokenSellerA: string;
  let tokenSellerB: string;

  let createdProductId: string;
  let createdOrderId: string;
  let createdOrderNumber: string;
  let createdPaymentRecordId: string;
  let createdShipmentId: string;
  let issuedTrackingNumber: string;

  const generateToken = async (sub: string, email: string, name: string) => {
    return new SignJWT({
      sub,
      email,
      name,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('1h')
      .sign(testKeyPair.privateKey);
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

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // -------------------------------------------------------------------------
    // Clean up any old test records in isolated database
    // -------------------------------------------------------------------------
    const testTenantIds = [tenantA.id, tenantB.id];
    const testUserIds = [customerA.id, customerB.id, sellerA.id, sellerB.id];

    await prismaService.shipmentEvent.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prismaService.shippingRecord.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prismaService.paymentWebhookEvent.deleteMany({
      where: { provider: 'sandbox' },
    });
    await prismaService.paymentAttempt.deleteMany({
      where: { paymentRecord: { tenantId: { in: testTenantIds } } },
    });
    await prismaService.paymentRecord.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prismaService.inventoryReservation.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prismaService.orderItem.deleteMany({
      where: { order: { tenantId: { in: testTenantIds } } },
    });
    await prismaService.order.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prismaService.cartItem.deleteMany({
      where: { cart: { userId: { in: testUserIds } } },
    });
    await prismaService.cart.deleteMany({
      where: { userId: { in: testUserIds } },
    });
    await prismaService.product.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prismaService.category.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prismaService.tenantMembership.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prismaService.tenant.deleteMany({
      where: { id: { in: testTenantIds } },
    });
    await prismaService.userIdentity.deleteMany({
      where: { userId: { in: testUserIds } },
    });
    await prismaService.user.deleteMany({
      where: { id: { in: testUserIds } },
    });

    // -------------------------------------------------------------------------
    // Seed real users, identities, tenants, and memberships in genuine PostgreSQL
    // -------------------------------------------------------------------------
    // 1. Users & OIDC Identities
    await prismaService.user.create({
      data: {
        id: customerA.id,
        name: customerA.name,
        email: customerA.email,
        platformRole: PlatformRole.USER,
        identities: {
          create: {
            provider: 'oidc',
            providerSubject: customerA.sub,
            email: customerA.email,
          },
        },
      },
    });

    await prismaService.user.create({
      data: {
        id: customerB.id,
        name: customerB.name,
        email: customerB.email,
        platformRole: PlatformRole.USER,
        identities: {
          create: {
            provider: 'oidc',
            providerSubject: customerB.sub,
            email: customerB.email,
          },
        },
      },
    });

    await prismaService.user.create({
      data: {
        id: sellerA.id,
        name: sellerA.name,
        email: sellerA.email,
        platformRole: PlatformRole.USER,
        identities: {
          create: {
            provider: 'oidc',
            providerSubject: sellerA.sub,
            email: sellerA.email,
          },
        },
      },
    });

    await prismaService.user.create({
      data: {
        id: sellerB.id,
        name: sellerB.name,
        email: sellerB.email,
        platformRole: PlatformRole.USER,
        identities: {
          create: {
            provider: 'oidc',
            providerSubject: sellerB.sub,
            email: sellerB.email,
          },
        },
      },
    });

    // 2. Tenants
    await prismaService.tenant.create({
      data: {
        id: tenantA.id,
        businessName: tenantA.businessName,
        storeSlug: tenantA.storeSlug,
        status: tenantA.status,
        isPublished: tenantA.isPublished,
      },
    });

    await prismaService.tenant.create({
      data: {
        id: tenantB.id,
        businessName: tenantB.businessName,
        storeSlug: tenantB.storeSlug,
        status: tenantB.status,
        isPublished: tenantB.isPublished,
      },
    });

    // 3. Memberships
    await prismaService.tenantMembership.create({
      data: {
        tenantId: tenantA.id,
        userId: sellerA.id,
        role: TenantRole.STORE_OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });

    await prismaService.tenantMembership.create({
      data: {
        tenantId: tenantB.id,
        userId: sellerB.id,
        role: TenantRole.STORE_OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });

    // 4. Category for Tenant A
    await prismaService.category.create({
      data: {
        id: categoryA.id,
        tenantId: tenantA.id,
        name: categoryA.name,
        slug: categoryA.slug,
      },
    });

    // Generate valid RS256 JWT tokens
    tokenCustomerA = await generateToken(customerA.sub, customerA.email, customerA.name);
    tokenCustomerB = await generateToken(customerB.sub, customerB.email, customerB.name);
    tokenSellerA = await generateToken(sellerA.sub, sellerA.email, sellerA.name);
    tokenSellerB = await generateToken(sellerB.sub, sellerB.email, sellerB.name);
  });

  afterAll(async () => {
    await app.close();
  });

  // ===========================================================================
  // Step 1: Authenticate Customer
  // ===========================================================================
  it('Step 1: Should authenticate customer and access private cart via JWT', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${tokenCustomerA}`)
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.items).toEqual([]);
    expect(res.body.itemCount).toBe(0);
  });

  // ===========================================================================
  // Step 2: Create & Publish Seller Store
  // ===========================================================================
  it('Step 2: Should allow seller to publish their store on the platform', async () => {
    // Before publishing, public storefront rejects unpublished store
    await request(app.getHttpServer())
      .get(`/api/v1/public/stores/${tenantA.storeSlug}`)
      .expect(404);

    // Publish store via seller endpoint with tenant context header
    const publishRes = await request(app.getHttpServer())
      .post('/api/v1/stores/current/publish')
      .set('Authorization', `Bearer ${tokenSellerA}`)
      .set('x-tenant-id', tenantA.id)
      .expect(200);

    expect(publishRes.body.store.isPublished).toBe(true);

    // Verify in genuine PostgreSQL DB
    const dbTenant = await prismaService.tenant.findUnique({ where: { id: tenantA.id } });
    expect(dbTenant?.isPublished).toBe(true);
  });

  // ===========================================================================
  // Step 3: Create and Publish a Product
  // ===========================================================================
  it('Step 3: Should allow store seller to create and publish a product with initial stock', async () => {
    const productPayload = {
      name: 'Handcrafted Vedic Cow Dung Diya (Pack of 12)',
      slug: 'handcrafted-vedic-cow-dung-diya-pack-of-12',
      description: 'Handmade organic cow dung diyas for puja and festive lighting',
      price: 250.0,
      currency: 'INR',
      sku: 'DIYA-ECO-12PK',
      stock: 20,
      categoryId: categoryA.id,
      status: 'PUBLISHED',
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${tokenSellerA}`)
      .set('x-tenant-id', tenantA.id)
      .send(productPayload)
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe(productPayload.name);
    expect(Number(res.body.stock)).toBe(20);
    expect(res.body.status).toBe('PUBLISHED');

    createdProductId = res.body.id;

    // Verify record in PostgreSQL database
    const dbProduct = await prismaService.product.findUnique({
      where: { id: createdProductId },
    });
    expect(dbProduct).toBeDefined();
    expect(dbProduct?.stock).toBe(20);
    expect(dbProduct?.tenantId).toBe(tenantA.id);
  });

  // ===========================================================================
  // Step 4: Retrieve Product Through Public API
  // ===========================================================================
  it('Step 4: Should retrieve published product through unauthenticated public storefront API', async () => {
    // 4a. List products in published store
    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/public/stores/${tenantA.storeSlug}/products`)
      .expect(200);

    expect(listRes.body.data).toBeDefined();
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

    const found = listRes.body.data.find((p: any) => p.id === createdProductId);
    expect(found).toBeDefined();
    expect(found.name).toBe('Handcrafted Vedic Cow Dung Diya (Pack of 12)');
    expect(Number(found.price)).toBe(250.0);

    // 4b. Product details by slug
    const detailRes = await request(app.getHttpServer())
      .get(
        `/api/v1/public/stores/${tenantA.storeSlug}/products/handcrafted-vedic-cow-dung-diya-pack-of-12`,
      )
      .expect(200);

    expect(detailRes.body.product.id).toBe(createdProductId);
    expect(detailRes.body.product.stock).toBe(20);
  });

  // ===========================================================================
  // Step 5: Add Product to Cart
  // ===========================================================================
  it('Step 5: Should allow customer to add published product to cart and verify calculated totals', async () => {
    const addRes = await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${tokenCustomerA}`)
      .send({
        productId: createdProductId,
        quantity: 2,
      })
      .expect(201);

    expect(addRes.body).toBeDefined();

    // Verify cart summary
    const cartRes = await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${tokenCustomerA}`)
      .expect(200);

    expect(cartRes.body.itemCount).toBe(2);
    expect(cartRes.body.subtotal.amount).toBe(500.0);
    expect(cartRes.body.items.length).toBe(1);
    expect(cartRes.body.items[0].productId).toBe(createdProductId);
    expect(cartRes.body.items[0].quantity).toBe(2);
  });

  // ===========================================================================
  // Step 6: Validate Checkout & Prices
  // ===========================================================================
  it('Step 6: Should validate checkout, prices, and shipping address', async () => {
    const checkoutValidationDto = {
      shippingAddress: {
        fullName: 'Aarav Sharma',
        phone: '+919876543210',
        addressLine1: 'Plot 42, Vedic Marg, Govardhan Road',
        city: 'Mathura',
        state: 'Uttar Pradesh',
        postalCode: '281001',
        country: 'IN',
      },
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/checkout/validate')
      .set('Authorization', `Bearer ${tokenCustomerA}`)
      .send(checkoutValidationDto)
      .expect(200);

    expect(res.body.checkoutValidationId).toBeDefined();
    expect(res.body.tenantId).toBe(tenantA.id);
    expect(res.body.itemCount).toBe(2);
    expect(res.body.pricing.subtotal.amount).toBe(500.0);
    expect(res.body.items[0].productId).toBe(createdProductId);
    expect(res.body.items[0].unitPrice.amount).toBe(250.0);
  });

  // ===========================================================================
  // Step 7: Create an Order
  // ===========================================================================
  it('Step 7: Should place order from customer cart with atomic transaction', async () => {
    const createOrderDto = {
      shippingAddress: {
        fullName: 'Aarav Sharma',
        phone: '+919876543210',
        addressLine1: 'Plot 42, Vedic Marg, Govardhan Road',
        city: 'Mathura',
        state: 'Uttar Pradesh',
        postalCode: '281001',
        country: 'IN',
      },
      customerNote: 'Please handle with care: Fragile terracotta craft',
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tokenCustomerA}`)
      .send(createOrderDto)
      .expect(201);

    createdOrderId = res.body.id;
    createdOrderNumber = res.body.orderNumber;

    expect(res.body.id).toBeDefined();
    expect(res.body.orderNumber).toMatch(/^GS-\d{8}-[A-Z0-9]+$/);
    expect(res.body.status).toBe(OrderStatus.PLACED);
    expect(res.body.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(res.body.totalAmount.amount).toBe(500.0);
    expect(res.body.tenantId).toBe(tenantA.id);
    expect(res.body.items.length).toBe(1);
  });

  // ===========================================================================
  // Step 8: Verify Inventory Reservation
  // ===========================================================================
  it('Step 8: Should verify atomic inventory reservation in PostgreSQL DB and emptied cart', async () => {
    // 8a. Product stock should have decremented from 20 to 18
    const dbProduct = await prismaService.product.findUnique({
      where: { id: createdProductId },
    });
    expect(dbProduct?.stock).toBe(18);

    // 8b. An ACTIVE InventoryReservation record should exist
    const dbReservation = await prismaService.inventoryReservation.findFirst({
      where: {
        orderId: createdOrderId,
        productId: createdProductId,
        status: ReservationStatus.RESERVED,
      },
    });
    expect(dbReservation).toBeDefined();
    expect(dbReservation?.quantity).toBe(2);
    expect(dbReservation?.tenantId).toBe(tenantA.id);

    // 8c. Customer cart should now be empty
    const cartRes = await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${tokenCustomerA}`)
      .expect(200);

    expect(cartRes.body.itemCount).toBe(0);
    expect(cartRes.body.items).toEqual([]);
  });

  // ===========================================================================
  // Step 9: Process Payment Through Sandbox Test Adapter
  // ===========================================================================
  it('Step 9: Should initiate sandbox payment session and process verified payment webhook', async () => {
    // 9a. Customer initiates payment session
    const payInitRes = await request(app.getHttpServer())
      .post(`/api/v1/orders/${createdOrderId}/payments`)
      .set('Authorization', `Bearer ${tokenCustomerA}`)
      .send({ paymentMethod: 'card' })
      .expect(201);

    expect(payInitRes.body.paymentRecordId).toBeDefined();
    expect(payInitRes.body.provider).toBe('sandbox');
    expect(payInitRes.body.status).toBe('PENDING');
    expect(payInitRes.body.amount).toBe(500.0);

    createdPaymentRecordId = payInitRes.body.paymentRecordId;

    // 9b. Payment provider sends verified HMAC webhook
    const webhookPayload = {
      eventId: 'evt_sbx_purchase_wf_001',
      eventType: 'payment.succeeded',
      data: {
        orderId: createdOrderId,
        paymentRecordId: createdPaymentRecordId,
        providerPaymentId: 'pay_sbx_actual_test_101',
        amount: 500.0,
        currency: 'INR',
        tenantId: tenantA.id,
      },
    };

    const payloadString = JSON.stringify(webhookPayload);
    const signature = crypto
      .createHmac('sha256', PAYMENT_WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    const webhookRes = await request(app.getHttpServer())
      .post('/api/v1/webhooks/payments/sandbox')
      .set('x-signature', signature)
      .send(webhookPayload)
      .expect(200);

    expect(webhookRes.body.received).toBe(true);
    expect(webhookRes.body.duplicate).toBeUndefined();
  });

  // ===========================================================================
  // Step 10: Verify Payment Status & Duplicate-Webhook Handling
  // ===========================================================================
  it('Step 10: Should verify order transition to CONFIRMED/PAID and handle duplicate webhook safely', async () => {
    // 10a. Verify genuine DB status updates
    const dbOrder = await prismaService.order.findUnique({
      where: { id: createdOrderId },
    });
    expect(dbOrder?.status).toBe(OrderStatus.CONFIRMED);
    expect(dbOrder?.paymentStatus).toBe(PaymentStatus.PAID);

    const dbPaymentRecord = await prismaService.paymentRecord.findUnique({
      where: { id: createdPaymentRecordId },
    });
    expect(dbPaymentRecord?.status).toBe(PaymentRecordStatus.SUCCEEDED);
    expect(dbPaymentRecord?.paidAt).toBeDefined();

    // 10b. Duplicate Webhook Replay test
    const duplicatePayload = {
      eventId: 'evt_sbx_purchase_wf_001', // Exact same eventId
      eventType: 'payment.succeeded',
      data: {
        orderId: createdOrderId,
        paymentRecordId: createdPaymentRecordId,
        providerPaymentId: 'pay_sbx_actual_test_101',
        amount: 500.0,
        currency: 'INR',
        tenantId: tenantA.id,
      },
    };

    const payloadString = JSON.stringify(duplicatePayload);
    const signature = crypto
      .createHmac('sha256', PAYMENT_WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    const replayRes = await request(app.getHttpServer())
      .post('/api/v1/webhooks/payments/sandbox')
      .set('x-signature', signature)
      .send(duplicatePayload)
      .expect(200);

    expect(replayRes.body.received).toBe(true);
    expect(replayRes.body.duplicate).toBe(true);
    expect(replayRes.body.message).toContain('already processed');

    // DB status remains CONFIRMED without duplication
    const dbOrderAfterReplay = await prismaService.order.findUnique({
      where: { id: createdOrderId },
    });
    expect(dbOrderAfterReplay?.status).toBe(OrderStatus.CONFIRMED);
  });

  // ===========================================================================
  // Step 11: Create & Update Shipment Information
  // ===========================================================================
  it('Step 11: Should create shipment, dispatch order, and advance shipment status to IN_TRANSIT', async () => {
    // 11a. Seller creates shipment
    const createShipmentDto = {
      packageWeight: 1.5,
      carrierCode: 'surface_cargo',
      carrierNote: 'Fragile terracotta cow dung diyas',
    };

    const shipRes = await request(app.getHttpServer())
      .post(`/api/v1/orders/${createdOrderId}/shipments`)
      .set('Authorization', `Bearer ${tokenSellerA}`)
      .set('x-tenant-id', tenantA.id)
      .send(createShipmentDto)
      .expect(201);

    expect(shipRes.body.id).toBeDefined();
    expect(shipRes.body.trackingNumber).toBeDefined();
    expect(shipRes.body.status).toBe(ShipmentStatus.READY_TO_SHIP);

    createdShipmentId = shipRes.body.id;
    issuedTrackingNumber = shipRes.body.trackingNumber;

    // 11b. Seller dispatches shipment -> updates order to SHIPPED and fulfills reservation
    const dispatchRes = await request(app.getHttpServer())
      .post(`/api/v1/shipments/${createdShipmentId}/dispatch`)
      .set('Authorization', `Bearer ${tokenSellerA}`)
      .set('x-tenant-id', tenantA.id)
      .expect(200);

    expect(dispatchRes.body.status).toBe(ShipmentStatus.SHIPPED);

    // Verify DB: Order is SHIPPED, reservation is FULFILLED
    const dbOrderAfterDispatch = await prismaService.order.findUnique({
      where: { id: createdOrderId },
    });
    expect(dbOrderAfterDispatch?.status).toBe(OrderStatus.SHIPPED);

    const dbReservation = await prismaService.inventoryReservation.findFirst({
      where: { orderId: createdOrderId, productId: createdProductId },
    });
    expect(dbReservation?.status).toBe(ReservationStatus.FULFILLED);

    // 11c. Seller updates shipment to IN_TRANSIT with milestone event
    const transitRes = await request(app.getHttpServer())
      .patch(`/api/v1/shipments/${createdShipmentId}/status`)
      .set('Authorization', `Bearer ${tokenSellerA}`)
      .set('x-tenant-id', tenantA.id)
      .send({
        status: ShipmentStatus.IN_TRANSIT,
        location: 'Varanasi Central Sorting Hub',
        description: 'Package departed Varanasi hub in transit to Mathura delivery center',
      })
      .expect(200);

    expect(transitRes.body.status).toBe(ShipmentStatus.IN_TRANSIT);
  });

  // ===========================================================================
  // Step 12: Retrieve Tracking as Authorised Customer
  // ===========================================================================
  it('Step 12: Should allow authenticated customer to retrieve tracking details and milestones', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/me/orders/${createdOrderId}/tracking`)
      .set('Authorization', `Bearer ${tokenCustomerA}`)
      .expect(200);

    expect(res.body.orderId).toBe(createdOrderId);
    expect(res.body.orderNumber).toBe(createdOrderNumber);
    expect(res.body.orderStatus).toBe(OrderStatus.SHIPPED);
    expect(res.body.shipments).toBeDefined();
    expect(res.body.shipments.length).toBe(1);

    const shipment = res.body.shipments[0];
    expect(shipment.id).toBe(createdShipmentId);
    expect(shipment.trackingNumber).toBe(issuedTrackingNumber);
    expect(shipment.status).toBe(ShipmentStatus.IN_TRANSIT);

    // Verify milestone events are included and sorted chronologically
    expect(shipment.events).toBeDefined();
    expect(shipment.events.length).toBeGreaterThanOrEqual(3);
    const eventStatuses = shipment.events.map((e: any) => e.status);
    expect(eventStatuses).toContain(ShipmentStatus.READY_TO_SHIP);
    expect(eventStatuses).toContain(ShipmentStatus.SHIPPED);
    expect(eventStatuses).toContain(ShipmentStatus.IN_TRANSIT);

    const transitEvent = shipment.events.find((e: any) => e.status === ShipmentStatus.IN_TRANSIT);
    expect(transitEvent.location).toBe('Varanasi Central Sorting Hub');
  });

  // ===========================================================================
  // Step 13: Cross-Tenant & Customer Ownership Protections
  // ===========================================================================
  describe('Step 13: Cross-Tenant & Customer-Ownership Protections (IDOR & Isolation)', () => {
    it('13a: Should reject stranger customer tracking retrieval with 404 (IDOR Protection)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/customers/me/orders/${createdOrderId}/tracking`)
        .set('Authorization', `Bearer ${tokenCustomerB}`) // Stranger
        .expect(404);
    });

    it('13b: Should reject stranger customer payment initiation on another user order with 404', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${createdOrderId}/payments`)
        .set('Authorization', `Bearer ${tokenCustomerB}`) // Stranger
        .send({ paymentMethod: 'upi' })
        .expect(404);
    });

    it('13c: Should reject unauthorized seller from different tenant creating shipment (Cross-Tenant Protection)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${createdOrderId}/shipments`)
        .set('Authorization', `Bearer ${tokenSellerB}`) // Seller B from Tenant B
        .set('x-tenant-id', tenantB.id)
        .send({ packageWeight: 2.0 })
        .expect(403);
    });

    it('13d: Should reject unauthorized seller updating shipment status belonging to another tenant', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/shipments/${createdShipmentId}/status`)
        .set('Authorization', `Bearer ${tokenSellerB}`) // Seller B from Tenant B
        .set('x-tenant-id', tenantB.id)
        .send({
          status: ShipmentStatus.DELIVERED,
        })
        .expect(403);
    });
  });
});
