GauShilp OS â€” Backend Architecture

Document: backend-architecture.md
Version: 1.1 (proposed)
Product: Multi-tenant e-commerce SaaS for handmade, cow-based and traditional products
Architecture style: Modular monolith
Status: Architecture proposal; provider plans and monthly budget are intentionally not finalised.

1. Goals

The backend must support:

Multiple independent seller stores on one SaaS platform.

Three dashboards: Super Admin, Seller and Customer, plus a public storefront.

Five roles: SUPER_ADMIN, STORE_OWNER, STORE_MANAGER, STORE_STAFF, CUSTOMER.

Strong tenant isolation and server-side authorisation.

Fast product-page and image delivery.

Two application instances for traffic distribution and service resilience.

A managed relational database, cache, background jobs and object storage.

Daily backups plus a separately protected backup copy and tested restoration.

A readable codebase that another developer can understand and extend.

Important distinction: two application instances improve request capacity and availability; they do not, by themselves, make files load faster worldwide. CDN caching is responsible for faster delivery of cacheable public assets. Backups are separate from high availability and replication.

2. Proposed Technology and Hosting Direction

The agreed direction is Cloudflare + managed application hosting + managed PostgreSQL. Budget and exact service plans will be selected later.

Layer

Proposed technology/service

Responsibility

DNS, CDN, WAF

Cloudflare

DNS, HTTPS, edge caching, DDoS/WAF protections and rate-limiting rules where configured

Frontend

Next.js + TypeScript

Storefront, seller dashboard, customer dashboard and Super Admin UI

Backend API

NestJS + TypeScript

Authentication integration, business rules, APIs and permissions

Application hosting

Render or equivalent managed host

Run the frontend, API instances and worker processes

Database

Managed PostgreSQL

Durable business records and transactions

Database access

Prisma + reviewed SQL where needed

Schema, migrations and typed database access

Cache / queue backend

Managed Redis-compatible service

Cache selected data and support background-job processing

Background jobs

Dedicated worker process; BullMQ if Redis is selected

Email, image tasks, retries and other slow or scheduled work

Public media

Cloudflare R2 + custom media domain

Public product images and store logos, served through Cloudflare cache

Private files

Private object-storage bucket

Private exports or documents accessed through authorised, short-lived links

Backup destination

Separate protected bucket/account or independent provider

Recovery copies, with credentials separate from production

Monitoring

Sentry or equivalent + host/database metrics

Exceptions, latency, resource usage and alerting

Source control / CI

GitHub + automated checks

Pull requests, tests, builds and deployment workflow

Provider choices are proposals, not a claim that every paid feature is included by default. Before production, verify plan-specific support for multiple instances, backups/PITR, high availability, networking, retention, and restore procedures.

3. High-Level Architecture

                         Customers / Sellers / Admins
                                      |
                                      v
                        Cloudflare DNS + WAF + CDN
                                      |
                   +------------------+------------------+
                   |                                     |
                   v                                     v
          Next.js Web Application                 API Host / Load Balancer
        storefront + three dashboards                    |
                                                        / \
                                                       v   v
                                                API Instance A  API Instance B
                                                       \   /
                                                        \ /
                                                         v
                                              NestJS Business Modules
                                                         |
                          +------------------------------+-------------------+
                          |                  |                 |             |
                          v                  v                 v             v
                   PostgreSQL           Redis / Queue     Object Storage  External APIs
                   Primary/HA            Cache + Jobs     R2 + private    Payments/email/
                          |                                files           shipping
                          v
                PITR / Managed DB Backups
                          |
                          v
             Separate encrypted backup destination
             with restricted access and deletion protection

Request routing

Use separate hostnames for clear operational boundaries, for example:

www.example.com â€” marketing/public site.

app.example.com â€” seller and customer account experiences.

api.example.com â€” backend API.

store-slug.example.com or a store path â€” public seller storefront; final routing choice is to be decided before implementation.

media.example.com â€” public product images and logos via CDN.

Do not use a development storage URL for production media. Public-media hosts should contain only content intentionally made public. Keep private documents in a private bucket.

4. Application Instances and Traffic Handling

Production target

Run two stateless API instances behind the managed host's load balancer. Both instances run the same version of the API and connect to the same managed PostgreSQL database, shared Redis service and object storage.

Do not store essential business data or uploaded files on a local application disk.

Do not run separate, unsynchronised databases on the two instances.

Store sessions in a shared/managed session mechanism if server sessions are used; do not depend on in-memory sessions on one instance.

Add health/readiness endpoints and graceful shutdown handling.

