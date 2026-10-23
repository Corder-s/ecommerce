import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  Length,
  Matches,
  IsUrl,
  MaxLength,
  IsISO8601,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({
    description: 'Full display name of the customer',
    example: 'Arjun Sharma',
  })
  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Customer contact phone number',
    example: '+919876543210',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s-]{10,15}$/, {
    message: 'Phone must be a valid phone number with 10 to 15 digits',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Customer avatar image URL',
    example: 'https://images.example.com/avatars/arjun.jpg',
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'avatarUrl must be a valid URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Short customer biography or notes',
    example: 'Artisan enthusiast and collector of handcrafted clay lamps.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio cannot exceed 500 characters' })
  bio?: string;

  @ApiPropertyOptional({
    description: 'Customer date of birth (ISO 8601 string)',
    example: '1992-05-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'dateOfBirth must be a valid ISO 8601 date string' })
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Customer notification and UI preferences',
    example: { emailNotifications: true, orderUpdatesSms: true },
  })
  @IsOptional()
  @IsObject({ message: 'preferences must be a valid JSON object' })
  preferences?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Customer account active status (set false to deactivate account)',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
