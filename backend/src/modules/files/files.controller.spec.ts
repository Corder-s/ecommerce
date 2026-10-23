import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FilePurpose, FileStatus, FileVisibility } from './interfaces/file.interface';
import { PlatformRole, TenantRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('FilesController', () => {
  let controller: FilesController;
  let mockService: any;

  const mockUser: AuthenticatedUser = {
    id: 'user-artisan-1',
    name: 'Artisan Alpha',
    email: 'artisan@gaushilp.com',
    platformRole: PlatformRole.USER,
    memberships: [
      {
        id: 'mem-1',
        tenantId: 'tenant-store-1',
        role: TenantRole.STORE_OWNER,
        status: 'ACTIVE',
      },
    ],
  };

  beforeEach(async () => {
    mockService = {
      createUploadIntent: jest.fn().mockResolvedValue({
        fileId: 'file-123',
        uploadUrl: 'https://r2.example.com/upload',
        objectKey: 'tenants/tenant-store-1/product_image/uuid.png',
        expiresAt: new Date().toISOString(),
        maxSizeBytes: 10485760,
        purpose: FilePurpose.PRODUCT_IMAGE,
        visibility: FileVisibility.PUBLIC,
      }),
      completeUpload: jest.fn().mockResolvedValue({
        id: 'file-123',
        status: FileStatus.VERIFIED,
        publicUrl: 'https://media.gaushilp.com/tenants/tenant-store-1/product_image/uuid.png',
      }),
      getFile: jest.fn().mockResolvedValue({
        id: 'file-123',
        status: FileStatus.VERIFIED,
      }),
      listFiles: jest.fn().mockResolvedValue({
        files: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
      deleteFile: jest.fn().mockResolvedValue({
        success: true,
        message: 'File deleted successfully',
      }),
      cleanupAbandonedUploads: jest.fn().mockResolvedValue({
        cleanedCount: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FilesController>(FilesController);
  });

  it('should create upload intent via service', async () => {
    const res = await controller.createUploadIntent(mockUser, 'tenant-store-1', {
      purpose: FilePurpose.PRODUCT_IMAGE,
      fileName: 'test.png',
      contentType: 'image/png',
      fileSize: 1000,
    });

    expect(res).toBeDefined();
    expect(mockService.createUploadIntent).toHaveBeenCalledWith(
      mockUser,
      'tenant-store-1',
      expect.objectContaining({ fileName: 'test.png' }),
    );
  });

  it('should complete upload via service', async () => {
    const res = await controller.completeUpload(mockUser, 'file-123');
    expect(res).toBeDefined();
    expect(mockService.completeUpload).toHaveBeenCalledWith(mockUser, 'file-123');
  });

  it('should get file metadata via service', async () => {
    const res = await controller.getFile(mockUser, 'file-123');
    expect(res).toBeDefined();
    expect(mockService.getFile).toHaveBeenCalledWith(mockUser, 'file-123');
  });

  it('should list files for tenant via service', async () => {
    const res = await controller.listFiles(mockUser, 'tenant-store-1', {});
    expect(res).toBeDefined();
    expect(mockService.listFiles).toHaveBeenCalledWith(mockUser, 'tenant-store-1', {});
  });

  it('should delete file via service', async () => {
    const res = await controller.deleteFile(mockUser, 'file-123');
    expect(res).toBeDefined();
    expect(mockService.deleteFile).toHaveBeenCalledWith(mockUser, 'file-123');
  });

  it('should cleanup abandoned uploads via service', async () => {
    const res = await controller.cleanupAbandoned();
    expect(res).toBeDefined();
    expect(mockService.cleanupAbandonedUploads).toHaveBeenCalled();
  });
});
