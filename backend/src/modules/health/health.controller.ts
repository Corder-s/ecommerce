import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthCheckResult } from './health.service';

@ApiTags('System & Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check full system health and dependencies status' })
  @ApiResponse({ status: 200, description: 'Overall system health report' })
  getHealth(): HealthCheckResult {
    return this.healthService.getHealth();
  }

  @Get('liveness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe for load balancer / container orchestrator' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  getLiveness(): { status: string; uptime: number } {
    return this.healthService.getLiveness();
  }

  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness probe for traffic routing' })
  @ApiResponse({ status: 200, description: 'Service is ready to handle traffic' })
  getReadiness(): { status: string; ready: boolean; timestamp: string } {
    return this.healthService.getReadiness();
  }
}
