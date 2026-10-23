import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductStatus, TenantStatus } from '@prisma/client';

describe('CheckoutService', () => {
  let service: CheckoutService;

  const mockPrisma: any = {
    cart: {
      findUnique: jest.fn(),
    },
    customerAddress: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
    jest.clearAllMocks();
  });

  describe('validateCheckout', () => {
    const validSavedAddress = {
      id: 'addr-1',
      userId: 'user-1',
      fullName: 'Arjun Sharma',
      phone: '+919876543210',
      addressLine1: 'Flat 402, Vrindavan Heights',
      addressLine2: null,
      city: 'Mathura',
      state: 'UP',
      postalCode: '281001',
      country: 'IN',
      landmark: null,
      addressType: 'HOME',
    };

    it('should successfully validate checkout for single store with saved address', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        currency: 'INR',
        items: [
          {
            id: 'item-1',
            cartId: 'cart-1',
            productId: 'prod-1',
            quantity: 2,
            priceSnapshot: 150,
            product: {
              id: 'prod-1',
              tenantId: 'tenant-1',
              name: 'Terracotta Diya',
              slug: 'terracotta-diya',
              sku: 'TD-01',
              price: 150,
              currency: 'INR',
              status: ProductStatus.PUBLISHED,
              tenant: {
                id: 'tenant-1',
                businessName: 'Vedic Pottery',
                storeSlug: 'vedic-pottery',
                currency: 'INR',
                isPublished: true,
                status: TenantStatus.ACTIVE,
              },
            },
          },
        ],
      });

      mockPrisma.customerAddress.findFirst.mockResolvedValue(validSavedAddress);

      const result = await service.validateCheckout('user-1', {
        addressId: 'addr-1',
      });

      expect(result.isValid).toBe(true);
      expect(result.isReadyForOrder).toBe(true);
      expect(result.tenantId).toBe('tenant-1');
      expect(result.itemCount).toBe(2);
      expect(result.pricing.subtotal.amount).toBe(300);
      expect(result.pricing.subtotal.minorUnits).toBe(30000); // 30000 paise
      expect(result.shippingAddress.fullName).toBe('Arjun Sharma');
      expect(result.pricing.tax.isCalculated).toBe(false);
      expect(result.pricing.shipping.isCalculated).toBe(false);
    });

    it('should throw BadRequestException if shopping cart is empty', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [],
      });

      await expect(service.validateCheckout('user-1', { addressId: 'addr-1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if cart has multiple stores and no tenantId specified', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
            priceSnapshot: 100,
            product: {
              tenantId: 'tenant-a',
              status: ProductStatus.PUBLISHED,
              price: 100,
              tenant: { id: 'tenant-a', isPublished: true, status: TenantStatus.ACTIVE },
            },
          },
          {
            productId: 'prod-2',
            quantity: 1,
            priceSnapshot: 200,
            product: {
              tenantId: 'tenant-b',
              status: ProductStatus.PUBLISHED,
              price: 200,
              tenant: { id: 'tenant-b', isPublished: true, status: TenantStatus.ACTIVE },
            },
          },
        ],
      });

      await expect(service.validateCheckout('user-1', { addressId: 'addr-1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should succeed when tenantId is specified for multi-store cart', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        currency: 'INR',
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
            priceSnapshot: 100,
            product: {
              id: 'prod-1',
              tenantId: 'tenant-a',
              name: 'Store A Product',
              slug: 'store-a-prod',
              sku: 'A-1',
              status: ProductStatus.PUBLISHED,
              price: 100,
              currency: 'INR',
              tenant: {
                id: 'tenant-a',
                businessName: 'Store A',
                storeSlug: 'store-a',
                currency: 'INR',
                isPublished: true,
                status: TenantStatus.ACTIVE,
              },
            },
          },
          {
            productId: 'prod-2',
            quantity: 1,
            priceSnapshot: 200,
            product: {
              id: 'prod-2',
              tenantId: 'tenant-b',
              name: 'Store B Product',
              status: ProductStatus.PUBLISHED,
              price: 200,
              tenant: {
                id: 'tenant-b',
                businessName: 'Store B',
                storeSlug: 'store-b',
                isPublished: true,
                status: TenantStatus.ACTIVE,
              },
            },
          },
        ],
      });

      mockPrisma.customerAddress.findFirst.mockResolvedValue(validSavedAddress);

      const result = await service.validateCheckout('user-1', {
        tenantId: 'tenant-a',
        addressId: 'addr-1',
      });

      expect(result.isValid).toBe(true);
      expect(result.tenantId).toBe('tenant-a');
      expect(result.items).toHaveLength(1);
      expect(result.pricing.subtotal.amount).toBe(100);
    });

    it('should throw BadRequestException if item product has been unpublished', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
            priceSnapshot: 100,
            product: {
              id: 'prod-1',
              tenantId: 'tenant-1',
              name: 'Unpublished Item',
              status: ProductStatus.DRAFT, // Product changed to draft!
              price: 100,
              tenant: { id: 'tenant-1', isPublished: true, status: TenantStatus.ACTIVE },
            },
          },
        ],
      });

      await expect(service.validateCheckout('user-1', { addressId: 'addr-1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if store is suspended', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
            priceSnapshot: 100,
            product: {
              tenantId: 'tenant-1',
              status: ProductStatus.PUBLISHED,
              price: 100,
              tenant: { id: 'tenant-1', isPublished: true, status: TenantStatus.SUSPENDED },
            },
          },
        ],
      });

      await expect(service.validateCheckout('user-1', { addressId: 'addr-1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should detect price changes and include advisory warnings', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        currency: 'INR',
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
            priceSnapshot: 100, // Added at 100
            product: {
              id: 'prod-1',
              tenantId: 'tenant-1',
              name: 'Diya',
              slug: 'diya',
              sku: null,
              status: ProductStatus.PUBLISHED,
              price: 150, // Changed to 150
              currency: 'INR',
              tenant: {
                id: 'tenant-1',
                businessName: 'Vedic Crafts',
                storeSlug: 'vedic-crafts',
                currency: 'INR',
                isPublished: true,
                status: TenantStatus.ACTIVE,
              },
            },
          },
        ],
      });

      mockPrisma.customerAddress.findFirst.mockResolvedValue(validSavedAddress);

      const result = await service.validateCheckout('user-1', { addressId: 'addr-1' });

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain(
        'Price for "Diya" updated from INR 100.00 to INR 150.00',
      );
      expect(result.pricing.subtotal.amount).toBe(150); // Calculates with fresh trusted price
    });

    it('should throw NotFoundException if saved address does not belong to customer', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
            priceSnapshot: 100,
            product: {
              tenantId: 'tenant-1',
              status: ProductStatus.PUBLISHED,
              price: 100,
              tenant: { id: 'tenant-1', isPublished: true, status: TenantStatus.ACTIVE },
            },
          },
        ],
      });

      // Address not found for user-1
      mockPrisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.validateCheckout('user-1', { addressId: 'other-user-addr' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if neither addressId nor shippingAddress is provided', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
            priceSnapshot: 100,
            product: {
              tenantId: 'tenant-1',
              status: ProductStatus.PUBLISHED,
              price: 100,
              tenant: { id: 'tenant-1', isPublished: true, status: TenantStatus.ACTIVE },
            },
          },
        ],
      });

      await expect(service.validateCheckout('user-1', {})).rejects.toThrow(BadRequestException);
    });
  });
});
