import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePaymentDto {
  @ApiPropertyOptional({
    description: 'Payment method selected by customer (e.g., card, upi, netbanking)',
    example: 'card',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Customer return/callback URL after checkout completes',
    example: 'https://storefront.example.com/checkout/success',
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @ApiPropertyOptional({
    description: 'Idempotency key to prevent accidental duplicate payment session creations',
    example: 'pay-idem-8b43f9a1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;
}
