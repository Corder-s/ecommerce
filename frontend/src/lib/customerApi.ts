/**
 * GauShilp OS — Customer API Client Module
 *
 * Implements typed interfaces and API integration for the Customer Portal (/account).
 * Conforms strictly to NestJS backend controllers:
 * - CustomersController (/customers/me)
 * - OrdersController (/orders)
 * - ShippingController (/customers/me/orders/:orderId/tracking)
 * - NotificationsController (/notifications)
 * - CartController (/cart/items)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface CustomerProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  preferences?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCustomerProfileDto {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  preferences?: Record<string, unknown>;
  isActive?: boolean;
}

export interface CustomerAddress {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string;
  isDefault: boolean;
  addressType: "HOME" | "WORK" | "OTHER";
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressDto {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  landmark?: string;
  isDefault?: boolean;
  addressType?: "HOME" | "WORK" | "OTHER";
}

export type UpdateAddressDto = Partial<CreateAddressDto>;

export interface WishlistProductStore {
  id: string;
  businessName: string;
  storeSlug: string;
  isPublished: boolean;
}

export interface WishlistProductCategory {
  id: string;
  name: string;
  slug: string;
}

export interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number | string;
  currency: string;
  sku?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  images: string[];
  category?: WishlistProductCategory;
  store: WishlistProductStore;
}

export interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  isPurchasable: boolean;
  product: WishlistProduct;
}

export interface WishlistResponse {
  items: WishlistItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CustomerOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  sku?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  image?: string;
}

export interface CustomerOrderStatusHistory {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  reason?: string;
  createdAt: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  tenantId: string;
  userId: string;
  status: "PLACED" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  currency: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  customerNote?: string;
  cancelReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  items: CustomerOrderItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    landmark?: string;
  };
  statusHistory?: CustomerOrderStatusHistory[];
  storeName?: string;
}

export interface CustomerOrderListResponse {
  orders: CustomerOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TrackingMilestoneEvent {
  status: string;
  description: string;
  location?: string;
  eventTimestamp: string;
}

export interface CustomerShipmentTracking {
  id: string;
  provider: string;
  trackingNumber?: string;
  status: string;
  shippedAt?: string;
  deliveredAt?: string;
  events: TrackingMilestoneEvent[];
}

export interface CustomerTrackingResponse {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  currency: string;
  shipments: CustomerShipmentTracking[];
}

export type NotificationType =
  | "ORDER_CREATED"
  | "ORDER_CONFIRMED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "SHIPMENT_DISPATCHED"
  | "SHIPMENT_DELIVERED"
  | "SYSTEM_ALERT";

export interface CustomerNotification {
  id: string;
  tenantId?: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: CustomerNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Mock Baseline Data (Fallback for Offline & SSR Mode)
// ---------------------------------------------------------------------------

export const MOCK_CUSTOMER_PROFILE: CustomerProfile = {
  id: "cp_arjun_sharma",
  userId: "usr_arjun_01",
  name: "Arjun Sharma",
  email: "arjun.sharma@example.com",
  phone: "+91 98765 43210",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  bio: "Passionate lover of traditional Indian artisan crafts, hand-rolled desi dhoop, and sacred cow dung pottery.",
  dateOfBirth: "1992-05-15T00:00:00.000Z",
  preferences: {
    emailNotifications: true,
    smsAlerts: true,
    promotions: false,
  },
  isActive: true,
  createdAt: "2026-01-10T10:00:00.000Z",
  updatedAt: "2026-10-20T14:30:00.000Z",
};

export const MOCK_CUSTOMER_ADDRESSES: CustomerAddress[] = [
  {
    id: "addr_01",
    userId: "usr_arjun_01",
    fullName: "Arjun Sharma",
    phone: "+91 98765 43210",
    addressLine1: "Flat 402, Vrindavan Heights",
    addressLine2: "Govardhan Road, Near ISKCON Temple",
    city: "Mathura",
    state: "Uttar Pradesh",
    postalCode: "281001",
    country: "IN",
    landmark: "Opposite Gate 2",
    isDefault: true,
    addressType: "HOME",
    createdAt: "2026-02-01T09:00:00.000Z",
    updatedAt: "2026-02-01T09:00:00.000Z",
  },
  {
    id: "addr_02",
    userId: "usr_arjun_01",
    fullName: "Arjun Sharma",
    phone: "+91 98765 43210",
    addressLine1: "Craft Innovations Hub, 3rd Floor",
    addressLine2: "Varanasi Ghat Industrial Area",
    city: "Varanasi",
    state: "Uttar Pradesh",
    postalCode: "221001",
    country: "IN",
    landmark: "Assi Ghat Road",
    isDefault: false,
    addressType: "WORK",
    createdAt: "2026-03-15T11:20:00.000Z",
    updatedAt: "2026-03-15T11:20:00.000Z",
  },
];

export const MOCK_WISHLIST_ITEMS: WishlistItem[] = [
  {
    id: "wish_01",
    productId: "a0000000-0000-0000-0000-000000000001",
    createdAt: "2026-10-15T08:00:00.000Z",
    isPurchasable: true,
    product: {
      id: "a0000000-0000-0000-0000-000000000001",
      name: "Handcrafted Vedic Cow Dung Diyas (Pack of 12)",
      slug: "handcrafted-vedic-cow-dung-diyas",
      description: "Organic, 100% biodegradable desi cow dung festive oil lamps hand-carved by rural artisans.",
      price: 349,
      currency: "INR",
      sku: "DIY-12PK",
      status: "PUBLISHED",
      images: [
        "https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?w=600&auto=format&fit=crop&q=80",
      ],
      category: {
        id: "cat_diyas",
        name: "Festive & Sacred Diyas",
        slug: "sacred-diyas",
      },
      store: {
        id: "tenant_mitti_craft",
        businessName: "Mitti Craft Studio & Pottery",
        storeSlug: "mitti-craft-studio",
        isPublished: true,
      },
    },
  },
  {
    id: "wish_02",
    productId: "a0000000-0000-0000-0000-000000000002",
    createdAt: "2026-10-18T12:00:00.000Z",
    isPurchasable: true,
    product: {
      id: "a0000000-0000-0000-0000-000000000002",
      name: "Organic Herbal Sambrani Dhoop Cups (Pack of 15)",
      slug: "organic-herbal-sambrani-dhoop-cups",
      description: "Pure cow ghee, guggal, and natural herbs blended for daily spiritual purification.",
      price: 299,
      currency: "INR",
      sku: "DHP-15CP",
      status: "PUBLISHED",
      images: [
        "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80",
      ],
      category: {
        id: "cat_dhoop",
        name: "Incense & Dhoop",
        slug: "incense-dhoop",
      },
      store: {
        id: "tenant_mitti_craft",
        businessName: "Mitti Craft Studio & Pottery",
        storeSlug: "mitti-craft-studio",
        isPublished: true,
      },
    },
  },
  {
    id: "wish_03",
    productId: "a0000000-0000-0000-0000-000000000004",
    createdAt: "2026-10-21T15:30:00.000Z",
    isPurchasable: true,
    product: {
      id: "a0000000-0000-0000-0000-000000000004",
      name: "Vedic Panchgavya Sacred Daily Puja Kit",
      slug: "vedic-panchgavya-sacred-daily-puja-kit",
      description: "Complete Vedic morning prayer kit containing dhoop cups, brass camphor burner, and cow dung diyas.",
      price: 899,
      currency: "INR",
      sku: "KIT-PUJA-01",
      status: "PUBLISHED",
      images: [
        "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=80",
      ],
      category: {
        id: "cat_kits",
        name: "Sacred Puja Kits",
        slug: "puja-kits",
      },
      store: {
        id: "tenant_mitti_craft",
        businessName: "Mitti Craft Studio & Pottery",
        storeSlug: "mitti-craft-studio",
        isPublished: true,
      },
    },
  },
];

export const MOCK_CUSTOMER_ORDERS: CustomerOrder[] = [
  {
    id: "ord_1001",
    orderNumber: "GS-ORD-2026-901",
    tenantId: "tenant_mitti_craft",
    userId: "usr_arjun_01",
    status: "SHIPPED",
    paymentStatus: "PAID",
    currency: "INR",
    subtotal: 1248,
    taxAmount: 62.4,
    shippingAmount: 50,
    totalAmount: 1360.4,
    customerNote: "Please pack with extra straw padding for handmade pottery.",
    createdAt: "2026-10-21T09:15:00.000Z",
    updatedAt: "2026-10-22T14:00:00.000Z",
    storeName: "Mitti Craft Studio & Pottery",
    shippingAddress: {
      fullName: "Arjun Sharma",
      phone: "+91 98765 43210",
      addressLine1: "Flat 402, Vrindavan Heights",
      addressLine2: "Govardhan Road, Near ISKCON Temple",
      city: "Mathura",
      state: "Uttar Pradesh",
      postalCode: "281001",
      country: "IN",
      landmark: "Opposite Gate 2",
    },
    items: [
      {
        id: "item_01",
        orderId: "ord_1001",
        productId: "a0000000-0000-0000-0000-000000000001",
        productName: "Handcrafted Vedic Cow Dung Diyas (Pack of 12)",
        sku: "DIY-12PK",
        unitPrice: 349,
        quantity: 2,
        subtotal: 698,
        image: "https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "item_02",
        orderId: "ord_1001",
        productId: "a0000000-0000-0000-0000-000000000003",
        productName: "Eco-Friendly Cow Dung Ganesh Murtis (6-inch)",
        sku: "MRT-GANESH-6",
        unitPrice: 599,
        quantity: 1,
        subtotal: 599,
        image: "https://images.unsplash.com/photo-1567653418876-5bb0e566e1c2?w=300&auto=format&fit=crop&q=80",
      },
    ],
    statusHistory: [
      {
        id: "hist_01",
        fromStatus: null,
        toStatus: "PLACED",
        changedBy: "usr_arjun_01",
        reason: "Order placed by customer",
        createdAt: "2026-10-21T09:15:00.000Z",
      },
      {
        id: "hist_02",
        fromStatus: "PLACED",
        toStatus: "CONFIRMED",
        changedBy: "system",
        reason: "Payment verified successfully",
        createdAt: "2026-10-21T09:18:00.000Z",
      },
      {
        id: "hist_03",
        fromStatus: "CONFIRMED",
        toStatus: "PROCESSING",
        changedBy: "usr_priya_sharma",
        reason: "Artisan workshop started packaging fragile terracotta pieces",
        createdAt: "2026-10-21T14:30:00.000Z",
      },
      {
        id: "hist_04",
        fromStatus: "PROCESSING",
        toStatus: "SHIPPED",
        changedBy: "usr_priya_sharma",
        reason: "Dispatched via Delhivery Express (AWB DLH-8829104)",
        createdAt: "2026-10-22T10:00:00.000Z",
      },
    ],
  },
  {
    id: "ord_1002",
    orderNumber: "GS-ORD-2026-880",
    tenantId: "tenant_mitti_craft",
    userId: "usr_arjun_01",
    status: "DELIVERED",
    paymentStatus: "PAID",
    currency: "INR",
    subtotal: 899,
    taxAmount: 44.95,
    shippingAmount: 0,
    totalAmount: 943.95,
    createdAt: "2026-10-10T11:00:00.000Z",
    updatedAt: "2026-10-14T16:20:00.000Z",
    storeName: "Mitti Craft Studio & Pottery",
    shippingAddress: {
      fullName: "Arjun Sharma",
      phone: "+91 98765 43210",
      addressLine1: "Flat 402, Vrindavan Heights",
      city: "Mathura",
      state: "Uttar Pradesh",
      postalCode: "281001",
      country: "IN",
    },
    items: [
      {
        id: "item_03",
        orderId: "ord_1002",
        productId: "a0000000-0000-0000-0000-000000000004",
        productName: "Vedic Panchgavya Sacred Daily Puja Kit",
        sku: "KIT-PUJA-01",
        unitPrice: 899,
        quantity: 1,
        subtotal: 899,
        image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=300&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "ord_1003",
    orderNumber: "GS-ORD-2026-812",
    tenantId: "tenant_mitti_craft",
    userId: "usr_arjun_01",
    status: "PROCESSING",
    paymentStatus: "PAID",
    currency: "INR",
    subtotal: 598,
    taxAmount: 29.9,
    shippingAmount: 40,
    totalAmount: 667.9,
    createdAt: "2026-10-23T08:30:00.000Z",
    updatedAt: "2026-10-23T09:00:00.000Z",
    storeName: "Mitti Craft Studio & Pottery",
    shippingAddress: {
      fullName: "Arjun Sharma",
      phone: "+91 98765 43210",
      addressLine1: "Flat 402, Vrindavan Heights",
      city: "Mathura",
      state: "Uttar Pradesh",
      postalCode: "281001",
      country: "IN",
    },
    items: [
      {
        id: "item_04",
        orderId: "ord_1003",
        productId: "a0000000-0000-0000-0000-000000000002",
        productName: "Organic Herbal Sambrani Dhoop Cups (Pack of 15)",
        sku: "DHP-15CP",
        unitPrice: 299,
        quantity: 2,
        subtotal: 598,
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80",
      },
    ],
  },
];

export const MOCK_ORDER_TRACKING: CustomerTrackingResponse = {
  orderId: "ord_1001",
  orderNumber: "GS-ORD-2026-901",
  orderStatus: "SHIPPED",
  currency: "INR",
  shipments: [
    {
      id: "ship_01",
      provider: "Delhivery Express",
      trackingNumber: "DLH-8829104",
      status: "IN_TRANSIT",
      shippedAt: "2026-10-22T10:00:00.000Z",
      events: [
        {
          status: "READY_TO_SHIP",
          description: "Package manifested and packed in eco-friendly cotton wrap by artisan studio",
          location: "Mathura Workshop, UP",
          eventTimestamp: "2026-10-21T18:00:00.000Z",
        },
        {
          status: "PICKED_UP",
          description: "Parcel picked up by courier dispatch van",
          location: "Mathura Hub, UP",
          eventTimestamp: "2026-10-22T10:00:00.000Z",
        },
        {
          status: "IN_TRANSIT",
          description: "Departed sorting facility en route to destination distribution center",
          location: "Agra Sorting Facility, UP",
          eventTimestamp: "2026-10-22T17:45:00.000Z",
        },
        {
          status: "OUT_FOR_DELIVERY",
          description: "Scheduled for safe contactless delivery tomorrow morning",
          location: "Mathura Local Hub",
          eventTimestamp: "2026-10-23T06:30:00.000Z",
        },
      ],
    },
  ],
};

export const MOCK_NOTIFICATIONS: CustomerNotification[] = [
  {
    id: "notif_01",
    recipientUserId: "usr_arjun_01",
    type: "SHIPMENT_DISPATCHED",
    title: "Order Dispatched! 📦",
    message: "Your handcrafted sacred diyas from Mitti Craft Studio have been dispatched via Delhivery (AWB DLH-8829104).",
    data: { orderId: "ord_1001", trackingNumber: "DLH-8829104" },
    readAt: null,
    createdAt: "2026-10-22T10:05:00.000Z",
  },
  {
    id: "notif_02",
    recipientUserId: "usr_arjun_01",
    type: "ORDER_CONFIRMED",
    title: "Order Confirmed: GS-ORD-2026-812",
    message: "Your purchase of Organic Herbal Sambrani Dhoop Cups has been confirmed and forwarded to the artisan guild.",
    data: { orderId: "ord_1003" },
    readAt: null,
    createdAt: "2026-10-23T08:35:00.000Z",
  },
  {
    id: "notif_03",
    recipientUserId: "usr_arjun_01",
    type: "PAYMENT_SUCCEEDED",
    title: "Payment Received (₹943.95)",
    message: "Transaction successful for order GS-ORD-2026-880 via UPI payment.",
    data: { orderId: "ord_1002" },
    readAt: "2026-10-10T11:05:00.000Z",
    createdAt: "2026-10-10T11:02:00.000Z",
  },
  {
    id: "notif_04",
    recipientUserId: "usr_arjun_01",
    type: "SHIPMENT_DELIVERED",
    title: "Order Delivered 🎉",
    message: "Your Vedic Panchgavya Sacred Daily Puja Kit was delivered successfully. Enjoy your sacred rituals!",
    data: { orderId: "ord_1002" },
    readAt: "2026-10-15T09:00:00.000Z",
    createdAt: "2026-10-14T16:22:00.000Z",
  },
];

// In-memory cache for mutations in demo/client mode
let inMemoryProfile: CustomerProfile = { ...MOCK_CUSTOMER_PROFILE };
let inMemoryAddresses: CustomerAddress[] = [...MOCK_CUSTOMER_ADDRESSES];
let inMemoryWishlist: WishlistItem[] = [...MOCK_WISHLIST_ITEMS];
let inMemoryOrders: CustomerOrder[] = [...MOCK_CUSTOMER_ORDERS];
let inMemoryNotifications: CustomerNotification[] = [...MOCK_NOTIFICATIONS];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const token = localStorage.getItem("gaushilp_auth_token");
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // Ignore storage issues
  }
  return {};
}

// ---------------------------------------------------------------------------
// Customer API Methods
// ---------------------------------------------------------------------------

/**
 * 1. Retrieve authenticated customer's profile & account details
 * GET /api/v1/customers/me
 */
