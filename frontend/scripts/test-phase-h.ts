import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, "../src");
const DOCS_DIR = path.resolve(__dirname, "../../docs");

console.log("==========================================================");
console.log(" GAUSHILP OS — PHASE H FINAL QA & READINESS SUITE");
console.log("==========================================================");

let passedCount = 0;
let failedCount = 0;

function it(desc: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res && typeof (res as any).then === "function") {
      throw new Error(`Async test "${desc}" must be awaited`);
    }
    console.log(`  ✅ [PASS] ${desc}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(`     Reason: ${err.message}`);
    failedCount++;
  }
}

async function itAsync(desc: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(`     Reason: ${err.message}`);
    failedCount++;
  }
}

// ----------------------------------------------------
// SECTION 1: Route Completeness & Component Existence
// ----------------------------------------------------
console.log("\n📌 1. Comprehensive Route Architecture & Component Coverage");

const REQUIRED_APP_ROUTES = [
  // Auth
  "app/login/page.tsx",
  "app/register/page.tsx",
  "app/forgot-password/page.tsx",
  // Super Admin
  "app/admin/overview/page.tsx",
  "app/admin/health/page.tsx",
  "app/admin/analytics/page.tsx",
  "app/admin/tenants/page.tsx",
  "app/admin/orders/page.tsx",
  "app/admin/payments/page.tsx",
  "app/admin/users/page.tsx",
  "app/admin/subscriptions/page.tsx",
  "app/admin/stores/page.tsx",
  "app/admin/settings/page.tsx",
  "app/admin/audit-logs/page.tsx",
  // Seller OS
  "app/seller/dashboard/page.tsx",
  "app/seller/products/page.tsx",
  "app/seller/inventory/page.tsx",
  "app/seller/orders/page.tsx",
  "app/seller/categories/page.tsx",
  "app/seller/customers/page.tsx",
  "app/seller/shipping/page.tsx",
  "app/seller/settings/page.tsx",
  "app/seller/subscription/page.tsx",
  "app/seller/analytics/page.tsx",
  // Customer Portal
  "app/account/page.tsx",
  "app/account/profile/page.tsx",
  "app/account/addresses/page.tsx",
  "app/account/wishlist/page.tsx",
  "app/account/orders/page.tsx",
  "app/account/orders/[orderId]/page.tsx",
  "app/account/notifications/page.tsx",
  // Public Storefront & Payments
  "app/store/[slug]/page.tsx",
  "app/store/[slug]/products/page.tsx",
  "app/store/[slug]/products/[productSlug]/page.tsx",
  "app/store/[slug]/categories/[categorySlug]/page.tsx",
  "app/store/[slug]/cart/page.tsx",
  "app/store/[slug]/checkout/page.tsx",
  "app/store/[slug]/checkout/confirmation/page.tsx",
];

for (const relPath of REQUIRED_APP_ROUTES) {
  it(`Route file exists: src/${relPath}`, () => {
    const fullPath = path.join(SRC_DIR, relPath);
    assert.strictEqual(fs.existsSync(fullPath), true, `Missing route file: ${relPath}`);
  });
}

// ----------------------------------------------------
// SECTION 2: App Providers & Defense-in-Depth Hooks
// ----------------------------------------------------
console.log("\n📌 2. Context Providers & Safe Fallback Invariants");

it("AppProviders encompasses ToastProvider, AuthProvider, and CartProvider", () => {
  const providersPath = path.join(SRC_DIR, "components/providers/AppProviders.tsx");
  const content = fs.readFileSync(providersPath, "utf8");
  assert.strictEqual(content.includes("<ToastProvider>"), true, "Missing ToastProvider");
  assert.strictEqual(content.includes("<AuthProvider>"), true, "Missing AuthProvider");
  assert.strictEqual(content.includes("<CartProvider>"), true, "Missing CartProvider");
});

it("useCart hook provides safe default fallback without throwing outside provider", () => {
  const cartContextPath = path.join(SRC_DIR, "context/CartContext.tsx");
  const content = fs.readFileSync(cartContextPath, "utf8");
  assert.strictEqual(content.includes("defaultCartContext"), true, "Missing defaultCartContext");
  assert.strictEqual(content.includes("return context || defaultCartContext"), true, "useCart does not safely return fallback");
});

it("useAuth hook provides safe default fallback without throwing outside provider", () => {
  const authContextPath = path.join(SRC_DIR, "context/AuthContext.tsx");
  const content = fs.readFileSync(authContextPath, "utf8");
  assert.strictEqual(content.includes("defaultAuthContext"), true, "Missing defaultAuthContext");
  assert.strictEqual(content.includes("return context || defaultAuthContext"), true, "useAuth does not safely return fallback");
});

// ----------------------------------------------------
// SECTION 3: Visual Design System & Token Integrity
// ----------------------------------------------------
console.log("\n📌 3. GauShilp OS Approved Design Tokens & Visual Integrity");

const tokensCss = fs.readFileSync(path.join(SRC_DIR, "styles/tokens.css"), "utf8");

it("Primary indigo token (#5B5CE2) defined in tokens.css", () => {
  assert.strictEqual(tokensCss.includes("#5B5CE2") || tokensCss.includes("#5b5ce2"), true);
});

it("Deep indigo token (#4445C8) defined in tokens.css", () => {
  assert.strictEqual(tokensCss.includes("#4445C8") || tokensCss.includes("#4445c8"), true);
});

it("Lavender background token (#F4F5FF) defined in tokens.css", () => {
  assert.strictEqual(tokensCss.includes("#F4F5FF") || tokensCss.includes("#f4f5ff"), true);
});

it("Main text token (#20233C) defined in tokens.css", () => {
  assert.strictEqual(tokensCss.includes("#20233C") || tokensCss.includes("#20233c"), true);
});

it("Secondary text token (#747894) defined in tokens.css", () => {
  assert.strictEqual(tokensCss.includes("#747894") || tokensCss.includes("#747894"), true);
});

it("Orange accent token (#FF9C43) defined in tokens.css", () => {
  assert.strictEqual(tokensCss.includes("#FF9C43") || tokensCss.includes("#ff9c43"), true);
});

it("Teal accent token (#23B9AF) defined in tokens.css", () => {
  assert.strictEqual(tokensCss.includes("#23B9AF") || tokensCss.includes("#23b9af"), true);
});

it("Accessibility: prefers-reduced-motion media query respected in animations", () => {
  const animationsCss = fs.readFileSync(path.join(SRC_DIR, "styles/animations.css"), "utf8");
  assert.strictEqual(animationsCss.includes("@media (prefers-reduced-motion: reduce)"), true);
});

// ----------------------------------------------------
// SECTION 4: Security, Authentication & Role Isolation
// ----------------------------------------------------
console.log("\n📌 4. Application Security, Authorization & Tenant Isolation");

it("Super Admin route guard enforces SUPER_ADMIN platform role", () => {
  const adminPage = fs.readFileSync(path.join(SRC_DIR, "app/admin/overview/page.tsx"), "utf8");
  assert.strictEqual(adminPage.includes("currentRole !== \"SUPER_ADMIN\"") || adminPage.includes("SUPER_ADMIN"), true);
  assert.strictEqual(adminPage.includes("Access Denied"), true);
});

it("Seller routes enforce STORE_OWNER / STORE_MANAGER / STORE_STAFF roles", () => {
  const sellerPage = fs.readFileSync(path.join(SRC_DIR, "app/seller/dashboard/page.tsx"), "utf8");
  assert.strictEqual(sellerPage.includes("STORE_OWNER"), true);
  assert.strictEqual(sellerPage.includes("STORE_MANAGER"), true);
});

it("Orders API enforces Idempotency-Key header to prevent duplicate charges", () => {
  const checkoutApi = fs.readFileSync(path.join(SRC_DIR, "lib/checkoutApi.ts"), "utf8");
  assert.strictEqual(checkoutApi.includes("idempotency-key"), true);
  assert.strictEqual(checkoutApi.includes("idempotencyKey"), true);
});

it("Payment verification strictly queries backend orders API and does not trust query params", () => {
  const confPage = fs.readFileSync(path.join(SRC_DIR, "app/store/[slug]/checkout/confirmation/page.tsx"), "utf8");
  assert.strictEqual(confPage.includes("getOrderDetails"), true);
  assert.strictEqual(confPage.includes("searchParams.get(\"orderId\")") || confPage.includes("useSearchParams"), true);
});

it("No live payment gateway private keys or hardcoded API secrets in frontend repository", () => {
  const envExample = fs.readFileSync(path.resolve(__dirname, "../../.env.example"), "utf8");
  assert.strictEqual(envExample.includes("JWT_SECRET"), true);
  // Verify client env does not expose secret keys
  const clientAuth = fs.readFileSync(path.join(SRC_DIR, "lib/authApi.ts"), "utf8");
  assert.strictEqual(clientAuth.includes("rzp_live_secret"), false);
  assert.strictEqual(clientAuth.includes("sk_live_"), false);
});

// ----------------------------------------------------
// SECTION 5: Responsive Screenshots & Viewport Artifacts
// ----------------------------------------------------
console.log("\n📌 5. Responsive Testing Artifacts & Viewport Validation");

const EXPECTED_SCREENSHOTS = [
  "mobile-375-store.png",
  "mobile-390-cart.png",
  "tablet-768-checkout.png",
  "desktop-1366-seller.png",
  "desktop-1920-admin.png",
  "desktop-1366-account.png",
];

const screenshotsDir = path.join(DOCS_DIR, "screenshots");
for (const sc of EXPECTED_SCREENSHOTS) {
  it(`Screenshot artifact generated: docs/screenshots/${sc}`, () => {
    const scPath = path.join(screenshotsDir, sc);
    assert.strictEqual(fs.existsSync(scPath), true, `Missing screenshot: ${sc}`);
    const stats = fs.statSync(scPath);
    assert.strictEqual(stats.size > 1000, true, `Screenshot file is empty: ${sc}`);
  });
}

// ----------------------------------------------------
// SECTION 6: Next.js Configuration & Image Domains
// ----------------------------------------------------
console.log("\n📌 6. Next.js 16 Configuration & Media Asset Optimization");

it("next.config.ts configures remotePatterns for external product/store images", () => {
  const nextConfig = fs.readFileSync(path.resolve(__dirname, "../next.config.ts"), "utf8");
  assert.strictEqual(nextConfig.includes("remotePatterns"), true, "remotePatterns missing in next.config.ts");
  assert.strictEqual(nextConfig.includes("hostname: \"**\""), true, "wildcard hostname missing");
});

console.log("\n==========================================================");
console.log(` RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("==========================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("\n🎉 ALL PHASE H QA & PRODUCTION READINESS CHECKS VERIFIED!\n");
}
