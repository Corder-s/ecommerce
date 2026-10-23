import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
  @ApiPropertyOptional({
    description: 'Reason for order cancellation',
    example: 'Customer requested cancellation prior to shipment',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Cancellation reason cannot exceed 500 characters' })
  reason?: string;
}
