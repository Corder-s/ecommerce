import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { PlatformRole } from '@prisma/client';

describe('CheckoutController', () => {
  let controller: CheckoutController;
  let checkoutService: CheckoutService;

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    name: 'Customer One',
    email: 'customer1@example.com',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const mockCheckoutService = {
    validateCheckout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [{ provide: CheckoutService, useValue: mockCheckoutService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CheckoutController>(CheckoutController);
    checkoutService = module.get<CheckoutService>(CheckoutService);
    jest.clearAllMocks();
  });

  it('validateCheckout should delegate to checkoutService.validateCheckout with caller id', async () => {
    const dto = { addressId: 'addr-uuid-1' };
    mockCheckoutService.validateCheckout.mockResolvedValue({
      checkoutValidationId: 'chk-1',
      isValid: true,
      isReadyForOrder: true,
    });

    const result = await controller.validateCheckout(mockUser, dto);
    expect(result.isValid).toBe(true);
    expect(checkoutService.validateCheckout).toHaveBeenCalledWith('user-uuid-1', dto);
  });
});
