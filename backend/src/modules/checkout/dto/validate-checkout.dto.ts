import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreateAddressDto } from '../../customers/dto/create-address.dto';

export class ValidateCheckoutDto {
  @ApiPropertyOptional({
    description:
      'Target store tenant ID (required if cart contains products from multiple sellers)',
    example: 't0000000-0000-4000-8000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'tenantId must be a valid UUID v4' })
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'Saved delivery address ID belonging to the authenticated customer',
    example: 'addr0000-0000-4000-8000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'addressId must be a valid UUID v4' })
  addressId?: string;

  @ApiPropertyOptional({
    description: 'Inline delivery address details if not using a saved address',
    type: CreateAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  shippingAddress?: CreateAddressDto;
}
