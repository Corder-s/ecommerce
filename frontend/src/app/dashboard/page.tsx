"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { ArtisanImpactWidget } from "@/components/dashboard/ArtisanImpactWidget";
import { Sparkles, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <AppShell
      title="Gaushala Overview"
      breadcrumbs={[
        { label: "Operating System", href: "/dashboard" },
        { label: "Overview" },
      ]}
    >
      {/* Top Welcome & Actions Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text-main)" }}>
              Gaushala Overview
            </h2>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--color-primary)",
                backgroundColor: "var(--color-primary-subtle)",
                padding: "0.2rem 0.6rem",
                borderRadius: "var(--radius-pill)",
              }}
            >
              <Sparkles size={13} /> Live Sync
            </span>
          </div>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Real-time sales, artisan payouts, and gaushala impact metrics.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button
            size="md"
            variant="secondary"
            onClick={handleRefresh}
            leftIcon={
              <RefreshCw
                size={15}
                style={{
                  animation: isRefreshing ? "spin 0.6s linear infinite" : "none",
                }}
              />
            }
          >
            Refresh
          </Button>
          <Button size="md" variant="primary" leftIcon={<Plus size={16} />}>
            Add Sacred Product
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <KpiCards />

      {/* Analytics & Impact Widget Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.8fr 1fr",
          gap: "1.5rem",
        }}
        className="dashboard-analytics-grid"
      >
        <RevenueChart />
        <ArtisanImpactWidget />
      </div>

      {/* Recent Orders Section */}
      <div id="orders">
        <OrdersTable />
      </div>

      <style jsx>{`
        @media (max-width: 1024px) {
          .dashboard-analytics-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
