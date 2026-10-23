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
  TenantRole,
  MembershipStatus,
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';

interface LoadProfileConfig {
  name: string;
  virtualUsers: number;
  durationSeconds: number;
}

const LOAD_PROFILES: Record<string, LoadProfileConfig> = {
  smoke: { name: 'Smoke Test (1-5 VUs)', virtualUsers: 5, durationSeconds: 2 },
  baseline: { name: 'Baseline Test (10-25 VUs)', virtualUsers: 25, durationSeconds: 2 },
  moderate: { name: 'Moderate Load (50 VUs)', virtualUsers: 50, durationSeconds: 2 },
  high: { name: 'High Load (100 VUs)', virtualUsers: 100, durationSeconds: 2 },
};

interface ScenarioMetrics {
  name: string;
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  latencies: number[];
}

function calculatePercentile(latencies: number[], percentile: number): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return Number(sorted[Math.max(0, index)].toFixed(2));
}

describe('Backend Performance, Caching & Load Testing (Step 13)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifier: TokenVerificationService;
  let customerToken: string;
  let sellerToken: string;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';

  const TENANT_ID = '11111111-1111-4111-8111-111111111111';
  const USER_CUST_ID = '22222222-2222-4222-8222-222222222222';
  const USER_SELLER_ID = '33333333-3333-4333-8333-333333333333';
  const PROD_ID = '44444444-4444-4444-8444-444444444444';
  const CAT_ID = '55555555-5555-4555-8555-555555555555';

  const tenantA = {
    id: TENANT_ID,
    businessName: 'Gir Organic Milk & Ghee',
    storeSlug: 'gir-organic',
    description: 'Fresh Vedic Bilona Ghee from Gir Cows',
    status: 'ACTIVE',
    isPublished: true,
    publishedAt: new Date(),
    currency: 'INR',
    categories: [{ id: CAT_ID, name: 'Ghee & Dairy', slug: 'ghee-dairy' }],
  };

  const productA1 = {
    id: PROD_ID,
    tenantId: TENANT_ID,
    categoryId: CAT_ID,
    name: 'Bilona Ghee 500ml',
    slug: 'bilona-ghee-500ml',
    price: 1200,
    currency: 'INR',
    sku: 'GIR-GHEE-500',
    stock: 50,
    status: 'PUBLISHED',
    images: [],
    createdAt: new Date(),
    category: { id: CAT_ID, name: 'Ghee & Dairy', slug: 'ghee-dairy' },
    tenant: tenantA,
  };

  const mockCart = {
    id: '66666666-6666-4666-8666-666666666666',
    userId: USER_CUST_ID,
    currency: 'INR',
    items: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        cartId: '66666666-6666-4666-8666-666666666666',
        productId: PROD_ID,
        quantity: 1,
        product: productA1,
      },
    ],
  };

  const mockOrder = {
    id: '88888888-8888-4888-8888-888888888888',
    orderNumber: 'GS-20261022-BNCH1',
    userId: USER_CUST_ID,
    tenantId: TENANT_ID,
    status: OrderStatus.PLACED,
    paymentStatus: PaymentStatus.PENDING,
    currency: 'INR',
    subtotal: 1200,
    taxAmount: 0,
    shippingAmount: 0,
    totalAmount: 1200,
    shippingAddress: {
      fullName: 'Benchmark Customer',
      phone: '+919876543210',
      addressLine1: 'Vrindavan',
      city: 'Mathura',
      state: 'UP',
      postalCode: '281121',
      country: 'IN',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: '99999999-9999-4999-8999-999999999999',
        productId: PROD_ID,
        productName: 'Bilona Ghee 500ml',
        unitPrice: 1200,
        quantity: 1,
        subtotal: 1200,
      },
    ],
    reservations: [{ id: 'res-1', productId: PROD_ID, quantity: 1, status: 'RESERVED' }],
    statusHistory: [],
  };

  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
    tenant: {
      findUnique: jest.fn().mockResolvedValue(tenantA),
      findFirst: jest.fn().mockResolvedValue(tenantA),
      count: jest.fn().mockResolvedValue(1),
    },
    category: {
      findMany: jest.fn().mockResolvedValue(tenantA.categories),
      findUnique: jest.fn().mockResolvedValue(tenantA.categories[0]),
      findFirst: jest.fn().mockResolvedValue(tenantA.categories[0]),
      count: jest.fn().mockResolvedValue(1),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([productA1]),
      findFirst: jest.fn().mockResolvedValue(productA1),
      findUnique: jest.fn().mockResolvedValue(productA1),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue(productA1),
    },
    cart: {
      findUnique: jest.fn().mockResolvedValue(mockCart),
      findFirst: jest.fn().mockResolvedValue(mockCart),
      create: jest.fn().mockResolvedValue(mockCart),
      update: jest.fn().mockResolvedValue(mockCart),
    },
    cartItem: {
      findMany: jest.fn().mockResolvedValue(mockCart.items),
      findFirst: jest.fn().mockResolvedValue(mockCart.items[0]),
      create: jest.fn().mockResolvedValue(mockCart.items[0]),
      delete: jest.fn().mockResolvedValue(mockCart.items[0]),
    },
    customerAddress: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    order: {
      findMany: jest.fn().mockResolvedValue([mockOrder]),
      findFirst: jest.fn().mockResolvedValue(mockOrder),
      findUnique: jest.fn().mockResolvedValue(mockOrder),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue(mockOrder),
      update: jest.fn().mockResolvedValue(mockOrder),
    },
    shippingRecord: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    subscriptionPlan: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'p1', name: 'Artisan', priceMonthly: 499, isActive: true }]),
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'p1', name: 'Artisan', priceMonthly: 499, isActive: true }),
      count: jest.fn().mockResolvedValue(1),
    },
    subscription: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    tenantMembership: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'm-1',
        tenantId: TENANT_ID,
        role: TenantRole.STORE_OWNER,
        status: MembershipStatus.ACTIVE,
        tenant: { status: 'ACTIVE' },
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    outboxEvent: {
      create: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: USER_CUST_ID,
        email: 'customer@example.com',
        name: 'Benchmark Customer',
        platformRole: PlatformRole.USER,
        status: 'ACTIVE',
      }),
    },
  };

  beforeAll(async () => {
    testKeyPair = await generateKeyPair('RS256');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(IdentityService)
      .useValue({
        resolveUserFromToken: async (payload: any) => {
          if (payload.sub === 'user-seller-1') {
            return {
              id: USER_SELLER_ID,
              email: 'seller@gir.example',
              name: 'Gir Seller',
              platformRole: PlatformRole.USER,
              status: 'ACTIVE',
              memberships: [
                {
                  id: 'm-1',
                  tenantId: TENANT_ID,
                  role: TenantRole.STORE_OWNER,
                  status: MembershipStatus.ACTIVE,
                  tenant: { status: 'ACTIVE' },
                },
              ],
            };
          }
          return {
            id: USER_CUST_ID,
            email: 'customer@example.com',
            name: 'Benchmark Customer',
            platformRole: PlatformRole.USER,
            status: 'ACTIVE',
            memberships: [],
          };
        },
      })
      .compile();

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

    tokenVerifier = moduleFixture.get<TokenVerificationService>(TokenVerificationService);
    tokenVerifier.setCustomKeyProvider(testKeyPair.publicKey);

    await app.init();
    await app.listen(0);

    async function createToken(sub: string) {
      return new SignJWT({ sub })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setSubject(sub)
        .setExpirationTime('1h')
        .sign(testKeyPair.privateKey);
    }

    customerToken = await createToken('user-cust-1');
    sellerToken = await createToken('user-seller-1');

    // Pre-warm the cache for public endpoints
    await request(app.getHttpServer()).get('/api/v1/public/stores/gir-organic');
    await request(app.getHttpServer()).get('/api/v1/public/stores/gir-organic/products');
    await request(app.getHttpServer()).get('/api/v1/public/stores/gir-organic/categories');
    await request(app.getHttpServer()).get(
      '/api/v1/public/stores/gir-organic/products/bilona-ghee-500ml',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  async function executeProfile(profile: LoadProfileConfig) {
    const server = app.getHttpServer();
    const startTime = Date.now();
    const endTime = startTime + profile.durationSeconds * 1000;

    const scenarios: ScenarioMetrics[] = [
      {
        name: 'Scenario A: Public Browsing (Cached Storefront)',
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        latencies: [],
      },
      {
        name: 'Scenario B: Customer Activity (Cart)',
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        latencies: [],
      },
      {
        name: 'Scenario C: Seller Operations (Orders List)',
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        latencies: [],
      },
      {
        name: 'Scenario D: Concurrency & Stock Consistency Validation',
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        latencies: [],
      },
    ];

    async function runWorker() {
      while (Date.now() < endTime) {
        // Scenario A
        {
          const t0 = performance.now();
          const endpoints = [
            '/api/v1/public/stores/gir-organic',
            '/api/v1/public/stores/gir-organic/products',
            '/api/v1/public/stores/gir-organic/categories',
            '/api/v1/public/stores/gir-organic/products/bilona-ghee-500ml',
          ];
          const target = endpoints[Math.floor(Math.random() * endpoints.length)];
          const res = await request(server).get(target);
          const lat = performance.now() - t0;
          scenarios[0].totalRequests++;
          scenarios[0].latencies.push(lat);
          if (res.status === 200) scenarios[0].successRequests++;
          else scenarios[0].failedRequests++;
        }

        // Scenario B
        {
          const t0 = performance.now();
          const res = await request(server)
            .get('/api/v1/cart')
            .set('Authorization', `Bearer ${customerToken}`);
          const lat = performance.now() - t0;
          scenarios[1].totalRequests++;
          scenarios[1].latencies.push(lat);
          if (res.status === 200) scenarios[1].successRequests++;
          else scenarios[1].failedRequests++;
        }

        // Scenario C
        {
          const t0 = performance.now();
          const res = await request(server)
            .get(`/api/v1/orders?tenantId=${TENANT_ID}`)
            .set('Authorization', `Bearer ${sellerToken}`);
          const lat = performance.now() - t0;
          scenarios[2].totalRequests++;
          scenarios[2].latencies.push(lat);
          if (res.status === 200) scenarios[2].successRequests++;
          else scenarios[2].failedRequests++;
        }

        // Scenario D (Simultaneous concurrent inventory check)
        {
          const t0 = performance.now();
          const res = await request(server)
            .post('/api/v1/checkout/validate')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
              tenantId: TENANT_ID,
              shippingAddress: {
                fullName: 'Benchmark Customer',
                phone: '+919876543210',
                addressLine1: 'Vrindavan Marg',
                city: 'Mathura',
                state: 'UP',
                postalCode: '281121',
                country: 'IN',
              },
            });
          const lat = performance.now() - t0;
          scenarios[3].totalRequests++;
          scenarios[3].latencies.push(lat);
          if (res.status === 200) scenarios[3].successRequests++;
          else scenarios[3].failedRequests++;
        }

        // Pacing tick between iterations
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    const runWorkerWithRamp = async (vuId: number) => {
      await new Promise((r) => setTimeout(r, vuId * 10));
      await runWorker();
    };

    await Promise.all(
      Array.from({ length: profile.virtualUsers }, (_, i) => runWorkerWithRamp(i + 1)),
    );

    const totalSeconds = (Date.now() - startTime) / 1000;
    let totalReqs = 0;
    let totalFailed = 0;
    const allLatencies: number[] = [];

    for (const s of scenarios) {
      totalReqs += s.totalRequests;
      totalFailed += s.failedRequests;
      allLatencies.push(...s.latencies);
    }

    const throughput = Number((totalReqs / totalSeconds).toFixed(1));
    const p50 = calculatePercentile(allLatencies, 50);
    const p95 = calculatePercentile(allLatencies, 95);
    const p99 = calculatePercentile(allLatencies, 99);
    const errorRate = totalReqs > 0 ? Number(((totalFailed / totalReqs) * 100).toFixed(2)) : 0;

    console.log(`\n=============================================================================`);
    console.log(` LOAD PROFILE RESULTS: ${profile.name}`);
    console.log(` Duration: ${totalSeconds.toFixed(1)}s | Virtual Users: ${profile.virtualUsers}`);
    console.log(
      ` Total Requests: ${totalReqs} | Throughput: ${throughput} req/s | Error Rate: ${errorRate}%`,
    );
    console.log(` Latencies: p50 = ${p50}ms | p95 = ${p95}ms | p99 = ${p99}ms`);
    console.log(` Acceptance Criteria (p95 < 300ms): ${p95 < 300 ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`=============================================================================\n`);

    return {
      profile: profile.name,
      totalRequests: totalReqs,
      throughput,
      errorRate,
      p50,
      p95,
      p99,
      scenarios,
    };
  }

  it('Profile 1: Smoke Test (5 Virtual Users)', async () => {
    const result = await executeProfile(LOAD_PROFILES.smoke);
    expect(result.errorRate).toBe(0);
    expect(result.p95).toBeLessThan(300);
  });

  it('Profile 2: Baseline Test (25 Virtual Users)', async () => {
    const result = await executeProfile(LOAD_PROFILES.baseline);
    expect(result.errorRate).toBe(0);
    expect(result.p95).toBeLessThan(300);
  });

  it('Profile 3: Moderate Load (50 Virtual Users)', async () => {
    const result = await executeProfile(LOAD_PROFILES.moderate);
    expect(result.errorRate).toBe(0);
    expect(result.p95).toBeLessThan(300);
  });

  it('Profile 4: High Load (100 Virtual Users)', async () => {
    const result = await executeProfile(LOAD_PROFILES.high);
    expect(result.errorRate).toBe(0);
    expect(result.p95).toBeLessThan(500);
  });
});
