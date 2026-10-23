# GauShilp OS — Production Deployment & Infrastructure Guide

**Step:** 14 (Security Audit, Daily Backups and Disaster Recovery)  
**Target:** Production Multi-Tenant Cloud Architecture  
**Status:** Validated  
**Date:** October 2026  

---

## 1. Production Architecture Overview

GauShilp OS is designed for deployment on modern containerized cloud platforms (AWS ECS / EKS, GCP Cloud Run / GKE, DigitalOcean App Platform, or self-hosted Docker Swarm / Kubernetes).

```mermaid
flowchart TD
    Client[Web & Mobile Clients]
    CF[Cloudflare CDN & WAF]
    ALB[Application Load Balancer]
    API1[API Instance 1 - NestJS]
    API2[API Instance 2 - NestJS]
    Redis[(Redis Cluster / Caching)]
    PG[(Managed PostgreSQL 15+)]
    R2_Media[(Cloudflare R2 Media Bucket)]
    R2_Backup[(Cloudflare R2 / S3 Isolated Backup Bucket)]

    Client -->|HTTPS / Port 443| CF
    CF -->|Filtered Traffic| ALB
    CF -->|Static Assets| R2_Media
    ALB --> API1
    ALB --> API2
    API1 --> Redis
    API2 --> Redis
    API1 --> PG
    API2 --> PG
    API1 -.->|Presigned PUT/GET| R2_Media
    API1 -->|Daily Encrypted Backup| R2_Backup
```

---

## 2. Infrastructure Prerequisites

| Component | Minimum Specification | Recommended Production Spec |
| :--- | :--- | :--- |
| **Node.js Runtime** | Node.js v20.x LTS | Node.js v20.x LTS (Containerized) |
| **PostgreSQL** | PostgreSQL 15+ (1 vCPU, 2GB RAM) | Managed PostgreSQL (HA, 2+ vCPUs, 8GB RAM, Read Replicas) |
| **Redis** | Redis 6.x+ (Single node, 512MB RAM) | Redis 7.x+ Cluster / Managed Sentinel (2GB+ RAM) |
| **Primary Media Storage** | S3-Compatible / Cloudflare R2 | Cloudflare R2 with Custom Domain & CDN |
| **Backup Storage** | Independent Cloud Bucket | Cloudflare R2 / AWS S3 with Separate Account & Retention Lock |

---

## 3. Environment Configuration Checklist

Create a production `.env` file or populate your container secrets store with the following variables:

```bash
# Core Environment
NODE_ENV=production
PORT=4000
API_PREFIX=api/v1
CORS_ORIGINS=https://app.gaushilp.com,https://seller.gaushilp.com,https://admin.gaushilp.com

# PostgreSQL Database
DATABASE_URL="postgresql://gaushilp_prod_user:StrongPassword@postgres-cluster.internal:5432/gaushilp_db?schema=public&connection_limit=30&pool_timeout=15"

# Authentication (OIDC / Identity Provider)
AUTH_PROVIDER=oidc
AUTH_ISSUER_URL=https://auth.gaushilp.com/
AUTH_AUDIENCE=gaushilp-api
AUTH_JWKS_URL=https://auth.gaushilp.com/.well-known/jwks.json

# Redis Caching
REDIS_URL="redis://:RedisAuthSecret@redis-cluster.internal:6379"
CACHE_ENABLED=true
CACHE_DEFAULT_TTL_SECONDS=300

# Cloudflare R2 Media Storage (Primary Assets)
OBJECT_STORAGE_PROVIDER=r2
OBJECT_STORAGE_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_BUCKET=gaushilp-media-prod
OBJECT_STORAGE_ACCESS_KEY_ID=r2_media_access_key
OBJECT_STORAGE_SECRET_ACCESS_KEY=r2_media_secret_key
PUBLIC_ASSETS_BASE_URL=https://media.gaushilp.com
STORAGE_UPLOAD_URL_EXPIRATION_SECONDS=900
STORAGE_DOWNLOAD_URL_EXPIRATION_SECONDS=300

# Daily Backups & Disaster Recovery (Step 14)
BACKUP_STORAGE_PROVIDER=s3
BACKUP_STORAGE_BUCKET=gaushilp-backups-dr-isolated
BACKUP_STORAGE_ENDPOINT=https://<backup_account_id>.r2.cloudflarestorage.com
BACKUP_STORAGE_REGION=auto
BACKUP_STORAGE_ACCESS_KEY_ID=isolated_backup_access_key
BACKUP_STORAGE_SECRET_ACCESS_KEY=isolated_backup_secret_key
BACKUP_ENCRYPTION_KEY=your_secure_256_bit_aes_key_minimum_32_characters
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE_CRON="0 2 * * *"
BACKUP_ALERT_EMAIL=devops-alerts@gaushilp.com

# Payment & Subscription Integrations
PAYMENT_PROVIDER=razorpay
PAYMENT_API_KEY=rzp_live_key
PAYMENT_API_SECRET=rzp_live_secret
PAYMENT_WEBHOOK_SECRET=rzp_webhook_secret

SUBSCRIPTION_PROVIDER=razorpay
SUBSCRIPTION_API_KEY=rzp_sub_key
SUBSCRIPTION_API_SECRET=rzp_sub_secret
SUBSCRIPTION_WEBHOOK_SECRET=rzp_sub_webhook_secret

# Shipping Integrations
SHIPPING_PROVIDER=delhivery
SHIPPING_API_KEY=delhivery_live_key
SHIPPING_API_SECRET=delhivery_live_secret
SHIPPING_WEBHOOK_SECRET=delhivery_webhook_secret

# Email & Notifications
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_live_key
EMAIL_FROM=notifications@gaushilp.com
EMAIL_FROM_NAME="GauShilp OS"
```

