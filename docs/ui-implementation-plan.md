# GauShilp OS — Frontend UI/UX Implementation Plan

## 1. System Overview & Repository Audit

### 1.1 Architecture & Codebase Status
- **Backend Architecture**: Modular NestJS monolith with PostgreSQL (Prisma ORM), Redis caching & queues, Cloudflare R2 object storage, and outbox event streaming. Verified with 41 test suites and 315 passing unit tests.
- **Frontend Architecture**: Next.js 16 (App Router, Turbopack, React 19, TypeScript) located in `frontend/`.
- **Database Daemon**: Isolated PostgreSQL 18 instance running on `127.0.0.1:5433` (`gaushilp_test`).

### 1.2 Reference Design Alignment
The primary visual specification is the reference design, featuring:
- **Soft Lavender Background**: `linear-gradient(135deg, #F7F8FF 0%, #ECEEFF 50%, #F5F3FF 100%)`
- **Primary Indigo**: `#5B5CE2`
- **Deep Indigo**: `#4445C8`
- **Indigo Gradient**: `linear-gradient(135deg, #6264EE 0%, #4A4BCB 100%)`
- **Dark Navy Sidebar**: `linear-gradient(180deg, #181A32 0%, #121426 100%)`
- **White Surface Cards**: `#FFFFFF` with rounded radii (`16px–20px`), thin border (`#E4E6F4`), and restrained elevation shadows.
- **Accents**: Orange `#FF9C43`, Teal `#23B9AF`, Success `#18845A`.

---

## 2. API Integration Mapping

| Screen / Feature | Route | Backend Endpoint / Contract | Status |
| :--- | :--- | :--- | :--- |
| **Login** | `/login` | `POST /api/v1/auth/login` (OIDC / JWT) + `GET /api/v1/auth/me` | Completed (Phase A) |
| **Register / Seller Onboarding** | `/register` | `POST /api/v1/auth/register` / Store provisioning | Completed (Phase A) |
| **Forgot Password** | `/forgot-password` | `POST /api/v1/auth/forgot-password` | Completed (Phase A) |
| **Shared Layout & Role Nav** | All authenticated | Central navigation, AppShell, AppSidebar, AppTopNav | Completed (Phase B) |
| **Super Admin Overview** | `/admin/overview` | `GET /api/v1/admin/analytics/overview`, `GET /api/v1/admin/health`, `GET /api/v1/admin/tenants` | Completed (Phase C) |
| **Seller Dashboard** | `/seller/dashboard` | `GET /api/v1/stores/:id`, `GET /api/v1/orders`, `GET /api/v1/products` | Completed (Phase D) |
| **Products & Inventory** | `/seller/products`, `/seller/inventory` | `GET,POST,PATCH,DELETE /api/v1/products`, `PATCH /products/:id/stock` | Completed (Phase D) |
| **Categories Management** | `/seller/categories` | `GET,POST,PATCH,DELETE /api/v1/categories` | Completed (Phase D) |
| **Order Management** | `/seller/orders` | `GET /api/v1/orders`, `PATCH /orders/:id/status`, `POST /orders/:id/cancel` | Completed (Phase D) |
| **Shipping & Fulfillment** | `/seller/shipping` | `GET /shipping/orders/ready`, `POST /shipping/shipments`, `POST /shipping/shipments/:id/dispatch` | Completed (Phase D) |
| **Store Settings & SaaS** | `/seller/settings`, `/seller/subscription` | `PATCH /stores/:id`, `GET /subscriptions/plans`, `POST /subscriptions/create-checkout` | Completed (Phase D) |
| **Customer Dashboard** | `/account` | `GET /api/v1/customers/me`, `GET /api/v1/customers/me/addresses`, `GET /api/v1/customers/me/wishlist` | Completed (Phase E) |
| **Customer Orders & Tracking** | `/account/orders`, `/account/orders/[orderId]` | `GET /api/v1/orders`, `GET /customers/me/orders/:id/tracking`, `POST /orders/:id/cancel` | Completed (Phase E) |
| **Customer Notifications** | `/account/notifications` | `GET /api/v1/notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` | Completed (Phase E) |
| **Public Storefront & Catalogue** | `/store/[slug]`, `/store/[slug]/products`, `/store/[slug]/products/[productSlug]`, `/store/[slug]/categories/[categorySlug]` | `GET /api/v1/public/stores/:slug`, `GET /api/v1/public/stores/:slug/products`, `GET /api/v1/public/stores/:slug/categories`, `GET /cart`, `POST /cart/items` | Completed (Phase F) |
| **Checkout & Payment** | `/store/[slug]/cart`, `/store/[slug]/checkout`, `/store/[slug]/checkout/confirmation` | `GET /api/v1/cart`, `POST /api/v1/checkout/validate`, `POST /api/v1/orders`, `POST /api/v1/orders/:id/payments`, `GET /api/v1/orders/:id` | Completed (Phase G) |

---

## 3. Phased Implementation Roadmap
- **Phase A (Completed)**: Design Tokens, Brand Assets, Login (`/login`), Register (`/register`), Forgot Password (`/forgot-password`).
- **Phase B (Completed)**: Shared Application Layout (`AppShell`, `AppSidebar`, `AppTopNav`), 5-role navigation configuration, role guards, and reusable UI components.
- **Phase C (Completed)**: Super Admin Dashboard (`/admin/overview`), KPI Stat Cards, Revenue/Orders Dual Chart, System Health Probes, and Recent Tenants Table.
- **Phase D (Completed)**: Seller Operating System Dashboard & Business Management (`/seller/dashboard`, `/seller/products`, `/seller/inventory`, `/seller/orders`, `/seller/categories`, `/seller/customers`, `/seller/shipping`, `/seller/settings`, `/seller/subscription`, `/seller/analytics`).
- **Phase E (Completed)**: Customer Account Portal & Sacred E-Commerce Hub (`/account`, `/account/profile`, `/account/addresses`, `/account/wishlist`, `/account/orders`, `/account/orders/[orderId]`, `/account/notifications`).
- **Phase F (Completed)**: Public Storefront & Product Discovery (`/store/[slug]`, `/store/[slug]/products`, `/store/[slug]/products/[productSlug]`, `/store/[slug]/categories/[categorySlug]`, `StorefrontHeader`, `StorefrontFooter`, `StoreProductCard`, `CartDrawer`). Verified with 58/58 unit & integration tests passing.
- **Phase G (Completed)**: Shopping Cart (`/store/[slug]/cart`), 3-Step Checkout (`/store/[slug]/checkout`), and Order Confirmation & Payment Verification (`/store/[slug]/checkout/confirmation`). Verified with 45/45 tests passing (346 tests overall across Phases B–G).
- **Phase H (Completed)**: Final Frontend QA, UI Polish & Production Readiness. Full responsive verification (mobile 375x812, 390x844, tablet 768x1024, desktop 1366x768, wide desktop 1920x1080), image remotePatterns configuration, defense-in-depth context hooks (`useCart`, `useAuth`), linting, and 407/407 tests passing across the entire application surface. Production build verified (45/45 static/partial prerendered routes).
