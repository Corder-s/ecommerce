import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditAction } from '@prisma/client';

describe('AuditService', () => {
  let service: AuditService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      auditLog: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'audit-123',
            ...data,
            createdAt: new Date(),
          }),
        ),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'audit-123',
            actorUserId: 'admin-1',
            action: AuditAction.TENANT_SUSPENDED,
            targetType: 'TENANT',
            targetId: 'tenant-1',
            reason: 'Policy violation',
            createdAt: new Date(),
            actor: {
              id: 'admin-1',
              name: 'Super Admin',
              email: 'admin@gaushilp.com',
              platformRole: 'SUPER_ADMIN',
            },
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should record an audit log with sanitized metadata', async () => {
    const res = await service.log({
      actorUserId: 'admin-1',
      action: AuditAction.TENANT_SUSPENDED,
      targetType: 'TENANT',
      targetId: 'tenant-1',
      reason: 'Repeated copyright infringement',
      metadata: {
        storeSlug: 'artisan-store',
        password: 'secret_plaintext_password',
        authorizationToken: 'Bearer eyJhbGciOi...',
        nested: {
          apiKey: 'secret_key_123',
          safeField: 'normal_value',
        },
      },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(res).toBeDefined();
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();

    const callArg = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(callArg.data.metadata.password).toBe('[REDACTED]');
    expect(callArg.data.metadata.authorizationToken).toBe('[REDACTED]');
    expect(callArg.data.metadata.nested.apiKey).toBe('[REDACTED]');
    expect(callArg.data.metadata.nested.safeField).toBe('normal_value');
    expect(callArg.data.metadata.storeSlug).toBe('artisan-store');
  });

  it('should handle database errors gracefully without throwing', async () => {
    mockPrisma.auditLog.create.mockRejectedValueOnce(new Error('DB connection failure'));

    const res = await service.log({
      actorUserId: 'admin-1',
      action: AuditAction.USER_SUSPENDED,
      targetType: 'USER',
      targetId: 'user-1',
      reason: 'Abusive behaviour',
    });

    expect(res).toBeNull();
  });

  it('should retrieve paginated audit logs', async () => {
    const result = await service.findMany({
      action: AuditAction.TENANT_SUSPENDED,
      page: 1,
      limit: 10,
    });

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.data[0].actor.email).toBe('admin@gaushilp.com');
  });
});
