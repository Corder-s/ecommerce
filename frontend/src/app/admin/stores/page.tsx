"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Store } from "lucide-react";

export default function AdminStoresPlaceholderPage() {
  return (
    <AppShell
      title="Store Catalog & Domains"
      breadcrumbs={[
        { label: "Administration", href: "/admin/overview" },
        { label: "Stores" },
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
            <Store size={28} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-text-main)" }}>
            Store Catalog & Public Domains
          </h2>
          <p style={{ maxWidth: "480px", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Super Admin store registry and public domain verification module. Full implementation scheduled for subsequent phases.
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
