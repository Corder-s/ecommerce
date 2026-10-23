import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { TenantRole } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/guards/tenant-access.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireTenantRole } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AuthenticatedUser, TenantContext } from '../auth/interfaces/auth.interface';

@ApiTags('SaaS Subscriptions')
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('subscriptions/plans')
  @Public()
  @ApiOperation({ summary: 'List all active GauShilp OS SaaS subscription plans' })
  @ApiResponse({ status: 200, description: 'List of subscription plans' })
  async listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Get('subscriptions/current')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  @RequireTenantRole(TenantRole.STORE_OWNER, TenantRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Get current subscription, plan tier, and resource usage for store' })
  @ApiResponse({ status: 200, description: 'Current subscription and usage details' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires store manager role' })
  async getCurrentSubscription(@CurrentTenant() tenant: TenantContext) {
    return this.subscriptionsService.getCurrentSubscription(tenant.tenantId);
  }

  @Post('subscriptions/checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  @RequireTenantRole(TenantRole.STORE_OWNER)
  @ApiOperation({ summary: 'Initiate subscription upgrade/checkout session for store' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires STORE_OWNER role' })
  async checkoutSubscription(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubscriptionCheckoutDto,
  ) {
    return this.subscriptionsService.createSubscriptionCheckout(tenant.tenantId, user, dto);
  }

  @Post('subscriptions/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  @RequireTenantRole(TenantRole.STORE_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel current SaaS subscription for store' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires STORE_OWNER role' })
  async cancelSubscription(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionsService.cancelSubscription(tenant.tenantId, dto);
  }

  @Get('subscriptions/billing-history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  @RequireTenantRole(TenantRole.STORE_OWNER, TenantRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Get past subscription billing invoices for store' })
  @ApiResponse({ status: 200, description: 'List of subscription invoices' })
  async getBillingHistory(@CurrentTenant() tenant: TenantContext) {
    return this.subscriptionsService.getBillingHistory(tenant.tenantId);
  }

  @Post('webhooks/subscriptions/:provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive and process cryptographically verified SaaS subscription webhooks',
  })
  @ApiParam({ name: 'provider', description: 'Subscription provider identifier (e.g., sandbox)' })
  @ApiHeader({
    name: 'x-signature',
    description: 'Cryptographic HMAC signature from subscription billing provider',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Subscription webhook processed' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Invalid signature' })
  async handleSubscriptionWebhook(
    @Param('provider') provider: string,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[]>,
  ) {
    const signature =
      (headers['x-signature'] as string) ||
      (headers['x-provider-signature'] as string) ||
      (headers['stripe-signature'] as string) ||
      (headers['x-razorpay-signature'] as string);

    if (!signature) {
      throw new BadRequestException('Missing subscription webhook signature header');
    }

    return this.subscriptionsService.handleSubscriptionWebhook(provider, body, signature, headers);
  }
}
