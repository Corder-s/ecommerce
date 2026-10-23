import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ProductStatus, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ValidateCheckoutDto } from './dto/validate-checkout.dto';
import {
  CheckoutValidationResponse,
  CheckoutItemValidated,
  CheckoutAddressSnapshot,
} from './interfaces/checkout.interface';
import { MonetaryAmount } from '../cart/interfaces/cart.interface';

@Injectable()
export class CheckoutService {
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

  async validateCheckout(
    userId: string,
    dto: ValidateCheckoutDto,
  ): Promise<CheckoutValidationResponse> {
    // 1. Load the customer's cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                tenant: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your shopping cart is empty');
    }

    // 2. Identify sellers in cart and enforce single-seller checkout policy
    const storeIds = Array.from(new Set(cart.items.map((i) => i.product.tenantId)));

    let targetTenantId: string;
    if (storeIds.length > 1) {
      if (!dto.tenantId) {
        throw new BadRequestException(
          'Your cart contains items from multiple stores. Please specify a tenantId to checkout one seller at a time.',
        );
      }
      if (!storeIds.includes(dto.tenantId)) {
        throw new BadRequestException('No items in cart belong to the specified store');
      }
      targetTenantId = dto.tenantId;
    } else {
      targetTenantId = storeIds[0];
      if (dto.tenantId && dto.tenantId !== targetTenantId) {
        throw new BadRequestException('Specified store does not match the items in your cart');
      }
    }

    // Filter items for the target seller
    const targetItems = cart.items.filter((i) => i.product.tenantId === targetTenantId);
    if (targetItems.length === 0) {
      throw new BadRequestException('No items in cart belong to the specified store');
    }

    const targetStore = targetItems[0].product.tenant;

    // Validate store active & published status
    if (!targetStore.isPublished || targetStore.status !== TenantStatus.ACTIVE) {
      throw new BadRequestException(
        `Store "${targetStore.businessName}" is currently unavailable for checkout`,
      );
    }

    // 3. Validate every cart item and recheck current trusted database prices
    const warnings: string[] = [];
    let totalMinorUnits = 0;
    let totalItemCount = 0;

    const validatedItems: CheckoutItemValidated[] = [];

    for (const item of targetItems) {
      // Re-verify product status from trusted record
      if (item.product.status !== ProductStatus.PUBLISHED) {
        throw new BadRequestException(
          `Product "${item.product.name}" is no longer available for purchase`,
        );
      }

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
      totalItemCount += item.quantity;

      // Price change detection: compare snapshot to current trusted price
      const previousPriceNum = item.priceSnapshot ? Number(item.priceSnapshot) : null;
      const priceChanged =
        previousPriceNum !== null && Math.abs(previousPriceNum - currentPriceNum) > 0.001;
      const previousPrice = previousPriceNum
        ? this.toMonetaryAmount(previousPriceNum, unitPrice.currency)
        : null;

      if (priceChanged && previousPrice) {
        warnings.push(
          `Price for "${item.product.name}" updated from ${previousPrice.formatted} to ${unitPrice.formatted}.`,
        );
      }

      validatedItems.push({
        productId: item.productId,
        name: item.product.name,
        slug: item.product.slug,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        priceChanged,
        previousPrice,
      });
    }

    // 4. Validate delivery address
    let addressSnapshot: CheckoutAddressSnapshot;

    if (dto.addressId) {
      // Enforce ownership: address must belong to authenticated customer
      const address = await this.prisma.customerAddress.findFirst({
        where: { id: dto.addressId, userId },
      });

      if (!address) {
        throw new NotFoundException(
          'Delivery address not found or does not belong to your account',
        );
      }

      addressSnapshot = {
        id: address.id,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        landmark: address.landmark,
        addressType: address.addressType,
      };
    } else if (dto.shippingAddress) {
      const inline = dto.shippingAddress;
      if (
        !inline.fullName ||
        !inline.phone ||
        !inline.addressLine1 ||
        !inline.city ||
        !inline.state ||
        !inline.postalCode
      ) {
        throw new BadRequestException(
          'Incomplete shipping address: fullName, phone, addressLine1, city, state, and postalCode are required',
        );
      }

      addressSnapshot = {
        fullName: inline.fullName,
        phone: inline.phone,
        addressLine1: inline.addressLine1,
        addressLine2: inline.addressLine2,
        city: inline.city,
        state: inline.state,
        postalCode: inline.postalCode,
        country: inline.country || 'IN',
        landmark: inline.landmark,
        addressType: inline.addressType || 'HOME',
      };
    } else {
      throw new BadRequestException(
        'A valid delivery address (addressId or shippingAddress) is required for checkout validation',
      );
    }

    // 5. Calculate checkout financial summary
    const currency = targetStore.currency || cart.currency || 'INR';
    const subtotal = {
      currency,
      amount: totalMinorUnits / 100,
      minorUnits: totalMinorUnits,
      formatted: `${currency} ${(totalMinorUnits / 100).toFixed(2)}`,
    };

    return {
      checkoutValidationId: randomUUID(),
      userId,
      tenantId: targetTenantId,
      store: {
        id: targetStore.id,
        businessName: targetStore.businessName,
        storeSlug: targetStore.storeSlug,
        isPublished: targetStore.isPublished,
      },
      items: validatedItems,
      itemCount: totalItemCount,
      pricing: {
        currency,
        subtotal,
        tax: {
          isCalculated: false,
          amount: null,
          minorUnits: null,
          message: 'Tax calculation pending seller GST configuration',
        },
        shipping: {
          isCalculated: false,
          amount: null,
          minorUnits: null,
          message: 'Shipping fee determined by seller fulfillment rules during order creation',
        },
        discount: {
          isCalculated: false,
          amount: 0,
          minorUnits: 0,
          message: 'No active discount applied',
        },
        total: subtotal,
      },
      shippingAddress: addressSnapshot,
      warnings,
      isValid: true,
      isReadyForOrder: true,
      note: 'Checkout summary validated against trusted database records. Ready for order placement in Step 7.',
      validatedAt: new Date(),
    };
  }
}
