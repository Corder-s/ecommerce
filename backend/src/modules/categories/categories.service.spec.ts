import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('CategoriesService (Category Management & Product Safety)', () => {
  let service: CategoriesService;

  const mockPrisma: any = {
    category: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    it('should create category and slugify name if slug omitted', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue({
        id: 'cat-1',
        tenantId: 'tenant-1',
        name: 'Natural Dhoop',
        slug: 'natural-dhoop',
      });

      const result = await service.createCategory('tenant-1', {
        name: 'Natural Dhoop',
      });

      expect(result.slug).toBe('natural-dhoop');
      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          name: 'Natural Dhoop',
          slug: 'natural-dhoop',
          description: undefined,
        },
      });
    });

    it('should throw ConflictException if slug already exists in same tenant', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'existing-cat' });

      await expect(
        service.createCategory('tenant-1', { name: 'Diyas', slug: 'diyas' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteCategory', () => {
    it('should prevent deleting category that contains products', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat-1', tenantId: 'tenant-1' });
      mockPrisma.product.count.mockResolvedValue(5); // 5 products in this category

      await expect(service.deleteCategory('tenant-1', 'cat-1')).rejects.toThrow(
        new BadRequestException(
          'Cannot delete category: It contains 5 product(s). Reassign or remove these products before deleting the category.',
        ),
      );
      expect(mockPrisma.category.delete).not.toHaveBeenCalled();
    });

    it('should allow deleting category when no products are associated', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat-1', tenantId: 'tenant-1' });
      mockPrisma.product.count.mockResolvedValue(0); // empty category
      mockPrisma.category.delete.mockResolvedValue({ id: 'cat-1' });

      const result = await service.deleteCategory('tenant-1', 'cat-1');
      expect(result.message).toBe('Category deleted successfully');
      expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });

    it('should throw NotFoundException if category does not belong to tenant', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(service.deleteCategory('tenant-1', 'other-cat')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
