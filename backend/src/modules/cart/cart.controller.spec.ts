import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { PlatformRole } from '@prisma/client';

describe('CartController', () => {
  let controller: CartController;
  let cartService: CartService;

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    name: 'Customer One',
    email: 'customer1@example.com',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const mockCartService = {
    getCart: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    clearCart: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: mockCartService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CartController>(CartController);
    cartService = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  it('getCart should delegate to cartService.getCart with caller id', async () => {
    mockCartService.getCart.mockResolvedValue({ id: 'cart-1', itemCount: 0 });

    const result = await controller.getCart(mockUser);
    expect(result.id).toBe('cart-1');
    expect(cartService.getCart).toHaveBeenCalledWith('user-uuid-1');
  });

  it('addItem should delegate to cartService.addItem with caller id and body', async () => {
    const dto = { productId: 'prod-uuid-1', quantity: 2 };
    mockCartService.addItem.mockResolvedValue({ id: 'cart-1', itemCount: 2 });

    const result = await controller.addItem(mockUser, dto);
    expect(result.itemCount).toBe(2);
    expect(cartService.addItem).toHaveBeenCalledWith('user-uuid-1', dto);
  });

  it('updateItem should delegate to cartService.updateItem', async () => {
    const dto = { quantity: 4 };
    mockCartService.updateItem.mockResolvedValue({ id: 'cart-1', itemCount: 4 });

    const result = await controller.updateItem(mockUser, 'item-1', dto);
    expect(result.itemCount).toBe(4);
    expect(cartService.updateItem).toHaveBeenCalledWith('user-uuid-1', 'item-1', dto);
  });

  it('removeItem should delegate to cartService.removeItem', async () => {
    mockCartService.removeItem.mockResolvedValue({ id: 'cart-1', itemCount: 0 });

    const result = await controller.removeItem(mockUser, 'item-1');
    expect(result.itemCount).toBe(0);
    expect(cartService.removeItem).toHaveBeenCalledWith('user-uuid-1', 'item-1');
  });

  it('clearCart should delegate to cartService.clearCart', async () => {
    mockCartService.clearCart.mockResolvedValue({ id: 'cart-1', itemCount: 0 });

    const result = await controller.clearCart(mockUser);
    expect(result.itemCount).toBe(0);
    expect(cartService.clearCart).toHaveBeenCalledWith('user-uuid-1');
  });
});
