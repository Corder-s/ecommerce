import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  memory: {
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
  };
  checks: {
    api: 'up' | 'down';
    database: string;
    redis: string;
  };
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {}

  getHealth(): HealthCheckResult {
    const memory = process.memoryUsage();
    const dbUrl = this.configService.get<string>('database.url');
    const redisUrl = this.configService.get<string>('redis.url');

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: this.configService.get<string>('environment') || 'development',
      version: '0.1.0',
      memory: {
        rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      },
      checks: {
        api: 'up',
        database: dbUrl ? 'configured' : 'pending_configuration',
        redis: redisUrl ? 'configured' : 'not_configured',
      },
    };
  }

  getLiveness(): { status: string; uptime: number } {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  getReadiness(): { status: string; ready: boolean; timestamp: string } {
    return {
      status: 'ok',
      ready: true,
      timestamp: new Date().toISOString(),
    };
  }
}