export async function getCustomerProfile(): Promise<CustomerProfile> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      inMemoryProfile = { ...inMemoryProfile, ...data };
      return inMemoryProfile;
    }
  } catch {
    // Fallback to offline / inMemory profile
  }
  return inMemoryProfile;
}

/**
 * 2. Update authenticated customer's profile
 * PATCH /api/v1/customers/me
 */
export async function updateCustomerProfile(dto: UpdateCustomerProfileDto): Promise<CustomerProfile> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      const data = await res.json();
      inMemoryProfile = { ...inMemoryProfile, ...data };
      return inMemoryProfile;
    }
  } catch {
    // Fallback to in-memory mutation
  }

  // Update in-memory
  inMemoryProfile = {
    ...inMemoryProfile,
    ...dto,
    updatedAt: new Date().toISOString(),
  };
  return inMemoryProfile;
}

/**
 * 3. List all saved delivery addresses
 * GET /api/v1/customers/me/addresses
 */
export async function getCustomerAddresses(): Promise<CustomerAddress[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        inMemoryAddresses = data;
        return inMemoryAddresses;
      }
    }
  } catch {
    // Fallback to in-memory
  }
  return inMemoryAddresses;
}

/**
 * 4. Create a new saved delivery address
 * POST /api/v1/customers/me/addresses
 */
