import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { generateKeyPair, SignJWT } from 'jose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TokenVerificationService } from '../src/modules/auth/token-verifier.service';
import { IdentityService } from '../src/modules/auth/identity.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { PlatformRole, TenantRole, MembershipStatus } from '@prisma/client';

describe('Store Management & Product Catalogue (e2e)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let identityService: IdentityService;
  let prismaService: PrismaService;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';

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

    jest.spyOn(prismaService.subscriptionPlan, 'count').mockResolvedValue(3);
    jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prismaService.subscriptionPlan, 'findUnique').mockResolvedValue({
      id: 'plan-starter',
      name: 'Starter Artisan',
      slug: 'starter',
      maxProducts: 50,
      maxStaffMembers: 2,
    } as any);
    jest.spyOn(prismaService.product, 'count').mockResolvedValue(0);

    // Mock identity resolution for test users
    jest.spyOn(identityService, 'resolveUserFromToken').mockImplementation(async (payload) => {
      if (payload.sub === 'sub-owner-tenant-a') {
        return {
          id: 'owner-a-id',
          name: 'Owner A',
          email: 'owner-a@example.com',
          platformRole: PlatformRole.USER,
          memberships: [
            {
              id: 'm-a',
              tenantId: 'tenant-a-id',
              role: TenantRole.STORE_OWNER,
              status: MembershipStatus.ACTIVE,
            },
          ],
        };
      }

      if (payload.sub === 'sub-staff-tenant-a') {
        return {
          id: 'staff-a-id',
          name: 'Staff A',
          email: 'staff-a@example.com',
          platformRole: PlatformRole.USER,
          memberships: [
            {
              id: 'm-staff',
              tenantId: 'tenant-a-id',
              role: TenantRole.STORE_STAFF,
              status: MembershipStatus.ACTIVE,
            },
          ],
        };
      }

      // Owner of tenant B
      return {
        id: 'owner-b-id',
        name: 'Owner B',
        email: 'owner-b@example.com',
        platformRole: PlatformRole.USER,
        memberships: [
          {
            id: 'm-b',
            tenantId: 'tenant-b-id',
            role: TenantRole.STORE_OWNER,
            status: MembershipStatus.ACTIVE,
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

  describe('Unauthenticated Access Control', () => {
    it('should reject unauthenticated access to store management', () => {
      return request(app.getHttpServer()).get('/api/v1/stores/current').expect(401);
    });

    it('should reject unauthenticated access to categories', () => {
      return request(app.getHttpServer())
        .post('/api/v1/categories')
        .send({ name: 'Diyas' })
        .expect(401);
    });

    it('should reject unauthenticated access to products', () => {
      return request(app.getHttpServer())
        .post('/api/v1/products')
        .send({ name: 'Clay Diya', price: 100 })
        .expect(401);
    });
  });

  describe('Role-Based Store Access', () => {
    it('should allow STORE_OWNER to get current store details', async () => {
      const token = await generateToken('sub-owner-tenant-a');

      jest.spyOn(prismaService.tenant, 'findUnique').mockResolvedValueOnce({
        id: 'tenant-a-id',
        businessName: 'Store A',
        storeSlug: 'store-a',
        isPublished: true,
      } as any);

      return request(app.getHttpServer())
        .get('/api/v1/stores/current')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', 'tenant-a-id')
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('tenant-a-id');
          expect(res.body.businessName).toBe('Store A');
        });
    });

    it('should forbid STORE_STAFF from updating store branding', async () => {
      const token = await generateToken('sub-staff-tenant-a');

      return request(app.getHttpServer())
        .patch('/api/v1/stores/current')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', 'tenant-a-id')
        .send({ businessName: 'Hacked Name' })
        .expect(403);
    });
  });

  describe('Validation & Safety Rules', () => {
    it('should reject invalid negative price when creating product', async () => {
      const token = await generateToken('sub-owner-tenant-a');

      return request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', 'tenant-a-id')
        .send({
          name: 'Invalid Price Diya',
          price: -50,
        })
        .expect(400);
    });

    it('should reject cross-tenant category assignment', async () => {
      const token = await generateToken('sub-owner-tenant-a');

      // Category belongs to tenant-b, not tenant-a
      jest.spyOn(prismaService.category, 'findFirst').mockResolvedValueOnce(null);

      return request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', 'tenant-a-id')
        .send({
          name: 'Cross Tenant Diya',
          price: 150,
          categoryId: 'category-of-tenant-b',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.message).toContain('Cross-tenant category assignment rejected');
        });
    });
  });

  describe('Public Storefront Endpoints', () => {
    it('should return 404 for unpublished store', () => {
      jest.spyOn(prismaService.tenant, 'findUnique').mockResolvedValueOnce({
        id: 't-draft',
        storeSlug: 'unpublished-store',
        isPublished: false,
        status: 'ACTIVE',
      } as any);

      return request(app.getHttpServer())
        .get('/api/v1/public/stores/unpublished-store')
        .expect(404)
        .expect((res) => {
          expect(res.body.error.message).toContain('Store not found or is currently unpublished');
        });
    });

    it('should return 200 for published store', () => {
      jest.spyOn(prismaService.tenant, 'findUnique').mockResolvedValueOnce({
        id: 't-published',
        businessName: 'Vedic Organic Diyas',
        storeSlug: 'vedic-diyas',
        isPublished: true,
        status: 'ACTIVE',
        categories: [],
      } as any);

      return request(app.getHttpServer())
        .get('/api/v1/public/stores/vedic-diyas')
        .expect(200)
        .expect((res) => {
          expect(res.body.storeSlug).toBe('vedic-diyas');
          expect(res.body.businessName).toBe('Vedic Organic Diyas');
        });
    });
  });
});
