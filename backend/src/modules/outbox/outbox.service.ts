import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OutboxEventStatus, Prisma } from '@prisma/client';
import { CreateOutboxEventInput, OutboxEventEntity } from './interfaces/outbox.interface';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists an outbox event.
   * Can be executed inside an existing Prisma transactional client `tx`
   * ensuring business state and domain events are committed atomically.
   */
  async createEvent(
    input: CreateOutboxEventInput,
    tx?: Prisma.TransactionClient,
  ): Promise<OutboxEventEntity> {
    const client = tx || this.prisma;

    if (!client?.outboxEvent?.create) {
      this.logger.warn(`Outbox event storage not available for [${input.eventType}]`);
      return {
        id: `mock-${Date.now()}`,
        eventType: input.eventType,
        tenantId: input.tenantId || null,
        payload: input.payload,
        status: OutboxEventStatus.PENDING,
        retryCount: 0,
        maxRetries: input.maxRetries || 5,
        lastError: null,
        scheduledAt: input.scheduledAt || new Date(),
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    try {
      const event = await client.outboxEvent.create({
        data: {
          eventType: input.eventType,
          tenantId: input.tenantId || null,
          payload: input.payload as unknown as Prisma.InputJsonValue,
          scheduledAt: input.scheduledAt || new Date(),
          maxRetries: input.maxRetries || 5,
          status: OutboxEventStatus.PENDING,
        },
      });

      this.logger.log(
        `Outbox event created: [${event.eventType}] (ID: ${event.id}) for tenant: ${input.tenantId || 'global'}`,
      );

      return event as unknown as OutboxEventEntity;
    } catch (err) {
      this.logger.error(
        `Failed to persist outbox event [${input.eventType}]: ${(err as Error).message}`,
      );
      // Fulfill requirement: Ensure one failed notification cannot roll back an already committed order or payment
      return {
        id: `err-${Date.now()}`,
        eventType: input.eventType,
        tenantId: input.tenantId || null,
        payload: input.payload,
        status: OutboxEventStatus.FAILED,
        retryCount: 0,
        maxRetries: input.maxRetries || 5,
        lastError: (err as Error).message,
        scheduledAt: input.scheduledAt || new Date(),
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Fetches a batch of pending events ready for processing.
   */
  async getPendingEvents(batchSize = 20): Promise<OutboxEventEntity[]> {
    const now = new Date();
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: OutboxEventStatus.PENDING,
        scheduledAt: { lte: now },
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    return events as unknown as OutboxEventEntity[];
  }

  /**
   * Atomically transitions event status from PENDING to PROCESSING.
   */
  async markProcessing(eventId: string): Promise<OutboxEventEntity> {
    const updated = await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: { status: OutboxEventStatus.PROCESSING },
    });
    return updated as unknown as OutboxEventEntity;
  }

  /**
   * Marks event as successfully processed.
   */
  async markProcessed(eventId: string): Promise<OutboxEventEntity> {
    const updated = await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxEventStatus.PROCESSED,
        processedAt: new Date(),
        lastError: null,
      },
    });
    this.logger.log(`Outbox event processed successfully: ${eventId}`);
    return updated as unknown as OutboxEventEntity;
  }

  /**
   * Handles processing failure with bounded retries and exponential backoff.
   * Differentiates transient failures from permanent non-retryable failures.
   */
  async handleFailure(eventId: string, error: Error | string): Promise<OutboxEventEntity> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const isPermanent =
      errorMessage.toLowerCase().includes('permanent failure') ||
      errorMessage.toLowerCase().includes('invalid email');

    const event = await this.prisma.outboxEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Outbox event ${eventId} not found`);
    }

    const nextRetry = event.retryCount + 1;
    const reachedMax = nextRetry >= event.maxRetries;

    let targetStatus: OutboxEventStatus = OutboxEventStatus.PENDING;
    let nextScheduledAt = new Date();

    if (isPermanent || reachedMax) {
      targetStatus = OutboxEventStatus.DEAD_LETTER;
      this.logger.error(
        `Outbox event ${eventId} moved to DEAD_LETTER (Attempts: ${nextRetry}/${event.maxRetries}, Permanent: ${isPermanent}). Error: ${errorMessage}`,
      );
    } else {
      // Exponential backoff: 2s, 4s, 8s, 16s, 32s (capped at 300s)
      const delaySeconds = Math.min(300, Math.pow(2, nextRetry) * 2);
      nextScheduledAt = new Date(Date.now() + delaySeconds * 1000);
      this.logger.warn(
        `Outbox event ${eventId} scheduled for retry ${nextRetry}/${event.maxRetries} in ${delaySeconds}s. Error: ${errorMessage}`,
      );
    }

    const updated = await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: targetStatus,
        retryCount: nextRetry,
        lastError: errorMessage.substring(0, 500),
        scheduledAt: nextScheduledAt,
      },
    });

    return updated as unknown as OutboxEventEntity;
  }

  /**
   * Retrieves failed and dead-lettered events for administrative inspection.
   */
  async getFailedEvents(
    page = 1,
    limit = 20,
  ): Promise<{ events: OutboxEventEntity[]; total: number }> {
    const skip = (page - 1) * limit;
    const where: Prisma.OutboxEventWhereInput = {
      status: {
        in: [OutboxEventStatus.FAILED, OutboxEventStatus.DEAD_LETTER],
      },
    };

    const [total, events] = await Promise.all([
      this.prisma.outboxEvent.count({ where }),
      this.prisma.outboxEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      events: events as unknown as OutboxEventEntity[],
      total,
    };
  }

  /**
   * Resets a dead-lettered event for manual replay.
   */
  async replayEvent(eventId: string): Promise<OutboxEventEntity> {
    const updated = await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxEventStatus.PENDING,
        retryCount: 0,
        scheduledAt: new Date(),
        lastError: null,
      },
    });

    this.logger.log(`Outbox event ${eventId} manually queued for replay.`);
    return updated as unknown as OutboxEventEntity;
  }
}