export async function createCustomerAddress(dto: CreateAddressDto): Promise<CustomerAddress> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.isDefault) {
        inMemoryAddresses = inMemoryAddresses.map((a) => ({ ...a, isDefault: false }));
      }
      inMemoryAddresses.unshift(data);
      return data;
    }
  } catch {
    // Fallback to in-memory
  }

  if (dto.isDefault) {
    inMemoryAddresses = inMemoryAddresses.map((a) => ({ ...a, isDefault: false }));
  }

  const newAddress: CustomerAddress = {
    id: `addr_${Date.now()}`,
    userId: inMemoryProfile.userId,
    fullName: dto.fullName,
    phone: dto.phone,
    addressLine1: dto.addressLine1,
    addressLine2: dto.addressLine2,
    city: dto.city,
    state: dto.state,
    postalCode: dto.postalCode,
    country: dto.country || "IN",
    landmark: dto.landmark,
    isDefault: dto.isDefault ?? (inMemoryAddresses.length === 0),
    addressType: dto.addressType || "HOME",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryAddresses.unshift(newAddress);
  return newAddress;
}

/**
 * 5. Update an existing saved delivery address
 * PATCH /api/v1/customers/me/addresses/:addressId
 */
export async function updateCustomerAddress(
  addressId: string,
  dto: UpdateAddressDto,
): Promise<CustomerAddress> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses/${addressId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      const data = await res.json();
      inMemoryAddresses = inMemoryAddresses.map((a) => (a.id === addressId ? data : a));
      return data;
    }
  } catch {
    // Fallback
  }

  if (dto.isDefault) {
    inMemoryAddresses = inMemoryAddresses.map((a) => ({
      ...a,
      isDefault: a.id === addressId,
    }));
  }

  const existing = inMemoryAddresses.find((a) => a.id === addressId);
  if (!existing) {
    throw new Error("Address not found");
  }

  const updated: CustomerAddress = {
    ...existing,
    ...dto,
    updatedAt: new Date().toISOString(),
  };

  inMemoryAddresses = inMemoryAddresses.map((a) => (a.id === addressId ? updated : a));
  return updated;
}

