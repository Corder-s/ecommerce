import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IEmailProvider,
  SendEmailInput,
  SendEmailResult,
} from './interfaces/email-provider.interface';

@Injectable()
export class SandboxEmailProvider implements IEmailProvider {
  readonly providerName = 'sandbox';
  private readonly logger = new Logger(SandboxEmailProvider.name);

  private readonly sentEmails: Array<SendEmailInput & { messageId: string; timestamp: Date }> = [];
  private transientFailureCount = 0;

  /**
   * Simulates sending an email via the sandbox provider.
   * Differentiates transient failures (network/provider timeout) from permanent failures (invalid email syntax).
   */
  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const toAddress = typeof input.to === 'string' ? input.to : input.to?.email;

    // 1. Permanent failure check: Invalid recipient email format
    if (!toAddress || !toAddress.includes('@') || !toAddress.includes('.')) {
      this.logger.error(`Permanent failure: Invalid recipient email address "${toAddress}"`);
      throw new BadRequestException(
        `Permanent failure: Invalid email recipient address "${toAddress}".`,
      );
    }

    // 2. Simulated transient failure for retry & backoff testing
    if (this.transientFailureCount > 0) {
      this.transientFailureCount--;
      this.logger.warn(
        `Simulated transient email provider error. Remaining simulated failures: ${this.transientFailureCount}`,
      );
      throw new Error('Transient provider error: 503 Service Unavailable / Gateway Timeout');
    }

    const messageId = `msg_sbx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date();

    this.sentEmails.push({
      ...input,
      messageId,
      timestamp,
    });

    this.logger.log(
      `[SandboxEmail] Delivered email "${input.subject}" to ${this.sanitizeEmail(toAddress)} (Message ID: ${messageId})`,
    );

    return {
      success: true,
      messageId,
      provider: this.providerName,
      timestamp,
    };
  }

  /**
   * Diagnostic method to inspect sent emails in test suites.
   */
  getSentEmails(): Array<SendEmailInput & { messageId: string; timestamp: Date }> {
    return [...this.sentEmails];
  }

  /**
   * Clears sent email history between test runs.
   */
  clearSentEmails(): void {
    this.sentEmails.length = 0;
    this.transientFailureCount = 0;
  }

  /**
   * Simulates transient email provider outages for testing retry and backoff behavior.
   */
  simulateTransientFailure(times = 1): void {
    this.transientFailureCount = times;
  }

  private sanitizeEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***';
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name.substring(0, 2)}***` : '***';
    return `${maskedName}@${domain}`;
  }
}
