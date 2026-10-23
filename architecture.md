GauShilp OS — System Architecture

Version: 1.0
Project: Multi-tenant E-commerce SaaS
Target Market: India
Architecture Style: Modular Monolith
Status: Initial Architecture

1. Project Overview

GauShilp OS is a multi-tenant SaaS platform that enables small businesses, artisans, gaushalas, and handmade-product sellers to create and manage their own online stores.

Each seller gets an independent storefront with its own products, customers, orders, inventory, and settings.

The platform includes three dashboards and one public storefront.

2. Application Structure
Dashboard 1: Super Admin Dashboard

Purpose: Manage the entire SaaS platform.

Features:

Manage seller accounts and tenants.
Manage subscription plans.
Monitor platform usage.
Manage platform users.
Suspend or reactivate stores.
Monitor system health.
Access administrative audit logs.
Dashboard 2: Seller Dashboard

Purpose: Allow sellers to manage their businesses.

Features:

Store configuration and branding.
Product and category management.
Inventory management.
Order management.
Customer management.
Staff management.
Sales analytics.
Payment and shipping configuration.
SaaS subscription management.

The dashboard uses role-based permissions for owners, managers, and staff.

Dashboard 3: Customer Dashboard

Purpose: Allow customers to manage their shopping activities.

Features:

Customer registration and login.
Profile management.
Order history.
Order tracking.
Saved addresses.
Wishlist.
Cancellation and return requests.
Account settings.
Public Storefront

Customers can browse a seller's products without creating an account.

Features:

Homepage.
Product catalogue.
Product details.
Search and category filters.
Shopping cart.
Checkout.
Payment options.
Customer registration and login.
Order confirmation.
3. User Roles

The system has five primary roles.

Role	Access
SUPER_ADMIN	Entire SaaS platform
STORE_OWNER	Full control over their own store
STORE_MANAGER	Manage store operations
STORE_STAFF	Access assigned store operations
CUSTOMER	Manage their own customer account and purchases
Permission Rules
Super Admin permissions are separate from tenant permissions.
Store Owners can manage only their own businesses.
Managers receive operational permissions.
Staff permissions are restricted to assigned tasks.
Customers can access only their own profile, addresses, wishlist, and orders.
All permissions must be enforced on the backend.
4. Technology Stack
Component	Technology
Frontend	Next.js
Programming Language	TypeScript
UI Styling	Tailwind CSS
Backend	Next.js server-side modules and Route Handlers
Database	PostgreSQL
ORM	Prisma
Authentication	Managed authentication provider
File Storage	S3-compatible object storage
Payments	Supported payment gateway
Email Notifications	Transactional email provider
Version Control	Git and GitHub
Deployment	Managed application hosting
Testing	Unit, integration, and end-to-end tests

The application starts as a modular monolith. Microservices are not required for the MVP.

5. High-Level Architecture
                   GAUSHILP OS
                        |
         +--------------+--------------+
         |              |              |
         v              v              v
    Super Admin     Seller Dashboard  Customer Dashboard
     Dashboard            |              |
                          |              |
                          v              |
                    Seller Storefront    |
                          |              |
                          +-------+------+
                                  |
                                  v
                           APPLICATION LAYER
                              Next.js
                                  |
          +-----------------------+----------------------+
          |            |          |          |           |
          v            v          v          v           v
       Tenants       Products    Orders    Payments    Customers
          |            |          |          |           |
          +------------+----------+----------+-----------+
                                  |
                                  v
                              PostgreSQL
                                  |
                    +-------------+-------------+
                    |             |             |
                    v             v             v
                File Storage  Notifications  Audit Logs

External payment providers, email services, and shipping providers are integrated through dedicated modules.

6. Multi-Tenant Architecture

Each seller is represented by a tenant.

Example:

Tenant A
  Store: Handmade Diyas
  Products: Diyas, statues, puja kits
  Orders: Tenant A orders

Tenant B
  Store: Natural Dhoop
  Products: Dhoop, kande, cow dung wood
  Orders: Tenant B orders

Both tenants use the same application and database, but their business data remains logically isolated.

Tenant Isolation Rules
Every tenant-owned record must include a tenant_id.
Every private database query must enforce the correct tenant context.
Tenant context must be derived from authenticated membership, not trusted directly from client input.
Customers must access only their own customer records and orders.
Public storefronts must expose only published and available products.
Uploaded files must have tenant-aware access controls.
Cross-tenant access must be tested before every production release.

