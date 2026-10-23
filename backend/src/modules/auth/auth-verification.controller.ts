import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PlatformRole, TenantRole } from '@prisma/client';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PlatformRolesGuard } from './guards/platform-roles.guard';
import { TenantAccessGuard } from './guards/tenant-access.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentTenant } from './decorators/current-tenant.decorator';
import { RequirePlatformRole, RequireTenantRole } from './decorators/roles.decorator';
import { AuthenticatedUser, TenantContext } from './interfaces/auth.interface';

@ApiTags('Authentication & Access Control')
@ApiBearerAuth()
@Controller()
export class AuthVerificationController {
  @Get('auth/me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get authenticated user profile and memberships' })
  @ApiResponse({ status: 200, description: 'Profile returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthenticated or invalid token' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      platformRole: user.platformRole,
      memberships: user.memberships,
    };
  }

  @Get('auth/admin/overview')
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRole(PlatformRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super Admin platform overview (platform-level authorization)' })
  @ApiResponse({ status: 200, description: 'Access granted to Super Admin' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires SUPER_ADMIN role' })
  getAdminOverview(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Access granted to Super Admin console',
      adminId: user.id,
      platformRole: user.platformRole,
    };
  }

  @Get('tenants/:tenantId/verify-access')
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  @ApiOperation({ summary: 'Verify tenant access based on database membership' })
  @ApiResponse({ status: 200, description: 'Access granted to tenant' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cross-tenant access rejected' })
  verifyTenantAccess(
    @Param('tenantId') tenantId: string,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      authorized: true,
      tenantId: tenant.tenantId,
      userRoleInTenant: tenant.role,
      userId: user.id,
    };
  }

  @Get('tenants/:tenantId/owner-only')
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  @RequireTenantRole(TenantRole.STORE_OWNER)
  @ApiOperation({ summary: 'Store Owner operations within a tenant' })
  @ApiResponse({ status: 200, description: 'Access granted to STORE_OWNER' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires STORE_OWNER role in tenant' })
  verifyOwnerOnlyAccess(
    @Param('tenantId') tenantId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return {
      authorized: true,
      tenantId: tenant.tenantId,
      role: tenant.role,
      action: 'store_owner_permitted_action',
    };
  }
}
