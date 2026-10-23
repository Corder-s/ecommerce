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
  TenantStatus,
  UserStatus,
  MembershipStatus,
  SubscriptionStatus,
  BillingInterval,
  OrderStatus,
  PaymentRecordStatus,
  Prisma,
} from '@prisma/client';

describe('Super Admin APIs & Platform Analytics (Step 12 e2e)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let identityService: IdentityService;
  let prismaService: PrismaService;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';

  const superAdminId = 'adm-1111-4000-8000-000000000001';
  const otherAdminId = 'adm-2222-4000-8000-000000000002';
  const sellerOwnerId = 'usr-owner-4000-8000-000000000001';
  const staffUserId = 'usr-staff-4000-8000-000000000001';
  const customerUserId = 'usr-cust-4000-8000-000000000001';
  const suspendedUserId = 'usr-susp-4000-8000-000000000001';

  const tenantAId = 't-active-0000-4000-8000-000000000001';
  const tenantSuspendedId = 't-susp-0000-4000-8000-000000000002';

  let superAdminToken: string;
  let sellerOwnerToken: string;
  let staffUserToken: string;
  let customerUserToken: string;
  let suspendedUserToken: string;
  let ownerOfSuspendedTenantToken: string;

  const inMemoryAuditLogs: any[] = [];

  const mockTenants = [
    {
      id: tenantAId,
      name: 'Vedic Dhoop & Ghee',
      slug: 'vedic-dhoop',
      storeSlug: 'vedic-dhoop',
      businessName: 'Vedic Dhoop Artisans',
      contactEmail: 'contact@vedicdhoop.com',
      contactPhone: '+919876543210',
      address: 'Vrindavan, UP',
      currency: 'INR',
      status: TenantStatus.ACTIVE,
      isPublished: true,
      publishedAt: new Date('2026-09-02T10:00:00Z'),
      suspendedAt: null,
      suspensionReason: null,
      createdAt: new Date('2026-09-01T10:00:00Z'),
      updatedAt: new Date('2026-09-01T10:00:00Z'),
      subscription: {
        id: 'sub-tenant-a',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date('2026-10-01T00:00:00Z'),
        currentPeriodEnd: new Date('2026-11-01T00:00:00Z'),
        cancelAtPeriodEnd: false,
        billingInterval: BillingInterval.MONTHLY,
        plan: {
          id: 'plan-growth',
          name: 'Growth Gaushala',
          slug: 'growth',
          priceMonthly: new Prisma.Decimal(999),
          priceAnnual: new Prisma.Decimal(9990),
        },
        invoices: [],
      },
      memberships: [
        {
          id: 'm1',
          role: TenantRole.STORE_OWNER,
          status: MembershipStatus.ACTIVE,
          createdAt: new Date(),
          user: { id: sellerOwnerId, name: 'Gopal Owner', email: 'owner@vedicdhoop.com' },
        },
      ],
      _count: {
        memberships: 1,
        products: 45,
        orders: 120,
        categories: 5,
      },
    },
    {
      id: tenantSuspendedId,
      name: 'Suspended Enterprise',
      slug: 'suspended-store',
      storeSlug: 'suspended-store',
      businessName: 'Suspended Enterprise Pvt Ltd',
      contactEmail: 'contact@suspended.com',
      contactPhone: null,
      address: null,
      currency: 'INR',
      status: TenantStatus.SUSPENDED,
      isPublished: false,
      publishedAt: null,
      suspendedAt: new Date('2026-10-15T12:00:00Z'),
      suspensionReason: 'Terms of Service policy violation',
      createdAt: new Date('2026-08-01T10:00:00Z'),
      updatedAt: new Date('2026-10-15T12:00:00Z'),
      subscription: null,
      memberships: [],
      _count: {
        memberships: 1,
        products: 10,
        orders: 5,
        categories: 1,
      },
    },
  ];

  const mockUsers = [
    {
      id: superAdminId,
      email: 'superadmin@gaushilp.com',
      name: 'Root Platform Admin',
      phone: '+919876543210',
      platformRole: PlatformRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      suspendedAt: null,
      suspensionReason: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      memberships: [],
      _count: { memberships: 0, orders: 0, payments: 0, notifications: 0 },
    },
    {
      id: otherAdminId,
      email: 'admin2@gaushilp.com',
      name: 'Second Super Admin',
      phone: null,
      platformRole: PlatformRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      suspendedAt: null,
      suspensionReason: null,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
      memberships: [],
      _count: { memberships: 0, orders: 0, payments: 0, notifications: 0 },
    },
    {
      id: sellerOwnerId,
      email: 'owner@vedicdhoop.com',
      name: 'Gopal Owner',
      phone: '+919988776655',
      platformRole: PlatformRole.USER,
      status: UserStatus.ACTIVE,
      suspendedAt: null,
      suspensionReason: null,
      createdAt: new Date('2026-09-01T10:00:00Z'),
      updatedAt: new Date('2026-09-01T10:00:00Z'),
      memberships: [
        {
          id: 'mem-owner-1',
          tenantId: tenantAId,
          role: TenantRole.STORE_OWNER,
          status: MembershipStatus.ACTIVE,
          tenant: {
            id: tenantAId,
            name: 'Vedic Dhoop & Ghee',
            slug: 'vedic-dhoop',
            status: TenantStatus.ACTIVE,
          },
        },
      ],
      _count: { memberships: 1, orders: 12, payments: 12, notifications: 4 },
    },
    {
      id: staffUserId,
      email: 'staff@vedicdhoop.com',
      name: 'Sita Staff',
      phone: null,
      platformRole: PlatformRole.USER,
      status: UserStatus.ACTIVE,
      suspendedAt: null,
      suspensionReason: null,
      createdAt: new Date('2026-09-05T10:00:00Z'),
      updatedAt: new Date('2026-09-05T10:00:00Z'),
      memberships: [
        {
          id: 'mem-staff-1',
          tenantId: tenantAId,
          role: TenantRole.STORE_STAFF,
          status: MembershipStatus.ACTIVE,
          tenant: {
            id: tenantAId,
            name: 'Vedic Dhoop & Ghee',
            slug: 'vedic-dhoop',
            status: TenantStatus.ACTIVE,
          },
        },
      ],
      _count: { memberships: 1, orders: 0, payments: 0, notifications: 1 },
    },
    {
      id: customerUserId,
      email: 'customer@buyer.com',
      name: 'Arjun Customer',
      phone: null,
      platformRole: PlatformRole.USER,
      status: UserStatus.ACTIVE,
      suspendedAt: null,
      suspensionReason: null,
      createdAt: new Date('2026-09-10T10:00:00Z'),
      updatedAt: new Date('2026-09-10T10:00:00Z'),
      memberships: [],
      _count: { memberships: 0, orders: 3, payments: 3, notifications: 2 },
    },
    {
      id: suspendedUserId,
      email: 'suspended.user@example.com',
      name: 'Banned Bad Actor',
      phone: null,
      platformRole: PlatformRole.USER,
      status: UserStatus.SUSPENDED,
      suspendedAt: new Date('2026-10-10T10:00:00Z'),
      suspensionReason: 'Fraudulent activity detected',
      createdAt: new Date('2026-08-10T10:00:00Z'),
      updatedAt: new Date('2026-10-10T10:00:00Z'),
      memberships: [],
      _count: { memberships: 0, orders: 0, payments: 0, notifications: 0 },
    },
  ];

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

    // Mock resolveUserFromToken
    jest.spyOn(identityService, 'resolveUserFromToken').mockImplementation(async (payload) => {
      const user = mockUsers.find((u) => u.id === payload.sub);
      if (user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          platformRole: user.platformRole,
          status: user.status,
          memberships: user.memberships.map((m) => ({
            id: m.id,
            tenantId: m.tenantId,
            role: m.role,
            status: m.status,
            tenantStatus: m.tenant?.status,
          })),
        };
      }
      if (payload.sub === 'usr-owner-suspended-tenant') {
        return {
          id: 'usr-owner-suspended-tenant',
          name: 'Owner of Suspended Store',
          email: 'owner@suspended.com',
          platformRole: PlatformRole.USER,
          status: UserStatus.ACTIVE,
          memberships: [
            {
              id: 'mem-susp-store',
              tenantId: tenantSuspendedId,
              role: TenantRole.STORE_OWNER,
              status: MembershipStatus.ACTIVE,
              tenantStatus: TenantStatus.SUSPENDED,
            },
          ],
        };
      }
      return {
        id: 'anon-user',
        name: 'Anon',
        email: 'anon@example.com',
        platformRole: PlatformRole.USER,
        status: UserStatus.ACTIVE,
        memberships: [],
      };
    });

    // Mock AuditLog creation & query
    jest.spyOn(prismaService.auditLog, 'create').mockImplementation(((args: any) => {
      const data = args.data;
      const actorId = data.actorUserId || data.actorId;
      const entry = {
        id: `audit-${inMemoryAuditLogs.length + 1}`,
        actorId,
        actorUserId: actorId,
        actorType: data.actorType,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason || null,
        metadata: data.metadata || null,
        createdAt: new Date(),
        actor: mockUsers.find((u) => u.id === actorId) || null,
      };
      inMemoryAuditLogs.push(entry);
      return Promise.resolve(entry);
    }) as any);

    jest.spyOn(prismaService.auditLog, 'findMany').mockImplementation(((args?: any) => {
      const where = args?.where;
      const skip = args?.skip || 0;
      const take = args?.take || 20;
      const results = inMemoryAuditLogs.filter((log) => {
        if (where?.action && log.action !== where.action) return false;
        if (where?.actorId && log.actorId !== where.actorId) return false;
        if (where?.targetType && log.targetType !== where.targetType) return false;
        return true;
      });
      return Promise.resolve(results.slice(skip, skip + take));
    }) as any);

    jest.spyOn(prismaService.auditLog, 'count').mockImplementation(((args?: any) => {
      const where = args?.where;
      const results = inMemoryAuditLogs.filter((log) => {
        if (where?.action && log.action !== where.action) return false;
        if (where?.actorId && log.actorId !== where.actorId) return false;
        return true;
      });
      return Promise.resolve(results.length);
    }) as any);

    // Mock Tenant queries
    jest.spyOn(prismaService.tenant, 'findMany').mockImplementation(((args?: any) => {
      const skip = args?.skip || 0;
      const take = args?.take || 20;
      const where = args?.where;
      const filtered = mockTenants.filter((t) => {
        if (where?.status && t.status !== where.status) return false;
        if (where?.OR) {
          const search = where.OR[0]?.businessName?.contains?.toLowerCase();
          if (search && !t.businessName.toLowerCase().includes(search)) return false;
        }
        return true;
      });
      return Promise.resolve(filtered.slice(skip, skip + take));
    }) as any);

    jest.spyOn(prismaService.tenant, 'count').mockImplementation(((args?: any) => {
      const where = args?.where;
      const filtered = mockTenants.filter((t) => {
        if (where?.status && t.status !== where.status) return false;
        if (where?.isPublished !== undefined && t.isPublished !== where.isPublished) return false;
        return true;
      });
      return Promise.resolve(filtered.length);
    }) as any);

    jest.spyOn(prismaService.tenant, 'findUnique').mockImplementation(((args: any) => {
      const where = args?.where;
      const found = mockTenants.find((t) => t.id === where?.id);
      return Promise.resolve(found || null);
    }) as any);

    jest.spyOn(prismaService.tenant, 'update').mockImplementation(((args: any) => {
      const where = args?.where;
      const data = args?.data;
      const found = mockTenants.find((t) => t.id === where?.id);
      if (!found) return Promise.resolve(null);
      Object.assign(found, data);
      return Promise.resolve(found);
    }) as any);

    // Mock User queries
    jest.spyOn(prismaService.user, 'findMany').mockImplementation(((args?: any) => {
      const skip = args?.skip || 0;
      const take = args?.take || 20;
      const where = args?.where;
      const filtered = mockUsers.filter((u) => {
        if (where?.status && u.status !== where.status) return false;
        if (where?.platformRole && u.platformRole !== where.platformRole) return false;
        if (where?.OR) {
          const search = where.OR[0]?.email?.contains?.toLowerCase();
          if (search && !u.email.toLowerCase().includes(search)) return false;
        }
        return true;
      });
      return Promise.resolve(filtered.slice(skip, skip + take));
    }) as any);

    jest.spyOn(prismaService.user, 'count').mockImplementation(((args?: any) => {
      const where = args?.where;
      const filtered = mockUsers.filter((u) => {
        if (where?.status && u.status !== where.status) return false;
        return true;
      });
      return Promise.resolve(filtered.length);
    }) as any);

    jest.spyOn(prismaService.user, 'findUnique').mockImplementation(((args: any) => {
      const where = args?.where;
      const found = mockUsers.find((u) => u.id === where?.id || u.email === where?.email);
      return Promise.resolve(found || null);
    }) as any);

    jest.spyOn(prismaService.user, 'update').mockImplementation(((args: any) => {
      const where = args?.where;
      const data = args?.data;
      const found = mockUsers.find((u) => u.id === where?.id);
      if (!found) return Promise.resolve(null);
      Object.assign(found, data);
      return Promise.resolve(found);
    }) as any);

    // Mock Subscription queries
    jest.spyOn(prismaService.subscription, 'findMany').mockResolvedValue([
      {
        id: 'sub-tenant-a',
        tenantId: tenantAId,
        planId: 'plan-growth',
        status: SubscriptionStatus.ACTIVE,
        billingInterval: BillingInterval.MONTHLY,
        currentPeriodStart: new Date('2026-10-01T00:00:00Z'),
        currentPeriodEnd: new Date('2026-11-01T00:00:00Z'),
        cancelAtPeriodEnd: false,
        tenant: { id: tenantAId, businessName: 'Vedic Dhoop Artisans', slug: 'vedic-dhoop' },
        plan: {
          id: 'plan-growth',
          name: 'Growth Gaushala',
          slug: 'growth',
          priceMonthly: new Prisma.Decimal(999),
          priceAnnual: new Prisma.Decimal(9990),
        },
        invoices: [],
      },
    ] as any);

    jest.spyOn(prismaService.subscription, 'count').mockImplementation((() => {
      return Promise.resolve(1);
    }) as any);

    jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue({
      id: 'sub-tenant-a',
      tenantId: tenantAId,
      status: SubscriptionStatus.ACTIVE,
      billingInterval: BillingInterval.MONTHLY,
      plan: {
        id: 'plan-growth',
        name: 'Growth Gaushala',
        slug: 'growth',
        priceMonthly: new Prisma.Decimal(999),
      },
      tenant: { id: tenantAId, businessName: 'Vedic Dhoop Artisans' },
      invoices: [],
    } as any);

    jest.spyOn(prismaService.subscriptionPlan, 'findMany').mockResolvedValue([
      {
        id: 'plan-growth',
        name: 'Growth Gaushala',
        slug: 'growth',
        priceMonthly: new Prisma.Decimal(999),
        priceAnnual: new Prisma.Decimal(9990),
        _count: { subscriptions: 1 },
      },
    ] as any);

    jest.spyOn(prismaService.subscriptionInvoice, 'aggregate').mockResolvedValue({
      _sum: { amount: 1998 },
    } as any);

    // Mock Analytics / Orders / Payments queries
    jest.spyOn(prismaService.order, 'aggregate').mockResolvedValue({
      _sum: { totalAmount: new Prisma.Decimal(125000) },
      _avg: { totalAmount: new Prisma.Decimal(1041.67) },
      _count: { id: 120 },
    } as any);

    jest.spyOn(prismaService.order, 'count').mockResolvedValue(125);
    jest.spyOn(prismaService.order, 'findMany').mockResolvedValue([
      {
        id: 'o-1',
        status: OrderStatus.DELIVERED,
        totalAmount: new Prisma.Decimal(1000),
        createdAt: new Date('2026-10-01T12:00:00Z'),
      },
    ] as any);

    jest.spyOn(prismaService.paymentRecord, 'aggregate').mockImplementation(((args?: any) => {
      const where = args?.where;
      if (where?.status === PaymentRecordStatus.FAILED) {
        return Promise.resolve({ _count: { id: 5 }, _sum: { amount: new Prisma.Decimal(5000) } });
      }
      return Promise.resolve({ _count: { id: 115 }, _sum: { amount: new Prisma.Decimal(120000) } });
    }) as any);

    jest.spyOn(prismaService.paymentRecord, 'count').mockImplementation(((args?: any) => {
      const where = args?.where;
      if (where?.status === PaymentRecordStatus.FAILED) return Promise.resolve(5);
      return Promise.resolve(120);
    }) as any);

    jest.spyOn(prismaService.refundRecord, 'aggregate').mockResolvedValue({
      _count: { id: 2 },
      _sum: { amount: new Prisma.Decimal(2500) },
    } as any);

    jest.spyOn(prismaService.outboxEvent, 'count').mockResolvedValue(0);

    // Mock raw query for DB health probe
    jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([{ ok: 1 }] as any);

    await app.init();

    const generateToken = async (sub: string) => {
      return new SignJWT({ sub })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime('2h')
        .sign(testKeyPair.privateKey);
    };

    superAdminToken = await generateToken(superAdminId);
    sellerOwnerToken = await generateToken(sellerOwnerId);
    staffUserToken = await generateToken(staffUserId);
    customerUserToken = await generateToken(customerUserId);
    suspendedUserToken = await generateToken(suspendedUserId);
    ownerOfSuspendedTenantToken = await generateToken('usr-owner-suspended-tenant');
  });

  afterAll(async () => {
    await app.close();
  });

  // ===========================================================================
  // 1. Super Admin Access Control & RBAC
  // ===========================================================================
  describe('Super Admin Access Control & Role Enforcement', () => {
    it('should reject unauthenticated requests to /api/v1/admin/tenants with 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/admin/tenants');
      expect(res.status).toBe(401);
    });

    it('should reject STORE_OWNER from accessing /api/v1/admin/tenants with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/tenants')
        .set('Authorization', `Bearer ${sellerOwnerToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject STORE_STAFF from accessing /api/v1/admin/users with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${staffUserToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject CUSTOMER from accessing /api/v1/admin/analytics/overview with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/analytics/overview')
        .set('Authorization', `Bearer ${customerUserToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated requests to /api/v1/admin/health with 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/admin/health');
      expect(res.status).toBe(401);
    });

    it('should reject regular users from accessing /api/v1/admin/health with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/health')
        .set('Authorization', `Bearer ${sellerOwnerToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow verified SUPER_ADMIN to access administrative routes with 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ===========================================================================
  // 2. Tenant Management & Suspension Enforcement
  // ===========================================================================
  describe('Tenant Administration & Suspension Enforcement', () => {
    it('GET /api/v1/admin/tenants - should list tenants with pagination and status filters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/tenants?page=1&limit=10&status=ACTIVE')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/admin/tenants/:tenantId - should return full tenant details with stats', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/tenants/${tenantAId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(tenantAId);
      expect(res.body.businessName).toBe('Vedic Dhoop Artisans');
      expect(res.body.subscription).toBeDefined();
      expect(res.body.metrics.orderCount).toBe(120);
    });

    it('PATCH /api/v1/admin/tenants/:tenantId/status - should suspend active tenant and record audit log', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/tenants/${tenantAId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: TenantStatus.SUSPENDED,
          reason: 'Severe compliance infringement reported',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(TenantStatus.SUSPENDED);
      expect(res.body.message).toContain('status successfully changed');

      // Verify audit log entry
      const logged = inMemoryAuditLogs.find(
        (l) => l.action === 'TENANT_SUSPENDED' && l.targetId === tenantAId,
      );
      expect(logged).toBeDefined();
      expect(logged.actorId).toBe(superAdminId);
      expect(logged.reason).toBe('Severe compliance infringement reported');
    });

    it('PATCH /api/v1/admin/tenants/:tenantId/status - should reactivate suspended tenant and record audit log', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/tenants/${tenantAId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: TenantStatus.ACTIVE,
          reason: 'Compliance audit cleared successfully',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(TenantStatus.ACTIVE);

      const logged = inMemoryAuditLogs.find(
        (l) => l.action === 'TENANT_REACTIVATED' && l.targetId === tenantAId,
      );
      expect(logged).toBeDefined();
    });

    it('TenantAccessGuard - should reject store owner operations when tenant is suspended', async () => {
      // Calling tenant access verification endpoint with token for suspended tenant
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantSuspendedId}/verify-access`)
        .set('Authorization', `Bearer ${ownerOfSuspendedTenantToken}`);

      // TenantAccessGuard throws 403 Forbidden
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('is suspended by platform administration');
    });
  });

  // ===========================================================================
  // 3. Platform User Management & Self-Lockout Defense
  // ===========================================================================
  describe('Platform User Management & Security Controls', () => {
    it('GET /api/v1/admin/users - should list platform users with safe fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
      // Ensure passwordHash is never returned
      res.body.data.forEach((u: any) => {
        expect(u.passwordHash).toBeUndefined();
      });
    });

    it('GET /api/v1/admin/users/:userId - should return user details with memberships', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${sellerOwnerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(sellerOwnerId);
      expect(res.body.tenantMemberships.length).toBe(1);
    });

    it('PATCH /api/v1/admin/users/:userId/status - should reject self-lockout when admin suspends self', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${superAdminId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: UserStatus.SUSPENDED,
          reason: 'Accidental self-lockout attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Self-lockout protection');
    });

    it('PATCH /api/v1/admin/users/:userId/status - should reject suspending another SUPER_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${otherAdminId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: UserStatus.SUSPENDED,
          reason: 'Attempting to disable peer administrator',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Cannot suspend another Super Admin');
    });

    it('PATCH /api/v1/admin/users/:userId/status - should suspend regular user and record audit log', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${customerUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: UserStatus.SUSPENDED,
          reason: 'Abusive automated bot behavior',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(UserStatus.SUSPENDED);

      const logged = inMemoryAuditLogs.find(
        (l) => l.action === 'USER_SUSPENDED' && l.targetId === customerUserId,
      );
      expect(logged).toBeDefined();
      expect(logged.reason).toBe('Abusive automated bot behavior');
    });

    it('JwtAuthGuard - should reject authentication when user account is suspended', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${suspendedUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('user account has been suspended');
    });
  });

  // ===========================================================================
  // 4. SaaS Subscription Administration
  // ===========================================================================
  describe('SaaS Subscription Administration', () => {
    it('GET /api/v1/admin/subscriptions - should list subscriptions with filters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/subscriptions?status=ACTIVE')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].plan.name).toBe('Growth Gaushala');
    });

    it('GET /api/v1/admin/subscriptions/:subscriptionId - should return subscription details', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/subscriptions/sub-tenant-a')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('sub-tenant-a');
    });

    it('GET /api/v1/admin/subscription-summary - should return aggregated platform subscription metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/subscription-summary')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.statusBreakdown.active).toBe(1);
      expect(res.body.planDistribution.length).toBe(1);
      expect(res.body.revenueMetrics.totalInvoicedPaidRevenue).toBe(1998);
    });
  });

  // ===========================================================================
  // 5. Platform Analytics & Date Range Validation
  // ===========================================================================
  describe('Platform Analytics & Aggregations', () => {
    it('GET /api/v1/admin/analytics/overview - should return comprehensive platform KPI dashboard', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/analytics/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.tenants).toBeDefined();
      expect(res.body.orders.grossOrderValue).toBe(125000);
      expect(res.body.payments.collectedRevenue).toBe(120000);
      expect(res.body.payments.refundedAmount).toBe(2500);
      expect(res.body.payments.netRevenue).toBe(117500);
      expect(res.body.subscriptions.subscriptionInvoicedRevenue).toBe(1998);
    });

    it('GET /api/v1/admin/analytics/payments - should compute failure rates and net revenues accurately', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/analytics/payments')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.totalAttempts).toBe(120);
      expect(res.body.successfulAmount).toBe(120000);
      expect(res.body.refundedAmount).toBe(2500);
      expect(res.body.failedCount).toBe(5);
      expect(res.body.failureRatePercentage).toBeCloseTo(4.17, 1);
    });

    it('Analytics Query - should reject inverted date range with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/api/v1/admin/analytics/orders?startDate=2026-10-20T00:00:00Z&endDate=2026-10-01T00:00:00Z',
        )
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cannot be later than');
    });

    it('Analytics Query - should reject date range exceeding 365 days with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/api/v1/admin/analytics/orders?startDate=2024-01-01T00:00:00Z&endDate=2026-01-01T00:00:00Z',
        )
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cannot exceed 365 days');
    });
  });

  // ===========================================================================
  // 6. System Health Monitoring
  // ===========================================================================
  describe('System Health Monitoring Endpoints', () => {
    it('GET /api/v1/admin/health - should report runtime operational telemetry without leaking secrets', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/health')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(res.body.memory.heapUsedMb).toBeGreaterThan(0);
      // Verify no passwords, env variables, or connection strings are present
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('postgresql://');
      expect(bodyStr).not.toContain('DATABASE_URL');
      expect(bodyStr).not.toContain('SECRET');
    });

    it('GET /api/v1/admin/health/database - should verify database responsiveness', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/health/database')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.connected).toBe(true);
      expect(res.body.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/v1/admin/health/queues - should report queue health and dead letter counters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/health/queues')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.deadLetterEventsCount).toBe(0);
    });
  });

  // ===========================================================================
  // 7. Audit Log Inspection
  // ===========================================================================
  describe('Platform Audit Log Retrieval', () => {
    it('GET /api/v1/admin/audit-logs - should list administrative audit records', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/admin/audit-logs - should filter by action', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs?action=TENANT_SUSPENDED')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((l: any) => l.action === 'TENANT_SUSPENDED')).toBe(true);
    });
  });
});
