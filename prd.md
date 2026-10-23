# GAUSHILP OS

## SaaS Product Requirements Document (PRD), System Architecture and Implementation Roadmap

**Document version:** 1.0
**Project type:** Multi-tenant e-commerce SaaS
**Initial market:** India
**Initial vertical:** Cow dung products, traditional handmade goods, and related natural products
**Product status:** Concept and planning
**Document date:** 21 October 2026

---

# 1. Executive Summary

## 1.1 Product vision

GauShilp OS is a SaaS platform that enables small producers and sellers of traditional handmade products to create their own branded online stores, manage products and orders, and sell directly to customers.

The first target market will be businesses selling products such as:

* Handmade cow dung diyas.
* Dhoop and havan products.
* Cow dung logs, kande, and uple.
* Cow dung statues and decorative items.
* Puja kits and festival products.
* Other traditional handmade goods.

The platform will focus on helping businesses that currently depend on WhatsApp, Instagram, offline shops, or manual order taking.

Instead of spending money on custom website development, a seller will be able to register, choose a store name, upload products, configure basic settings, and publish an online store.

## 1.2 The problem

Small product businesses often face several operational challenges:

1. They may not have a dedicated website.
2. Product information and prices may be scattered across social media posts.
3. Orders received through WhatsApp can be difficult to organise.
4. Inventory and order statuses may be tracked manually.
5. Building a customised website can require technical knowledge.
6. Online payments and delivery workflows can be difficult to configure.
7. Sellers may struggle to establish a professional brand online.

These are initial hypotheses, not proven market facts. Customer interviews must validate which problems are most significant.

## 1.3 The solution

Provide a simple, specialised platform that allows each seller to:

* Create a branded online store.
* Add and manage products.
* Display product photographs, prices, sizes, and descriptions.
* Accept and manage customer orders.
* Track inventory.
* Configure payment and delivery options.
* Share products through WhatsApp and social media.
* View basic sales and order reports.
* Manage their subscription to your SaaS.

The platform will be designed for small businesses with limited technical knowledge and limited budgets.

## 1.4 Product category

**Product:** Vertical e-commerce SaaS.

**Primary customer:** A small business that makes or sells traditional handmade and cow dung products.

**Primary value proposition:** Create an online store and manage orders without hiring a developer.

**Revenue model:** Monthly or annual software subscriptions, with optional paid add-ons later.

---

# 2. Product Scope and Business Model

Before designing the architecture, it is important to establish what kind of product we are building.

There are three possible business models.

| Model                    | Description                                          | Initial decision     |
| ------------------------ | ---------------------------------------------------- | -------------------- |
| Single-brand store       | You sell products from one company's website         | Not the core product |
| Multi-vendor marketplace | Many sellers list products in one common marketplace | Not in the MVP       |
| Multi-tenant SaaS        | Each seller gets their own store using your software | Selected model       |

## 2.1 Recommended model: Multi-tenant SaaS

Every seller becomes a tenant in your application.

A tenant is an individual business account with its own products, orders, store settings, and users.

For example:

**Your SaaS platform**

`app.gaushilp.example`

Inside the platform:

**Seller A**

`artisan-a.gaushilp.example`

Products:

* Cow dung diyas.
* Decorative statues.
* Puja kits.

**Seller B**

`artisan-b.gaushilp.example`

Products:

* Dhoop cups.
* Kande.
* Cow dung wood.

**Seller C**

`artisan-c.gaushilp.example`

Products:

* Handmade religious decorations.
* Festival bundles.
* Bulk puja products.

These are illustrative addresses; a real domain would need to be registered.

Each business uses the same underlying software, but its customer-facing storefront and business data remain separate.

## 2.2 Why not start with a marketplace?

A marketplace would introduce additional problems:

* Coordinating multiple sellers on one listing platform.
* Managing seller commissions.
* Handling split orders and settlements.
* Resolving disputes between buyers and sellers.
* Establishing marketplace-specific operational and compliance processes.

A SaaS storefront platform allows you to focus on one clear problem: helping small sellers establish and operate their own online stores.

A common marketplace can be considered after you have established demand for the SaaS itself.

---

# 3. Target Users

Identifying the right paying customers is more important than deciding which framework to use.

## 3.1 Primary target segment: Small manufacturers and artisans

### Profile

* Own or operate a small handmade-products business.
* Have approximately 1–10 people involved in production or sales.
* Sell primarily through local shops, WhatsApp, Instagram, exhibitions, or direct contacts.
* Have limited technical knowledge.
* Want to reach customers outside their local area.
* Cannot justify a costly custom website.

### Example

A small producer makes 500 handmade diyas before a major festival.

They currently sell through local shops and personal WhatsApp contacts.

With your SaaS, they could publish a product catalogue, share a store link, accept orders, and track purchases from one dashboard.

### Main needs

* An easy store setup process.
* Low operating costs.
* Simple product management.
* Easy order handling.
* Mobile-friendly administration.
* Support in a familiar language.
* Reliable checkout and order notifications.

**Priority: Highest.**

## 3.2 Secondary target segment: Gaushalas and cow-product businesses

These organisations may produce or sell:

* Cow dung products.
* Dhoop and havan materials.
* Traditional handmade items.
* Cow-based agricultural products.
* Gift sets and religious products.

Some may have multiple people responsible for production, sales, and fulfilment.

### Their needs

* Manage larger product catalogues.
* Assign users to manage orders.
* Handle bulk enquiries.
* Record product quantities.
* Maintain a professional online identity.
* Share product catalogues with institutional buyers.

**Priority: High.**

## 3.3 Third segment: Self-help groups and artisan cooperatives

Groups that produce handmade goods may need a common online storefront.

Potential requirements include:

* Multiple staff accounts.
* Centralised order management.
* Simple stock tracking.
* Seasonal product collections.
* Shared business contact details.
* Basic sales reports.

Start with a single store owned by one organisation. More sophisticated collaboration features can be added after the initial release.

**Priority: Medium.**

## 3.4 Fourth segment: Resellers and wholesale suppliers

These users might buy products from manufacturers and sell them to retailers or other businesses.

Potential future capabilities include:

* Bulk price lists.
* Minimum order quantities.
* Wholesale enquiry forms.
* Tiered pricing.
* Quotation generation.
* Repeat-order tools.

**Priority: Later.**

## 3.5 End customers

End customers are the people purchasing products from stores created on your platform.

They do not necessarily need a GauShilp account.

They should be able to browse a seller's store, select products, provide a delivery address, and place an order with minimal friction.

