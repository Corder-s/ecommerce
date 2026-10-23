# GauShilp OS

> Secure, scalable, multi-tenant e-commerce SaaS platform for artisans, gaushalas, and traditional handmade-product sellers.

## Tech Stack

- **Backend:** NestJS, TypeScript, Node.js (v20+)
- **Database:** PostgreSQL with Prisma ORM
- **Cache & Queues:** Redis & BullMQ
- **Object Storage:** Cloudflare R2 / S3-compatible storage
- **CDN, DNS & WAF:** Cloudflare
- **Frontend:** Next.js (TypeScript, Tailwind CSS)
- **Package Manager:** pnpm

## Repository Structure

```text
gaushilp-os/
├── apps/
│   ├── api/            # NestJS Backend Application
│   └── web/            # Next.js Frontend Application
├── packages/
│   ├── shared-types/   # Shared TypeScript definitions
│   └── validation-schemas/ # Shared runtime validation schemas
├── prisma/             # Database schema, migrations, seed scripts
├── infrastructure/     # Deployment, monitoring, backup policies
├── docs/               # System & backend architecture documentation
├── .env.example        # Environment variable template
├── .gitignore
└── pnpm-workspace.yaml
```

## Getting Started (Backend API)

### 1. Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0

### 2. Environment Setup
```bash
cp .env.example apps/api/.env
```

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Running the API locally
```bash
# Start API in watch mode
pnpm run dev
# or
pnpm --filter @gaushilp/api start:dev
```

### 5. Verification Endpoints
- **Health Check:** `GET http://localhost:4000/api/v1/health`
- **Liveness Probe:** `GET http://localhost:4000/api/v1/health/liveness`
- **Readiness Probe:** `GET http://localhost:4000/api/v1/health/readiness`
- **OpenAPI Swagger UI:** `GET http://localhost:4000/api/v1/docs`

---

## Database Management (Prisma & PostgreSQL)

Configure `DATABASE_URL` in `.env` (copied from `.env.example`).

### 1. Validate Schema
```bash
pnpm prisma:validate
```

### 2. Generate Prisma Client
```bash
pnpm prisma:generate
```

### 3. Apply Migrations
```bash
# Development (creates and applies migrations)
pnpm prisma:migrate:dev

# Production / Staging (applies existing migrations)
pnpm prisma:migrate:deploy
```

### 4. Development Database Seeding
```bash
pnpm ts-node prisma/seed.ts
```

### 5. Prisma Studio (GUI Data Browser)
```bash
pnpm prisma:studio
```

---

## Authentication & Multi-Tenant Authorization (Step 3)

GauShilp OS backend integrates with identity providers using asymmetric OIDC / JWT with remote JWKS verification.

### Environment Configuration
When your identity provider (e.g., Auth0, Clerk, Cognito, Supabase) is selected, configure in `.env`:
```env
AUTH_PROVIDER=oidc
AUTH_ISSUER_URL=https://auth.example.com/
AUTH_AUDIENCE=gaushilp-api
AUTH_JWKS_URL=https://auth.example.com/.well-known/jwks.json
```

### Running Tests
```bash
# Run all unit tests (includes JWT cryptographic verification & tenant isolation guards)
pnpm test

# Run end-to-end API tests (includes auth, RBAC & cross-tenant rejection)
pnpm test:e2e
```

---

## Payments & SaaS Subscriptions (Step 8)

GauShilp OS enforces strict separation between two independent payment flows:

1. **Customer-to-Seller Payments**: Customers purchasing products through artisan storefronts.
   * `POST /api/v1/orders/:orderId/payments`: Initiate order payment session.
   * `GET /api/v1/orders/:orderId/payments`: Order payment history.
   * `POST /api/v1/payments/:paymentId/refunds`: Authorized full or partial refunds.
   * `POST /api/v1/webhooks/payments/:provider`: HMAC-SHA256 cryptographically verified webhook ingestion with replay defense.

