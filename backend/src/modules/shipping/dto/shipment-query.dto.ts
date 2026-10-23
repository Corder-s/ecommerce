import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '@prisma/client';

export class ShipmentQueryDto {
  @ApiPropertyOptional({ enum: ShipmentStatus, description: 'Filter by shipment status' })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Filter by carrier tracking number' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}
