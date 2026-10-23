import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  ReservationStatus,
  ShipmentStatus,
  PlatformRole,
  TenantRole,
  Prisma,
} from '@prisma/client';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SHIPPING_PROVIDER_TOKEN, IShippingProvider } from '../../integrations/shipping-provider';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

describe('ShippingService (Step 9: Fulfilment, Carrier Security & Order Tracking)', () => {
  let service: ShippingService;
  let mockPrisma: any;
  let mockShippingProvider: jest.Mocked<IShippingProvider>;

  const customerUser: AuthenticatedUser = {
    id: 'user-customer-1',
    email: 'customer@example.com',
    name: 'Customer One',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const strangerUser: AuthenticatedUser = {
    id: 'user-stranger-2',
    email: 'stranger@example.com',
    name: 'Stranger',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const storeOwnerUser: AuthenticatedUser = {
    id: 'user-owner-1',
    email: 'owner@example.com',
    name: 'Store Owner',
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

  const otherStoreOwnerUser: AuthenticatedUser = {
    id: 'user-owner-2',
    email: 'owner2@example.com',
    name: 'Other Store Owner',
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

  const baseOrder = {
    id: 'order-1',
    orderNumber: 'GS-20261022-ORD1',
    userId: 'user-customer-1',
    tenantId: 'tenant-1',
    status: OrderStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PAID,
    subtotal: new Prisma.Decimal(1200.0),
    taxAmount: new Prisma.Decimal(0.0),
    shippingAmount: new Prisma.Decimal(100.0),
    totalAmount: new Prisma.Decimal(1300.0),
    currency: 'INR',
    shippingAddress: {
      fullName: 'Customer One',
      phone: '+919876543210',
      addressLine1: '42 Vedic Marg',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      postalCode: '221001',
      country: 'IN',
    },
    items: [
      {
        id: 'item-1',
        productName: 'Handcrafted Cow Dung Diya (Pack of 12)',
        quantity: 2,
        sku: 'DIYA-12PK',
      },
    ],
    shipments: [],
  };

  const baseShipment = {
    id: 'shipment-1',
    tenantId: 'tenant-1',
    orderId: 'order-1',
    provider: 'sandbox',
    trackingNumber: 'GS-TRK-TEST123',
    status: ShipmentStatus.READY_TO_SHIP,
    packageWeight: new Prisma.Decimal(1.5),
    packageLength: new Prisma.Decimal(25.0),
    packageWidth: new Prisma.Decimal(15.0),
    packageHeight: new Prisma.Decimal(10.0),
    shippingCost: new Prisma.Decimal(85.0),
    currency: 'INR',
    shippedAt: null,
    deliveredAt: null,
    carrierNote: 'Fragile: Terracotta & Cow dung diyas',
    createdAt: new Date(),
    updatedAt: new Date(),
    events: [
      {
        id: 'evt-1',
        shippingRecordId: 'shipment-1',
        tenantId: 'tenant-1',
        status: ShipmentStatus.READY_TO_SHIP,
        description: 'Shipment created via sandbox',
        location: null,
        eventTimestamp: new Date(),
        source: 'SELLER_PORTAL',
        createdAt: new Date(),
      },
    ],
    order: {
      ...baseOrder,
      shipments: [],
    },
  };

  beforeEach(async () => {
    mockPrisma = {
      order: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      shippingRecord: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      shipmentEvent: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
      inventoryReservation: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockShippingProvider = {
      providerName: 'sandbox',
      createShipment: jest.fn().mockResolvedValue({
        provider: 'sandbox',
        trackingNumber: 'GS-TRK-MOCK-999',
        carrierReference: 'AWB-MOCK',
        estimatedDeliveryDays: 3,
        initialStatus: 'READY_TO_SHIP',
      }),
      trackShipment: jest.fn().mockResolvedValue({
        trackingNumber: 'GS-TRK-MOCK-999',
        status: 'IN_TRANSIT',
        description: 'Package scanned at sorting hub',
        timestamp: new Date(),
        events: [],
      }),
      cancelShipment: jest.fn().mockResolvedValue({ success: true }),
      checkCarrierEligibility: jest.fn().mockReturnValue({ isEligible: true }),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      parseWebhookEvent: jest.fn().mockReturnValue({
        eventId: 'evt-test-1',
        eventType: 'shipment.delivered',
        provider: 'sandbox',
        trackingNumber: 'GS-TRK-TEST123',
        status: 'DELIVERED',
        description: 'Package delivered to recipient',
        eventTimestamp: new Date(),
        rawPayload: {},
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'shipping.webhookSecret') return 'test_webhook_secret';
              return null;
            }),
          },
        },
        { provide: SHIPPING_PROVIDER_TOKEN, useValue: mockShippingProvider },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
  });

  describe('1. Ready Orders Retrieval (GET /api/v1/shipping/orders/ready)', () => {
    it('should return paginated ready orders for authorized tenant store staff', async () => {
      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.order.findMany.mockResolvedValue([
        {
          ...baseOrder,
          items: [{ quantity: 2 }],
          shipments: [],
        },
      ]);

      const result = await service.getReadyOrders(
        storeOwnerUser,
        { page: 1, limit: 10 },
        'tenant-1',
      );

      expect(result.total).toBe(1);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderNumber).toBe('GS-20261022-ORD1');
      expect(result.orders[0].itemCount).toBe(2);
    });

    it('should reject request without tenant identifier', async () => {
      await expect(service.getReadyOrders(storeOwnerUser, { page: 1, limit: 10 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject cross-tenant access when user has no membership in specified store', async () => {
      await expect(
        service.getReadyOrders(otherStoreOwnerUser, { page: 1, limit: 10 }, 'tenant-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('2. Shipment Creation (POST /api/v1/orders/:orderId/shipments)', () => {
    it('should create shipment for an eligible CONFIRMED order, update order to PROCESSING, and record history', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
      mockPrisma.shippingRecord.create.mockResolvedValue({
        ...baseShipment,
        id: 'new-ship-1',
      });
      mockPrisma.shippingRecord.findUnique.mockResolvedValue({
        ...baseShipment,
        id: 'new-ship-1',
      });

      const result = await service.createShipment(storeOwnerUser, 'order-1', {
        packageWeight: 1.5,
        packageLength: 25.0,
        packageWidth: 15.0,
        packageHeight: 10.0,
        shippingCost: 85.0,
        carrierNote: 'Fragile: Terracotta diyas',
      });

      expect(result.id).toBe('new-ship-1');
      expect(result.trackingNumber).toBe('GS-TRK-TEST123');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { status: OrderStatus.PROCESSING },
        }),
      );
      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalled();
    });

    it('should reject shipment creation for cancelled orders', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.CANCELLED,
      });

      await expect(
        service.createShipment(storeOwnerUser, 'order-1', { packageWeight: 1.5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject shipment creation for already delivered orders', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.DELIVERED,
      });

      await expect(
        service.createShipment(storeOwnerUser, 'order-1', { packageWeight: 1.5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject shipment creation when carrier eligibility check fails', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
      mockShippingProvider.checkCarrierEligibility.mockReturnValue({
        isEligible: false,
        reason:
          'Commercial air freight restricts bulk cow dung wood or bio-mass parcels exceeding 10kg.',
      });

      await expect(
        service.createShipment(storeOwnerUser, 'order-1', {
          packageWeight: 15.0,
          carrierCode: 'express_air',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject cross-tenant shipment creation attempt by unauthorized seller', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(baseOrder);

      await expect(
        service.createShipment(otherStoreOwnerUser, 'order-1', { packageWeight: 1.5 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Shipment Status Transitions & State Machine', () => {
    it('should dispatch shipment (READY_TO_SHIP -> SHIPPED) and transition order to SHIPPED and reservations to FULFILLED', async () => {
      mockPrisma.shippingRecord.findUnique
        .mockResolvedValueOnce(baseShipment) // inside dispatchShipment
        .mockResolvedValueOnce(baseShipment) // inside updateShipmentStatus
        .mockResolvedValueOnce({
          ...baseShipment,
          status: ShipmentStatus.SHIPPED,
          shippedAt: new Date(),
        });

      const result = await service.dispatchShipment(storeOwnerUser, 'shipment-1');

      expect(result.status).toBe(ShipmentStatus.SHIPPED);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { status: OrderStatus.SHIPPED },
        }),
      );
      expect(mockPrisma.inventoryReservation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: 'order-1', status: ReservationStatus.RESERVED },
          data: { status: ReservationStatus.FULFILLED },
        }),
      );
    });

    it('should transition to DELIVERED and advance order to DELIVERED when all packages are delivered', async () => {
      const shippedShipment = {
        ...baseShipment,
        status: ShipmentStatus.OUT_FOR_DELIVERY,
        shippedAt: new Date(),
        order: {
          ...baseOrder,
          status: OrderStatus.SHIPPED,
          shipments: [],
        },
      };

      mockPrisma.shippingRecord.findUnique
        .mockResolvedValueOnce(shippedShipment)
        .mockResolvedValueOnce({
          ...shippedShipment,
          status: ShipmentStatus.DELIVERED,
          deliveredAt: new Date(),
        });

      const result = await service.updateShipmentStatus(storeOwnerUser, 'shipment-1', {
        status: ShipmentStatus.DELIVERED,
        description: 'Delivered at customer address',
      });

      expect(result.status).toBe(ShipmentStatus.DELIVERED);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { status: OrderStatus.DELIVERED },
        }),
      );
    });

    it('should reject invalid backward or illegal status transitions (e.g., DELIVERED -> PENDING)', async () => {
      const deliveredShipment = {
        ...baseShipment,
        status: ShipmentStatus.DELIVERED,
      };
      mockPrisma.shippingRecord.findUnique.mockResolvedValue(deliveredShipment);

      await expect(
        service.updateShipmentStatus(storeOwnerUser, 'shipment-1', {
          status: ShipmentStatus.PENDING,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Customer Tracking & Ownership Security (IDOR Protection)', () => {
    it('should allow customer to track their own order with sanitized milestone events', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        shipments: [baseShipment],
      });

      const result = await service.getCustomerOrderTracking(customerUser, 'order-1');

      expect(result.orderId).toBe('order-1');
      expect(result.orderNumber).toBe('GS-20261022-ORD1');
      expect(result.shipments).toHaveLength(1);
      expect(result.shipments[0].trackingNumber).toBe('GS-TRK-TEST123');
      // Should not leak seller private notes or seller shipping cost to customer tracking response
      expect((result.shipments[0] as any).shippingCost).toBeUndefined();
      expect((result.shipments[0] as any).carrierNote).toBeUndefined();
    });

    it('should reject stranger trying to view another customers order tracking (IDOR rejection)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        shipments: [baseShipment],
      });

      await expect(service.getCustomerOrderTracking(strangerUser, 'order-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('5. Carrier Webhook Integration & Security', () => {
    it('should reject webhook with missing or invalid cryptographic HMAC signature', async () => {
      mockShippingProvider.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleShippingWebhook(
          'sandbox',
          'invalid-sig',
          '{"trackingNumber":"GS-TRK-TEST123"}',
          { trackingNumber: 'GS-TRK-TEST123' },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should process verified webhook and record shipment event', async () => {
      mockShippingProvider.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.shippingRecord.findFirst.mockResolvedValue({
        ...baseShipment,
        status: ShipmentStatus.OUT_FOR_DELIVERY,
      });
      mockPrisma.shipmentEvent.findFirst.mockResolvedValue(null);

      const result = await service.handleShippingWebhook(
        'sandbox',
        'valid-sig',
        '{"trackingNumber":"GS-TRK-TEST123"}',
        { trackingNumber: 'GS-TRK-TEST123' },
      );

      expect(result.processed).toBe(true);
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalled();
    });

    it('should deduplicate duplicate webhook events idempotently without double recording', async () => {
      mockShippingProvider.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.shippingRecord.findFirst.mockResolvedValue(baseShipment);
      mockPrisma.shipmentEvent.findFirst.mockResolvedValue({
        id: 'existing-event-id',
      });

      const result = await service.handleShippingWebhook(
        'sandbox',
        'valid-sig',
        '{"trackingNumber":"GS-TRK-TEST123"}',
        { trackingNumber: 'GS-TRK-TEST123' },
      );

      expect(result.deduplicated).toBe(true);
      expect(mockPrisma.shipmentEvent.create).not.toHaveBeenCalled();
    });
  });
});
