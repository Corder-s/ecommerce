import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'ISO-8601 start date for analytics aggregation interval (defaults to 30 days ago)',
    example: '2026-09-22T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'ISO-8601 end date for analytics aggregation interval (defaults to current time)',
    example: '2026-10-22T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