## 3.6 Your customer versus your customer's customer

This distinction is fundamental.

| User                                   | Relationship with GauShilp                   |
| -------------------------------------- | -------------------------------------------- |
| Artisan or producer                    | Pays for your software                       |
| Gaushala or handmade-products business | Pays for your software                       |
| Seller's staff member                  | Uses the software under the business account |
| Customer buying diyas                  | Purchases from a seller's store              |
| Platform administrator                 | Operates and supports the SaaS               |

Your sales and marketing should primarily target the businesses paying for your software.

---

# 4. Ideal Customer Profile

The initial ideal customer is:

> An Indian small-business owner who produces or resells traditional handmade products, currently manages sales through social media or manual processes, and wants an affordable branded online store without developing one from scratch.

## 4.1 Qualification criteria

A promising initial customer will usually have at least some of these characteristics:

* Already has one or more products for sale.
* Knows approximately how much each product costs to produce or purchase.
* Has customers or a distribution network.
* Can fulfil orders reliably.
* Wants to sell directly to customers.
* Is willing to learn a simple online dashboard.
* Can pay a modest recurring software fee if the platform provides sufficient value.

## 4.2 Customers to avoid targeting initially

Do not initially prioritise:

* Large enterprises requiring extensive ERP integrations.
* Sellers with thousands of SKUs and complex warehouses.
* Businesses needing a fully customised marketplace.
* Users who need extensive logistics automation from day one.
* Businesses that do not have products ready to sell.

The first release should solve a small number of problems extremely well.

---

# 5. User Personas

## Persona A: The individual artisan

**Example name:** Ramesh
**Business:** Handmade cow dung diya producer
**Technical experience:** Basic smartphone usage
**Current sales channel:** WhatsApp and local shops

### Problems

* Customers repeatedly ask for product pictures and prices.
* Orders arrive through multiple conversations.
* He has no central inventory record.
* Building a conventional website seems complicated.

### Desired result

Ramesh wants a link that he can share with customers so they can browse products and place orders.

### Important features

* Simple onboarding.
* Easy product upload.
* WhatsApp sharing.
* Basic order dashboard.
* Mobile-first interface.

## Persona B: The small brand owner

**Example name:** Neha
**Business:** Traditional puja and handmade product brand
**Technical experience:** Intermediate
**Current sales channel:** Instagram and local retailers

### Problems

* Product information is difficult to manage.
* Seasonal campaigns require frequent updates.
* Customer orders and inventory need better organisation.
* The business wants a more professional online presence.

### Desired result

Neha wants a branded store with inventory, order management, payment options, and basic sales analytics.

### Important features

* Store customisation.
* Product categories.
* Discounts and bundles.
* Inventory tracking.
* Order management.
* Customer and sales reports.

## Persona C: The organisation manager

**Example name:** Anjali
**Business:** Gaushala-based product unit
**Technical experience:** Varies across team members
**Current sales channel:** Direct sales, exhibitions, and wholesale buyers

### Problems

* Multiple people handle different parts of the business.
* Bulk requests arrive by phone.
* Production and stock must be coordinated.
* The business wants a professional sales channel.

### Desired result

Anjali wants a central system through which her team can maintain a catalogue, manage orders, and respond to bulk buyers.

### Important features

* Staff access.
* Role permissions.
* Bulk enquiries.
* Stock management.
* Order status tracking.
* Basic reporting.

---

# 6. Product Objectives

The first version should focus on measurable outcomes.

## 6.1 Business objectives

1. Acquire the first 10 pilot businesses.
2. Learn which features sellers will pay for.
3. Convert at least five pilot businesses into active stores.
4. Establish a recurring subscription model.
5. Validate the product with real orders rather than demonstrations alone.

These are initial execution targets, not forecasts of guaranteed results.

## 6.2 User objectives

A new seller should be able to:

* Register an account.
* Create a store.
* Add a product.
* Configure basic ordering options.
* Publish a storefront.
* Share the storefront link.

The core activation goal is to let a seller reach a working storefront without developer assistance.

## 6.3 Initial product success metric

**North Star Metric: Number of active stores that successfully receive at least one customer order per month.**

This measures whether the software is helping businesses sell, not simply whether people are registering.

Supporting metrics include:

* New seller registrations.
* Store creation rate.
* Time to first published product.
* Percentage of stores published.
* Number of stores receiving their first order.
* Orders per active store.
* Monthly recurring revenue.
* Paid subscriber retention.
* Subscription cancellations.
* Customer support requests per seller.

---

# 7. Functional Requirements

Requirements are grouped by priority.

* **P0:** Required for the initial release.
* **P1:** Important shortly after launch.
* **P2:** Future expansion.

## 7.1 Authentication and account management

**Priority: P0**

Users should be able to register and securely access their accounts.

Required features:

* Email or phone-based registration.
* Secure authentication.
* Password reset or an equivalent recovery process.
* User profile.
* Business account creation.
* Session management.
* Logout.

### Acceptance criteria

* A new seller can register and create a business account.
* A user cannot access dashboard pages without appropriate authentication.
* Passwords are never stored as plaintext.
* Account recovery does not reveal sensitive account information.

## 7.2 Business onboarding

**Priority: P0**

Collect only the information needed to establish a basic store.

Required fields:

* Business name.
* Store name or slug.
* Owner contact information.
* Product category.
* Business address or location information required for fulfilment.
* Preferred language.
* Basic store description.

### Acceptance criteria

* A seller can complete onboarding without assistance.
* Duplicate store slugs are rejected.
* Store names and descriptions can be changed.
* Incomplete onboarding can be resumed.

## 7.3 Storefront builder

**Priority: P0**

Every seller needs a public-facing storefront.

Features:

* Unique store URL.
* Store logo.
* Brand colours or a simple theme selection.
* About section.
* Contact information.
* Product categories.
* Featured products.
* Mobile-friendly layouts.
* Shareable product URLs.

### Example

A seller creates a store named "Shakti Handmade Products."

The platform generates a storefront URL resembling:

`shakti-handmade.yourdomain.in`

A custom domain can be introduced in a later release.

### Acceptance criteria

* The store can be published and unpublished.
* Public visitors can see only products that the seller has made available for sale.
* The storefront displays correctly on mobile devices.
* Storefront data is always associated with the correct tenant.

## 7.4 Product catalogue

**Priority: P0**

Sellers must be able to create and manage products.

Required fields:

* Product name.
* Description.
* Category.
* Price.
* Product photographs.
* Available quantity.
* SKU or internal identifier.
* Weight and dimensions when needed for shipping.
* Product status.
* Applicable usage and safety information.

Additional fields for suitable products:

* Pack size.
* Number of pieces.
* Product ingredients or materials.
* Storage instructions.
* Manufacturing or packing information where relevant.

### Acceptance criteria

* A seller can create, edit, publish, unpublish, and delete a product where permitted.
* A seller can upload and reorder product images.
* A product cannot be purchased when unavailable.
* Product prices and stock are validated server-side.
* A seller cannot read or modify another tenant's product records.

## 7.5 Order management

**Priority: P0**

The system must manage the order lifecycle.

Suggested order states:

`Pending → Confirmed → Processing → Shipped → Delivered`

Additional states:

* Cancelled.
* Failed.
* Returned.
* Refunded.

The allowed transitions should depend on payment and fulfilment status. A pending order must not be treated as delivered merely because a seller manually changes an unrelated field.

Required features:

* Order list.
* Order details.
* Buyer details.
* Purchased items and quantities.
* Order totals.
* Payment status.
* Shipping address.
* Order status updates.
* Internal notes.
* Order confirmation.

### Acceptance criteria

* A completed checkout creates a single identifiable order.
* Repeated payment-provider callbacks do not create duplicate orders.
* Inventory changes follow documented reservation and deduction rules.
* Sellers see only their own orders.
* Customers receive an appropriate confirmation.

## 7.6 Cart and checkout

**Priority: P0**

Customers should be able to select products and submit an order without needing an account on the SaaS platform.

Required features:

* Add to cart.
* Change quantities.
* Remove products.
* Enter contact information.
* Enter a delivery address.
* Review pricing and delivery charges.
* Select an available payment option.
* Submit the order.
* View a confirmation.

### Acceptance criteria

* The server recalculates prices before accepting the order.
* Product availability is validated during checkout.
* Delivery charges are calculated according to configured rules.
* Checkout rejects invalid or incomplete information.
* Failed requests do not leave inconsistent inventory or order records.

## 7.7 Payment options

**Priority: P0 for basic ordering; P1 for automated online payments**

There is an important architectural decision here.

Your SaaS will have two different kinds of payments:

1. **Subscription payments:** Sellers pay you to use GauShilp.
2. **Customer payments:** Buyers pay individual sellers for their products.

These payment flows must remain separate.

### Initial approach

For the first pilot, support a limited set of payment methods:

* Cash on Delivery, if suitable for the seller's operation.
* Seller-configured UPI or payment-link instructions.
* Manual payment status confirmation where necessary.

For the production release, add a supported method for collecting online payments directly into the seller's merchant account.

Do not assume that every payment provider supports every seller onboarding model.

### SaaS subscription payment

Your platform may eventually use a subscription-billing provider to charge sellers monthly or annually. Razorpay provides subscription APIs and webhook support that can be evaluated for this purpose.

### Important boundary

Avoid collecting money centrally and distributing settlements to many sellers in the MVP. That would introduce payment-routing, settlement, reconciliation, and additional compliance considerations.

## 7.8 Inventory management

**Priority: P0**

Required features:

* Track available stock.
* Reduce stock according to documented order rules.
* Prevent overselling.
* Restore stock when appropriate cancellations occur.
* Show out-of-stock products accurately.

Future enhancements may include:

* Inventory batches.
* Production tracking.
* Low-stock alerts.
* Raw-material inventory.
* Manufacturing costs.

Detailed manufacturing resource planning is outside the initial scope.

## 7.9 Delivery and fulfilment

**Priority: P0 for basic fulfilment; P1 for carrier integrations**

Required features:

* Seller-configured delivery rules.
* Shipping address.
* Order packing status.
* Tracking number entry.
* Dispatch date.
* Delivery status.
* Customer shipping notifications where supported.

The system must support different delivery arrangements because the catalogue can contain both light handmade items and heavier products such as cow dung logs or kande.

Carrier integration must be introduced only after checking product eligibility and shipping requirements.

## 7.10 Notifications

**Priority: P0**

Initial notifications:

* Registration confirmation.
* Order confirmation.
* New order alert to the seller.
* Order status update.
* Password or account recovery message.

Start with email and basic in-dashboard notifications.

WhatsApp notifications can follow after you choose an appropriate provider, verify message-template requirements, and establish the expected cost.

## 7.11 SaaS administration

**Priority: P0**

The platform administrator needs an internal dashboard to:

* View registered tenants.
* Suspend or reactivate stores according to documented policies.
* View plan and subscription status.
* Monitor platform errors.
* Respond to support requests.
* Review usage and system health.
* Audit sensitive administrative actions.

The administrator dashboard must not become an uncontrolled way to access customers' business information. Sensitive access should be restricted, logged, and available only when operationally necessary.

## 7.12 Subscription and feature limits

**Priority: P1**

The application will eventually have plans and feature entitlements.

Possible limits:

* Number of products.
* Number of staff accounts.
* Store customisation.
* Custom-domain support.
* Sales reports.
* Marketing integrations.
* Bulk-order features.

Enforce limits on the server rather than hiding buttons in the frontend.

---

# 8. Features Explicitly Excluded From the MVP

Do not build the following until customer validation justifies them:

* A central marketplace for all sellers.
* Native Android and iOS applications.
* AI-generated product descriptions.
* AI customer-support agents.
* Complicated warehouse management.
* Multi-warehouse inventory.
* Production planning.
* Advanced CRM.
* Loyalty points.
* Affiliate systems.
* Automatic multi-seller payouts.
* Complex tax automation.
* International shipping.
* A fully custom visual website builder.
* Enterprise ERP integration.

A strong SaaS MVP is not the one with the most features. It is the one that reliably solves an important problem for a small group of customers.

---

# 9. User Journeys

## 9.1 Seller journey

1. Seller visits the GauShilp website.
2. Seller creates an account.
3. Seller enters business details.
4. The platform creates a tenant.
5. Seller selects a store name.
6. Seller uploads the first product.
7. Seller configures basic ordering settings.
8. Seller previews the storefront.
9. Seller publishes the store.
10. Seller shares the link.
11. A customer places an order.
12. Seller receives an order notification.
13. Seller processes and fulfils the order.

### Activation definition

A tenant is considered activated once it has:

* Completed basic onboarding.
* Published at least one available product.
* Published its storefront.

A separate commercial activation metric should record when a store receives its first successful customer order.

## 9.2 Customer journey