---

## 4. Database Setup & Migrations

1. **Apply Migrations to Target Database**:
   ```bash
   pnpm prisma:migrate:deploy
   ```
2. **Validate Schema Consistency**:
   ```bash
   pnpm prisma:validate
   ```
3. **Verify Indexes**:
   Verify that all performance indexes (foreign keys, tenant composites, order status composites, search indexes) from Step 13 are created.

---

## 5. Automated Daily Backup Setup

### Option A: Kubernetes CronJob
Deploy a scheduled CronJob using the application container:
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: gaushilp-daily-backup
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 14
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup-runner
              image: gaushilp/api:latest
              command: ["node", "dist/src/scripts/backup-db.js"]
              envFrom:
                - secretRef:
                    name: gaushilp-secrets
```

### Option B: Systemd Timer / Crontab on Worker Host
```bash
# Add to crontab on isolated worker instance:
0 2 * * * cd /opt/gaushilp && /usr/bin/pnpm backup:db >> /var/log/gaushilp-backup.log 2>&1
```

---

## 6. Security Hardening Checklist

* [x] **Disable Server Fingerprint**: `x-powered-by` disabled on Express engine.
* [x] **Enforce HTTPS & HSTS**: `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
* [x] **Strict Content-Type Options**: `X-Content-Type-Options: nosniff`.
* [x] **Clickjacking Defense**: `X-Frame-Options: SAMEORIGIN`.
* [x] **CORS Origin Whitelist**: Whitelist strictly validated in production against `CORS_ORIGINS`.
* [x] **Distributed Rate Limiting**: Active on auth, admin, and backup endpoints (`@RateLimit`).
* [x] **Cryptographic Webhook Signatures**: HMAC-SHA256 signature enforcement on payments and shipments.
* [x] **Separate Backup Credentials**: Independent bucket and IAM credentials for recovery storage.
* [x] **Envelope Encryption**: AES-256-GCM encryption with SHA-256 checksums on all database backups.
* [x] **Isolated Restore Drills**: Tested using `pnpm restore:drill`.

---

## 7. Incident Response & Monitoring

* **Liveness & Readiness**: Query `/api/v1/health` for load balancer probes.
* **Database Ping**: Query `/api/v1/admin/health/database` (Super Admin restricted).
* **Backup RPO Status**: Query `/api/v1/admin/backups/status` to confirm that the latest backup is ≤ 24 hours old.
* **Operator Alerts**: Dispatched automatically to `devops-alerts@gaushilp.com` upon backup or integrity failures.
