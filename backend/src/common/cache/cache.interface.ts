export interface ICacheService {
  /**
   * Retrieve a parsed JSON item by key.
   * Returns null if key does not exist, expired, or if cache backend is unavailable.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Store a JSON-serializable item by key with a TTL in seconds.
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a single key from cache.
   */
  del(key: string): Promise<void>;

  /**
   * Delete all keys matching a glob pattern (e.g. "gaushilp:v1:t:tenant-123:*").
   * Uses non-blocking SCAN in Redis.
   */
  delByPattern(pattern: string): Promise<void>;

  /**
   * Flush all keys in the current database/cache store.
   */
  flushAll(): Promise<void>;

  /**
   * Ping cache backend to verify liveness.
   */
  ping(): Promise<boolean>;

  /**
   * Return metadata / connectivity stats.
   */
  getStats(): { isRedis: boolean; connected: boolean; keysCount?: number };
}

export const CACHE_SERVICE = Symbol('CACHE_SERVICE');

/**
 * Standardized tenant-aware cache key generators and TTL values.
 * Enforces strong isolation between tenants and public vs private data.
 */
export const CacheKeys = {
  // Public store metadata (10m TTL)
  publicStore: (slug: string) => `gaushilp:v1:public:store:${slug.toLowerCase()}`,

  // Tenant product catalogue listing with pagination & category filter (5m TTL)
  tenantProducts: (tenantId: string, page: number = 1, limit: number = 20, categoryId?: string) =>
    `gaushilp:v1:t:${tenantId}:products:p${page}:l${limit}:c${categoryId || 'all'}`,

  // Invalidation pattern for tenant products
  tenantProductsPattern: (tenantId: string) => `gaushilp:v1:t:${tenantId}:products:*`,

  // Tenant individual product detail (10m TTL)
  tenantProduct: (tenantId: string, slug: string) =>
    `gaushilp:v1:t:${tenantId}:product:${slug.toLowerCase()}`,

  // Invalidation pattern for tenant individual product
  tenantProductPattern: (tenantId: string) => `gaushilp:v1:t:${tenantId}:product:*`,

  // Tenant category list (15m TTL)
  tenantCategories: (tenantId: string) => `gaushilp:v1:t:${tenantId}:categories`,

  // Invalidation pattern for tenant categories
  tenantCategoriesPattern: (tenantId: string) => `gaushilp:v1:t:${tenantId}:categories*`,

  // Platform subscription plans (30m TTL)
  platformPlans: () => `gaushilp:v1:platform:subscription_plans`,
} as const;

export const CacheTTL = {
  STORE: 600, // 10 minutes
  PRODUCTS: 300, // 5 minutes
  PRODUCT: 600, // 10 minutes
  CATEGORIES: 900, // 15 minutes
  PLANS: 1800, // 30 minutes
} as const;
