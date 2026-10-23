import { Test, TestingModule } from '@nestjs/testing';
import { AdminTenantsService } from './admin-tenants.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantStatus, AuditAction } from '@prisma/client';

describe('AdminTenantsService', () => {
  let service: AdminTenantsService;
  let mockPrisma: any;
  let mockAudit: any;

  const mockTenant = {
    id: 'tenant-123',
    businessName: 'Vedic Organic Crafts',
    storeSlug: 'vedic-crafts',
    status: TenantStatus.ACTIVE,
    isPublished: true,
    publishedAt: new Date(),
    currency: 'INR',
    contactEmail: 'vedic@gaushilp.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    subscription: {
      id: 'sub-1',
      status: 'ACTIVE',
      plan: { id: 'p1', name: 'Pro Artisan', slug: 'pro' },
      currentPeriodEnd: new Date(),
    },
    memberships: [],
    _count: { products: 12, orders: 45, memberships: 2, categories: 3 },
  };

  beforeEach(async () => {
    mockPrisma = {
      tenant: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([mockTenant]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'tenant-123') return Promise.resolve(mockTenant);
          return Promise.resolve(null);
        }),
        update: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ ...mockTenant, ...data })),
      },
      paymentRecord: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: 54000 },
        }),
      },
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminTenantsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AdminTenantsService>(AdminTenantsService);
  });

  it('should list tenants with pagination', async () => {
    const res = await service.listTenants({ page: 1, limit: 10 });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].businessName).toBe('Vedic Organic Crafts');
    expect(res.data[0].counts.products).toBe(12);
  });

  it('should get tenant details with metrics', async () => {
    const res = await service.getTenantDetails('tenant-123');
    expect(res.id).toBe('tenant-123');
    expect(res.metrics.collectedRevenue).toBe(54000);
  });

  it('should throw NotFoundException for invalid tenant ID', async () => {
    await expect(service.getTenantDetails('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should suspend tenant and record audit log', async () => {
    const res = await service.updateTenantStatus(
      'admin-1',
      'tenant-123',
      {
        status: TenantStatus.SUSPENDED,
        reason: 'Policy violation',
      },
      { ipAddress: '10.0.0.1' },
    );

    expect(res.status).toBe(TenantStatus.SUSPENDED);
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-123' },
      data: { status: TenantStatus.SUSPENDED },
    });
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-1',
        action: AuditAction.TENANT_SUSPENDED,
        targetId: 'tenant-123',
        reason: 'Policy violation',
      }),
    );
  });

  it('should reactivate suspended tenant and record audit log', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValueOnce({
      ...mockTenant,
      status: TenantStatus.SUSPENDED,
    });

    const res = await service.updateTenantStatus('admin-1', 'tenant-123', {
      status: TenantStatus.ACTIVE,
      reason: 'Dispute resolved',
    });

    expect(res.status).toBe(TenantStatus.ACTIVE);
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.TENANT_REACTIVATED,
      }),
    );
  });

  it('should throw BadRequestException if target status matches current status', async () => {
    await expect(
      service.updateTenantStatus('admin-1', 'tenant-123', {
        status: TenantStatus.ACTIVE,
        reason: 'No change',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
