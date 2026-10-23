import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UpdateCustomerProfileDto } from '../dto/update-customer-profile.dto';

@Injectable()
export class CustomerProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Customer account not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      platformRole: user.platformRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: user.customerProfile
        ? {
            id: user.customerProfile.id,
            avatarUrl: user.customerProfile.avatarUrl,
            bio: user.customerProfile.bio,
            dateOfBirth: user.customerProfile.dateOfBirth,
            preferences: user.customerProfile.preferences,
            isActive: user.customerProfile.isActive,
            deactivatedAt: user.customerProfile.deactivatedAt,
            createdAt: user.customerProfile.createdAt,
            updatedAt: user.customerProfile.updatedAt,
          }
        : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: true },
    });

    if (!existingUser) {
      throw new NotFoundException('Customer account not found');
    }

    // 1. Prepare User model updates (permitted contact & identity fields)
    const userUpdates: { name?: string; phone?: string } = {};
    if (dto.name !== undefined) userUpdates.name = dto.name;
    if (dto.phone !== undefined) userUpdates.phone = dto.phone;

    // 2. Prepare CustomerProfile model updates & deactivation lifecycle rules
    let deactivatedAt: Date | null | undefined = undefined;
    if (dto.isActive !== undefined) {
      deactivatedAt = dto.isActive ? null : new Date();
    }

    const profileData = {
      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.dateOfBirth !== undefined && {
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      }),
      ...(dto.preferences !== undefined && { preferences: dto.preferences }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive, deactivatedAt }),
    };

    // Execute in transaction to maintain atomic consistency across User and CustomerProfile
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userUpdates,
        });
      }

      await tx.customerProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...profileData,
          isActive: dto.isActive ?? true,
          deactivatedAt: dto.isActive === false ? new Date() : null,
        },
        update: profileData,
      });
    });

    return this.getProfile(userId);
  }
}
