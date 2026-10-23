import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductStatus, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {
  CartSummary,
  CartItemResponse,
  CartStoreSummary,
  MonetaryAmount,
} from './interfaces/cart.interface';

const MAX_QUANTITY_PER_ITEM = 50;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private toMonetaryAmount(amount: number, currency: string = 'INR'): MonetaryAmount {
    const minorUnits = Math.round(amount * 100);
    const normalizedAmount = minorUnits / 100;
    return {
      currency,
      amount: normalizedAmount,
      minorUnits,
      formatted: `${currency} ${normalizedAmount.toFixed(2)}`,
    };
  }

  async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
          currency: 'INR',
        },
      });
    }

    return cart;
  }

  async getCart(userId: string): Promise<CartSummary> {
    const cart = await this.getOrCreateCart(userId);

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          include: {
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
    });

    let totalMinorUnits = 0;
    let totalItemsCount = 0;
    const sellersMap = new Map<string, CartStoreSummary>();

    const formattedItems: CartItemResponse[] = items.map((item) => {
      const isStoreActive =
        item.product.tenant.isPublished && item.product.tenant.status === TenantStatus.ACTIVE;
      const isProductAvailable = item.product.status === ProductStatus.PUBLISHED && isStoreActive;

      // Always calculate using current trusted database price
      const currentPriceNum = Number(item.product.price);
      const unitPrice = this.toMonetaryAmount(
        currentPriceNum,
        item.product.currency || cart.currency,
      );
      const subtotalMinor = unitPrice.minorUnits * item.quantity;
      const subtotal = {
        currency: unitPrice.currency,
        amount: subtotalMinor / 100,
        minorUnits: subtotalMinor,
        formatted: `${unitPrice.currency} ${(subtotalMinor / 100).toFixed(2)}`,
      };

      totalMinorUnits += subtotalMinor;
      totalItemsCount += item.quantity;

      // Detect price changes since adding to cart
      const previousPriceNum = item.priceSnapshot ? Number(item.priceSnapshot) : null;
      const priceChanged =
        previousPriceNum !== null && Math.abs(previousPriceNum - currentPriceNum) > 0.001;
      const previousPrice = previousPriceNum
        ? this.toMonetaryAmount(previousPriceNum, unitPrice.currency)
        : null;

      const storeSummary: CartStoreSummary = {
        id: item.product.tenant.id,
        businessName: item.product.tenant.businessName,
        storeSlug: item.product.tenant.storeSlug,
        isPublished: item.product.tenant.isPublished,
      };

      if (!sellersMap.has(storeSummary.id)) {
        sellersMap.set(storeSummary.id, storeSummary);
      }

      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        priceChanged,
        previousPrice,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          sku: item.product.sku,
          status: item.product.status,
          images: item.product.images,
          isAvailable: isProductAvailable,
          store: storeSummary,
        },
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    const subtotal = {
      currency: cart.currency,
      amount: totalMinorUnits / 100,
      minorUnits: totalMinorUnits,
      formatted: `${cart.currency} ${(totalMinorUnits / 100).toFixed(2)}`,
    };

    return {
      id: cart.id,
      currency: cart.currency,
      itemCount: totalItemsCount,
      distinctItemCount: formattedItems.length,
      subtotal,
      estimatedTax: {
        isCalculated: false,
        amount: null,
        minorUnits: null,
        message: 'Tax will be calculated based on seller GST configuration at checkout',
      },
      estimatedShipping: {
        isCalculated: false,
        amount: null,
        minorUnits: null,
        message: 'Shipping fee determined by seller fulfillment rules at checkout',
      },
      estimatedTotal: subtotal,
      sellers: Array.from(sellersMap.values()),
      items: formattedItems,
      updatedAt: cart.updatedAt,
    };
  }

  async addItem(userId: string, dto: AddToCartDto): Promise<CartSummary> {
    const quantityToAdd = dto.quantity ?? 1;

    // 1. Verify product exists and is published
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        tenant: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== ProductStatus.PUBLISHED) {
      throw new BadRequestException('Product is not available for purchase');
    }

    if (!product.tenant.isPublished || product.tenant.status !== TenantStatus.ACTIVE) {
      throw new BadRequestException('Store is currently unavailable for purchase');
    }

    const cart = await this.getOrCreateCart(userId);

    // 2. Prevent duplicate entries: update quantity if item already exists
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantityToAdd;
      if (newQuantity > MAX_QUANTITY_PER_ITEM) {
        throw new BadRequestException(
          `Cannot exceed purchase limit of ${MAX_QUANTITY_PER_ITEM} units per product`,
        );
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          priceSnapshot: product.price,
        },
      });
    } else {
      if (quantityToAdd > MAX_QUANTITY_PER_ITEM) {
        throw new BadRequestException(
          `Cannot exceed purchase limit of ${MAX_QUANTITY_PER_ITEM} units per product`,
        );
      }

      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: quantityToAdd,
          priceSnapshot: product.price,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto): Promise<CartSummary> {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: { include: { tenant: true } },
      },
    });

    // IDOR protection: Cart item must belong to the authenticated user's cart
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    if (dto.quantity > MAX_QUANTITY_PER_ITEM) {
      throw new BadRequestException(
        `Cannot exceed purchase limit of ${MAX_QUANTITY_PER_ITEM} units per product`,
      );
    }

    if (item.product.status !== ProductStatus.PUBLISHED) {
      throw new BadRequestException('Product is not available for purchase');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity,
        priceSnapshot: item.product.price,
      },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartSummary> {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    // IDOR protection
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<CartSummary> {
    const cart = await this.getOrCreateCart(userId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(userId);
  }
}
