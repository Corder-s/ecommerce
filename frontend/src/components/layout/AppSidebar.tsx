"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getNavItemsForRole, NavItem } from "@/config/navigation";
import {
  LayoutDashboard,
  Building2,
  Store,
  Users,
  Layers,
  ShoppingBag,
  CreditCard,
  BarChart3,
  FileText,
  Activity,
  Settings,
  Package,
  Tags,
  Boxes,
  Truck,
  Sparkles,
  User,
  MapPin,
  Heart,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const { user, currentRole, logout } = useAuth();

  const navItems = getNavItemsForRole(currentRole);

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "LayoutDashboard":
        return <LayoutDashboard size={18} />;
      case "Building2":
        return <Building2 size={18} />;
      case "Store":
        return <Store size={18} />;
      case "Users":
        return <Users size={18} />;
      case "Layers":
        return <Layers size={18} />;
      case "ShoppingBag":
        return <ShoppingBag size={18} />;
      case "CreditCard":
        return <CreditCard size={18} />;
      case "BarChart3":
        return <BarChart3 size={18} />;
      case "FileText":
        return <FileText size={18} />;
      case "Activity":
        return <Activity size={18} />;
      case "Settings":
        return <Settings size={18} />;
      case "Package":
        return <Package size={18} />;
      case "Tags":
        return <Tags size={18} />;
      case "Boxes":
        return <Boxes size={18} />;
      case "Truck":
        return <Truck size={18} />;
      case "Sparkles":
        return <Sparkles size={18} />;
      case "User":
        return <User size={18} />;
      case "MapPin":
        return <MapPin size={18} />;
      case "Heart":
        return <Heart size={18} />;
      case "Bell":
        return <Bell size={18} />;
      default:
        return <LayoutDashboard size={18} />;
    }
  };

  const getUserInitials = (name?: string) => {
    if (!name) return "GS";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const sidebarContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--gradient-sidebar, linear-gradient(180deg, #181A32 0%, #121426 100%))",
        color: "#FFFFFF",
        userSelect: "none",
        position: "relative",
      }}
    >
      {/* Top Brand Header */}
      <div
        style={{
          padding: isCollapsed ? "1.25rem 0.75rem" : "1.25rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", overflow: "hidden" }}>
          {isCollapsed ? (
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
              }}
            >
              <Sparkles size={20} />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-md)",
                  background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  flexShrink: 0,
                }}
              >
                <Sparkles size={18} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.15 }}>
                  GauShilp <span style={{ color: "var(--color-primary)" }}>OS</span>
                </span>
                <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--color-accent-orange)", letterSpacing: "0.04em" }}>
                  {currentRole === "SUPER_ADMIN"
                    ? "Platform Admin"
                    : currentRole === "CUSTOMER"
                    ? "Customer Portal"
                    : "Seller Operating System"}
                </span>
              </div>
            </div>
          )}
        </Link>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          aria-label="Close mobile sidebar"
          className="mobile-close-btn"
          style={{
            background: "none",
            border: "none",
            color: "#A0A4C8",
            cursor: "pointer",
            display: "none",
            padding: "4px",
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: isCollapsed ? "1rem 0.5rem" : "1.25rem 0.85rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.3rem",
        }}
      >
        {navItems.map((item: NavItem) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onCloseMobile}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: isCollapsed ? "0.7rem 0" : "0.7rem 0.85rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.88rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#FFFFFF" : "#A0A4C8",
                backgroundColor: isActive ? "var(--color-primary)" : "transparent",
                boxShadow: isActive ? "0 4px 14px var(--color-primary-glow)" : "none",
                transition: "all var(--transition-fast)",
                justifyContent: isCollapsed ? "center" : "flex-start",
                textDecoration: "none",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
                  e.currentTarget.style.color = "#FFFFFF";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#A0A4C8";
                }
              }}
            >
              <span style={{ display: "flex", flexShrink: 0 }}>{renderIcon(item.iconName)}</span>

              {!isCollapsed && <span style={{ flex: 1, whiteSpace: "nowrap" }}>{item.name}</span>}

              {!isCollapsed && item.badge && (
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "var(--radius-pill)",
                    backgroundColor:
                      item.badgeVariant === "success"
                        ? "rgba(24, 132, 90, 0.25)"
                        : item.badgeVariant === "teal"
                        ? "rgba(35, 185, 175, 0.25)"
                        : "rgba(91, 92, 226, 0.3)",
                    color:
                      item.badgeVariant === "success"
                        ? "#4ADE80"
                        : item.badgeVariant === "teal"
                        ? "#5EEAD4"
                        : "#A5B4FC",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Collapse Footer */}
      <div
        style={{
          padding: isCollapsed ? "1rem 0.5rem" : "1rem 1rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {/* User Card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            justifyContent: isCollapsed ? "center" : "flex-start",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: currentRole === "SUPER_ADMIN" ? "var(--color-accent-orange)" : "var(--color-primary)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.85rem",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {getUserInitials(user?.name)}
          </div>

          {!isCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.name || "Guest User"}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#A0A4C8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.email || "guest@gaushilp.org"}
              </div>
            </div>
          )}

          {!isCollapsed && (
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out of account"
              style={{
                background: "none",
                border: "none",
                color: "#A0A4C8",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-danger)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#A0A4C8")}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>

        {/* Desktop Collapse Toggle Button */}
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="desktop-collapse-toggle"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.45rem",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#A0A4C8",
            cursor: "pointer",
            width: "100%",
            transition: "all var(--transition-fast)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.12)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)")}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .desktop-collapse-toggle {
            display: none !important;
          }
          .mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        style={{
          width: isCollapsed ? "78px" : "260px",
          height: "100vh",
          position: "sticky",
          top: 0,
          zIndex: 40,
          flexShrink: 0,
          transition: "width var(--transition-smooth)",
          display: "none",
        }}
        className="desktop-sidebar-container"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 150,
            backgroundColor: "rgba(18, 20, 38, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
          }}
          onClick={onCloseMobile}
        >
          <div
            className="animate-slide-in-right"
            style={{
              width: "280px",
              height: "100%",
              boxShadow: "var(--shadow-xl)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (min-width: 901px) {
          .desktop-sidebar-container {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
};
