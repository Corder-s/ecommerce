import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformRolesGuard } from '../../auth/guards/platform-roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminHealthService } from '../services/admin-health.service';

@ApiTags('Super Admin — System Health')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformRolesGuard)
@Roles(PlatformRole.SUPER_ADMIN)
@Controller('admin/health')
export class AdminHealthController {
  constructor(private readonly adminHealthService: AdminHealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Restricted system operational metrics (uptime, memory, runtime)',
  })
  @ApiResponse({ status: 200, description: 'Operational system metrics' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN role' })
  getSystemHealth() {
    return this.adminHealthService.getSystemHealth();
  }

  @Get('database')
  @ApiOperation({
    summary: 'Database connectivity and ping latency check',
  })
  @ApiResponse({ status: 200, description: 'Database connectivity status' })
  async getDatabaseHealth() {
    return this.adminHealthService.getDatabaseHealth();
  }

  @Get('queues')
  @ApiOperation({
    summary: 'Background job queue and dead-letter event health',
  })
  @ApiResponse({ status: 200, description: 'Queue and outbox health status' })
  async getQueuesHealth() {
    return this.adminHealthService.getQueuesHealth();
  }
}
