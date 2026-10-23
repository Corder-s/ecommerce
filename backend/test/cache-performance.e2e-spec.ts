import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { generateKeyPair, SignJWT } from 'jose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TokenVerificationService } from '../src/modules/auth/token-verifier.service';
import { IdentityService } from '../src/modules/auth/identity.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { CACHE_SERVICE, ICacheService, CacheKeys } from '../src/common/cache';
import { PlatformRole, TenantRole, MembershipStatus } from '@prisma/client';

describe('Performance, Caching & Data Consistency (e2e - Step 13)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let identityService: IdentityService;
  let prismaService: PrismaService;
  let cacheService: ICacheService;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';

  const mockStore = {
    id: 'tenant-perf-1',
    businessName: 'Vedic Artisans Cow Care',
    storeSlug: 'vedic-artisans',
    description: 'Traditional handcrafted products and pure A2 cow products',
    logoUrl: 'https://media.gaushilp.example.com/logo.png',
    bannerUrl: 'https://media.gaushilp.example.com/banner.png',
    contactEmail: 'contact@vedicartisans.example',
    contactPhone: '+919876543210',
    address: 'Vrindavan, UP, India',
    currency: 'INR',
    status: 'ACTIVE',
    isPublished: true,
    publishedAt: new Date(),
    categories: [
      { id: 'cat-1', name: 'A2 Ghee', slug: 'a2-ghee', description: 'Pure Bilona Ghee' },
    ],
  };

  const mockProduct = {
    id: 'prod-1',
    tenantId: 'tenant-perf-1',
    categoryId: 'cat-1',
    name: 'Gir Cow Bilona Ghee 500ml',
    slug: 'gir-cow-bilona-ghee-500ml',
    description: 'Handmade traditional Vedic Bilona Ghee',
    price: 1500,
    currency: 'INR',
    sku: 'GIR-GHEE-500',
    stock: 25,
    status: 'PUBLISHED',
    images: ['https://media.gaushilp.example.com/ghee.png'],
    createdAt: new Date(),
    category: { id: 'cat-1', name: 'A2 Ghee', slug: 'a2-ghee' },
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
    cacheService = moduleFixture.get<ICacheService>(CACHE_SERVICE);

    // Mock subscription plan & limits for entitlements
    jest.spyOn(prismaService.subscriptionPlan, 'count').mockResolvedValue(3);
    jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prismaService.subscriptionPlan, 'findUnique').mockResolvedValue({
      id: 'plan-starter',
      name: 'Starter Artisan',
      slug: 'starter',
      maxProducts: 50,
      maxStaffMembers: 2,
    } as any);

    // Mock identity resolution for seller
    jest.spyOn(identityService, 'resolveUserFromToken').mockImplementation(async (payload) => {
      if (payload.sub === 'sub-seller-perf-1') {
        return {
          id: 'user-seller-perf-1',
          email: 'seller@vedicartisans.example',
          name: 'Vedic Artisan Owner',
          platformRole: PlatformRole.USER,
          memberships: [
            {
              id: 'm-perf-1',
              tenantId: 'tenant-perf-1',
              role: TenantRole.STORE_OWNER,
              status: MembershipStatus.ACTIVE,
            },
          ],
        } as any;
      }
      return null;
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cacheService.flushAll();
  });

  async function createTestJwt(subject: string): Promise<string> {
    return new SignJWT({
      email: `${subject}@example.com`,
      name: `User ${subject}`,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject(subject)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(testKeyPair.privateKey);
  }

  describe('Selective Public Storefront Caching', () => {
    it('should query DB on initial request, cache result, and serve cache on subsequent request', async () => {
      const dbSpy = jest
        .spyOn(prismaService.tenant, 'findUnique')
        .mockResolvedValue(mockStore as any);

      // 1. Initial request -> Cache Miss -> DB Query
      const res1 = await request(app.getHttpServer())
        .get('/api/v1/public/stores/vedic-artisans')
        .expect(200);

      expect(res1.body.businessName).toBe(mockStore.businessName);
      expect(dbSpy).toHaveBeenCalledTimes(1);

      // Verify item exists in cache
      const cached = await cacheService.get(CacheKeys.publicStore('vedic-artisans'));
      expect(cached).toBeDefined();

      // 2. Subsequent request -> Cache Hit -> DB NOT Called
      const res2 = await request(app.getHttpServer())
        .get('/api/v1/public/stores/vedic-artisans')
        .expect(200);

      expect(res2.body.businessName).toBe(mockStore.businessName);
      expect(dbSpy).toHaveBeenCalledTimes(1); // Call count unchanged!
    });

    it('should invalidate store cache when store is updated', async () => {
      const sellerToken = await createTestJwt('sub-seller-perf-1');
      jest.spyOn(prismaService.tenant, 'findUnique').mockResolvedValue(mockStore as any);
      jest.spyOn(prismaService.tenant, 'update').mockResolvedValue({
        ...mockStore,
        description: 'Updated fresh description',
      } as any);

      // Pre-warm cache
      await request(app.getHttpServer()).get('/api/v1/public/stores/vedic-artisans').expect(200);
      expect(await cacheService.get(CacheKeys.publicStore('vedic-artisans'))).not.toBeNull();

      // Seller updates store
      await request(app.getHttpServer())
        .patch('/api/v1/stores/current')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('x-tenant-id', 'tenant-perf-1')
        .send({
          description: 'Updated fresh description',
        })
        .expect(200);

      // Cache should be evicted
      const cachedAfterUpdate = await cacheService.get(CacheKeys.publicStore('vedic-artisans'));
      expect(cachedAfterUpdate).toBeNull();
    });
  });

  describe('Product Catalogue Caching & Invalidation', () => {
    it('should cache product catalogue responses and invalidate upon product creation', async () => {
      const sellerToken = await createTestJwt('sub-seller-perf-1');

      jest.spyOn(prismaService.tenant, 'findUnique').mockResolvedValue(mockStore as any);
      const countSpy = jest.spyOn(prismaService.product, 'count').mockResolvedValue(1);
      const findManySpy = jest
        .spyOn(prismaService.product, 'findMany')
        .mockResolvedValue([mockProduct] as any);

      // 1. Initial product listing -> Cache Miss
      const res1 = await request(app.getHttpServer())
        .get('/api/v1/public/stores/vedic-artisans/products')
        .expect(200);

      expect(res1.body.data.length).toBe(1);
      expect(countSpy).toHaveBeenCalledTimes(1);
      expect(findManySpy).toHaveBeenCalledTimes(1);

      // 2. Second request -> Cache Hit (no DB calls)
      const res2 = await request(app.getHttpServer())
        .get('/api/v1/public/stores/vedic-artisans/products')
        .expect(200);

      expect(res2.body.data.length).toBe(1);
      expect(countSpy).toHaveBeenCalledTimes(1);
      expect(findManySpy).toHaveBeenCalledTimes(1);

      // 3. Seller creates a new product
      jest.spyOn(prismaService.product, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.product, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.product, 'create').mockResolvedValue({
        ...mockProduct,
        id: 'prod-2',
        name: 'Gomaye Dhoop Sticks',
        slug: 'gomaye-dhoop-sticks',
      } as any);

      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('x-tenant-id', 'tenant-perf-1')
        .send({
          name: 'Gomaye Dhoop Sticks',
          price: 250,
          stock: 100,
        })
        .expect(201);

      // Cache for catalogue must be invalidated
      const cacheKey = CacheKeys.tenantProducts('tenant-perf-1', 1, 20);
      expect(await cacheService.get(cacheKey)).toBeNull();
    });
  });

  describe('Tenant Cache Isolation', () => {
    it('should strictly isolate cache keys between different tenants', async () => {
      const tenantA_key = CacheKeys.tenantProducts('tenant-A', 1, 20);
      const tenantB_key = CacheKeys.tenantProducts('tenant-B', 1, 20);

      await cacheService.set(tenantA_key, { tenant: 'Tenant A Products' });
      await cacheService.set(tenantB_key, { tenant: 'Tenant B Products' });

      // Invalidate Tenant A
      await cacheService.delByPattern(CacheKeys.tenantProductsPattern('tenant-A'));

      // Tenant A is cleared, Tenant B remains untouched
      expect(await cacheService.get(tenantA_key)).toBeNull();
      expect(await cacheService.get(tenantB_key)).toEqual({ tenant: 'Tenant B Products' });
    });
  });

  describe('Graceful Fallback on Redis / Cache Failure', () => {
    it('should return authoritative database record without crashing if cache returns null/error', async () => {
      // Mock cache get to return null (simulating cache miss or backend degradation)
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.tenant, 'findUnique').mockResolvedValue(mockStore as any);

      const res = await request(app.getHttpServer())
        .get('/api/v1/public/stores/vedic-artisans')
        .expect(200);

      expect(res.body.businessName).toBe(mockStore.businessName);
    });
  });
});
