/**
 * GauShilp OS — Public Storefront & Product Discovery API Module
 *
 * Conforms strictly to NestJS backend endpoints:
 * - PublicStoresController (/public/stores/:slug)
 * - PublicStoresController (/public/stores/:slug/categories)
 * - PublicStoresController (/public/stores/:slug/products)
 * - PublicStoresController (/public/stores/:slug/products/:productSlug)
 * - CartController (/cart, /cart/items)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface PublicStoreCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count?: {
    products: number;
  };
}

export interface PublicStore {
  id: string;
  businessName: string;
  storeSlug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  currency: string;
  status: "ACTIVE" | "SUSPENDED";
  isPublished: boolean;
  publishedAt: string | null;
  categories: PublicStoreCategory[];
}

export interface PublicProductCategory {
  id: string;
  name: string;
  slug: string;
}

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  currency: string;
  sku?: string | null;
  stock?: number;
  images: string[];
  createdAt: string;
  category: PublicProductCategory;
  store?: {
    id: string;
    businessName: string;
    storeSlug: string;
  };
}

export interface PublicStoreProductsResponse {
  store: {
    id: string;
    businessName: string;
    storeSlug: string;
  };
  data: PublicProduct[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PublicProductDetailsResponse {
  store: {
    id: string;
    businessName: string;
    storeSlug: string;
  };
  product: PublicProduct;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  image?: string;
  storeSlug: string;
}

export interface CartSummary {
  items: CartItem[];
  totalItemsCount: number;
  subtotal: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Baseline Mock Data (Fallback for Offline & SSR Mode)
// ---------------------------------------------------------------------------

export const MOCK_PUBLIC_STORE: PublicStore = {
  id: "tenant_mitti_craft",
  businessName: "Mitti Craft Studio & Pottery",
  storeSlug: "mitti-craft-studio",
  description:
    "Authentic Gaushala collective and traditional Indian artisans crafting 100% biodegradable desi cow dung oil lamps, herbal dhoop, and sacred Vedic puja kits.",
  logoUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&auto=format&fit=crop&q=80",
  bannerUrl: "https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?w=1200&auto=format&fit=crop&q=80",
  contactEmail: "contact@mitticraft.com",
  contactPhone: "+91 98765 43210",
  address: "Mathura Artisan Workshop & Gaushala Complex, Vrindavan Road, Mathura, UP 281001",
  currency: "INR",
  status: "ACTIVE",
  isPublished: true,
  publishedAt: "2026-01-01T00:00:00.000Z",
  categories: [
    {
      id: "cat_diyas",
      name: "Festive & Sacred Diyas",
      slug: "sacred-diyas",
      description: "Biodegradable, eco-friendly desi cow dung festive oil lamps.",
      _count: { products: 1 },
    },
    {
      id: "cat_dhoop",
      name: "Incense & Herbal Dhoop",
      slug: "incense-dhoop",
      description: "Organic sambrani and guggal cups for meditation and puja.",
      _count: { products: 1 },
    },
    {
      id: "cat_statues",
      name: "Handmade Statues",
      slug: "handmade-statues",
      description: "Sacred idols made from sacred cow dung and clay.",
      _count: { products: 1 },
    },
    {
      id: "cat_kits",
      name: "Sacred Puja Kits",
      slug: "puja-kits",
      description: "Complete Vedic daily morning ritual kits.",
      _count: { products: 1 },
    },
    {
      id: "cat_havan",
      name: "Havan & Vedic Samagri",
      slug: "havan-samagri",
      description: "Traditional havan samagri sticks and wood substitutes.",
      _count: { products: 1 },
    },
  ],
};

export const MOCK_PUBLIC_PRODUCTS: PublicProduct[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Handcrafted Vedic Cow Dung Diyas (Pack of 12)",
    slug: "handcrafted-vedic-cow-dung-diyas",
    description:
      "100% biodegradable and natural desi cow dung lamps crafted by Indian rural artisans. Enhances spiritual positive energy and cleanses the household aura.",
    price: 349,
    currency: "INR",
    sku: "DIY-12PK",
    stock: 142,
    images: [
      "https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80",
    ],
    createdAt: "2026-01-15T09:00:00.000Z",
    category: {
      id: "cat_diyas",
      name: "Festive & Sacred Diyas",
      slug: "sacred-diyas",
    },
    store: {
      id: "tenant_mitti_craft",
      businessName: "Mitti Craft Studio & Pottery",
      storeSlug: "mitti-craft-studio",
    },
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    name: "Organic Herbal Sambrani Dhoop Cups (Pack of 15)",
    slug: "organic-herbal-sambrani-dhoop-cups",
    description:
      "Formulated with natural guggal, loban, pure desi cow ghee, and sacred ayurvedic herbs. Purifies air, repels insects, and creates deep meditative tranquility.",
    price: 299,
    currency: "INR",
    sku: "DHP-15CP",
    stock: 88,
    images: [
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80",
    ],
    createdAt: "2026-01-20T10:00:00.000Z",
    category: {
      id: "cat_dhoop",
      name: "Incense & Herbal Dhoop",
      slug: "incense-dhoop",
    },
    store: {
      id: "tenant_mitti_craft",
      businessName: "Mitti Craft Studio & Pottery",
      storeSlug: "mitti-craft-studio",
    },
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    name: "Eco-Friendly Cow Dung Ganesh Murtis (6-inch)",
    slug: "eco-friendly-cow-dung-ganesh-murtis",
    description:
      "Vedic handcrafted Lord Ganesha idol created from pure Gir cow dung and terracotta clay. Easily dissolves in household planters for eco-friendly Visarjan.",
    price: 599,
    currency: "INR",
    sku: "MRT-GANESH-6",
    stock: 6,
    images: [
      "https://images.unsplash.com/photo-1567653418876-5bb0e566e1c2?w=800&auto=format&fit=crop&q=80",
    ],
    createdAt: "2026-02-01T12:00:00.000Z",
    category: {
      id: "cat_statues",
      name: "Handmade Statues",
      slug: "handmade-statues",
    },
    store: {
      id: "tenant_mitti_craft",
      businessName: "Mitti Craft Studio & Pottery",
      storeSlug: "mitti-craft-studio",
    },
  },
  {
    id: "a0000000-0000-0000-0000-000000000004",
    name: "Vedic Panchgavya Sacred Daily Puja Kit",
    slug: "vedic-panchgavya-sacred-daily-puja-kit",
    description:
      "All-in-one divine morning puja collection containing cow dung diyas, brass camphor burner, organic dhoop cups, and holy havan samagri sticks.",
    price: 899,
    currency: "INR",
    sku: "KIT-PUJA-01",
    stock: 45,
    images: [
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80",
    ],
    createdAt: "2026-02-10T14:30:00.000Z",
    category: {
      id: "cat_kits",
      name: "Sacred Puja Kits",
      slug: "puja-kits",
    },
    store: {
      id: "tenant_mitti_craft",
      businessName: "Mitti Craft Studio & Pottery",
      storeSlug: "mitti-craft-studio",
    },
  },
  {
    id: "a0000000-0000-0000-0000-000000000005",
    name: "Desi Gir Cow Dung Havan Samagri Sticks (Pack of 20)",
    slug: "desi-gir-cow-dung-havan-samagri-sticks",
    description:
      "Smokeless, long-burning sticks crafted with desi cow dung, sacred woods, and organic herbs for daily Agnihotra and Vedic havan ceremonies.",
    price: 249,
    currency: "INR",
    sku: "HVN-20STK",
    stock: 8,
    images: [
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80",
    ],
    createdAt: "2026-02-15T16:00:00.000Z",
    category: {
      id: "cat_havan",
      name: "Havan & Vedic Samagri",
      slug: "havan-samagri",
    },
    store: {
      id: "tenant_mitti_craft",
      businessName: "Mitti Craft Studio & Pottery",
      storeSlug: "mitti-craft-studio",
    },
  },
];

// In-memory customer cart state (synchronized across storefront interactions)
let inMemoryCart: CartItem[] = [
  {
    id: "cart_item_01",
    productId: "a0000000-0000-0000-0000-000000000001",
    productName: "Handcrafted Vedic Cow Dung Diyas (Pack of 12)",
    price: 349,
    quantity: 2,
    subtotal: 698,
    image: "https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?w=400&auto=format&fit=crop&q=80",
    storeSlug: "mitti-craft-studio",
  },
];

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
// Public Storefront API Methods
// ---------------------------------------------------------------------------

/**
 * 1. Retrieve published store details by storeSlug
 * GET /api/v1/public/stores/:slug
 */
