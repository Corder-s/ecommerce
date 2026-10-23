import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditAction, Prisma, AuditLog } from '@prisma/client';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto';

export interface CreateAuditLogParams {
  actorUserId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  tenantId?: string | null;
  reason?: string | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an administrative action in the audit log.
   * Strips any sensitive credentials, tokens, or plaintext secrets before persistence.
   */
  async log(params: CreateAuditLogParams): Promise<AuditLog | null> {
    try {
      const sanitizedMetadata = this.sanitizeMetadata(params.metadata);

      return await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId,
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId,
          tenantId: params.tenantId || null,
          reason: params.reason || null,
          metadata: sanitizedMetadata as Prisma.InputJsonValue,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record audit log for action "${params.action}" on ${params.targetType}:${params.targetId}:`,
        error instanceof Error ? error.stack : error,
      );
      return null;
    }
  }

  /**
   * Retrieves paginated audit logs with administrative filtering.
   */
  async findMany(query: AuditLogQueryDto): Promise<{
    data: (AuditLog & {
      actor: {
        id: string;
        name: string;
        email: string;
        platformRole: string;
      };
    })[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.action) {
      where.action = query.action;
    }

    if (query.targetType) {
      where.targetType = query.targetType;
    }

    if (query.targetId) {
      where.targetId = query.targetId;
    }

    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              platformRole: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Recursively scrubs sensitive keys from metadata payloads.
   */
  private sanitizeMetadata(metadata?: Record<string, any> | null): Record<string, any> | null {
    if (!metadata || typeof metadata !== 'object') {
      return metadata ?? null;
    }

    const forbiddenKeys = [
      'password',
      'token',
      'secret',
      'authorization',
      'key',
      'creditcard',
      'cvv',
      'accesskey',
      'secretkey',
      'apikey',
    ];

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = forbiddenKeys.some((f) => lowerKey.includes(f));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
