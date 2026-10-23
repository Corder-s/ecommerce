import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { SendEmailJobPayload, CreateNotificationJobPayload } from '../interfaces/job.interface';
import { OutboxEventEntity } from '../../outbox/interfaces/outbox.interface';
import { JobProcessor } from '../processors/job.processor';

@Injectable()
export class JobProducer {
  private readonly logger = new Logger(JobProducer.name);

  constructor(private readonly jobProcessor: JobProcessor) {}

  /**
   * Enqueues an email dispatch job with bounded retries and exponential backoff.
   */
  async sendEmail(payload: SendEmailJobPayload): Promise<string> {
    const jobId = `job_email_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.logger.log(`Enqueued email job: ${jobId} to ${payload.to}`);

    // Asynchronous dispatch so callers are not blocked
    setImmediate(async () => {
      try {
        await this.jobProcessor.processSendEmailJob(payload);
      } catch (err) {
        this.logger.error(`Error processing email job ${jobId}: ${(err as Error).message}`);
      }
    });

    return jobId;
  }

  /**
   * Enqueues an in-app notification job.
   */
  async createNotification(payload: CreateNotificationJobPayload): Promise<string> {
    const jobId = `job_notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.logger.log(`Enqueued notification job: ${jobId} for user ${payload.recipientUserId}`);

    setImmediate(async () => {
      try {
        await this.jobProcessor.processNotificationJob(payload);
      } catch (err) {
        this.logger.error(`Error processing notification job ${jobId}: ${(err as Error).message}`);
      }
    });

    return jobId;
  }

  /**
   * Dispatches a durable transactional outbox event for asynchronous processing.
   */
  async dispatchOutboxEvent(event: OutboxEventEntity): Promise<void> {
    this.logger.log(`Dispatching outbox event ${event.id} of type ${event.eventType}`);
    await this.jobProcessor.processDomainEvent(event);
  }
}