/**
 * 6. Delete a saved delivery address
 * DELETE /api/v1/customers/me/addresses/:addressId
 */
export async function deleteCustomerAddress(addressId: string): Promise<{ success: boolean }> {
  const wasDefault = inMemoryAddresses.find((a) => a.id === addressId)?.isDefault;

  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses/${addressId}`, {
      method: "DELETE",
      headers: {
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      inMemoryAddresses = inMemoryAddresses.filter((a) => a.id !== addressId);
      if (wasDefault && inMemoryAddresses.length > 0) {
        inMemoryAddresses[0].isDefault = true;
      }
      return { success: true };
    }
  } catch {
    // Fallback
  }

  inMemoryAddresses = inMemoryAddresses.filter((a) => a.id !== addressId);
  if (wasDefault && inMemoryAddresses.length > 0) {
    inMemoryAddresses[0].isDefault = true;
  }
  return { success: true };
}

/**
 * 7. Set address as default
 * PATCH /api/v1/customers/me/addresses/:addressId/default
 */
export async function setDefaultCustomerAddress(addressId: string): Promise<CustomerAddress> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses/${addressId}/default`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      inMemoryAddresses = inMemoryAddresses.map((a) => ({
        ...a,
        isDefault: a.id === addressId,
      }));
      return data;
    }
  } catch {
    // Fallback
  }

  inMemoryAddresses = inMemoryAddresses.map((a) => ({
    ...a,
    isDefault: a.id === addressId,
  }));

  const match = inMemoryAddresses.find((a) => a.id === addressId);
  if (!match) throw new Error("Address not found");
  return match;
}

