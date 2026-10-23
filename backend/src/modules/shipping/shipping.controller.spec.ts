import { Test, TestingModule } from '@nestjs/testing';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { PlatformRole, ShipmentStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ShippingController', () => {
  let controller: ShippingController;
  let service: jest.Mocked<ShippingService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  beforeEach(async () => {
    const mockShippingService = {
      getReadyOrders: jest.fn().mockResolvedValue({ orders: [], total: 0 }),
      createShipment: jest.fn().mockResolvedValue({ id: 'shipment-1' }),
      listOrderShipments: jest.fn().mockResolvedValue([]),
      getShipmentById: jest.fn().mockResolvedValue({ id: 'shipment-1' }),
      updateShipmentStatus: jest
        .fn()
        .mockResolvedValue({ id: 'shipment-1', status: ShipmentStatus.IN_TRANSIT }),
      dispatchShipment: jest
        .fn()
        .mockResolvedValue({ id: 'shipment-1', status: ShipmentStatus.SHIPPED }),
      getCustomerOrderTracking: jest.fn().mockResolvedValue({ orderId: 'order-1', shipments: [] }),
      handleShippingWebhook: jest.fn().mockResolvedValue({ received: true, processed: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShippingController],
      providers: [
        {
          provide: ShippingService,
          useValue: mockShippingService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ShippingController>(ShippingController);
    service = module.get(ShippingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getReadyOrders to service', async () => {
    const query = { page: 1, limit: 10 };
    await controller.getReadyOrders(mockUser, query, 'tenant-1');
    expect(service.getReadyOrders).toHaveBeenCalledWith(mockUser, query, 'tenant-1');
  });

  it('should delegate createShipment to service', async () => {
    const dto = { packageWeight: 2.0 };
    await controller.createShipment(mockUser, 'order-1', dto as any);
    expect(service.createShipment).toHaveBeenCalledWith(mockUser, 'order-1', dto);
  });

  it('should delegate listOrderShipments to service', async () => {
    await controller.listOrderShipments(mockUser, 'order-1');
    expect(service.listOrderShipments).toHaveBeenCalledWith(mockUser, 'order-1');
  });

  it('should delegate getShipment to service', async () => {
    await controller.getShipment(mockUser, 'shipment-1');
    expect(service.getShipmentById).toHaveBeenCalledWith(mockUser, 'shipment-1');
  });

  it('should delegate updateShipmentStatus to service', async () => {
    const dto = { status: ShipmentStatus.IN_TRANSIT };
    await controller.updateShipmentStatus(mockUser, 'shipment-1', dto);
    expect(service.updateShipmentStatus).toHaveBeenCalledWith(mockUser, 'shipment-1', dto);
  });

  it('should delegate dispatchShipment to service', async () => {
    await controller.dispatchShipment(mockUser, 'shipment-1');
    expect(service.dispatchShipment).toHaveBeenCalledWith(mockUser, 'shipment-1');
  });

  it('should delegate getCustomerOrderTracking to service', async () => {
    await controller.getCustomerOrderTracking(mockUser, 'order-1');
    expect(service.getCustomerOrderTracking).toHaveBeenCalledWith(mockUser, 'order-1');
  });

  it('should delegate handleCarrierWebhook to service', async () => {
    const body = { trackingNumber: 'TRK-1' };
    const req = { rawBody: '{"trackingNumber":"TRK-1"}' } as any;
    await controller.handleCarrierWebhook('sandbox', 'sig-123', '', body, req);
    expect(service.handleShippingWebhook).toHaveBeenCalledWith(
      'sandbox',
      'sig-123',
      '{"trackingNumber":"TRK-1"}',
      body,
    );
  });
});
