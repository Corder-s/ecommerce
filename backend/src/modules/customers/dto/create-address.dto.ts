import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Full name of the recipient',
    example: 'Arjun Sharma',
  })
  @IsNotEmpty({ message: 'fullName is required' })
  @IsString()
  @Length(2, 100, { message: 'fullName must be between 2 and 100 characters' })
  fullName: string;

  @ApiProperty({
    description: 'Contact phone number for delivery',
    example: '+919876543210',
  })
  @IsNotEmpty({ message: 'phone is required' })
  @IsString()
  @Matches(/^\+?[0-9\s-]{10,15}$/, {
    message: 'phone must be a valid phone number with 10 to 15 digits',
  })
  phone: string;

  @ApiProperty({
    description: 'Primary street address, flat, or building details',
    example: 'Flat 402, Vrindavan Heights, Temple Road',
  })
  @IsNotEmpty({ message: 'addressLine1 is required' })
  @IsString()
  @Length(3, 255, { message: 'addressLine1 must be between 3 and 255 characters' })
  addressLine1: string;

  @ApiPropertyOptional({
    description: 'Secondary address details, suite, or sector',
    example: 'Sector 5, Govardhan Enclave',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'addressLine2 cannot exceed 255 characters' })
  addressLine2?: string;

  @ApiProperty({
    description: 'City, town, or village',
    example: 'Mathura',
  })
  @IsNotEmpty({ message: 'city is required' })
  @IsString()
  @Length(2, 100, { message: 'city must be between 2 and 100 characters' })
  city: string;

  @ApiProperty({
    description: 'State or province',
    example: 'Uttar Pradesh',
  })
  @IsNotEmpty({ message: 'state is required' })
  @IsString()
  @Length(2, 100, { message: 'state must be between 2 and 100 characters' })
  state: string;

  @ApiProperty({
    description: 'Postal code or PIN code (3 to 10 alphanumeric characters)',
    example: '281001',
  })
  @IsNotEmpty({ message: 'postalCode is required' })
  @IsString()
  @Matches(/^[A-Za-z0-9\s-]{3,10}$/, {
    message: 'postalCode must be a valid alphanumeric postal code between 3 and 10 characters',
  })
  postalCode: string;

  @ApiPropertyOptional({
    description: 'Two-letter ISO country code or full country name',
    example: 'IN',
    default: 'IN',
  })
  @IsOptional()
  @IsString()
  @Length(2, 60, { message: 'country must be between 2 and 60 characters' })
  country?: string;

  @ApiPropertyOptional({
    description: 'Nearby landmark to assist delivery',
    example: 'Opposite ISKCON Temple Gate 2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'landmark cannot exceed 150 characters' })
  landmark?: string;

  @ApiPropertyOptional({
    description: 'Set as default address for orders',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isDefault must be a boolean' })
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Address label or classification',
    example: 'HOME',
    enum: ['HOME', 'WORK', 'OTHER'],
    default: 'HOME',
  })
  @IsOptional()
  @IsString()
  @IsIn(['HOME', 'WORK', 'OTHER'], {
    message: 'addressType must be one of: HOME, WORK, OTHER',
  })
  addressType?: string;
}
