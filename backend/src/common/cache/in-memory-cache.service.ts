import { Injectable, Logger } from '@nestjs/common';
import { ICacheService } from './cache.interface';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class InMemoryCacheService implements ICacheService {
  private readonly logger = new Logger(InMemoryCacheService.name);
  private readonly storage = new Map<string, CacheEntry>();
  private readonly MAX_ENTRIES = 5000;

  async get<T>(key: string): Promise<T | null> {
    const entry = this.storage.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.storage.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch (err) {
      this.logger.warn(`Failed to parse cached value for key: ${key}`);
      this.storage.delete(key);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    if (this.storage.size >= this.MAX_ENTRIES) {
      this.evictExpiredOrOldest();
    }

    try {
      const serialized = JSON.stringify(value);
      const expiresAt = Date.now() + Math.max(1, ttlSeconds) * 1000;
      this.storage.set(key, { value: serialized, expiresAt });
    } catch (err) {
      this.logger.warn(`Failed to serialize value for cache key: ${key}`);
    }
  }

  async del(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    const regexPattern = new RegExp(
      '^' + pattern.replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&').replace(/\*/g, '.*') + '$',
    );

    const keysToDelete: string[] = [];
    for (const key of this.storage.keys()) {
      if (regexPattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.storage.delete(key);
    }
  }

  async flushAll(): Promise<void> {
    this.storage.clear();
  }

  async ping(): Promise<boolean> {
    return true;
  }

  getStats(): { isRedis: boolean; connected: boolean; keysCount?: number } {
    return {
      isRedis: false,
      connected: true,
      keysCount: this.storage.size,
    };
  }

  private evictExpiredOrOldest(): void {
    const now = Date.now();

    for (const [key, entry] of this.storage.entries()) {
      if (now > entry.expiresAt) {
        this.storage.delete(key);
      }
    }

    // If still at capacity, delete first 10%
    if (this.storage.size >= this.MAX_ENTRIES) {
      let count = 0;
      const target = Math.floor(this.MAX_ENTRIES * 0.1);
      for (const key of this.storage.keys()) {
        this.storage.delete(key);
        count++;
        if (count >= target) break;
      }
    }
  }
}
