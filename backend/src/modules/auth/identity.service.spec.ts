import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PlatformRole, TenantRole, MembershipStatus } from '@prisma/client';

describe('IdentityService (External Identity Mapping & Provisioning)', () => {
  let service: IdentityService;

  const mockPrisma: any = {
    userIdentity: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              auth: { provider: 'oidc' },
            }),
          ],
        }),
      ],
      providers: [
        IdentityService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<IdentityService>(IdentityService);
    jest.clearAllMocks();
  });

  it('should resolve user if external identity already exists', async () => {
    const mockUser = {
      id: 'user-uuid-1',
      name: 'Ramesh Sharma',
      email: 'ramesh@example.com',
      phone: '+919876543210',
      platformRole: PlatformRole.USER,
      memberships: [
        {
          id: 'membership-1',
          tenantId: 'tenant-1',
          role: TenantRole.STORE_OWNER,
          status: MembershipStatus.ACTIVE,
        },
      ],
    };

    mockPrisma.userIdentity.findUnique.mockResolvedValue({
      id: 'identity-1',
      userId: 'user-uuid-1',
      provider: 'oidc',
      providerSubject: 'auth0|12345',
      user: mockUser,
    });

    const result = await service.resolveUserFromToken({
      sub: 'auth0|12345',
      email: 'ramesh@example.com',
    });

    expect(result.id).toBe('user-uuid-1');
    expect(result.platformRole).toBe(PlatformRole.USER);
    expect(result.memberships).toHaveLength(1);
    expect(result.memberships[0].role).toBe(TenantRole.STORE_OWNER);
  });

  it('should provision new user on first login with default USER role (never SUPER_ADMIN)', async () => {
    mockPrisma.userIdentity.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    mockPrisma.user.create.mockResolvedValue({
      id: 'new-user-uuid',
      name: 'Suresh New',
      email: 'suresh@example.com',
      platformRole: PlatformRole.USER,
      phone: null,
    });

    const result = await service.resolveUserFromToken({
      sub: 'auth0|new-subject-999',
      email: 'suresh@example.com',
      name: 'Suresh New',
    });

    expect(result.id).toBe('new-user-uuid');
    expect(result.platformRole).toBe(PlatformRole.USER); // Verified: never auto-grants SUPER_ADMIN
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Suresh New',
        email: 'suresh@example.com',
        platformRole: PlatformRole.USER,
      },
    });
    expect(mockPrisma.userIdentity.create).toHaveBeenCalledWith({
      data: {
        userId: 'new-user-uuid',
        provider: 'oidc',
        providerSubject: 'auth0|new-subject-999',
        email: 'suresh@example.com',
      },
    });
  });

  it('should prevent identity hijacking if email is already linked to another identity', async () => {
    mockPrisma.userIdentity.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'victim-user-id',
      email: 'victim@example.com',
      identities: [
        { id: 'existing-identity-id', provider: 'oidc', providerSubject: 'original-sub' },
      ],
    });

    await expect(
      service.resolveUserFromToken({
        sub: 'hacker-sub',
        email: 'victim@example.com',
      }),
    ).rejects.toThrow(
      new UnauthorizedException(
        'An account with this email is already linked to another external identity provider.',
      ),
    );
  });
});
