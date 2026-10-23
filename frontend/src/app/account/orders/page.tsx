"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/context/ToastContext";
import {
  ShoppingBag,
  Search,
  Calendar,
  Package,
  Truck,
  ArrowRight,
  Store,
} from "lucide-react";
import {
  getCustomerOrders,
  CustomerOrder,
  CustomerOrderListResponse,
} from "@/lib/customerApi";

type StatusTab = "ALL" | "PLACED" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export default function CustomerOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async (targetPage = 1, status = activeTab) => {
    setIsLoading(true);
    try {
      const data: CustomerOrderListResponse = await getCustomerOrders({
        page: targetPage,
        limit: 10,
        status: status === "ALL" ? undefined : status,
      });

      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast({ type: "error", title: "Failed to load order history" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(1, activeTab);
  }, [activeTab]);

  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesOrderNo = order.orderNumber.toLowerCase().includes(q);
    const matchesProduct = order.items.some((i) => i.productName.toLowerCase().includes(q));
    return matchesOrderNo || matchesProduct;
  });

  const getOrderStatusBadge = (status: CustomerOrder["status"]) => {
    switch (status) {
      case "DELIVERED":
        return <Badge variant="success">Delivered</Badge>;
      case "SHIPPED":
        return <Badge variant="teal">Dispatched / In Transit</Badge>;
      case "PROCESSING":
        return <Badge variant="indigo">Artisan Preparing</Badge>;
      case "CONFIRMED":
        return <Badge variant="indigo">Confirmed</Badge>;
      case "PLACED":
        return <Badge variant="orange">Order Placed</Badge>;
      case "CANCELLED":
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="muted">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: CustomerOrder["paymentStatus"]) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success" withDot={false}>Paid</Badge>;
      case "PENDING":
        return <Badge variant="orange" withDot={false}>Payment Pending</Badge>;
      case "FAILED":
        return <Badge variant="danger" withDot={false}>Payment Failed</Badge>;
      case "REFUNDED":
        return <Badge variant="muted" withDot={false}>Refunded</Badge>;
      default:
        return <Badge variant="muted" withDot={false}>{status}</Badge>;
    }
  };

  const tabs: { label: string; value: StatusTab }[] = [
    { label: "All Orders", value: "ALL" },
    { label: "Placed", value: "PLACED" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Processing", value: "PROCESSING" },
    { label: "Shipped", value: "SHIPPED" },
    { label: "Delivered", value: "DELIVERED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  return (
    <AppShell
      title="My Orders"
      breadcrumbs={[
        { label: "GauShilp OS", href: "/" },
        { label: "My Account", href: "/account" },
        { label: "My Orders" },
      ]}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
            Sacred Order History
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.92rem", margin: "0.3rem 0 0 0" }}>
            Track and manage your handmade artisan consignments, view invoices, and inspect shipment journeys
          </p>
        </div>

        {/* Filter Controls Bar */}
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
          {/* Status Tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.4rem",
              overflowX: "auto",
              paddingBottom: "4px",
              maxWidth: "100%",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                style={{
                  padding: "0.45rem 0.9rem",
                  borderRadius: "var(--radius-pill)",
                  border: activeTab === tab.value ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                  backgroundColor: activeTab === tab.value ? "var(--color-primary)" : "#FFFFFF",
                  color: activeTab === tab.value ? "#FFFFFF" : "var(--color-text-main)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ width: "280px" }}>
            <Input
              placeholder="Search by order ID or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Skeleton height="140px" />
            <Skeleton height="140px" />
            <Skeleton height="140px" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card variant="elevated" style={{ padding: "3.5rem" }}>
            <EmptyState
              icon={<ShoppingBag size={44} />}
              title="No Orders Found"
              description={
                searchQuery
                  ? `No orders matching "${searchQuery}". Try clearing search or changing the filter.`
                  : "You have not placed any orders matching this status."
              }
              action={
                <Link href="/">
                  <Button variant="primary">Shop Sacred Creations</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {filteredOrders.map((order) => (
              <Card
                key={order.id}
                variant="elevated"
                style={{
                  padding: "1.5rem",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 2px 10px rgba(91, 92, 226, 0.04)",
                }}
              >
                {/* Order Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    paddingBottom: "1.25rem",
                    borderBottom: "1px solid var(--color-border)",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Order Reference
                      </div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-text-main)", marginTop: "0.15rem" }}>
                        {order.orderNumber}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {getOrderStatusBadge(order.status)}
                      {getPaymentStatusBadge(order.paymentStatus)}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                        Placed On
                      </div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--color-text-main)", marginTop: "0.15rem" }}>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                        Order Total
                      </div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-primary)", marginTop: "0.15rem" }}>
                        ₹{order.totalAmount.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items Breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "1rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div
                          style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--color-bg)",
                            border: "1px solid var(--color-border)",
                            position: "relative",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          {item.image ? (
                            <Image src={item.image} alt={item.productName} fill style={{ objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Package size={22} style={{ color: "var(--color-primary)" }} />
                            </div>
                          )}
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--color-text-main)" }}>
                            {item.productName}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
                            Qty: {item.quantity} × ₹{item.unitPrice.toLocaleString("en-IN")}
                            {item.sku && ` • SKU: ${item.sku}`}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontWeight: 700, color: "var(--color-text-main)", fontSize: "0.95rem" }}>
                        ₹{item.subtotal.toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Footer & Actions */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    marginTop: "1.25rem",
                    paddingTop: "1rem",
                    borderTop: "1px dashed var(--color-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                    <Store size={14} />
                    <span>Fulfillment Store: {order.storeName || "Mitti Craft Studio & Pottery"}</span>
                  </div>

                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <Link href={`/account/orders/${order.id}`}>
                      <Button variant="secondary" size="sm">
                        View Details
                      </Button>
                    </Link>

                    {(order.status === "SHIPPED" || order.status === "DELIVERED") && (
                      <Link href={`/account/orders/${order.id}#tracking`}>
                        <Button variant="outline" size="sm" leftIcon={<Truck size={14} />}>
                          Track Consignment
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => loadOrders(p, activeTab)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
