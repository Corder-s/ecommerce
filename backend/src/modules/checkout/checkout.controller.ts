import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { CheckoutService } from './checkout.service';
import { ValidateCheckoutDto } from './dto/validate-checkout.dto';

@ApiTags('Checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate cart, prices, store availability, and shipping address for checkout',
  })
  @ApiResponse({ status: 200, description: 'Validated checkout summary ready for order placement' })
  @ApiResponse({
    status: 400,
    description: 'Empty cart, multi-seller conflict, unavailable product/store, or missing address',
  })
  @ApiResponse({ status: 404, description: 'Delivery address not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async validateCheckout(@CurrentUser() user: AuthenticatedUser, @Body() dto: ValidateCheckoutDto) {
    return this.checkoutService.validateCheckout(user.id, dto);
  }
}
