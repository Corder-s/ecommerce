# GauShilp OS — Backend Architecture & System Design

**Version:** 1.0 (Step 11: Cloudflare R2, Secure File Uploads and CDN)  
**Framework:** NestJS (TypeScript, Node.js v20+)  
**Database:** PostgreSQL 16+ via Prisma ORM  
**Cache & Queue:** Redis 7+ & BullMQ  
**Object Storage:** Cloudflare R2 (S3-compatible API)  
**Edge Delivery:** Cloudflare CDN & WAF  

---

## 1. High-Level Architecture Overview

GauShilp OS backend is structured as a modular monolith adhering to Clean Architecture principles, strict multi-tenant boundaries, and asynchronous event-driven guarantees.

```
                                  +-----------------------+
                                  |     Cloudflare CDN    |
                                  |  (WAF / Edge Assets)  |
                                  +-----------+-----------+
                                              |
                   Public Media Delivery      | Requests
                                              v
      +-----------------------------+   +-------------------------------+
      |    Cloudflare R2 Bucket     |   |    NestJS Application API     |
      |   (Encrypted Object Store)  |   |    (Global Guards, Filters)   |
      +-----------------------------+   +---------------+---------------+
             ^                     ^                    |
             | Direct PUT          | S3 SDK             | Prisma ORM
             | Presigned           | Head / Delete      v
      +------+------+       +------+------+     +-------------------------------+
      | Client/App  |       | Files Module|     |    PostgreSQL Database        |
      | (Store/Web) |       | (Validation)|     |  (Multi-Tenant Scoped Schema) |
      +-------------+       +-------------+     +---------------+---------------+
                                                                | Outbox Events
                                                                v
                                                        +-------------------------------+
                                                        |   Redis & Background Jobs     |
                                                        |   (Outbox Worker, Mailer)     |
                                                        +-------------------------------+
```

---

## 2. Core Architectural Principles

1. **Strict Multi-Tenant Isolation**:
   * Data isolation enforced at database and application level via `tenantId`.
   * Tenant context extracted and cryptographically validated via `TenantGuard` and `TenantInterceptor`.
   * Cross-tenant references are strictly prohibited across products, stores, files, and orders.

2. **Provider-Independent Storage & Infrastructure Boundaries**:
   * Cloudflare R2 operations are completely encapsulated within `src/integrations/object-storage/`.
   * The core application relies on the abstract interface `IObjectStorageProvider`.
   * Zero vendor lock-in: supports swapping to AWS S3, MinIO, or Google Cloud Storage without modifying business modules.
   * `SandboxObjectStorageProvider` provides an in-memory simulation for test environments where live credentials are not provisioned.

3. **Secure Two-Phase Upload Pattern**:
   * Phase 1 (Intent): Authenticated user requests permission. Server validates permissions, MIME type (`image/jpeg`, `image/png`, `image/webp`), and file size (<10MB). Server issues a deterministic key and 15-minute presigned PUT URL.
   * Phase 2 (Direct Upload): Browser/client uploads binary directly to Cloudflare R2. API servers do not handle multipart payload streaming.
   * Phase 3 (Verification): Client signals completion. Server inspects object via `headObject`, reads binary, checks magic bytes (`FF D8 FF`, `89 50 4E 47`, `RIFF...WEBP`), validates image decoding with `Sharp`, computes public CDN URL, and transitions file to `VERIFIED`.

4. **Public vs. Private File Separation**:
   * Public assets (product images, store logos, store banners):
     - Published via Cloudflare CDN using `PUBLIC_ASSETS_BASE_URL`.
     - Immutable paths using UUIDs: `tenants/{tenantId}/{purpose}/{uuid}.{ext}`.
     - HTTP caching with long `max-age` headers at the edge.
   * Private assets (business documents, export receipts, compliance proofs):
     - Kept strictly private within the bucket.
     - Never exposed via public CDN URL.
     - Authorized users receive short-lived (15 min) presigned `GET` download URLs via `GET /api/v1/files/:fileId`.

5. **Active Reference Integrity**:
   * File deletion requests are validated against active database usages (`Product.images` and `Tenant.logoUrl`/`bannerUrl`).
   * Actively referenced files cannot be deleted, returning `409 Conflict` until detached.

