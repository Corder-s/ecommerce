import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { generateKeyPair, SignJWT } from 'jose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TokenVerificationService } from '../src/modules/auth/token-verifier.service';
import { IdentityService } from '../src/modules/auth/identity.service';
import { PlatformRole, TenantRole, MembershipStatus } from '@prisma/client';

describe('Auth & Tenant Authorization (e2e)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let identityService: IdentityService;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';

  beforeAll(async () => {
    testKeyPair = await generateKeyPair('RS256');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());

    tokenVerifierService = moduleFixture.get<TokenVerificationService>(TokenVerificationService);
    tokenVerifierService.setCustomKeyProvider(testKeyPair.publicKey);

    identityService = moduleFixture.get<IdentityService>(IdentityService);

    // Mock identity resolution for e2e tests
    jest.spyOn(identityService, 'resolveUserFromToken').mockImplementation(async (payload) => {
      if (payload.sub === 'sub-super-admin') {
        return {
          id: 'admin-uuid',
          name: 'Super Admin',
          email: 'admin@gaushilp.example',
          platformRole: PlatformRole.SUPER_ADMIN,
          memberships: [],
        };
      }

      if (payload.sub === 'sub-staff-user') {
        return {
          id: 'staff-uuid',
          name: 'Store Staff',
          email: 'staff@example.com',
          platformRole: PlatformRole.USER,
          memberships: [
            {
              id: 'm-staff-1',
              tenantId: 'tenant-diyas',
              role: TenantRole.STORE_STAFF,
              status: MembershipStatus.ACTIVE,
            },
          ],
        };
      }

      // Default regular seller (Owner of tenant-diyas, Customer in tenant-dhoop)
      return {
        id: 'seller-uuid',
        name: 'Ramesh Seller',
        email: 'ramesh@example.com',
        platformRole: PlatformRole.USER,
        memberships: [
          {
            id: 'm-1',
            tenantId: 'tenant-diyas',
            role: TenantRole.STORE_OWNER,
            status: MembershipStatus.ACTIVE,
          },
          {
            id: 'm-2',
            tenantId: 'tenant-dhoop',
            role: TenantRole.CUSTOMER,
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

  const generateToken = async (sub: string, customClaims: Record<string, any> = {}) => {
    return new SignJWT({ sub, ...customClaims })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('1h')
      .sign(testKeyPair.privateKey);
  };

  describe('/api/v1/auth/me (GET)', () => {
    it('should return 401 when Authorization header is missing', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401)
        .expect((res) => {
          expect(res.body.statusCode).toBe(401);
          expect(res.body.error.message).toContain('Authorization header is missing');
        });
    });

    it('should return 401 when Bearer scheme is malformed', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic 123456')
        .expect(401)
        .expect((res) => {
          expect(res.body.error.message).toContain('Malformed Authorization header');
        });
    });

    it('should return 401 when token signature is invalid', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.signature')
        .expect(401);
    });

    it('should return 200 and profile without secrets for valid token', async () => {
      const token = await generateToken('sub-seller-1');

      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('seller-uuid');
          expect(res.body.email).toBe('ramesh@example.com');
          expect(res.body.platformRole).toBe('USER');
          expect(res.body.memberships).toHaveLength(2);
          // Confirm no secrets or tokens leaked
          expect(res.body.password).toBeUndefined();
          expect(res.body.token).toBeUndefined();
        });
    });
  });

  describe('/api/v1/auth/admin/overview (GET)', () => {
    it('should return 403 Forbidden when standard user accesses SUPER_ADMIN route', async () => {
      const token = await generateToken('sub-seller-1');

      return request(app.getHttpServer())
        .get('/api/v1/auth/admin/overview')
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.statusCode).toBe(403);
          expect(res.body.error.message).toContain('Insufficient platform permissions');
        });
    });

    it('should return 200 when SUPER_ADMIN accesses admin overview', async () => {
      const token = await generateToken('sub-super-admin');

      return request(app.getHttpServer())
        .get('/api/v1/auth/admin/overview')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.adminId).toBe('admin-uuid');
          expect(res.body.platformRole).toBe('SUPER_ADMIN');
        });
    });
  });

  describe('/api/v1/tenants/:tenantId/verify-access (GET)', () => {
    it('should return 200 when accessing tenant where user is a member', async () => {
      const token = await generateToken('sub-seller-1');

      return request(app.getHttpServer())
        .get('/api/v1/tenants/tenant-diyas/verify-access')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.authorized).toBe(true);
          expect(res.body.tenantId).toBe('tenant-diyas');
          expect(res.body.userRoleInTenant).toBe('STORE_OWNER');
        });
    });

    it('should return 403 when attempting unauthorized cross-tenant access', async () => {
      const token = await generateToken('sub-seller-1');

      return request(app.getHttpServer())
        .get('/api/v1/tenants/other-artisan-store/verify-access')
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.statusCode).toBe(403);
          expect(res.body.error.message).toContain('Cross-tenant access rejected');
        });
    });
  });

  describe('/api/v1/tenants/:tenantId/owner-only (GET)', () => {
    it('should return 200 when STORE_OWNER accesses owner route', async () => {
      const token = await generateToken('sub-seller-1');

      return request(app.getHttpServer())
        .get('/api/v1/tenants/tenant-diyas/owner-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.authorized).toBe(true);
          expect(res.body.role).toBe('STORE_OWNER');
        });
    });

    it('should return 403 when STORE_STAFF accesses owner route', async () => {
      const token = await generateToken('sub-staff-user');

      return request(app.getHttpServer())
        .get('/api/v1/tenants/tenant-diyas/owner-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.statusCode).toBe(403);
          expect(res.body.error.message).toContain('Insufficient store permissions');
        });
    });
  });
});
