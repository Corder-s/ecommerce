import { MonetaryAmount, CartStoreSummary } from '../../cart/interfaces/cart.interface';

export interface CheckoutItemValidated {
  productId: string;
  name: string;
  slug: string;
  sku: string | null;
  quantity: number;
  unitPrice: MonetaryAmount;
  subtotal: MonetaryAmount;
  priceChanged: boolean;
  previousPrice: MonetaryAmount | null;
}

export interface CheckoutAddressSnapshot {
  id?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string | null;
  addressType?: string;
}

export interface CheckoutPricingBreakdown {
  currency: string;
  subtotal: MonetaryAmount;
  tax: {
    isCalculated: boolean;
    amount: number | null;
    minorUnits: number | null;
    message: string;
  };
  shipping: {
    isCalculated: boolean;
    amount: number | null;
    minorUnits: number | null;
    message: string;
  };
  discount: {
    isCalculated: boolean;
    amount: number;
    minorUnits: number;
    message: string;
  };
  total: MonetaryAmount;
}

export interface CheckoutValidationResponse {
  checkoutValidationId: string;
  userId: string;
  tenantId: string;
  store: CartStoreSummary;
  items: CheckoutItemValidated[];
  itemCount: number;
  pricing: CheckoutPricingBreakdown;
  shippingAddress: CheckoutAddressSnapshot;
  warnings: string[];
  isValid: boolean;
  isReadyForOrder: boolean;
  note: string;
  validatedAt: Date;
}
