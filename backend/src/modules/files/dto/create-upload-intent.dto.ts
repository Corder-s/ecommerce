import { IsEnum, IsString, IsInt, Min, Max, IsOptional, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FilePurpose } from '../interfaces/file.interface';
import { ALLOWED_IMAGE_MIME_TYPES } from '../validators/file-image.validator';

export class CreateUploadIntentDto {
  @ApiProperty({
    enum: FilePurpose,
    example: FilePurpose.PRODUCT_IMAGE,
    description: 'Intended business purpose for the uploaded file',
  })
  @IsEnum(FilePurpose)
  purpose!: FilePurpose;

  @ApiProperty({
    example: 'terracotta_diya_front.jpg',
    description: 'Original name of the file on client device',
  })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    example: 'image/jpeg',
    description: 'MIME type of the file to be uploaded',
    enum: ALLOWED_IMAGE_MIME_TYPES,
  })
  @IsString()
  @IsIn(ALLOWED_IMAGE_MIME_TYPES, {
    message: `contentType must be one of: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
  })
  contentType!: string;

  @ApiProperty({
    example: 1048576,
    description: 'Size of file in bytes (up to 10MB for product images, 2MB for logos)',
  })
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024, { message: 'File size cannot exceed 20MB' })
  fileSize!: number;

  @ApiPropertyOptional({
    example: 'd41d8cd98f00b204e9800998ecf8427e',
    description: 'Optional client-calculated MD5 or SHA256 checksum for integrity check',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  checksum?: string;
}
