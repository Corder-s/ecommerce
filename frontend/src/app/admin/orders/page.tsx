"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { ShoppingBag } from "lucide-react";

export default function AdminOrdersPlaceholderPage() {
  return (
    <AppShell
      title="Platform-Wide Orders"
      breadcrumbs={[
        { label: "Administration", href: "/admin/overview" },
        { label: "Orders" },
      ]}
    >
      <Card variant="elevated" style={{ padding: "3rem", textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 156, 67, 0.15)",
              color: "var(--color-accent-orange)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShoppingBag size={28} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-text-main)" }}>
            Cross-Tenant Order Monitoring
          </h2>
          <p style={{ maxWidth: "480px", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Aggregate marketplace transaction feed, fulfillment tracking, and dispute mediation. Aggregate order volumes are tracked on the Platform Overview.
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
