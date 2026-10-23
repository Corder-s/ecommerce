export interface MonetaryAmount {
  currency: string;
  amount: number;
  minorUnits: number; // Integer minor units (e.g., paise for INR: 100 paise = 1 INR)
  formatted: string;
}

export interface CartStoreSummary {
  id: string;
  businessName: string;
  storeSlug: string;
  isPublished: boolean;
}

export interface CartItemResponse {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: MonetaryAmount;
  subtotal: MonetaryAmount;
  priceChanged: boolean;
  previousPrice: MonetaryAmount | null;
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    status: string;
    images: string[];
    isAvailable: boolean;
    store: CartStoreSummary;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CartSummary {
  id: string;
  currency: string;
  itemCount: number; // Total units of items
  distinctItemCount: number; // Distinct products
  subtotal: MonetaryAmount;
  estimatedTax: {
    isCalculated: boolean;
    amount: number | null;
    minorUnits: number | null;
    message: string;
  };
  estimatedShipping: {
    isCalculated: boolean;
    amount: number | null;
    minorUnits: number | null;
    message: string;
  };
  estimatedTotal: MonetaryAmount;
  sellers: CartStoreSummary[];
  items: CartItemResponse[];
  updatedAt: Date;
}
