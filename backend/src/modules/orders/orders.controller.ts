import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';

@ApiTags('Orders & Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an order from the customer active cart with atomic stock reservation',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Unique client idempotency key to prevent duplicate orders upon retries',
  })
  @ApiResponse({ status: 201, description: 'Order created and stock reserved successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cart empty, invalid address, or multi-seller conflict',
  })
  @ApiResponse({ status: 404, description: 'Address or product not found' })
  @ApiResponse({ status: 409, description: 'Insufficient stock for one or more products' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    return this.ordersService.createOrder(user, dto, idempotencyKeyHeader);
  }

  @Get()
  @ApiOperation({ summary: 'List orders with pagination and status filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of orders' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (unauthorized store access)' })
  async listOrders(@CurrentUser() user: AuthenticatedUser, @Query() query: OrderQueryDto) {
    return this.ordersService.listOrders(user, query);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Retrieve order details by order ID' })
  @ApiResponse({ status: 200, description: 'Order details and line items' })
  @ApiResponse({ status: 404, description: 'Order not found or unauthorized' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ) {
    return this.ordersService.getOrderById(user, orderId);
  }

  @Patch(':orderId/status')
  @ApiOperation({
    summary: 'Update order fulfillment status following the state machine (Store Staff only)',
  })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid state machine transition' })
  @ApiResponse({ status: 403, description: 'Forbidden (store staff permission required)' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateOrderStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(user, orderId, dto);
  }

  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel an eligible pre-shipment order and restore product inventory exactly once',
  })
  @ApiResponse({ status: 200, description: 'Order cancelled and stock restored' })
  @ApiResponse({
    status: 400,
    description: 'Order cannot be cancelled (already shipped or cancelled)',
  })
  @ApiResponse({ status: 404, description: 'Order not found or unauthorized' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async cancelOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(user, orderId, dto);
  }
}
