import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { CreateAddressDto } from '../../customers/dto/create-address.dto';

export class CreateOrderDto {
  @ApiPropertyOptional({
    description:
      'Target seller tenant ID (required if cart contains products from multiple stores)',
    example: 'a0000000-0000-4000-8000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'tenantId must be a valid UUID v4' })
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'Saved delivery address ID belonging to the authenticated customer',
    example: 'a0000000-0000-4000-8000-000000000002',
  })
  @IsOptional()
  @IsUUID('4', { message: 'addressId must be a valid UUID v4' })
  addressId?: string;

  @ApiPropertyOptional({
    description: 'Inline delivery shipping address if not using a saved address',
    type: CreateAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  shippingAddress?: CreateAddressDto;

  @ApiPropertyOptional({
    description: 'Optional customer delivery instructions or order note',
    example: 'Please leave with security at tower B',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Customer note cannot exceed 500 characters' })
  customerNote?: string;

  @ApiPropertyOptional({
    description: 'Unique client idempotency key to prevent duplicate orders on network retries',
    example: 'idem-ord-user1-ts123456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}