2. **Seller-to-GauShilp SaaS Billing**: Store owners subscribing to GauShilp OS software plans.
   * `GET /api/v1/subscriptions/plans`: Catalog of tiers (Starter, Growth, Pro).
   * `GET /api/v1/subscriptions/current`: Current tier, renewal status, and quota usage.
   * `POST /api/v1/subscriptions/checkout`: Upgrade subscription tier.
   * `POST /api/v1/subscriptions/cancel`: Cancel subscription at period end or immediately.
   * `GET /api/v1/subscriptions/billing-history`: Past billing invoices.
   * `POST /api/v1/webhooks/subscriptions/:provider`: Signed subscription lifecycle webhooks.

---

## Shipping, Fulfilment & Order Tracking (Step 9)

GauShilp OS provides comprehensive, multi-tenant e-commerce fulfillment with carrier boundaries:

1. **Seller Fulfilment Operations**:
   * `GET /api/v1/shipping/orders/ready`: Retrieve eligible orders awaiting fulfilment.
   * `POST /api/v1/orders/:orderId/shipments`: Validate carrier acceptance rules, record package dimensions/weights, and issue carrier tracking numbers.
   * `GET /api/v1/orders/:orderId/shipments`: List order package shipments (multi-package support).
   * `GET /api/v1/shipments/:shipmentId`: Detailed shipment view with milestone history.
   * `PATCH /api/v1/shipments/:shipmentId/status`: Update status following strict state machine transitions.
   * `POST /api/v1/shipments/:shipmentId/dispatch`: Hand over package to carrier, advance order to `SHIPPED`, and fulfill inventory reservations.

2. **Customer Order Tracking (IDOR Protected)**:
   * `GET /api/v1/customers/me/orders/:orderId/tracking`: Public milestone tracking view strictly isolated to the customer who owns the order.

3. **Carrier Webhooks**:
   * `POST /api/v1/webhooks/shipping/:provider`: Ingestion of HMAC-SHA256 signed tracking webhooks with deduplication and terminal-status protection.

---

## Notifications, Background Jobs & Transactional Outbox (Step 10)

GauShilp OS features a resilient asynchronous processing architecture and multi-tenant notification system:

1. **In-App Notifications (IDOR Protected)**:
   * `GET /api/v1/notifications`: Paginated list of notifications strictly scoped to authenticated user (`unreadOnly`, `type` filters).
   * `GET /api/v1/notifications/unread-count`: Fast badge count of unread notifications.
   * `PATCH /api/v1/notifications/:notificationId/read`: Mark a single notification as read (returns 404 for non-owners).
   * `PATCH /api/v1/notifications/read-all`: Mark all unread notifications as read.

2. **Transactional Outbox Engine**:
   * Atomic persistence of domain events (`ORDER_CREATED`, `ORDER_CANCELLED`, `PAYMENT_SUCCEEDED`, `PAYMENT_FAILED`, `SHIPMENT_DISPATCHED`, `SHIPMENT_DELIVERED`, `SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_STATUS_CHANGED`) inside the business database transaction.
   * Business transactions never wait on external email or network providers.
   * Outbox failure tolerance guarantees committed orders or payments are never rolled back due to notification issues.

3. **Background Job Processor & Queue Reliability**:
   * Polling worker with configurable interval (`OUTBOX_POLL_INTERVAL_MS`).
   * Bounded retries with exponential backoff (`delayMs = Math.pow(2, retry) * 2000`).
   * Permanent failure and poison-pill handling via `DEAD_LETTER` status.
   * 60-second in-memory alert deduplication to prevent notification spam.

4. **Email Provider Boundary**:
   * Decoupled `IEmailProvider` interface supporting swappable adapters (`sandbox`, `sendgrid`, `resend`, `ses`).
   * In-memory `SandboxEmailProvider` for safe local testing and development without sending real external emails.

---

## Object Storage, Secure File Uploads & CDN (Step 11)

GauShilp OS provides a secure, provider-independent object storage integration with Cloudflare R2 (S3-compatible) and Cloudflare CDN:

