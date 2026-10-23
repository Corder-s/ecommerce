import { EnvConfig } from './env.validation';

export default () => {
  const env = process.env as unknown as EnvConfig;

  return {
    environment: env.NODE_ENV || 'development',
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',
    port: Number(env.PORT) || 4000,
    apiPrefix: env.API_PREFIX || 'api/v1',
    corsOrigins: (env.CORS_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    database: {
      url: env.DATABASE_URL,
    },
    auth: {
      provider: env.AUTH_PROVIDER || 'oidc',
      issuerUrl: env.AUTH_ISSUER_URL,
      audience: env.AUTH_AUDIENCE,
      jwksUrl: env.AUTH_JWKS_URL,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN || '1d',
    },
    redis: {
      url: env.REDIS_URL,
    },
    storage: {
      provider: env.OBJECT_STORAGE_PROVIDER || 'sandbox',
      endpoint:
        env.OBJECT_STORAGE_ENDPOINT ||
        (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined),
      region: env.OBJECT_STORAGE_REGION || 'auto',
      bucket: env.OBJECT_STORAGE_BUCKET || env.R2_BUCKET_PUBLIC || 'gaushilp-media',
      accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY,
      publicAssetsBaseUrl:
        env.PUBLIC_ASSETS_BASE_URL ||
        env.MEDIA_PUBLIC_DOMAIN ||
        'https://media.gaushilp.example.com',
      uploadExpirationSeconds: Number(env.STORAGE_UPLOAD_URL_EXPIRATION_SECONDS) || 900,
      downloadExpirationSeconds: Number(env.STORAGE_DOWNLOAD_URL_EXPIRATION_SECONDS) || 300,
      // Legacy fields
      accountId: env.R2_ACCOUNT_ID,
      bucketPublic: env.R2_BUCKET_PUBLIC,
      bucketPrivate: env.R2_BUCKET_PRIVATE,
      mediaPublicDomain: env.MEDIA_PUBLIC_DOMAIN,
    },
    payments: {
      provider: env.PAYMENT_PROVIDER || 'sandbox',
      apiKey: env.PAYMENT_API_KEY,
      apiSecret: env.PAYMENT_API_SECRET,
      webhookSecret: env.PAYMENT_WEBHOOK_SECRET || 'sandbox_payment_webhook_secret',
    },
    subscriptions: {
      provider: env.SUBSCRIPTION_PROVIDER || 'sandbox',
      apiKey: env.SUBSCRIPTION_API_KEY,
      apiSecret: env.SUBSCRIPTION_API_SECRET,
      webhookSecret: env.SUBSCRIPTION_WEBHOOK_SECRET || 'sandbox_subscription_webhook_secret',
    },
    shipping: {
      provider: env.SHIPPING_PROVIDER || 'sandbox',
      apiKey: env.SHIPPING_API_KEY,
      apiSecret: env.SHIPPING_API_SECRET,
      webhookSecret: env.SHIPPING_WEBHOOK_SECRET || 'sandbox_shipping_webhook_secret',
    },
    email: {
      provider: env.EMAIL_PROVIDER || 'sandbox',
      apiKey: env.EMAIL_API_KEY,
      from: env.EMAIL_FROM || 'notifications@gaushilp.com',
      fromName: env.EMAIL_FROM_NAME || 'GauShilp OS',
    },
    jobs: {
      maxRetries: Number(env.QUEUE_MAX_RETRIES) || 5,
      backoffDelayMs: Number(env.QUEUE_BACKOFF_DELAY_MS) || 1000,
      outboxPollIntervalMs: Number(env.OUTBOX_POLL_INTERVAL_MS) || 5000,
    },
    backup: {
      provider: env.BACKUP_STORAGE_PROVIDER || 'sandbox',
      bucket: env.BACKUP_STORAGE_BUCKET || 'gaushilp-backups-dr',
      endpoint: env.BACKUP_STORAGE_ENDPOINT,
      region: env.BACKUP_STORAGE_REGION || 'auto',
      accessKeyId: env.BACKUP_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.BACKUP_STORAGE_SECRET_ACCESS_KEY,
      encryptionKey:
        env.BACKUP_ENCRYPTION_KEY ||
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      retentionDays: Number(env.BACKUP_RETENTION_DAYS) || 30,
      scheduleCron: env.BACKUP_SCHEDULE_CRON || '0 2 * * *',
      alertEmail: env.BACKUP_ALERT_EMAIL || 'devops-alerts@gaushilp.com',
    },
  };
};
