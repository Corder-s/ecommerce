import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({
    description: 'Unique UUID identifier of the product to add to cart',
    example: 'a0000000-0000-4000-8000-000000000001',
  })
  @IsNotEmpty({ message: 'productId is required' })
  @IsUUID('4', { message: 'productId must be a valid UUID v4' })
  productId: string;

  @ApiPropertyOptional({
    description: 'Quantity of items to add (min: 1, max: 50)',
    example: 1,
    default: 1,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  @Max(50, { message: 'quantity cannot exceed 50 per product' })
  quantity?: number = 1;
}
