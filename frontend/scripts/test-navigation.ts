/**
 * GAUSHILP OS — ROLE-AWARE NAVIGATION VERIFICATION TEST
 * Validates permission matrices, role-specific nav items, and route guards.
 */

import {
  getNavItemsForRole,
  canRoleAccessRoute,
  getDefaultRouteForRole,
} from "../src/config/navigation.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log("\n🧪 Running GauShilp OS Role-Aware Navigation Tests...\n");

// 1. Super Admin Navigation Verification
const adminItems = getNavItemsForRole("SUPER_ADMIN");
assert(
  adminItems.length === 11,
  `SUPER_ADMIN should have exactly 11 nav items, found ${adminItems.length}`
);
assert(
  adminItems.some((i) => i.href === "/admin/overview"),
  "SUPER_ADMIN has /admin/overview"
);
assert(
  adminItems.some((i) => i.href === "/admin/tenants"),
  "SUPER_ADMIN has /admin/tenants"
);
assert(
  adminItems.some((i) => i.href === "/admin/health"),
  "SUPER_ADMIN has /admin/health"
);

// 2. Seller Roles Differentiation
const ownerItems = getNavItemsForRole("STORE_OWNER");
const managerItems = getNavItemsForRole("STORE_MANAGER");
const staffItems = getNavItemsForRole("STORE_STAFF");

assert(
  ownerItems.some((i) => i.href === "/seller/settings"),
  "STORE_OWNER has access to /seller/settings"
);
assert(
  ownerItems.some((i) => i.href === "/seller/subscription"),
  "STORE_OWNER has access to /seller/subscription"
);

assert(
  !managerItems.some((i) => i.href === "/seller/settings"),
  "STORE_MANAGER does NOT have access to /seller/settings"
);
assert(
  !managerItems.some((i) => i.href === "/seller/subscription"),
  "STORE_MANAGER does NOT have access to /seller/subscription"
);

assert(
  !staffItems.some((i) => i.href === "/seller/customers"),
  "STORE_STAFF does NOT have access to /seller/customers"
);
assert(
  !staffItems.some((i) => i.href === "/seller/analytics"),
  "STORE_STAFF does NOT have access to /seller/analytics"
);
assert(
  staffItems.some((i) => i.href === "/seller/products"),
  "STORE_STAFF has access to /seller/products"
);
assert(
  staffItems.some((i) => i.href === "/seller/orders"),
  "STORE_STAFF has access to /seller/orders"
);

// 3. Customer Navigation Verification
const customerItems = getNavItemsForRole("CUSTOMER");
assert(
  customerItems.length === 6,
  `CUSTOMER should have exactly 6 nav items, found ${customerItems.length}`
);
assert(
  customerItems.some((i) => i.href === "/account"),
  "CUSTOMER has /account"
);
assert(
  customerItems.some((i) => i.href === "/account/orders"),
  "CUSTOMER has /account/orders"
);

// 4. Route Access Control Matrix
assert(
  canRoleAccessRoute("/admin/overview", "SUPER_ADMIN").allowed === true,
  "SUPER_ADMIN can access /admin/overview"
);
assert(
  canRoleAccessRoute("/admin/overview", "STORE_OWNER").allowed === false,
  "STORE_OWNER CANNOT access /admin/overview (Access Denied)"
);
assert(
  canRoleAccessRoute("/admin/overview", null).allowed === false,
  "Unauthenticated visitor CANNOT access /admin/overview"
);

assert(
  canRoleAccessRoute("/seller/dashboard", "STORE_OWNER").allowed === true,
  "STORE_OWNER can access /seller/dashboard"
);
assert(
  canRoleAccessRoute("/seller/settings", "STORE_STAFF").allowed === false,
  "STORE_STAFF CANNOT access /seller/settings"
);

assert(
  canRoleAccessRoute("/", null).allowed === true,
  "Public storefront / is accessible without auth"
);
assert(
  canRoleAccessRoute("/login", null).allowed === true,
  "Login /login is accessible without auth"
);

// 5. Default Routes by Role
assert(
  getDefaultRouteForRole("SUPER_ADMIN") === "/admin/overview",
  "Default route for SUPER_ADMIN is /admin/overview"
);
assert(
  getDefaultRouteForRole("STORE_OWNER") === "/seller/dashboard",
  "Default route for STORE_OWNER is /seller/dashboard"
);
assert(
  getDefaultRouteForRole("CUSTOMER") === "/account",
  "Default route for CUSTOMER is /account"
);

console.log("\n🎉 ALL 18 NAVIGATION & ROLE-AWARE ACCESS RULES VERIFIED 100%!\n");
