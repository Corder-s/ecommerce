"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Layers } from "lucide-react";

export default function AdminSubscriptionsPlaceholderPage() {
  return (
    <AppShell
      title="SaaS Subscriptions & Plans"
      breadcrumbs={[
        { label: "Administration", href: "/admin/overview" },
        { label: "Subscriptions" },
      ]}
    >
      <Card variant="elevated" style={{ padding: "3rem", textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "rgba(35, 185, 175, 0.15)",
              color: "var(--color-accent-teal)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Layers size={28} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-text-main)" }}>
            SaaS Subscription Plans & Billing Engine
          </h2>
          <p style={{ maxWidth: "480px", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Plan creation, pricing matrix, and recurring invoice automation for platform tenants. MRR metrics are aggregated on the Platform Overview.
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
