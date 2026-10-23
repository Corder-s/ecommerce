# GauShilp OS — API Specification

**Version:** 2.0 (Step 12: Super Admin APIs and Platform Analytics)  
**Base URL:** `/api/v1`  
**Swagger UI:** `http://localhost:4000/api/v1/docs`  

---

## 1. Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | Yes (for protected endpoints) | `Bearer <JWT>` issued by verified identity provider |
| `x-tenant-id` | Yes (for tenant endpoints) | Tenant identifier (e.g. `tenant-uuid`) |
| `x-correlation-id` | Optional | Client request tracing ID (auto-generated if missing) |

---

## 2. System & Health Endpoints

### `GET /api/v1/health`
* **Access**: Public
* **Description**: Full health assessment, memory metrics, and dependency statuses.

### `GET /api/v1/health/liveness`
* **Access**: Public
* **Description**: Container orchestrator liveness probe (`{ "status": "ok", "uptime": ... }`).

### `GET /api/v1/health/readiness`
* **Access**: Public
* **Description**: Traffic routing readiness probe (`{ "status": "ok", "ready": true }`).

---

## 3. Authentication & Profile Endpoints

### `GET /api/v1/auth/me`
* **Access**: Authenticated (Any verified user)
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Returns authenticated profile and active tenant memberships.

### `GET /api/v1/auth/admin/overview`
* **Access**: Platform Super Admin (`platformRole: SUPER_ADMIN`)
* **Headers**: `Authorization: Bearer <token>`

---

## 4. Store Management Endpoints

### `GET /api/v1/stores/current`
* **Access**: Authenticated Store Member (`STORE_OWNER`, `STORE_MANAGER`, `STORE_STAFF`)
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Description**: Retrieves store configuration, branding, and status.

### `PATCH /api/v1/stores/current`
* **Access**: Store Owner only (`STORE_OWNER`)
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Request Body**:
  ```json
  {
    "businessName": "Vedic Handmade Diyas",
    "description": "Organic cow dung and clay artifacts",
    "logoUrl": "https://media.gaushilp.example/logo.png",
    "contactEmail": "support@store.example",
    "contactPhone": "+919876543210",
    "address": "Vrindavan, Uttar Pradesh",
    "currency": "INR"
  }
  ```

### `POST /api/v1/stores/current/publish`
* **Access**: Store Owner only (`STORE_OWNER`)
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Description**: Publishes store so it becomes accessible to public customers.

### `POST /api/v1/stores/current/unpublish`
* **Access**: Store Owner only (`STORE_OWNER`)
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Description**: Takes store offline from public storefront.

---

## 5. Public Storefront Endpoints

### `GET /api/v1/public/stores/:slug`
* **Access**: Public (Unauthenticated)
* **Description**: Retrieves public store profile by unique `storeSlug`.
* **Errors**: `404 Not Found` if store is unpublished or does not exist.

### `GET /api/v1/public/stores/:slug/products`
* **Access**: Public (Unauthenticated)
* **Query Parameters**:
  * `page` (default: 1)
  * `limit` (default: 20)
  * `categoryId` (optional filter)
* **Description**: Returns paginated list of **published** products. Drafts and archived products are excluded.

---

## 6. Product Category Endpoints

### `GET /api/v1/categories`
* **Access**: Authenticated Store Member (`STORE_OWNER`, `STORE_MANAGER`, `STORE_STAFF`)
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Description**: Lists all categories in the store with product counts.

### `POST /api/v1/categories`
* **Access**: Store Owner / Manager (`STORE_OWNER`, `STORE_MANAGER`)
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Request Body**:
  ```json
  {
    "name": "Handmade Diyas",
    "slug": "handmade-diyas",
    "description": "Traditional diyas for festivals"
  }
  ```
* **Response (201)**: Created category object.

### `PATCH /api/v1/categories/:id`
* **Access**: Store Owner / Manager (`STORE_OWNER`, `STORE_MANAGER`)
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Request Body**: Partial category update.

### `DELETE /api/v1/categories/:id`
* **Access**: Store Owner / Manager (`STORE_OWNER`, `STORE_MANAGER`)
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Description**: Deletes a category.
* **Safety Restriction**: Returns `400 Bad Request` if category contains products. Products must be reassigned first.

---

## 7. Product Catalogue Endpoints

### `GET /api/v1/products`
* **Access**: Authenticated Store Member (`STORE_OWNER`, `STORE_MANAGER`, `STORE_STAFF`)
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 20)
  * `status` (`DRAFT` | `PUBLISHED` | `ARCHIVED`)
  * `categoryId` (UUID)
  * `search` (text search in name, description, SKU)
* **Response (200)**: Paginated product list with metadata.

### `GET /api/v1/products/:id`
* **Access**: Authenticated Store Member
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Errors**: `404 Not Found` if product does not belong to the authorized tenant.

### `POST /api/v1/products`
* **Access**: Store Owner / Manager (`STORE_OWNER`, `STORE_MANAGER`)
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Request Body**:
  ```json
  {
    "name": "Cow Dung Diya (Pack of 12)",
    "slug": "cow-dung-diya-pack-of-12",
    "description": "Natural cow dung diyas for Diwali",
    "price": 199.50,
    "currency": "INR",
    "sku": "DIYA-12PK",
    "categoryId": "category-uuid",
    "status": "DRAFT",
    "images": ["products/diya-front.jpg"]
  }
  ```
* **Validation**:
  * Price must be non-negative (`>= 0`).
  * `categoryId` must belong to the authorized tenant (cross-tenant category assignment rejected with `400 Bad Request`).
  * `slug` and `sku` must be unique within the tenant (`409 Conflict`).

### `PATCH /api/v1/products/:id`
* **Access**: Store Owner / Manager (`STORE_OWNER`, `STORE_MANAGER`)
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Request Body**: Partial product update.
* **Validation**: Revalidates category ownership if `categoryId` is modified.

### `DELETE /api/v1/products/:id`
* **Access**: Store Owner / Manager (`STORE_OWNER`, `STORE_MANAGER`)
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>`
* **Description**: Archives the product (`status: ARCHIVED`) to maintain historical order consistency.

---

## 8. Customer Management Endpoints

All customer endpoints operate on the authenticated caller identity (`@CurrentUser()`). Client-supplied user IDs are rejected / ignored to prevent account hijacking.

### 8.1 Customer Profile

#### `GET /api/v1/customers/me`
* **Access**: Authenticated Customer (`PlatformRole: USER` / `SUPER_ADMIN`)
* **Headers**: `Authorization: Bearer <token>`
* **Response (200)**: Customer account details, contact info, and profile metadata.

#### `PATCH /api/v1/customers/me`
* **Access**: Authenticated Customer
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "name": "Arjun Sharma",
    "phone": "+919876543210",
    "avatarUrl": "https://images.example.com/arjun.jpg",
    "bio": "Handmade pottery enthusiast",
    "dateOfBirth": "1992-05-15T00:00:00.000Z",
    "preferences": {
      "orderUpdatesSms": true,
      "newsletter": false
    },
    "isActive": true
  }
  ```
* **Validation**:
  * Phone must be 10-15 digits.
  * Bio cannot exceed 500 characters.
  * `isActive: false` automatically records deactivation timestamp (`deactivatedAt: Date`).

---

### 8.2 Saved Delivery Addresses

#### `GET /api/v1/customers/me/addresses`
* **Access**: Authenticated Customer
* **Headers**: `Authorization: Bearer <token>`
* **Response (200)**: List of saved customer addresses ordered with default address first.

