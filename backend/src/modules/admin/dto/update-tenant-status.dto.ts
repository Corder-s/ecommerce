import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TenantStatus } from '@prisma/client';

export class UpdateTenantStatusDto {
  @ApiProperty({
    enum: [TenantStatus.ACTIVE, TenantStatus.SUSPENDED],
    description: 'Target tenant operational status',
    example: TenantStatus.SUSPENDED,
  })
  @IsEnum(TenantStatus)
  @IsNotEmpty()
  status: TenantStatus;

  @ApiProperty({
    description: 'Administrative reason for updating tenant status (recorded in audit logs)',
    example: 'Violation of artisan marketplace policy section 4.2',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
