import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  AdminSystemHealth,
  AdminDatabaseHealth,
  AdminQueuesHealth,
} from '../interfaces/admin-health.interface';
import { OutboxEventStatus } from '@prisma/client';

@Injectable()
export class AdminHealthService {
  private readonly logger = new Logger(AdminHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Returns application runtime metrics without exposing sensitive infrastructure secrets.
   */
  getSystemHealth(): AdminSystemHealth {
    const memory = process.memoryUsage();
    const uptimeSeconds = Math.floor(process.uptime());

    const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

    return {
      status: 'HEALTHY',
      uptimeSeconds,
      nodeVersion: process.version,
      memory: {
        rssMb: toMb(memory.rss),
        heapUsedMb: toMb(memory.heapUsed),
        heapTotalMb: toMb(memory.heapTotal),
      },
      environment: this.configService.get<string>('nodeEnv') || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Performs an isolated connectivity probe to PostgreSQL with a 3-second timeout.
   * Completely redacts connection strings, hostnames, and credentials.
   */
  async getDatabaseHealth(): Promise<AdminDatabaseHealth> {
    const start = Date.now();
    try {
      // Execute a lightweight ping query with a 3000ms promise race timeout
      const queryPromise = this.prisma.$queryRaw`SELECT 1 as ping`;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database ping timed out after 3000ms')), 3000),
      );

      await Promise.race([queryPromise, timeoutPromise]);
      const responseTimeMs = Date.now() - start;

      return {
        status: 'UP',
        responseTimeMs,
        connected: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTimeMs = Date.now() - start;
      this.logger.error(
        'Database health probe failed:',
        error instanceof Error ? error.message : error,
      );

      return {
        status: 'DOWN',
        responseTimeMs,
        connected: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Inspects background job queue and outbox event states.
   * Distinguishes dead-letter poison pills from healthy queue processing.
   */
  async getQueuesHealth(): Promise<AdminQueuesHealth> {
    try {
      const [pendingCount, processingCount, deadLetterCount, recentFailures] = await Promise.all([
        this.prisma.outboxEvent.count({
          where: { status: OutboxEventStatus.PENDING },
        }),
        this.prisma.outboxEvent.count({
          where: { status: OutboxEventStatus.PROCESSING },
        }),
        this.prisma.outboxEvent.count({
          where: { status: OutboxEventStatus.DEAD_LETTER },
        }),
        this.prisma.outboxEvent.count({
          where: {
            status: OutboxEventStatus.FAILED,
            updatedAt: { gte: new Date(Date.now() - 3600 * 1000) }, // last 1 hour
          },
        }),
      ]);

      let status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
      if (deadLetterCount > 50) {
        status = 'CRITICAL';
      } else if (deadLetterCount > 0 || recentFailures > 10) {
        status = 'DEGRADED';
      }

      return {
        status,
        pendingEventsCount: pendingCount,
        processingEventsCount: processingCount,
        deadLetterEventsCount: deadLetterCount,
        recentFailuresCount: recentFailures,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        'Queues health probe failed:',
        error instanceof Error ? error.message : error,
      );

      return {
        status: 'CRITICAL',
        pendingEventsCount: 0,
        processingEventsCount: 0,
        deadLetterEventsCount: 0,
        recentFailuresCount: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