Run scheduled jobs through a dedicated worker or scheduler so they do not accidentally run twice on both API instances.

If the host supports it and the selected plan permits it, place instances across separate availability zones. Confirm the provider's actual placement guarantees.

Consider autoscaling only after load tests and telemetry show a need; two instances have a cost and do not guarantee unlimited capacity.

Performance strategy

Cache public product images and immutable static assets at Cloudflare's edge.

Use Redis only for data that is safe and useful to cache; define TTLs and invalidation rules.

Keep customer-specific responses, carts, account pages and checkout out of public CDN cache.

Use pagination for products, customers and orders.

Add indexes based on actual query patterns; inspect slow queries instead of indexing every column.

Use database connection pooling and set safe connection limits for all app instances and workers together.

Move slow workâ€”emails, image processing, exports and retryable integrationsâ€”to background jobs.

Optimise image size/format and use responsive image sizes.

Load-test product listing, checkout and order processing before high-traffic campaigns.

Cache keys must include store/tenant identity whenever the response is tenant-specific.

5. Codebase Structure

Use a monorepo so the frontend, backend, shared types and documentation stay versioned together.

gaushilp-os/
â”œâ”€â”€ apps/
â”‚   â”œâ”€â”€ web/                         # Next.js frontend
â”‚   â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”‚   â”œâ”€â”€ (marketing)/
â”‚   â”‚   â”‚   â”œâ”€â”€ (storefront)/
â”‚   â”‚   â”‚   â”œâ”€â”€ (seller)/
â”‚   â”‚   â”‚   â”œâ”€â”€ (customer)/
â”‚   â”‚   â”‚   â””â”€â”€ (admin)/
â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ features/
â”‚   â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â””â”€â”€ tests/
â”‚   â”‚
â”‚   â”œâ”€â”€ api/                         # NestJS backend
â”‚   â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”‚   â”œâ”€â”€ main.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ app.module.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ config/
â”‚   â”‚   â”‚   â”œâ”€â”€ common/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ guards/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ decorators/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ filters/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ interceptors/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ pipes/
â”‚   â”‚   â”‚   â”œâ”€â”€ modules/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ auth/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ users/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ tenants/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ memberships/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ roles-permissions/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ stores/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ products/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ categories/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ inventory/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ customers/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ addresses/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ carts/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ wishlist/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ checkout/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ orders/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ payments/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ subscriptions/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ shipping/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ notifications/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ uploads/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ analytics/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ admin/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ audit/
â”‚   â”‚   â”‚   â”œâ”€â”€ integrations/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ payment-provider/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ email-provider/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ shipping-provider/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ object-storage/
â”‚   â”‚   â”‚   â””â”€â”€ health/
â”‚   â”‚   â””â”€â”€ test/
â”‚   â”‚
â”‚   â””â”€â”€ worker/                      # Background worker, if separately deployed
â”‚       â”œâ”€â”€ src/
â”‚       â”‚   â”œâ”€â”€ jobs/
â”‚       â”‚   â””â”€â”€ main.ts
â”‚       â””â”€â”€ test/
â”‚
â”œâ”€â”€ packages/
â”‚   â”œâ”€â”€ shared-types/
â”‚   â”œâ”€â”€ validation-schemas/
â”‚   â””â”€â”€ config/
â”‚
â”œâ”€â”€ prisma/
â”‚   â”œâ”€â”€ schema.prisma
â”‚   â”œâ”€â”€ migrations/
â”‚   â””â”€â”€ seed.ts
â”‚
â”œâ”€â”€ infrastructure/
â”‚   â”œâ”€â”€ deployment/
â”‚   â”œâ”€â”€ cloudflare/
â”‚   â”œâ”€â”€ monitoring/
â”‚   â”œâ”€â”€ backups/
â”‚   â””â”€â”€ infrastructure-as-code/
â”‚
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ architecture.md
â”‚   â”œâ”€â”€ backend-architecture.md
â”‚   â”œâ”€â”€ database-schema.md
â”‚   â”œâ”€â”€ api-specification.md
â”‚   â”œâ”€â”€ security-policy.md
â”‚   â”œâ”€â”€ backup-recovery.md
â”‚   â”œâ”€â”€ deployment-guide.md
â”‚   â””â”€â”€ runbooks/
â”‚
â”œâ”€â”€ .env.example
â”œâ”€â”€ .gitignore
â”œâ”€â”€ package.json
â””â”€â”€ README.md

Module convention

Each backend module should normally contain:

modules/products/
â”œâ”€â”€ products.module.ts
â”œâ”€â”€ products.controller.ts       # HTTP transport layer only
â”œâ”€â”€ products.service.ts          # business rules
â”œâ”€â”€ products.repository.ts        # data access
â”œâ”€â”€ dto/                          # input/output DTOs
â”œâ”€â”€ policies/                     # permissions where needed
â””â”€â”€ tests/

Keep controllers thin. Validate input at API boundaries. Put business rules in services and data-access logic in repositories. Avoid circular dependencies between modules. Add a README to any module with non-obvious rules.

6. Roles and Access Control

There are five product roles:

Role

Scope

Main access

SUPER_ADMIN

Platform

Tenant administration, plan management, platform health and audited support actions

STORE_OWNER

Own tenant

Full control of store, team, products, orders and subscription

STORE_MANAGER

Own tenant

Products, inventory, orders and permitted reports

STORE_STAFF

Own tenant

Only tasks explicitly granted by store permissions

CUSTOMER

Own account and orders

Profile, saved addresses, wishlist and own purchases

Implementation rules:

Store roles are tenant memberships, not global user flags. One user may be a member of more than one store with different roles.

Keep platform administration permissions separate from store membership permissions.

Resolve tenant access server-side from a validated hostname/slug or authenticated membership.

Never trust a browser-supplied tenant_id as authorisation.

Check access on every protected API endpoint and resource operation.

Require MFA for privileged administrators where supported.

Log sensitive admin actions, role changes, store suspensions and subscription overrides.

7. Multi-Tenant Data Isolation

Use a shared PostgreSQL database with tenant-scoped rows for the initial product. Every tenant-owned record should have a tenant_id and appropriate foreign-key relationships.

Tenant-owned data includes products, categories, inventory, customers, addresses, carts, orders, order items, shipping records, store settings and staff memberships. Customer account data must also be checked against the authenticated customer's identity; tenant scope alone does not permit one customer to read another customer's order.

Required controls

Create a trusted tenant context from authentication or validated public-store resolution.

Require that context in tenant-scoped service/repository functions.

Add tenant-aware unique constraints and indexes where appropriate.

Test direct ID manipulation and cross-tenant requests.

Use private object storage for private files and authorise every signed URL.

Consider PostgreSQL Row-Level Security (RLS) as defence-in-depth after validating connection-pool context, application database roles and migration behaviour.

Do not assume RLS automatically protects access performed by privileged database roles or table owners; test the actual production role configuration.

A cross-tenant access failure is a release blocker.

8. Data and Storage Strategy

A. PostgreSQL â€” source of truth

Store structured application records: users, tenant memberships, products, inventory, carts, orders, payment records, subscriptions, addresses and audit events.

Requirements:

Private network access; no public database exposure unless a tightly controlled administrative need requires it.

TLS for connections and encryption at rest where supported.

Managed backups and point-in-time recovery (PITR), if available on the selected plan.

Connection pooling and bounded connection counts.

Foreign keys, unique constraints and transactions for financial/order workflows.

Separate database credentials/roles with least privilege.

B. Object storage â€” files

Use Cloudflare R2 or equivalent for product images, logos and uploaded assets. Store object keys and metadata in PostgreSQL, not the file bytes themselves.

Public bucket/domain: only deliberately public product images and store logos; serve through Cloudflare cache.

Private bucket: invoices/exports or other sensitive files; use authenticated access or short-lived signed URLs.

Validate upload size, MIME type and file signature; use random object keys; prevent executable uploads; consider image re-encoding and malware scanning where appropriate.

Use tenant-specific object key prefixes for organisation, but do not rely on the prefix alone as the security boundary.

Enable versioning or deletion protection where supported and suitable.

C. Independent backup storage

Keep recovery copies in a separately protected account/bucket or independent provider, not merely another folder with the same credentials. Use encryption, limited backup-writer permissions, separate deletion permissions and retention/deletion protections where available.

Public media storage and private backup storage must not share public access settings.

9. Backup and Disaster Recovery

Backup policy

Daily: automated database backup/export to a separately protected destination.

PITR: enable managed point-in-time recovery if the chosen provider and plan support it; verify the actual recovery window.

Object storage: protect important file versions and copy critical objects/metadata to independent backup storage.

Monitoring: alert on failed, missing, unusually small or incomplete backups.

Encryption: encrypt backup data in transit and at rest; protect keys and credentials separately from the data.

Retention proposal: daily backups for 30 days; consider a monthly archive for 6 months. Final retention must be confirmed against cost, legal requirements and recovery needs.