#### `POST /api/v1/customers/me/addresses`
* **Access**: Authenticated Customer
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "fullName": "Arjun Sharma",
    "phone": "+919876543210",
    "addressLine1": "Flat 402, Vrindavan Heights",
    "addressLine2": "Sector 5, Govardhan Enclave",
    "city": "Mathura",
    "state": "Uttar Pradesh",
    "postalCode": "281001",
    "country": "IN",
    "landmark": "Opposite ISKCON Temple",
    "isDefault": true,
    "addressType": "HOME"
  }
  ```
* **Validation**:
  * `postalCode` must be 3-10 alphanumeric characters.
  * First address created is automatically set as default (`isDefault: true`).
  * Setting `isDefault: true` unsets `isDefault` on all other addresses of this customer in an atomic transaction.

#### `PATCH /api/v1/customers/me/addresses/:addressId`
* **Access**: Address Owner only
* **Headers**: `Authorization: Bearer <token>`
* **Errors**: `404 Not Found` if address does not exist or belongs to another customer.

#### `DELETE /api/v1/customers/me/addresses/:addressId`
* **Access**: Address Owner only
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Removes address. If default was deleted, the newest remaining address is automatically promoted to default.

#### `PATCH /api/v1/customers/me/addresses/:addressId/default`
* **Access**: Address Owner only
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Atomically marks `:addressId` as the default address.

---

### 8.3 Customer Wishlist

#### `GET /api/v1/customers/me/wishlist`
* **Access**: Authenticated Customer
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 20)
* **Response (200)**:
  * Includes product details, category, and store branding.
  * Invariant: `isPurchasable` evaluates `product.status === 'PUBLISHED' && store.isPublished && store.status === 'ACTIVE'`. Unpublished/draft products are never returned as purchasable.

#### `POST /api/v1/customers/me/wishlist`
* **Access**: Authenticated Customer
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "productId": "product-uuid"
  }
  ```
* **Validation & Safety Rules**:
  * Product must exist (`404 Not Found`).
  * Archived products rejected (`400 Bad Request`).
  * Suspended store products rejected (`400 Bad Request`).
  * Duplicate addition rejected with `409 Conflict`.

#### `DELETE /api/v1/customers/me/wishlist/:itemId`
* **Access**: Wishlist Owner only
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Removes item by wishlist item ID or product ID. Returns `404 Not Found` if not owned by caller.

---

## 9. Shopping Cart APIs

Shopping Cart endpoints allow customers to manage line items across multiple seller stores, with server-trusted subtotal calculations and monetary minor-unit precision. Cart records are non-reserving.

### 9.1 `GET /api/v1/cart`
* **Access**: Authenticated Customer
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Retrieves or automatically creates the customer's active cart. Recalculates subtotals from current database product prices and flags any pricing changes since items were placed into cart.
* **Response (200 OK)**:
  ```json
  {
    "id": "c0000000-0000-4000-8000-000000000001",
    "currency": "INR",
    "itemCount": 3,
    "distinctItemCount": 2,
    "subtotal": {
      "currency": "INR",
      "amount": 450,
      "minorUnits": 45000,
      "formatted": "INR 450.00"
    },
    "estimatedTax": {
      "isCalculated": false,
      "amount": null,
      "minorUnits": null,
      "message": "Tax will be calculated based on seller GST configuration at checkout"
    },
    "estimatedShipping": {
      "isCalculated": false,
      "amount": null,
      "minorUnits": null,
      "message": "Shipping fee determined by seller fulfillment rules at checkout"
    },
    "estimatedTotal": {
      "currency": "INR",
      "amount": 450,
      "minorUnits": 45000,
      "formatted": "INR 450.00"
    },
    "sellers": [
      {
        "id": "tenant-1",
        "businessName": "Vedic Pottery",
        "storeSlug": "vedic-pottery",
        "isPublished": true
      }
    ],
    "items": [
      {
        "id": "item-1",
        "productId": "a0000000-0000-4000-8000-000000000001",
        "quantity": 2,
        "unitPrice": {
          "currency": "INR",
          "amount": 150,
          "minorUnits": 15000,
          "formatted": "INR 150.00"
        },
        "subtotal": {
          "currency": "INR",
          "amount": 300,
          "minorUnits": 30000,
          "formatted": "INR 300.00"
        },
        "priceChanged": false,
        "previousPrice": null,
        "product": {
          "id": "a0000000-0000-4000-8000-000000000001",
          "name": "Handcrafted Clay Diya",
          "slug": "handcrafted-clay-diya",
          "sku": "DIY-01",
          "status": "PUBLISHED",
          "images": [],
          "isAvailable": true,
          "store": {
            "id": "tenant-1",
            "businessName": "Vedic Pottery",
            "storeSlug": "vedic-pottery",
            "isPublished": true
          }
        },
        "createdAt": "2026-10-22T10:00:00.000Z",
        "updatedAt": "2026-10-22T10:00:00.000Z"
      }
    ],
    "updatedAt": "2026-10-22T10:00:00.000Z"
  }
  ```

### 9.2 `POST /api/v1/cart/items`
* **Access**: Authenticated Customer
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "productId": "a0000000-0000-4000-8000-000000000001",
    "quantity": 2
  }
  ```
* **Validation & Safety Rules**:
  * `productId`: Valid UUID v4 required (`400 Bad Request`).
  * `quantity`: Integer between 1 and 50 (default: 1).
  * Product must exist (`404 Not Found`).
  * Product must have status `PUBLISHED` (`400 Bad Request`).
  * Seller store must be published and `ACTIVE` (`400 Bad Request`).
  * Duplicate cart additions automatically increment quantity on existing item up to maximum purchase limit of 50.
  * Price is strictly fetched from database; client-submitted price is ignored.
* **Response**: `201 Created` with refreshed `CartSummary`.

### 9.3 `PATCH /api/v1/cart/items/:itemId`
* **Access**: Cart Item Owner only
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "quantity": 3
  }
  ```
* **Validation & Security**:
  * `quantity`: Integer between 1 and 50.
  * Verifies ownership: Returns `404 Not Found` if `:itemId` does not belong to caller's cart (IDOR prevention).
  * Re-checks product status and store availability.
* **Response**: `200 OK` with updated `CartSummary`.

### 9.4 `DELETE /api/v1/cart/items/:itemId`
* **Access**: Cart Item Owner only
* **Headers**: `Authorization: Bearer <token>`
* **Security**: Returns `404 Not Found` if item does not exist or belongs to another customer's cart.
* **Response**: `200 OK` with updated `CartSummary`.

### 9.5 `DELETE /api/v1/cart/items`
* **Access**: Authenticated Customer
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Atomically removes all items from the customer's cart.
* **Response**: `200 OK` with empty `CartSummary` (`itemCount: 0, items: []`).

---

## 10. Checkout Preparation & Validation APIs

The checkout validation endpoint performs pre-order checks: validating store status, cart contents, product availability, real-time prices, and delivery destination before placing an order.

### 10.1 `POST /api/v1/checkout/validate`
* **Access**: Authenticated Customer
* **Headers**: `Authorization: Bearer <token>`
* **Request Body** (Option A: Saved Customer Address):
  ```json
  {
    "tenantId": "tenant-uuid-optional-if-single-store",
    "addressId": "a0000000-0000-4000-8000-000000000002"
  }
  ```
* **Request Body** (Option B: Inline Shipping Address):
  ```json
  {
    "tenantId": "tenant-uuid-optional-if-single-store",
    "shippingAddress": {
      "fullName": "Arjun Sharma",
      "phone": "+919876543210",
      "addressLine1": "Plot 14, Govardhan Road",
      "city": "Mathura",
      "state": "Uttar Pradesh",
      "postalCode": "281001",
      "country": "IN"
    }
  }
  ```
