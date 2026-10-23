"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnalyticsDualChart } from "@/components/dashboard/AnalyticsDualChart";
import { SystemHealthPanel } from "@/components/dashboard/SystemHealthPanel";
import { RecentTenantsTable } from "@/components/dashboard/RecentTenantsTable";
import { Button } from "@/components/ui/Button";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import {
  fetchPlatformOverview,
  fetchOrderAnalytics,
  fetchSystemHealth,
  fetchTenants,
  PlatformOverviewAnalytics,
  TimeSeriesPoint,
  SystemHealthData,
  AdminTenantItem,
} from "@/lib/adminApi";
import {
  Store,
  Layers,
  ShoppingBag,
  TrendingUp,
  RefreshCw,
  Calendar,
  Sparkles,
  Info,
} from "lucide-react";

export default function SuperAdminOverviewPage() {
  const { currentRole } = useAuth();

  // State
  const [selectedRangeKey, setSelectedRangeKey] = useState<string>("30D");
  const [rangeLabel, setRangeLabel] = useState<string>("Last 30 Days");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [overview, setOverview] = useState<PlatformOverviewAnalytics | null>(null);
  const [chartData, setChartData] = useState<TimeSeriesPoint[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  const [tenants, setTenants] = useState<AdminTenantItem[]>([]);
  const [tenantTotal, setTenantTotal] = useState<number>(0);
  const [tenantPage, setTenantPage] = useState<number>(1);
  const [tenantSearch, setTenantSearch] = useState<string>("");
  const [isUsingFixtures, setIsUsingFixtures] = useState<boolean>(false);

  // Compute ISO dates for date range query
  const computeDateRange = useCallback((rangeKey: string) => {
    const now = new Date();
    let days = 30;
    if (rangeKey === "7D") days = 7;
    if (rangeKey === "30D") days = 30;
    if (rangeKey === "90D") days = 90;
    if (rangeKey === "YTD") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { startDate: startOfYear.toISOString(), endDate: now.toISOString() };
    }
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  }, []);

  const loadData = useCallback(() => {
    const dates = computeDateRange(selectedRangeKey);

    return Promise.all([
      fetchPlatformOverview(dates),
      fetchOrderAnalytics(dates),
      fetchSystemHealth(),
      fetchTenants({ page: tenantPage, limit: 10, search: tenantSearch }),
    ]).then(([ovRes, ordRes, healthRes, tenRes]) => {
      setOverview(ovRes.data);
      setChartData(ordRes.data.ordersOverTime || []);
      setSystemHealth(healthRes.data);
      setTenants(tenRes.data.data);
      setTenantTotal(tenRes.data.meta.total);
      setIsUsingFixtures(ovRes.isFixture || ordRes.isFixture || tenRes.isFixture);
      setIsLoading(false);
      setIsRefreshing(false);
    });
  }, [computeDateRange, selectedRangeKey, tenantPage, tenantSearch]);

  useEffect(() => {
    let isMounted = true;
    const dates = computeDateRange(selectedRangeKey);

    Promise.all([
      fetchPlatformOverview(dates),
      fetchOrderAnalytics(dates),
      fetchSystemHealth(),
      fetchTenants({ page: tenantPage, limit: 10, search: tenantSearch }),
    ]).then(([ovRes, ordRes, healthRes, tenRes]) => {
      if (!isMounted) return;
      setOverview(ovRes.data);
      setChartData(ordRes.data.ordersOverTime || []);
      setSystemHealth(healthRes.data);
      setTenants(tenRes.data.data);
      setTenantTotal(tenRes.data.meta.total);
      setIsUsingFixtures(ovRes.isFixture || ordRes.isFixture || tenRes.isFixture);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [computeDateRange, selectedRangeKey, tenantPage, tenantSearch]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleRangeSelect = (key: string, label: string) => {
    setSelectedRangeKey(key);
    setRangeLabel(label);
  };

  // Super Admin Authorization Gate
  if (currentRole !== "SUPER_ADMIN") {
    return (
      <AppShell
        title="Access Denied"
        breadcrumbs={[
          { label: "Administration", href: "/admin/overview" },
          { label: "Overview" },
        ]}
      >
        <AccessDenied requiredRole="SUPER_ADMIN" />
      </AppShell>
    );
  }

  const rangeDropdownItems: DropdownItem[] = [
    { id: "range-7d", label: "Last 7 Days", onClick: () => handleRangeSelect("7D", "Last 7 Days") },
    { id: "range-30d", label: "Last 30 Days", onClick: () => handleRangeSelect("30D", "Last 30 Days") },
    { id: "range-90d", label: "Last 90 Days", onClick: () => handleRangeSelect("90D", "Last 90 Days") },
    { id: "range-ytd", label: "This Year (YTD)", onClick: () => handleRangeSelect("YTD", "This Year (YTD)") },
  ];

  return (
    <AppShell
      title="Platform Overview"
      breadcrumbs={[
        { label: "Administration", href: "/admin/overview" },
        { label: "Overview" },
      ]}
    >
      {/* 4. Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.25rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h1
              style={{
                fontSize: "1.85rem",
                fontWeight: 800,
                color: "var(--color-text-main)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Platform Overview
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.76rem",
                fontWeight: 700,
                color: "var(--color-primary)",
                backgroundColor: "var(--color-primary-subtle)",
                padding: "0.2rem 0.65rem",
                borderRadius: "var(--radius-pill)",
              }}
            >
              <Sparkles size={13} /> Multi-Tenant Live
            </span>
          </div>
          <p
            style={{
              fontSize: "0.92rem",
              color: "var(--color-text-secondary)",
              marginTop: "0.25rem",
              margin: 0,
            }}
          >
            Here&apos;s what&apos;s happening across GauShilp OS
          </p>
        </div>

        {/* Header Controls: Date-range & Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Dropdown
            trigger={
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Calendar size={15} />}
                style={{ fontSize: "0.84rem" }}
              >
                {rangeLabel}
              </Button>
            }
            items={rangeDropdownItems}
          />

          <Button
            variant="secondary"
            size="md"
            onClick={handleManualRefresh}
            isLoading={isRefreshing}
            leftIcon={
              <RefreshCw
                size={15}
                style={{
                  animation: isRefreshing ? "spin 0.6s linear infinite" : "none",
                }}
              />
            }
            style={{ fontSize: "0.84rem" }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Notice Banner when dev fixtures are active */}
      {isUsingFixtures && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.65rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(91, 92, 226, 0.08)",
            border: "1px solid rgba(91, 92, 226, 0.2)",
            fontSize: "0.82rem",
            color: "var(--color-primary)",
          }}
        >
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Isolated Environment:</strong> Operational PostgreSQL daemon running on port 5433. Development baseline preview loaded for non-production verification.
          </span>
        </div>
      )}

      {/* 5. Animated 4 KPI Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.25rem",
        }}
        className="kpi-cards-grid"
      >
        {/* KPI 1: Total Stores */}
        <StatCard
          label="Total Stores"
          value={overview?.tenants.total}
          subtext={`${overview?.tenants.active ?? 0} active • ${overview?.tenants.publishedStores ?? 0} published`}
          trend="up"
          trendValue="+12%"
          icon={<Store size={22} />}
          iconBg="rgba(91, 92, 226, 0.12)"
          iconColor="var(--color-primary)"
          isLoading={isLoading}
        />

        {/* KPI 2: Active Subscriptions */}
        <StatCard
          label="Active Subscriptions"
          value={overview?.subscriptions.totalActive}
          subtext={`${overview?.tenants.suspended ?? 0} suspended stores`}
          trend="up"
          trendValue="+8.4%"
          icon={<Layers size={22} />}
          iconBg="rgba(35, 185, 175, 0.15)"
          iconColor="var(--color-accent-teal)"
          isLoading={isLoading}
        />

        {/* KPI 3: Orders */}
        <StatCard
          label="Orders"
          value={overview?.orders.totalOrders.toLocaleString("en-IN")}
          subtext={`Avg Order Value: ₹${overview?.orders.averageOrderValue.toFixed(0) ?? "0"}`}
          trend="up"
          trendValue="+18.2%"
          icon={<ShoppingBag size={22} />}
          iconBg="rgba(255, 156, 67, 0.15)"
          iconColor="var(--color-accent-orange)"
          isLoading={isLoading}
        />

        {/* KPI 4: Monthly Recurring Revenue */}
        <StatCard
          label="Monthly Recurring Revenue"
          value={
            overview?.subscriptions.monthlyRecurringRevenue
              ? `₹${overview.subscriptions.monthlyRecurringRevenue.toLocaleString("en-IN")}`
              : "₹0"
          }
          subtext={`ARR: ₹${overview?.subscriptions.annualRecurringRevenue ? (overview.subscriptions.annualRecurringRevenue / 100000).toFixed(1) + "L" : "0"}`}
          trend="up"
          trendValue="+14.6%"
          icon={<TrendingUp size={22} />}
          iconBg="rgba(24, 132, 90, 0.15)"
          iconColor="var(--color-success)"
          isLoading={isLoading}
        />
      </div>

      {/* Middle Grid: Revenue & Orders Chart (2/3) + System Health Panel (1/3) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.9fr 1.1fr",
          gap: "1.5rem",
        }}
        className="dashboard-analytics-health-grid"
      >
        {/* 6. Revenue & Orders Chart */}
        <AnalyticsDualChart
          data={chartData}
          isLoading={isLoading}
          selectedRange={selectedRangeKey}
          onRangeChange={(range) => {
            setSelectedRangeKey(range);
            if (range === "7D") setRangeLabel("Last 7 Days");
            if (range === "30D") setRangeLabel("Last 30 Days");
            if (range === "90D") setRangeLabel("Last 90 Days");
          }}
        />

        {/* 7. System Health Panel */}
        <SystemHealthPanel
          health={systemHealth}
          isLoading={isLoading}
          onRefresh={handleManualRefresh}
        />
      </div>

      {/* 8. Recent Tenants Table */}
      <RecentTenantsTable
        tenants={tenants}
        total={tenantTotal}
        currentPage={tenantPage}
        limit={10}
        isLoading={isLoading}
        onPageChange={(page) => setTenantPage(page)}
        onSearchChange={(query) => {
          setTenantSearch(query);
          setTenantPage(1);
        }}
        onTenantUpdated={() => loadData()}
      />

      <style jsx global>{`
        @media (max-width: 1024px) {
          .dashboard-analytics-health-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
