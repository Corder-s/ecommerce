import { NotificationType } from '@prisma/client';

export enum JobType {
  SEND_EMAIL = 'SEND_EMAIL',
  CREATE_NOTIFICATION = 'CREATE_NOTIFICATION',
  PROCESS_OUTBOX_EVENT = 'PROCESS_OUTBOX_EVENT',
}

export interface SendEmailJobPayload {
  to: string;
  recipientName?: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface CreateNotificationJobPayload {
  recipientUserId: string;
  tenantId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface JobExecutionResult {
  jobId: string;
  success: boolean;
  timestamp: Date;
  error?: string;
}

export interface JobOptions {
  attempts?: number;
  backoffDelayMs?: number;
  timeoutMs?: number;
}
