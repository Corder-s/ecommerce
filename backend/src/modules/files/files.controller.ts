import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { FilesService } from './files.service';
import { CreateUploadIntentDto } from './dto/create-upload-intent.dto';
import { FileQueryDto } from './dto/file-query.dto';

@ApiTags('Object Storage & Secure File Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-intents')
  @ApiOperation({
    summary: 'Request server-controlled presigned upload URL and initialize StoredFile',
    description:
      'Validates file size, purpose, and tenant permissions before issuing a short-lived presigned upload URL. Direct upload is performed directly from client to Cloudflare R2.',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    required: false,
    description: 'Target store tenant ID (required for store logos, banners, and product images)',
  })
  @ApiResponse({ status: 201, description: 'Upload intent created with presigned PUT URL' })
  @ApiResponse({
    status: 400,
    description: 'Invalid format, oversized file, or missing tenant context',
  })
  @ApiResponse({ status: 403, description: 'Insufficient tenant permissions' })
  async createUploadIntent(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() dto: CreateUploadIntentDto,
  ) {
    return this.filesService.createUploadIntent(user, tenantId, dto);
  }

  @Post(':fileId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm client direct upload and trigger server-side binary inspection',
    description:
      'Verifies the object in Cloudflare R2, inspects binary magic bytes, validates dimensions with Sharp, and publishes the asset.',
  })
  @ApiParam({ name: 'fileId', description: 'ID of the StoredFile to verify and complete' })
  @ApiResponse({
    status: 200,
    description: 'File successfully verified and public CDN URL generated',
  })
  @ApiResponse({
    status: 400,
    description: 'Object not found in storage, empty, or corrupted binary image',
  })
  @ApiResponse({ status: 404, description: 'File intent not found' })
  async completeUpload(@CurrentUser() user: AuthenticatedUser, @Param('fileId') fileId: string) {
    return this.filesService.completeUpload(user, fileId);
  }

  @Get(':fileId')
  @ApiOperation({
    summary: 'Retrieve file metadata and short-lived download URL for private files',
  })
  @ApiParam({ name: 'fileId', description: 'ID of the StoredFile' })
  @ApiResponse({ status: 200, description: 'File metadata retrieved' })
  @ApiResponse({ status: 404, description: 'File not found or access denied' })
  async getFile(@CurrentUser() user: AuthenticatedUser, @Param('fileId') fileId: string) {
    return this.filesService.getFile(user, fileId);
  }

  @Get()
  @ApiOperation({
    summary: 'List files for an authenticated store tenant with pagination and purpose filter',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    required: true,
    description: 'Tenant ID for which to list files',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of tenant files' })
  @ApiResponse({ status: 403, description: 'Access denied to tenant files' })
  async listFiles(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: FileQueryDto,
  ) {
    return this.filesService.listFiles(user, tenantId, query);
  }

  @Delete(':fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Safely delete a file from storage and database',
    description:
      'Checks active product and store branding references. If referenced by any published product or store profile, deletion is rejected with 409 Conflict.',
  })
  @ApiParam({ name: 'fileId', description: 'ID of the file to delete' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 409, description: 'File is actively referenced and cannot be deleted' })
  async deleteFile(@CurrentUser() user: AuthenticatedUser, @Param('fileId') fileId: string) {
    return this.filesService.deleteFile(user, fileId);
  }

  @Post('cleanup/abandoned')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger cleanup of expired or abandoned upload intents',
  })
  async cleanupAbandoned() {
    return this.filesService.cleanupAbandonedUploads();
  }
}
