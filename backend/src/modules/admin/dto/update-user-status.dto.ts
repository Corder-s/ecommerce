import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: [UserStatus.ACTIVE, UserStatus.SUSPENDED],
    description: 'Target platform user account status',
    example: UserStatus.SUSPENDED,
  })
  @IsEnum(UserStatus)
  @IsNotEmpty()
  status: UserStatus;

  @ApiProperty({
    description: 'Administrative reason for updating user status (recorded in audit logs)',
    example: 'Account flagged for suspicious activity',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
