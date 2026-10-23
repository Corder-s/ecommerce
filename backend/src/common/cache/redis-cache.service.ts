import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ICacheService } from './cache.interface';

@Injectable()
export class RedisCacheService implements ICacheService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private lastWarningLog = 0;

  constructor(private readonly redisUrl: string) {}

  async onModuleInit(): Promise<void> {
    try {
      this.client = new Redis(this.redisUrl, {
        lazyConnect: true,
        connectTimeout: 2000,
        commandTimeout: 1500,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 3000);
          return delay;
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Connected to shared Redis cache cluster');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.throttledWarn(
          `Redis cache connection error (falling back to database): ${err.message}`,
        );
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
    } catch (err) {
      this.isConnected = false;
      this.logger.warn(
        `Redis cache initialization deferred or unavailable: ${
          err instanceof Error ? err.message : String(err)
        }. Falling back to PostgreSQL for authoritative data.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.isConnected = false;
      this.logger.log('Disconnected from Redis cache');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as T;
    } catch (err) {
      this.throttledWarn(
        `Redis get error on key "${key}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      const ttl = Math.max(1, ttlSeconds);
      await this.client.set(key, serialized, 'EX', ttl);
    } catch (err) {
      this.throttledWarn(
        `Redis set error on key "${key}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (err) {
      this.throttledWarn(
        `Redis del error on key "${key}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      const stream = this.client.scanStream({
        match: pattern,
        count: 100,
      });

      const pipeline = this.client.pipeline();
      let keyCount = 0;

      stream.on('data', (keys: string[]) => {
        if (keys.length > 0) {
          keyCount += keys.length;
          for (const key of keys) {
            pipeline.del(key);
          }
        }
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('end', async () => {
          try {
            if (keyCount > 0) {
              await pipeline.exec();
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        stream.on('error', (err) => reject(err));
      });
    } catch (err) {
      this.throttledWarn(
        `Redis delByPattern error for pattern "${pattern}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async flushAll(): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.flushdb();
    } catch (err) {
      this.throttledWarn(
        `Redis flushAll error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }

  getStats(): { isRedis: boolean; connected: boolean; keysCount?: number } {
    return {
      isRedis: true,
      connected: this.isConnected,
    };
  }

  private throttledWarn(message: string): void {
    const now = Date.now();
    if (now - this.lastWarningLog > 10000) {
      this.logger.warn(message);
      this.lastWarningLog = now;
    }
  }
}