* **Validation & Verification Workflow**:
  1. **Cart Loading**: Verifies cart exists and has at least one item (`400 Bad Request` if empty).
  2. **Multi-Store Enforcement**: A single checkout order is scoped to one seller (`tenantId`). If cart items belong to multiple sellers and no `tenantId` is supplied, returns `400 Bad Request` requiring the user to specify which store to check out.
  3. **Product & Store Re-validation**:
     * Verifies seller store is published and `ACTIVE`.
     * Verifies every product in the checkout slice is `PUBLISHED`. Unavailable items set `isValid: false, isReadyForOrder: false` and return actionable error details.
  4. **Address Resolution & IDOR Prevention**:
     * If `addressId` is supplied, verifies it belongs to the authenticated customer (`404 Not Found` if belonging to another user).
     * If `shippingAddress` is provided, enforces street, city, state, postal PIN code, and contact phone validations.
     * Rejects request if neither address option is provided (`400 Bad Request`).
  5. **Price Recalculation & Price Drift Warnings**:
     * Recalculates subtotal using live database product prices.
     * If current database price differs from cart `priceSnapshot`, appends a clear warning (e.g. `'Price for "Diya" updated from INR 100.00 to INR 150.00'`).
  6. **Tax & Shipping Transparency**:
     * Taxes and shipping amounts are explicitly reported as uncalculated with descriptive messages (`isCalculated: false, amount: null`), preventing fake or fabricated checkout charges.
* **Response (200 OK)**:
  ```json
  {
    "isValid": true,
    "isReadyForOrder": true,
    "cartId": "cart-uuid",
    "tenantId": "tenant-1",
    "store": {
      "id": "tenant-1",
      "businessName": "Vedic Aromas",
      "storeSlug": "vedic-aromas"
    },
    "currency": "INR",
    "items": [
      {
        "productId": "prod-1",
        "name": "Organic Incense",
        "sku": "INC-01",
        "quantity": 2,
        "unitPrice": {
          "currency": "INR",
          "amount": 200,
          "minorUnits": 20000,
          "formatted": "INR 200.00"
        },
        "subtotal": {
          "currency": "INR",
          "amount": 400,
          "minorUnits": 40000,
          "formatted": "INR 400.00"
        },
        "isAvailable": true
      }
    ],
    "pricing": {
      "subtotal": {
        "currency": "INR",
        "amount": 400,
        "minorUnits": 40000,
        "formatted": "INR 400.00"
      },
      "estimatedTax": {
        "isCalculated": false,
        "amount": null,
        "minorUnits": null,
        "message": "Tax calculation requires seller GST registration check at order creation"
      },
      "estimatedShipping": {
        "isCalculated": false,
        "amount": null,
        "minorUnits": null,
        "message": "Shipping charge will be computed based on destination pincode and seller fulfillment rules"
      },
      "estimatedTotal": {
        "currency": "INR",
        "amount": 400,
        "minorUnits": 40000,
        "formatted": "INR 400.00"
      }
    },
    "shippingAddress": {
      "fullName": "Arjun Sharma",
      "phone": "+919876543210",
      "addressLine1": "Vrindavan Enclave",
      "addressLine2": null,
      "city": "Mathura",
      "state": "UP",
      "postalCode": "281001",
      "country": "IN",
      "landmark": null
    },
    "warnings": [],
    "errors": [],
    "validatedAt": "2026-10-22T10:30:00.000Z"
  }
  ```

---

## 11. Order Management & Inventory Transactions APIs

Order endpoints enable transactional creation of customer purchase orders from validated carts, atomic inventory reservations, race-condition prevention, idempotency deduplication, pre-shipment cancellations with exactly-once inventory restoration, and strict state machine fulfillment transitions.

### 11.1 `POST /api/v1/orders`
* **Access**: Authenticated Customer
* **Headers**:
  * `Authorization: Bearer <token>`
  * `idempotency-key: <string>` *(optional but recommended for network retry safety)*
* **Request Body**:
  ```json
  {
    "tenantId": "a0000000-0000-4000-8000-000000000001",
    "addressId": "a0000000-0000-4000-8000-000000000002",
    "customerNote": "Please leave at gate with security"
  }
  ```
* **Validation & Safety Rules**:
  * Cart must exist and contain at least one item (`400 Bad Request`).
  * If cart contains items from multiple stores, `tenantId` must be specified (`400 Bad Request`).
  * Store must be published and active (`400 Bad Request`).
  * Address must be a valid saved address belonging to the customer, or an inline shipping address (`404 Not Found` if address belongs to another customer).
  * Product availability & stock are rechecked atomically using conditional DB update (`stock >= quantity`).
  * If stock is depleted by a concurrent buyer, returns `409 Conflict` and rolls back transaction.
  * Line items, SKUs, product names, unit prices, and delivery addresses are snapshotted immutably into `orders` and `order_items`.
  * `InventoryReservation` records are created (`status: 'RESERVED'`).
  * Ordered items are atomically deleted from the customer's cart.
  * If `idempotency-key` is supplied, repeated requests return the cached processed order without duplicate charges, duplicate order rows, or double-deducting stock.
* **Response (201 Created)**:
  ```json
  {
    "id": "a0000000-0000-4000-8000-000000000010",
    "orderNumber": "GS-20261022-ORD01",
    "userId": "customer-uuid",
    "tenantId": "tenant-1",
    "status": "PLACED",
    "paymentStatus": "PENDING",
    "currency": "INR",
    "subtotal": {
      "currency": "INR",
      "amount": 300,
      "minorUnits": 30000,
      "formatted": "INR 300.00"
    },
    "taxAmount": {
      "currency": "INR",
      "amount": 0,
      "minorUnits": 0,
      "formatted": "INR 0.00"
    },
    "shippingAmount": {
      "currency": "INR",
      "amount": 0,
      "minorUnits": 0,
      "formatted": "INR 0.00"
    },
    "totalAmount": {
      "currency": "INR",
      "amount": 300,
      "minorUnits": 30000,
      "formatted": "INR 300.00"
    },
    "shippingAddress": {
      "fullName": "Arjun Sharma",
      "phone": "+919876543210",
      "addressLine1": "Vrindavan Enclave",
      "city": "Mathura",
      "state": "UP",
      "postalCode": "281001",
      "country": "IN"
    },
    "customerNote": "Please leave at gate with security",
    "cancelReason": null,
    "cancelledAt": null,
    "items": [
      {
        "id": "item-ord-1",
        "productId": "prod-1",
        "productName": "Handcrafted Clay Diya",
        "sku": "DIY-01",
        "unitPrice": {
          "currency": "INR",
          "amount": 150,
          "minorUnits": 15000,
          "formatted": "INR 150.00"
        },
        "quantity": 2,
        "subtotal": {
          "currency": "INR",
          "amount": 300,
          "minorUnits": 30000,
          "formatted": "INR 300.00"
        },
        "createdAt": "2026-10-22T10:00:00.000Z"
      }
    ],
    "reservations": [
      {
        "id": "res-1",
        "productId": "prod-1",
        "quantity": 2,
        "status": "RESERVED",
        "releasedAt": null,
        "createdAt": "2026-10-22T10:00:00.000Z"
      }
    ],
    "statusHistory": [
      {
        "id": "hist-1",
        "fromStatus": null,
        "toStatus": "PLACED",
        "changedBy": "customer-uuid",
        "reason": "Order placed by customer",
        "createdAt": "2026-10-22T10:00:00.000Z"
      }
    ],
    "createdAt": "2026-10-22T10:00:00.000Z",
    "updatedAt": "2026-10-22T10:00:00.000Z"
  }
  ```

---

### 11.2 `GET /api/v1/orders`
* **Access**: Authenticated Customer or Store Staff
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 20)
  * `status` (OrderStatus enum filter)
  * `tenantId` (UUID v4, available only to authorized store staff/owners)
* **Access Control**:
  * Customers receive orders where `userId === caller.id`.
  * Store staff passing `tenantId` receive orders fulfilling that store (`403 Forbidden` if not a member).
  * Platform admins can query across all stores.
* **Response (200 OK)**: Paginated `OrderListResponse`.

---

### 11.3 `GET /api/v1/orders/:orderId`
* **Access**: Order Owner, Store Staff, or Platform Admin
* **Headers**: `Authorization: Bearer <token>`
* **Security**: Enforces strict IDOR protection. Returns `404 Not Found` if `:orderId` does not exist or caller is unauthorized.
* **Response (200 OK)**: Complete `OrderResponse` including line items, stock reservations, and status audit trail.

---

