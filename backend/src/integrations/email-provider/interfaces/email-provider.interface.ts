export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailInput {
  to: string | EmailRecipient;
  recipientName?: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  provider: string;
  timestamp: Date;
  error?: string;
}

export interface IEmailProvider {
  readonly providerName: string;
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}
