import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ProductStatus, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AddWishlistItemDto } from '../dto/add-wishlist-item.dto';
import { WishlistQueryDto } from '../dto/wishlist-query.dto';

@Injectable()
export class CustomerWishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async listWishlist(userId: string, query: WishlistQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.wishlistItem.count({
        where: { userId },
      }),
      this.prisma.wishlistItem.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              tenant: {
                select: {
                  id: true,
                  businessName: true,
                  storeSlug: true,
                  isPublished: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedItems = items.map((item) => {
      const isStoreActiveAndPublished =
        item.product.tenant.isPublished && item.product.tenant.status === TenantStatus.ACTIVE;
      const isProductPublished = item.product.status === ProductStatus.PUBLISHED;

      // Invariant: Do not expose unpublished or unavailable products as purchasable items
      const isPurchasable = isStoreActiveAndPublished && isProductPublished;

      return {
        id: item.id,
        productId: item.productId,
        createdAt: item.createdAt,
        isPurchasable,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          description: item.product.description,
          price: item.product.price,
          currency: item.product.currency,
          sku: item.product.sku,
          status: item.product.status,
          images: item.product.images,
          category: item.product.category,
          store: {
            id: item.product.tenant.id,
            businessName: item.product.tenant.businessName,
            storeSlug: item.product.tenant.storeSlug,
            isPublished: item.product.tenant.isPublished,
          },
        },
      };
    });

    return {
      items: formattedItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async addToWishlist(userId: string, dto: AddWishlistItemDto) {
    // 1. Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        tenant: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 2. Reject archived products or suspended tenants
    if (product.status === ProductStatus.ARCHIVED) {
      throw new BadRequestException('Cannot add an archived product to wishlist');
    }

    if (product.tenant.status === TenantStatus.SUSPENDED) {
      throw new BadRequestException('Cannot add products from a suspended store');
    }

    // 3. Enforce duplicate prevention
    const existing = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: dto.productId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Product is already in your wishlist');
    }

    // 4. Create wishlist entry
    const item = await this.prisma.wishlistItem.create({
      data: {
        userId,
        productId: dto.productId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            currency: true,
            status: true,
            images: true,
          },
        },
      },
    });

    return {
      id: item.id,
      productId: item.productId,
      createdAt: item.createdAt,
      product: item.product,
    };
  }

  async removeFromWishlist(userId: string, itemId: string) {
    // Check if itemId matches wishlist item id or productId
    let item = await this.prisma.wishlistItem.findFirst({
      where: { id: itemId, userId },
    });

    if (!item) {
      item = await this.prisma.wishlistItem.findFirst({
        where: { productId: itemId, userId },
      });
    }

    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.prisma.wishlistItem.delete({
      where: { id: item.id },
    });

    return {
      success: true,
      message: 'Item removed from wishlist successfully',
    };
  }
}