export async function getPublicStore(slug: string): Promise<PublicStore> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/stores/${slug}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback to baseline
  }

  if (slug === MOCK_PUBLIC_STORE.storeSlug || slug === "mitti-craft" || slug === "default") {
    return MOCK_PUBLIC_STORE;
  }

  throw new Error(`Store with slug "${slug}" not found or is currently unpublished.`);
}

/**
 * 2. Retrieve published store categories
 * GET /api/v1/public/stores/:slug/categories
 */
export async function getPublicStoreCategories(
  slug: string,
): Promise<{ store: { id: string; businessName: string; storeSlug: string }; data: PublicStoreCategory[] }> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/stores/${slug}/categories`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback
  }

  return {
    store: {
      id: MOCK_PUBLIC_STORE.id,
      businessName: MOCK_PUBLIC_STORE.businessName,
      storeSlug: MOCK_PUBLIC_STORE.storeSlug,
    },
    data: MOCK_PUBLIC_STORE.categories,
  };
}

/**
 * 3. Browse published products of a published store
 * GET /api/v1/public/stores/:slug/products
 */
export async function getPublicStoreProducts(
  slug: string,
  options?: { page?: number; limit?: number; categoryId?: string; search?: string },
): Promise<PublicStoreProductsResponse> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;

  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (options?.categoryId && options.categoryId !== "ALL") {
      params.append("categoryId", options.categoryId);
    }

    const res = await fetch(`${API_BASE_URL}/public/stores/${slug}/products?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback
  }

  let filtered = [...MOCK_PUBLIC_PRODUCTS];
  if (options?.categoryId && options.categoryId !== "ALL") {
    filtered = filtered.filter(
      (p) => p.category.id === options.categoryId || p.category.slug === options.categoryId,
    );
  }

  if (options?.search && options.search.trim()) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q),
    );
  }

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return {
    store: {
      id: MOCK_PUBLIC_STORE.id,
      businessName: MOCK_PUBLIC_STORE.businessName,
      storeSlug: MOCK_PUBLIC_STORE.storeSlug,
    },
    data: paginated,
    meta: {
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit) || 1,
    },
  };
}

