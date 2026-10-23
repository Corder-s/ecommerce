"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { FileText } from "lucide-react";

export default function AdminAuditLogsPlaceholderPage() {
  return (
    <AppShell
      title="Platform Audit Logs"
      breadcrumbs={[
        { label: "Administration", href: "/admin/overview" },
        { label: "Audit Logs" },
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
            <FileText size={28} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-text-main)" }}>
            Immutable Security Audit Trail
          </h2>
          <p style={{ maxWidth: "480px", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Cryptographically sealed log entries for administrative actions, tenant status updates, and authentication events.
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