PostgreSQL Row-Level Security may be added as an additional layer of protection.

7. Backend Modules

Organise the application into these logical modules:

src/
├── app/
│   ├── (admin)/
│   ├── (seller)/
│   ├── (customer)/
│   ├── (storefront)/
│   └── api/
│
├── components/
│   ├── ui/
│   ├── admin/
│   ├── seller/
│   ├── customer/
│   └── storefront/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── tenants/
│   ├── memberships/
│   ├── storefronts/
│   ├── products/
│   ├── categories/
│   ├── inventory/
│   ├── customers/
│   ├── carts/
│   ├── orders/
│   ├── payments/
│   ├── shipping/
│   ├── subscriptions/
│   ├── notifications/
│   ├── analytics/
│   └── admin/
│
├── lib/
├── database/
└── tests/

Each module should contain its relevant business logic, data-access functions, validation schemas, and tests.

Keep modules within one deployable application until a specific scaling or operational requirement justifies separating them.

8. Database Entities

The initial database will include:

Entity	Purpose
users	Platform user identities
tenants	Seller businesses
tenant_memberships	Users and their roles within businesses
storefront_settings	Store names, themes, logos, and settings
products	Seller product catalogues
product_images	Product image metadata
categories	Product categories
inventory	Available and reserved stock
customers	Customers associated with a seller
customer_addresses	Saved customer addresses
carts	Customer shopping carts
cart_items	Products added to carts
orders	Customer orders
order_items	Items and prices recorded at purchase time
payment_records	Customer payment transactions
subscriptions	Seller SaaS subscriptions
plans	SaaS pricing plans and entitlements
wishlist_items	Customers' saved products
shipping_records	Fulfilment and tracking details
audit_logs	Records of sensitive administrative actions

Tenant-owned tables must enforce tenant isolation through appropriate relationships, constraints, and query rules.

Financial records should preserve the relevant order and payment details. Changes to a product's current price must not modify historical order totals.

9. Authentication and Authorisation

Authentication establishes who the user is. Authorisation determines what the user is allowed to do.

Authentication

Support:

Registration.
Login and logout.
Password recovery or equivalent account recovery.
Session management.
Customer accounts.
Seller accounts.

Use a suitable authentication provider rather than building password security from scratch.

Authorisation

Use role-based access control with tenant-aware permissions.

Example:

SUPER_ADMIN
  -> Platform administration

STORE_OWNER
  -> Own store and subscription

STORE_MANAGER
  -> Own store operations

STORE_STAFF
  -> Assigned operational permissions

CUSTOMER
  -> Own profile and shopping records

Never rely only on hiding dashboard buttons. Verify permissions on every protected server-side operation.

10. Order and Checkout Workflow
Customer browses storefront
           |
           v
Adds products to cart
           |
           v
Server validates products and prices
           |
           v
Server validates stock
           |
           v
Customer enters delivery details
           |
           v
Server creates order
           |
           v
Payment is processed, if applicable
           |
           v
Payment status is verified
           |
           v
Order is confirmed
           |
           v
Seller receives notification
           |
           v
Seller processes and ships order
           |
           v
Customer tracks the order

The backend must calculate prices and totals. It must not trust financial values supplied by the browser.

Payment and order processing must be idempotent so that repeated requests or payment webhooks do not create duplicate orders or payment records.

Inventory reservation, payment failure, cancellation, and stock restoration must follow documented transactional rules.

11. Payment Architecture

The system must distinguish two financial flows.

A. Customer-to-Seller Payments

Customers pay sellers for products.

Each seller's payment configuration and the provider's supported merchant model must be considered during integration.

B. Seller-to-SaaS Payments

Sellers pay GauShilp OS for software subscriptions.

These transactions are managed through the SaaS subscription module.

Important: Customer payments and SaaS subscription payments must use separate records, workflows, and reporting.

Do not collect and redistribute funds among sellers in the initial version.

12. Storefront Routing

Each seller receives a unique store URL.

Example:

artisan-a.yourdomain.in
artisan-b.yourdomain.in
artisan-c.yourdomain.in

The application resolves the incoming hostname or store slug to a valid tenant and loads that tenant's storefront.

