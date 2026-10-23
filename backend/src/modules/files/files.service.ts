import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { Prisma, StoredFile, PlatformRole, TenantRole } from '@prisma/client';
import {
  IObjectStorageProvider,
  OBJECT_STORAGE_PROVIDER_TOKEN,
} from '../../integrations/object-storage';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FilesRepository } from './files.repository';
import { FileImageValidator, ALLOWED_IMAGE_EXTENSIONS } from './validators/file-image.validator';
import {
  FilePurpose,
  FileStatus,
  FileVisibility,
  FileResponse,
  UploadIntentResponse,
  PaginatedFilesResponse,
} from './interfaces/file.interface';
import { CreateUploadIntentDto } from './dto/create-upload-intent.dto';
import { FileQueryDto } from './dto/file-query.dto';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadExpirationSeconds: number;
  private readonly downloadExpirationSeconds: number;

  constructor(
    @Inject(OBJECT_STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: IObjectStorageProvider,
    private readonly repository: FilesRepository,
    private readonly fileImageValidator: FileImageValidator,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.uploadExpirationSeconds =
      this.configService.get<number>('storage.uploadExpirationSeconds') || 900;
    this.downloadExpirationSeconds =
      this.configService.get<number>('storage.downloadExpirationSeconds') || 300;
  }

  /**
   * Generates a secure, short-lived presigned upload URL and registers a PENDING StoredFile.
   */
  async createUploadIntent(
    user: AuthenticatedUser,
    tenantId: string | undefined,
    dto: CreateUploadIntentDto,
  ): Promise<UploadIntentResponse> {
    // 1. Role and tenant access validation
    const requiresTenant = dto.purpose !== FilePurpose.PRIVATE_DOCUMENT;
    const effectiveTenantId = tenantId || null;

    if (requiresTenant) {
      if (!effectiveTenantId) {
        throw new BadRequestException(
          `Tenant context is required for purpose: "${dto.purpose}". Provide a valid x-tenant-id header.`,
        );
      }
      await this.assertTenantAccess(user, effectiveTenantId, [
        TenantRole.STORE_OWNER,
        TenantRole.STORE_MANAGER,
        TenantRole.STORE_STAFF,
      ]);
    }

    // 2. Purpose and file-size validation
    const sizeCheck = this.fileImageValidator.validateFileSize(dto.purpose, dto.fileSize);
    if (!sizeCheck.isValid) {
      throw new BadRequestException(
        `File size (${(dto.fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed limit for ${dto.purpose} (${(sizeCheck.maxAllowed / 1024 / 1024).toFixed(2)}MB).`,
      );
    }

    // 3. File extension and name sanitization
    const sanitizedFileName = path.basename(dto.fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const extension = path.extname(sanitizedFileName).toLowerCase();

    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
      throw new BadRequestException(
        `Invalid file extension "${extension}". Allowed extensions: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
      );
    }

    // 4. Determine storage visibility
    const visibility =
      dto.purpose === FilePurpose.PRIVATE_DOCUMENT ? FileVisibility.PRIVATE : FileVisibility.PUBLIC;

    // 5. Generate server-controlled object key (prevents directory traversal & arbitrary keys)
    const fileUuid = randomUUID();
    const objectKey = effectiveTenantId
      ? `tenants/${effectiveTenantId}/${dto.purpose.toLowerCase()}/${fileUuid}${extension}`
      : `users/${user.id}/${dto.purpose.toLowerCase()}/${fileUuid}${extension}`;

    // 6. Generate presigned upload URL
    const uploadUrl = await this.storageProvider.getPresignedUploadUrl(
      objectKey,
      dto.contentType,
      this.uploadExpirationSeconds,
    );

    // 7. Persist file metadata with status PENDING
    const storedFile = await this.repository.create({
      uploadedBy: { connect: { id: user.id } },
      tenant: effectiveTenantId ? { connect: { id: effectiveTenantId } } : undefined,
      purpose: dto.purpose,
      objectKey,
      originalFileName: sanitizedFileName,
      contentType: dto.contentType,
      fileSize: dto.fileSize,
      checksum: dto.checksum || null,
      status: FileStatus.PENDING,
      visibility,
    });

    const expiresAt = new Date(Date.now() + this.uploadExpirationSeconds * 1000).toISOString();

    this.logger.log(
      `Created upload intent for file ${storedFile.id} (key: ${objectKey}) by user ${user.id}`,
    );

    return {
      fileId: storedFile.id,
      uploadUrl,
      objectKey,
      expiresAt,
      maxSizeBytes: sizeCheck.maxAllowed,
      purpose: storedFile.purpose,
      visibility: storedFile.visibility,
    };
  }

  /**
   * Confirms client direct upload, inspects storage, validates binary image content with Sharp,
   * and transitions file status to VERIFIED or REJECTED.
   */
  async completeUpload(user: AuthenticatedUser, fileId: string): Promise<FileResponse> {
    const file = await this.repository.findById(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID "${fileId}" not found`);
    }

    // Verify ownership or tenant membership
    await this.verifyFileOwnership(user, file);

    // Idempotent completion check
    if (file.status === FileStatus.VERIFIED || file.status === FileStatus.ATTACHED) {
      return this.mapToFileResponse(file);
    }

    if (file.status === FileStatus.REJECTED) {
      throw new BadRequestException(
        `File upload was previously rejected: ${file.errorMessage || 'Validation failed'}`,
      );
    }

    if (file.status === FileStatus.DELETED) {
      throw new NotFoundException('File has been deleted');
    }

    // 1. Verify object exists in storage
    const head = await this.storageProvider.headObject(file.objectKey);
    if (!head.exists) {
      throw new BadRequestException(
        'Uploaded object was not found in storage. Direct upload may have failed, timed out, or not been initiated.',
      );
    }

    // 2. Retrieve object buffer for server-side inspection
    const buffer = await this.storageProvider.getObjectBuffer(file.objectKey);

    if (!buffer || buffer.length === 0) {
      await this.handleValidationFailure(file, 'Uploaded file is empty (0 bytes).');
      throw new BadRequestException('Uploaded file is empty (0 bytes).');
    }

    // Check size limit
    const sizeCheck = this.fileImageValidator.validateFileSize(file.purpose, buffer.length);
    if (!sizeCheck.isValid) {
      const err = `Uploaded file actual size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds allowable limit (${(sizeCheck.maxAllowed / 1024 / 1024).toFixed(2)}MB).`;
      await this.handleValidationFailure(file, err);
      throw new BadRequestException(err);
    }

    // 3. Inspect binary content with Sharp & Magic Bytes
    const imageValidation = await this.fileImageValidator.validateImageContent(
      buffer,
      file.contentType,
    );

    if (!imageValidation.isValid) {
      const errorMsg = imageValidation.error || 'Invalid or malformed image content';
      await this.handleValidationFailure(file, errorMsg);
      throw new BadRequestException(errorMsg);
    }

    // 4. Construct public CDN URL if asset is public
    const publicUrl =
      file.visibility === FileVisibility.PUBLIC
        ? this.storageProvider.getPublicUrl(file.objectKey)
        : null;

    // 5. Update StoredFile to VERIFIED
    const updated = await this.repository.update(file.id, {
      status: FileStatus.VERIFIED,
      publicUrl,
      width: imageValidation.width,
      height: imageValidation.height,
      fileSize: buffer.length,
      verifiedAt: new Date(),
      errorMessage: null,
    });

    this.logger.log(
      `File ${file.id} successfully verified (${imageValidation.format}, ${imageValidation.width}x${imageValidation.height}px)`,
    );

    return this.mapToFileResponse(updated);
  }

  /**
   * Retrieves single file metadata, generating a presigned download URL if private.
   */
  async getFile(user: AuthenticatedUser, fileId: string): Promise<FileResponse> {
    const file = await this.repository.findById(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID "${fileId}" not found`);
    }

    // If private or not verified, enforce strict ownership
    if (file.visibility === FileVisibility.PRIVATE || file.status !== FileStatus.VERIFIED) {
      await this.verifyFileOwnership(user, file);
    }

    let downloadUrl: string | null = null;
    if (file.visibility === FileVisibility.PRIVATE) {
      downloadUrl = await this.storageProvider.getPresignedDownloadUrl(
        file.objectKey,
        this.downloadExpirationSeconds,
      );
    }

    return this.mapToFileResponse(file, downloadUrl);
  }

  /**
   * Lists files for a tenant with pagination and optional filters.
   */
  async listFiles(
    user: AuthenticatedUser,
    tenantId: string,
    query: FileQueryDto,
  ): Promise<PaginatedFilesResponse> {
    await this.assertTenantAccess(user, tenantId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StoredFileWhereInput = {
      tenantId,
      status: query.status ? query.status : { not: FileStatus.DELETED },
    };

    if (query.purpose) {
      where.purpose = query.purpose;
    }

    const [files, total] = await Promise.all([
      this.repository.findMany({ where, skip, take: limit }),
      this.repository.count(where),
    ]);

    return {
      files: files.map((f) => this.mapToFileResponse(f)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Safely deletes a file from storage and database.
   * Protects against deleting files actively referenced in products or store branding.
   */
  async deleteFile(
    user: AuthenticatedUser,
    fileId: string,
  ): Promise<{ success: boolean; message: string }> {
    const file = await this.repository.findById(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID "${fileId}" not found`);
    }

    // Must be Store Owner, Manager or Super Admin to delete
    if (file.tenantId) {
      await this.assertTenantAccess(user, file.tenantId, [
        TenantRole.STORE_OWNER,
        TenantRole.STORE_MANAGER,
      ]);
    } else if (
      file.uploadedByUserId !== user.id &&
      user.platformRole !== PlatformRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Access denied: You cannot delete another user’s file');
    }

    // 1. Check active product or store branding references
    const referenceCheck = await this.repository.checkActiveReferences(file.publicUrl);

    if (referenceCheck.isReferenced) {
      throw new ConflictException(
        `Cannot delete file: Asset is actively referenced in ${referenceCheck.productCount} product(s) or store branding. Detach the asset first.`,
      );
    }

    // 2. Delete from object storage
    try {
      await this.storageProvider.deleteObject(file.objectKey);
    } catch (err) {
      this.logger.error(
        `Failed to delete object "${file.objectKey}" from storage, proceeding with soft-delete in DB:`,
        err,
      );
    }

    // 3. Mark DELETED in database
    await this.repository.update(file.id, {
      status: FileStatus.DELETED,
      deletedAt: new Date(),
    });

    this.logger.log(`File ${file.id} marked as DELETED by user ${user.id}`);
    return { success: true, message: 'File deleted successfully' };
  }

  /**
   * Helper for ProductsService and StoresService to verify that referenced image URLs
   * belong to the specified tenant, are verified, and mark them as ATTACHED.
   * Prevents cross-tenant file attachment!
   */
  async assertFilesBelongToTenant(tenantId: string, fileUrlsOrKeys: string[]): Promise<void> {
    if (!fileUrlsOrKeys || fileUrlsOrKeys.length === 0) {
      return;
    }

    // Filter to URLs that look like GauShilp assets
    const cleanIdentifiers = fileUrlsOrKeys
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);

    if (cleanIdentifiers.length === 0) {
      return;
    }

    // Check database records matching these URLs or keys
    const storedFiles = await this.repository.findTenantFiles(tenantId, cleanIdentifiers);

    // If an identifier matches a file belonging to ANOTHER tenant, reject immediately!
    const externalFiles = await this.prisma.storedFile.findMany({
      where: {
        OR: [
          { id: { in: cleanIdentifiers } },
          { publicUrl: { in: cleanIdentifiers } },
          { objectKey: { in: cleanIdentifiers } },
        ],
        NOT: {
          tenantId,
        },
      },
    });

    if (externalFiles.length > 0) {
      throw new ForbiddenException(
        `Cross-tenant file assignment rejected: One or more files belong to another store tenant.`,
      );
    }

    // Transition matched verified files to ATTACHED
    for (const file of storedFiles) {
      if (file.status === FileStatus.REJECTED || file.status === FileStatus.DELETED) {
        throw new BadRequestException(
          `Cannot attach file "${file.originalFileName}": File is ${file.status}.`,
        );
      }
      if (file.status === FileStatus.VERIFIED) {
        await this.repository.update(file.id, {
          status: FileStatus.ATTACHED,
          attachedAt: new Date(),
        });
      }
    }
  }

  /**
   * Background cleanup of abandoned upload intents (PENDING past cutoff).
   */
  async cleanupAbandonedUploads(maxAgeHours = 24): Promise<{ cleanedCount: number }> {
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const abandoned = await this.repository.findAbandonedUploads(cutoffDate);

    let cleanedCount = 0;
    for (const file of abandoned) {
      try {
        await this.storageProvider.deleteObject(file.objectKey);
      } catch (err) {
        this.logger.warn(`Failed to delete abandoned storage key "${file.objectKey}": ${err}`);
      }

      await this.repository.update(file.id, {
        status: FileStatus.REJECTED,
        errorMessage: 'Upload expired or abandoned without completion',
      });
      cleanedCount++;
    }

    this.logger.log(`Cleaned up ${cleanedCount} abandoned upload intents`);
    return { cleanedCount };
  }

  // --- Internal Helper Methods ---

  private async assertTenantAccess(
    user: AuthenticatedUser,
    tenantId: string,
    allowedRoles?: TenantRole[],
  ): Promise<void> {
    if (user.platformRole === PlatformRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException(
        `Access denied: You do not have an active membership for tenant "${tenantId}".`,
      );
    }

    if (allowedRoles && !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException(
        `Insufficient permissions for tenant "${tenantId}". Required roles: ${allowedRoles.join(', ')}`,
      );
    }
  }

  private async verifyFileOwnership(user: AuthenticatedUser, file: StoredFile): Promise<void> {
    if (user.platformRole === PlatformRole.SUPER_ADMIN) {
      return;
    }

    if (file.tenantId) {
      await this.assertTenantAccess(user, file.tenantId);
      return;
    }

    if (file.uploadedByUserId !== user.id) {
      throw new ForbiddenException('Access denied: You do not own this file');
    }
  }

  private async handleValidationFailure(file: StoredFile, errorMsg: string): Promise<void> {
    try {
      await this.storageProvider.deleteObject(file.objectKey);
    } catch (err) {
      this.logger.warn(`Failed to delete invalid object "${file.objectKey}": ${err}`);
    }

    await this.repository.update(file.id, {
      status: FileStatus.REJECTED,
      errorMessage: errorMsg,
    });
  }

  private mapToFileResponse(file: StoredFile, downloadUrl?: string | null): FileResponse {
    return {
      id: file.id,
      tenantId: file.tenantId,
      uploadedByUserId: file.uploadedByUserId,
      purpose: file.purpose,
      objectKey: file.objectKey,
      originalFileName: file.originalFileName,
      contentType: file.contentType,
      fileSize: file.fileSize,
      checksum: file.checksum,
      width: file.width,
      height: file.height,
      publicUrl: file.publicUrl,
      downloadUrl: downloadUrl || null,
      status: file.status,
      visibility: file.visibility,
      errorMessage: file.errorMessage,
      verifiedAt: file.verifiedAt,
      attachedAt: file.attachedAt,
      createdAt: file.createdAt,
    };
  }
}
