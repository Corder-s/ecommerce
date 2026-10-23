/**
 * GAUSHILP OS — PHASE B VERIFICATION SUITE
 * Comprehensive validation across Layout, Role Navigation, Routing, Auth,
 * Accessibility (prefers-reduced-motion), and Phase A compatibility.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  getNavItemsForRole,
  canRoleAccessRoute,
  getDefaultRouteForRole,
} from "../src/config/navigation.ts";

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
console.log(" GAUSHILP OS — PHASE B AUTOMATED VERIFICATION SUITE");
console.log("==========================================================\n");

// -----------------------------------------------------------------------------
// Test 1: Navigation Configuration for All 5 Roles
// -----------------------------------------------------------------------------
console.log("📌 1. Central Navigation Configuration (5 Roles)");

const superAdminNav = getNavItemsForRole("SUPER_ADMIN");
assert(
  superAdminNav.length === 11,
  "SUPER_ADMIN has exactly 11 configured navigation items",
  `Found: ${superAdminNav.length}`
);

const expectedAdminHrefs = [
  "/admin/overview",
  "/admin/tenants",
  "/admin/stores",
  "/admin/users",
  "/admin/subscriptions",
  "/admin/orders",
  "/admin/payments",
  "/admin/analytics",
  "/admin/audit-logs",
  "/admin/health",
  "/admin/settings",
];
const missingAdminHrefs = expectedAdminHrefs.filter((h) => !superAdminNav.some((n) => n.href === h));
assert(
  missingAdminHrefs.length === 0,
  "SUPER_ADMIN includes all required admin routes",
  `Missing: ${missingAdminHrefs.join(", ")}`
);

const ownerNav = getNavItemsForRole("STORE_OWNER");
const managerNav = getNavItemsForRole("STORE_MANAGER");
const staffNav = getNavItemsForRole("STORE_STAFF");

assert(
  ownerNav.some((n) => n.href === "/seller/settings") && ownerNav.some((n) => n.href === "/seller/subscription"),
  "STORE_OWNER has access to sensitive settings & subscription"
);
assert(
  !managerNav.some((n) => n.href === "/seller/settings") && !managerNav.some((n) => n.href === "/seller/subscription"),
  "STORE_MANAGER is restricted from /seller/settings and /seller/subscription"
);
assert(
  managerNav.some((n) => n.href === "/seller/analytics") && managerNav.some((n) => n.href === "/seller/customers"),
  "STORE_MANAGER retains access to analytics & customers"
);
assert(
  !staffNav.some((n) => n.href === "/seller/customers") &&
    !staffNav.some((n) => n.href === "/seller/shipping") &&
    !staffNav.some((n) => n.href === "/seller/analytics"),
  "STORE_STAFF is strictly restricted from customers, shipping, and analytics"
);
assert(
  staffNav.some((n) => n.href === "/seller/products") && staffNav.some((n) => n.href === "/seller/orders"),
  "STORE_STAFF maintains access to operational products and orders"
);

const customerNav = getNavItemsForRole("CUSTOMER");
assert(
  customerNav.length === 6,
  "CUSTOMER has exactly 6 customer portal items",
  `Found: ${customerNav.length}`
);
const expectedCustomerHrefs = [
  "/account",
  "/account/orders",
  "/account/addresses",
  "/account/wishlist",
  "/account/notifications",
  "/account/profile",
];
const missingCustomerHrefs = expectedCustomerHrefs.filter((h) => !customerNav.some((n) => n.href === h));
assert(
  missingCustomerHrefs.length === 0,
  "CUSTOMER navigation includes all 6 requested customer routes"
);

// -----------------------------------------------------------------------------
// Test 2: Role-Based Route Guard Enforcement & Access Control Matrix
// -----------------------------------------------------------------------------
console.log("\n📌 2. Role-Based Route Guard Enforcement");

// Unauthenticated users
assert(
  canRoleAccessRoute("/admin/overview", null).allowed === false,
  "Unauthenticated access to /admin/overview is blocked"
);
assert(
  canRoleAccessRoute("/seller/dashboard", null).allowed === false,
  "Unauthenticated access to /seller/dashboard is blocked"
);
assert(
  canRoleAccessRoute("/account", null).allowed === false,
  "Unauthenticated access to /account is blocked"
);

// Public routes
assert(
  canRoleAccessRoute("/", null).allowed === true,
  "Public storefront / is accessible to all"
);
assert(
  canRoleAccessRoute("/login", null).allowed === true,
  "Authentication /login is accessible without session"
);
assert(
  canRoleAccessRoute("/register", null).allowed === true,
  "Authentication /register is accessible without session"
);
assert(
  canRoleAccessRoute("/forgot-password", null).allowed === true,
  "Authentication /forgot-password is accessible without session"
);

// Cross-role privilege escalation protection
assert(
  canRoleAccessRoute("/admin/overview", "STORE_OWNER").allowed === false,
  "STORE_OWNER cannot access /admin/overview"
);
assert(
  canRoleAccessRoute("/admin/overview", "CUSTOMER").allowed === false,
  "CUSTOMER cannot access /admin/overview"
);
assert(
  canRoleAccessRoute("/seller/settings", "STORE_STAFF").allowed === false,
  "STORE_STAFF cannot access /seller/settings"
);
assert(
  canRoleAccessRoute("/seller/analytics", "STORE_STAFF").allowed === false,
  "STORE_STAFF cannot access /seller/analytics"
);
assert(
  canRoleAccessRoute("/seller/dashboard", "STORE_OWNER").allowed === true,
  "STORE_OWNER is permitted into /seller/dashboard"
);
assert(
  canRoleAccessRoute("/admin/overview", "SUPER_ADMIN").allowed === true,
  "SUPER_ADMIN is permitted into /admin/overview"
);

// -----------------------------------------------------------------------------
// Test 3: Default Route Redirection by Role
// -----------------------------------------------------------------------------
console.log("\n📌 3. Default Role Route Redirections");
assert(
  getDefaultRouteForRole("SUPER_ADMIN") === "/admin/overview",
  "SUPER_ADMIN routes to /admin/overview"
);
assert(
  getDefaultRouteForRole("STORE_OWNER") === "/seller/dashboard",
  "STORE_OWNER routes to /seller/dashboard"
);
assert(
  getDefaultRouteForRole("STORE_MANAGER") === "/seller/dashboard",
  "STORE_MANAGER routes to /seller/dashboard"
);
assert(
  getDefaultRouteForRole("STORE_STAFF") === "/seller/dashboard",
  "STORE_STAFF routes to /seller/dashboard"
);
assert(
  getDefaultRouteForRole("CUSTOMER") === "/account",
  "CUSTOMER routes to /account"
);

// -----------------------------------------------------------------------------
// Test 4: Reusable Layout & UI Component Integrity
// -----------------------------------------------------------------------------
console.log("\n📌 4. Layout & UI Component Structure");

const expectedComponents = [
  "layout/AppShell.tsx",
  "layout/AppSidebar.tsx",
  "layout/AppTopNav.tsx",
  "auth/AccessDenied.tsx",
  "ui/Button.tsx",
  "ui/Input.tsx",
  "ui/Card.tsx",
  "ui/Table.tsx",
  "ui/Badge.tsx",
  "ui/Dropdown.tsx",
  "ui/Tabs.tsx",
  "ui/Modal.tsx",
  "ui/Tooltip.tsx",
  "ui/Skeleton.tsx",
  "ui/EmptyState.tsx",
  "ui/ErrorState.tsx",
  "ui/Pagination.tsx",
];

const componentsBase = path.join(__dirname, "../src/components");
for (const comp of expectedComponents) {
  const fullPath = path.join(componentsBase, comp);
  const exists = fs.existsSync(fullPath);
  assert(exists, `Component exists: src/components/${comp}`);
}

// -----------------------------------------------------------------------------
// Test 5: Design Tokens & Accessibility (prefers-reduced-motion)
// -----------------------------------------------------------------------------
console.log("\n📌 5. Design Tokens & Accessibility Verification");

const tokensPath = path.join(__dirname, "../src/styles/tokens.css");
const animationsPath = path.join(__dirname, "../src/styles/animations.css");

const tokensContent = fs.readFileSync(tokensPath, "utf-8");
const animationsContent = fs.readFileSync(animationsPath, "utf-8");

assert(tokensContent.includes("#5B5CE2"), "Design token primary indigo #5B5CE2 present");
assert(tokensContent.includes("#4445C8"), "Design token deep indigo #4445C8 present");
assert(tokensContent.includes("#F4F5FF"), "Design token background #F4F5FF present");
assert(tokensContent.includes("#20233C"), "Design token main text #20233C present");
assert(tokensContent.includes("#747894"), "Design token secondary text #747894 present");
assert(tokensContent.includes("#E4E6F4"), "Design token border #E4E6F4 present");
assert(tokensContent.includes("#FF9C43"), "Design token orange accent #FF9C43 present");
assert(tokensContent.includes("#23B9AF"), "Design token teal accent #23B9AF present");
assert(tokensContent.includes("#18845A"), "Design token success #18845A present");

assert(
  animationsContent.includes("prefers-reduced-motion: reduce"),
  "CSS animations include @media (prefers-reduced-motion: reduce) override"
);

// -----------------------------------------------------------------------------
// Test 6: Phase A Authentication Pages Integrity
// -----------------------------------------------------------------------------
console.log("\n📌 6. Phase A Authentication Pages Integrity");

const authPages = [
  path.join(__dirname, "../src/app/login/page.tsx"),
  path.join(__dirname, "../src/app/register/page.tsx"),
  path.join(__dirname, "../src/app/forgot-password/page.tsx"),
];

for (const page of authPages) {
  assert(fs.existsSync(page), `Auth page exists: ${path.basename(path.dirname(page))}/page.tsx`);
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("\n==========================================================");
console.log(` RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("==========================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PHASE B ARCHITECTURAL & ROLE REQUIREMENTS VERIFIED!\n");
  process.exit(0);
}
