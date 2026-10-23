import { InMemoryCacheService } from './in-memory-cache.service';
import { RedisCacheService } from './redis-cache.service';
import { CacheKeys, CacheTTL } from './cache.interface';

describe('Cache Infrastructure (Step 13)', () => {
  describe('InMemoryCacheService', () => {
    let service: InMemoryCacheService;

    beforeEach(() => {
      service = new InMemoryCacheService();
    });

    it('should set and get values with JSON serialization', async () => {
      const data = { id: 'p-1', name: 'A2 Vedic Bilona Ghee', price: 1500 };
      await service.set('test:key:1', data, 60);

      const cached = await service.get<typeof data>('test:key:1');
      expect(cached).toEqual(data);
    });

    it('should return null for non-existent keys', async () => {
      const cached = await service.get('non-existent');
      expect(cached).toBeNull();
    });

    it('should respect TTL expiration', async () => {
      const data = { temp: true };
      await service.set('test:ttl', data, 1); // 1 second

      // Advance clock or mock Date.now
      const realNow = Date.now;
      try {
        Date.now = () => realNow() + 2000; // 2 seconds later
        const cached = await service.get('test:ttl');
        expect(cached).toBeNull();
      } finally {
        Date.now = realNow;
      }
    });

    it('should delete keys individually', async () => {
      await service.set('del:1', 'val1');
      await service.del('del:1');
      expect(await service.get('del:1')).toBeNull();
    });

    it('should delete keys by glob pattern', async () => {
      await service.set('gaushilp:v1:t:tenant-1:products:p1:l20:call', { page: 1 });
      await service.set('gaushilp:v1:t:tenant-1:products:p2:l20:call', { page: 2 });
      await service.set('gaushilp:v1:t:tenant-1:product:ghee', { name: 'Ghee' });
      await service.set('gaushilp:v1:t:tenant-2:products:p1:l20:call', { page: 1 });

      // Invalidate tenant 1 products only
      await service.delByPattern('gaushilp:v1:t:tenant-1:products:*');

      expect(await service.get('gaushilp:v1:t:tenant-1:products:p1:l20:call')).toBeNull();
      expect(await service.get('gaushilp:v1:t:tenant-1:products:p2:l20:call')).toBeNull();

      // Tenant 1 product detail and Tenant 2 products remain intact
      expect(await service.get('gaushilp:v1:t:tenant-1:product:ghee')).toEqual({ name: 'Ghee' });
      expect(await service.get('gaushilp:v1:t:tenant-2:products:p1:l20:call')).toEqual({ page: 1 });
    });

    it('should flush all keys', async () => {
      await service.set('k1', 'v1');
      await service.set('k2', 'v2');
      await service.flushAll();

      expect(await service.get('k1')).toBeNull();
      expect(await service.get('k2')).toBeNull();
    });

    it('should provide stats and ping correctly', async () => {
      expect(await service.ping()).toBe(true);
      const stats = service.getStats();
      expect(stats.isRedis).toBe(false);
      expect(stats.connected).toBe(true);
    });
  });

  describe('RedisCacheService Resiliency & Safe Degradation', () => {
    it('should safely degrade to null when Redis URL is unreachable', async () => {
      const unreachableService = new RedisCacheService('redis://127.0.0.1:63799'); // invalid port
      await unreachableService.onModuleInit();

      // Operations should not throw exceptions or crash the app
      const val = await unreachableService.get('any-key');
      expect(val).toBeNull();

      await expect(unreachableService.set('key', { test: true }, 60)).resolves.not.toThrow();
      await expect(unreachableService.del('key')).resolves.not.toThrow();
      await expect(unreachableService.delByPattern('pattern:*')).resolves.not.toThrow();
      expect(await unreachableService.ping()).toBe(false);

      const stats = unreachableService.getStats();
      expect(stats.isRedis).toBe(true);
      expect(stats.connected).toBe(false);

      await unreachableService.onModuleDestroy();
    });
  });

  describe('CacheKeys & CacheTTL Tenant Isolation Rules', () => {
    it('should generate distinct keys for different tenants', () => {
      const keyTenantA = CacheKeys.tenantProducts('tenant-a', 1, 20);
      const keyTenantB = CacheKeys.tenantProducts('tenant-b', 1, 20);

      expect(keyTenantA).not.toEqual(keyTenantB);
      expect(keyTenantA).toContain('t:tenant-a:products');
      expect(keyTenantB).toContain('t:tenant-b:products');
    });

    it('should generate properly scoped invalidation patterns', () => {
      const patternA = CacheKeys.tenantProductsPattern('tenant-a');
      expect(patternA).toBe('gaushilp:v1:t:tenant-a:products:*');

      const patternB = CacheKeys.tenantProductPattern('tenant-b');
      expect(patternB).toBe('gaushilp:v1:t:tenant-b:product:*');
    });

    it('should enforce appropriate default TTLs', () => {
      expect(CacheTTL.STORE).toBe(600);
      expect(CacheTTL.PRODUCTS).toBe(300);
      expect(CacheTTL.PRODUCT).toBe(600);
      expect(CacheTTL.CATEGORIES).toBe(900);
      expect(CacheTTL.PLANS).toBe(1800);
    });
  });
});
