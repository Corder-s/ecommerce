"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnalyticsDualChart } from "@/components/dashboard/AnalyticsDualChart";
import { OrderDetailModal } from "@/components/seller/OrderDetailModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import {
  fetchCurrentStore,
  fetchSellerKPIs,
  fetchOrders,
  getSellerSalesTrendData,
  StoreDetails,
  SellerKPIs,
  SellerOrder,
  OrderStatus,
} from "@/lib/sellerApi";
import {
  Store,
  ShoppingBag,
  Package,
  AlertTriangle,
  ExternalLink,
  Plus,
  Truck,
  Boxes,
  Settings,
  RefreshCw,
  Calendar,
  Sparkles,
  Search,
  Eye,
  CheckCircle2,
} from "lucide-react";

export default function SellerDashboardPage() {
  const { currentRole, activeTenantId, user } = useAuth();

  // Route permission verification
  const isAuthorized = ["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"].includes(currentRole);

  const [store, setStore] = useState<StoreDetails | null>(null);
  const [kpis, setKpis] = useState<SellerKPIs | null>(null);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRange, setSelectedRange] = useState("30D");
  const [selectedRangeLabel, setSelectedRangeLabel] = useState("Last 30 Days");

  // Selected order for detail modal
  const [activeOrder, setActiveOrder] = useState<SellerOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const [storeData, kpiData, orderData] = await Promise.all([
        fetchCurrentStore(activeTenantId || undefined),
        fetchSellerKPIs(activeTenantId || undefined),
        fetchOrders({ limit: 5 }, activeTenantId || undefined),
      ]);
      setStore(storeData);
      setKpis(kpiData);
      setOrders(orderData.data);
      setChartData(getSellerSalesTrendData());
    } catch (err) {
      console.error("Failed to load seller dashboard:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  const handleRangeSelect = (key: string, label: string) => {
    setSelectedRange(key);
    setSelectedRangeLabel(label);
    handleRefresh();
  };

  const handleOrderUpdated = (updated: SellerOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setActiveOrder(updated);
    loadDashboardData();
  };

  if (!isAuthorized) {
    return (
      <AppShell title="Access Denied" breadcrumbs={[{ label: "Seller" }, { label: "Dashboard" }]}>
        <AccessDenied requiredRole="STORE_OWNER, STORE_MANAGER, or STORE_STAFF" />
      </AppShell>
    );
  }

  const filteredOrders = searchQuery
    ? orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : orders;

  const getOrderStatusVariant = (st: OrderStatus): "indigo" | "orange" | "teal" | "success" | "danger" | "muted" => {
    switch (st) {
      case "PLACED":
        return "orange";
      case "CONFIRMED":
        return "indigo";
      case "PROCESSING":
        return "teal";
      case "SHIPPED":
        return "indigo";
      case "DELIVERED":
        return "success";
      case "CANCELLED":
      case "RETURNED":
        return "danger";
      default:
        return "muted";
    }
  };

  const rangeMenuItems: DropdownItem[] = [
    { id: "7D", label: "Last 7 Days", onClick: () => handleRangeSelect("7D", "Last 7 Days") },
    { id: "30D", label: "Last 30 Days", onClick: () => handleRangeSelect("30D", "Last 30 Days") },
    { id: "90D", label: "Last 90 Days", onClick: () => handleRangeSelect("90D", "Last 90 Days") },
    { id: "YTD", label: "Year to Date", onClick: () => handleRangeSelect("YTD", "Year to Date") },
  ];

  return (
    <AppShell
      title="Seller Dashboard"
      breadcrumbs={[
        { label: "Seller", href: "/seller/dashboard" },
        { label: "Dashboard" },
      ]}
    >
      {/* 1. Header Banner & Business Context */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.25rem",
          marginBottom: "1.5rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "var(--color-text-main)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {store?.name || "Seller Dashboard"}
            </h1>
            {store?.isPublished ? (
              <Badge variant="success">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                  <CheckCircle2 size={12} /> Live Storefront
                </span>
              </Badge>
            ) : (
              <Badge variant="orange">Draft Store</Badge>
            )}
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--color-primary)",
                backgroundColor: "rgba(91, 92, 226, 0.08)",
                padding: "0.2rem 0.6rem",
                borderRadius: "var(--radius-pill)",
              }}
            >
              Tenant: {store?.tenantId || activeTenantId || "tenant_mitti_craft"}
            </span>
          </div>

          <p
            style={{
              fontSize: "0.88rem",
              color: "var(--color-text-secondary)",
              marginTop: "0.35rem",
              maxWidth: "600px",
            }}
          >
            {store?.description ||
              "Real-time operational dashboard for orders, product catalog, inventory health, and fulfillment."}
          </p>
        </div>

        {/* Header Action Tools */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
          {store?.slug && (
            <Link
              href={`/store/${store.slug}`}
              target="_blank"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.85rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                fontSize: "0.84rem",
                fontWeight: 600,
                color: "var(--color-primary)",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <ExternalLink size={14} />
              <span>Public Storefront</span>
            </Link>
          )}

          {/* Date Range Selector */}
          <Dropdown
            trigger={
              <Button variant="outline" size="sm">
                <Calendar size={14} style={{ marginRight: "0.35rem" }} />
                <span>{selectedRangeLabel}</span>
              </Button>
            }
            items={rangeMenuItems}
          />

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            title="Refresh dashboard metrics"
          >
            <RefreshCw size={14} />
          </Button>

          {/* Quick Create Product (if Owner or Manager) */}
          {["STORE_OWNER", "STORE_MANAGER"].includes(currentRole) && (
            <Link href="/seller/products/new" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="sm">
                <Plus size={14} style={{ marginRight: "0.35rem" }} />
                <span>Add Product</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 2. KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.75rem",
        }}
      >
        <StatCard
          label="Total Sales"
          value={isLoading ? "—" : `₹${(kpis?.totalSales || 0).toLocaleString("en-IN")}`}
          trend={kpis?.salesGrowthPercent ? "up" : "neutral"}
          trendValue={kpis?.salesGrowthPercent ? `+${kpis.salesGrowthPercent}%` : undefined}
          subtext={`vs ${selectedRangeLabel.toLowerCase()}`}
          icon={<Store size={22} />}
          iconColor="#5B5CE2"
          iconBg="rgba(91, 92, 226, 0.12)"
          isLoading={isLoading}
        />

        <StatCard
          label="New Orders"
          value={isLoading ? "—" : (kpis?.totalOrders || 0).toString()}
          trend={kpis?.orderGrowthPercent ? "up" : "neutral"}
          trendValue={kpis?.orderGrowthPercent ? `+${kpis.orderGrowthPercent}%` : undefined}
          subtext="verified store orders"
          icon={<ShoppingBag size={22} />}
          iconColor="#FF9C43"
          iconBg="rgba(255, 156, 67, 0.12)"
          isLoading={isLoading}
        />

        <StatCard
          label="Total Products"
          value={isLoading ? "—" : (kpis?.totalProducts || 0).toString()}
          subtext="in active catalog"
          icon={<Package size={22} />}
          iconColor="#23B9AF"
          iconBg="rgba(35, 185, 175, 0.12)"
          isLoading={isLoading}
        />

        <StatCard
          label="Low Stock Alerts"
          value={isLoading ? "—" : (kpis?.lowStockCount || 0).toString()}
          trend={(kpis?.lowStockCount || 0) > 0 ? "down" : "neutral"}
          subtext={(kpis?.lowStockCount || 0) > 0 ? "Requires restock" : "All products healthy"}
          icon={<AlertTriangle size={22} />}
          iconColor={(kpis?.lowStockCount || 0) > 0 ? "#FF9C43" : "#18845A"}
          iconBg={(kpis?.lowStockCount || 0) > 0 ? "rgba(255, 156, 67, 0.12)" : "rgba(24, 132, 90, 0.12)"}
          isLoading={isLoading}
        />
      </div>

      {/* 3. Sales Overview Chart */}
      <div style={{ marginBottom: "1.75rem" }}>
        <AnalyticsDualChart
          data={chartData}
          selectedRange={selectedRange}
          onRangeChange={(range) => {
            const label = range === "7D" ? "Last 7 Days" : range === "30D" ? "Last 30 Days" : range === "90D" ? "Last 90 Days" : "Year to Date";
            handleRangeSelect(range, label);
          }}
          isLoading={isLoading}
        />
      </div>

      {/* 4. Quick Operational Actions Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <Link
          href="/seller/products"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--color-border)",
            textDecoration: "none",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(91, 92, 226, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-primary)",
            }}
          >
            <Package size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-text-main)" }}>
              Manage Products
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
              {kpis?.totalProducts || 0} listings in catalog
            </div>
          </div>
        </Link>

        <Link
          href="/seller/inventory"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--color-border)",
            textDecoration: "none",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(35, 185, 175, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-teal)",
            }}
          >
            <Boxes size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-text-main)" }}>
              Live Inventory
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
              {kpis?.lowStockCount || 0} items low in stock
            </div>
          </div>
        </Link>

        <Link
          href="/seller/shipping"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--color-border)",
            textDecoration: "none",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(255, 156, 67, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-orange)",
            }}
          >
            <Truck size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-text-main)" }}>
              Fulfillment Hub
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
              Dispatch & tracking
            </div>
          </div>
        </Link>

        {currentRole === "STORE_OWNER" && (
          <Link
            href="/seller/settings"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--color-border)",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(68, 69, 200, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary-dark)",
              }}
            >
              <Settings size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                Store Settings
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                Branding & preferences
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* 5. Recent Orders Section */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "var(--color-text-main)",
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              Recent Customer Orders
            </h3>
            <p style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
              Latest purchase activities across your store.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Quick Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "0.35rem 0.75rem",
                gap: "0.5rem",
              }}
            >
              <Search size={14} style={{ color: "var(--color-text-secondary)" }} />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "0.85rem",
                  outline: "none",
                  width: "160px",
                }}
              />
            </div>

            <Link href="/seller/orders" style={{ textDecoration: "none" }}>
              <Button variant="outline" size="sm">
                View All Orders
              </Button>
            </Link>
          </div>
        </div>

        {/* Orders Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--color-bg)",
                  borderBottom: "1px solid var(--color-border)",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Order #
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Date
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Customer
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Status
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Payment
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Total
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    No recent orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--color-primary)" }}>
                      {order.orderNumber}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: "var(--color-text-secondary)", fontSize: "0.82rem" }}>
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>
                        {order.customer.name}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                        {order.shippingAddress.city}, {order.shippingAddress.state}
                      </div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge variant={getOrderStatusVariant(order.status)}>{order.status}</Badge>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: order.paymentStatus === "PAID" ? "var(--color-success)" : "var(--color-orange)",
                          backgroundColor:
                            order.paymentStatus === "PAID" ? "rgba(24, 132, 90, 0.08)" : "rgba(255, 156, 67, 0.08)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "var(--radius-pill)",
                        }}
                      >
                        {order.paymentStatus} ({order.paymentMethod})
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 700, color: "var(--color-text-main)" }}>
                      ₹{order.total.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveOrder(order);
                          setIsModalOpen(true);
                        }}
                      >
                        <Eye size={13} style={{ marginRight: "0.3rem" }} />
                        <span>View</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={activeOrder}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveOrder(null);
        }}
        onOrderUpdated={handleOrderUpdated}
        canManageOrders={["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"].includes(currentRole)}
      />
    </AppShell>
  );
}
