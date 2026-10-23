"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Users } from "lucide-react";

export default function AdminUsersPlaceholderPage() {
  return (
    <AppShell
      title="User Management & Access Control"
      breadcrumbs={[
        { label: "Administration", href: "/admin/overview" },
        { label: "Users" },
      ]}
    >
      <Card variant="elevated" style={{ padding: "3rem", textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "rgba(91, 92, 226, 0.12)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users size={28} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-text-main)" }}>
            Platform Users & Role Permissions
          </h2>
          <p style={{ maxWidth: "480px", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Super Admin user access governance, identity link management, and security audit directory. Scheduled for subsequent phases.
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