---

## 3. Directory & Module Structure

```text
apps/api/src/
├── common/
│   ├── decorators/         # @CurrentUser, @TenantContext, @Roles
│   ├── guards/             # JwtAuthGuard, RolesGuard, TenantGuard
│   ├── interceptors/       # LoggingInterceptor, TenantInterceptor
│   └── prisma/             # PrismaModule & PrismaService
├── config/                 # Typed configuration & Joi environment validation
├── integrations/
│   ├── email/              # IEmailProvider & SandboxEmailProvider
│   └── object-storage/     # Cloudflare R2 Provider & Sandbox Storage Provider
├── modules/
│   ├── admin/              # Super Admin platform oversight
│   ├── auth/               # OIDC JWT authentication & JWKS verification
│   ├── cart/               # Customer shopping cart & item totals
│   ├── checkout/           # Multi-item checkout & stock reservation
│   ├── customers/          # Customer profiles & delivery addresses
│   ├── files/              # Upload intents, Sharp validation, StoredFiles
│   ├── notifications/      # In-app notifications & transactional outbox
│   ├── orders/             # Order state machine & transactional inventory
│   ├── payments/           # Customer payments & SaaS subscription billing
│   ├── products/           # Tenant product catalog & inventory
│   ├── shipping/           # Fulfilment, packages & carrier tracking
│   ├── stores/             # Tenant store settings, branding & logos
│   └── wishlist/           # Customer wishlist management
└── main.ts                 # Bootstrap with global validation pipes & filters
```

---

## 4. Object Storage & CDN Architecture

### Cloudflare R2 Configuration
* **Endpoint format:** `https://<account_id>.r2.cloudflarestorage.com`
* **Region:** `auto`
* **API Compatibility:** S3-compatible API using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
* **Zero Egress Fees:** Cloudflare R2 eliminates bandwidth egress charges for asset delivery.

### Cloudflare CDN Caching & Delivery
* **Custom Asset Domain:** `media.gaushilp.com` mapped directly to R2 bucket.
* **Cache Strategy:**
  * Object keys contain cryptographically random UUIDs (`tenants/.../{uuid}.webp`), ensuring immutability.
  * Browser & Edge Cache-Control: `public, max-age=31536000, immutable`.
  * Cache Invalidation: Because assets are immutable by design, replacing an image creates a new file entity with a new UUID, eliminating stale cache propagation issues.

---

## 5. Two-Server Topology & Stateless Node Architecture

GauShilp OS is engineered for zero-state horizontal scaling across two or more application instances:

```text
               +----------------------------------+
               |       Cloudflare CDN / WAF       |
               +-----------------+----------------+
                                 |
                                 v
               +-----------------+----------------+
               |        Load Balancer             |
               | (Round-Robin / Least Connection) |
               +---------+--------------+---------+
                         |              |
             Traffic     v              v     Traffic
                  +------+----+    +----+------+
                  |   API A   |    |   API B   |
                  | (Node 1)  |    | (Node 2)  |
                  +------+----+    +----+------+
                         \              /
                          \            /
                           v          v
                  +-------------------------------+
                  |        Shared Services        |
                  |  - PostgreSQL 16+ (Prisma)    |
                  |  - Redis 7+ Cluster / Service |
                  |  - Cloudflare R2 (Storage)    |
                  |  - BullMQ Background Workers  |
                  +-------------------------------+
```

### Stateless Node Guarantees
1. **Zero Process-Local State**: Application servers do not store user sessions, carts, or volatile business data in local Node.js memory. All shared state resides in Redis or PostgreSQL.
2. **Independent Restarts**: Either API instance can restart, crash, or deploy without dropping active customer sessions or corrupting transactions.
3. **Multi-Worker Background Safety**: Background jobs and transactional outbox processors operate under advisory locking and bounded worker concurrency, preventing duplicate notifications or double payment processing across instances.
4. **Shared Cache Invalidation**: When an admin or seller mutates a product, store, or category on API A, the invalidation event is executed against the shared Redis cluster, instantly reflecting on API B without instance-to-instance gossip.
5. **Health Checks & Telemetry**:
   * Liveness Probe: `GET /api/v1/health/liveness` (returns process uptime and memory health).
   * Readiness Probe: `GET /api/v1/health/readiness` (verifies PostgreSQL connectivity with a 3000ms fail-fast timeout).
   * Database Probe: `GET /api/v1/admin/health/database` (verifies live database ping).