1. Customer opens the seller's store URL.
2. Customer browses products.
3. Customer views a product detail page.
4. Customer adds a product to the cart.
5. Customer provides delivery details.
6. Customer selects an available payment method.
7. Customer confirms the order.
8. The platform records the order.
9. Customer receives confirmation and relevant updates.

Customers should not need to learn about the internal SaaS platform to purchase from a seller.

## 9.3 Subscription journey

1. Seller starts on the available free or trial plan.
2. Seller explores the dashboard.
3. Seller reaches a paid-feature limit or decides to upgrade.
4. Seller chooses a subscription plan.
5. Seller completes payment through the subscription provider.
6. A verified payment event updates the subscription state.
7. The application updates the tenant's available entitlements.

The application must handle successful payments, failed payments, cancellations, retries, and delayed webhook events.

---

# 10. System Architecture

## 10.1 Recommended architectural style

Use a **modular monolith with multi-tenant data isolation**.

Do not begin with microservices.

A modular monolith provides a single deployable application but keeps functionality organised into separate modules. This is easier to build, test, operate, and modify during the early stages.

If a particular module eventually requires independent scaling or deployment, it can be extracted later.

## 10.2 High-level architecture diagram

```text
                    SELLERS
                       |
                       v
               Seller Dashboard
                       |
                       v
CUSTOMERS ------> Storefront UI
                       |
                       v
               APPLICATION LAYER
              Next.js / TypeScript
                       |
        +--------------+--------------+
        |              |              |
        v              v              v
   Authentication   Tenant         Business
                    Resolution       Modules
                                       |
           +---------------------------+-------------------+
           |            |              |           |        |
           v            v              v           v        v
        Products      Orders       Inventory   Payments  Shipping
           |            |              |           |        |
           +------------+--------------+-----------+--------+
                                       |
                                       v
                                 PostgreSQL
                                       |
                       +---------------+---------------+
                       |               |               |
                       v               v               v
                   File Storage    Background Jobs   Audit Logs
                       |               |
                       v               v
                   Product Images   Notifications
                                           |
                               +-----------+-----------+
                               |                       |
                               v                       v
                           Email Provider          WhatsApp Provider
```

Third-party payment and shipping integrations should be separate adapter modules so that the application is not tightly coupled to one provider.

## 10.3 Frontend

### Recommended technology

* Next.js.
* TypeScript.
* Tailwind CSS.
* A reusable UI component library.
* Accessible forms and navigation.

Next.js App Router provides the current documented application structure and supports server-rendered components and server-side functionality.

### Applications within the frontend

There are two main experiences.

**A. Seller dashboard**

URL example:

`app.yourdomain.in/dashboard`

Responsible for:

* Store configuration.
* Product creation.
* Order management.
* Inventory.
* Subscription settings.
* Reports.

**B. Public storefront**

URL example:

`artisan-name.yourdomain.in`

Responsible for:

* Displaying store information.
* Showing products.
* Handling cart interactions.
* Providing checkout.
* Displaying customer order confirmations.

These experiences can exist in one application while sharing reusable components.

## 10.4 Backend

Use a modular service structure inside the application.

Recommended logical modules:

```text
src/
  modules/
    auth/
    tenants/
    memberships/
    storefronts/
    products/
    categories/
    inventory/
    customers/
    carts/
    orders/
    payments/
    shipping/
    notifications/
    subscriptions/
    analytics/
    admin/
  app/
  components/
  lib/
  database/
  integrations/
```

These are logical modules, not separate deployed microservices.

Each module should own its business logic and define how other modules interact with it.

For example, the order module should handle order creation and lifecycle rules. The payment module should verify payment events and update payment records. The subscription module should control access to paid features.

## 10.5 Database

**Recommendation: PostgreSQL.**

Use a relational database because the application will manage interconnected information about tenants, products, customers, orders, order items, payments, and subscriptions.

Use a migration-based schema-management tool and maintain explicit relationships, foreign keys, constraints, and indexes.

An ORM such as Prisma is a reasonable starting option for a TypeScript application.

## 10.6 File storage

Store uploaded product photographs in object storage rather than directly in database rows.

The database should store image metadata and object identifiers.

Requirements:

* File-size validation.
* Allowed file-type validation.
* Image resizing.
* Unique object paths.
* Tenant-aware access controls.
* Appropriate backup and retention policies.

## 10.7 Background jobs

Do not add a complex job platform immediately unless the application needs it.

Initial low-volume tasks can use a reliable scheduled or background execution mechanism.

Introduce a dedicated job queue when necessary for:

* Notifications.
* Image processing.
* Scheduled subscription checks.
* Larger reporting tasks.
* Retryable third-party integrations.

Background jobs should be idempotent wherever possible.

---

# 11. Multi-Tenant Architecture and Data Isolation

This is the most important technical concern in the entire product.

The platform will contain multiple businesses' confidential information.

A bug that allows one seller to view another seller's orders would seriously damage trust.

## 11.1 Tenant identification

Every business gets a unique tenant identifier.

Example:

```text
tenant_id = UUID
```

When an authenticated seller accesses the dashboard, the backend must determine the tenant through the user's authorised membership.

Do not accept an arbitrary tenant ID from the browser as proof of access.

For a public store, resolve the tenant through a validated store slug or configured domain.

## 11.2 Database design rule

Every tenant-owned record must be associated with a tenant.

Examples:

* Products.
* Categories.
* Store settings.
* Customers.
* Orders.
* Order items.
* Inventory records.
* Shipping settings.
* Staff memberships.

Example:

```text
products
--------
id
tenant_id
name
description
price
stock_quantity
status
created_at
updated_at
```

Use tenant-aware indexes and constraints.

For example, if product SKUs are unique only within each business, use a uniqueness constraint on the appropriate combination of `tenant_id` and `sku`.

## 11.3 Tenant isolation in application code

Every query that accesses tenant-owned data must enforce the correct tenant context.

Prefer functions whose interface requires tenant context, such as:

```text
listProducts(tenantContext)
createProduct(tenantContext, input)
getOrder(tenantContext, orderId)
updateOrderStatus(tenantContext, orderId, input)
```

The context must be created from authenticated membership or validated public-store resolution, not trusted from arbitrary user input.

Never rely only on frontend filtering.

## 11.4 Database-level protection

Consider PostgreSQL Row-Level Security as an additional protection layer.

PostgreSQL supports policies that limit which rows a database role can select or modify.

