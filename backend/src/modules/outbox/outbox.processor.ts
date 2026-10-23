import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { JobProducer } from '../jobs/producers/job.producer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessor.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly jobProducer: JobProducer,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const isOutboxEnabled = this.configService.get<boolean>('jobs.outboxProcessingEnabled', true);
    const intervalMs = this.configService.get<number>('jobs.outboxIntervalMs', 3000);

    if (isOutboxEnabled && process.env.NODE_ENV !== 'test') {
      this.logger.log(`Starting outbox poller daemon with interval ${intervalMs}ms`);
      this.timer = setInterval(() => {
        void this.processPendingBatch().catch((err) => {
          this.logger.error(`Error in outbox background loop: ${(err as Error).message}`);
        });
      }, intervalMs);
    }
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('Outbox poller stopped');
    }
  }

  /**
   * Processes a batch of pending transactional outbox events.
   * Tolerates duplicates and gracefully catches errors per event.
   */
  async processPendingBatch(batchSize = 20): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;

    try {
      const events = await this.outboxService.getPendingEvents(batchSize);

      for (const event of events) {
        try {
          await this.outboxService.markProcessing(event.id);
          await this.jobProducer.dispatchOutboxEvent(event);
          await this.outboxService.markProcessed(event.id);
          processed++;
        } catch (error) {
          failed++;
          this.logger.error(
            `Failed processing outbox event ${event.id} [${event.eventType}]: ${(error as Error).message}`,
          );
          await this.outboxService.handleFailure(event.id, error as Error);
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, failed };
  }
}
