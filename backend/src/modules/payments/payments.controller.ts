import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

@ApiTags('Customer Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:orderId/payments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Initiate payment session for a placed customer order' })
  @ApiParam({ name: 'orderId', description: 'Order ID to be paid' })
  @ApiResponse({ status: 201, description: 'Payment session created successfully' })
  @ApiResponse({ status: 400, description: 'Order not eligible for payment' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async initiateOrderPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.initiateOrderPayment(user, orderId, dto);
  }

  @Get('orders/:orderId/payments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all payment records and attempts for an order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'List of payment records' })
  async listOrderPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.listOrderPayments(user, orderId);
  }

  @Get('payments/:paymentId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get details of a specific payment record' })
  @ApiParam({ name: 'paymentId', description: 'Payment record ID' })
  @ApiResponse({ status: 200, description: 'Payment record details' })
  @ApiResponse({ status: 404, description: 'Payment record not found' })
  async getPayment(@CurrentUser() user: AuthenticatedUser, @Param('paymentId') paymentId: string) {
    return this.paymentsService.getPaymentById(user, paymentId);
  }

  @Post('payments/:paymentId/refunds')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Process an authorised full or partial refund for a payment' })
  @ApiParam({ name: 'paymentId', description: 'Payment record ID to refund' })
  @ApiResponse({ status: 201, description: 'Refund processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid refund amount or payment state' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires store staff or admin role' })
  async refundPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('paymentId') paymentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(user, paymentId, dto);
  }

  @Post('webhooks/payments/:provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive and process cryptographically verified customer payment webhooks',
  })
  @ApiParam({ name: 'provider', description: 'Payment provider identifier (e.g., sandbox)' })
  @ApiHeader({
    name: 'x-signature',
    description: 'Cryptographic signature from payment provider',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook received and processed' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Invalid signature' })
  async handlePaymentWebhook(
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
      throw new BadRequestException('Missing payment webhook signature header');
    }

    return this.paymentsService.handlePaymentWebhook(provider, body, signature, headers);
  }
}