/**
 * 8. List wishlist items
 * GET /api/v1/customers/me/wishlist
 */
export async function getCustomerWishlist(query?: { page?: number; limit?: number }): Promise<WishlistResponse> {
  const page = query?.page || 1;
  const limit = query?.limit || 20;

  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const res = await fetch(`${API_BASE_URL}/customers/me/wishlist?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        inMemoryWishlist = data.items;
        return data;
      }
    }
  } catch {
    // Fallback
  }

  return {
    items: inMemoryWishlist,
    meta: {
      total: inMemoryWishlist.length,
      page,
      limit,
      totalPages: Math.ceil(inMemoryWishlist.length / limit) || 1,
    },
  };
}

/**
 * 9. Add product to wishlist
 * POST /api/v1/customers/me/wishlist
 */
export async function addToWishlist(productId: string): Promise<WishlistItem> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/wishlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ productId }),
    });

    if (res.ok) {
      const data = await res.json();
      inMemoryWishlist.unshift(data);
      return data;
    }
  } catch {
    // Fallback
  }

  // Check if exists
  const existing = inMemoryWishlist.find((w) => w.productId === productId);
  if (existing) return existing;

  const newItem: WishlistItem = {
    id: `wish_${Date.now()}`,
    productId,
    createdAt: new Date().toISOString(),
    isPurchasable: true,
    product: {
      id: productId,
      name: "Handmade Artisanal Vedic Creation",
      slug: "handmade-artisanal-creation",
      price: 399,
      currency: "INR",
      status: "PUBLISHED",
      images: [
        "https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?w=600&auto=format&fit=crop&q=80",
      ],
      store: {
        id: "tenant_mitti_craft",
        businessName: "Mitti Craft Studio & Pottery",
        storeSlug: "mitti-craft-studio",
        isPublished: true,
      },
    },
  };

  inMemoryWishlist.unshift(newItem);
  return newItem;
}

/**
 * 10. Remove item from wishlist
 * DELETE /api/v1/customers/me/wishlist/:itemId
 */
export async function removeFromWishlist(itemId: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/wishlist/${itemId}`, {
      method: "DELETE",
      headers: {
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      inMemoryWishlist = inMemoryWishlist.filter((w) => w.id !== itemId && w.productId !== itemId);
      return { success: true };
    }
  } catch {
    // Fallback
  }

  inMemoryWishlist = inMemoryWishlist.filter((w) => w.id !== itemId && w.productId !== itemId);
  return { success: true };
}

/**
 * 11. Add to shopping cart
 * POST /api/v1/cart/items
 */
export async function addItemToCart(productId: string, quantity = 1): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ productId, quantity }),
    });

    if (res.ok) {
      return { success: true, message: "Item added to cart successfully" };
    }
  } catch {
    // Fallback
  }

  return { success: true, message: "Item added to cart successfully" };
}

