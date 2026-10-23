import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsOptional, IsString, MaxLength } from 'class-validator';

export class RefundPaymentDto {
  @ApiProperty({
    description: 'Amount to refund (must be positive and not exceed remaining payment amount)',
    example: 1250.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({
    description: 'Reason for refund for accounting and dispute audit trail',
    example: 'Customer requested cancellation prior to shipping',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
