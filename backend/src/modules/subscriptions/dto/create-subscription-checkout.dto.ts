import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { BillingInterval } from '@prisma/client';

export class CreateSubscriptionCheckoutDto {
  @ApiProperty({
    description: 'Unique slug of subscription plan to subscribe to (e.g., starter, growth, pro)',
    example: 'growth',
  })
  @IsString()
  @IsNotEmpty()
  planSlug: string;

  @ApiProperty({
    description: 'Billing interval',
    enum: BillingInterval,
    example: BillingInterval.MONTHLY,
  })
  @IsEnum(BillingInterval)
  billingInterval: BillingInterval;
}
