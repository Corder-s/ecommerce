import { IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShipmentDto {
  @ApiProperty({ description: 'Actual packed package weight in kilograms', example: 1.5 })
  @IsNumber()
  @IsPositive()
  @Max(70, { message: 'Package weight cannot exceed 70kg for courier shipment' })
  packageWeight: number;

  @ApiPropertyOptional({ description: 'Package length in cm', example: 25.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(200, { message: 'Package length cannot exceed 200cm' })
  packageLength?: number;

  @ApiPropertyOptional({ description: 'Package width in cm', example: 15.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(200, { message: 'Package width cannot exceed 200cm' })
  packageWidth?: number;

  @ApiPropertyOptional({ description: 'Package height in cm', example: 10.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(200, { message: 'Package height cannot exceed 200cm' })
  packageHeight?: number;

  @ApiPropertyOptional({ description: 'Carrier or shipping provider name', example: 'sandbox' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    description: 'Carrier mode or code (e.g. surface_cargo, express_air)',
    example: 'surface_cargo',
  })
  @IsOptional()
  @IsString()
  carrierCode?: string;

  @ApiPropertyOptional({
    description: 'Pre-assigned tracking/AWB number from carrier if available',
    example: 'GS-TRK-12345',
  })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({
    description: 'Actual fulfilment shipping cost incurred with carrier',
    example: 85.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional({
    description: 'Seller or carrier dispatch note',
    example: 'Fragile: Handmade cow dung diyas and statue',
  })
  @IsOptional()
  @IsString()
  carrierNote?: string;
}
