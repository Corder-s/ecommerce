import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { BillingInterval, SubscriptionStatus, TenantRole } from '@prisma/client';
import { AuthenticatedUser, TenantContext } from '../auth/interfaces/auth.interface';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/guards/tenant-access.guard';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let mockService: any;

  const mockTenant: TenantContext = {
    tenantId: 'tenant-1',
    role: TenantRole.STORE_OWNER,
    membershipId: 'mem-1',
    status: 'ACTIVE' as any,
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User One',
    platformRole: 'USER' as any,
    memberships: [],
  };

  beforeEach(async () => {
    mockService = {
      listPlans: jest.fn().mockResolvedValue([]),
      getCurrentSubscription: jest
        .fn()
        .mockResolvedValue({ id: 'sub-1', status: SubscriptionStatus.ACTIVE }),
      createSubscriptionCheckout: jest
        .fn()
        .mockResolvedValue({ providerSubscriptionId: 'sub_123' }),
      cancelSubscription: jest.fn().mockResolvedValue({ success: true }),
      getBillingHistory: jest.fn().mockResolvedValue([]),
      handleSubscriptionWebhook: jest.fn().mockResolvedValue({ received: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
  });

  it('should delegate listPlans to service', async () => {
    await controller.listPlans();
    expect(mockService.listPlans).toHaveBeenCalled();
  });

  it('should delegate getCurrentSubscription to service', async () => {
    await controller.getCurrentSubscription(mockTenant);
    expect(mockService.getCurrentSubscription).toHaveBeenCalledWith('tenant-1');
  });

  it('should delegate checkoutSubscription to service', async () => {
    const dto = { planSlug: 'growth', billingInterval: BillingInterval.MONTHLY };
    await controller.checkoutSubscription(mockTenant, mockUser, dto);
    expect(mockService.createSubscriptionCheckout).toHaveBeenCalledWith('tenant-1', mockUser, dto);
  });

  it('should delegate cancelSubscription to service', async () => {
    const dto = { cancelAtPeriodEnd: true };
    await controller.cancelSubscription(mockTenant, dto);
    expect(mockService.cancelSubscription).toHaveBeenCalledWith('tenant-1', dto);
  });

  it('should delegate getBillingHistory to service', async () => {
    await controller.getBillingHistory(mockTenant);
    expect(mockService.getBillingHistory).toHaveBeenCalledWith('tenant-1');
  });

  it('should throw BadRequestException if signature header is missing from webhook', async () => {
    await expect(
      controller.handleSubscriptionWebhook('sandbox', { eventId: 'evt-1' }, {}),
    ).rejects.toThrow(BadRequestException);
  });

  it('should delegate handleSubscriptionWebhook to service with signature', async () => {
    const headers = { 'x-signature': 'sig123' };
    await controller.handleSubscriptionWebhook('sandbox', { eventId: 'evt-1' }, headers);
    expect(mockService.handleSubscriptionWebhook).toHaveBeenCalledWith(
      'sandbox',
      { eventId: 'evt-1' },
      'sig123',
      headers,
    );
  });
});
