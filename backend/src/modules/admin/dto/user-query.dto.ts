import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformRole, UserStatus } from '@prisma/client';

export class UserQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of users per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search term across name, email, or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PlatformRole, description: 'Filter by platform role' })
  @IsOptional()
  @IsEnum(PlatformRole)
  platformRole?: PlatformRole;

  @ApiPropertyOptional({ enum: UserStatus, description: 'Filter by user account status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
