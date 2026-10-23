import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CustomerWishlistService } from './customer-wishlist.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ProductStatus, TenantStatus } from '@prisma/client';

describe('CustomerWishlistService', () => {
  let service: CustomerWishlistService;

  const mockPrisma: any = {
    wishlistItem: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerWishlistService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CustomerWishlistService>(CustomerWishlistService);
    jest.clearAllMocks();
  });

  describe('listWishlist', () => {
    it('should return paginated wishlist and accurately evaluate isPurchasable status', async () => {
      mockPrisma.wishlistItem.count.mockResolvedValue(2);
      mockPrisma.wishlistItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          productId: 'prod-active',
          createdAt: new Date(),
          product: {
            id: 'prod-active',
            name: 'Clay Diya',
            slug: 'clay-diya',
            price: 150,
            currency: 'INR',
            status: ProductStatus.PUBLISHED,
            images: [],
            category: null,
            tenant: {
              id: 'tenant-1',
              businessName: 'Vedic Pottery',
              storeSlug: 'vedic-pottery',
              isPublished: true,
              status: TenantStatus.ACTIVE,
            },
          },
        },
        {
          id: 'item-2',
          productId: 'prod-draft',
          createdAt: new Date(),
          product: {
            id: 'prod-draft',
            name: 'Draft Diya',
            slug: 'draft-diya',
            price: 200,
            currency: 'INR',
            status: ProductStatus.DRAFT, // Unpublished product
            images: [],
            category: null,
            tenant: {
              id: 'tenant-1',
              businessName: 'Vedic Pottery',
              storeSlug: 'vedic-pottery',
              isPublished: true,
              status: TenantStatus.ACTIVE,
            },
          },
        },
      ]);

      const result = await service.listWishlist('user-1', { page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].isPurchasable).toBe(true);
      expect(result.items[1].isPurchasable).toBe(false); // Do not expose draft as purchasable
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('addToWishlist', () => {
    it('should add a valid product to wishlist successfully', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Organic Incense',
        status: ProductStatus.PUBLISHED,
        tenant: {
          id: 'tenant-1',
          status: TenantStatus.ACTIVE,
        },
      });
      mockPrisma.wishlistItem.findUnique.mockResolvedValue(null);
      mockPrisma.wishlistItem.create.mockResolvedValue({
        id: 'w-item-1',
        userId: 'user-1',
        productId: 'prod-1',
        createdAt: new Date(),
        product: {
          id: 'prod-1',
          name: 'Organic Incense',
          price: 99,
          currency: 'INR',
          status: ProductStatus.PUBLISHED,
        },
      });

      const result = await service.addToWishlist('user-1', { productId: 'prod-1' });

      expect(result.id).toBe('w-item-1');
      expect(mockPrisma.wishlistItem.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          productId: 'prod-1',
        },
        include: expect.any(Object),
      });
    });

    it('should throw ConflictException if product is already in the customer wishlist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        status: ProductStatus.PUBLISHED,
        tenant: { status: TenantStatus.ACTIVE },
      });
      mockPrisma.wishlistItem.findUnique.mockResolvedValue({
        id: 'existing-w-item',
        userId: 'user-1',
        productId: 'prod-1',
      });

      await expect(service.addToWishlist('user-1', { productId: 'prod-1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.addToWishlist('user-1', { productId: 'ghost-prod' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if product is ARCHIVED', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-archived',
        status: ProductStatus.ARCHIVED,
        tenant: { status: TenantStatus.ACTIVE },
      });

      await expect(service.addToWishlist('user-1', { productId: 'prod-archived' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if store is SUSPENDED', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        status: ProductStatus.PUBLISHED,
        tenant: { status: TenantStatus.SUSPENDED },
      });

      await expect(service.addToWishlist('user-1', { productId: 'prod-1' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeFromWishlist', () => {
    it('should remove item by wishlist item ID', async () => {
      mockPrisma.wishlistItem.findFirst.mockResolvedValueOnce({
        id: 'w-item-1',
        userId: 'user-1',
      });
      mockPrisma.wishlistItem.delete.mockResolvedValue({});

      const result = await service.removeFromWishlist('user-1', 'w-item-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.wishlistItem.delete).toHaveBeenCalledWith({
        where: { id: 'w-item-1' },
      });
    });

    it('should remove item by productId fallback', async () => {
      mockPrisma.wishlistItem.findFirst
        .mockResolvedValueOnce(null) // by id
        .mockResolvedValueOnce({
          id: 'w-item-1',
          productId: 'prod-1',
          userId: 'user-1',
        }); // by productId

      mockPrisma.wishlistItem.delete.mockResolvedValue({});

      const result = await service.removeFromWishlist('user-1', 'prod-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.wishlistItem.delete).toHaveBeenCalledWith({
        where: { id: 'w-item-1' },
      });
    });

    it('should throw NotFoundException if wishlist item does not exist or is not owned', async () => {
      mockPrisma.wishlistItem.findFirst.mockResolvedValue(null);

      await expect(service.removeFromWishlist('user-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
