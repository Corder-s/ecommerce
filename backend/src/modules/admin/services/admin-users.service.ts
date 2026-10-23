import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserQueryDto } from '../dto/user-query.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import { UserStatus, PlatformRole, AuditAction, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves a paginated list of platform users.
   */
  async listUsers(query: UserQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.platformRole) {
      where.platformRole = query.platformRole;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              memberships: true,
              orders: true,
            },
          },
        },
      }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        platformRole: u.platformRole,
        status: u.status,
        suspendedAt: u.suspendedAt,
        suspensionReason: u.suspensionReason,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        counts: {
          tenantMemberships: u._count.memberships,
          orders: u._count.orders,
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
   * Retrieves full profile details for a platform user, including tenant memberships
   * and customer account summary. Never exposes passwords or internal credentials.
   */
  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        memberships: {
          include: {
            tenant: {
              select: {
                id: true,
                businessName: true,
                storeSlug: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
            payments: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" was not found.`);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      platformRole: user.platformRole,
      status: user.status,
      suspendedAt: user.suspendedAt,
      suspensionReason: user.suspensionReason,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      customerProfile: user.customerProfile,
      tenantMemberships: user.memberships.map((m) => ({
        membershipId: m.id,
        role: m.role,
        status: m.status,
        joinedAt: m.createdAt,
        tenant: m.tenant,
      })),
      metrics: {
        totalOrders: user._count.orders,
        totalPayments: user._count.payments,
        totalNotifications: user._count.notifications,
      },
    };
  }

  /**
   * Disables or reactivates a user account with strict self-lockout protection
   * and privileged administrator account safeguards.
   */
  async updateUserStatus(
    actorUser: AuthenticatedUser,
    targetUserId: string,
    dto: UpdateUserStatusDto,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    // 1. Self-lockout protection: Super Admins cannot suspend their own account
    if (actorUser.id === targetUserId) {
      throw new BadRequestException(
        'Self-lockout protection: You cannot alter the active status of your own Super Admin account.',
      );
    }

    // 2. Fetch target user
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID "${targetUserId}" was not found.`);
    }

    // 3. Safeguard other Super Admin accounts
    if (
      targetUser.platformRole === PlatformRole.SUPER_ADMIN &&
      dto.status === UserStatus.SUSPENDED
    ) {
      throw new ForbiddenException(
        'Privilege protection: Cannot suspend another Super Admin account via standard status API.',
      );
    }

    // 4. Validate transition
    if (targetUser.status === dto.status) {
      throw new BadRequestException(
        `User "${targetUser.email}" is already in "${dto.status}" status.`,
      );
    }

    const previousStatus = targetUser.status;

    // 5. Update database record
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: dto.status,
        suspendedAt: dto.status === UserStatus.SUSPENDED ? new Date() : null,
        suspensionReason: dto.status === UserStatus.SUSPENDED ? dto.reason : null,
      },
    });

    // 6. Record audit trail
    const action =
      dto.status === UserStatus.SUSPENDED
        ? AuditAction.USER_SUSPENDED
        : AuditAction.USER_REACTIVATED;

    await this.auditService.log({
      actorUserId: actorUser.id,
      action,
      targetType: 'USER',
      targetId: targetUserId,
      reason: dto.reason,
      metadata: {
        userName: targetUser.name,
        userEmail: targetUser.email,
        platformRole: targetUser.platformRole,
        previousStatus,
        newStatus: dto.status,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    this.logger.log(
      `User "${targetUser.email}" (${targetUserId}) status updated from ${previousStatus} to ${dto.status} by Admin ${actorUser.id}. Reason: ${dto.reason}`,
    );

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      platformRole: updatedUser.platformRole,
      status: updatedUser.status,
      previousStatus,
      suspendedAt: updatedUser.suspendedAt,
      suspensionReason: updatedUser.suspensionReason,
      updatedAt: updatedUser.updatedAt,
      message: `User "${updatedUser.email}" account status successfully changed to ${dto.status}.`,
    };
  }
}
