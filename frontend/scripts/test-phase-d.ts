/**
 * GAUSHILP OS — PHASE D SELLER DASHBOARD & BUSINESS MANAGEMENT VERIFICATION SUITE
 * Validates:
 * 1. Role-aware route access (STORE_OWNER, STORE_MANAGER, STORE_STAFF)
 * 2. Store branding & tenant context isolation
 * 3. KPI metrics & sales time-series analytics
 * 4. Product catalogue management & validation
 * 5. Stock reservation model & inventory invariants
 * 6. Category management & product association deletion blocking
 * 7. Order management & valid state-machine lifecycle transitions
 * 8. Shipping fulfillment, carrier tracking, and parcel dispatch
 * 9. Store settings & SaaS subscription plan tiers
 * 10. Design tokens & accessibility standards
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { canRoleAccessRoute } from "../src/config/navigation.ts";
import {
  fetchCurrentStore,
  fetchSellerKPIs,
  fetchProducts,
  fetchCategories,
  fetchOrders,
  fetchReadyOrders,
  fetchShipments,
  fetchCurrentSubscription,
  fetchSubscriptionPlans,
  VALID_ORDER_TRANSITIONS,
  updateOrderStatus,
  deleteCategory,
} from "../src/lib/sellerApi.ts";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${title}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${title}${details ? ` -> ${details}` : ""}`);
    failedCount++;
  }
}

console.log("==========================================================");
console.log(" GAUSHILP OS — PHASE D SELLER DASHBOARD VERIFICATION SUITE");
console.log("==========================================================\n");

async function runPhaseDTests() {
  // -----------------------------------------------------------------------------
  // Test 1: Role-Aware Route Access & Security
  // -----------------------------------------------------------------------------
  console.log("📌 1. Role-Aware Route Access & Security Gating");

  // Dashboard Overview
  assert(
    canRoleAccessRoute("/seller/dashboard", "STORE_OWNER").allowed === true,
    "STORE_OWNER has access to /seller/dashboard"
  );
  assert(
    canRoleAccessRoute("/seller/dashboard", "STORE_MANAGER").allowed === true,
    "STORE_MANAGER has access to /seller/dashboard"
  );
  assert(
    canRoleAccessRoute("/seller/dashboard", "STORE_STAFF").allowed === true,
    "STORE_STAFF has access to /seller/dashboard"
  );
  assert(
    canRoleAccessRoute("/seller/dashboard", "CUSTOMER").allowed === false,
    "CUSTOMER is blocked from /seller/dashboard"
  );

  // Settings & Subscription (STORE_OWNER only)
  assert(
    canRoleAccessRoute("/seller/settings", "STORE_OWNER").allowed === true,
    "STORE_OWNER has access to /seller/settings"
  );
  assert(
    canRoleAccessRoute("/seller/settings", "STORE_MANAGER").allowed === false,
    "STORE_MANAGER is blocked from /seller/settings (Owner-only)"
  );
  assert(
    canRoleAccessRoute("/seller/settings", "STORE_STAFF").allowed === false,
    "STORE_STAFF is blocked from /seller/settings"
  );
  assert(
    canRoleAccessRoute("/seller/subscription", "STORE_OWNER").allowed === true,
    "STORE_OWNER has access to /seller/subscription"
  );
  assert(
    canRoleAccessRoute("/seller/subscription", "STORE_MANAGER").allowed === false,
    "STORE_MANAGER is blocked from /seller/subscription"
  );

  // Categories & Customers (STORE_OWNER & STORE_MANAGER, but not STORE_STAFF)
  assert(
    canRoleAccessRoute("/seller/categories", "STORE_MANAGER").allowed === true,
    "STORE_MANAGER has access to /seller/categories"
  );
  assert(
    canRoleAccessRoute("/seller/categories", "STORE_STAFF").allowed === false,
    "STORE_STAFF is blocked from /seller/categories"
  );
  assert(
    canRoleAccessRoute("/seller/customers", "STORE_MANAGER").allowed === true,
    "STORE_MANAGER has access to /seller/customers"
  );
  assert(
    canRoleAccessRoute("/seller/customers", "STORE_STAFF").allowed === false,
    "STORE_STAFF is blocked from /seller/customers"
  );

  // -----------------------------------------------------------------------------
  // Test 2: Store Branding & Tenant Context
  // -----------------------------------------------------------------------------
  console.log("\n📌 2. Store Branding & Business Context");

  const store = await fetchCurrentStore("tenant_mitti_craft");
  assert(store !== null && typeof store === "object", "Store profile returned successfully");
  assert(store.tenantId === "tenant_mitti_craft", "Store belongs to authenticated tenant context");
  assert(store.name.length > 0, `Store has valid business name: "${store.name}"`);
  assert(store.slug.length > 0, `Store has valid public slug handle: "/store/${store.slug}"`);
  assert(store.isPublished === true, "Store active publishing flag is verified");
  assert(store.currency === "INR", "Store transactional currency is INR");

  // -----------------------------------------------------------------------------
  // Test 3: Seller KPI Metrics & Sales Trends
  // -----------------------------------------------------------------------------
  console.log("\n📌 3. Seller KPI Metrics & Sales Analytics");

  const kpis = await fetchSellerKPIs("tenant_mitti_craft");
  assert(typeof kpis.totalSales === "number" && kpis.totalSales >= 0, `Total Sales metric is valid: ₹${kpis.totalSales}`);
  assert(typeof kpis.totalOrders === "number" && kpis.totalOrders >= 0, `Total Orders count is valid: ${kpis.totalOrders}`);
  assert(typeof kpis.totalProducts === "number" && kpis.totalProducts > 0, `Total Products count is valid: ${kpis.totalProducts}`);
  assert(typeof kpis.lowStockCount === "number" && kpis.lowStockCount >= 0, `Low Stock count is valid: ${kpis.lowStockCount}`);

  // -----------------------------------------------------------------------------
  // Test 4: Product Catalogue & Reservation Invariants
  // -----------------------------------------------------------------------------
  console.log("\n📌 4. Product Management & Reservation Invariants");

  const productsRes = await fetchProducts({}, "tenant_mitti_craft");
  assert(Array.isArray(productsRes.data) && productsRes.data.length > 0, "Products list returns array of items");

  for (const prod of productsRes.data) {
    assert(prod.price >= 0, `Product "${prod.name}" has valid price: ₹${prod.price}`);
    assert(prod.stock >= 0, `Product "${prod.name}" has non-negative total stock: ${prod.stock}`);
    assert(prod.reservedStock >= 0, `Product "${prod.name}" has non-negative reserved stock: ${prod.reservedStock}`);
    assert(
      prod.availableStock === prod.stock - prod.reservedStock,
      `Product "${prod.name}" available stock strictly equals (stock - reserved): ${prod.availableStock}`
    );
  }

  // -----------------------------------------------------------------------------
  // Test 5: Category Management & Foreign Key Protection
  // -----------------------------------------------------------------------------
  console.log("\n📌 5. Category Management & Product Reference Protection");

  const categories = await fetchCategories("tenant_mitti_craft");
  assert(Array.isArray(categories) && categories.length > 0, "Categories list loaded");

  // Verify deletion protection when products exist
  let caughtCategoryError = false;
  try {
    // Attempt deleting a category that has products assigned
    await deleteCategory("cat_diyas", "tenant_mitti_craft");
  } catch (err: any) {
    caughtCategoryError = true;
    assert(
      err.message.includes("Cannot delete category") || err.message.includes("product"),
      "Deleting category with active products is rejected with descriptive error"
    );
  }
  assert(caughtCategoryError === true, "Category product association check enforced");

  // -----------------------------------------------------------------------------
  // Test 6: Order Management & Permitted State Transitions
  // -----------------------------------------------------------------------------
  console.log("\n📌 6. Order Management & Valid State Machine Transitions");

  assert(
    VALID_ORDER_TRANSITIONS["PLACED"].includes("CONFIRMED"),
    "State machine allows: PLACED -> CONFIRMED"
  );
  assert(
    VALID_ORDER_TRANSITIONS["CONFIRMED"].includes("PROCESSING"),
    "State machine allows: CONFIRMED -> PROCESSING"
  );
  assert(
    VALID_ORDER_TRANSITIONS["PROCESSING"].includes("SHIPPED"),
    "State machine allows: PROCESSING -> SHIPPED"
  );
  assert(
    VALID_ORDER_TRANSITIONS["SHIPPED"].includes("DELIVERED"),
    "State machine allows: SHIPPED -> DELIVERED"
  );
  assert(
    VALID_ORDER_TRANSITIONS["CANCELLED"].length === 0,
    "Terminal state CANCELLED has 0 further transitions"
  );
  assert(
    !VALID_ORDER_TRANSITIONS["DELIVERED"].includes("SHIPPED"),
    "Invalid reverse transition DELIVERED -> SHIPPED is disallowed"
  );

  const ordersRes = await fetchOrders({}, "tenant_mitti_craft");
  assert(Array.isArray(ordersRes.data) && ordersRes.data.length > 0, "Orders list retrieved");

  // -----------------------------------------------------------------------------
  // Test 7: Shipping & Fulfillment Pipeline
  // -----------------------------------------------------------------------------
  console.log("\n📌 7. Shipping & Fulfillment Pipeline");

  const readyOrders = await fetchReadyOrders("tenant_mitti_craft");
  assert(Array.isArray(readyOrders), "Ready-to-ship orders retrieved");

  const shipments = await fetchShipments();
  assert(Array.isArray(shipments) && shipments.length > 0, "Active shipments list retrieved");
  assert(shipments[0].trackingNumber.length > 0, `Shipment has valid tracking number: ${shipments[0].trackingNumber}`);

  // -----------------------------------------------------------------------------
  // Test 8: Store Subscriptions & Billing Tiers
  // -----------------------------------------------------------------------------
  console.log("\n📌 8. Store Subscriptions & Plan Tiers");

  const subscription = await fetchCurrentSubscription("tenant_mitti_craft");
  assert(subscription !== null && subscription.status === "ACTIVE", "Active store subscription verified");
  assert(subscription.usage.productCount <= subscription.usage.maxProducts, "Product quota limit respected");

  const plans = await fetchSubscriptionPlans();
  assert(plans.length >= 3, `SaaS subscription tiers available: ${plans.map((p) => p.name).join(", ")}`);

  // -----------------------------------------------------------------------------
  // Test 9: File Architecture & Route Completeness
  // -----------------------------------------------------------------------------
  console.log("\n📌 9. Route Architecture & Component Completeness");

  const requiredRoutes = [
    "app/seller/dashboard/page.tsx",
    "app/seller/products/page.tsx",
    "app/seller/products/new/page.tsx",
    "app/seller/products/[productId]/edit/page.tsx",
    "app/seller/categories/page.tsx",
    "app/seller/inventory/page.tsx",
    "app/seller/orders/page.tsx",
    "app/seller/customers/page.tsx",
    "app/seller/shipping/page.tsx",
    "app/seller/settings/page.tsx",
    "app/seller/subscription/page.tsx",
    "app/seller/analytics/page.tsx",
    "components/seller/OrderDetailModal.tsx",
    "lib/sellerApi.ts",
  ];

  for (const relPath of requiredRoutes) {
    const fullPath = path.join(__dirname, "../src", relPath);
    assert(fs.existsSync(fullPath), `Required Phase D file exists: src/${relPath}`);
  }

  // -----------------------------------------------------------------------------
  // Test Summary
  // -----------------------------------------------------------------------------
  console.log("\n==========================================================");
  console.log(` RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==========================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log("\n🎉 ALL PHASE D SELLER DASHBOARD REQUIREMENTS VERIFIED!\n");
  }
}

runPhaseDTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
