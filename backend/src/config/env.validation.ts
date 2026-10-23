import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('api/v1'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  // Database (PostgreSQL)
  DATABASE_URL: z.string().url().optional(),

  // Authentication (OIDC / JWT)
  AUTH_PROVIDER: z.string().default('oidc'),
  AUTH_ISSUER_URL: z.string().url().optional(),
  AUTH_AUDIENCE: z.string().optional(),
  AUTH_JWKS_URL: z.string().url().optional(),

  // JWT / Auth fallback
  JWT_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // Redis & Queue - Optional integration
  REDIS_URL: z.string().url().optional(),

  // Cloudflare R2 / Object Storage Integration (Step 11)
  OBJECT_STORAGE_PROVIDER: z.string().default('sandbox'),
  OBJECT_STORAGE_ENDPOINT: z.string().url().optional(),
  OBJECT_STORAGE_REGION: z.string().default('auto'),
  OBJECT_STORAGE_BUCKET: z.string().default('gaushilp-media'),
  OBJECT_STORAGE_ACCESS_KEY_ID: z.string().optional(),
  OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  PUBLIC_ASSETS_BASE_URL: z.string().url().default('https://media.gaushilp.example.com'),
  STORAGE_UPLOAD_URL_EXPIRATION_SECONDS: z.coerce.number().int().positive().default(900),
  STORAGE_DOWNLOAD_URL_EXPIRATION_SECONDS: z.coerce.number().int().positive().default(300),

  // Legacy/Alternate R2 env variables
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_PUBLIC: z.string().optional(),
  R2_BUCKET_PRIVATE: z.string().optional(),
  MEDIA_PUBLIC_DOMAIN: z.string().url().optional(),

  // Step 8: Customer Payments Integration
  PAYMENT_PROVIDER: z.string().default('sandbox'),
  PAYMENT_API_KEY: z.string().optional(),
  PAYMENT_API_SECRET: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().default('sandbox_payment_webhook_secret'),

  // Step 8: SaaS Subscription Billing Integration
  SUBSCRIPTION_PROVIDER: z.string().default('sandbox'),
  SUBSCRIPTION_API_KEY: z.string().optional(),
  SUBSCRIPTION_API_SECRET: z.string().optional(),
  SUBSCRIPTION_WEBHOOK_SECRET: z.string().default('sandbox_subscription_webhook_secret'),

  // Step 9: Shipping & Fulfilment Integration
  SHIPPING_PROVIDER: z.string().default('sandbox'),
  SHIPPING_API_KEY: z.string().optional(),
  SHIPPING_API_SECRET: z.string().optional(),
  SHIPPING_WEBHOOK_SECRET: z.string().default('sandbox_shipping_webhook_secret'),

  // Step 10: Notifications & Background Jobs Integration
  EMAIL_PROVIDER: z.string().default('sandbox'),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('notifications@gaushilp.com'),
  EMAIL_FROM_NAME: z.string().default('GauShilp OS'),
  QUEUE_MAX_RETRIES: z.coerce.number().int().positive().default(5),
  QUEUE_BACKOFF_DELAY_MS: z.coerce.number().int().positive().default(1000),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),

  // Step 14: Daily Backups & Disaster Recovery Integration
  BACKUP_STORAGE_PROVIDER: z.string().default('sandbox'),
  BACKUP_STORAGE_BUCKET: z.string().default('gaushilp-backups-dr'),
  BACKUP_STORAGE_ENDPOINT: z.string().url().optional(),
  BACKUP_STORAGE_REGION: z.string().default('auto'),
  BACKUP_STORAGE_ACCESS_KEY_ID: z.string().optional(),
  BACKUP_STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  BACKUP_ENCRYPTION_KEY: z
    .string()
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  BACKUP_SCHEDULE_CRON: z.string().default('0 2 * * *'),
  BACKUP_ALERT_EMAIL: z.string().email().default('devops-alerts@gaushilp.com'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables at application startup.
 * Throws a formatted, explicit error without leaking secret values.
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formattedErrors = result.error.errors
      .map((err) => `  - [${err.path.join('.')}]: ${err.message}`)
      .join('\n');

    throw new Error(
      `\n❌ Environment variable validation failed:\n${formattedErrors}\n\nPlease check your .env file against .env.example.\n`,
    );
  }

  return result.data;
}
