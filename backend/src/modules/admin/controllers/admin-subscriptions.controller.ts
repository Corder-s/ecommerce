import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformRolesGuard } from '../../auth/guards/platform-roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminSubscriptionsService } from '../services/admin-subscriptions.service';
import { SubscriptionQueryDto } from '../dto/subscription-query.dto';

@ApiTags('Super Admin — Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformRolesGuard)
@Roles(PlatformRole.SUPER_ADMIN)
@Controller('admin')
export class AdminSubscriptionsController {
  constructor(private readonly adminSubscriptionsService: AdminSubscriptionsService) {}

  @Get('subscriptions')
  @ApiOperation({ summary: 'List and filter platform subscriptions' })
  @ApiResponse({ status: 200, description: 'Paginated list of subscriptions' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN role' })
  async listSubscriptions(@Query() query: SubscriptionQueryDto) {
    return this.adminSubscriptionsService.listSubscriptions(query);
  }

  @Get('subscription-summary')
  @ApiOperation({
    summary: 'Get subscription counts grouped by plan, status distribution, and MRR/ARR',
  })
  @ApiResponse({ status: 200, description: 'Subscription aggregation summary' })
  async getSubscriptionSummary() {
    return this.adminSubscriptionsService.getSubscriptionSummary();
  }

  @Get('subscriptions/:subscriptionId')
  @ApiOperation({ summary: 'Get full subscription details and invoice history' })
  @ApiParam({
    name: 'subscriptionId',
    description: 'Subscription unique identifier (UUID)',
  })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getSubscriptionDetails(@Param('subscriptionId') subscriptionId: string) {
    return this.adminSubscriptionsService.getSubscriptionDetails(subscriptionId);
  }
}
