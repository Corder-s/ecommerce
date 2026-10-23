import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomerAddressesService } from './customer-addresses.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('CustomerAddressesService', () => {
  let service: CustomerAddressesService;

  const mockPrisma: any = {
    customerAddress: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerAddressesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CustomerAddressesService>(CustomerAddressesService);
    jest.clearAllMocks();
  });

  describe('listAddresses', () => {
    it("should return customer's addresses ordered by default first", async () => {
      const addresses = [
        { id: 'addr-1', userId: 'user-1', isDefault: true, city: 'Mathura' },
        { id: 'addr-2', userId: 'user-1', isDefault: false, city: 'Vrindavan' },
      ];
      mockPrisma.customerAddress.findMany.mockResolvedValue(addresses);

      const result = await service.listAddresses('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].isDefault).toBe(true);
      expect(mockPrisma.customerAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('createAddress', () => {
    it('should automatically set isDefault to true for the first saved address', async () => {
      mockPrisma.customerAddress.count.mockResolvedValue(0);
      mockPrisma.customerAddress.create.mockResolvedValue({
        id: 'addr-1',
        userId: 'user-1',
        fullName: 'Arjun',
        isDefault: true,
      });

      const result = await service.createAddress('user-1', {
        fullName: 'Arjun',
        phone: '+919876543210',
        addressLine1: 'Street 1',
        city: 'Mathura',
        state: 'UP',
        postalCode: '281001',
      });

      expect(result.isDefault).toBe(true);
      expect(mockPrisma.customerAddress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isDefault: true,
          }),
        }),
      );
    });

    it('should unset other defaults when a new address is explicitly set as default', async () => {
      mockPrisma.customerAddress.count.mockResolvedValue(2);
      mockPrisma.customerAddress.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.customerAddress.create.mockResolvedValue({
        id: 'addr-3',
        userId: 'user-1',
        isDefault: true,
      });

      await service.createAddress('user-1', {
        fullName: 'Arjun',
        phone: '+919876543210',
        addressLine1: 'Street 3',
        city: 'Vrindavan',
        state: 'UP',
        postalCode: '281121',
        isDefault: true,
      });

      expect(mockPrisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('updateAddress', () => {
    it('should update address fields successfully', async () => {
      mockPrisma.customerAddress.findFirst.mockResolvedValue({
        id: 'addr-1',
        userId: 'user-1',
      });
      mockPrisma.customerAddress.update.mockResolvedValue({
        id: 'addr-1',
        city: 'Varanasi',
      });

      const result = await service.updateAddress('user-1', 'addr-1', {
        city: 'Varanasi',
      });

      expect(result.city).toBe('Varanasi');
      expect(mockPrisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: expect.objectContaining({ city: 'Varanasi' }),
      });
    });

    it('should throw NotFoundException if address does not belong to customer', async () => {
      mockPrisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAddress('user-1', 'addr-of-user-2', { city: 'Agra' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should unset other defaults when updating address to isDefault: true', async () => {
      mockPrisma.customerAddress.findFirst.mockResolvedValue({
        id: 'addr-1',
        userId: 'user-1',
        isDefault: false,
      });
      mockPrisma.customerAddress.update.mockResolvedValue({
        id: 'addr-1',
        isDefault: true,
      });

      await service.updateAddress('user-1', 'addr-1', {
        isDefault: true,
      });

      expect(mockPrisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDefault: true, id: { not: 'addr-1' } },
        data: { isDefault: false },
      });
    });
  });

  describe('deleteAddress', () => {
    it('should delete address and promote remaining address if deleted address was default', async () => {
      mockPrisma.customerAddress.findFirst
        .mockResolvedValueOnce({
          id: 'addr-1',
          userId: 'user-1',
          isDefault: true,
        }) // existing check
        .mockResolvedValueOnce({
          id: 'addr-2',
          userId: 'user-1',
          isDefault: false,
        }); // next remaining address

      mockPrisma.customerAddress.delete.mockResolvedValue({});
      mockPrisma.customerAddress.update.mockResolvedValue({});

      const result = await service.deleteAddress('user-1', 'addr-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.customerAddress.delete).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
      });
      expect(mockPrisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 'addr-2' },
        data: { isDefault: true },
      });
    });

    it('should throw NotFoundException if address to delete does not exist', async () => {
      mockPrisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(service.deleteAddress('user-1', 'ghost-addr')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setDefaultAddress', () => {
    it('should atomically switch default address', async () => {
      mockPrisma.customerAddress.findFirst.mockResolvedValue({
        id: 'addr-2',
        userId: 'user-1',
        isDefault: false,
      });
      mockPrisma.customerAddress.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.customerAddress.update.mockResolvedValue({
        id: 'addr-2',
        isDefault: true,
      });

      const result = await service.setDefaultAddress('user-1', 'addr-2');

      expect(result.isDefault).toBe(true);
      expect(mockPrisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDefault: true },
        data: { isDefault: false },
      });
      expect(mockPrisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 'addr-2' },
        data: { isDefault: true },
      });
    });
  });
});
