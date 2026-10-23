import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomerProfileService } from './services/customer-profile.service';
import { CustomerAddressesService } from './services/customer-addresses.service';
import { CustomerWishlistService } from './services/customer-wishlist.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { PlatformRole } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('CustomersController', () => {
  let controller: CustomersController;
  let profileService: CustomerProfileService;
  let addressesService: CustomerAddressesService;
  let wishlistService: CustomerWishlistService;

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    name: 'Arjun Sharma',
    email: 'arjun@example.com',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const mockProfileService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  };

  const mockAddressesService = {
    listAddresses: jest.fn(),
    createAddress: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
    setDefaultAddress: jest.fn(),
  };

  const mockWishlistService = {
    listWishlist: jest.fn(),
    addToWishlist: jest.fn(),
    removeFromWishlist: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        { provide: CustomerProfileService, useValue: mockProfileService },
        { provide: CustomerAddressesService, useValue: mockAddressesService },
        { provide: CustomerWishlistService, useValue: mockWishlistService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomersController>(CustomersController);
    profileService = module.get<CustomerProfileService>(CustomerProfileService);
    addressesService = module.get<CustomerAddressesService>(CustomerAddressesService);
    wishlistService = module.get<CustomerWishlistService>(CustomerWishlistService);
    jest.clearAllMocks();
  });

  describe('Profile Endpoints', () => {
    it('getProfile should delegate to profileService with authenticated user id', async () => {
      mockProfileService.getProfile.mockResolvedValue({ id: 'user-uuid-1', name: 'Arjun' });

      const result = await controller.getProfile(mockUser);
      expect(result.id).toBe('user-uuid-1');
      expect(profileService.getProfile).toHaveBeenCalledWith('user-uuid-1');
    });

    it('updateProfile should delegate to profileService with body DTO', async () => {
      const dto = { name: 'Arjun S.', bio: 'Artisan' };
      mockProfileService.updateProfile.mockResolvedValue({ id: 'user-uuid-1', ...dto });

      const result = await controller.updateProfile(mockUser, dto);
      expect(result.name).toBe('Arjun S.');
      expect(profileService.updateProfile).toHaveBeenCalledWith('user-uuid-1', dto);
    });
  });

  describe('Address Endpoints', () => {
    it('listAddresses should delegate to addressesService', async () => {
      mockAddressesService.listAddresses.mockResolvedValue([]);
      await controller.listAddresses(mockUser);
      expect(addressesService.listAddresses).toHaveBeenCalledWith('user-uuid-1');
    });

    it('createAddress should delegate to addressesService', async () => {
      const dto = {
        fullName: 'Arjun',
        phone: '+919876543210',
        addressLine1: 'Street 1',
        city: 'Mathura',
        state: 'UP',
        postalCode: '281001',
      };
      mockAddressesService.createAddress.mockResolvedValue({ id: 'addr-1', ...dto });

      await controller.createAddress(mockUser, dto);
      expect(addressesService.createAddress).toHaveBeenCalledWith('user-uuid-1', dto);
    });

    it('updateAddress should delegate to addressesService', async () => {
      const dto = { city: 'Agra' };
      mockAddressesService.updateAddress.mockResolvedValue({ id: 'addr-1', ...dto });

      await controller.updateAddress(mockUser, 'addr-1', dto);
      expect(addressesService.updateAddress).toHaveBeenCalledWith('user-uuid-1', 'addr-1', dto);
    });

    it('deleteAddress should delegate to addressesService', async () => {
      mockAddressesService.deleteAddress.mockResolvedValue({ success: true });
      await controller.deleteAddress(mockUser, 'addr-1');
      expect(addressesService.deleteAddress).toHaveBeenCalledWith('user-uuid-1', 'addr-1');
    });

    it('setDefaultAddress should delegate to addressesService', async () => {
      mockAddressesService.setDefaultAddress.mockResolvedValue({ id: 'addr-1', isDefault: true });
      await controller.setDefaultAddress(mockUser, 'addr-1');
      expect(addressesService.setDefaultAddress).toHaveBeenCalledWith('user-uuid-1', 'addr-1');
    });
  });

  describe('Wishlist Endpoints', () => {
    it('listWishlist should delegate to wishlistService', async () => {
      mockWishlistService.listWishlist.mockResolvedValue({ items: [], meta: {} });
      await controller.listWishlist(mockUser, { page: 1, limit: 10 });
      expect(wishlistService.listWishlist).toHaveBeenCalledWith('user-uuid-1', {
        page: 1,
        limit: 10,
      });
    });

    it('addToWishlist should delegate to wishlistService', async () => {
      const dto = { productId: 'prod-uuid-1' };
      mockWishlistService.addToWishlist.mockResolvedValue({ id: 'w-1', productId: 'prod-uuid-1' });

      await controller.addToWishlist(mockUser, dto);
      expect(wishlistService.addToWishlist).toHaveBeenCalledWith('user-uuid-1', dto);
    });

    it('removeFromWishlist should delegate to wishlistService', async () => {
      mockWishlistService.removeFromWishlist.mockResolvedValue({ success: true });
      await controller.removeFromWishlist(mockUser, 'item-1');
      expect(wishlistService.removeFromWishlist).toHaveBeenCalledWith('user-uuid-1', 'item-1');
    });
  });
});
