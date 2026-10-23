export interface Product {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  category: "diyas" | "dhoop" | "puja-kits" | "statues" | "kande";
  images: string[];
  inStock: boolean;
  stockCount: number;
  rating: number;
  reviewCount: number;
  badge?: string;
  artisan: {
    name: string;
    gaushala: string;
    location: string;
  };
  sacredIngredients: string[];
  weight: string;
}

export interface Category {
  id: string;
  name: string;
  slug: Product["category"] | "all";
  iconName: string;
  count: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = "COMPLETED" | "PROCESSING" | "SHIPPED" | "PENDING" | "CANCELLED";

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: OrderStatus;
  itemCount: number;
  createdAt: string;
  paymentMethod: "UPI" | "CARD" | "COD";
  city: string;
}

export interface KPIStat {
  id: string;
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  subtitle: string;
  icon: string;
}