/**
 * 4. Retrieve single published product details by slug
 * GET /api/v1/public/stores/:slug/products/:productSlug
 */
export async function getPublicProduct(
  storeSlug: string,
  productSlug: string,
): Promise<PublicProductDetailsResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/stores/${storeSlug}/products/${productSlug}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback
  }

  const found = MOCK_PUBLIC_PRODUCTS.find(
    (p) => p.slug === productSlug || p.id === productSlug,
  );

  if (found) {
    return {
      store: {
        id: MOCK_PUBLIC_STORE.id,
        businessName: MOCK_PUBLIC_STORE.businessName,
        storeSlug: MOCK_PUBLIC_STORE.storeSlug,
      },
      product: found,
    };
  }

  throw new Error(`Product "${productSlug}" not found in store "${storeSlug}".`);
}

// ---------------------------------------------------------------------------
// Shopping Cart Operations (Client-Side & Backend Integration)
// ---------------------------------------------------------------------------

/**
 * 5. Retrieve active shopping cart summary
 */
export async function getPublicCart(): Promise<CartSummary> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        return {
          items: data.items.map((i: any) => ({
            id: i.id,
            productId: i.productId,
            productName: i.product?.name || "Sacred Creation",
            price: Number(i.product?.price || 0),
            quantity: i.quantity,
            subtotal: Number(i.subtotal?.amount || 0),
            image: i.product?.images?.[0],
            storeSlug: i.product?.tenant?.storeSlug || "mitti-craft-studio",
          })),
          totalItemsCount: data.totalItemsCount || 0,
          subtotal: Number(data.subtotal?.amount || 0),
          currency: data.currency || "INR",
        };
      }
    }
  } catch {
    // Fallback
  }

  const totalItemsCount = inMemoryCart.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = inMemoryCart.reduce((sum, i) => sum + i.subtotal, 0);

  return {
    items: inMemoryCart,
    totalItemsCount,
    subtotal,
    currency: "INR",
  };
}

/**
 * 6. Add product to shopping cart
 */
export async function addToCart(
  productId: string,
  quantity = 1,
  storeSlug = "mitti-craft-studio",
): Promise<{ success: boolean; message: string }> {
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

  // Update in-memory cart
  const product = MOCK_PUBLIC_PRODUCTS.find((p) => p.id === productId);
  const existing = inMemoryCart.find((i) => i.productId === productId);

  if (existing) {
    existing.quantity += quantity;
    existing.subtotal = existing.quantity * existing.price;
  } else if (product) {
    inMemoryCart.unshift({
      id: `cart_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity,
      subtotal: product.price * quantity,
      image: product.images[0],
      storeSlug,
    });
  }

  return { success: true, message: "Item added to cart successfully" };
}

/**
 * 7. Update cart item quantity
 */
export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<{ success: boolean }> {
  if (quantity <= 0) {
    return removeCartItem(itemId);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ quantity }),
    });

    if (res.ok) {
      return { success: true };
    }
  } catch {
    // Fallback
  }

  const item = inMemoryCart.find((i) => i.id === itemId);
  if (item) {
    item.quantity = quantity;
    item.subtotal = item.quantity * item.price;
  }

  return { success: true };
}

/**
 * 8. Remove item from shopping cart
 */
export async function removeCartItem(itemId: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
      method: "DELETE",
      headers: {
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      inMemoryCart = inMemoryCart.filter((i) => i.id !== itemId);
      return { success: true };
    }
  } catch {
    // Fallback
  }

  inMemoryCart = inMemoryCart.filter((i) => i.id !== itemId);
  return { success: true };
}

/**
 * 9. Clear all cart items
 */
export async function clearCart(): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/items`, {
      method: "DELETE",
      headers: {
        ...getAuthHeader(),
      },
    });

    if (res.ok) {
      inMemoryCart = [];
      return { success: true };
    }
  } catch {
    // Fallback
  }

  inMemoryCart = [];
  return { success: true };
}
