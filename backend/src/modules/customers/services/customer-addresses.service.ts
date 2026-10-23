import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';

@Injectable()
export class CustomerAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAddresses(userId: string) {
    return this.prisma.customerAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    // Check if customer already has any saved addresses
    const existingCount = await this.prisma.customerAddress.count({
      where: { userId },
    });

    // If first address or isDefault is explicitly set, mark as default
    const isDefault = existingCount === 0 || !!dto.isDefault;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (isDefault) {
        // Demote existing default address
        await tx.customerAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.create({
        data: {
          userId,
          fullName: dto.fullName,
          phone: dto.phone,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country || 'IN',
          landmark: dto.landmark,
          isDefault,
          addressType: dto.addressType || 'HOME',
        },
      });
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { userId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.update({
        where: { id: addressId },
        data: {
          ...(dto.fullName !== undefined && { fullName: dto.fullName }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
          ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(dto.state !== undefined && { state: dto.state }),
          ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
          ...(dto.country !== undefined && { country: dto.country }),
          ...(dto.landmark !== undefined && { landmark: dto.landmark }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
          ...(dto.addressType !== undefined && { addressType: dto.addressType }),
        },
      });
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.customerAddress.delete({
        where: { id: addressId },
      });

      // If the deleted address was default, promote the newest remaining address to default
      if (existing.isDefault) {
        const nextAddress = await tx.customerAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (nextAddress) {
          await tx.customerAddress.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return {
      success: true,
      message: 'Address removed successfully',
    };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.customerAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }
}
