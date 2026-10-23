import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    description: 'Target order status according to permitted state machine transitions',
    example: OrderStatus.CONFIRMED,
  })
  @IsNotEmpty({ message: 'status is required' })
  @IsEnum(OrderStatus, {
    message: `status must be one of: ${Object.values(OrderStatus).join(', ')}`,
  })
  status: OrderStatus;

  @ApiPropertyOptional({
    description: 'Reason, tracking number, or fulfillment note for the status change',
    example: 'Dispatched via India Post Air Cargo, Tracking #IN123456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;
}