### 11.4 `PATCH /api/v1/orders/:orderId/status`
* **Access**: Store Staff (`STORE_OWNER`, `STORE_MANAGER`, `STORE_STAFF`) or Platform Admin only
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "status": "CONFIRMED",
    "reason": "Payment verified and order accepted for packaging"
  }
  ```
* **Permitted State Transitions**:
  * `PLACED` → `CONFIRMED`, `CANCELLED`
  * `CONFIRMED` → `PROCESSING`, `CANCELLED`
  * `PROCESSING` → `SHIPPED`, `CANCELLED`
  * `SHIPPED` → `DELIVERED`, `RETURNED`
  * `DELIVERED` → `RETURNED`
  * `CANCELLED` / `RETURNED` are terminal states.
* **Security & Invariants**:
  * Customers cannot advance fulfillment status (`403 Forbidden`).
  * Invalid state machine transitions return `400 Bad Request`.
  * Transitioning to `SHIPPED` or `DELIVERED` marks active `RESERVED` inventory reservations as `FULFILLED`.
  * Transitioning to `CANCELLED` releases reservations and restores product stock.
* **Response (200 OK)**: Refreshed `OrderResponse`.

---

### 11.5 `POST /api/v1/orders/:orderId/cancel`
* **Access**: Order Owner or Store Staff
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "reason": "Customer requested cancellation prior to packing"
  }
  ```
* **Cancellation Rules & Exactly-Once Stock Restoration**:
  * Customers can cancel only pre-shipment orders (`PLACED`, `CONFIRMED`, `PROCESSING`).
  * Already shipped, delivered, or returned orders cannot be cancelled (`400 Bad Request`).
  * Already cancelled orders reject duplicate cancellation (`400 Bad Request`).
  * Active `RESERVED` inventory reservations are atomically transitioned to `RELEASED`.
  * Product stock is incremented back exactly once; duplicate or concurrent cancellation requests cannot double-restore stock.
* **Response (200 OK)**: Refreshed `OrderResponse` with `status: 'CANCELLED'`, `cancelReason`, and `cancelledAt`.

---

## 12. Customer-to-Seller Payments (Step 8)

### 12.1 `POST /api/v1/orders/:orderId/payments`
* **Access**: Authenticated Customer (Order Owner) or Super Admin
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "paymentMethod": "card",
    "returnUrl": "https://storefront.example.com/checkout/success",
    "idempotencyKey": "pay-idem-001"
  }
  ```
* **Validation & Safety Rules**:
  * Order must be in `PLACED` status and `paymentStatus: PENDING` (`400 Bad Request` if cancelled or shipped; `409 Conflict` if already paid).
  * Strict IDOR protection: only the customer who placed the order (or super admin) can initiate payment.
  * Creates or updates `PaymentRecord` and logs a new `PaymentAttempt` with sequential attempt counter.
  * Calls provider adapter (`SandboxPaymentProvider` or live gateway).
* **Response (201 Created)**:
  ```json
  {
    "paymentRecordId": "pay-rec-uuid",
    "provider": "sandbox",
    "providerPaymentId": "pay_sbx_12345",
    "providerOrderId": "ord_sbx_12345",
    "clientSecret": "sec_sbx_12345",
    "checkoutUrl": "https://sandbox-gateway.gaushilp.local/checkout?session=pay_sbx_12345",
    "amount": 1150.00,
    "currency": "INR",
    "status": "PENDING"
  }
  ```

---

### 12.2 `GET /api/v1/orders/:orderId/payments`
* **Access**: Order Owner, Tenant Staff, or Super Admin
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**: List of `PaymentRecordResponse` objects with historical attempts and refund records.

---

### 12.3 `GET /api/v1/payments/:paymentId`
* **Access**: Order Owner, Tenant Staff, or Super Admin
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**: Detailed `PaymentRecordResponse`.

---

### 12.4 `POST /api/v1/payments/:paymentId/refunds`
* **Access**: Store Staff (`STORE_OWNER`, `STORE_MANAGER`, `STORE_STAFF`) or Super Admin
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "amount": 250.00,
    "reason": "Customer returned 1 item before dispatch"
  }
  ```
* **Validation & Safety Rules**:
  * Payment must be in `SUCCEEDED` status.
  * Refund amount cannot exceed remaining net paid balance (`400 Bad Request`).
  * Processed via provider refund adapter.
  * Records `RefundRecord` (`SUCCEEDED`) and transitions payment record to `PARTIALLY_REFUNDED` or `REFUNDED`.
  * If full refund, updates `Order.paymentStatus = REFUNDED`.
* **Response (201 Created)**: `RefundRecordResponse`.

---

### 12.5 `POST /api/v1/webhooks/payments/:provider`
* **Access**: Public webhook ingestion endpoint (Cryptographically signed by provider)
* **Headers**:
  * `x-signature: <hex-signature>` (or `stripe-signature` / `x-razorpay-signature`)
* **Security & Invariants**:
  * Rejects missing or invalid HMAC-SHA256 signatures (`401 Unauthorized`).
  * Replay defense: Persists event IDs in `payment_webhook_events`. Duplicates return `200 OK` with `duplicate: true`.
  * On `payment.succeeded`: Validates currency and amount against order total.
  * **Late Payment Policy**: If order was already `CANCELLED`, payment is recorded as `SUCCEEDED` and flagged with `RECONCILIATION_REQUIRED` for refund/audit; order status is NOT resurrected and stock is NOT touched.
  * For active orders: Advances `Order.paymentStatus = PAID` and `Order.status = CONFIRMED` with audit trail in `order_status_history`.
  * On `payment.failed`: Records failure reason without releasing stock twice or prematurely cancelling order.
* **Response (200 OK)**:
  ```json
  {
    "received": true,
    "eventId": "evt_12345",
    "eventType": "payment.succeeded",
    "status": "SUCCEEDED",
    "message": "Payment processed and order confirmed"
  }
  ```

---

## 13. Seller-to-GauShilp SaaS Subscriptions (Step 8)

### 13.1 `GET /api/v1/subscriptions/plans`
* **Access**: Public
* **Response (200 OK)**: List of active subscription tiers (`Starter Artisan`, `Growth Gaushala`, `Pro Guild`) including product limits, staff seats, and feature flags.

---

### 13.2 `GET /api/v1/subscriptions/current`
* **Access**: Store Owner or Store Manager
* **Headers**:
  * `Authorization: Bearer <token>`
  * `x-tenant-id: <tenantId>`
* **Response (200 OK)**:
  ```json
  {
    "id": "sub-uuid",
    "tenantId": "tenant-1",
    "status": "ACTIVE",
    "billingInterval": "MONTHLY",
    "currentPeriodStart": "2026-10-22T00:00:00.000Z",
    "currentPeriodEnd": "2026-11-22T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "plan": {
      "slug": "growth",
      "name": "Growth Gaushala",
      "priceMonthly": 999,
      "maxProducts": 250,
      "maxStaffMembers": 5,
      "customDomainEnabled": true,
      "analyticsEnabled": true
    },
    "usage": {
      "productCount": 15,
      "maxProducts": 250,
      "staffCount": 2,
      "maxStaffMembers": 5
    }
  }
  ```

---

### 13.3 `POST /api/v1/subscriptions/checkout`
* **Access**: Store Owner only (`STORE_OWNER`)
* **Headers**:
  * `Authorization: Bearer <token>`
  * `x-tenant-id: <tenantId>`
* **Request Body**:
  ```json
  {
    "planSlug": "growth",
    "billingInterval": "MONTHLY"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "provider": "sandbox",
    "providerSubscriptionId": "sub_sbx_12345",
    "checkoutUrl": "https://sandbox-billing.gaushilp.local/subscribe?sub=sub_sbx_12345",
    "status": "ACTIVE",
    "plan": { "slug": "growth", "name": "Growth Gaushala" },
    "billingInterval": "MONTHLY"
  }
  ```

---

### 13.4 `POST /api/v1/subscriptions/cancel`
* **Access**: Store Owner only (`STORE_OWNER`)
* **Headers**:
  * `Authorization: Bearer <token>`
  * `x-tenant-id: <tenantId>`
