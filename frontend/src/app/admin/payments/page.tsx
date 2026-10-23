"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { CreditCard } from "lucide-react";

export default function AdminPaymentsPlaceholderPage() {
  return (
    <AppShell
      title="Platform Payments & Settlements"
      breadcrumbs={[
        { label: "Administration", href: "/admin/overview" },
        { label: "Payments" },
      ]}
    >
      <Card variant="elevated" style={{ padding: "3rem", textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "rgba(24, 132, 90, 0.15)",
              color: "var(--color-success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CreditCard size={28} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-text-main)" }}>
            Payment Gateway Transactions & Merchant Payouts
          </h2>
          <p style={{ maxWidth: "480px", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Gateway ledger reconciliation, payout schedule automation, and refund dispute management. Payment statistics are reported on the Platform Overview.
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