However, RLS must be implemented carefully. Database connection pooling, transaction context, application database roles, and privileged database owners all affect its security.

Use application-level tenant-scoped queries and appropriate database controls together. If RLS is enabled, test it explicitly rather than assuming it provides protection automatically.

## 11.5 Storage isolation

Object paths should use tenant-specific prefixes or equivalent access controls.

For example:

```text
tenant/<tenant-id>/products/<image-id>
```

The server must validate permissions before issuing upload or download URLs.

Do not allow a user to access a different tenant's files by changing an object key.

## 11.6 Authentication and authorisation

Use role-based access control.

Suggested roles:

* Platform administrator.
* Store owner.
* Store manager.
* Store staff.

Example permission model:

| Action              | Owner                      | Manager | Staff        |
| ------------------- | -------------------------- | ------- | ------------ |
| Edit store settings | Yes                        | Limited | No           |
| Manage products     | Yes                        | Yes     | Configurable |
| Manage orders       | Yes                        | Yes     | Configurable |
| Manage subscription | Yes                        | No      | No           |
| Invite staff        | Yes                        | Limited | No           |
| Delete store        | Yes, subject to safeguards | No      | No           |

The backend must enforce permissions even when a user manually invokes an API.

---

# 12. Database Design

The initial schema should remain small and focused.

## 12.1 Core entities

### tenants

Represents a business using the platform.

```text
id
business_name
store_slug
status
created_at
updated_at
```

### users

Represents an individual platform user.

```text
id
email
phone
name
auth_provider_id
created_at
updated_at
```

Authentication secrets should be handled by an appropriate authentication system and not stored in unsafe plaintext fields.

### tenant_memberships

Connects users to businesses.

```text
id
tenant_id
user_id
role
status
created_at
```

### storefront_settings

Stores public-facing configuration.

```text
id
tenant_id
store_name
logo_url
theme
description
contact_details
published_at
```

### products

```text
id
tenant_id
category_id
name
slug
description
price
currency
sku
status
created_at
updated_at
```

### product_images

```text
id
tenant_id
product_id
object_key
alt_text
display_order
```

### inventory

```text
id
tenant_id
product_id
available_quantity
reserved_quantity
updated_at
```

For variants such as different pack sizes, use a separate variant entity rather than adding numerous product-specific fields.

### customers

Represents customers of a seller.

```text
id
tenant_id
name
email
phone
created_at
```

### orders

```text
id
tenant_id
order_number
customer_id
status
payment_status
currency
subtotal
shipping_amount
discount_amount
tax_amount
total_amount
shipping_address_snapshot
created_at
updated_at
```

Store a suitable snapshot of the order's product and address information. A future change to a product description or customer address must not silently rewrite history.

### order_items

```text
id
tenant_id
order_id
product_id
product_name_snapshot
sku_snapshot
quantity
unit_price
line_total
```

### payment_records

```text
id
tenant_id
order_id
provider
provider_payment_id
amount
currency
status
verified_at
created_at
```

Do not store raw card credentials.

### subscriptions

Represents the seller's SaaS subscription.

```text
id
tenant_id
plan_id
provider_subscription_id
status
current_period_start
current_period_end
created_at
updated_at
```

### plans

```text
id
name
billing_interval
price
currency
limits_json
features_json
status
```

### domains

For later custom-domain support.

```text
id
tenant_id
domain
verification_status
created_at
```

### audit_logs

Records sensitive administrative and business actions.

```text
id
tenant_id
actor_user_id
action
resource_type
resource_id
metadata
created_at
```

The schema is conceptual. Field types, deletion behaviour, indexes, foreign keys, and constraints must be defined during implementation.

## 12.2 Database design requirements

* Use UUIDs or another consistently generated identifier strategy.
* Apply foreign keys where appropriate.
* Index tenant identifiers on tenant-scoped tables.
* Add appropriate compound indexes for common queries.
* Prevent duplicate payment processing using unique provider-event or payment identifiers.
* Store money in integer minor units where the currency supports that representation.
* Use transactional operations for order and inventory changes.
* Keep audit records for sensitive actions.
* Define retention and deletion rules for customer data.

---

# 13. API Design

Use versioned server endpoints where a separate API surface is useful.

A possible structure is:

```text
/api/v1/auth
/api/v1/tenants
/api/v1/storefront
/api/v1/products
/api/v1/categories
/api/v1/inventory
/api/v1/customers
/api/v1/cart
/api/v1/checkout
/api/v1/orders
/api/v1/payments
/api/v1/shipping
/api/v1/subscriptions
/api/v1/admin
```

Next.js Route Handlers can support HTTP endpoints within the application.

## 13.1 Example endpoints

### Seller onboarding

```text
POST /api/v1/tenants
GET  /api/v1/tenants/current
PATCH /api/v1/tenants/current
```

### Products

```text
GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/products/:productId
PATCH  /api/v1/products/:productId
DELETE /api/v1/products/:productId
```

### Orders

```text
GET  /api/v1/orders
GET  /api/v1/orders/:orderId
POST /api/v1/orders
PATCH /api/v1/orders/:orderId/status
```

### Public storefront

```text
GET /api/v1/storefront/:slug
GET /api/v1/storefront/:slug/products
POST /api/v1/storefront/:slug/checkout
```

### Subscription

```text
GET  /api/v1/subscription
POST /api/v1/subscription/checkout
POST /api/v1/webhooks/subscriptions/:provider
```

These are example contracts. The final design should use schemas for request validation, consistent error responses, and documented authentication requirements.

## 13.2 API security requirements

Every endpoint must define:

* Whether the route is public.
* Whether authentication is required.
* The applicable tenant context.
* Required permissions.
* Request validation.
* Rate limits.
* Expected error states.
* Audit requirements.

Webhook routes must verify signatures and reject invalid events.

---

# 14. Order Processing and Payment Architecture

Payment workflows must be designed to avoid duplicate orders and inconsistent financial records.

## 14.1 Recommended checkout flow

```text
Customer adds products
          |
          v
Server validates product IDs
          |
          v
Server loads current prices
          |
          v
Server validates stock
          |
          v
Server calculates order total
          |
          v
Order created with initial state
          |
          v
Payment flow, if applicable
          |
          v
Verified payment event
          |
          v
Order/payment state updated
          |
          v
Seller notification
          |
          v
Fulfilment and dispatch
```

Do not trust product prices or calculated totals supplied by the browser.

## 14.2 Webhook processing

Payment and subscription providers can send duplicate events or retry events after timeouts.

Use an idempotent processing approach:

