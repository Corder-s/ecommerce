"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Building2 } from "lucide-react";

export default function AdminTenantsPlaceholderPage() {
  return (
    <AppShell
      title="Tenant Management"
      breadcrumbs={[
        { label: "Administration", href: "/admin/overview" },
        { label: "Tenants" },
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
            <Building2 size={28} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-text-main)" }}>
            Tenant Management & Multi-Store Provisioning
          </h2>
          <p style={{ maxWidth: "480px", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            The dedicated tenant lifecycle management suite is scheduled for subsequent phases. Recent registered tenants can currently be viewed and managed on the Platform Overview.
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