* **Request Body**:
  ```json
  {
    "cancelAtPeriodEnd": true,
    "reason": "Downsizing store operations"
  }
  ```
* **Response (200 OK)**: Cancellation confirmation with `cancelAtPeriodEnd: true`.

---

### 13.5 `GET /api/v1/subscriptions/billing-history`
* **Access**: Store Owner or Store Manager
* **Headers**:
  * `Authorization: Bearer <token>`
  * `x-tenant-id: <tenantId>`
* **Response (200 OK)**: List of `SubscriptionInvoiceResponse` records with sequential invoice numbers, amounts, period dates, and payment timestamps.

---

### 13.6 `POST /api/v1/webhooks/subscriptions/:provider`
* **Access**: Public webhook ingestion endpoint (Cryptographically signed by billing provider)
* **Headers**: `x-signature: <hex-signature>`
* **Events Handled**:
  * `subscription.activated` / `subscription.renewed`: Extends period and creates `SubscriptionInvoice`.
  * `subscription.payment_failed`: Marks tenant subscription `PAST_DUE`.
  * `subscription.cancelled`: Marks subscription `CANCELLED`.
  * `subscription.expired`: Marks subscription `EXPIRED`.
* **Response (200 OK)**: `{ "received": true, "status": "PROCESSED" }`

---

## 14. Shipping, Fulfilment & Order Tracking (Step 9)

### 14.1 `GET /api/v1/shipping/orders/ready`
* **Access**: Store Staff (`STORE_OWNER`, `STORE_MANAGER`, `STORE_STAFF`) or Super Admin
* **Headers**:
  * `Authorization: Bearer <token>`
  * `x-tenant-id: <tenantId>` *(or `tenantId` query parameter)*
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 20)
  * `tenantId` (optional if passed via header)
* **Rules & Invariants**:
  * Returns orders awaiting fulfilment with status `CONFIRMED` or `PROCESSING`.
  * Enforces strict store tenant membership check (`403 Forbidden` for cross-tenant access).
* **Response (200 OK)**:
  ```json
  {
    "orders": [
      {
        "orderId": "order-uuid-1",
        "orderNumber": "GS-20261022-ORD99",
        "tenantId": "tenant-1",
        "status": "CONFIRMED",
        "paymentStatus": "PAID",
        "createdAt": "2026-10-22T10:00:00.000Z",
        "totalAmount": {
          "currency": "INR",
          "amount": 1300.00,
          "formatted": "INR 1300.00"
        },
        "itemCount": 2,
        "shippingAddress": {
          "fullName": "Customer One",
          "phone": "+919876543210",
          "addressLine1": "42 Vedic Marg",
          "city": "Varanasi",
          "state": "Uttar Pradesh",
          "postalCode": "221001",
          "country": "IN"
        },
        "shipmentsCount": 0
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```

---

### 14.2 `POST /api/v1/orders/:orderId/shipments`
* **Access**: Store Staff (`STORE_OWNER`, `STORE_MANAGER`, `STORE_STAFF`)
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "packageWeight": 1.5,
    "packageLength": 25.0,
    "packageWidth": 15.0,
    "packageHeight": 10.0,
    "provider": "sandbox",
    "carrierCode": "surface_cargo",
    "trackingNumber": "GS-TRK-TEST12345",
    "shippingCost": 85.00,
    "carrierNote": "Fragile: Handmade cow dung diyas"
  }
  ```
* **Validation & Security Invariants**:
  * Order must be in `CONFIRMED` or `PROCESSING` status (`400 Bad Request` if cancelled or delivered).
  * Validates package weight (> 0kg and <= 70kg).
  * Carrier acceptance checks: verifies compatibility with cow dung items (e.g. bulk bio-mass/wood > 10kg rejected for commercial air freight).
  * Generates/records carrier tracking number and initial status (`READY_TO_SHIP`).
  * Automatically transitions order from `CONFIRMED` to `PROCESSING` and logs status history.
* **Response (201 Created)**: Complete `ShipmentResponse`.

---

### 14.3 `GET /api/v1/orders/:orderId/shipments`
* **Access**: Order Owner, Tenant Staff, or Super Admin
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**: List of `ShipmentResponse` records created for the order (supporting multi-package shipments).

---

### 14.4 `GET /api/v1/shipments/:shipmentId`
* **Access**: Tenant Staff or Super Admin
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**: Detailed `ShipmentResponse` with full milestone history.

---

### 14.5 `PATCH /api/v1/shipments/:shipmentId/status`
* **Access**: Tenant Staff or Super Admin
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "status": "IN_TRANSIT",
    "description": "Scanned at regional logistics hub",
    "location": "New Delhi Central Hub",
    "reason": "Normal transit progression"
  }
  ```
* **State Machine Rules**:
  * Transitions must conform to validated state machine graph:
    * `PENDING` → `READY_TO_SHIP`, `CANCELLED`
    * `READY_TO_SHIP` → `SHIPPED`, `CANCELLED`
    * `SHIPPED` → `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERY_FAILED`, `RETURN_TO_ORIGIN`, `CANCELLED`
    * `IN_TRANSIT` → `OUT_FOR_DELIVERY`, `DELIVERY_FAILED`, `RETURN_TO_ORIGIN`
    * `OUT_FOR_DELIVERY` → `DELIVERED`, `DELIVERY_FAILED`, `RETURN_TO_ORIGIN`
    * `DELIVERY_FAILED` → `OUT_FOR_DELIVERY`, `RETURN_TO_ORIGIN`, `DELIVERED`
    * Terminal states: `DELIVERED`, `RETURN_TO_ORIGIN`, `CANCELLED`.
  * Reverts from `DELIVERED` are rejected (`400 Bad Request`).
  * When all packages are `DELIVERED`, automatically synchronises order status to `DELIVERED`.
* **Response (200 OK)**: Updated `ShipmentResponse`.

---

### 14.6 `POST /api/v1/shipments/:shipmentId/dispatch`
* **Access**: Tenant Staff or Super Admin
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Dispatches package to carrier. Moves shipment to `SHIPPED`, sets `shippedAt = now()`, advances order to `SHIPPED`, and marks active inventory reservations as `FULFILLED`.
* **Response (200 OK)**: Updated `ShipmentResponse`.

---

### 14.7 `GET /api/v1/customers/me/orders/:orderId/tracking`
* **Access**: Authenticated Customer (Order Owner)
* **Headers**: `Authorization: Bearer <token>`
* **Security & IDOR Defense**:
  * Verifies customer ownership (`order.userId === caller.id`).
  * Returns `404 Not Found` if order belongs to another customer.
  * Sanitizes output: excludes seller wholesale fulfillment cost and internal seller notes.
* **Response (200 OK)**:
  ```json
  {
    "orderId": "order-uuid-1",
    "orderNumber": "GS-20261022-ORD99",
    "orderStatus": "SHIPPED",
    "currency": "INR",
    "shipments": [
      {
        "id": "shipment-uuid-1",
        "provider": "sandbox",
        "trackingNumber": "GS-TRK-TEST12345",
        "status": "IN_TRANSIT",
        "shippedAt": "2026-10-22T11:00:00.000Z",
        "deliveredAt": null,
        "events": [
          {
            "status": "READY_TO_SHIP",
            "description": "Shipment created via sandbox",
            "location": "Artisan Workshop Hub",
            "eventTimestamp": "2026-10-22T10:30:00.000Z"
          },
          {
            "status": "SHIPPED",
            "description": "Handed over to courier carrier for transit",
            "location": "Varanasi Origin Facility",
            "eventTimestamp": "2026-10-22T11:00:00.000Z"
          }
        ]
      }
    ]
  }
  ```

---

