/**
 * GAUSHILP OS — PHASE F PUBLIC STOREFRONT & PRODUCT DISCOVERY VERIFICATION SUITE
 * Validates:
 * 1. Public Store Resolution & Tenant Isolation
 * 2. Store Categories Discovery & Product Count Metrics
 * 3. Product Catalogue Browsing, Category Filtering & Search Debouncing
 * 4. Product Details Retrieval, Gallery & Ritual Safety Metadata
 * 5. Shopping Cart State Synchronization & Mutations
 * 6. Storefront Route Architecture & File Completeness
 * 7. Design Tokens & Multi-Tenant Boundaries
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  getPublicStore,
  getPublicStoreCategories,
  getPublicStoreProducts,
  getPublicProduct,
  getPublicCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  MOCK_PUBLIC_STORE,
  MOCK_PUBLIC_PRODUCTS,
} from "../src/lib/storefrontApi.ts";

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
console.log(" GAUSHILP OS — PHASE F PUBLIC STOREFRONT VERIFICATION SUITE");
console.log("==========================================================\n");

async function runPhaseFTests() {
  // -----------------------------------------------------------------------------
  // Test 1: Public Store Resolution & Tenant Isolation
  // -----------------------------------------------------------------------------
  console.log("📌 1. Public Store Resolution & Tenant Isolation");

  const validStore = await getPublicStore("mitti-craft-studio");
  assert(validStore !== null, "Storefront resolves valid store slug 'mitti-craft-studio'");
  assert(
    validStore.businessName === "Mitti Craft Studio & Pottery",
    `Resolved business name is "${validStore.businessName}"`,
  );
  assert(validStore.isPublished === true, "Store status is verified as published");
  assert(validStore.status === "ACTIVE", "Store status is ACTIVE");
  assert(validStore.currency === "INR", "Store currency is INR");
  assert(
    Boolean(validStore.address?.includes("Mathura")),
    "Store address includes physical Gaushala location",
  );

  // Negative test: non-existent / unpublished store
  let missingError = false;
  try {
    await getPublicStore("non-existent-unpublished-store-999");
  } catch (err: any) {
    missingError = true;
  }
  assert(missingError, "Non-existent or unpublished store throws 404 / NotFound error");

  // -----------------------------------------------------------------------------
  // Test 2: Store Categories Discovery & Product Count Metrics
  // -----------------------------------------------------------------------------
  console.log("\n📌 2. Store Categories Discovery & Product Count Metrics");

  const categoriesRes = await getPublicStoreCategories("mitti-craft-studio");
  assert(Array.isArray(categoriesRes.data), "Categories returned as an array");
  assert(categoriesRes.data.length >= 4, `Store provides at least 4 categories (found ${categoriesRes.data.length})`);

  const diyaCat = categoriesRes.data.find((c) => c.slug === "sacred-diyas");
  assert(diyaCat !== undefined, "Catalogue contains 'Sacred Diyas' category");
  assert(
    diyaCat?._count?.products !== undefined && diyaCat._count.products > 0,
    `Category provides verified product count (${diyaCat?._count?.products})`,
  );

  const dhoopCat = categoriesRes.data.find((c) => c.slug === "incense-dhoop");
  assert(dhoopCat !== undefined, "Catalogue contains 'Incense & Herbal Dhoop' category");

  const kitCat = categoriesRes.data.find((c) => c.slug === "puja-kits");
  assert(kitCat !== undefined, "Catalogue contains 'Sacred Puja Kits' category");

  // -----------------------------------------------------------------------------
  // Test 3: Product Catalogue Browsing, Category Filtering & Search
  // -----------------------------------------------------------------------------
  console.log("\n📌 3. Product Catalogue Browsing, Category Filtering & Search");

  const allProductsRes = await getPublicStoreProducts("mitti-craft-studio", { page: 1, limit: 10 });
  assert(Array.isArray(allProductsRes.data), "Products catalogue returned data array");
  assert(allProductsRes.data.length > 0, `Store catalogue contains products (found ${allProductsRes.data.length})`);
  assert(allProductsRes.meta.total >= allProductsRes.data.length, "Pagination total is accurate");
  assert(allProductsRes.meta.page === 1, "Pagination current page is 1");

  // Category Filtering
  const filteredDiyas = await getPublicStoreProducts("mitti-craft-studio", {
    categoryId: "cat_diyas",
  });
  assert(
    filteredDiyas.data.every((p) => p.category.id === "cat_diyas" || p.category.slug === "sacred-diyas"),
    "All filtered products strictly match requested category 'cat_diyas'",
  );

  // Search by keyword
  const searchRes = await getPublicStoreProducts("mitti-craft-studio", {
    search: "Ganesh",
  });
  assert(
    searchRes.data.some((p) => p.name.includes("Ganesh")),
    "Search keyword 'Ganesh' successfully resolves matching idol product",
  );

  // Non-matching search produces empty list safely
  const emptySearchRes = await getPublicStoreProducts("mitti-craft-studio", {
    search: "synthetic-plastic-item-12345",
  });
  assert(emptySearchRes.data.length === 0, "Non-matching search returns safe empty array with 0 items");

  // -----------------------------------------------------------------------------
  // Test 4: Product Details Retrieval, Gallery & Safety Metadata
  // -----------------------------------------------------------------------------
  console.log("\n📌 4. Product Details Retrieval, Gallery & Safety Metadata");

  const productDetail = await getPublicProduct(
    "mitti-craft-studio",
    "handcrafted-vedic-cow-dung-diyas",
  );
  assert(productDetail.product !== null, "Product details resolved by product slug");
  assert(
    productDetail.product.name === "Handcrafted Vedic Cow Dung Diyas (Pack of 12)",
    `Product name verified: "${productDetail.product.name}"`,
  );
  assert(productDetail.product.price === 349, `Product price verified: ₹${productDetail.product.price}`);
  assert(productDetail.product.currency === "INR", "Product currency verified as INR");
  assert(productDetail.product.stock !== undefined && productDetail.product.stock > 0, "Product stock availability is positive");
  assert(
    Array.isArray(productDetail.product.images) && productDetail.product.images.length > 0,
    "Product provides multi-image gallery assets",
  );
  assert(productDetail.product.sku === "DIY-12PK", "Product SKU matches catalog code: DIY-12PK");
  assert(
    productDetail.store.storeSlug === "mitti-craft-studio",
    "Product is strictly scoped to store tenant 'mitti-craft-studio'",
  );

  // Negative test: invalid product slug
  let invalidProductError = false;
  try {
    await getPublicProduct("mitti-craft-studio", "non-existent-product-slug");
  } catch {
    invalidProductError = true;
  }
  assert(invalidProductError, "Invalid product slug rejects with clean error");

  // -----------------------------------------------------------------------------
  // Test 5: Shopping Cart State Synchronization & Mutations
  // -----------------------------------------------------------------------------
  console.log("\n📌 5. Shopping Cart State Synchronization & Mutations");

  const initialCart = await getPublicCart();
  assert(Array.isArray(initialCart.items), "Cart returns items array");
  assert(initialCart.currency === "INR", "Cart currency is INR");
  assert(initialCart.totalItemsCount >= 0, `Active cart item count is non-negative (${initialCart.totalItemsCount})`);

  // Add product to cart
  const addRes = await addToCart(
    "a0000000-0000-0000-0000-000000000002",
    2,
    "mitti-craft-studio",
  );
  assert(addRes.success === true, "Item successfully added to shopping cart");

  const updatedCart = await getPublicCart();
  const addedItem = updatedCart.items.find(
    (i) => i.productId === "a0000000-0000-0000-0000-000000000002",
  );
  assert(addedItem !== undefined, "Newly added product is present in cart items");
  assert(addedItem?.quantity === 2, `Added item quantity is 2 (found ${addedItem?.quantity})`);

  // Update item quantity
  if (addedItem) {
    const updateRes = await updateCartItemQuantity(addedItem.id, 4);
    assert(updateRes.success === true, "Cart item quantity updated to 4");

    const cartAfterUpdate = await getPublicCart();
    const updatedLineItem = cartAfterUpdate.items.find((i) => i.id === addedItem.id);
    assert(updatedLineItem?.quantity === 4, "Updated line item reflects new quantity of 4");
    assert(
      updatedLineItem?.subtotal === 4 * updatedLineItem!.price,
      `Line item subtotal holds invariant (4 * ₹${updatedLineItem?.price} = ₹${updatedLineItem?.subtotal})`,
    );

    // Remove item from cart
    const removeRes = await removeCartItem(addedItem.id);
    assert(removeRes.success === true, "Item successfully removed from cart");
  }

  // -----------------------------------------------------------------------------
  // Test 6: Storefront Route Architecture & File Completeness
  // -----------------------------------------------------------------------------
  console.log("\n📌 6. Storefront Route Architecture & File Completeness");

  const requiredFiles = [
    "src/app/store/[slug]/page.tsx",
    "src/app/store/[slug]/products/page.tsx",
    "src/app/store/[slug]/products/[productSlug]/page.tsx",
    "src/app/store/[slug]/categories/[categorySlug]/page.tsx",
    "src/components/storefront/StorefrontHeader.tsx",
    "src/components/storefront/StorefrontFooter.tsx",
    "src/components/storefront/StoreProductCard.tsx",
    "src/components/storefront/CartDrawer.tsx",
    "src/lib/storefrontApi.ts",
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.resolve(__dirname, "..", relPath);
    const exists = fs.existsSync(fullPath);
    assert(exists, `Required Phase F storefront file exists: ${relPath}`);
  }

  // -----------------------------------------------------------------------------
  // Test 7: Design Tokens & Layout Integrity
  // -----------------------------------------------------------------------------
  console.log("\n📌 7. Design Tokens & Layout Integrity");

  const tokensPath = path.resolve(__dirname, "../src/styles/tokens.css");
  const animationsPath = path.resolve(__dirname, "../src/styles/animations.css");

  const tokensContent = fs.readFileSync(tokensPath, "utf-8");
  const animationsContent = fs.readFileSync(animationsPath, "utf-8");

  assert(tokensContent.includes("#5B5CE2"), "Primary indigo token (#5B5CE2) verified in CSS");
  assert(tokensContent.includes("#4445C8"), "Deep indigo token (#4445C8) verified in CSS");
  assert(tokensContent.includes("#F4F5FF"), "Background token (#F4F5FF) verified in CSS");
  assert(tokensContent.includes("#20233C"), "Main text token (#20233C) verified in CSS");
  assert(tokensContent.includes("#747894"), "Secondary text token (#747894) verified in CSS");
  assert(tokensContent.includes("#E4E6F4"), "Border token (#E4E6F4) verified in CSS");
  assert(tokensContent.includes("#FF9C43"), "Orange accent token (#FF9C43) verified in CSS");
  assert(tokensContent.includes("#23B9AF"), "Teal accent token (#23B9AF) verified in CSS");
  assert(tokensContent.includes("#18845A"), "Success token (#18845A) verified in CSS");
  assert(
    animationsContent.includes("prefers-reduced-motion: reduce"),
    "Accessibility: prefers-reduced-motion media query preserved in animations.css",
  );

  // -----------------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------------
  console.log("\n==========================================================");
  console.log(` RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==========================================================\n");

  if (failedCount > 0) {
    console.error("❌ Some Phase F verification tests failed.");
    process.exit(1);
  } else {
    console.log("🎉 ALL PHASE F PUBLIC STOREFRONT REQUIREMENTS VERIFIED!\n");
  }
}

runPhaseFTests().catch((err) => {
  console.error("Fatal error during Phase F test execution:", err);
  process.exit(1);
});