Restore tests: test database restore and important object recovery at least monthly, and after major infrastructure changes.

Runbook: document who can start a restore, how the restored database is validated, how application services are switched, and how recovery is communicated.

Initial recovery objectives (targets, not guarantees)

Daily independent backup alone: potential data-loss window can approach 24 hours.

With working PITR: target a much smaller recovery point, based on the provider's actual capabilities.

Initial restoration target: recover critical service within 4â€“8 hours, then improve after restore drills.

High availability, replication and backups solve different problems. Replication can copy accidental deletions or corrupted data; independent backups are still required.

10. Cache, Queue and Background Work

Redis/cache

Use Redis for short-lived, explicitly cacheable data and queue infrastructure if the selected stack uses it. Define a TTL and invalidation plan for each cache. Cache is disposable; PostgreSQL remains the source of truth.

Never cache account, checkout, cart or order responses in a public shared cache. Tenant-specific cache keys must include tenant/store identity and relevant content version.

Background jobs

Move slow or retryable work out of web request handlers:

Email and notification delivery.

Image transformations.

Report/export generation.

Provider webhook follow-up work.

Scheduled maintenance and subscription reminders.

Use idempotent jobs, bounded retries with backoff, dead-letter/failure inspection, and monitoring for queue lag. Do not rely on both API instances independently running the same scheduled task. Run a single scheduler or use a distributed lock/queue scheduling mechanism.

11. Orders, Inventory and Payments

Checkout principles

Calculate price, discount, tax and delivery values on the server.

Revalidate price and stock when checkout is submitted.

Use database transactions and explicit stock-reservation/deduction rules.

Save order-item snapshots so later product edits do not alter historical receipts.

Use idempotency keys for checkout/payment operations where appropriate.

Track order state separately from payment state.

Webhooks

Verify the provider's signature.

Store provider event IDs with a uniqueness constraint.

Handle duplicate and out-of-order events safely.

Verify payment amount, currency and order reference server-side.

Update related records transactionally.

Do not mark a payment successful merely because the browser returns to a success page.

Separate financial flows

Customer-to-seller product payments.

Seller-to-GauShilp SaaS subscription payments.

Use distinct modules, records, reconciliation and reporting. Do not pool/redistribute sellers' funds in the initial release. Confirm each payment provider supports the intended seller onboarding/merchant setup before selecting it.

12. API Standards

Use a versioned API namespace such as /api/v1 and a consistent response/error format.

Example groups:

/api/v1/auth
/api/v1/tenants
/api/v1/stores
/api/v1/products
/api/v1/categories
/api/v1/inventory
/api/v1/customers
/api/v1/addresses
/api/v1/carts
/api/v1/checkout
/api/v1/orders
/api/v1/payments
/api/v1/subscriptions
/api/v1/shipping
/api/v1/wishlist
/api/v1/admin
/api/v1/webhooks

For each endpoint, document whether it is public or authenticated, required role/permission, tenant context, request schema, response schema, error codes, rate limits and audit needs. Generate and maintain an OpenAPI/Swagger specification from the NestJS application.

13. Security Baseline

Identity and session security

Use a maintained authentication provider/library; never store plaintext passwords.

Use secure, HttpOnly, appropriately scoped cookies if cookie sessions are selected; apply CSRF protections where applicable.

Require MFA for Super Admins and other privileged users where available.

Apply account recovery protections, session revocation and sensible login rate limits.

Network and application security

HTTPS everywhere; redirect HTTP to HTTPS.

Restrict database and cache to private networking or trusted service identities.

Store credentials in a secret manager/environment configuration, never in source control.

Validate all inputs and enforce body/file-size limits.

Apply rate limits on authentication, checkout, search and public endpoints.

Verify webhook signatures and protect webhook endpoints from replay/duplicate processing.

Use a restrictive CORS policy and appropriate security headers.

Keep dependencies patched; run dependency/security scans in CI.

Redact credentials, tokens and unnecessary personal data from logs.

Keep a minimal, audited break-glass process for production access.

Privacy

Collect only data needed to operate the store, order and support workflows. Define retention, export and deletion rules for customer data and audit records, and review applicable Indian privacy, consumer and e-commerce requirements before production.

14. Monitoring and Reliability

Monitor and alert on:

API error rate and response latency (including p95/p99).

CPU, memory and restarts for each application instance.

Database connection use, saturation, slow queries and storage capacity.

Redis memory/connections and cache hit rate where relevant.

Queue depth, oldest-job age and repeated job failures.

Payment/webhook failure rates.

Authentication anomalies and admin actions.

