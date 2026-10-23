"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canRoleAccessRoute } from "@/config/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopNav } from "@/components/layout/AppTopNav";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Skeleton } from "@/components/ui/Skeleton";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  title,
  description,
  breadcrumbs,
}) => {
  const pathname = usePathname();
  const { currentRole, isLoading } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Check role authorization for the current route
  const accessCheck = canRoleAccessRoute(pathname, currentRole);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--gradient-bg-lavender, linear-gradient(135deg, #F7F8FF 0%, #ECEEFF 50%, #F5F3FF 100%))",
      }}
    >
      {/* Role-Aware Application Sidebar */}
      <AppSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
        {/* Top Navigation Bar */}
        <AppTopNav
          onToggleSidebar={() => {
            if (typeof window !== "undefined" && window.innerWidth <= 900) {
              setIsMobileOpen(!isMobileOpen);
            } else {
              setIsCollapsed(!isCollapsed);
            }
          }}
          title={title}
          breadcrumbs={breadcrumbs}
        />

        {/* Dynamic Page Container */}
        <main
          style={{
            flex: 1,
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.75rem",
          }}
          className="app-main-content"
        >
          {/* Header Title Section (if description is present) */}
          {(title || description) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {title && (
                <h2 style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.02em" }}>
                  {title}
                </h2>
              )}
              {description && (
                <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
                  {description}
                </p>
              )}
            </div>
          )}

          {/* Access-Control Enforcement */}
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Skeleton width="40%" height="32px" />
              <Skeleton width="100%" height="240px" />
            </div>
          ) : !accessCheck.allowed ? (
            <AccessDenied requiredRole={accessCheck.requiredRole} />
          ) : (
            children
          )}
        </main>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .app-main-content {
            padding: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
};
