import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserStatus, PlatformRole, AuditAction } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let mockPrisma: any;
  let mockAudit: any;

  const mockAdmin: AuthenticatedUser = {
    id: 'admin-1',
    name: 'Super Admin',
    email: 'admin@gaushilp.com',
    platformRole: PlatformRole.SUPER_ADMIN,
    memberships: [],
  };

  const mockTargetUser = {
    id: 'user-123',
    name: 'Artisan Ram',
    email: 'ram@gaushilp.com',
    phone: '+919876543210',
    platformRole: PlatformRole.USER,
    status: UserStatus.ACTIVE,
    suspendedAt: null,
    suspensionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customerProfile: null,
    memberships: [],
    _count: { orders: 3, payments: 3, notifications: 5, memberships: 1 },
  };

  beforeEach(async () => {
    mockPrisma = {
      user: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([mockTargetUser]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-123') return Promise.resolve(mockTargetUser);
          if (where.id === 'admin-2') {
            return Promise.resolve({
              ...mockTargetUser,
              id: 'admin-2',
              platformRole: PlatformRole.SUPER_ADMIN,
            });
          }
          return Promise.resolve(null);
        }),
        update: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ ...mockTargetUser, ...data })),
      },
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
  });

  it('should list users with pagination', async () => {
    const res = await service.listUsers({ page: 1, limit: 10 });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].email).toBe('ram@gaushilp.com');
  });

  it('should get user details', async () => {
    const res = await service.getUserDetails('user-123');
    expect(res.id).toBe('user-123');
    expect(res.metrics.totalOrders).toBe(3);
  });

  it('should throw NotFoundException if user is not found', async () => {
    await expect(service.getUserDetails('unknown-user')).rejects.toThrow(NotFoundException);
  });

  it('should prevent self-lockout when admin tries to suspend own account', async () => {
    await expect(
      service.updateUserStatus(mockAdmin, 'admin-1', {
        status: UserStatus.SUSPENDED,
        reason: 'Accidental self-ban',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should prevent suspending another Super Admin account', async () => {
    await expect(
      service.updateUserStatus(mockAdmin, 'admin-2', {
        status: UserStatus.SUSPENDED,
        reason: 'Attempted takeover',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should suspend standard user and record audit log', async () => {
    const res = await service.updateUserStatus(mockAdmin, 'user-123', {
      status: UserStatus.SUSPENDED,
      reason: 'Terms violation',
    });

    expect(res.status).toBe(UserStatus.SUSPENDED);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          status: UserStatus.SUSPENDED,
          suspensionReason: 'Terms violation',
        }),
      }),
    );
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-1',
        action: AuditAction.USER_SUSPENDED,
        targetId: 'user-123',
        reason: 'Terms violation',
      }),
    );
  });
});