Backup success, age and restore-test status.

Object-storage errors and capacity/usage trends.

Provide health endpoints for liveness/readiness. Use structured logs with request/correlation IDs. Do not record secrets or full payment credentials.

15. Environments and Deployment

Maintain separate development, staging and production environments with different credentials and data. Do not copy production customer data into development unless it is properly anonymised and authorised.

CI/CD should run, at minimum:

Formatting and linting.

Type checking.

Unit and integration tests.

Tenant-isolation and permission tests.

Dependency/security checks.

Build and deployment health checks.

Use reviewed, backward-compatible database migrations. Keep an application rollback/forward-recovery plan. Configure graceful shutdown and health checks so rolling deployments do not interrupt requests unnecessarily.

16. Testing Requirements

Unit tests: pricing, inventory, order transitions, permissions, subscription entitlements.

Integration tests: database transactions, storage permissions, payment events, subscription updates, notifications.

End-to-end tests: seller onboarding, store publication, customer registration, wishlist, saved address, checkout, payment confirmation, order tracking and fulfilment.

Security tests: cross-tenant access, ID manipulation, role escalation, private-file access, invalid/duplicate webhooks and rate limits.

Load tests: storefront reads, product search, cart/checkout and concurrent order creation.

Recovery tests: database restore and file restore.

Set numeric throughput/latency targets only after defining expected traffic and measuring an initial baseline.

17. Implementation Order

Repository, environment configuration and CI.

Database schema/migrations and authentication.

Tenant context, memberships and permission guards.

Store and product modules.

Public file uploads and CDN delivery.

Customer accounts, saved addresses and wishlist.

Cart, checkout, order and inventory transactions.

Payment and subscription integrations.

Notifications and worker process.

Admin tooling and audit logs.

Cache rules, database indexes and connection pooling.

Two API instances, health checks and load balancing.

Daily backups, PITR review and separate backup storage.

Monitoring, load tests, security review and restore drills.

18. Production Release Gates

Do not launch until:

Cross-tenant access and role-permission tests pass.

Customer data and private files cannot be accessed by unauthorised users.

Payment webhooks are verified and idempotent.

Checkout price/stock validation is server-side and transactional.

Backup jobs are monitored and a real restore has succeeded.

Production secrets are not in the repository or frontend bundle.

Health checks, error monitoring and alerts are active.

Public CDN caching does not expose customer-specific data.

The application can run correctly on either API instance without local persistent state.

Incident, rollback and recovery runbooks exist.

19. Improvements Recommended Before Coding

Clarify recovery objectives: agree on acceptable data loss (RPO) and recovery time (RTO); daily backups alone can lose up to a day's data.

Use a managed database with PITR: daily exported copies and PITR provide different recovery options; confirm retention for the selected plan.

Keep backup access separate: a production administrator credential should not be able to casually delete every backup.

Add tenant-isolation tests from day one: this is one of the highest-risk parts of a SaaS architecture.

Use an outbox or reliable job handoff for critical events: prevent a committed order from being lost between the database commit and notification/job enqueueing.

Do not microservice prematurely: a modular monolith is easier to secure and maintain until there is measured reason to split it.

Load-test before overbuilding: two instances are a starting topology, not proof of high-load readiness. Database capacity, cache strategy, queries and external providers may be the real bottlenecks.

Separate public and private media: do not put invoices, customer exports or private documents on a public cached media domain.

Define provider portability: use adapter interfaces for payments, email, shipping and object storage to reduce lock-in.

Document operational ownership: every alert, backup, restore and security incident should have a clear response procedure.

20. Decisions Still Open

These items can be finalised later without changing the high-level architecture:

Monthly infrastructure budget and exact service tiers.

Exact managed PostgreSQL provider and HA/PITR plan.

Final application host and availability-zone placement guarantees.

Redis provider and whether jobs use BullMQ or another queue.

Authentication provider and session strategy.

Payment and subscription providers.

Storefront URL strategy (subdomain vs path) and custom-domain timing.

Backup retention, RPO and RTO.

Expected launch traffic and numeric performance SLOs.

21. Official Reference Links

Render scaling and multiple instances

Render PostgreSQL backups and point-in-time recovery

Cloudflare R2 with Cloudflare cache

Cloudflare R2 public buckets and custom domains

PostgreSQL Row-Level Security

Core principle: PostgreSQL is the source of truth, object storage holds files, Cloudflare delivers public assets quickly, two stateless API instances share the same services, and independently protected backups make recovery possible. Security, backup restoration and tenant isolation must be testedâ€”not merely configured.
