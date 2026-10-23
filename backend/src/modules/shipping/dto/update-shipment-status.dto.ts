import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '@prisma/client';

export class UpdateShipmentStatusDto {
  @ApiProperty({
    enum: ShipmentStatus,
    description: 'Target shipment status',
    example: ShipmentStatus.IN_TRANSIT,
  })
  @IsEnum(ShipmentStatus, {
    message: `status must be one of: ${Object.values(ShipmentStatus).join(', ')}`,
  })
  @IsNotEmpty()
  status: ShipmentStatus;

  @ApiPropertyOptional({
    description: 'Status event description or milestone update',
    example: 'Departed from central distribution facility',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Physical location where milestone occurred',
    example: 'New Delhi Regional Sorting Hub',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Reason for status update or exception note',
    example: 'Customer requested delivery date change',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
