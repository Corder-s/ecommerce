"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Settings } from "lucide-react";

export default function AdminSettingsPlaceholderPage() {
  return (
    <AppShell
      title="Platform Settings & Configurations"
      breadcrumbs={[
        { label: "Administration", href: "/admin/overview" },
        { label: "Settings" },
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
            <Settings size={28} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-text-main)" }}>
            Platform Global Settings
          </h2>
          <p style={{ maxWidth: "480px", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Global platform parameters, SMS gateway credentials, Cloudflare R2 bucket configurations, and security policies. Scheduled for subsequent phases.
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
