import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ShippingService } from './shipping.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ReadyOrdersQueryDto } from './dto/ready-orders-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

@ApiTags('Shipping & Fulfilment')
@Controller()
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // ---------------------------------------------------------------------------
  // Seller Fulfilment Endpoints
  // ---------------------------------------------------------------------------

  @Get('shipping/orders/ready')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Retrieve eligible orders awaiting fulfilment for a store',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    required: false,
    description: 'Tenant store ID (if not provided in query)',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of orders awaiting fulfilment' })
  @ApiResponse({ status: 400, description: 'Missing tenant context' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient store permissions' })
  async getReadyOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReadyOrdersQueryDto,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    return this.shippingService.getReadyOrders(user, query, headerTenantId);
  }

  @Post('orders/:orderId/shipments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Prepare package, validate carrier eligibility, and create shipment for an order',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to be fulfilled' })
  @ApiResponse({ status: 201, description: 'Shipment created and tracking number issued' })
  @ApiResponse({ status: 400, description: 'Order not ready or carrier eligibility check failed' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cross-tenant access or not store staff' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async createShipment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shippingService.createShipment(user, orderId, dto);
  }

  @Get('orders/:orderId/shipments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all shipments and package history for an order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'List of shipments' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async listOrderShipments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ) {
    return this.shippingService.listOrderShipments(user, orderId);
  }

  @Get('shipments/:shipmentId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get full shipment record details and milestone history' })
  @ApiParam({ name: 'shipmentId', description: 'Shipment record ID' })
  @ApiResponse({ status: 200, description: 'Shipment details with tracking events' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cross-tenant access violation' })
  @ApiResponse({ status: 404, description: 'Shipment record not found' })
  async getShipment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shipmentId') shipmentId: string,
  ) {
    return this.shippingService.getShipmentById(user, shipmentId);
  }

  @Patch('shipments/:shipmentId/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update shipment status per validated state machine and synchronise order lifecycle',
  })
  @ApiParam({ name: 'shipmentId', description: 'Shipment record ID' })
  @ApiResponse({ status: 200, description: 'Shipment status updated and milestone event recorded' })
  @ApiResponse({ status: 400, description: 'Invalid state machine transition' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient store permissions' })
  @ApiResponse({ status: 404, description: 'Shipment record not found' })
  async updateShipmentStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shipmentId') shipmentId: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.shippingService.updateShipmentStatus(user, shipmentId, dto);
  }

  @Post('shipments/:shipmentId/dispatch')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Mark shipment as dispatched, advance order to SHIPPED, and fulfill inventory reservations',
  })
  @ApiParam({ name: 'shipmentId', description: 'Shipment record ID' })
  @ApiResponse({ status: 200, description: 'Shipment dispatched successfully' })
  @ApiResponse({ status: 400, description: 'Shipment is not in PENDING or READY_TO_SHIP status' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient store permissions' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async dispatchShipment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shipmentId') shipmentId: string,
  ) {
    return this.shippingService.dispatchShipment(user, shipmentId);
  }

  // ---------------------------------------------------------------------------
  // Customer Tracking Endpoint
  // ---------------------------------------------------------------------------

  @Get('customers/me/orders/:orderId/tracking')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get customer order tracking information with IDOR protection',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to track' })
  @ApiResponse({ status: 200, description: 'Sanitized public order tracking milestones' })
  @ApiResponse({ status: 404, description: 'Order not found or not owned by caller' })
  async getCustomerOrderTracking(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ) {
    return this.shippingService.getCustomerOrderTracking(user, orderId);
  }

  // ---------------------------------------------------------------------------
  // Carrier Webhook Endpoint
  // ---------------------------------------------------------------------------

  @Post('webhooks/shipping/:provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive and process cryptographically verified carrier tracking webhooks',
  })
  @ApiParam({
    name: 'provider',
    description: 'Carrier provider identifier (e.g. sandbox, delhivery)',
  })
  @ApiHeader({
    name: 'x-signature',
    required: true,
    description: 'HMAC signature for webhook authenticity verification',
  })
  @ApiResponse({ status: 200, description: 'Webhook event processed or deduplicated' })
  @ApiResponse({ status: 401, description: 'Invalid cryptographic signature' })
  async handleCarrierWebhook(
    @Param('provider') provider: string,
    @Headers('x-signature') signature: string,
    @Headers('x-provider-signature') providerSignature: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    const rawSignature = signature || providerSignature;
    const rawBody = (req as any).rawBody || body;
    return this.shippingService.handleShippingWebhook(provider, rawSignature, rawBody, body);
  }
}
