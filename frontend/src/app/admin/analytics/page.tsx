"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { BarChart3 } from "lucide-react";

export default function AdminAnalyticsPlaceholderPage() {
  return (
    <AppShell
      title="Platform Advanced Analytics"
      breadcrumbs={[
        { label: "Administration", href: "/admin/overview" },
        { label: "Analytics" },
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
            <BarChart3 size={28} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-text-main)" }}>
            In-Depth Business Intelligence & Churn Forecasting
          </h2>
          <p style={{ maxWidth: "480px", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Cohort analytics, tenant retention heatmaps, and gross merchandise value forecasting. Primary platform metrics are available on the Platform Overview.
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