1. Receive the webhook.
2. Validate the provider signature.
3. Record the event identifier.
4. Detect previously processed events.
5. Verify the relevant payment or subscription state.
6. Update the relevant records transactionally.
7. Schedule notifications or other follow-up tasks.
8. Return the appropriate response.

Never consider a payment successful merely because the browser reports success.

## 14.3 Seller payments versus SaaS billing

Keep separate modules, database models, access controls, and reporting for:

* Money paid by a seller to GauShilp.
* Money paid by a customer to that seller.

This separation avoids mixing software revenue with seller sales.

If you later decide to operate a marketplace or handle settlements for sellers, obtain appropriate technical, payment-provider, and legal guidance before changing the model.

---

# 15. Technology Stack

The initial stack should optimise for development speed, type safety, maintainability, and a small operational burden.

| Layer            | Recommended option                                                 | Reason                              |
| ---------------- | ------------------------------------------------------------------ | ----------------------------------- |
| Frontend         | Next.js + TypeScript                                               | Full-stack React application        |
| UI styling       | Tailwind CSS                                                       | Consistent, responsive UI           |
| Components       | Accessible component library                                       | Faster implementation               |
| Backend          | Next.js Route Handlers and server-side modules                     | Single application at MVP stage     |
| Database         | PostgreSQL                                                         | Relational data and transactions    |
| ORM              | Prisma                                                             | Schema and migration workflow       |
| Authentication   | Managed auth provider or carefully implemented Auth.js-based setup | Avoid reinventing security          |
| Object storage   | S3-compatible service                                              | Store product images                |
| Validation       | TypeScript schemas, such as Zod                                    | Validate requests at boundaries     |
| Payments         | Appropriate Indian payment provider                                | Seller collections and SaaS billing |
| Email            | Transactional email provider                                       | Order and account messages          |
| Error monitoring | Managed exception-monitoring service                               | Detect failures                     |
| Analytics        | Privacy-conscious product analytics                                | Measure activation and engagement   |
| Hosting          | Managed application hosting                                        | Reduce operational work             |
| Source control   | GitHub                                                             | Version history and collaboration   |
| Deployment       | Automated CI/CD                                                    | Repeatable releases                 |

These are recommendations, not mandatory dependencies.

Choose vendors after checking pricing, supported regions, security requirements, and production compatibility.

## 15.1 Why this stack?

The stack reduces the number of independently managed services.

It supports a common TypeScript language across frontend and backend code, while PostgreSQL provides a strong basis for managing relational commerce data.

The App Router and current Next.js conventions are documented by the framework maintainers.

## 15.2 What not to use initially

Avoid introducing these without a specific requirement:

* Kubernetes.
* Multiple microservices.
* A separate database for every seller.
* A complicated event-streaming platform.
* Multiple caching systems.
* Several overlapping ORM or state-management libraries.

A managed application, one PostgreSQL database, object storage, and reliable deployment automation should be sufficient to validate the initial product.

---

# 16. Product Design Requirements

The product should be approachable to users with limited technical experience.

## 16.1 Design principles

### Mobile-first

Many initial users may operate their businesses primarily using smartphones.

The seller dashboard must support mobile screens as a first-class experience, not merely shrink the desktop interface.

### Simple language

Avoid unnecessary technical terminology.

Instead of:

"Configure inventory allocation."

Use:

"Set available stock."

Instead of:

"Provision your tenant."

Use:

"Create your store."

### Fast onboarding

Ask only for the information required to get started.

Additional information can be collected when sellers enable relevant features.

### Product templates

Provide templates for common categories such as:

* Diyas.
* Dhoop and havan products.
* Decorative statues.
* Puja kits.
* Kande and cow dung wood.

Templates should prefill suitable product fields, units, and suggested information. They should not invent material, safety, or quality claims.

### Language support

Start with English and evaluate Hindi support with real users.

Keep the application structured so that additional languages can be introduced without rewriting the interface.

---

# 17. Subscription and Pricing Strategy

Do not finalise SaaS pricing based on guesses alone.

Interview potential customers and test willingness to pay.

## 17.1 Initial plan structure

Use the following as a pricing hypothesis for customer interviews.

### Free or trial plan

Possible features:

* One store.
* Limited number of products.
* Basic storefront.
* Manual order management.
* Standard store URL.

Purpose: reduce onboarding friction.

### Starter plan

Possible features:

* Higher product limits.
* Store branding.
* Order management.
* Basic inventory.
* Basic reports.

### Growth plan

Possible features:

* More staff accounts.
* Advanced store customisation.
* Bulk enquiry tools.
* Enhanced reports.
* Custom domain.
* Additional integrations.

## 17.2 Price testing

For initial research, test several possible monthly price points with target businesses rather than presenting one fixed price as established.

Ask prospective customers:

* Would you use this platform?
* Which features are valuable enough to pay for?
* What are you currently paying for software or website services?
* Would you prefer monthly or yearly payment?
* What would make you cancel?
* Would a free trial change your decision?

A low introductory price is not automatically the right strategy. Your price needs to reflect customer value, support requirements, and operational costs.

## 17.3 Revenue sources

Initial:

* Monthly or annual subscriptions.

Potential future sources:

* Custom-domain add-ons.
* Premium themes.
* Assisted store setup.
* Additional messaging capacity.
* Paid integrations.
* Advanced wholesale features.

Do not introduce transaction commissions until the payment model and customer expectations have been validated.

---

# 18. Non-Functional Requirements

These requirements affect the quality of the entire system.

## 18.1 Security

* Enforce tenant isolation on every private data path.
* Apply authentication and role-based authorisation.
* Validate all server-side inputs.
* Store provider secrets securely.
* Verify webhook signatures.
* Apply rate limits where appropriate.
* Maintain security logs.
* Protect sensitive administrative operations.
* Keep dependencies patched.

## 18.2 Reliability

* Use database transactions for critical order operations.
* Prevent duplicate webhook processing.
* Use backups with a tested restoration procedure.
* Monitor application errors.
* Make background jobs retry-safe.
* Handle provider outages gracefully.

## 18.3 Performance

Initial targets, to be verified through testing:

* Public product pages should generally render within approximately 2.5 seconds on a representative mobile connection.
* Seller dashboard navigation should feel responsive for small catalogues.
* Product listing endpoints should avoid unbounded queries.
* Images should be optimised.
* Pagination should be used where lists can grow significantly.

These are initial engineering goals, not measured performance claims.

## 18.4 Scalability

