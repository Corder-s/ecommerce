import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductStatus, TenantStatus } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;

  const mockPrisma: any = {
    cart: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    cartItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return cart with calculated subtotals, minor units, and price change detection', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        currency: 'INR',
        updatedAt: new Date(),
      });

      mockPrisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: 'prod-1',
          quantity: 2,
          priceSnapshot: 100, // Price was 100 when added
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            id: 'prod-1',
            name: 'Vedic Diya',
            slug: 'vedic-diya',
            price: 120, // Price increased to 120
            currency: 'INR',
            status: ProductStatus.PUBLISHED,
            images: [],
            tenant: {
              id: 'tenant-1',
              businessName: 'Vedic Crafts',
              storeSlug: 'vedic-crafts',
              isPublished: true,
              status: TenantStatus.ACTIVE,
            },
          },
        },
      ]);

      const cart = await service.getCart('user-1');

      expect(cart.id).toBe('cart-1');
      expect(cart.itemCount).toBe(2);
      expect(cart.distinctItemCount).toBe(1);
      expect(cart.subtotal.amount).toBe(240); // 120 * 2
      expect(cart.subtotal.minorUnits).toBe(24000); // 24000 paise
      expect(cart.items[0].priceChanged).toBe(true);
      expect(cart.items[0].previousPrice?.amount).toBe(100);
      expect(cart.items[0].unitPrice.amount).toBe(120);
    });
  });

  describe('addItem', () => {
    it('should add valid published product to cart with price snapshot', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Clay Pot',
        price: 250,
        status: ProductStatus.PUBLISHED,
        tenant: {
          id: 'tenant-1',
          isPublished: true,
          status: TenantStatus.ACTIVE,
        },
      });

      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        currency: 'INR',
      });
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);
      mockPrisma.cartItem.create.mockResolvedValue({ id: 'item-new' });
      mockPrisma.cartItem.findMany.mockResolvedValue([]);

      await service.addItem('user-1', { productId: 'prod-1', quantity: 2 });

      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cartId: 'cart-1',
          productId: 'prod-1',
          quantity: 2,
          priceSnapshot: 250,
        }),
      });
    });

    it('should increment quantity when product already exists in cart', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        price: 250,
        status: ProductStatus.PUBLISHED,
        tenant: { isPublished: true, status: TenantStatus.ACTIVE },
      });

      mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', userId: 'user-1' });
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'existing-item',
        quantity: 3,
      });
      mockPrisma.cartItem.update.mockResolvedValue({});
      mockPrisma.cartItem.findMany.mockResolvedValue([]);

      await service.addItem('user-1', { productId: 'prod-1', quantity: 2 });

      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'existing-item' },
        data: {
          quantity: 5,
          priceSnapshot: 250,
        },
      });
    });

    it('should throw BadRequestException if purchase limit of 50 is exceeded', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        status: ProductStatus.PUBLISHED,
        tenant: { isPublished: true, status: TenantStatus.ACTIVE },
      });

      mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', userId: 'user-1' });
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'existing-item',
        quantity: 45,
      });

      await expect(
        service.addItem('user-1', { productId: 'prod-1', quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if product is unpublished or draft', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-draft',
        status: ProductStatus.DRAFT,
        tenant: { isPublished: true, status: TenantStatus.ACTIVE },
      });

      await expect(
        service.addItem('user-1', { productId: 'prod-draft', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if store is suspended', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        status: ProductStatus.PUBLISHED,
        tenant: { isPublished: true, status: TenantStatus.SUSPENDED },
      });

      await expect(service.addItem('user-1', { productId: 'prod-1', quantity: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem('user-1', { productId: 'non-existent', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateItem', () => {
    it('should update item quantity in cart', async () => {
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cart: { userId: 'user-1' },
        product: { price: 100, status: ProductStatus.PUBLISHED },
      });
      mockPrisma.cartItem.update.mockResolvedValue({});
      mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', userId: 'user-1' });
      mockPrisma.cartItem.findMany.mockResolvedValue([]);

      await service.updateItem('user-1', 'item-1', { quantity: 4 });

      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 4, priceSnapshot: 100 },
      });
    });

    it('should throw NotFoundException if cart item belongs to another customer', async () => {
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cart: { userId: 'different-user' },
        product: { status: ProductStatus.PUBLISHED },
      });

      await expect(service.updateItem('user-1', 'item-1', { quantity: 2 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeItem', () => {
    it('should remove item from customer cart', async () => {
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cart: { userId: 'user-1' },
      });
      mockPrisma.cartItem.delete.mockResolvedValue({});
      mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', userId: 'user-1' });
      mockPrisma.cartItem.findMany.mockResolvedValue([]);

      await service.removeItem('user-1', 'item-1');

      expect(mockPrisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });

    it('should throw NotFoundException if item belongs to another customer', async () => {
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cart: { userId: 'user-2' },
      });

      await expect(service.removeItem('user-1', 'item-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearCart', () => {
    it('should clear all items in user cart', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', userId: 'user-1' });
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.cartItem.findMany.mockResolvedValue([]);

      await service.clearCart('user-1');

      expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
    });
  });
});
