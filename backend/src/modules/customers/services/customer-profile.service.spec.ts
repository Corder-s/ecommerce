import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomerProfileService } from './customer-profile.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformRole } from '@prisma/client';

describe('CustomerProfileService', () => {
  let service: CustomerProfileService;

  const mockPrisma: any = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customerProfile: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerProfileService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CustomerProfileService>(CustomerProfileService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user and profile details for authenticated customer', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Arjun Sharma',
        email: 'arjun@example.com',
        phone: '+919876543210',
        platformRole: PlatformRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerProfile: {
          id: 'profile-1',
          userId: 'user-1',
          avatarUrl: 'https://example.com/avatar.jpg',
          bio: 'Pottery lover',
          dateOfBirth: new Date('1990-01-01'),
          preferences: { notifications: true },
          isActive: true,
          deactivatedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');

      expect(result.id).toBe('user-1');
      expect(result.name).toBe('Arjun Sharma');
      expect(result.profile?.bio).toBe('Pottery lover');
      expect(result.profile?.isActive).toBe(true);
    });

    it('should throw NotFoundException if customer user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should handle customer without existing profile record gracefully', async () => {
      const mockUser = {
        id: 'user-2',
        name: 'New Customer',
        email: 'new@example.com',
        phone: null,
        platformRole: PlatformRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerProfile: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-2');

      expect(result.id).toBe('user-2');
      expect(result.profile).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update permitted fields and profile metadata', async () => {
      const existingUser = {
        id: 'user-1',
        name: 'Arjun',
        email: 'arjun@example.com',
        phone: '+919876543210',
        customerProfile: null,
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(existingUser) // initial check
        .mockResolvedValueOnce({
          ...existingUser,
          name: 'Arjun Sharma Updated',
          customerProfile: {
            id: 'prof-1',
            bio: 'Updated bio',
            isActive: true,
            deactivatedAt: null,
          },
        }); // response fetch

      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.customerProfile.upsert.mockResolvedValue({});

      const result = await service.updateProfile('user-1', {
        name: 'Arjun Sharma Updated',
        bio: 'Updated bio',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Arjun Sharma Updated' },
      });
      expect(result.name).toBe('Arjun Sharma Updated');
      expect(result.profile?.bio).toBe('Updated bio');
    });

    it('should handle account deactivation by setting isActive: false and recording timestamp', async () => {
      const existingUser = {
        id: 'user-1',
        name: 'Arjun',
        email: 'arjun@example.com',
        customerProfile: { isActive: true },
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser).mockResolvedValueOnce({
        ...existingUser,
        customerProfile: {
          id: 'prof-1',
          isActive: false,
          deactivatedAt: new Date(),
        },
      });

      await service.updateProfile('user-1', {
        isActive: false,
      });

      expect(mockPrisma.customerProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          create: expect.objectContaining({
            isActive: false,
            deactivatedAt: expect.any(Date),
          }),
          update: expect.objectContaining({
            isActive: false,
            deactivatedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should handle account reactivation by clearing deactivatedAt timestamp', async () => {
      const existingUser = {
        id: 'user-1',
        name: 'Arjun',
        email: 'arjun@example.com',
        customerProfile: { isActive: false, deactivatedAt: new Date() },
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser).mockResolvedValueOnce({
        ...existingUser,
        customerProfile: {
          id: 'prof-1',
          isActive: true,
          deactivatedAt: null,
        },
      });

      await service.updateProfile('user-1', {
        isActive: true,
      });

      expect(mockPrisma.customerProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          update: expect.objectContaining({
            isActive: true,
            deactivatedAt: null,
          }),
        }),
      );
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile('ghost-id', { name: 'Ghost' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
