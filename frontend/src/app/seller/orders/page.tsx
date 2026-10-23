"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderDetailModal } from "@/components/seller/OrderDetailModal";
import {
  fetchOrders,
  SellerOrder,
  OrderStatus,
} from "@/lib/sellerApi";
import {
  ShoppingBag,
  Search,
  Eye,
  CreditCard,
  Truck,
  AlertTriangle,
  RefreshCw,
  Clock,
} from "lucide-react";

export default function SellerOrdersPage() {
  const { currentRole, activeTenantId } = useAuth();
  const isAuthorized = ["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"].includes(currentRole);

  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active modal order
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchOrders(
        {
          status: activeTab as OrderStatus | "ALL",
          search: search.trim() || undefined,
          page,
          limit,
        },
        activeTenantId || undefined
      );
      setOrders(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || "Failed to load orders.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, search, page, activeTenantId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOrderUpdated = (updated: SellerOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelectedOrder(updated);
  };

  if (!isAuthorized) {
    return (
      <AppShell title="Access Denied" breadcrumbs={[{ label: "Seller" }, { label: "Orders" }]}>
        <AccessDenied requiredRole="STORE_OWNER, STORE_MANAGER, or STORE_STAFF" />
      </AppShell>
    );
  }

  const getOrderStatusVariant = (status: OrderStatus): "indigo" | "orange" | "teal" | "success" | "danger" | "muted" => {
    switch (status) {
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

  const statusTabs: TabItem[] = [
    { id: "ALL", label: "All Orders" },
    { id: "PLACED", label: "New (Placed)" },
    { id: "CONFIRMED", label: "Confirmed" },
    { id: "PROCESSING", label: "Processing" },
    { id: "SHIPPED", label: "Shipped" },
    { id: "DELIVERED", label: "Delivered" },
    { id: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <AppShell
      title="Order Management"
      breadcrumbs={[
        { label: "Seller", href: "/seller/dashboard" },
        { label: "Orders" },
      ]}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--color-text-main)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Store Orders
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Review, confirm, fulfill, and track customer shipments across your store.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadOrders} isLoading={isLoading}>
          <RefreshCw size={14} style={{ marginRight: "0.35rem" }} />
          <span>Refresh</span>
        </Button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(224, 49, 49, 0.08)",
            border: "1px solid rgba(224, 49, 49, 0.25)",
            color: "#c92a2a",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Row */}
      <div style={{ marginBottom: "1rem" }}>
        <Tabs
          tabs={statusTabs}
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setPage(1);
          }}
        />
      </div>

      {/* Search Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          padding: "0.75rem 1rem",
          marginBottom: "1.25rem",
          gap: "0.75rem",
        }}
      >
        <Search size={16} style={{ color: "var(--color-text-secondary)" }} />
        <input
          type="text"
          placeholder="Search by order ID, customer name, or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: "0.88rem",
            width: "100%",
          }}
        />
      </div>

      {/* Orders Table Card */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
        }}
      >
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
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Order #
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Date
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Customer
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Items
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Fulfillment Status
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Payment Status
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Total
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "3rem 1rem" }}>
                    <EmptyState
                      icon={<ShoppingBag size={28} />}
                      title="No orders found"
                      description={`No orders found matching the filter "${activeTab}".`}
                    />
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--color-primary)" }}>
                      {o.orderNumber}
                    </td>

                    <td style={{ padding: "0.85rem 1rem", color: "var(--color-text-secondary)", fontSize: "0.82rem" }}>
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>
                        {o.customer.name}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                        {o.shippingAddress.city}, {o.shippingAddress.state}
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>
                      {o.items.length} item{o.items.length > 1 ? "s" : ""}
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge variant={getOrderStatusVariant(o.status)}>{o.status}</Badge>
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: o.paymentStatus === "PAID" ? "var(--color-success)" : "var(--color-orange)",
                          backgroundColor:
                            o.paymentStatus === "PAID" ? "rgba(24, 132, 90, 0.08)" : "rgba(255, 156, 67, 0.08)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "var(--radius-pill)",
                        }}
                      >
                        {o.paymentStatus} ({o.paymentMethod})
                      </span>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 700, color: "var(--color-text-main)" }}>
                      ₹{o.total.toLocaleString("en-IN")}
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(o);
                          setIsModalOpen(true);
                        }}
                      >
                        <Eye size={13} style={{ marginRight: "0.3rem" }} />
                        <span>Manage</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div style={{ padding: "1rem", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end" }}>
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / limit)}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Order Detail & Transition Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
        onOrderUpdated={handleOrderUpdated}
        canManageOrders={["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"].includes(currentRole)}
      />
    </AppShell>
  );
}
