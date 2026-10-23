"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Shield,
  Store,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";

interface AppTopNavProps {
  onToggleSidebar: () => void;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export const AppTopNav: React.FC<AppTopNavProps> = ({
  onToggleSidebar,
  title,
  breadcrumbs,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, currentRole, switchRole, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  // Derive title from pathname if not explicitly provided
  const derivedTitle =
    title ||
    (() => {
      if (pathname.includes("/admin/overview")) return "Platform Overview";
      if (pathname.includes("/admin/tenants")) return "Tenant Management";
      if (pathname.includes("/admin/users")) return "User Access & Roles";
      if (pathname.includes("/admin/subscriptions")) return "SaaS Subscriptions";
      if (pathname.includes("/admin/health")) return "System Health & Probes";
      if (pathname.includes("/seller/dashboard") || pathname === "/dashboard") return "Seller Overview";
      if (pathname.includes("/seller/products")) return "Product Catalog";
      if (pathname.includes("/seller/orders")) return "Orders & Fulfillment";
      if (pathname.includes("/seller/inventory")) return "Live Inventory";
      if (pathname.includes("/account")) return "Customer Dashboard";
      return "GauShilp OS";
    })();

  const getUserInitials = (name?: string) => {
    if (!name) return "GS";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const accountDropdownItems: DropdownItem[] = [
    {
      id: "user-info",
      label: (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 700, color: "var(--color-text-main)" }}>{user?.name || "User"}</span>
          <span style={{ fontSize: "0.74rem", color: "var(--color-text-secondary)" }}>{user?.email}</span>
        </div>
      ),
      disabled: true,
    },
    {
      id: "active-role-badge",
      label: (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>Active Role</span>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0.15rem 0.5rem",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--color-primary-subtle)",
              color: "var(--color-primary)",
            }}
          >
            {currentRole}
          </span>
        </div>
      ),
      dividerBefore: true,
      disabled: true,
    },
    {
      id: "switch-to-super-admin",
      label: "Switch Role: SUPER_ADMIN",
      icon: <Shield size={15} color="var(--color-accent-orange)" />,
      onClick: () => switchRole("SUPER_ADMIN"),
    },
    {
      id: "switch-to-store-owner",
      label: "Switch Role: STORE_OWNER",
      icon: <Store size={15} color="var(--color-primary)" />,
      onClick: () => switchRole("STORE_OWNER"),
    },
    {
      id: "switch-to-customer",
      label: "Switch Role: CUSTOMER",
      icon: <User size={15} color="var(--color-accent-teal)" />,
      onClick: () => switchRole("CUSTOMER"),
    },
    {
      id: "view-store",
      label: "View Public Storefront",
      icon: <ExternalLink size={15} />,
      onClick: () => router.push("/"),
      dividerBefore: true,
    },
    {
      id: "logout",
      label: "Sign Out",
      icon: <LogOut size={15} />,
      danger: true,
      onClick: logout,
      dividerBefore: true,
    },
  ];

  return (
    <header
      className="glass-panel"
      style={{
        height: "70px",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.75rem",
        position: "sticky",
        top: 0,
        zIndex: 35,
        backgroundColor: "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Left: Sidebar Toggle + Title & Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation sidebar"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "6px",
            color: "var(--color-text-main)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--color-surface-muted)",
          }}
        >
          <Menu size={20} />
        </button>

        <div>
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
              {breadcrumbs.map((b, idx) => (
                <React.Fragment key={b.label}>
                  {idx > 0 && <span>/</span>}
                  {b.href ? (
                    <Link href={b.href} style={{ color: "var(--color-text-secondary)" }}>
                      {b.label}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 600, color: "var(--color-text-main)" }}>{b.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : null}

          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "var(--color-text-main)",
              letterSpacing: "-0.015em",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {derivedTitle}
          </h1>
        </div>
      </div>

      {/* Right: Search + Notifications + Account Dropdown */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Search Bar Entry Point */}
        <div
          className="topnav-search"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.45rem 0.85rem",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--color-border)",
            backgroundColor: "#FFFFFF",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <Search size={16} color="var(--color-text-tertiary)" />
          <input
            type="text"
            placeholder="Search stores, orders, products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              fontSize: "0.85rem",
              color: "var(--color-text-main)",
              width: "220px",
              background: "transparent",
            }}
          />
        </div>

        {/* Notifications Popover */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View system notifications"
            style={{
              position: "relative",
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              border: "1px solid var(--color-border)",
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              transition: "border-color var(--transition-fast)",
            }}
          >
            <Bell size={18} />
            <span
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--color-accent-orange)",
              }}
            />
          </button>

          {showNotifications && (
            <div
              className="card-elevated animate-scale-in"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "320px",
                backgroundColor: "#FFFFFF",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-xl)",
                padding: "1rem",
                zIndex: 100,
              }}
            >
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "0.75rem" }}>
                Live Platform Alerts
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.82rem" }}>
                <div style={{ padding: "0.6rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--color-surface-muted)" }}>
                  <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>System Health: All Probes Normal</div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.74rem" }}>PostgreSQL & Redis connected &bull; 2m ago</div>
                </div>
                <div style={{ padding: "0.6rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--color-surface-muted)" }}>
                  <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>New order placed: GS-89021</div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.74rem" }}>Vedic Diyas (Pack of 12) &bull; 14m ago</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Account Dropdown */}
        <Dropdown
          align="right"
          width="250px"
          items={accountDropdownItems}
          trigger={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                padding: "0.3rem 0.75rem 0.3rem 0.35rem",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--color-border)",
                backgroundColor: "#FFFFFF",
                boxShadow: "var(--shadow-xs)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: currentRole === "SUPER_ADMIN" ? "var(--color-accent-orange)" : "var(--color-primary)",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {getUserInitials(user?.name)}
              </div>
              <span
                className="topnav-username"
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "var(--color-text-main)",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.name || "Admin"}
              </span>
              <ChevronDown size={14} color="var(--color-text-secondary)" />
            </div>
          }
        />
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .topnav-search {
            display: none !important;
          }
          .topnav-username {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
