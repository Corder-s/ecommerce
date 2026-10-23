import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantRole, TenantStatus, PlatformRole } from '@prisma/client';
import { TENANT_ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser, TenantContext } from '../interfaces/auth.interface';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // 1. Resolve candidate tenant identifier from header, route params, or query
    const candidateTenantId =
      (request.headers['x-tenant-id'] as string) ||
      request.params?.tenantId ||
      (request.query?.tenantId as string);

    if (!candidateTenantId) {
      throw new BadRequestException(
        'Tenant context is required. Please provide "x-tenant-id" header or ":tenantId" route parameter.',
      );
    }

    // 2. Validate tenant access through authenticated user database membership.
    // NEVER trust a client-supplied tenant ID without checking database membership!
    const activeMembership = user.memberships.find(
      (m) => m.tenantId === candidateTenantId && m.status === 'ACTIVE',
    );

    if (!activeMembership) {
      throw new ForbiddenException(
        `Cross-tenant access rejected: You do not have an active membership in tenant "${candidateTenantId}".`,
      );
    }

    // 2.1 Enforce tenant suspension: sellers cannot operate suspended stores
    if (
      activeMembership.tenantStatus === TenantStatus.SUSPENDED &&
      user.platformRole !== PlatformRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        `Tenant store "${candidateTenantId}" is suspended by platform administration. Store operations are restricted.`,
      );
    }

    // 3. Role-based permission check within the verified tenant
    const requiredRoles = this.reflector.getAllAndOverride<TenantRole[]>(TENANT_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const hasPermittedRole = requiredRoles.includes(activeMembership.role);
      if (!hasPermittedRole) {
        throw new ForbiddenException(
          `Insufficient store permissions in tenant "${candidateTenantId}". Required role: [${requiredRoles.join(
            ', ',
          )}], current role: ${activeMembership.role}.`,
        );
      }
    }

    // 4. Attach verified tenant context to request
    const tenantContext: TenantContext = {
      tenantId: candidateTenantId,
      role: activeMembership.role,
      membershipId: activeMembership.id,
      status: activeMembership.status,
    };

    request.tenantContext = tenantContext;

    return true;
  }
}
