import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderStatus, PaymentStatus, PlatformRole } from '@prisma/client';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    name: 'Customer One',
    email: 'customer@example.com',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const mockOrderResponse = {
    id: 'ord-1',
    orderNumber: 'GS-20261022-001',
    userId: 'user-1',
    tenantId: 'tenant-1',
    status: OrderStatus.PLACED,
    paymentStatus: PaymentStatus.PENDING,
    currency: 'INR',
    subtotal: { amount: 300, minorUnits: 30000, currency: 'INR', formatted: 'INR 300.00' },
    taxAmount: { amount: 0, minorUnits: 0, currency: 'INR', formatted: 'INR 0.00' },
    shippingAmount: { amount: 0, minorUnits: 0, currency: 'INR', formatted: 'INR 0.00' },
    totalAmount: { amount: 300, minorUnits: 30000, currency: 'INR', formatted: 'INR 300.00' },
    shippingAddress: {
      fullName: 'Customer One',
      phone: '+919876543210',
      addressLine1: 'Govardhan Road',
      city: 'Mathura',
      state: 'UP',
      postalCode: '281001',
      country: 'IN',
    },
    customerNote: null,
    cancelReason: null,
    cancelledAt: null,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrdersService = {
    createOrder: jest.fn().mockResolvedValue(mockOrderResponse),
    listOrders: jest.fn().mockResolvedValue({
      orders: [mockOrderResponse],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    }),
    getOrderById: jest.fn().mockResolvedValue(mockOrderResponse),
    updateOrderStatus: jest.fn().mockResolvedValue({
      ...mockOrderResponse,
      status: OrderStatus.CONFIRMED,
    }),
    cancelOrder: jest.fn().mockResolvedValue({
      ...mockOrderResponse,
      status: OrderStatus.CANCELLED,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrder', () => {
    it('should call ordersService.createOrder with user, dto, and idempotency header', async () => {
      const dto = { addressId: 'a0000000-0000-4000-8000-000000000001' };
      const result = await controller.createOrder(mockUser, dto, 'idem-header-123');

      expect(service.createOrder).toHaveBeenCalledWith(mockUser, dto, 'idem-header-123');
      expect(result.id).toBe('ord-1');
    });
  });

  describe('listOrders', () => {
    it('should call ordersService.listOrders with query', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.listOrders(mockUser, query);

      expect(service.listOrders).toHaveBeenCalledWith(mockUser, query);
      expect(result.orders).toHaveLength(1);
    });
  });

  describe('getOrder', () => {
    it('should call ordersService.getOrderById', async () => {
      const result = await controller.getOrder(mockUser, 'a0000000-0000-4000-8000-000000000001');

      expect(service.getOrderById).toHaveBeenCalledWith(
        mockUser,
        'a0000000-0000-4000-8000-000000000001',
      );
      expect(result.id).toBe('ord-1');
    });
  });

  describe('updateOrderStatus', () => {
    it('should call ordersService.updateOrderStatus', async () => {
      const dto = { status: OrderStatus.CONFIRMED, reason: 'Payment received' };
      const result = await controller.updateOrderStatus(
        mockUser,
        'a0000000-0000-4000-8000-000000000001',
        dto,
      );

      expect(service.updateOrderStatus).toHaveBeenCalledWith(
        mockUser,
        'a0000000-0000-4000-8000-000000000001',
        dto,
      );
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });
  });

  describe('cancelOrder', () => {
    it('should call ordersService.cancelOrder', async () => {
      const dto = { reason: 'Customer requested' };
      const result = await controller.cancelOrder(
        mockUser,
        'a0000000-0000-4000-8000-000000000001',
        dto,
      );

      expect(service.cancelOrder).toHaveBeenCalledWith(
        mockUser,
        'a0000000-0000-4000-8000-000000000001',
        dto,
      );
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
