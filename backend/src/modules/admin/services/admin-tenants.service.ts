import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantQueryDto } from '../dto/tenant-query.dto';
import { UpdateTenantStatusDto } from '../dto/update-tenant-status.dto';
import { TenantStatus, AuditAction, Prisma } from '@prisma/client';

@Injectable()
export class AdminTenantsService {
  private readonly logger = new Logger(AdminTenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves a paginated list of tenants for Super Admin management.
   */
  async listTenants(query: TenantQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TenantWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { businessName: { contains: query.search, mode: 'insensitive' } },
        { storeSlug: { contains: query.search, mode: 'insensitive' } },
        { contactEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, tenants] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: {
              plan: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          _count: {
            select: {
              products: true,
              orders: true,
              memberships: true,
            },
          },
        },
      }),
    ]);

    return {
      data: tenants.map((t) => ({
        id: t.id,
        businessName: t.businessName,
        storeSlug: t.storeSlug,
        status: t.status,
        isPublished: t.isPublished,
        publishedAt: t.publishedAt,
        currency: t.currency,
        contactEmail: t.contactEmail,
        contactPhone: t.contactPhone,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        subscription: t.subscription
          ? {
              id: t.subscription.id,
              status: t.subscription.status,
              planName: t.subscription.plan.name,
              planSlug: t.subscription.plan.slug,
              currentPeriodEnd: t.subscription.currentPeriodEnd,
            }
          : null,
        counts: {
          products: t._count.products,
          orders: t._count.orders,
          staffMembers: t._count.memberships,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves full details for a single tenant, including owner memberships,
   * subscription history, and aggregate revenue.
   */
  async getTenantDetails(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                platformRole: true,
                status: true,
              },
            },
          },
        },
        subscription: {
          include: {
            plan: true,
            invoices: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
            categories: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${tenantId}" was not found.`);
    }

    // Calculate revenue aggregate for this tenant from succeeded payments
    const revenueAggregate = await this.prisma.paymentRecord.aggregate({
      where: {
        tenantId,
        status: 'SUCCEEDED',
      },
      _sum: {
        amount: true,
      },
    });

    return {
      id: tenant.id,
      businessName: tenant.businessName,
      storeSlug: tenant.storeSlug,
      description: tenant.description,
      logoUrl: tenant.logoUrl,
      bannerUrl: tenant.bannerUrl,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      address: tenant.address,
      currency: tenant.currency,
      status: tenant.status,
      isPublished: tenant.isPublished,
      publishedAt: tenant.publishedAt,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      subscription: tenant.subscription,
      members: tenant.memberships.map((m) => ({
        membershipId: m.id,
        role: m.role,
        status: m.status,
        joinedAt: m.createdAt,
        user: m.user,
      })),
      metrics: {
        productCount: tenant._count.products,
        orderCount: tenant._count.orders,
        categoryCount: tenant._count.categories,
        collectedRevenue: Number(revenueAggregate._sum.amount || 0),
      },
    };
  }

  /**
   * Suspends or reactivates a tenant account with audit trail logging.
   * Ensures tenant data is preserved and never deleted on suspension.
   */
  async updateTenantStatus(
    actorUserId: string,
    tenantId: string,
    dto: UpdateTenantStatusDto,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${tenantId}" was not found.`);
    }

    if (tenant.status === dto.status) {
      throw new BadRequestException(
        `Tenant "${tenant.businessName}" is already in "${dto.status}" status.`,
      );
    }

    const previousStatus = tenant.status;

    // Update status in database
    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: dto.status,
      },
    });

    // Determine audit action
    const action =
      dto.status === TenantStatus.SUSPENDED
        ? AuditAction.TENANT_SUSPENDED
        : AuditAction.TENANT_REACTIVATED;

    await this.auditService.log({
      actorUserId,
      action,
      targetType: 'TENANT',
      targetId: tenantId,
      tenantId: tenantId,
      reason: dto.reason,
      metadata: {
        businessName: tenant.businessName,
        storeSlug: tenant.storeSlug,
        previousStatus,
        newStatus: dto.status,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    this.logger.log(
      `Tenant "${tenant.businessName}" (${tenantId}) status updated from ${previousStatus} to ${dto.status} by Admin ${actorUserId}. Reason: ${dto.reason}`,
    );

    return {
      id: updatedTenant.id,
      businessName: updatedTenant.businessName,
      storeSlug: updatedTenant.storeSlug,
      status: updatedTenant.status,
      previousStatus,
      updatedAt: updatedTenant.updatedAt,
      message: `Tenant "${updatedTenant.businessName}" status successfully changed to ${dto.status}.`,
    };
  }
}