Custom domains can be supported after the initial subdomain-based storefront system is stable.

Storefront resolution must validate hostnames and prevent one seller from impersonating another seller's domain.

13. Security Requirements
Enforce tenant-level data isolation.
Enforce role-based permissions.
Validate all inputs on the server.
Protect private routes.
Verify payment webhook signatures.
Keep secrets out of frontend code.
Apply appropriate rate limits.
Restrict file uploads and validate file types.
Use HTTPS in production.
Maintain backups and test restoration.
Log sensitive administrative actions.
Avoid logging passwords, payment secrets, and unnecessary customer information.
Keep dependencies and infrastructure updated.

Tenant-isolation failures are release-blocking security issues.

14. Performance and Reliability

Initial engineering requirements:

Responsive storefronts for mobile devices.
Optimised product images.
Paginated product and order listings.
Database indexes for tenant-scoped queries.
Database transactions for critical order operations.
Monitoring for application errors.
Retry-safe background jobs.
Documented backup and recovery procedures.

Use caching only where its behaviour is safe for tenant-specific data.

Private customer, order, and dashboard responses must never be shared across tenants through an incorrectly configured cache.

15. Deployment Architecture

Initial deployment:

GitHub Repository
       |
       v
Automated Tests
       |
       v
Build and Validation
       |
       v
Managed Application Hosting
       |
       +------ PostgreSQL
       |
       +------ Object Storage
       |
       +------ Email Provider
       |
       +------ Payment Provider

Maintain separate development and production environments.

Use environment variables or a secure secrets manager for credentials.

Database migrations must be reviewed and tested before production deployment.

The application should have a documented rollback and database-recovery procedure.

16. Testing Strategy
Unit Tests
Price calculations.
Inventory calculations.
Order status transitions.
Permission checks.
Subscription entitlement rules.
Integration Tests
Database operations.
Product creation.
Order creation.
Payment webhook processing.
Subscription updates.
Inventory reservation and restoration.
End-to-End Tests
Seller registration.
Store creation.
Product publication.
Customer registration.
Cart and checkout.
Order confirmation.
Seller fulfilment.
Customer order tracking.
Security Tests
Cross-tenant data access.
Role-permission enforcement.
Direct API access.
File access restrictions.
Invalid payment webhooks.
Duplicate webhook processing.

All critical tenant-isolation tests must pass before release.

17. Implementation Order

Build the platform in this order:

Project setup and database foundation.
Authentication and user management.
Tenant creation and role-based permissions.
Seller onboarding and store configuration.
Product and category management.
Public storefront.
Customer accounts and saved addresses.
Cart and wishlist.
Checkout and order management.
Inventory and fulfilment.
Payment integration.
Customer notifications and order tracking.
Subscription plans and billing.
Super Admin Dashboard.
Analytics, security testing, and production hardening.

Customer accounts, order history, saved addresses, and wishlist are included in the initial product scope.

18. MVP Completion Criteria

The MVP is ready for pilot release when:

Sellers can register and create stores.
Sellers can publish and manage products.
Customers can register and log in.
Customers can browse products and maintain a wishlist.
Customers can save addresses and place orders.
Sellers can manage orders and inventory.
Customers can view order history and tracking status.
Subscription states are correctly managed.
The Super Admin can manage tenants.
All five roles have enforced permissions.
Tenant-isolation and payment tests pass.
Backups, monitoring, and recovery procedures are operational.
19. Architecture Decisions
Decision	Choice
Application style	Modular monolith
Frontend and backend	Next.js and TypeScript
Database	PostgreSQL
Database access	Prisma
Tenant model	Shared database with tenant-scoped records
Access control	Role-based access control
Dashboards	Super Admin, Seller, Customer
Storefront	Separate public shopping experience
Initial deployment	Managed application hosting
Payments	Separate seller collections and SaaS billing
Scaling strategy	Optimise the monolith before considering microservices
20. Final Architecture Principle

Build GauShilp OS as a secure, modular, multi-tenant SaaS platform.

Prioritise tenant isolation, reliable order processing, simple onboarding, and maintainable business modules.

Avoid unnecessary microservices and advanced infrastructure during the MVP stage.

Every architectural decision should support one primary objective:

Enable multiple independent businesses to operate their own online stores securely through a single SaaS platform.