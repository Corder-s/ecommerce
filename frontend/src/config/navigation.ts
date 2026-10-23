/**
 * GAUSHILP OS — CENTRAL ROLE-AWARE NAVIGATION CONFIGURATION
 * Defines navigation items, route permissions, and role access rules
 * for SUPER_ADMIN, STORE_OWNER, STORE_MANAGER, STORE_STAFF, and CUSTOMER.
 */

export type UserRole =
  | "SUPER_ADMIN"
  | "STORE_OWNER"
  | "STORE_MANAGER"
  | "STORE_STAFF"
  | "CUSTOMER";

export interface NavItem {
  id: string;
  name: string;
  href: string;
  iconName: string;
  roles: UserRole[];
  exact?: boolean;
  badge?: string;
  badgeVariant?: "indigo" | "orange" | "teal" | "success";
}

// -----------------------------------------------------------------------------
// Navigation Configurations by Role Area
// -----------------------------------------------------------------------------

export const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  { id: "admin-overview", name: "Overview", href: "/admin/overview", iconName: "LayoutDashboard", roles: ["SUPER_ADMIN"], exact: true },
  { id: "admin-tenants", name: "Tenants", href: "/admin/tenants", iconName: "Building2", roles: ["SUPER_ADMIN"] },
  { id: "admin-stores", name: "Stores", href: "/admin/stores", iconName: "Store", roles: ["SUPER_ADMIN"] },
  { id: "admin-users", name: "Users", href: "/admin/users", iconName: "Users", roles: ["SUPER_ADMIN"] },
  { id: "admin-subscriptions", name: "Subscriptions", href: "/admin/subscriptions", iconName: "Layers", roles: ["SUPER_ADMIN"] },
  { id: "admin-orders", name: "Orders", href: "/admin/orders", iconName: "ShoppingBag", roles: ["SUPER_ADMIN"] },
  { id: "admin-payments", name: "Payments", href: "/admin/payments", iconName: "CreditCard", roles: ["SUPER_ADMIN"] },
  { id: "admin-analytics", name: "Analytics", href: "/admin/analytics", iconName: "BarChart3", roles: ["SUPER_ADMIN"] },
  { id: "admin-audit-logs", name: "Audit Logs", href: "/admin/audit-logs", iconName: "FileText", roles: ["SUPER_ADMIN"] },
  { id: "admin-health", name: "System Health", href: "/admin/health", iconName: "Activity", roles: ["SUPER_ADMIN"], badge: "Healthy", badgeVariant: "success" },
  { id: "admin-settings", name: "Settings", href: "/admin/settings", iconName: "Settings", roles: ["SUPER_ADMIN"] },
];

export const SELLER_NAV_ITEMS: NavItem[] = [
  {
    id: "seller-dashboard",
    name: "Dashboard",
    href: "/seller/dashboard",
    iconName: "LayoutDashboard",
    roles: ["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"],
    exact: true,
  },
  {
    id: "seller-products",
    name: "Products",
    href: "/seller/products",
    iconName: "Package",
    roles: ["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"],
  },
  {
    id: "seller-categories",
    name: "Categories",
    href: "/seller/categories",
    iconName: "Tags",
    roles: ["STORE_OWNER", "STORE_MANAGER"],
  },
  {
    id: "seller-inventory",
    name: "Inventory",
    href: "/seller/inventory",
    iconName: "Boxes",
    roles: ["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"],
    badge: "Live",
    badgeVariant: "teal",
  },
  {
    id: "seller-orders",
    name: "Orders",
    href: "/seller/orders",
    iconName: "ShoppingBag",
    roles: ["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"],
  },
  {
    id: "seller-customers",
    name: "Customers",
    href: "/seller/customers",
    iconName: "Users",
    roles: ["STORE_OWNER", "STORE_MANAGER"],
  },
  {
    id: "seller-shipping",
    name: "Shipping",
    href: "/seller/shipping",
    iconName: "Truck",
    roles: ["STORE_OWNER", "STORE_MANAGER"],
  },
  {
    id: "seller-analytics",
    name: "Analytics",
    href: "/seller/analytics",
    iconName: "BarChart3",
    roles: ["STORE_OWNER", "STORE_MANAGER"],
  },
  {
    id: "seller-settings",
    name: "Store Settings",
    href: "/seller/settings",
    iconName: "Settings",
    roles: ["STORE_OWNER"],
  },
  {
    id: "seller-subscription",
    name: "Subscription",
    href: "/seller/subscription",
    iconName: "Sparkles",
    roles: ["STORE_OWNER"],
  },
];

