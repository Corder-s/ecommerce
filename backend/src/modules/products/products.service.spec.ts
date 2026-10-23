import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('ProductsService (Product Catalogue & Cross-Tenant Validation)', () => {
  let service: ProductsService;

  const mockPrisma: any = {
    category: {
      findFirst: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should prevent assigning a category from another tenant', async () => {
      // Category not found under tenant-1
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.createProduct('tenant-1', {
          name: 'Diya',
          price: 150,
          categoryId: 'category-of-tenant-2',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Cross-tenant category assignment rejected: Category "category-of-tenant-2" does not belong to this store.',
        ),
      );
    });

    it('should create product when category belongs to same tenant', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat-1', tenantId: 'tenant-1' });
      mockPrisma.product.findUnique.mockResolvedValue(null); // slug and sku available
      mockPrisma.product.create.mockResolvedValue({
        id: 'prod-1',
        tenantId: 'tenant-1',
        name: 'Handmade Diya',
        slug: 'handmade-diya',
        price: 199.5,
      });

      const result = await service.createProduct('tenant-1', {
        name: 'Handmade Diya',
        price: 199.5,
        categoryId: 'cat-1',
      });

      expect(result.id).toBe('prod-1');
      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            categoryId: 'cat-1',
            name: 'Handmade Diya',
          }),
        }),
      );
    });

    it('should reject duplicate SKU in same tenant', async () => {
      mockPrisma.product.findUnique
        .mockResolvedValueOnce(null) // slug check ok
        .mockResolvedValueOnce({ id: 'existing-sku-prod' }); // sku check collision

      await expect(
        service.createProduct('tenant-1', {
          name: 'New Diya',
          price: 100,
          sku: 'SKU-DUPLICATE',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject duplicate slug in same tenant', async () => {
      mockPrisma.product.findUnique.mockResolvedValueOnce({ id: 'existing-slug-prod' });

      await expect(
        service.createProduct('tenant-1', {
          name: 'Existing Slug',
          price: 100,
          slug: 'existing-slug',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getProductById', () => {
    it('should reject cross-tenant access if product belongs to another tenant', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.getProductById('tenant-1', 'prod-of-tenant-2')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'prod-of-tenant-2', tenantId: 'tenant-1' },
        include: { category: { select: { id: true, name: true, slug: true } } },
      });
    });
  });

  describe('updateProduct', () => {
    it('should reject updating product with a category from another tenant', async () => {
      mockPrisma.product.findFirst.mockResolvedValueOnce({ id: 'prod-1', tenantId: 'tenant-1' });
      mockPrisma.category.findFirst.mockResolvedValue(null); // Category not in tenant-1

      await expect(
        service.updateProduct('tenant-1', 'prod-1', {
          categoryId: 'foreign-category',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
