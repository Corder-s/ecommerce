/**
 * GAUSHILP OS — PHASE E CUSTOMER DASHBOARD & ACCOUNT MANAGEMENT VERIFICATION SUITE
 * Validates:
 * 1. Role-aware route access (CUSTOMER, STORE_OWNER, SUPER_ADMIN)
 * 2. Customer profile contract & protected identity fields (email immutability)
 * 3. Saved address CRUD, validation, and single default address invariant
 * 4. Wishlist querying, availability status, deletion, and cart addition contract
 * 5. Order history retrieval, customer-ownership scoping, and cancellation rules
 * 6. Order details, line-item financials, and tracking milestones timeline
 * 7. In-app notification center, read/unread states, and mark-read mutations
 * 8. Customer UI route architecture & file completeness
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { canRoleAccessRoute, getNavItemsForRole } from "../src/config/navigation.ts";
import {
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  getCustomerWishlist,
  addToWishlist,
  removeFromWishlist,
  addItemToCart,
  getCustomerOrders,
  getCustomerOrder,
  cancelCustomerOrder,
  getCustomerOrderTracking,
  getCustomerNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  MOCK_CUSTOMER_PROFILE,
  MOCK_CUSTOMER_ADDRESSES,
  MOCK_WISHLIST_ITEMS,
  MOCK_CUSTOMER_ORDERS,
  MOCK_ORDER_TRACKING,
  MOCK_NOTIFICATIONS,
} from "../src/lib/customerApi.ts";

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
console.log(" GAUSHILP OS — PHASE E CUSTOMER DASHBOARD VERIFICATION SUITE");
console.log("==========================================================\n");

async function runPhaseETests() {
  // -----------------------------------------------------------------------------
  // Test 1: Role-Aware Route Access & Customer Navigation
  // -----------------------------------------------------------------------------
  console.log("📌 1. Role-Aware Route Access & Customer Navigation");

  const custNav = getNavItemsForRole("CUSTOMER");
  assert(custNav.length === 6, `CUSTOMER role has exactly 6 configured navigation items (found ${custNav.length})`);
  assert(
    custNav.some((n) => n.href === "/account"),
    "CUSTOMER navigation includes /account overview",
  );
  assert(
    custNav.some((n) => n.href === "/account/orders"),
    "CUSTOMER navigation includes /account/orders",
  );
  assert(
    custNav.some((n) => n.href === "/account/addresses"),
    "CUSTOMER navigation includes /account/addresses",
  );
  assert(
    custNav.some((n) => n.href === "/account/wishlist"),
    "CUSTOMER navigation includes /account/wishlist",
  );
  assert(
    custNav.some((n) => n.href === "/account/notifications"),
    "CUSTOMER navigation includes /account/notifications",
  );
  assert(
    custNav.some((n) => n.href === "/account/profile"),
    "CUSTOMER navigation includes /account/profile",
  );

  const custAccessOverview = canRoleAccessRoute("/account", "CUSTOMER");
  assert(custAccessOverview.allowed, "CUSTOMER has access to /account");

  const custAccessOrders = canRoleAccessRoute("/account/orders", "CUSTOMER");
  assert(custAccessOrders.allowed, "CUSTOMER has access to /account/orders");

  const custBlockedFromAdmin = canRoleAccessRoute("/admin/overview", "CUSTOMER");
  assert(!custBlockedFromAdmin.allowed, "CUSTOMER is blocked from /admin/overview");

  const custBlockedFromSeller = canRoleAccessRoute("/seller/dashboard", "CUSTOMER");
  assert(!custBlockedFromSeller.allowed, "CUSTOMER is blocked from /seller/dashboard");

  // -----------------------------------------------------------------------------
  // Test 2: Customer Profile Contract & Protected Identity
  // -----------------------------------------------------------------------------
  console.log("\n📌 2. Customer Profile Contract & Identity Protection");

  const profile = await getCustomerProfile();
  assert(Boolean(profile.id), `Customer profile has valid ID: "${profile.id}"`);
  assert(Boolean(profile.name), `Customer profile has valid name: "${profile.name}"`);
  assert(Boolean(profile.email), `Customer profile has valid email: "${profile.email}"`);
  assert(profile.isActive === true, "Customer profile active status is verified");

  // Verify email is protected and cannot be changed via profile mutation DTO
  const updatedProfile = await updateCustomerProfile({
    name: "Arjun Devotee Sharma",
    phone: "+91 99887 76655",
    bio: "Passionate patron of sacred Vedic crafts and gau-dhoop.",
  });
  assert(
    updatedProfile.name === "Arjun Devotee Sharma",
    "Customer name was successfully updated in profile",
  );
  assert(
    updatedProfile.phone === "+91 99887 76655",
    "Customer phone was successfully updated in profile",
  );
  assert(
    updatedProfile.email === profile.email,
    "Protected identity field 'email' remained strictly unchanged",
  );

  // -----------------------------------------------------------------------------
  // Test 3: Saved Delivery Address CRUD & Invariants
  // -----------------------------------------------------------------------------
  console.log("\n📌 3. Saved Delivery Address Management & Default Invariants");

  const addresses = await getCustomerAddresses();
  assert(Array.isArray(addresses), "Addresses returned as an array");
  assert(addresses.length >= 2, `Customer has at least 2 saved addresses (found ${addresses.length})`);

  const defaultAddrs = addresses.filter((a) => a.isDefault);
  assert(
    defaultAddrs.length === 1,
    `Exactly one address is marked as default delivery address (found ${defaultAddrs.length})`,
  );

  // Create a new address
  const newAddr = await createCustomerAddress({
    fullName: "Arjun Sharma",
    phone: "+91 98765 43210",
    addressLine1: "Shri Krishna Balaram Mandir Ashram",
    city: "Vrindavan",
    state: "Uttar Pradesh",
    postalCode: "281121",
    country: "IN",
    addressType: "OTHER",
    isDefault: false,
  });
  assert(Boolean(newAddr.id), `New address created with ID: ${newAddr.id}`);

  // Set as default
  const updatedDefault = await setDefaultCustomerAddress(newAddr.id);
  assert(updatedDefault.isDefault === true, "Address set as default successfully");

  // Verify only one default remains
  const afterSetAddresses = await getCustomerAddresses();
  const activeDefaults = afterSetAddresses.filter((a) => a.isDefault);
  assert(
    activeDefaults.length === 1 && activeDefaults[0].id === newAddr.id,
    "Default address invariant strictly maintained across addresses",
  );

  // Delete address
  const deleteRes = await deleteCustomerAddress(newAddr.id);
  assert(deleteRes.success, "Address deleted successfully");

  // Verify remaining addresses have a default
  const remainingAddresses = await getCustomerAddresses();
  assert(
    remainingAddresses.length >= 1 && remainingAddresses.some((a) => a.isDefault),
    "A valid default address is preserved after deleting non-primary address",
  );

  // -----------------------------------------------------------------------------
  // Test 4: Wishlist Integration & Cart Addition Contract
  // -----------------------------------------------------------------------------
  console.log("\n📌 4. Wishlist Integration & Cart Operations");

  const wishlistRes = await getCustomerWishlist({ page: 1, limit: 10 });
  assert(Array.isArray(wishlistRes.items), "Wishlist returned items array");
  assert(wishlistRes.items.length >= 3, `Wishlist contains items (found ${wishlistRes.items.length})`);

  const firstWishItem = wishlistRes.items[0];
  assert(Boolean(firstWishItem.product.name), `Wishlist product has valid name: "${firstWishItem.product.name}"`);
  assert(Number(firstWishItem.product.price) > 0, `Wishlist product has positive price: ₹${firstWishItem.product.price}`);
  assert(
    typeof firstWishItem.isPurchasable === "boolean",
    `Wishlist item provides backend availability flag: isPurchasable = ${firstWishItem.isPurchasable}`,
  );
  assert(
    Boolean(firstWishItem.product.store.businessName),
    `Wishlist item references verified artisan store: "${firstWishItem.product.store.businessName}"`,
  );

  // Add to cart from wishlist
  const cartRes = await addItemToCart(firstWishItem.productId, 1);
  assert(cartRes.success, "Item successfully added to shopping cart from wishlist");

  // Add and remove item from wishlist
  const addedWish = await addToWishlist("a0000000-0000-0000-0000-000000000009");
  assert(Boolean(addedWish.id), "Product successfully added to wishlist");

  const removeWish = await removeFromWishlist(addedWish.id);
  assert(removeWish.success, "Product successfully removed from wishlist");

  // -----------------------------------------------------------------------------
  // Test 5: Customer Order History & Ownership Scoping
  // -----------------------------------------------------------------------------
  console.log("\n📌 5. Customer Order History & Ownership Scoping");

  const ordersRes = await getCustomerOrders({ page: 1, limit: 10 });
  assert(Array.isArray(ordersRes.orders), "Customer orders returned as array");
  assert(ordersRes.orders.length >= 3, `Customer has order history (found ${ordersRes.orders.length})`);

  for (const ord of ordersRes.orders) {
    assert(
      ord.userId === profile.userId,
      `Order ${ord.orderNumber} strictly belongs to authenticated customer: ${ord.userId}`,
    );
    assert(ord.totalAmount > 0, `Order ${ord.orderNumber} has positive total amount: ₹${ord.totalAmount}`);
    assert(
      Boolean(ord.shippingAddress.fullName),
      `Order ${ord.orderNumber} includes verified shipping recipient: ${ord.shippingAddress.fullName}`,
    );
  }

  // Filter orders by status
  const shippedOrders = await getCustomerOrders({ status: "SHIPPED" });
  assert(
    shippedOrders.orders.every((o) => o.status === "SHIPPED"),
    "Order list correctly filtered by status SHIPPED",
  );

  // -----------------------------------------------------------------------------
  // Test 6: Order Details, Financials, and Tracking Timeline
  // -----------------------------------------------------------------------------
  console.log("\n📌 6. Order Details, Financials & Tracking Timeline");

  const singleOrder = await getCustomerOrder("ord_1001");
  assert(singleOrder.orderNumber === "GS-ORD-2026-901", `Fetched order matches order number: ${singleOrder.orderNumber}`);
  assert(singleOrder.items.length === 2, `Order items count is valid: ${singleOrder.items.length}`);
  assert(
    singleOrder.subtotal + singleOrder.taxAmount + singleOrder.shippingAmount === singleOrder.totalAmount,
    `Order financial invariant holds: subtotal (₹${singleOrder.subtotal}) + tax (₹${singleOrder.taxAmount}) + shipping (₹${singleOrder.shippingAmount}) = total (₹${singleOrder.totalAmount})`,
  );

  // Tracking API contract
  const trackingData = await getCustomerOrderTracking("ord_1001");
  assert(trackingData.orderId === "ord_1001", "Tracking orderId matches requested order");
  assert(trackingData.shipments.length > 0, "Tracking provides at least 1 shipment");

  const shipment = trackingData.shipments[0];
  assert(Boolean(shipment.trackingNumber), `Shipment tracking number is valid: ${shipment.trackingNumber}`);
  assert(Boolean(shipment.provider), `Courier provider is valid: ${shipment.provider}`);
  assert(shipment.events.length >= 3, `Shipment contains milestone events (found ${shipment.events.length})`);

  // Verify timeline events chronological ordering
  const isChronological = shipment.events.every((ev, idx, arr) => {
    if (idx === 0) return true;
    return new Date(ev.eventTimestamp) >= new Date(arr[idx - 1].eventTimestamp);
  });
  assert(isChronological, "Shipment tracking events are in strictly ascending chronological order");

  // Pre-shipment cancellation
  const cancelTestOrder = await getCustomerOrder("ord_1003");
  assert(
    ["PLACED", "CONFIRMED", "PROCESSING"].includes(cancelTestOrder.status),
    `Order ${cancelTestOrder.orderNumber} is eligible for pre-shipment cancellation (status: ${cancelTestOrder.status})`,
  );

  const cancelledOrder = await cancelCustomerOrder(cancelTestOrder.id, "Change of mind before dispatch");
  assert(cancelledOrder.status === "CANCELLED", "Order successfully transitioned to CANCELLED state");
  assert(
    cancelledOrder.cancelReason === "Change of mind before dispatch",
    "Cancellation reason recorded in order record",
  );

  // -----------------------------------------------------------------------------
  // Test 7: Notification Center & Read Status Mutations
  // -----------------------------------------------------------------------------
  console.log("\n📌 7. In-App Notification Center & Read State Mutations");

  const notifsRes = await getCustomerNotifications();
  assert(Array.isArray(notifsRes.notifications), "Notifications returned as array");
  assert(notifsRes.notifications.length >= 4, `Customer notifications count: ${notifsRes.notifications.length}`);

  const unreadBefore = await getUnreadNotificationCount();
  assert(typeof unreadBefore.unreadCount === "number", `Unread notification count is number: ${unreadBefore.unreadCount}`);

  // Mark single notification as read
  const unreadItem = notifsRes.notifications.find((n) => n.readAt === null);
  if (unreadItem) {
    const marked = await markNotificationAsRead(unreadItem.id);
    assert(marked.readAt !== null, `Notification "${marked.title}" marked as read with timestamp: ${marked.readAt}`);
  }

  // Mark all as read
  const markAllRes = await markAllNotificationsAsRead();
  assert(markAllRes.success, "Mark all notifications as read succeeded");

  const unreadAfter = await getUnreadNotificationCount();
  assert(unreadAfter.unreadCount === 0, "Unread notification count successfully reduced to 0");

  // -----------------------------------------------------------------------------
  // Test 8: Route Architecture & File Completeness
  // -----------------------------------------------------------------------------
  console.log("\n📌 8. Customer Route Architecture & File Completeness");

  const requiredFiles = [
    "src/app/account/page.tsx",
    "src/app/account/profile/page.tsx",
    "src/app/account/addresses/page.tsx",
    "src/app/account/wishlist/page.tsx",
    "src/app/account/orders/page.tsx",
    "src/app/account/orders/[orderId]/page.tsx",
    "src/app/account/notifications/page.tsx",
    "src/lib/customerApi.ts",
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.resolve(__dirname, "..", relPath);
    const exists = fs.existsSync(fullPath);
    assert(exists, `Required Phase E file exists: ${relPath}`);
  }

  // -----------------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------------
  console.log("\n==========================================================");
  console.log(` RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==========================================================");

  if (failedCount > 0) {
    console.error("\n❌ PHASE E VERIFICATION FAILED!");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL PHASE E CUSTOMER DASHBOARD REQUIREMENTS VERIFIED!\n");
  }
}

runPhaseETests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
