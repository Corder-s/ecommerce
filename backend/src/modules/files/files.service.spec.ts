import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesRepository } from './files.repository';
import { FileImageValidator, createSharp } from './validators/file-image.validator';
import {
  OBJECT_STORAGE_PROVIDER_TOKEN,
  SandboxObjectStorageProvider,
} from '../../integrations/object-storage';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FilePurpose, FileStatus, FileVisibility } from './interfaces/file.interface';
import { PlatformRole, TenantRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

describe('FilesService', () => {
  let service: FilesService;
  let sandboxStorage: SandboxObjectStorageProvider;
  let mockPrisma: any;
  let mockRepo: any;
  let validPngBuffer: Buffer;

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

  const mockOtherUser: AuthenticatedUser = {
    id: 'user-stranger-2',
    name: 'Stranger Two',
    email: 'stranger@example.com',
    platformRole: PlatformRole.USER,
    memberships: [
      {
        id: 'mem-2',
        tenantId: 'tenant-other-2',
        role: TenantRole.STORE_OWNER,
        status: 'ACTIVE',
      },
    ],
  };

  beforeAll(async () => {
    validPngBuffer = await createSharp({
      create: {
        width: 150,
        height: 150,
        channels: 3,
        background: { r: 255, g: 100, b: 0 },
      },
    })
      .png()
      .toBuffer();
  });

  beforeEach(async () => {
    sandboxStorage = new SandboxObjectStorageProvider('https://media.gaushilp.example.com');

    mockPrisma = {
      tenantMembership: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (
            where.userId_tenantId?.userId === 'user-artisan-1' &&
            where.userId_tenantId?.tenantId === 'tenant-store-1'
          ) {
            return Promise.resolve({
              userId: 'user-artisan-1',
              tenantId: 'tenant-store-1',
              role: TenantRole.STORE_OWNER,
              status: 'ACTIVE',
            });
          }
          return Promise.resolve(null);
        }),
      },
      storedFile: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const filesDatabase = new Map<string, any>();

    mockRepo = {
      create: jest.fn().mockImplementation((data) => {
        const file = {
          id: 'file-uuid-1',
          ...data,
          tenantId: data.tenant?.connect?.id || null,
          uploadedByUserId: data.uploadedBy.connect.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        filesDatabase.set(file.id, file);
        return Promise.resolve(file);
      }),
      findById: jest.fn().mockImplementation((id) => {
        return Promise.resolve(filesDatabase.get(id) || null);
      }),
      update: jest.fn().mockImplementation((id, data) => {
        const existing = filesDatabase.get(id);
        if (!existing) return Promise.resolve(null);
        const updated = { ...existing, ...data, updatedAt: new Date() };
        filesDatabase.set(id, updated);
        return Promise.resolve(updated);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        const list = Array.from(filesDatabase.values()).filter((f) => {
          if (where.tenantId && f.tenantId !== where.tenantId) return false;
          return true;
        });
        return Promise.resolve(list);
      }),
      count: jest.fn().mockResolvedValue(1),
      checkActiveReferences: jest.fn().mockResolvedValue({
        isReferenced: false,
        productCount: 0,
        storeCount: 0,
      }),
      findTenantFiles: jest.fn().mockResolvedValue([]),
      findAbandonedUploads: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        FileImageValidator,
        {
          provide: OBJECT_STORAGE_PROVIDER_TOKEN,
          useValue: sandboxStorage,
        },
        {
          provide: FilesRepository,
          useValue: mockRepo,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'storage.uploadExpirationSeconds') return 900;
              if (key === 'storage.downloadExpirationSeconds') return 300;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  describe('createUploadIntent', () => {
    it('should generate a presigned upload URL and create a PENDING record for product image', async () => {
      const intent = await service.createUploadIntent(mockUser, 'tenant-store-1', {
        purpose: FilePurpose.PRODUCT_IMAGE,
        fileName: 'terracotta_lamp.png',
        contentType: 'image/png',
        fileSize: 1024 * 500, // 500KB
      });

      expect(intent).toBeDefined();
      expect(intent.fileId).toBe('file-uuid-1');
      expect(intent.uploadUrl).toContain('sandbox-r2.gaushilp.local/upload');
      expect(intent.objectKey).toMatch(/^tenants\/tenant-store-1\/product_image\/.+\.png$/);
      expect(intent.visibility).toBe(FileVisibility.PUBLIC);
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it('should reject upload intent if tenant context is missing for product image', async () => {
      await expect(
        service.createUploadIntent(mockUser, undefined, {
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'diya.png',
          contentType: 'image/png',
          fileSize: 50000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject upload intent if user does not belong to target tenant', async () => {
      await expect(
        service.createUploadIntent(mockOtherUser, 'tenant-store-1', {
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'diya.png',
          contentType: 'image/png',
          fileSize: 50000,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject file exceeding purpose size limit (e.g. logo > 2MB)', async () => {
      await expect(
        service.createUploadIntent(mockUser, 'tenant-store-1', {
          purpose: FilePurpose.STORE_LOGO,
          fileName: 'huge_logo.png',
          contentType: 'image/png',
          fileSize: 3 * 1024 * 1024, // 3MB > 2MB limit
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject disallowed file extension (e.g. .exe, .sh, .html)', async () => {
      await expect(
        service.createUploadIntent(mockUser, 'tenant-store-1', {
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'script.exe',
          contentType: 'image/png',
          fileSize: 50000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeUpload', () => {
    it('should successfully verify uploaded image, update status to VERIFIED, and build publicUrl', async () => {
      // 1. Create intent
      const intent = await service.createUploadIntent(mockUser, 'tenant-store-1', {
        purpose: FilePurpose.PRODUCT_IMAGE,
        fileName: 'handmade_diya.png',
        contentType: 'image/png',
        fileSize: validPngBuffer.length,
      });

      // 2. Simulate client upload to sandbox storage
      sandboxStorage.simulateUpload(intent.objectKey, validPngBuffer, 'image/png');

      // 3. Complete upload
      const verified = await service.completeUpload(mockUser, intent.fileId);

      expect(verified.status).toBe(FileStatus.VERIFIED);
      expect(verified.publicUrl).toBe(`https://media.gaushilp.example.com/${intent.objectKey}`);
      expect(verified.width).toBe(150);
      expect(verified.height).toBe(150);
      expect(verified.verifiedAt).toBeDefined();
    });

    it('should throw BadRequestException if object was not uploaded to storage', async () => {
      const intent = await service.createUploadIntent(mockUser, 'tenant-store-1', {
        purpose: FilePurpose.PRODUCT_IMAGE,
        fileName: 'missing.png',
        contentType: 'image/png',
        fileSize: 1000,
      });

      // Do not upload to storage
      await expect(service.completeUpload(mockUser, intent.fileId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject and clean up object if binary image content is corrupted', async () => {
      const intent = await service.createUploadIntent(mockUser, 'tenant-store-1', {
        purpose: FilePurpose.PRODUCT_IMAGE,
        fileName: 'corrupted.png',
        contentType: 'image/png',
        fileSize: 100,
      });

      // Upload corrupted bytes
      const corruptedBytes = Buffer.from('NOT_A_VALID_IMAGE_BINARY');
      sandboxStorage.simulateUpload(intent.objectKey, corruptedBytes, 'image/png');

      await expect(service.completeUpload(mockUser, intent.fileId)).rejects.toThrow(
        BadRequestException,
      );

      // Stored object must be deleted
      const head = await sandboxStorage.headObject(intent.objectKey);
      expect(head.exists).toBe(false);
    });

    it('should reject unauthorized user completing another tenant’s upload', async () => {
      const intent = await service.createUploadIntent(mockUser, 'tenant-store-1', {
        purpose: FilePurpose.PRODUCT_IMAGE,
        fileName: 'secure.png',
        contentType: 'image/png',
        fileSize: validPngBuffer.length,
      });

      sandboxStorage.simulateUpload(intent.objectKey, validPngBuffer, 'image/png');

      await expect(service.completeUpload(mockOtherUser, intent.fileId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteFile', () => {
    it('should reject deletion if file is actively referenced by a product or store profile', async () => {
      mockRepo.checkActiveReferences.mockResolvedValueOnce({
        isReferenced: true,
        productCount: 1,
        storeCount: 0,
      });

      const intent = await service.createUploadIntent(mockUser, 'tenant-store-1', {
        purpose: FilePurpose.PRODUCT_IMAGE,
        fileName: 'active.png',
        contentType: 'image/png',
        fileSize: validPngBuffer.length,
      });

      await expect(service.deleteFile(mockUser, intent.fileId)).rejects.toThrow(ConflictException);
    });

    it('should successfully delete unreferenced file from storage and mark DELETED', async () => {
      mockRepo.checkActiveReferences.mockResolvedValueOnce({
        isReferenced: false,
        productCount: 0,
        storeCount: 0,
      });

      const intent = await service.createUploadIntent(mockUser, 'tenant-store-1', {
        purpose: FilePurpose.PRODUCT_IMAGE,
        fileName: 'unreferenced.png',
        contentType: 'image/png',
        fileSize: validPngBuffer.length,
      });

      sandboxStorage.simulateUpload(intent.objectKey, validPngBuffer, 'image/png');

      const result = await service.deleteFile(mockUser, intent.fileId);
      expect(result.success).toBe(true);

      const head = await sandboxStorage.headObject(intent.objectKey);
      expect(head.exists).toBe(false);
    });
  });

  describe('assertFilesBelongToTenant', () => {
    it('should reject cross-tenant file attachment if a file belongs to another tenant', async () => {
      mockPrisma.storedFile.findMany.mockResolvedValueOnce([
        {
          id: 'file-stolen-1',
          tenantId: 'tenant-other-victim',
          publicUrl: 'https://media.gaushilp.example.com/stolen.jpg',
        },
      ]);

      await expect(
        service.assertFilesBelongToTenant('tenant-store-1', [
          'https://media.gaushilp.example.com/stolen.jpg',
        ]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should transition verified tenant files to ATTACHED', async () => {
      mockRepo.findTenantFiles.mockResolvedValueOnce([
        {
          id: 'file-uuid-1',
          tenantId: 'tenant-store-1',
          publicUrl: 'https://media.gaushilp.example.com/my_diya.jpg',
          status: FileStatus.VERIFIED,
        },
      ]);

      await service.assertFilesBelongToTenant('tenant-store-1', [
        'https://media.gaushilp.example.com/my_diya.jpg',
      ]);

      expect(mockRepo.update).toHaveBeenCalledWith(
        'file-uuid-1',
        expect.objectContaining({
          status: FileStatus.ATTACHED,
        }),
      );
    });
  });
});
