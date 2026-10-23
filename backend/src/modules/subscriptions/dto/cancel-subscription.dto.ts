import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiPropertyOptional({
    description:
      'Whether cancellation takes effect at the end of the current billing cycle (default: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean = true;

  @ApiPropertyOptional({
    description: 'Reason for cancellation feedback',
    example: 'No longer selling online',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
