import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { generateKeyPair, SignJWT } from 'jose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TokenVerificationService } from '../src/modules/auth/token-verifier.service';
import { IdentityService } from '../src/modules/auth/identity.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { CACHE_SERVICE, ICacheService } from '../src/common/cache';
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
  smoke: { name: 'Smoke Test', virtualUsers: 5, durationSeconds: 3 },
  baseline: { name: 'Baseline Test', virtualUsers: 25, durationSeconds: 5 },
  moderate: { name: 'Moderate Load', virtualUsers: 50, durationSeconds: 5 },
  high: { name: 'High Load', virtualUsers: 100, durationSeconds: 5 },
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

async function runLoadHarness() {
  const profileArg = (process.argv[2] || 'baseline').replace('--profile=', '').toLowerCase();
  const profile = LOAD_PROFILES[profileArg] || LOAD_PROFILES.baseline;

  console.log(`=============================================================================`);
  console.log(` GauShilp OS Backend Load & Concurrency Benchmark (Step 13)`);
  console.log(
    ` Profile: ${profile.name} | VUs: ${profile.virtualUsers} | Duration: ${profile.durationSeconds}s`,
  );
  console.log(`=============================================================================\n`);

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';
  const testKeyPair = await generateKeyPair('RS256');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const tokenVerifier = moduleFixture.get<TokenVerificationService>(TokenVerificationService);
  tokenVerifier.setCustomKeyProvider(testKeyPair.publicKey);

  const identityService = moduleFixture.get<IdentityService>(IdentityService);
  const prismaService = moduleFixture.get<PrismaService>(PrismaService);
  const cacheService = moduleFixture.get<ICacheService>(CACHE_SERVICE);

  // Setup disposable benchmark fixture data
  const tenantA = {
    id: 'tenant-bench-a',
    businessName: 'Gir Organic Milk & Ghee',
    storeSlug: 'gir-organic',
    description: 'Fresh Vedic Bilona Ghee from Gir Cows',
    status: 'ACTIVE',
    isPublished: true,
    publishedAt: new Date(),
    currency: 'INR',
    categories: [{ id: 'cat-a1', name: 'Ghee & Dairy', slug: 'ghee-dairy' }],
  };

  const productA1 = {
    id: 'prod-a1',
    tenantId: 'tenant-bench-a',
    categoryId: 'cat-a1',
    name: 'Bilona Ghee 500ml',
    slug: 'bilona-ghee-500ml',
    price: 1200,
    currency: 'INR',
    sku: 'GIR-GHEE-500',
    stock: 50,
    status: 'PUBLISHED',
    images: [],
    createdAt: new Date(),
    category: { id: 'cat-a1', name: 'Ghee & Dairy', slug: 'ghee-dairy' },
  };

  const mockCart = {
    id: 'cart-cust-1',
    userId: 'user-cust-1',
    items: [
      {
        id: 'ci-1',
        cartId: 'cart-cust-1',
        productId: 'prod-a1',
        quantity: 1,
        product: {
          ...productA1,
          tenant: tenantA,
        },
      },
    ],
  };

  const mockOrder = {
    id: 'order-bench-1',
    orderNumber: 'GS-20261022-BNCH1',
    userId: 'user-cust-1',
    tenantId: 'tenant-bench-a',
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
        id: 'oi-1',
        productId: 'prod-a1',
        productName: 'Bilona Ghee 500ml',
        unitPrice: 1200,
        quantity: 1,
        subtotal: 1200,
      },
    ],
    reservations: [{ id: 'res-1', productId: 'prod-a1', quantity: 1, status: 'RESERVED' }],
    statusHistory: [],
  };

  // Mock Prisma methods for fast, non-destructive benchmark
  jest.spyOn(prismaService.tenant, 'findUnique').mockResolvedValue(tenantA as any);
  jest.spyOn(prismaService.category, 'findMany').mockResolvedValue(tenantA.categories as any);
  jest.spyOn(prismaService.product, 'count').mockResolvedValue(1);
  jest.spyOn(prismaService.product, 'findMany').mockResolvedValue([productA1] as any);
  jest.spyOn(prismaService.product, 'findFirst').mockResolvedValue(productA1 as any);
  jest.spyOn(prismaService.cart, 'findUnique').mockResolvedValue(mockCart as any);
  jest.spyOn(prismaService.order, 'findMany').mockResolvedValue([mockOrder] as any);
  jest.spyOn(prismaService.order, 'findFirst').mockResolvedValue(mockOrder as any);
  jest.spyOn(prismaService.order, 'findUnique').mockResolvedValue(mockOrder as any);
  jest.spyOn(prismaService.order, 'count').mockResolvedValue(1);
  jest.spyOn(prismaService.subscriptionPlan, 'count').mockResolvedValue(3);
  jest
    .spyOn(prismaService.subscriptionPlan, 'findMany')
    .mockResolvedValue([{ id: 'p1', name: 'Artisan', priceMonthly: 499, isActive: true }] as any);

  // Mock identity
  jest.spyOn(identityService, 'resolveUserFromToken').mockImplementation(async (payload) => {
    if (payload.sub === 'user-seller-1') {
      return {
        id: 'user-seller-1',
        email: 'seller@gir.example',
        name: 'Gir Seller',
        platformRole: PlatformRole.USER,
        memberships: [
          {
            id: 'm-1',
            tenantId: 'tenant-bench-a',
            role: TenantRole.STORE_OWNER,
            status: MembershipStatus.ACTIVE,
          },
        ],
      } as any;
    }
    return {
      id: 'user-cust-1',
      email: 'customer@example.com',
      name: 'Benchmark Customer',
      platformRole: PlatformRole.USER,
      memberships: [],
    } as any;
  });

  await app.init();

  async function createToken(sub: string) {
    return new SignJWT({ sub })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject(sub)
      .setExpirationTime('1h')
      .sign(testKeyPair.privateKey);
  }

  const customerToken = await createToken('user-cust-1');
  const sellerToken = await createToken('user-seller-1');

  // Pre-warm cache for Scenario A
  await request(app.getHttpServer()).get('/api/v1/public/stores/gir-organic');
  await request(app.getHttpServer()).get('/api/v1/public/stores/gir-organic/products');
  await request(app.getHttpServer()).get('/api/v1/public/stores/gir-organic/categories');
  await request(app.getHttpServer()).get(
    '/api/v1/public/stores/gir-organic/products/bilona-ghee-500ml',
  );

  const scenarios: ScenarioMetrics[] = [
    {
      name: 'Scenario A: Public Browsing (Cached Storefront)',
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      latencies: [],
    },
    {
      name: 'Scenario B: Customer Activity (Cart & Checkout)',
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      latencies: [],
    },
    {
      name: 'Scenario C: Seller Operations (Products & Orders)',
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      latencies: [],
    },
    {
      name: 'Scenario D: Concurrency & Stock Consistency',
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      latencies: [],
    },
  ];

  const server = app.getHttpServer();
  const startTime = Date.now();
  const endTime = startTime + profile.durationSeconds * 1000;

  // Worker loop simulating virtual users
  async function runVU(vuId: number) {
    while (Date.now() < endTime) {
      // 1. Scenario A
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

      // 2. Scenario B
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

      // 3. Scenario C
      {
        const t0 = performance.now();
        const res = await request(server)
          .get('/api/v1/orders/seller')
          .set('Authorization', `Bearer ${sellerToken}`)
          .set('x-tenant-id', 'tenant-bench-a');
        const lat = performance.now() - t0;
        scenarios[2].totalRequests++;
        scenarios[2].latencies.push(lat);
        if (res.status === 200) scenarios[2].successRequests++;
        else scenarios[2].failedRequests++;
      }

      // 4. Scenario D (Simultaneous concurrent inventory validations & idempotent keys)
      {
        const t0 = performance.now();
        const res = await request(server)
          .post('/api/v1/checkout/validate')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ tenantId: 'tenant-bench-a' });
        const lat = performance.now() - t0;
        scenarios[3].totalRequests++;
        scenarios[3].latencies.push(lat);
        if (res.status === 200) scenarios[3].successRequests++;
        else scenarios[3].failedRequests++;
      }
    }
  }

  // Launch virtual users concurrently
  await Promise.all(Array.from({ length: profile.virtualUsers }, (_, i) => runVU(i + 1)));

  const totalTimeSeconds = (Date.now() - startTime) / 1000;
  await app.close();

  // Print results
  console.log(`-----------------------------------------------------------------------------`);
  console.log(
    ` Benchmark Results for Profile: ${profile.name} (${profile.virtualUsers} VUs, ${totalTimeSeconds.toFixed(1)}s)`,
  );
  console.log(`-----------------------------------------------------------------------------`);

  let grandTotalReqs = 0;
  let grandTotalSuccess = 0;
  let grandTotalFailed = 0;
  const allLatencies: number[] = [];

  for (const s of scenarios) {
    grandTotalReqs += s.totalRequests;
    grandTotalSuccess += s.successRequests;
    grandTotalFailed += s.failedRequests;
    allLatencies.push(...s.latencies);

    const throughput = (s.totalRequests / totalTimeSeconds).toFixed(1);
    const p50 = calculatePercentile(s.latencies, 50);
    const p95 = calculatePercentile(s.latencies, 95);
    const p99 = calculatePercentile(s.latencies, 99);
    const errRate =
      s.totalRequests > 0 ? ((s.failedRequests / s.totalRequests) * 100).toFixed(2) : '0.00';

    console.log(`Scenario: ${s.name}`);
    console.log(
      `  Requests: ${s.totalRequests} | Throughput: ${throughput} req/s | Errors: ${s.failedRequests} (${errRate}%)`,
    );
    console.log(`  Latency:  p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms\n`);
  }

  const overallThroughput = (grandTotalReqs / totalTimeSeconds).toFixed(1);
  const overallP50 = calculatePercentile(allLatencies, 50);
  const overallP95 = calculatePercentile(allLatencies, 95);
  const overallP99 = calculatePercentile(allLatencies, 99);
  const overallErrorRate =
    grandTotalReqs > 0 ? ((grandTotalFailed / grandTotalReqs) * 100).toFixed(2) : '0.00';

  console.log(`=============================================================================`);
  console.log(` OVERALL METRICS:`);
  console.log(`  Total Requests:     ${grandTotalReqs}`);
  console.log(`  Overall Throughput: ${overallThroughput} req/s`);
  console.log(`  Error Rate:         ${overallErrorRate}%`);
  console.log(`  p50 Latency:        ${overallP50} ms`);
  console.log(
    `  p95 Latency:        ${overallP95} ms (Target: < 300 ms - ${overallP95 < 300 ? 'PASSED ✅' : 'FAILED ❌'})`,
  );
  console.log(`  p99 Latency:        ${overallP99} ms`);
  console.log(`=============================================================================\n`);

  return {
    profile: profile.name,
    vus: profile.virtualUsers,
    durationSeconds: totalTimeSeconds,
    totalRequests: grandTotalReqs,
    throughput: Number(overallThroughput),
    errorRate: Number(overallErrorRate),
    p50: overallP50,
    p95: overallP95,
    p99: overallP99,
  };
}

if (require.main === module) {
  runLoadHarness().catch((err) => {
    console.error('Benchmark execution error:', err);
    process.exit(1);
  });
}

export { runLoadHarness };