export const CUSTOMER_NAV_ITEMS: NavItem[] = [
  { id: "cust-account", name: "My Account", href: "/account", iconName: "User", roles: ["CUSTOMER"], exact: true },
  { id: "cust-orders", name: "My Orders", href: "/account/orders", iconName: "ShoppingBag", roles: ["CUSTOMER"] },
  { id: "cust-addresses", name: "Saved Addresses", href: "/account/addresses", iconName: "MapPin", roles: ["CUSTOMER"] },
  { id: "cust-wishlist", name: "Wishlist", href: "/account/wishlist", iconName: "Heart", roles: ["CUSTOMER"] },
  { id: "cust-notifications", name: "Notifications", href: "/account/notifications", iconName: "Bell", roles: ["CUSTOMER"] },
  { id: "cust-profile", name: "Profile Settings", href: "/account/profile", iconName: "Settings", roles: ["CUSTOMER"] },
];

// All navigation items indexed together
export const ALL_NAV_ITEMS: NavItem[] = [
  ...SUPER_ADMIN_NAV_ITEMS,
  ...SELLER_NAV_ITEMS,
  ...CUSTOMER_NAV_ITEMS,
];

/**
 * Returns the permitted sidebar navigation items for a given role.
 */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  switch (role) {
    case "SUPER_ADMIN":
      return SUPER_ADMIN_NAV_ITEMS;
    case "STORE_OWNER":
    case "STORE_MANAGER":
    case "STORE_STAFF":
      return SELLER_NAV_ITEMS.filter((item) => item.roles.includes(role));
    case "CUSTOMER":
      return CUSTOMER_NAV_ITEMS;
    default:
      return [];
  }
}

/**
 * Determines whether a user with a given role has permission to access a route.
 */
export function canRoleAccessRoute(pathname: string, role?: UserRole | null): { allowed: boolean; requiredRole?: string } {
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/store")
  ) {
    return { allowed: true };
  }

  if (!role) {
    return { allowed: false, requiredRole: "AUTHENTICATED_USER" };
  }

  // Super Admin section
  if (pathname.startsWith("/admin")) {
    if (role === "SUPER_ADMIN") return { allowed: true };
    return { allowed: false, requiredRole: "SUPER_ADMIN" };
  }

  // Seller section
  if (pathname.startsWith("/seller") || pathname.startsWith("/dashboard")) {
    if (["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"].includes(role)) {
      // Specific route permissions within seller
      if (
        (pathname.startsWith("/seller/settings") || pathname.startsWith("/seller/subscription")) &&
        role !== "STORE_OWNER"
      ) {
        return { allowed: false, requiredRole: "STORE_OWNER" };
      }
      if (
        (pathname.startsWith("/seller/customers") ||
          pathname.startsWith("/seller/shipping") ||
          pathname.startsWith("/seller/categories") ||
          pathname.startsWith("/seller/analytics")) &&
        role === "STORE_STAFF"
      ) {
        return { allowed: false, requiredRole: "STORE_MANAGER" };
      }
      return { allowed: true };
    }
    return { allowed: false, requiredRole: "STORE_OWNER or STORE_MANAGER" };
  }

  // Customer section
  if (pathname.startsWith("/account")) {
    if (role === "CUSTOMER" || role === "SUPER_ADMIN" || role === "STORE_OWNER") {
      return { allowed: true };
    }
    return { allowed: false, requiredRole: "CUSTOMER" };
  }

  // Default allowed for generic authenticated routes
  return { allowed: true };
}

/**
 * Returns default landing route for an authorized role.
 */
export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin/overview";
    case "STORE_OWNER":
    case "STORE_MANAGER":
    case "STORE_STAFF":
      return "/seller/dashboard";
    case "CUSTOMER":
      return "/account";
    default:
      return "/";
  }
}
