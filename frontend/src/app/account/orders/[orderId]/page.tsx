"use client";

import React, { useEffect, useState, use, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import {
  ShoppingBag,
  ArrowLeft,
  Truck,
  MapPin,
  Calendar,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Store,
  FileText,
  XCircle,
} from "lucide-react";
import {
  getCustomerOrder,
  getCustomerOrderTracking,
  cancelCustomerOrder,
  CustomerOrder,
  CustomerTrackingResponse,
} from "@/lib/customerApi";

function OrderDetailsContent({ orderId }: { orderId: string }) {
  const { toast } = useToast();
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [tracking, setTracking] = useState<CustomerTrackingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const loadOrderData = async () => {
    setIsLoading(true);
    try {
      const [orderRes, trackingRes] = await Promise.all([
        getCustomerOrder(orderId),
        getCustomerOrderTracking(orderId),
      ]);
      setOrder(orderRes);
      setTracking(trackingRes);
    } catch {
      toast({ type: "error", title: "Failed to retrieve order details" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      loadOrderData();
    }
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!cancelReason.trim()) {
      toast({ type: "error", title: "Please provide a reason for cancellation" });
      return;
    }

    setIsCancelling(true);
    try {
      await cancelCustomerOrder(order.id, cancelReason.trim());
      toast({ type: "success", title: "Order cancelled successfully. Stock reservations have been restored." });
      setIsCancelModalOpen(false);
      setCancelReason("");
      await loadOrderData();
    } catch {
      toast({ type: "error", title: "Unable to cancel order. It may have already been dispatched." });
    } finally {
      setIsCancelling(false);
    }
  };

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
        return <Badge variant="success" withDot={false}>Payment Received</Badge>;
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

  const isEligibleForCancellation =
    order && ["PLACED", "CONFIRMED", "PROCESSING"].includes(order.status);

  if (isLoading) {
    return (
      <AppShell title="Order Details" breadcrumbs={[{ label: "GauShilp OS", href: "/" }, { label: "My Orders", href: "/account/orders" }, { label: "Order Details" }]}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <Skeleton height="80px" />
          <Skeleton height="300px" />
          <Skeleton height="200px" />
        </div>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell title="Order Not Found" breadcrumbs={[{ label: "GauShilp OS", href: "/" }, { label: "My Orders", href: "/account/orders" }, { label: "Not Found" }]}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center", padding: "4rem 0" }}>
          <Package size={48} style={{ color: "var(--color-text-secondary)", margin: "0 auto 1rem auto" }} />
          <h2>Order Not Found</h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
            The requested order ID does not exist or you do not have permission to view it.
          </p>
          <Link href="/account/orders">
            <Button variant="primary" leftIcon={<ArrowLeft size={16} />}>
              Back to My Orders
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const shipment = tracking?.shipments?.[0];

  return (
    <AppShell
      title={`Order ${order.orderNumber}`}
      breadcrumbs={[
        { label: "GauShilp OS", href: "/" },
        { label: "My Account", href: "/account" },
        { label: "My Orders", href: "/account/orders" },
        { label: order.orderNumber },
      ]}
    >
      <div style={{ maxWidth: "1080px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        {/* Back Button & Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link href="/account/orders">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />}>
                Back to Orders
              </Button>
            </Link>
            <div>
              <h1 style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
                {order.orderNumber}
              </h1>
              <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
                Placed on {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {getOrderStatusBadge(order.status)}
            {getPaymentStatusBadge(order.paymentStatus)}
            {isEligibleForCancellation && (
              <Button variant="outline" size="sm" onClick={() => setIsCancelModalOpen(true)} style={{ color: "var(--color-danger)" }}>
                Cancel Order
              </Button>
            )}
          </div>
        </div>

        {/* Cancellation Notice if Cancelled */}
        {order.status === "CANCELLED" && (
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(224, 62, 62, 0.08)",
              border: "1px solid rgba(224, 62, 62, 0.25)",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <XCircle size={22} style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <div style={{ fontWeight: 700, color: "var(--color-danger)", fontSize: "0.95rem" }}>
                Order Cancelled
              </div>
              <div style={{ fontSize: "0.86rem", color: "var(--color-text-main)", marginTop: "0.25rem" }}>
                Reason: {order.cancelReason || "Cancelled by customer request."}
              </div>
              {order.cancelledAt && (
                <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                  Cancelled at: {new Date(order.cancelledAt).toLocaleString("en-IN")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shipment Tracking Section (Anchor ID #tracking) */}
        <div id="tracking">
          <Card variant="elevated" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Truck size={20} style={{ color: "var(--color-primary)" }} />
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                  Consignment Journey & Courier Tracking
                </h3>
              </div>

              {shipment?.trackingNumber && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                    Carrier: <strong>{shipment.provider}</strong>
                  </span>
                  <Badge variant="teal" withDot={false}>
                    AWB: {shipment.trackingNumber}
                  </Badge>
                </div>
              )}
            </div>

            {/* Stepper Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "0.5rem",
                position: "relative",
                margin: "1.5rem 0 2rem 0",
              }}
            >
              {[
                { label: "Order Placed", stepStatus: "PLACED", done: true },
                { label: "Confirmed", stepStatus: "CONFIRMED", done: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status) },
                { label: "Dispatched", stepStatus: "SHIPPED", done: ["SHIPPED", "DELIVERED"].includes(order.status) },
                { label: "Delivered", stepStatus: "DELIVERED", done: order.status === "DELIVERED" },
              ].map((step, idx) => (
                <div key={idx} style={{ textAlign: "center", position: "relative" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: step.done ? "var(--color-primary)" : "var(--color-border)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 0.5rem auto",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {step.done ? <CheckCircle2 size={18} /> : idx + 1}
                  </div>
                  <div style={{ fontSize: "0.82rem", fontWeight: step.done ? 700 : 500, color: step.done ? "var(--color-text-main)" : "var(--color-text-secondary)" }}>
                    {step.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline Milestones */}
            {shipment?.events && shipment.events.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem", borderLeft: "2px solid rgba(91, 92, 226, 0.2)", paddingLeft: "1.25rem", marginLeft: "1rem" }}>
                {shipment.events.map((ev, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "-1.62rem",
                        top: "4px",
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: i === shipment.events.length - 1 ? "var(--color-primary)" : "var(--color-text-secondary)",
                        border: "2px solid #FFFFFF",
                      }}
                    />
                    <div style={{ fontWeight: 700, color: "var(--color-text-main)", fontSize: "0.9rem" }}>
                      {ev.description}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
                      {ev.location && `📍 ${ev.location} • `}
                      {new Date(ev.eventTimestamp).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "1.25rem", backgroundColor: "var(--color-bg)", borderRadius: "var(--radius-md)", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.88rem" }}>
                Consignment is being safely packed at the artisan workshop. Tracking milestones will update as the package moves through courier transit.
              </div>
            )}
          </Card>
        </div>

        {/* Two-Column: Line Items & Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem" }}>
          {/* Line Items Card */}
          <Card variant="elevated" style={{ padding: "1.75rem" }}>
            <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
              Purchased Creations ({order.items.length})
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {order.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    paddingBottom: "1rem",
                    borderBottom: "1px solid var(--color-border)",
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
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                        {item.productName}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
                        Qty: {item.quantity} × ₹{item.unitPrice.toLocaleString("en-IN")}
                        {item.sku && ` • SKU: ${item.sku}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontWeight: 800, color: "var(--color-text-main)", fontSize: "1rem" }}>
                    ₹{item.subtotal.toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.88rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)" }}>
                <span>Items Subtotal</span>
                <span>₹{order.subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)" }}>
                <span>Vedic GST & Taxes (5%)</span>
                <span>₹{order.taxAmount.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)" }}>
                <span>Eco Shipping & Fragile Handling</span>
                <span>{order.shippingAmount === 0 ? "FREE" : `₹${order.shippingAmount.toLocaleString("en-IN")}`}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "var(--color-primary)",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--color-border)",
                  marginTop: "0.25rem",
                }}
              >
                <span>Total Amount</span>
                <span>₹{order.totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </Card>

          {/* Shipping Destination & Store Contact Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Delivery Address */}
            <Card variant="elevated" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <MapPin size={18} style={{ color: "var(--color-primary)" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                  Delivery Destination
                </h3>
              </div>

              <div style={{ color: "var(--color-text-main)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{order.shippingAddress.fullName}</div>
                <div style={{ color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                  <div>{order.shippingAddress.addressLine1}</div>
                  {order.shippingAddress.addressLine2 && <div>{order.shippingAddress.addressLine2}</div>}
                  <div>
                    {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.postalCode}
                  </div>
                  <div style={{ marginTop: "0.4rem", fontWeight: 500, color: "var(--color-text-main)" }}>
                    📞 {order.shippingAddress.phone}
                  </div>
                </div>
              </div>

              {order.customerNote && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(91, 92, 226, 0.06)",
                    border: "1px dashed rgba(91, 92, 226, 0.3)",
                    fontSize: "0.82rem",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <strong>Customer Note:</strong> {order.customerNote}
                </div>
              )}
            </Card>

            {/* Merchant Context */}
            <Card variant="elevated" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <Store size={18} style={{ color: "var(--color-primary)" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                  Artisan Store Guild
                </h3>
              </div>

              <div style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: "var(--color-text-main)" }}>
                  {order.storeName || "Mitti Craft Studio & Pottery"}
                </div>
                <p style={{ margin: "0.3rem 0 0.8rem 0" }}>
                  Verified Gaushala & Indian artisan collective crafting sacred earthenware and authentic cow dung puja accessories.
                </p>
                <Link href="/store/mitti-craft-studio">
                  <Button variant="outline" size="sm">
                    Visit Artisan Storefront
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>

        {/* Cancellation Reason Modal */}
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title="Cancel Sacred Order"
          description="Are you sure you want to cancel this order? Stock reservations will be released back to the artisan inventory."
          maxWidth="500px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                Reason for Cancellation
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Ordered incorrect pack size, change of delivery date..."
                style={{
                  width: "100%",
                  padding: "0.65rem 0.8rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <Button variant="outline" onClick={() => setIsCancelModalOpen(false)} disabled={isCancelling}>
                Dismiss
              </Button>
              <Button variant="danger" onClick={handleCancelOrder} isLoading={isCancelling}>
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}

export default function OrderDetailsPage({ params }: { params: Promise<{ orderId: string }> }) {
  return (
    <Suspense fallback={<div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>Loading order details...</div>}>
      <OrderDetailsWrapper params={params} />
    </Suspense>
  );
}

function OrderDetailsWrapper({ params }: { params: Promise<{ orderId: string }> }) {
  const unwrappedParams = use(params);
  return <OrderDetailsContent orderId={unwrappedParams.orderId} />;
}
