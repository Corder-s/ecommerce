import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { generateKeyPair, SignJWT } from 'jose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { SecurityHeadersMiddleware } from '../src/common/middleware/security-headers.middleware';
import { TokenVerificationService } from '../src/modules/auth/token-verifier.service';
import { IdentityService } from '../src/modules/auth/identity.service';
import { AuthenticatedUser } from '../src/modules/auth/interfaces/auth.interface';
import {
  PlatformRole,
  TenantRole,
  UserStatus,
  MembershipStatus,
  TenantStatus,
} from '@prisma/client';

describe('Security Audit & Hardening (Step 14 e2e)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let identityService: IdentityService;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';

  const superAdminId = 'adm-sec-0000-4000-8000-000000000001';
  const storeOwnerId = 'usr-sec-0000-4000-8000-000000000002';
  const customerUserId = 'usr-sec-0000-4000-8000-000000000003';
  const tenantAId = 't-sec-0000-4000-8000-000000000001';

  let superAdminToken: string;
  let storeOwnerToken: string;
  let customerUserToken: string;

  async function createTestJwt(userId: string, email: string): Promise<string> {
    return new SignJWT({
      sub: userId,
      email,
      name: `User ${userId}`,
      iss: ISSUER,
      aud: AUDIENCE,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(testKeyPair.privateKey);
  }

  beforeAll(async () => {
    testKeyPair = await generateKeyPair('RS256');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');

    // Register security middleware
    const securityMiddleware = new SecurityHeadersMiddleware();
    app.use(securityMiddleware.use.bind(securityMiddleware));

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

    // Mock resolveUserFromToken for RBAC verification
    jest
      .spyOn(identityService, 'resolveUserFromToken')
      .mockImplementation(async (payload): Promise<AuthenticatedUser> => {
        if (payload.sub === superAdminId) {
          return {
            id: superAdminId,
            name: 'Security SuperAdmin',
            email: 'secadmin@gaushilp.com',
            platformRole: PlatformRole.SUPER_ADMIN,
            status: UserStatus.ACTIVE,
            memberships: [],
          };
        }
        if (payload.sub === storeOwnerId) {
          return {
            id: storeOwnerId,
            name: 'Store Owner',
            email: 'owner@vedicartisans.com',
            platformRole: PlatformRole.USER,
            status: UserStatus.ACTIVE,
            memberships: [
              {
                id: 'mem-sec-1',
                tenantId: tenantAId,
                role: TenantRole.STORE_OWNER,
                status: MembershipStatus.ACTIVE,
                tenantStatus: TenantStatus.ACTIVE,
              },
            ],
          };
        }
        if (payload.sub === customerUserId) {
          return {
            id: customerUserId,
            name: 'Standard Customer',
            email: 'customer@buyer.com',
            platformRole: PlatformRole.USER,
            status: UserStatus.ACTIVE,
            memberships: [],
          };
        }
        throw new UnauthorizedException('User not found');
      });

    await app.init();

    superAdminToken = await createTestJwt(superAdminId, 'secadmin@gaushilp.com');
    storeOwnerToken = await createTestJwt(storeOwnerId, 'owner@vedicartisans.com');
    customerUserToken = await createTestJwt(customerUserId, 'customer@buyer.com');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. HTTP Security Headers & Disclosure Protection', () => {
    it('should inject mandatory security headers on API responses', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-xss-protection']).toBe('0');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['permissions-policy']).toBeDefined();
    });

    it('should not leak server runtime banner (x-powered-by)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('2. Rate Limiting Protection on Sensitive Endpoints', () => {
    it('should provide X-RateLimit headers and throttle when threshold exceeded', async () => {
      // Endpoint /api/v1/admin/backups/trigger is rate-limited to 5 requests per 300s window
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/admin/backups/trigger')
          .set('Authorization', `Bearer ${superAdminToken}`);
      }

      // The 6th request must be throttled with HTTP 429
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/backups/trigger')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(429);
      expect(JSON.stringify(res.body)).toMatch(/Too Many Requests/i);
      expect(res.headers['retry-after']).toBeDefined();
    });
  });

  describe('3. Role-Based Access Control & Privilege Escalation Prevention', () => {
    it('should reject unauthenticated access to admin backup APIs with 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/admin/backups');
      expect(res.status).toBe(401);
    });

    it('should reject standard customer token with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/backups')
        .set('Authorization', `Bearer ${customerUserToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject store owner token from platform administration with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/backups')
        .set('Authorization', `Bearer ${storeOwnerToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow verified SUPER_ADMIN access to admin backup APIs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/backups')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('4. Webhook Integrity & Signature Validation', () => {
    it('should reject unsigned payment webhook payloads', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/webhooks/payments/sandbox')
        .send({ event: 'payment.captured', payload: {} });

      // Missing signature header must fail
      expect([400, 401]).toContain(res.status);
    });

    it('should reject forged payment webhook signatures', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/webhooks/payments/sandbox')
        .set('x-signature', 'forged_invalid_signature_hex')
        .send({ event: 'payment.captured', payload: {} });

      expect([400, 401]).toContain(res.status);
    });
  });
});