1. **Object Storage Integration Boundary**:
   * Location: `src/integrations/object-storage/`
   * Interface: `IObjectStorageProvider` (`putObject`, `getObject`, `getPresignedUploadUrl`, `getPresignedDownloadUrl`, `deleteObject`, `headObject`, `isLiveVerified`).
   * Adapters:
     * `CloudflareR2Provider`: Live AWS S3 SDK (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) implementation.
     * `SandboxObjectStorageProvider`: In-memory simulated storage for local testing and CI when R2 credentials are not configured.

2. **Two-Phase Upload Security Lifecycle**:
   * `POST /api/v1/files/upload-intents`: Authenticate seller, validate role & tenant permissions, validate allowed MIME types (`image/jpeg`, `image/png`, `image/webp`) and size limits (<10MB), generate deterministic server-controlled key (`tenants/{tenantId}/{purpose}/{uuid}.{ext}`), issue 15-minute presigned PUT URL, create `StoredFile` in `PENDING` state.
   * Client uploads binary payload directly to Cloudflare R2 storage.
   * `POST /api/v1/files/:fileId/complete`: Inspects uploaded object, validates magic bytes and image buffer with `sharp`, extracts dimensions, checks aspect ratio, builds public CDN URL, transitions file to `VERIFIED`. Corrupt or executable files are rejected and purged.

3. **File Management Endpoints**:
   * `GET /api/v1/files/:fileId`: Inspect metadata. Generates short-lived presigned download URLs for `PRIVATE` documents.
   * `GET /api/v1/files`: Paginated file queries scoped to tenant and user.
   * `DELETE /api/v1/files/:fileId`: Active reference protection blocks deletion if the asset is still referenced in products or store branding.
   * `POST /api/v1/files/cleanup/abandoned`: Idempotent background job cleaning up expired or abandoned pending uploads.

4. **Environment Configuration**:
   ```env
   OBJECT_STORAGE_PROVIDER=sandbox    # 'sandbox' or 'r2'
   OBJECT_STORAGE_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
   OBJECT_STORAGE_REGION=auto
   OBJECT_STORAGE_BUCKET=gaushilp-media
   OBJECT_STORAGE_ACCESS_KEY_ID=your_r2_access_key_id
   OBJECT_STORAGE_SECRET_ACCESS_KEY=your_r2_secret_access_key
   PUBLIC_ASSETS_BASE_URL=https://media.gaushilp.example.com
   ```

---

## Super Admin APIs & Platform Analytics (Step 12)

Platform-level administration and operational intelligence for GauShilp OS:

1. **Super Admin Access Control**:
   * Restricted exclusively to `PlatformRole.SUPER_ADMIN` via `@UseGuards(JwtAuthGuard, PlatformRolesGuard)` and `@Roles(PlatformRole.SUPER_ADMIN)`.
   * Unauthenticated requests return `401 Unauthorized`; non-Super Admin users return `403 Forbidden`.
   * Standard user registration cannot grant `SUPER_ADMIN` privileges; self-promotion through normal APIs is strictly impossible.

2. **Tenant Administration (`/api/v1/admin/tenants`)**:
   * `GET /api/v1/admin/tenants`: Paginated tenant listing with status and keyword filters.
   * `GET /api/v1/admin/tenants/:tenantId`: Detailed tenant profile, staff memberships, active subscription, and collected revenue metrics.
   * `PATCH /api/v1/admin/tenants/:tenantId/status`: Suspend or reactivate stores. Suspension is strictly enforced by `TenantAccessGuard` across all store APIs (data preserved, zero deletion).

3. **Platform User Management (`/api/v1/admin/users`)**:
   * `GET /api/v1/admin/users`: Paginated platform user list; sensitive credentials and tokens strictly scrubbed.
   * `GET /api/v1/admin/users/:userId`: User profile details, store memberships, and order activity stats.
   * `PATCH /api/v1/admin/users/:userId/status`: Account suspension and reactivation.
     * **Self-Lockout Protection**: Super Admins cannot suspend their own account (`400 Bad Request`).
     * **Peer Admin Protection**: Super Admins cannot suspend other Super Admins (`403 Forbidden`).
     * **Suspension Enforcement**: Suspended users are blocked by `JwtAuthGuard` from all APIs (`403 Forbidden`).

