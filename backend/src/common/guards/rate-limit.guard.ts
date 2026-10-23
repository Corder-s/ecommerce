import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { CACHE_SERVICE, ICacheService } from '../cache';

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  // Default global rate limit: 120 requests per 60 seconds
  private readonly DEFAULT_LIMIT = 120;
  private readonly DEFAULT_TTL_SECONDS = 60;

  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_SERVICE) private readonly cacheService: ICacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no rate limit specified on handler/class, use default limits
    const limit = rateLimitOptions?.limit || this.DEFAULT_LIMIT;
    const ttlSeconds = rateLimitOptions?.ttlSeconds || this.DEFAULT_TTL_SECONDS;

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Resolve client identifier (authenticated user ID if present, otherwise remote IP)
    const user = (req as any).user;
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const clientId = user?.id ? `u:${user.id}` : `ip:${clientIp}`;
    const endpointKey = req.baseUrl || req.path || '/';
    const cacheKey = `gaushilp:v1:ratelimit:${clientId}:${req.method}:${endpointKey}`;

    const now = Date.now();

    try {
      let tracker = await this.cacheService.get<RateLimitTracker>(cacheKey);

      if (!tracker || now > tracker.resetAt) {
        tracker = {
          count: 1,
          resetAt: now + ttlSeconds * 1000,
        };
        await this.cacheService.set(cacheKey, tracker, ttlSeconds);
      } else {
        tracker.count += 1;
        const remainingTtl = Math.max(1, Math.ceil((tracker.resetAt - now) / 1000));
        await this.cacheService.set(cacheKey, tracker, remainingTtl);
      }

      const remaining = Math.max(0, limit - tracker.count);
      const resetInSeconds = Math.max(1, Math.ceil((tracker.resetAt - now) / 1000));

      // Standard RateLimit HTTP headers (IETF draft)
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetInSeconds);

      if (tracker.count > limit) {
        res.setHeader('Retry-After', resetInSeconds);
        this.logger.warn(
          `Rate limit exceeded for client ${clientId} on ${req.method} ${req.path} (${tracker.count}/${limit})`,
        );
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: 'Too many requests, please slow down and try again later.',
            retryAfterSeconds: resetInSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      // If cache fails, fail open to avoid service outage
      this.logger.warn(`RateLimitGuard cache error (failing open): ${err}`);
      return true;
    }
  }
}
