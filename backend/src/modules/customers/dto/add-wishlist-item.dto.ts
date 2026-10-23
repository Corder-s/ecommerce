import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddWishlistItemDto {
  @ApiProperty({
    description: 'Unique UUID identifier of the product to add to wishlist',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  @IsNotEmpty({ message: 'productId is required' })
  @IsUUID('4', { message: 'productId must be a valid UUID v4' })
  productId: string;
}
