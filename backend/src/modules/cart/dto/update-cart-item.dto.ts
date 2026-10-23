import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'Updated item quantity (min: 1, max: 50)',
    example: 3,
    minimum: 1,
    maximum: 50,
  })
  @IsNotEmpty({ message: 'quantity is required' })
  @Type(() => Number)
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  @Max(50, { message: 'quantity cannot exceed 50 per product' })
  quantity: number;
}
