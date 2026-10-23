"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnalyticsDualChart } from "@/components/dashboard/AnalyticsDualChart";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  fetchSellerKPIs,
  getSellerSalesTrendData,
  fetchProducts,
  SellerKPIs,
  SellerProduct,
} from "@/lib/sellerApi";
import {
  BarChart3,
  TrendingUp,
  Store,
  ShoppingBag,
  CreditCard,
  Package,
  Calendar,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

export default function SellerAnalyticsPage() {
  const { currentRole, activeTenantId } = useAuth();
  const isAuthorized = ["STORE_OWNER", "STORE_MANAGER"].includes(currentRole);

  const [kpis, setKpis] = useState<SellerKPIs | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSellerKPIs(activeTenantId || undefined),
      fetchProducts({ limit: 5 }, activeTenantId || undefined),
    ]).then(([kpiData, prods]) => {
      setKpis(kpiData);
      setProducts(prods.data);
      setChartData(getSellerSalesTrendData());
      setIsLoading(false);
    });
  }, [activeTenantId]);

  if (!isAuthorized) {
    return (
      <AppShell title="Access Denied" breadcrumbs={[{ label: "Seller" }, { label: "Analytics" }]}>
        <AccessDenied requiredRole="STORE_OWNER or STORE_MANAGER" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Store Analytics"
      breadcrumbs={[
        { label: "Seller", href: "/seller/dashboard" },
        { label: "Analytics" },
      ]}
    >
      <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
        {/* Top Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "var(--color-text-main)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Performance & Sales Analytics
            </h1>
            <Badge variant="indigo">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <Sparkles size={12} /> Real-Time
              </span>
            </Badge>
          </div>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Comprehensive sales trends, average order metrics, and top-selling artisan craft products.
          </p>
        </div>

        {/* KPI Stat Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "1.25rem",
            marginBottom: "1.75rem",
          }}
        >
          <StatCard
            label="Gross Revenue"
            value={isLoading ? "—" : `₹${(kpis?.totalSales || 0).toLocaleString("en-IN")}`}
            trend="up"
            trendValue="+18.4%"
            subtext="vs last 30 days"
            icon={<Store size={22} />}
            iconColor="#5B5CE2"
            iconBg="rgba(91, 92, 226, 0.12)"
            isLoading={isLoading}
          />

          <StatCard
            label="Total Volume"
            value={isLoading ? "—" : (kpis?.totalOrders || 0).toString()}
            trend="up"
            trendValue="+12.5%"
            subtext="verified customer orders"
            icon={<ShoppingBag size={22} />}
            iconColor="#FF9C43"
            iconBg="rgba(255, 156, 67, 0.12)"
            isLoading={isLoading}
          />

          <StatCard
            label="Average Order Value"
            value={isLoading ? "—" : `₹${Math.round((kpis?.totalSales || 0) / (kpis?.totalOrders || 1)).toLocaleString("en-IN")}`}
            trend="up"
            trendValue="+5.2%"
            subtext="per paid transaction"
            icon={<CreditCard size={22} />}
            iconColor="#23B9AF"
            iconBg="rgba(35, 185, 175, 0.12)"
            isLoading={isLoading}
          />

          <StatCard
            label="Active Listings"
            value={isLoading ? "—" : (kpis?.totalProducts || 0).toString()}
            subtext="artisan products in store"
            icon={<Package size={22} />}
            iconColor="#18845A"
            iconBg="rgba(24, 132, 90, 0.12)"
            isLoading={isLoading}
          />
        </div>

        {/* Dual Chart */}
        <div style={{ marginBottom: "1.75rem" }}>
          <AnalyticsDualChart
            data={chartData}
            isLoading={isLoading}
          />
        </div>

        {/* Top Products Table */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
            padding: "1.5rem",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "1rem" }}>
            Top Performing Artisan Products
          </h3>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-bg)", borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Product</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>SKU</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>Price</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>Units In Stock</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)" }}>Catalog Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                      {p.name}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                      {p.sku}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 700, color: "var(--color-primary)" }}>
                      ₹{p.price.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 600 }}>
                      {p.stock} units
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                      <Badge variant={p.status === "PUBLISHED" ? "success" : "muted"}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