### 14.8 `POST /api/v1/webhooks/shipping/:provider`
* **Access**: Public webhook ingestion endpoint (Cryptographically signed by shipping carrier)
* **Headers**: `x-signature: <hex-signature>` *(or `x-provider-signature`)*
* **Security & Invariants**:
  * HMAC-SHA256 signature verification in constant-time to resist timing attacks.
  * Rejects unauthenticated or tampered payloads (`401 Unauthorized`).
  * Deduplicates tracking events: checks `[shippingRecordId, status, description, eventTimestamp]`.
  * Safe state progression: ignores out-of-order network updates trying to revert terminal `DELIVERED` status.
  * Automatically advances order status to `DELIVERED` upon final package delivery confirmation.
* **Response (200 OK)**: `{ "received": true, "processed": true }`

---

## 15. In-App Notifications Endpoints (Step 10)

### 15.1 `GET /api/v1/notifications`
* **Access**: Authenticated User (Customer or Seller)
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `page` (optional integer, default: `1`)
  * `limit` (optional integer, default: `20`, max: `100`)
  * `unreadOnly` (optional boolean, default: `false`)
  * `type` (optional enum: `NotificationType`)
* **Security & IDOR Protection**:
  * Notifications are strictly scoped to the authenticated caller's `user.id`.
  * Cross-tenant and cross-user data leakage is strictly prohibited.
* **Response (200 OK)**:
  ```json
  {
    "notifications": [
      {
        "id": "notif-uuid-1",
        "recipientUserId": "user-uuid-1",
        "tenantId": "tenant-uuid-1",
        "type": "ORDER_CREATED",
        "title": "Order Placed Successfully",
        "message": "Your order GS-20261022-ORD99 has been placed.",
        "data": {
          "orderId": "order-uuid-1",
          "orderNumber": "GS-20261022-ORD99"
        },
        "readAt": null,
        "isRead": false,
        "createdAt": "2026-10-22T10:00:00.000Z"
      }
    ],
    "total": 1,
    "unreadCount": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```

---

### 15.2 `GET /api/v1/notifications/unread-count`
* **Access**: Authenticated User
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Returns unread notification count for notification badge display.
* **Response (200 OK)**:
  ```json
  {
    "unreadCount": 3
  }
  ```

---

### 15.3 `PATCH /api/v1/notifications/:notificationId/read`
* **Access**: Authenticated User (Notification Owner)
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Marks an individual notification as read.
* **Security & IDOR Defense**:
  * Verifies ownership (`recipientUserId === caller.id`).
  * Returns `404 Not Found` if notification does not exist or belongs to another user.
* **Response (200 OK)**:
  ```json
  {
    "id": "notif-uuid-1",
    "recipientUserId": "user-uuid-1",
    "tenantId": "tenant-uuid-1",
    "type": "ORDER_CREATED",
    "title": "Order Placed Successfully",
    "message": "Your order GS-20261022-ORD99 has been placed.",
    "data": {
      "orderId": "order-uuid-1"
    },
    "readAt": "2026-10-22T10:15:00.000Z",
    "isRead": true,
    "createdAt": "2026-10-22T10:00:00.000Z"
  }
  ```

---

### 15.4 `PATCH /api/v1/notifications/read-all`
* **Access**: Authenticated User
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Marks all unread notifications for caller as read.
* **Response (200 OK)**:
  ```json
  {
    "count": 5,
    "success": true
  }
  ```

---

## 16. Asynchronous Jobs & Transactional Outbox Architecture (Step 10)

### 16.1 Domain Event Types
Domain events emitted atomically in Prisma business transactions:
* `ORDER_CREATED`: Emitted when an order is created transactionally in `OrdersService`. Dispatches order confirmation email to customer and new-order alert to seller.
* `ORDER_CANCELLED`: Emitted when an order is cancelled and inventory is restored. Dispatches cancellation email to customer.
* `PAYMENT_SUCCEEDED`: Emitted when customer payment is verified. Dispatches receipt email to customer and payment alert to seller.
* `PAYMENT_FAILED`: Emitted when payment fails or expires. Dispatches payment failure alert.
* `SHIPMENT_DISPATCHED`: Emitted when seller dispatches package to carrier. Dispatches shipment tracking details to customer.
* `SHIPMENT_DELIVERED`: Emitted when package is delivered. Dispatches delivery confirmation to customer.
* `SUBSCRIPTION_ACTIVATED`: Emitted when seller SaaS plan is activated or upgraded. Dispatches subscription welcome email.
* `SUBSCRIPTION_STATUS_CHANGED`: Emitted on SaaS plan cancellation or suspension. Dispatches account status alert.

### 16.2 Reliability & Fault-Tolerance Principles
1. **Transactional Outbox Engine**:
   * Domain events are inserted into `outbox_events` in the exact same database transaction as business mutations.
   * Eliminates dual-write inconsistencies (orders cannot commit while event is silently lost).
2. **Transaction Isolation**:
   * No external network calls (email providers, notification APIs) are executed inside database transactions.
3. **Fault-Tolerant Outbox Insertion**:
   * `OutboxService.createEvent` handles persistence failures gracefully so an outbox issue cannot roll back an already committed order or payment.
4. **Bounded Retries with Exponential Backoff**:
   * Scheduled retries use formula: `delayMs = Math.pow(2, retryCount) * 2000`.
   * Max retries configurable via `QUEUE_MAX_RETRIES` (default: 5).
5. **Dead-Letter State**:
   * Events reaching max retries transition to `DEAD_LETTER` with structured error diagnostic for administrative inspection and replay.
6. **Alert Deduplication**:
   * 60-second in-memory fingerprint window suppresses duplicate alert creation during event retries.
7. **Email Provider Boundary**:
   * `IEmailProvider` interface with `SandboxEmailProvider` implementation for safe local testing and development.

---

## 17. Object Storage, Secure File Uploads & CDN Integration (Step 11)

### 17.1 Architecture & Two-Phase Upload Security Model

GauShilp OS implements a secure, provider-independent object storage module backed by Cloudflare R2 (S3-compatible) with fallback to `SandboxObjectStorageProvider` for non-configured environments.

```
+-------------------------------------------------------------------------------------------------------+
|                                    SECURE UPLOAD WORKFLOW (2-PHASE)                                   |
|                                                                                                       |
|  [Authenticated Client]          [GauShilp API]                          [Cloudflare R2 Storage]     |
|          |                              |                                           |                 |
|   (1)    |-- POST /files/upload-intents>|                                           |                 |
|          |   (fileName, size, mime, ...) |                                           |                 |
|          |                              |-- Validate Role/Tenant & Purpose          |                 |
|          |                              |-- Generate Server Key & UUID              |                 |
|          |                              |-- Request Presigned PUT (15m expiry) ---->|                 |
|          |                              |<-- Return Presigned URL ------------------|                 |
|          |<-- 201 Created (UploadIntent)|                                           |                 |
|          |    { fileId, uploadUrl, ... }|                                           |                 |
|          |                              |                                           |                 |
|   (2)    |------------------------ PUT {uploadUrl} Binary Stream ------------------>|                 |
|          |<----------------------- 200 OK (Uploaded to R2) -------------------------|                 |
|          |                              |                                           |                 |
|   (3)    |-- POST /files/:id/complete ->|                                           |                 |
|          |                              |-- HeadObject (verify exists & size) ----->|                 |
|          |                              |<-- Returns object headers ----------------|                 |
|          |                              |-- GetObject (read buffer) --------------->|                 |
|          |                              |<-- Return image binary stream ------------|                 |
|          |                              |-- Inspect Magic Bytes (JPEG/PNG/WebP)     |                 |
|          |                              |-- Sharp Metadata & Dimension Validation   |                 |
|          |                              |-- Generate CDN publicUrl                  |                 |
|          |                              |-- Update StoredFile -> VERIFIED           |                 |
|          |<-- 200 OK (Verified Asset)   |                                           |                 |
+-------------------------------------------------------------------------------------------------------+
```

