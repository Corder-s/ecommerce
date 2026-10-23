import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformRolesGuard } from '../../auth/guards/platform-roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';

@ApiTags('Super Admin — Platform Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformRolesGuard)
@Roles(PlatformRole.SUPER_ADMIN)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Platform-wide analytics overview (tenants, orders, revenue, subscriptions)',
  })
  @ApiResponse({ status: 200, description: 'Aggregated platform overview metrics' })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN role' })
  async getOverview(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.getOverview(query);
  }

  @Get('tenants')
  @ApiOperation({
    summary: 'Tenant growth and registration metrics over time',
  })
  @ApiResponse({ status: 200, description: 'Tenant analytics timeseries' })
  async getTenants(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.getTenantAnalytics(query);
  }

  @Get('orders')
  @ApiOperation({
    summary: 'Order volume, gross merchandise value, and status breakdown',
  })
  @ApiResponse({ status: 200, description: 'Order analytics metrics' })
  async getOrders(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.getOrderAnalytics(query);
  }

  @Get('subscriptions')
  @ApiOperation({
    summary: 'Subscription distribution by plan, MRR/ARR, and churn count',
  })
  @ApiResponse({ status: 200, description: 'Subscription analytics metrics' })
  async getSubscriptions(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.getSubscriptionAnalytics(query);
  }

  @Get('payments')
  @ApiOperation({
    summary: 'Payment transactions, collected revenue, failure rate, and refunds',
  })
  @ApiResponse({ status: 200, description: 'Payment analytics metrics' })
  async getPayments(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.getPaymentAnalytics(query);
  }
}