Use a shared database and application initially, but keep module boundaries clear.

Potential future scaling improvements:

* CDN caching for public images and appropriate storefront content.
* Database connection pooling.
* Query optimisation.
* Background job queues.
* Read replicas where justified.
* Dedicated deployments for selected workloads if needed.

## 18.5 Data protection

* Collect only necessary customer information.
* Restrict staff access by role.
* Avoid logging credentials or payment secrets.
* Define customer-data retention policies.
* Provide appropriate account and data-deletion workflows.
* Review applicable Indian privacy and e-commerce obligations before production launch.

---

# 19. Testing Strategy

Testing must cover both ordinary functionality and tenant isolation.

## 19.1 Unit tests

Test:

* Price calculations.
* Stock calculations.
* Order status transitions.
* Permission checks.
* Subscription entitlement logic.
* Shipping calculations.
* Input validation.

## 19.2 Integration tests

Test:

* Product creation and database persistence.
* Order creation.
* Inventory updates.
* Payment webhook processing.
* Subscription status changes.
* Notification scheduling.
* Database transactions.

## 19.3 End-to-end tests

Simulate a complete seller and buyer journey:

1. Register a seller.
2. Create a store.
3. Add a product.
4. Publish the store.
5. Open the store as a customer.
6. Place an order.
7. Confirm the order appears in the seller dashboard.
8. Change its status.
9. Verify customer notifications.

## 19.4 Multi-tenant security tests

Create at least two independent test tenants.

Tenant A must not be able to access Tenant B's:

* Products through private APIs.
* Orders.
* Customer records.
* Inventory.
* Store settings.
* Uploaded files.
* Subscription information.

Test direct URL manipulation, API calls, guessed object identifiers, and staff permissions.

Cross-tenant isolation should be treated as a release-blocking requirement.

## 19.5 Payment tests

Test:

* Successful payments.
* Failed payments.
* Cancelled checkouts.
* Duplicate webhooks.
* Delayed webhooks.
* Invalid webhook signatures.
* Amount mismatches.
* Refund handling.
* Subscription cancellation.

Never test live financial transactions without the required safeguards and authorisation.

---

# 20. Implementation Plan

The first production-oriented version should be delivered incrementally.

The following roadmap assumes one experienced full-stack developer working consistently, with occasional design or business support. A beginner or part-time developer should allow more time.

## Phase 0: Customer discovery

**Duration:** Week 1

### Tasks

* Interview 15–20 target businesses.
* Observe their current order-taking workflow.
* Identify their most frequent operational problems.
* Determine which functions they would pay for.
* Test willingness to adopt a SaaS product.
* Identify 5–10 potential pilot users.

### Deliverables

* Customer interview notes.
* Initial customer personas.
* Ranked list of customer problems.
* Initial pricing hypotheses.
* Pilot-customer shortlist.

### Exit criteria

Proceed when you have evidence that a specific problem is common enough and valuable enough to solve.

Do not interpret polite interest as proof of willingness to pay. Ask potential users to commit to a pilot or concrete next step.

## Phase 1: Product definition and UX

**Duration:** Week 2

### Tasks

* Finalise the MVP scope.
* Create user flows.
* Design the onboarding experience.
* Design seller dashboard wireframes.
* Design storefront wireframes.
* Define product and order data models.
* Define initial subscription entitlements.
* Write acceptance criteria for key features.

### Deliverables

* Approved PRD.
* Wireframes or clickable prototype.
* Database diagram.
* API outline.
* Initial design system.

### Exit criteria

A target user can understand how they would create a store and receive an order from the prototype.

## Phase 2: Application foundation

**Duration:** Weeks 3–4

### Tasks

* Set up the repository.
* Configure development and production environments.
* Create the Next.js application.
* Configure PostgreSQL and database migrations.
* Implement authentication.
* Implement tenant creation and membership.
* Implement tenant-scoped data access.
* Add initial logging and error monitoring.
* Set up automated tests and deployment.

### Deliverables

* Working development environment.
* Authentication workflow.
* Tenant management.
* Core database schema.
* Initial CI/CD pipeline.
* Basic security tests.

### Exit criteria

Two test tenants can be created independently, and tenant-isolation tests pass.

## Phase 3: Storefront and catalogue

**Duration:** Weeks 5–6

### Tasks

* Build seller onboarding.
* Build store configuration.
* Implement unique store slugs.
* Build product creation and editing.
* Implement image upload.
* Build public product pages.
* Implement mobile-responsive layouts.
* Implement publishing and unpublishing.

### Deliverables

* Sellers can create stores.
* Sellers can manage products.
* Public visitors can browse published storefronts.
* Product ownership and permissions are enforced.

### Exit criteria

A pilot seller can publish a functional store without developer intervention.

## Phase 4: Cart, checkout, and order management

**Duration:** Weeks 7–8

### Tasks

* Implement cart operations.
* Implement server-side price calculation.
* Implement checkout validation.
* Create orders and order items.
* Implement stock validation and reservation rules.
* Build the order dashboard.
* Implement status changes.
* Add order confirmation.
* Add basic notifications.

### Deliverables

* End-to-end purchasing workflow.
* Order dashboard.
* Inventory updates.
* Customer confirmation.
* Seller order notifications.

### Exit criteria

A test customer can place an order and the seller can fulfil it through the dashboard.

## Phase 5: Payments and commercial readiness

**Duration:** Week 9

### Tasks

* Implement an appropriate initial customer-payment method.
* Implement subscription entitlement logic.
* Integrate the selected subscription payment provider, if ready.
* Verify webhook signatures.
* Implement idempotent payment processing.
* Add subscription status handling.
* Prepare pricing and policy pages.
* Confirm the intended payment flows with the selected provider.

### Deliverables

* A functioning initial payment workflow.
* Subscription state management.
* Documented payment-event handling.
* Clear separation between seller revenue and SaaS revenue.

### Exit criteria

Payment states are verified on the server, and duplicate events do not create duplicate financial records.

## Phase 6: Pilot and hardening

**Duration:** Weeks 10–11

### Tasks

* Onboard 5–10 pilot businesses.
* Enter real product catalogues.
* Test customer checkout.
* Test mobile usage.
* Check tenant isolation.
* Test backups and restoration.
* Review error logs.
* Improve confusing screens.
* Document known limitations.
* Correct launch-blocking issues.

### Deliverables

* A pilot-ready platform.
* Customer feedback report.
* Bug list and fixes.
* Support process.
* Deployment and recovery checklist.

### Exit criteria