#### Security Controls:
1. **Never Trust Client Input**: File names are sanitized, extensions are inferred from validated MIME types, object keys are 100% server-controlled (`tenants/{tenantId}/{purpose}/{uuid}.{ext}`). Clients can never pick storage paths or directory names.
2. **Deep Content Inspection**:
   * Magic byte verification (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG, `RIFF...WEBP` for WebP).
   * Sharp binary decoding: confirms valid image buffer, extracts dimensions, detects corrupt or disguised executable payloads.
   * Execution prevention: HTML, SVG, JavaScript, executables, or unknown binary files are strictly rejected with HTTP `400 Bad Request`.
3. **Quarantine / Pending State**: Files remain `PENDING` until verification completes. If verification fails, the file record transitions to `REJECTED`, the object is purged from object storage, and no public URL is ever issued.
4. **Tenant Isolation & IDOR Defense**: Files belonging to Tenant A can never be completed, fetched, or attached to products/stores by Tenant B. Cross-tenant queries return `404 Not Found` or `403 Forbidden`.
5. **Active Reference Protection**: Deletion of assets is blocked (`409 Conflict`) if the asset's `publicUrl` is actively referenced in any product `images` array or store `logoUrl`/`bannerUrl`.

---

### 17.2 Endpoints

#### 17.2.1 `POST /api/v1/files/upload-intents`
* **Access**: Authenticated Store Owner, Admin, or User
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>` (required for tenant purposes)
* **Purpose**: Generates server-controlled object key and short-lived (15 min) presigned PUT URL.
* **Request Body**:
  ```json
  {
    "originalFileName": "artisan-pottery.png",
    "contentType": "image/png",
    "fileSize": 1048576,
    "purpose": "PRODUCT_IMAGE",
    "tenantId": "t1111111-0000-4000-8000-000000000001"
  }
  ```
* **Supported MIME Types**: `image/jpeg`, `image/png`, `image/webp`
* **Max File Size**: 10 MB (10,485,760 bytes)
* **Response (201 Created)**:
  ```json
  {
    "fileId": "file-uuid-1",
    "objectKey": "tenants/t1111111-0000-4000-8000-000000000001/products/c6b8f3e2-8924-4f28-9321-4f1141bc2100.png",
    "uploadUrl": "https://<account-id>.r2.cloudflarestorage.com/gaushilp-media/...&X-Amz-Signature=...",
    "expiresAt": "2026-10-22T17:20:00.000Z",
    "purpose": "PRODUCT_IMAGE",
    "visibility": "PUBLIC",
    "status": "PENDING"
  }
  ```

---

#### 17.2.2 `POST /api/v1/files/:fileId/complete`
* **Access**: Authenticated File Owner or Tenant Member
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Verifies that the client uploaded the binary to object storage. Reads the object, verifies magic bytes and Sharp image dimensions, generates the Cloudflare CDN URL, and marks the file `VERIFIED`.
* **Response (200 OK)**:
  ```json
  {
    "id": "file-uuid-1",
    "tenantId": "t1111111-0000-4000-8000-000000000001",
    "purpose": "PRODUCT_IMAGE",
    "objectKey": "tenants/t1111111-0000-4000-8000-000000000001/products/c6b8f3e2-8924-4f28-9321-4f1141bc2100.png",
    "originalFileName": "artisan-pottery.png",
    "contentType": "image/png",
    "fileSize": 1048576,
    "width": 1200,
    "height": 800,
    "publicUrl": "https://media.gaushilp.example.com/tenants/t1111111-0000-4000-8000-000000000001/products/c6b8f3e2-8924-4f28-9321-4f1141bc2100.png",
    "status": "VERIFIED",
    "visibility": "PUBLIC",
    "verifiedAt": "2026-10-22T17:05:00.000Z"
  }
  ```

---

#### 17.2.3 `GET /api/v1/files/:fileId`
* **Access**: Authenticated File Owner or Tenant Member
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Retrieves file metadata. For `PRIVATE` files (e.g. `PRIVATE_DOCUMENT`), includes a short-lived presigned download URL (valid for 15 minutes).
* **Response (200 OK)**:
  ```json
  {
    "id": "file-uuid-1",
    "tenantId": "t1111111-0000-4000-8000-000000000001",
    "purpose": "PRODUCT_IMAGE",
    "objectKey": "tenants/t1111111-0000-4000-8000-000000000001/products/c6b8f3e2-8924-4f28-9321-4f1141bc2100.png",
    "originalFileName": "artisan-pottery.png",
    "contentType": "image/png",
    "fileSize": 1048576,
    "width": 1200,
    "height": 800,
    "publicUrl": "https://media.gaushilp.example.com/tenants/t1111111-0000-4000-8000-000000000001/products/c6b8f3e2-8924-4f28-9321-4f1141bc2100.png",
    "downloadUrl": null,
    "status": "VERIFIED",
    "visibility": "PUBLIC",
    "createdAt": "2026-10-22T17:00:00.000Z",
    "updatedAt": "2026-10-22T17:05:00.000Z"
  }
  ```

---

#### 17.2.4 `GET /api/v1/files`
* **Access**: Authenticated User
* **Headers**: `Authorization: Bearer <token>`, `x-tenant-id: <tenantId>` (optional filter)
* **Query Parameters**:
  * `purpose`: Filter by `FilePurpose` (`PRODUCT_IMAGE`, `STORE_LOGO`, etc.)
  * `status`: Filter by `FileStatus` (`VERIFIED`, `PENDING`, etc.)
  * `page`: Page number (default: 1)
  * `limit`: Page size (default: 20, max: 100)
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "file-uuid-1",
        "tenantId": "t1111111-0000-4000-8000-000000000001",
        "purpose": "PRODUCT_IMAGE",
        "objectKey": "tenants/...",
        "contentType": "image/png",
        "publicUrl": "https://media.gaushilp.example.com/...",
        "status": "VERIFIED",
        "visibility": "PUBLIC"
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

---

#### 17.2.5 `DELETE /api/v1/files/:fileId`
* **Access**: Authenticated File Owner, Store Owner, or Super Admin
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Safely deletes a file from object storage and marks it `DELETED` in the database.
* **Active Reference Protection**:
  * Blocks deletion with `409 Conflict` if the file's `publicUrl` is referenced in any product images or store logo/banner.
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "File deleted successfully",
    "fileId": "file-uuid-1"
  }
  ```

---

#### 17.2.6 `POST /api/v1/files/cleanup/abandoned`
* **Access**: Authenticated Super Admin / Automated Background Job
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Idempotent cleanup job that finds pending uploads created more than 2 hours ago, attempts storage purge if partially uploaded, and transitions records to `DELETED`.
* **Response (200 OK)**:
  ```json
  {
    "cleanedCount": 3,
    "success": true
  }
  ```

---

## 18. Super Admin APIs and Platform Analytics

All endpoints in this section are strictly restricted to users with `platformRole === SUPER_ADMIN`.
Unauthenticated requests return `401 Unauthorized`.
Users with `USER` role (including `STORE_OWNER`, `STORE_MANAGER`, `STORE_STAFF`, `CUSTOMER`) return `403 Forbidden`.
All state-modifying actions are synchronously written to the immutable `audit_logs` table.

### 18.1 Tenant Administration

#### 18.1.1 `GET /api/v1/admin/tenants`
* **Access**: Super Admin Only
* **Headers**: `Authorization: Bearer <super_admin_token>`
* **Query Parameters**:
  * `page` (optional, default: 1)
  * `limit` (optional, default: 20, max: 100)
  * `status` (optional, `ACTIVE`, `SUSPENDED`, `PENDING`)
  * `search` (optional, searches store business name or slug)
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "tenant-uuid-1",
        "businessName": "Vedic Dhoop Artisans",
        "storeSlug": "vedic-dhoop",
        "status": "ACTIVE",
        "isPublished": true,
        "publishedAt": "2026-09-02T10:00:00.000Z",
        "currency": "INR",
        "contactEmail": "contact@vedicdhoop.com",
        "contactPhone": "+919876543210",
        "createdAt": "2026-09-01T10:00:00.000Z",
        "updatedAt": "2026-09-01T10:00:00.000Z",
        "subscription": {
          "id": "sub-1",
          "status": "ACTIVE",
          "planName": "Growth Gaushala",
          "planSlug": "growth",
          "currentPeriodEnd": "2026-11-01T00:00:00.000Z"
        },
        "counts": {
          "products": 45,
          "orders": 120,
          "staffMembers": 3
        }
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

