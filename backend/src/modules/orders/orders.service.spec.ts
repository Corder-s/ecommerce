import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  ReservationStatus,
  TenantStatus,
  TenantRole,
  PlatformRole,
  Prisma,
} from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockCustomerUser: AuthenticatedUser = {
    id: 'user-customer-1',
    name: 'Customer One',
    email: 'customer1@example.com',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const mockOtherCustomer: AuthenticatedUser = {
    id: 'user-customer-2',
    name: 'Customer Two',
    email: 'customer2@example.com',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const mockStoreOwnerUser: AuthenticatedUser = {
    id: 'user-owner-1',
    name: 'Store Owner',
    email: 'owner@example.com',
    platformRole: PlatformRole.USER,
    memberships: [
      {
        id: 'mem-1',
        tenantId: 'tenant-1',
        role: TenantRole.STORE_OWNER,
        status: 'ACTIVE' as any,
      },
    ],
  };

  const mockPrisma = {
    cart: {
      findUnique: jest.fn(),
    },
    cartItem: {
      deleteMany: jest.fn(),
    },
    product: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    customerAddress: {
      findFirst: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      create: jest.fn(),
    },
    inventoryReservation: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    idempotencyRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const validSavedAddress = {
      id: 'addr-1',
      userId: 'user-customer-1',
      fullName: 'Customer One',
      phone: '+919876543210',
      addressLine1: 'Govardhan Villa',
      addressLine2: 'Sector 4',
      city: 'Mathura',
      state: 'UP',
      postalCode: '281001',
      country: 'IN',
      landmark: null,
    };

    const validProduct = {
      id: 'prod-1',
      tenantId: 'tenant-1',
      name: 'Organic Clay Diya',
      sku: 'DIYA-01',
      price: new Prisma.Decimal(150),
      stock: 10,
      status: ProductStatus.PUBLISHED,
      tenant: {
        id: 'tenant-1',
        businessName: 'Vedic Handicrafts',
        storeSlug: 'vedic-handicrafts',
        isPublished: true,
        status: TenantStatus.ACTIVE,
      },
    };

    const validCart = {
      id: 'cart-1',
      userId: 'user-customer-1',
      items: [
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: 'prod-1',
          quantity: 2,
          product: validProduct,
        },
      ],
    };

    it('should create order and reserve stock atomically', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(validCart);
      mockPrisma.customerAddress.findFirst.mockResolvedValue(validSavedAddress);

      const createdOrderFixture = {
        id: 'ord-1',
        orderNumber: 'GS-20261022-TEST1',
        userId: 'user-customer-1',
        tenantId: 'tenant-1',
        status: OrderStatus.PLACED,
        paymentStatus: PaymentStatus.PENDING,
        currency: 'INR',
        subtotal: new Prisma.Decimal(300),
        taxAmount: new Prisma.Decimal(0),
        shippingAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(300),
        shippingAddress: validSavedAddress,
        customerNote: 'Fragile delivery',
        cancelReason: null,
        cancelledAt: null,
        items: [
          {
            id: 'ord-item-1',
            orderId: 'ord-1',
            productId: 'prod-1',
            productName: 'Organic Clay Diya',
            sku: 'DIYA-01',
            unitPrice: new Prisma.Decimal(150),
            quantity: 2,
            subtotal: new Prisma.Decimal(300),
            createdAt: new Date(),
          },
        ],
        reservations: [
          {
            id: 'res-1',
            productId: 'prod-1',
            quantity: 2,
            status: ReservationStatus.RESERVED,
            releasedAt: null,
            createdAt: new Date(),
          },
        ],
        statusHistory: [
          {
            id: 'hist-1',
            fromStatus: null,
            toStatus: OrderStatus.PLACED,
            changedBy: 'user-customer-1',
            reason: 'Order placed by customer',
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          product: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          order: {
            create: jest.fn().mockResolvedValue(createdOrderFixture),
          },
          orderItem: {
            create: jest.fn().mockResolvedValue({}),
          },
          inventoryReservation: {
            create: jest.fn().mockResolvedValue({}),
          },
          orderStatusHistory: {
            create: jest.fn().mockResolvedValue({}),
          },
          cartItem: {
            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return cb(tx);
      });

      mockPrisma.order.findUnique.mockResolvedValue(createdOrderFixture);

      const result = await service.createOrder(mockCustomerUser, {
        addressId: 'addr-1',
        customerNote: 'Fragile delivery',
      });

      expect(result.id).toBe('ord-1');
      expect(result.status).toBe(OrderStatus.PLACED);
      expect(result.totalAmount.amount).toBe(300);
      expect(result.totalAmount.minorUnits).toBe(30000);
      expect(result.items).toHaveLength(1);
    });

    it('should return cached response when idempotency key is repeated', async () => {
      const cachedOrder = {
        id: 'ord-cached-1',
        orderNumber: 'GS-20261022-CACHED',
        totalAmount: { amount: 300, minorUnits: 30000, currency: 'INR', formatted: 'INR 300.00' },
      };

      mockPrisma.idempotencyRecord.findUnique.mockResolvedValue({
        id: 'idem-1',
        response: cachedOrder,
        expiresAt: new Date(Date.now() + 10000),
      });

      const result = await service.createOrder(
        mockCustomerUser,
        { addressId: 'addr-1' },
        'idempotency-key-123',
      );

      expect(result.id).toBe('ord-cached-1');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reject order creation if cart is empty', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });

      await expect(service.createOrder(mockCustomerUser, { addressId: 'addr-1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject order creation if product has insufficient stock', async () => {
      const lowStockCart = {
        id: 'cart-1',
        items: [
          {
            id: 'item-1',
            quantity: 15, // Requested 15, stock is 10
            product: validProduct,
          },
        ],
      };

      mockPrisma.cart.findUnique.mockResolvedValue(lowStockCart);
      mockPrisma.customerAddress.findFirst.mockResolvedValue(validSavedAddress);

      await expect(service.createOrder(mockCustomerUser, { addressId: 'addr-1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should rollback and reject if concurrent purchase depletes stock during transaction', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(validCart);
      mockPrisma.customerAddress.findFirst.mockResolvedValue(validSavedAddress);

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          product: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }), // 0 rows updated -> stock was taken!
          },
        };
        return cb(tx);
      });

      await expect(service.createOrder(mockCustomerUser, { addressId: 'addr-1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject order if delivery address does not belong to customer (IDOR)', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(validCart);
      mockPrisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrder(mockCustomerUser, { addressId: 'foreign-address-id' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrderStatus (State Machine & Permissions)', () => {
    const existingOrder = {
      id: 'ord-1',
      orderNumber: 'GS-20261022-001',
      userId: 'user-customer-1',
      tenantId: 'tenant-1',
      status: OrderStatus.PLACED,
      subtotal: new Prisma.Decimal(200),
      taxAmount: new Prisma.Decimal(0),
      shippingAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(200),
      currency: 'INR',
      shippingAddress: {},
      items: [],
      reservations: [],
      statusHistory: [],
    };

    it('should allow authorized store staff to advance status from PLACED to CONFIRMED', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          order: { update: jest.fn() },
          orderStatusHistory: { create: jest.fn() },
        };
        return cb(tx);
      });

      const updatedFixture = {
        ...existingOrder,
        status: OrderStatus.CONFIRMED,
      };
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(existingOrder)
        .mockResolvedValueOnce(updatedFixture);

      const result = await service.updateOrderStatus(mockStoreOwnerUser, 'ord-1', {
        status: OrderStatus.CONFIRMED,
        reason: 'Payment verified and order accepted',
      });

      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should reject customer attempting to update order status (403 Forbidden)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(existingOrder);

      await expect(
        service.updateOrderStatus(mockCustomerUser, 'ord-1', {
          status: OrderStatus.SHIPPED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject invalid state transition (e.g. PLACED -> DELIVERED)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(existingOrder);

      await expect(
        service.updateOrderStatus(mockStoreOwnerUser, 'ord-1', {
          status: OrderStatus.DELIVERED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelOrder & Inventory Restoration', () => {
    const placedOrder = {
      id: 'ord-1',
      orderNumber: 'GS-20261022-001',
      userId: 'user-customer-1',
      tenantId: 'tenant-1',
      status: OrderStatus.PLACED,
      subtotal: new Prisma.Decimal(200),
      taxAmount: new Prisma.Decimal(0),
      shippingAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(200),
      currency: 'INR',
      shippingAddress: {},
      items: [],
      reservations: [
        {
          id: 'res-1',
          productId: 'prod-1',
          quantity: 2,
          status: ReservationStatus.RESERVED,
        },
      ],
      statusHistory: [],
    };

    it('should cancel PLACED order, release reservations, and restore stock', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          inventoryReservation: {
            findMany: jest.fn().mockResolvedValue(placedOrder.reservations),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          product: { update: jest.fn().mockResolvedValue({}) },
          order: { update: jest.fn().mockResolvedValue({}) },
          orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const cancelledFixture = {
        ...placedOrder,
        status: OrderStatus.CANCELLED,
        cancelReason: 'Customer requested cancellation',
        cancelledAt: new Date(),
      };
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(placedOrder)
        .mockResolvedValueOnce(cancelledFixture);

      const result = await service.cancelOrder(mockCustomerUser, 'ord-1', {
        reason: 'Customer requested cancellation',
      });

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.cancelReason).toBe('Customer requested cancellation');
    });

    it('should reject cancellation of already SHIPPED orders', async () => {
      const shippedOrder = {
        ...placedOrder,
        status: OrderStatus.SHIPPED,
      };
      mockPrisma.order.findUnique.mockResolvedValue(shippedOrder);

      await expect(
        service.cancelOrder(mockCustomerUser, 'ord-1', { reason: 'Changed mind' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate cancellation of already CANCELLED order', async () => {
      const alreadyCancelled = {
        ...placedOrder,
        status: OrderStatus.CANCELLED,
      };
      mockPrisma.order.findUnique.mockResolvedValue(alreadyCancelled);

      await expect(
        service.cancelOrder(mockCustomerUser, 'ord-1', { reason: 'Retry' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent Customer B from cancelling Customer A order (IDOR)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(placedOrder);

      await expect(
        service.cancelOrder(mockOtherCustomer, 'ord-1', { reason: 'Malicious cancel' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrderById & listOrders', () => {
    const orderFixture = {
      id: 'ord-1',
      orderNumber: 'GS-20261022-001',
      userId: 'user-customer-1',
      tenantId: 'tenant-1',
      status: OrderStatus.PLACED,
      subtotal: new Prisma.Decimal(200),
      taxAmount: new Prisma.Decimal(0),
      shippingAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(200),
      currency: 'INR',
      shippingAddress: {},
      items: [],
      reservations: [],
      statusHistory: [],
    };

    it('should allow customer to retrieve own order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(orderFixture);

      const result = await service.getOrderById(mockCustomerUser, 'ord-1');
      expect(result.id).toBe('ord-1');
    });

    it('should prevent unauthorized customer from viewing another customer order (404 IDOR)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(orderFixture);

      await expect(service.getOrderById(mockOtherCustomer, 'ord-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow store owner to view orders for their tenant', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(orderFixture);

      const result = await service.getOrderById(mockStoreOwnerUser, 'ord-1');
      expect(result.id).toBe('ord-1');
    });

    it('should reject store staff viewing orders of another tenant', async () => {
      const otherTenantUser: AuthenticatedUser = {
        id: 'user-other-store',
        name: 'Other Store Owner',
        email: 'other@example.com',
        platformRole: PlatformRole.USER,
        memberships: [
          {
            id: 'mem-2',
            tenantId: 'tenant-2',
            role: TenantRole.STORE_OWNER,
            status: 'ACTIVE' as any,
          },
        ],
      };

      await expect(service.listOrders(otherTenantUser, { tenantId: 'tenant-1' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
