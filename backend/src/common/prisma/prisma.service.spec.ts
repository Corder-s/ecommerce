import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { PlatformRole, TenantRole, TenantStatus, MembershipStatus, Prisma } from '@prisma/client';

describe('PrismaService & Database Model Specifications', () => {
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prismaService.$disconnect();
  });

  it('PrismaService should be defined and inherit PrismaClient methods', () => {
    expect(prismaService).toBeDefined();
    expect(typeof prismaService.$connect).toBe('function');
    expect(typeof prismaService.$disconnect).toBe('function');
    expect(prismaService.user).toBeDefined();
    expect(prismaService.tenant).toBeDefined();
    expect(prismaService.tenantMembership).toBeDefined();
  });

  describe('Enum & Role Type Assertions', () => {
    it('should define PlatformRole enum with SUPER_ADMIN and USER', () => {
      expect(PlatformRole.SUPER_ADMIN).toBe('SUPER_ADMIN');
      expect(PlatformRole.USER).toBe('USER');
    });

    it('should define TenantRole enum with all required roles', () => {
      expect(TenantRole.STORE_OWNER).toBe('STORE_OWNER');
      expect(TenantRole.STORE_MANAGER).toBe('STORE_MANAGER');
      expect(TenantRole.STORE_STAFF).toBe('STORE_STAFF');
      expect(TenantRole.CUSTOMER).toBe('CUSTOMER');
    });

    it('should define TenantStatus and MembershipStatus enums', () => {
      expect(TenantStatus.ACTIVE).toBe('ACTIVE');
      expect(TenantStatus.SUSPENDED).toBe('SUSPENDED');
      expect(TenantStatus.PENDING).toBe('PENDING');

      expect(MembershipStatus.ACTIVE).toBe('ACTIVE');
      expect(MembershipStatus.INVITED).toBe('INVITED');
      expect(MembershipStatus.SUSPENDED).toBe('SUSPENDED');
    });
  });

  describe('Data Model Validation and Constraint Logic', () => {
    it('should validate User model schema definition and fields', () => {
      const userDelegate = prismaService.user;
      expect(userDelegate).toBeDefined();
      expect(typeof userDelegate.create).toBe('function');
      expect(typeof userDelegate.findUnique).toBe('function');

      // Model runtime metadata verification from Prisma DMMF / model delegates
      const dmmf = Prisma.dmmf;
      const userModel = dmmf.datamodel.models.find((m) => m.name === 'User');
      expect(userModel).toBeDefined();

      const fieldNames = userModel?.fields.map((f) => f.name);
      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('email');
      expect(fieldNames).toContain('phone');
      expect(fieldNames).toContain('platformRole');
      expect(fieldNames).toContain('createdAt');
      expect(fieldNames).toContain('updatedAt');
      expect(fieldNames).toContain('memberships');

      // Unique constraint on email
      const emailField = userModel?.fields.find((f) => f.name === 'email');
      expect(emailField?.isUnique).toBe(true);
    });

    it('should validate Tenant model schema definition and unique storeSlug', () => {
      const dmmf = Prisma.dmmf;
      const tenantModel = dmmf.datamodel.models.find((m) => m.name === 'Tenant');
      expect(tenantModel).toBeDefined();

      const fieldNames = tenantModel?.fields.map((f) => f.name);
      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('businessName');
      expect(fieldNames).toContain('storeSlug');
      expect(fieldNames).toContain('status');
      expect(fieldNames).toContain('memberships');

      // Unique constraint on storeSlug
      const slugField = tenantModel?.fields.find((f) => f.name === 'storeSlug');
      expect(slugField?.isUnique).toBe(true);
    });

    it('should enforce TenantMembership foreign keys and duplicate prevention constraint', () => {
      const dmmf = Prisma.dmmf;
      const membershipModel = dmmf.datamodel.models.find((m) => m.name === 'TenantMembership');
      expect(membershipModel).toBeDefined();

      // Compound unique constraint on [userId, tenantId] prevents duplicate memberships in same tenant
      const uniqueKeyFields = membershipModel?.uniqueFields;
      expect(uniqueKeyFields).toEqual(expect.arrayContaining([['userId', 'tenantId']]));

      // Verify foreign key relations to User and Tenant
      const userRelation = membershipModel?.fields.find((f) => f.name === 'user');
      const tenantRelation = membershipModel?.fields.find((f) => f.name === 'tenant');

      expect(userRelation?.relationFromFields).toContain('userId');
      expect(tenantRelation?.relationFromFields).toContain('tenantId');
    });

    it('should allow in-memory membership simulation for multiple tenants without duplicate collisions', () => {
      interface MockMembership {
        userId: string;
        tenantId: string;
        role: TenantRole;
      }

      const memberships: MockMembership[] = [];

      const addMembership = (item: MockMembership) => {
        const exists = memberships.some(
          (m) => m.userId === item.userId && m.tenantId === item.tenantId,
        );
        if (exists) {
          throw new Error('Unique constraint violation: userId_tenantId already exists');
        }
        memberships.push(item);
      };

      const userA = 'user-uuid-1';
      const tenantA = 'tenant-uuid-1';
      const tenantB = 'tenant-uuid-2';

      // 1. User belongs to Tenant A as STORE_OWNER
      addMembership({ userId: userA, tenantId: tenantA, role: TenantRole.STORE_OWNER });
      expect(memberships).toHaveLength(1);

      // 2. Same user belongs to Tenant B as CUSTOMER (multi-tenant allowed)
      addMembership({ userId: userA, tenantId: tenantB, role: TenantRole.CUSTOMER });
      expect(memberships).toHaveLength(2);

      // 3. Duplicate membership for same user in Tenant A must fail
      expect(() => {
        addMembership({ userId: userA, tenantId: tenantA, role: TenantRole.STORE_MANAGER });
      }).toThrow('Unique constraint violation: userId_tenantId already exists');
    });
  });
});