4. **SaaS Subscription Administration (`/api/v1/admin/subscriptions`)**:
   * `GET /api/v1/admin/subscriptions`: Paginated subscription listing with status and plan filters.
   * `GET /api/v1/admin/subscriptions/:subscriptionId`: Detailed subscription view with invoice history.
   * `GET /api/v1/admin/subscription-summary`: Aggregated metrics (active subscriptions, plan distribution, MRR, ARR, paid invoice revenue).

5. **Platform Analytics (`/api/v1/admin/analytics`)**:
   * `GET /api/v1/admin/analytics/overview`: Platform-wide KPI dashboard (tenants, stores, orders, gross order value, collected revenue, net revenue, MRR, dead-letter jobs).
   * `GET /api/v1/admin/analytics/tenants`: Tenant registration trends over time.
   * `GET /api/v1/admin/analytics/orders`: Order counts, gross order value, and daily distribution.
   * `GET /api/v1/admin/analytics/subscriptions`: Subscription counts grouped by plan and recurring revenue.
   * `GET /api/v1/admin/analytics/payments`: Payment attempts, collected revenue, refunds, and failure rates.
   * **Database Aggregation**: All calculations use database-level aggregates (`_sum`, `_avg`, `_count`). No loading of orders into application memory. Maximum 365-day query window.

6. **System Health (`/api/v1/admin/health`)**:
   * `GET /api/v1/admin/health`: Operational runtime telemetry (memory usage, node uptime, node version).
   * `GET /api/v1/admin/health/database`: Isolated PostgreSQL ping probe (`SELECT 1`) with 3000ms timeout.
   * `GET /api/v1/admin/health/queues`: Transactional outbox queue and dead-letter event health.
   * **Zero Leakage**: Connection strings, passwords, and environment secrets are never exposed.

7. **Platform Audit Logging (`/api/v1/admin/audit-logs`)**:
   * `GET /api/v1/admin/audit-logs`: Paginated audit log retrieval with filters by action, actor, target, and date range.
   * Append-only database table (`audit_logs`) tracking actor ID, action, target, timestamp, reason, IP, and user-agent.
   * Metadata is automatically sanitized to scrub passwords, tokens, API keys, or financial credentials.

---

## Performance, Caching & Load Testing (Step 13)

GauShilp OS includes production-grade caching, compound query indexes, and load-tested stateless node support:

1. **Selective Redis Caching**:
   * Caches safe, high-traffic read operations: public store profiles (`300s TTL`), product listings (`120s TTL`), category summaries (`600s TTL`), and subscription plans (`1800s TTL`).
   * **Tenant Isolation**: Keys strictly namespaced: `gaushilp:v1:t:{tenantId}:...`. Keys of one tenant can never be returned to another tenant.
   * **Sensitive Exclusion**: Customer profiles, delivery addresses, shopping carts, orders, payment details, and audit logs are strictly **never** cached.
   * **Cache Invalidation**: Mutations (product create/update/delete, store update/publish/unpublish, category update, order stock changes) atomically invalidate matching keys via non-blocking Redis `SCAN` streams.

2. **Authoritative Consistency & Safe Failover**:
   * PostgreSQL is the absolute single source of truth.
   * Checkout validation, inventory reservation, and payment processing bypass cache and validate current database state with atomic row-level locks.
   * If Redis is unreachable or times out (1500ms command timeout), the system degrades gracefully and fetches authoritative data from PostgreSQL without 500 errors.

3. **Compound Database Indexes (Migration 11)**:
   * `Product`: `@@index([tenantId, status, createdAt])`, `@@index([tenantId, categoryId, status])`
   * `Order`: `@@index([tenantId, createdAt])`, `@@index([userId, createdAt])`, `@@index([tenantId, status, createdAt])`
   * `PaymentRecord`: `@@index([tenantId, status])`, `@@index([createdAt, status])`
   * `RefundRecord`: `@@index([tenantId, status])`, `@@index([createdAt, status])`

