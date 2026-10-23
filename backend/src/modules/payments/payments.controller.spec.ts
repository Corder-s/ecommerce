import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PlatformRole, PaymentRecordStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let mockService: any;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User One',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  beforeEach(async () => {
    mockService = {
      initiateOrderPayment: jest.fn().mockResolvedValue({
        paymentRecordId: 'rec-1',
        provider: 'sandbox',
        providerPaymentId: 'pay_sbx_123',
        amount: 1500,
        currency: 'INR',
        status: PaymentRecordStatus.PENDING,
      }),
      listOrderPayments: jest.fn().mockResolvedValue([]),
      getPaymentById: jest.fn().mockResolvedValue({ id: 'rec-1' }),
      refundPayment: jest.fn().mockResolvedValue({ id: 'ref-1', amount: 500 }),
      handlePaymentWebhook: jest.fn().mockResolvedValue({ received: true, status: 'SUCCEEDED' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should delegate initiateOrderPayment to service', async () => {
    const res = await controller.initiateOrderPayment(mockUser, 'order-1', {
      paymentMethod: 'card',
    });
    expect(res).toBeDefined();
    expect(mockService.initiateOrderPayment).toHaveBeenCalledWith(mockUser, 'order-1', {
      paymentMethod: 'card',
    });
  });

  it('should delegate listOrderPayments to service', async () => {
    await controller.listOrderPayments(mockUser, 'order-1');
    expect(mockService.listOrderPayments).toHaveBeenCalledWith(mockUser, 'order-1');
  });

  it('should delegate getPayment to service', async () => {
    await controller.getPayment(mockUser, 'rec-1');
    expect(mockService.getPaymentById).toHaveBeenCalledWith(mockUser, 'rec-1');
  });

  it('should delegate refundPayment to service', async () => {
    await controller.refundPayment(mockUser, 'rec-1', { amount: 500 });
    expect(mockService.refundPayment).toHaveBeenCalledWith(mockUser, 'rec-1', { amount: 500 });
  });

  it('should throw BadRequestException if signature is missing from webhook', async () => {
    await expect(
      controller.handlePaymentWebhook('sandbox', { eventId: 'evt-1' }, {}),
    ).rejects.toThrow(BadRequestException);
  });

  it('should delegate webhook to service when signature header is present', async () => {
    const headers = { 'x-signature': 'sig123' };
    const res = await controller.handlePaymentWebhook('sandbox', { eventId: 'evt-1' }, headers);
    expect(res).toEqual({ received: true, status: 'SUCCEEDED' });
    expect(mockService.handlePaymentWebhook).toHaveBeenCalledWith(
      'sandbox',
      { eventId: 'evt-1' },
      'sig123',
      headers,
    );
  });
});