---

## 6. Distributed Redis Caching Architecture

### Caching Scope & TTL Policy
Only public, safe, and frequently read datasets are cached:

| Data Type | Cache Key Pattern | TTL | Invalidation Trigger |
|---|---|---|---|
| Public Store Profile | `gaushilp:v1:public:store:{slug}` | 300s (5m) | Store updated, published, or unpublished |
| Tenant Product Catalog | `gaushilp:v1:t:{tenantId}:products:p{page}:l{limit}` | 120s (2m) | Product created, updated, deleted, or ordered |
| Single Public Product | `gaushilp:v1:t:{tenantId}:product:{slug}` | 300s (5m) | Product updated or deleted |
| Store Categories | `gaushilp:v1:t:{tenantId}:categories` | 600s (10m) | Category created, updated, or deleted |
| Subscription Plans | `gaushilp:v1:platform:subscription-plans` | 1800s (30m) | Plan pricing or entitlement updated |

### Sensitive Data Exclusion (Strict Anti-Caching Rule)
The following resources are **never** stored in Redis:
* Customer passwords, tokens, or JWTs.
* Customer profile information, phone numbers, or saved delivery addresses.
* Active shopping carts (`/api/v1/cart`).
* Private orders, shipment tracking numbers, and customer invoices.
* Payment gateway credentials, webhook signatures, or transaction payloads.
* Platform audit logs and administrative security records.

---

## 7. Authoritative Consistency & Failover Policy

PostgreSQL is the **absolute, authoritative single source of truth**:

1. **Transactional Operations Bypass Cache**:
   * Stock reservations (`POST /api/v1/orders`), checkout validation (`POST /api/v1/checkout/validate`), payment verification (`POST /api/v1/payments/verify`), and webhook reconciliation always query current PostgreSQL row data using conditional update locks (`UPDATE products SET stock = stock - quantity WHERE id = ... AND stock >= quantity`).
   * A cache hit is never treated as authoritative for financial or inventory transactions.

2. **Redis Resiliency & Failover Strategy**:
   * Redis connections are wrapped in an autonomous circuit-breaker with a **1500ms command timeout**.
   * If Redis is down, unreachable, or timing out:
     * Read operations automatically log a warning and fall back to querying PostgreSQL directly.
     * Zero 500 errors are returned to customers.
     * The application automatically recovers and resumes caching once the Redis connection is re-established.
   * Write and payment operations proceed unaffected because business state does not depend on Redis durability.

---

## 8. Backup, Disaster Recovery & Security Architecture (Step 14)

### Automated Daily Database Backups
* **Schedule**: Automated daily backups trigger at 02:00 UTC (`0 2 * * *`).
* **Cryptographic Pipeline**:
  * Unencrypted SHA-256 integrity checksum calculated on complete database table export.
  * AES-256-GCM envelope encryption with a fresh 96-bit random IV and 128-bit authentication tag.
  * Plaintext JSON is never stored on disk or transferred across unencrypted channels.
* **Storage Separation**:
  * Encrypted payloads (`backups/db/daily/{backupId}.dump.enc`) and durable metadata manifests (`backups/manifests/{backupId}.json`) are uploaded to a separate, isolated bucket (`BACKUP_STORAGE_BUCKET`).
  * Dedicated credentials with minimal write/read privileges protect backups against ransomware or compromised media storage keys.

### 30-Day Retention Policy with Last-Backup Protection
* Backups older than 30 days (`BACKUP_RETENTION_DAYS`) are automatically pruned.
* The pruning algorithm sorts manifests descending and **always preserves the most recent valid backup** (`manifests[0]`), ensuring zero risk of accidental total backup loss.

### Non-Destructive Restore Testing
* The restoration engine (`BackupService.restoreDatabase`) executes dry-run validation drills verifying table structures, record counts, and checksums.
* Direct writes only occur if an isolated, non-production test client is explicitly provided, guaranteeing that restore tests can never overwrite or corrupt the live database.