Pilot businesses can publish stores and process real orders safely and reliably.

## Phase 7: Public MVP release

**Duration:** Week 12

### Tasks

* Publish the initial pricing.
* Open registration to a controlled audience.
* Set up product analytics.
* Review support requests daily.
* Measure store activation.
* Contact customers who fail onboarding.
* Evaluate the first paying customers.
* Prioritise the next development cycle.

### Deliverables

* Public MVP.
* First cohort of users.
* Product usage metrics.
* Initial paid conversions or documented pricing feedback.
* Prioritised post-launch roadmap.

---

# 21. Release Criteria

The product should not be considered ready merely because its interface looks complete.

## Product readiness

* Sellers can register.
* Sellers can create and publish stores.
* Sellers can manage products.
* Customers can place orders.
* Sellers can manage order statuses.
* Customer notifications work.
* Subscription states are represented correctly.

## Security readiness

* Tenant-isolation tests pass.
* Staff permissions are enforced.
* Webhook signatures are verified.
* Secrets are not exposed to the browser.
* Public and private endpoints are distinguished.
* Backup restoration has been tested.

## Operational readiness

* Errors can be monitored.
* Product and order support procedures exist.
* Policies are published.
* Test orders complete successfully.
* Delivery procedures are documented.
* Known limitations are communicated to pilot users.

---

# 22. First 90-Day Execution Plan

The initial 90 days should focus on product validation, a functioning MVP, and evidence of customer adoption.

## Days 1–14: Validate

* Interview potential sellers.
* Identify the strongest use case.
* Select initial product categories.
* Make wireframes.
* Obtain pilot-user commitments.

**Goal:** Confirm a specific problem and establish the initial scope.

## Days 15–45: Build the core

* Implement authentication.
* Implement tenant management.
* Build the storefront.
* Build product management.
* Build the order workflow.
* Start automated testing.

**Goal:** A seller can publish a store and receive a test order.

## Days 46–60: Complete the MVP

* Add payment and subscription workflows.
* Finish notifications.
* Improve error handling.
* Test security and recovery.
* Onboard initial pilot sellers.

**Goal:** Pilot businesses can use the product for real orders.

## Days 61–90: Measure and improve

* Review onboarding completion.
* Interview active and inactive sellers.
* Analyse early subscription conversion.
* Identify missing features.
* Refine the pricing model.
* Improve the highest-friction workflows.

**Goal:** Determine whether the product is solving a sufficiently valuable problem for paying customers.

---

# 23. Product Risks and Mitigations

| Risk                                    | Why it matters                                     | Mitigation                                                                                                             |
| --------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Sellers will not pay for the platform   | The SaaS model depends on recurring revenue        | Test pricing and willingness to pay before investing in advanced features                                              |
| The target market is too narrow         | Acquisition could be difficult                     | Start with cow-based handmade products, then expand to adjacent traditional product makers if the same workflows apply |
| Sellers lack technical confidence       | Complex onboarding leads to inactive stores        | Make the product mobile-first and offer product templates                                                              |
| Sellers already depend on WhatsApp      | Switching costs may be high                        | Make the platform complementary to WhatsApp and provide shareable store links                                          |
| Delivery costs undermine sales          | Sellers may blame the platform for poor fulfilment | Make weights, dimensions, delivery rules, and tracking configurable                                                    |
| Cross-tenant data leakage               | A serious security failure can destroy trust       | Enforce tenant isolation throughout the application and test it continuously                                           |
| Payment integration becomes too complex | Seller onboarding and reconciliation become harder | Separate SaaS subscription billing from seller collections                                                             |
| Product scope keeps growing             | Development slows and costs increase               | Enforce P0/P1/P2 prioritisation                                                                                        |
| Sellers require extensive customisation | Support burden grows                               | Keep the initial themes and configurations standardised                                                                |

---

# 24. Long-Term Roadmap

## Release 1: Storefront SaaS

Focus:

* Store creation.
* Product catalogues.
* Checkout.
* Orders.
* Basic inventory.
* Customer notifications.

## Release 2: Business management

Focus:

* Better inventory tools.
* Staff permissions.
* Advanced sales reports.
* Bulk enquiries.
* Coupons.
* Improved customer communication.

## Release 3: Growth tools

Focus:

* Custom domains.
* Additional payment and shipping integrations.
* SEO assistance.
* Enhanced themes.
* Subscription upgrades.
* More languages.
* Automated reminders.

## Release 4: Vertical commerce capabilities

Focus:

* Wholesale catalogues.
* Bulk pricing.
* Product bundles.
* Production-oriented workflows.
* Optional supplier-management tools.
* Integrations with compatible accounting and operational systems.

## Release 5: Optional ecosystem

Only after the core SaaS has proven itself, evaluate:

* A common product discovery marketplace.
* Supplier directories.
* Merchant collaboration.
* Referral programmes.
* Additional distribution channels.

The core SaaS should remain useful even if the marketplace never gets built.

---

# 25. Immediate Next Steps

The project should begin with the following concrete deliverables.

### Deliverable 1: Customer validation

Interview at least 15–20 small sellers and determine the top three problems worth solving.

### Deliverable 2: MVP scope

Confirm the initial release includes only:

1. Authentication.
2. Tenant and store creation.
3. Product management.
4. Public storefront.
5. Cart and checkout.
6. Order management.
7. Basic inventory.
8. Initial payment options.
9. Basic SaaS administration.

### Deliverable 3: UX prototype

Design the main screens before implementing the complete backend.

### Deliverable 4: Architecture and schema

Finalise the database schema, authentication method, tenant-isolation strategy, hosting, and third-party integrations.

### Deliverable 5: Technical foundation

Create the repository, configure automated testing, and implement tenant isolation before building complex commerce features.

### Deliverable 6: Pilot

Onboard the first businesses and observe whether they can create stores and receive orders without extensive assistance.

---

# Final Product Recommendation

Build GauShilp OS as a niche, multi-tenant e-commerce SaaS for small businesses selling cow dung and related traditional handmade products.

Start with a modular monolith using Next.js, TypeScript, and PostgreSQL.

Make tenant isolation a core architectural requirement from the beginning. Keep seller payments separate from SaaS subscription billing, and do not build a marketplace in the first release.

Most importantly, validate the business model before building the entire platform.

**The first milestone is not completing hundreds of features. It is getting five real businesses to publish stores and successfully receive customer orders through your software.**

That evidence will give you a stronger basis for the next round of development, pricing decisions, and market expansion.