#### 18.1.2 `GET /api/v1/admin/tenants/:tenantId`
* **Access**: Super Admin Only
* **Headers**: `Authorization: Bearer <super_admin_token>`
* **Description**: Returns detailed tenant overview including subscription status, staff memberships, and aggregate revenue metrics.
* **Response (200 OK)**:
  ```json
  {
    "id": "tenant-uuid-1",
    "businessName": "Vedic Dhoop Artisans",
    "storeSlug": "vedic-dhoop",
    "status": "ACTIVE",
    "isPublished": true,
    "members": [
      {
        "membershipId": "mem-1",
        "role": "STORE_OWNER",
        "status": "ACTIVE",
        "user": {
          "id": "usr-1",
          "name": "Gopal Owner",
          "email": "owner@vedicdhoop.com"
        }
      }
    ],
    "metrics": {
      "productCount": 45,
      "orderCount": 120,
      "categoryCount": 5,
      "collectedRevenue": 120000
    }
  }
  ```

#### 18.1.3 `PATCH /api/v1/admin/tenants/:tenantId/status`
* **Access**: Super Admin Only
* **Headers**: `Authorization: Bearer <super_admin_token>`
* **Request Body**:
  ```json
  {
    "status": "SUSPENDED",
    "reason": "Severe compliance infringement reported"
  }
  ```
* **Enforcement & Audit**:
  * Records `TENANT_SUSPENDED` or `TENANT_REACTIVATED` in `audit_logs` with actor ID, reason, and context.
  * Suspended tenants are blocked by `TenantAccessGuard` across all store owner and staff APIs.
  * Tenant data is never deleted.
* **Response (200 OK)**:
  ```json
  {
    "id": "tenant-uuid-1",
    "businessName": "Vedic Dhoop Artisans",
    "status": "SUSPENDED",
    "previousStatus": "ACTIVE",
    "updatedAt": "2026-10-22T23:25:00.000Z",
    "message": "Tenant \"Vedic Dhoop Artisans\" status successfully changed to SUSPENDED."
  }
  ```

---

### 18.2 Platform User Management

#### 18.2.1 `GET /api/v1/admin/users`
* **Access**: Super Admin Only
* **Headers**: `Authorization: Bearer <super_admin_token>`
* **Query Parameters**: `page`, `limit`, `role`, `status`, `search`
* **Response (200 OK)**: Returns paginated user records with sensitive credentials strictly omitted.

#### 18.2.2 `GET /api/v1/admin/users/:userId`
* **Access**: Super Admin Only
* **Headers**: `Authorization: Bearer <super_admin_token>`
* **Response (200 OK)**: Returns full user profile, tenant memberships, order count, and payment history stats.

#### 18.2.3 `PATCH /api/v1/admin/users/:userId/status`
* **Access**: Super Admin Only
* **Headers**: `Authorization: Bearer <super_admin_token>`
* **Request Body**:
  ```json
  {
    "status": "SUSPENDED",
    "reason": "Abusive automated bot behavior"
  }
  ```
* **Security Controls**:
  * **Self-Lockout Defense**: Rejects attempts by a Super Admin to suspend their own account with `400 Bad Request`.
  * **Peer Administrator Protection**: Rejects attempts to suspend another `SUPER_ADMIN` with `403 Forbidden`.
  * **Suspension Enforcement**: `JwtAuthGuard` rejects suspended users on all endpoints with `403 Forbidden`.
  * **Audit Logging**: Emits `USER_SUSPENDED` or `USER_REACTIVATED` audit records.

---

### 18.3 SaaS Subscription Administration

#### 18.3.1 `GET /api/v1/admin/subscriptions`
* **Access**: Super Admin Only
* **Query Parameters**: `page`, `limit`, `status`, `planSlug`
* **Response (200 OK)**: Lists tenant SaaS subscriptions with plan pricing and renewal dates.

#### 18.3.2 `GET /api/v1/admin/subscriptions/:subscriptionId`
* **Access**: Super Admin Only
* **Response (200 OK)**: Returns subscription details with associated billing invoices.

#### 18.3.3 `GET /api/v1/admin/subscription-summary`
* **Access**: Super Admin Only
* **Response (200 OK)**:
  ```json
  {
    "statusBreakdown": {
      "total": 12,
      "active": 10,
      "trialing": 1,
      "pastDue": 1,
      "cancelled": 0,
      "expired": 0
    },
    "planDistribution": [
      {
        "planId": "plan-growth",
        "name": "Growth Gaushala",
        "slug": "growth",
        "priceMonthly": 999,
        "priceAnnual": 9990,
        "activeSubscriberCount": 10
      }
    ],
    "revenueMetrics": {
      "monthlyRecurringRevenue": 9990,
      "annualRecurringRevenue": 119880,
      "totalInvoicedPaidRevenue": 29970
    }
  }
  ```

---

### 18.4 Platform Analytics Endpoints

All analytics queries execute database aggregations without loading entire result sets into application memory.
Queries accept ISO `startDate` and `endDate` parameters (maximum range: 365 days). Inverted dates return `400 Bad Request`.

#### 18.4.1 `GET /api/v1/admin/analytics/overview`
* **Access**: Super Admin Only
* **Description**: Returns consolidated platform KPI dashboard.
* **Response (200 OK)**:
  ```json
  {
    "period": { "startDate": null, "endDate": null },
    "tenants": { "total": 12, "active": 10, "suspended": 2, "pending": 0 },
    "stores": { "publishedStores": 8, "unpublishedStores": 4 },
    "orders": { "totalOrders": 125, "grossOrderValue": 125000, "averageOrderValue": 1000 },
    "payments": {
      "collectedRevenue": 120000,
      "refundedAmount": 2500,
      "netRevenue": 117500,
      "failedCount": 5,
      "failureRatePercentage": 4.17
    },
    "subscriptions": {
      "activeSubscriptions": 10,
      "monthlyRecurringRevenue": 9990,
      "subscriptionInvoicedRevenue": 29970
    },
    "system": { "deadLetterJobsCount": 0 }
  }
  ```

#### 18.4.2 `GET /api/v1/admin/analytics/tenants`
* **Response (200 OK)**: Returns tenant registration counts and daily trend breakdown.

#### 18.4.3 `GET /api/v1/admin/analytics/orders`
* **Response (200 OK)**: Returns total orders, gross order value, average order value, and daily distribution.

#### 18.4.4 `GET /api/v1/admin/analytics/subscriptions`
* **Response (200 OK)**: Returns active subscriptions, plan breakdown, and recurring revenue.

#### 18.4.5 `GET /api/v1/admin/analytics/payments`
* **Response (200 OK)**: Returns total payment attempts, verified collected revenue, refunds, failed counts, and failure rates.

---

### 18.5 Operational System Health

Restricted to authorized Super Admins. Never returns database passwords, connection strings, or system environment variables.

#### 18.5.1 `GET /api/v1/admin/health`
* **Response (200 OK)**: Runtime metrics (uptime, memory RSS/heap in MB, node version).

#### 18.5.2 `GET /api/v1/admin/health/database`
* **Response (200 OK)**: Lightweight PostgreSQL connectivity probe with 3-second timeout and latency in milliseconds.

#### 18.5.3 `GET /api/v1/admin/health/queues`
* **Response (200 OK)**: Background job queue state (pending, processing, and dead-letter counts).

---

### 18.6 Platform Audit Log Inspection

#### 18.6.1 `GET /api/v1/admin/audit-logs`
* **Access**: Super Admin Only
* **Query Parameters**: `page`, `limit`, `action`, `actorUserId`, `targetType`, `tenantId`, `startDate`, `endDate`
* **Response (200 OK)**: Returns paginated administrative audit logs with sanitized metadata.







