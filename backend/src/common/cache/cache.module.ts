import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_SERVICE } from './cache.interface';
import { RedisCacheService } from './redis-cache.service';
import { InMemoryCacheService } from './in-memory-cache.service';

const cacheServiceProvider: Provider = {
  provide: CACHE_SERVICE,
  useFactory: async (configService: ConfigService) => {
    const redisUrl = configService.get<string>('redis.url');
    if (redisUrl) {
      const redisService = new RedisCacheService(redisUrl);
      await redisService.onModuleInit();
      return redisService;
    }
    return new InMemoryCacheService();
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [cacheServiceProvider],
  exports: [CACHE_SERVICE],
})
export class CacheModule {}