4. **Running Load Tests**:
   ```bash
   # Run all 4 load profiles (Smoke 5 VUs, Baseline 25 VUs, Moderate 50 VUs, High 100 VUs)
   pnpm load-test

   # Run cache integration and fallback verification
   pnpm --filter @gaushilp/api test:e2e test/cache-performance.e2e-spec.ts
   ```

---

## Daily Backups, Disaster Recovery & Security Audit (Step 14)

GauShilp OS implements enterprise-grade application security hardening, automated daily PostgreSQL backups, and non-destructive disaster recovery procedures:

1. **Security Hardening**:
   * **Mandatory Security Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 0`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
   * **Server Fingerprint Removal**: `x-powered-by` disabled on the Express server instance.
   * **Rate Limiting Protection**: Distributed `@RateLimit()` decorator and `RateLimitGuard` using Redis / in-memory cache returning `X-RateLimit-*` and `Retry-After` headers on sensitive and administrative endpoints.
   * **CORS Hardening**: Strict origin whitelist validation in production against `CORS_ORIGINS`.
   * **IDOR & Multi-Tenant Isolation**: Query-level tenant scoping, verified provider subject (`sub`) identity resolution, and privilege escalation prevention.
   * **Cryptographic Webhooks**: HMAC-SHA256 signature verification and idempotency deduplication on customer payment and SaaS subscription webhooks.

2. **Automated Daily Database Backups**:
   * **Schedule**: Automated daily backups scheduled at 02:00 UTC (`0 2 * * *`).
   * **Cryptographic Pipeline**: AES-256-GCM envelope encryption with unique 96-bit random IVs and 128-bit authentication tags.
   * **Integrity Checksums**: 256-bit unencrypted SHA-256 hashes computed on the plain dump buffer and stored in durable JSON manifests.
   * **Storage Separation**: Stored in a dedicated, isolated bucket (`BACKUP_STORAGE_BUCKET`) using distinct IAM credentials separate from media storage.
   * **Manifest Durability**: Manifests written directly to the backup storage provider (`backups/manifests/{backupId}.json`), ensuring discovery even after complete PostgreSQL loss.

3. **Retention & Last-Backup Protection**:
   * Backups older than 30 days are automatically pruned.
   * The pruning algorithm guarantees that the single latest verified backup is **never deleted**, even if past retention date.

4. **Disaster Recovery & Isolated Restore Drills**:
   * Complete recovery procedures documented in [`docs/backup-recovery.md`](docs/backup-recovery.md) for Scenarios A–E.
   * Recovery Point Objective (RPO): ≤ 24 hours (point-in-time recovery target < 5 minutes).
   * Recovery Time Objective (RTO): 4–8 hours target (isolated drills execute in < 400ms).
   * Non-destructive restore drills test decryption, checksum verification, table schema compatibility, and record counts without touching production data.

5. **Backup & Restore Commands**:
   ```bash
   # Run automated daily database backup and envelope encryption
   pnpm backup:db

   # Execute non-destructive isolated restore drill
   pnpm restore:drill

   # Run Step 14 end-to-end security and backup test suites
   pnpm --filter @gaushilp/api test:e2e test/security-audit.e2e-spec.ts test/backup-disaster-recovery.e2e-spec.ts
   ```

6. **Super Admin Backup Management APIs (`/api/v1/admin/backups`)**:
   * `GET /api/v1/admin/backups`: List all backup manifests and verification statuses.
   * `GET /api/v1/admin/backups/status`: Telemetry on backup age, RPO compliance, and destination health.
   * `POST /api/v1/admin/backups/trigger`: Trigger on-demand encrypted backup (rate-limited).
   * `POST /api/v1/admin/backups/:backupId/verify`: Verify AES-256-GCM authentication and SHA-256 checksum.
   * `POST /api/v1/admin/backups/:backupId/restore-drill`: Execute isolated test restoration drill.
   * `POST /api/v1/admin/backups/prune`: Trigger 30-day retention enforcement with last-backup protection.