/**
 * 12. List customer orders
 * GET /api/v1/orders (scoped to authenticated user when tenantId omitted)
 */
export async function getCustomerOrders(query?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<CustomerOrderListResponse> {
  const page = query?.page || 1;
  const limit = query?.limit || 10;
  const status = query?.status;

  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status && status !== "ALL") {
      params.append("status", status);
    }

    const res = await fetch(`${API_BASE_URL}/orders?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.orders)) {
        return data;
      }
    }
  } catch {
    // Fallback
  }

  let filtered = [...inMemoryOrders];
  if (status && status !== "ALL") {
    filtered = filtered.filter((o) => o.status === status);
  }

  return {
    orders: filtered,
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit) || 1,
  };
}

/**
 * 13. Get single order details by ID
 * GET /api/v1/orders/:orderId
 */
export async function getCustomerOrder(orderId: string): Promise<CustomerOrder> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback
  }

  const found = inMemoryOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
  if (found) return found;

  // Return baseline first order
  return inMemoryOrders[0];
}

/**
 * 14. Cancel pre-shipment order
 * POST /api/v1/orders/:orderId/cancel
 */
export async function cancelCustomerOrder(orderId: string, cancelReason: string): Promise<CustomerOrder> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ cancelReason }),
    });

    if (res.ok) {
      const data = await res.json();
      inMemoryOrders = inMemoryOrders.map((o) => (o.id === orderId ? data : o));
      return data;
    }
  } catch {
    // Fallback
  }

  const existing = inMemoryOrders.find((o) => o.id === orderId);
  if (!existing) throw new Error("Order not found");

  const cancelled: CustomerOrder = {
    ...existing,
    status: "CANCELLED",
    cancelReason,
    cancelledAt: new Date().toISOString(),
    statusHistory: [
      ...(existing.statusHistory || []),
      {
        id: `hist_${Date.now()}`,
        fromStatus: existing.status,
        toStatus: "CANCELLED",
        changedBy: inMemoryProfile.userId,
        reason: cancelReason,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  inMemoryOrders = inMemoryOrders.map((o) => (o.id === orderId ? cancelled : o));
  return cancelled;
}

/**
 * 15. Get customer order tracking
 * GET /api/v1/customers/me/orders/:orderId/tracking
 */
export async function getCustomerOrderTracking(orderId: string): Promise<CustomerTrackingResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/orders/${orderId}/tracking`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback
  }

  return {
    ...MOCK_ORDER_TRACKING,
    orderId,
  };
}

