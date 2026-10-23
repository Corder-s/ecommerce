import { Controller, Get, Patch, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformRolesGuard } from '../../auth/guards/platform-roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { AdminTenantsService } from '../services/admin-tenants.service';
import { TenantQueryDto } from '../dto/tenant-query.dto';
import { UpdateTenantStatusDto } from '../dto/update-tenant-status.dto';
import { Request } from 'express';

@ApiTags('Super Admin — Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformRolesGuard)
@Roles(PlatformRole.SUPER_ADMIN)
@Controller('admin/tenants')
export class AdminTenantsController {
  constructor(private readonly adminTenantsService: AdminTenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter tenants (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of tenants' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN role' })
  async listTenants(@Query() query: TenantQueryDto) {
    return this.adminTenantsService.listTenants(query);
  }

  @Get(':tenantId')
  @ApiOperation({ summary: 'Get full tenant details, memberships, and subscription' })
  @ApiParam({ name: 'tenantId', description: 'Tenant unique identifier (UUID)' })
  @ApiResponse({ status: 200, description: 'Detailed tenant data' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenantDetails(@Param('tenantId') tenantId: string) {
    return this.adminTenantsService.getTenantDetails(tenantId);
  }

  @Patch(':tenantId/status')
  @ApiOperation({ summary: 'Suspend or reactivate a tenant account' })
  @ApiParam({ name: 'tenantId', description: 'Tenant unique identifier (UUID)' })
  @ApiResponse({ status: 200, description: 'Tenant status updated with audit log' })
  @ApiResponse({ status: 400, description: 'Invalid transition or status already set' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateTenantStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantStatusDto,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];

    return this.adminTenantsService.updateTenantStatus(user.id, tenantId, dto, {
      ipAddress,
      userAgent,
    });
  }
}
