import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformRolesGuard } from '../../auth/guards/platform-roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto';

@ApiTags('Super Admin — Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformRolesGuard)
@Roles(PlatformRole.SUPER_ADMIN)
@Controller('admin/audit-logs')
export class AdminAuditLogsController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'View and filter immutable platform audit records (Super Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Paginated audit trail' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN role' })
  async listAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.auditService.findMany(query);
  }
}
