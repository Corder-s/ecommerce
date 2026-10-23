"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { getDefaultRouteForRole } from "@/config/navigation";

interface AccessDeniedProps {
  requiredRole?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredRole }) => {
  const { currentRole, user } = useAuth();
  const allowedRoute = getDefaultRouteForRole(currentRole);

  return (
    <div
      className="animate-fade-up"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        minHeight: "60vh",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          backgroundColor: "var(--color-danger-light)",
          color: "var(--color-danger)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.5rem",
          boxShadow: "0 4px 16px var(--color-danger-glow)",
        }}
      >
        <ShieldAlert size={38} />
      </div>

      <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "0.5rem" }}>
        Access Restricted
      </h2>

      <p style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)", maxWidth: "460px", lineHeight: 1.6, marginBottom: "1.5rem" }}>
        You are currently signed in as <strong>{user?.name || "User"}</strong> with role{" "}
        <span
          style={{
            backgroundColor: "var(--color-primary-subtle)",
            color: "var(--color-primary)",
            padding: "0.15rem 0.55rem",
            borderRadius: "var(--radius-pill)",
            fontWeight: 700,
            fontSize: "0.82rem",
          }}
        >
          {currentRole}
        </span>
        .{requiredRole && (
          <span>
            {" "}This area requires <strong>{requiredRole}</strong> permissions.
          </span>
        )}
      </p>

      <div style={{ display: "flex", gap: "1rem" }}>
        <Link href={allowedRoute}>
          <Button size="lg" variant="primary" leftIcon={<ArrowLeft size={16} />}>
            Return to Authorized Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
