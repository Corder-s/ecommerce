"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const DashboardSidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: "Overview", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Orders & Shipments", href: "/dashboard#orders", icon: <ShoppingBag size={18} /> },
    { name: "Product Catalog", href: "/dashboard#products", icon: <Package size={18} /> },
    { name: "Artisans & SHGs", href: "/dashboard#artisans", icon: <Users size={18} /> },
    { name: "Vedic Analytics", href: "/dashboard#analytics", icon: <BarChart3 size={18} /> },
    { name: "Store Settings", href: "/dashboard#settings", icon: <Settings size={18} /> },
  ];

  return (
    <aside
      className="glass-panel"
      style={{
        width: collapsed ? "78px" : "260px",
        height: "100vh",
        position: "sticky",
        top: 0,
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        transition: "width var(--transition-base)",
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: "1.25rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", overflow: "hidden" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              flexShrink: 0,
            }}
          >
            <Sparkles size={20} />
          </div>

          {!collapsed && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-text-main)", lineHeight: 1.15 }}>
                GauShilp<span style={{ color: "var(--color-primary)" }}>OS</span>
              </span>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--color-accent-orange)", letterSpacing: "0.04em" }}>
                Gaushala Seller Portal
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav style={{ padding: "1.25rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
                padding: "0.7rem 0.85rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                backgroundColor: isActive ? "var(--color-primary-subtle)" : "transparent",
                border: isActive ? "1px solid rgba(91, 92, 226, 0.2)" : "1px solid transparent",
                transition: "all var(--transition-fast)",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "var(--color-surface-muted)";
                  e.currentTarget.style.color = "var(--color-text-main)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--color-text-secondary)";
                }
              }}
            >
              <span style={{ color: isActive ? "var(--color-primary)" : "inherit", display: "flex" }}>
                {item.icon}
              </span>
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Storefront Link & Collapse Toggle */}
      <div style={{ padding: "1rem 0.75rem", borderTop: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.6rem 0.85rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.84rem",
            fontWeight: 600,
            color: "var(--color-primary)",
            backgroundColor: "var(--color-primary-subtle)",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <ExternalLink size={16} />
          {!collapsed && <span>View Public Store</span>}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.5rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            backgroundColor: "#FFFFFF",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
};