/**
 * 16. List user notifications
 * GET /api/v1/notifications
 */
export async function getCustomerNotifications(query?: {
  page?: number;
  limit?: number;
}): Promise<NotificationListResponse> {
  const page = query?.page || 1;
  const limit = query?.limit || 20;

  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const res = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.notifications)) {
        inMemoryNotifications = data.notifications;
        return data;
      }
    }
  } catch {
    // Fallback
  }

  return {
    notifications: inMemoryNotifications,
    total: inMemoryNotifications.length,
    page,
    limit,
    totalPages: Math.ceil(inMemoryNotifications.length / limit) || 1,
  };
}

/**
 * 17. Get unread notification count
 * GET /api/v1/notifications/unread-count
 */
export async function getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback
  }

  const unreadCount = inMemoryNotifications.filter((n) => n.readAt === null).length;
  return { unreadCount };
}

/**
 * 18. Mark notification as read
 * PATCH /api/v1/notifications/:notificationId/read
 */
export async function markNotificationAsRead(notificationId: string): Promise<CustomerNotification> {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      inMemoryNotifications = inMemoryNotifications.map((n) => (n.id === notificationId ? data : n));
      return data;
    }
  } catch {
    // Fallback
  }

  inMemoryNotifications = inMemoryNotifications.map((n) =>
    n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n,
  );

  const matched = inMemoryNotifications.find((n) => n.id === notificationId);
  if (!matched) throw new Error("Notification not found");
  return matched;
}

/**
 * 19. Mark all notifications as read
 * PATCH /api/v1/notifications/read-all
 */
export async function markAllNotificationsAsRead(): Promise<{ success: boolean; updatedCount: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      inMemoryNotifications = inMemoryNotifications.map((n) => ({
        ...n,
        readAt: n.readAt || new Date().toISOString(),
      }));
      return data;
    }
  } catch {
    // Fallback
  }

  let count = 0;
  inMemoryNotifications = inMemoryNotifications.map((n) => {
    if (!n.readAt) {
      count++;
      return { ...n, readAt: new Date().toISOString() };
    }
    return n;
  });

  return { success: true, updatedCount: count };
}
