import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StoresService } from './stores.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductStatus } from '@prisma/client';

describe('StoresService (Store Management & Public Storefront)', () => {
  let service: StoresService;

  const mockPrisma: any = {
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
    jest.clearAllMocks();
  });

  describe('getCurrentStore', () => {
    it('should return store details if store exists', async () => {
      const mockStore = {
        id: 'tenant-1',
        businessName: 'Vedic Diyas',
        storeSlug: 'vedic-diyas',
        status: 'ACTIVE',
      };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockStore);

      const result = await service.getCurrentStore('tenant-1');
      expect(result).toEqual(mockStore);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        include: {
          _count: {
            select: { products: true, categories: true, memberships: true },
          },
        },
      });
    });

    it('should throw NotFoundException if store does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.getCurrentStore('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('publishStore and unpublishStore', () => {
    it('should publish store and set publishedAt', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', storeSlug: 'test' });
      mockPrisma.tenant.update.mockResolvedValue({
        id: 'tenant-1',
        storeSlug: 'test',
        isPublished: true,
      });

      const result = await service.publishStore('tenant-1');
      expect(result.message).toBe('Store published successfully');
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
          data: expect.objectContaining({ isPublished: true }),
        }),
      );
    });

    it('should unpublish store', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', storeSlug: 'test' });
      mockPrisma.tenant.update.mockResolvedValue({
        id: 'tenant-1',
        storeSlug: 'test',
        isPublished: false,
      });

      const result = await service.unpublishStore('tenant-1');
      expect(result.message).toBe('Store unpublished successfully');
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
          data: { isPublished: false },
        }),
      );
    });
  });

  describe('getPublicStoreBySlug', () => {
    it('should reject unpublished stores with NotFoundException', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        storeSlug: 'draft-store',
        isPublished: false,
        status: 'ACTIVE',
      });

      await expect(service.getPublicStoreBySlug('draft-store')).rejects.toThrow(
        new NotFoundException('Store not found or is currently unpublished'),
      );
    });

    it('should return published store details', async () => {
      const publicStore = {
        id: 'tenant-1',
        businessName: 'Vedic Diyas',
        storeSlug: 'vedic-diyas',
        isPublished: true,
        status: 'ACTIVE',
      };
      mockPrisma.tenant.findUnique.mockResolvedValue(publicStore);

      const result = await service.getPublicStoreBySlug('vedic-diyas');
      expect(result).toEqual(publicStore);
    });
  });

  describe('getPublicStoreProducts', () => {
    it('should only return products with status PUBLISHED', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        businessName: 'Vedic Diyas',
        storeSlug: 'vedic-diyas',
        isPublished: true,
        status: 'ACTIVE',
      });

      mockPrisma.product.count.mockResolvedValue(1);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Diya 1', status: 'PUBLISHED' },
      ]);

      const result = await service.getPublicStoreProducts('vedic-diyas', { page: 1, limit: 10 });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            status: ProductStatus.PUBLISHED,
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
    });
  });
});
