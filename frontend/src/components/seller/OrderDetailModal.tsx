"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  SellerOrder,
  OrderStatus,
  VALID_ORDER_TRANSITIONS,
  updateOrderStatus,
  cancelOrder,
} from "@/lib/sellerApi";
import {
  Package,
  MapPin,
  User,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react";

interface OrderDetailModalProps {
  order: SellerOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: (updatedOrder: SellerOrder) => void;
  canManageOrders?: boolean;
}

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
  canManageOrders = true,
}: OrderDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmingTransition, setConfirmingTransition] = useState<OrderStatus | null>(null);
  const [transitionNote, setTransitionNote] = useState("");

  if (!order) return null;

  const allowedTransitions = VALID_ORDER_TRANSITIONS[order.status] || [];

  const getStatusBadgeVariant = (status: OrderStatus): "indigo" | "orange" | "teal" | "success" | "danger" | "muted" => {
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

  const handleStatusChange = async (nextStatus: OrderStatus) => {
    setIsUpdating(true);
    setError(null);
    try {
      const updated = await updateOrderStatus(order.id, nextStatus, transitionNote || undefined);
      if (onOrderUpdated) onOrderUpdated(updated);
      setConfirmingTransition(null);
      setTransitionNote("");
    } catch (err: any) {
      setError(err.message || "Failed to update order status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError("Please specify a reason for cancellation");
      return;
    }
    setIsUpdating(true);
    setError(null);
    try {
      const updated = await cancelOrder(order.id, cancelReason);
      if (onOrderUpdated) onOrderUpdated(updated);
      setShowCancelConfirm(false);
      setCancelReason("");
    } catch (err: any) {
      setError(err.message || "Failed to cancel order");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Order Details: ${order.orderNumber}`}
      maxWidth="680px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(224, 49, 49, 0.08)",
              border: "1px solid rgba(224, 49, 49, 0.2)",
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

        {/* Top Summary Banner */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem",
            backgroundColor: "var(--color-bg)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                {order.orderNumber}
              </span>
              <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
              Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-primary)" }}>
              ₹{order.total.toLocaleString("en-IN")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", justifyContent: "flex-end", marginTop: "0.2rem" }}>
              <CreditCard size={13} style={{ color: "var(--color-text-secondary)" }} />
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                {order.paymentMethod} •{" "}
                <strong style={{ color: order.paymentStatus === "PAID" ? "var(--color-success)" : "var(--color-orange)" }}>
                  {order.paymentStatus}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Customer & Shipping Info Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Customer Profile */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <User size={16} style={{ color: "var(--color-primary)" }} />
              <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                Customer Information
              </h4>
            </div>
            <p style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--color-text-main)" }}>
              {order.customer.name}
            </p>
            <p style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>
              {order.customer.email}
            </p>
            <p style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>
              {order.customer.phone}
            </p>
          </div>

          {/* Delivery Address */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <MapPin size={16} style={{ color: "var(--color-primary)" }} />
              <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                Delivery Address
              </h4>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--color-text-main)", lineHeight: 1.4 }}>
              {order.shippingAddress.street}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
            </p>
            {order.trackingNumber && (
              <div
                style={{
                  marginTop: "0.5rem",
                  paddingTop: "0.5rem",
                  borderTop: "1px dashed var(--color-border)",
                  fontSize: "0.82rem",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Truck size={14} />
                <span>
                  {order.carrier || "Carrier"}: <strong>{order.trackingNumber}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Order Items Table */}
        <div>
          <h4
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--color-text-main)",
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Package size={16} style={{ color: "var(--color-primary)" }} />
            <span>Items Ordered ({order.items.length})</span>
          </h4>

          <div
            style={{
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600 }}>Product</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600 }}>SKU</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600 }}>Price</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 600 }}>Qty</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-main)", fontWeight: 600 }}>
                      {item.productName}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                      {item.sku}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "var(--color-text-main)" }}>
                      ₹{item.price.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: "var(--color-text-main)" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: "var(--color-primary)" }}>
                      ₹{item.total.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
            <div style={{ width: "240px", fontSize: "0.85rem", lineHeight: "1.8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)" }}>
                <span>Subtotal</span>
                <span>₹{order.subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)" }}>
                <span>Shipping Fee</span>
                <span>{order.shippingFee === 0 ? "FREE" : `₹${order.shippingFee}`}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: "var(--color-text-main)",
                  borderTop: "1px solid var(--color-border)",
                  paddingTop: "0.35rem",
                  marginTop: "0.35rem",
                }}
              >
                <span>Total Amount</span>
                <span style={{ color: "var(--color-primary)" }}>₹{order.total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transition Confirmation Sub-Panel */}
        {confirmingTransition && (
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(91, 92, 226, 0.06)",
              border: "1px solid var(--color-primary)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Clock size={16} style={{ color: "var(--color-primary)" }} />
              <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--color-primary)" }}>
                Confirm State Transition: {order.status} → {confirmingTransition}
              </span>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>
              Are you sure you want to advance this order? This change will notify the customer and update fulfillment logs.
            </p>
            <input
              type="text"
              placeholder="Optional fulfillment note or tracking reference..."
              value={transitionNote}
              onChange={(e) => setTransitionNote(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
                fontSize: "0.85rem",
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmingTransition(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange(confirmingTransition)}
                isLoading={isUpdating}
              >
                Confirm Update
              </Button>
            </div>
          </div>
        )}

        {/* Cancellation Sub-Panel */}
        {showCancelConfirm && (
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(224, 49, 49, 0.06)",
              border: "1px solid rgba(224, 49, 49, 0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <XCircle size={16} style={{ color: "#c92a2a" }} />
              <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#c92a2a" }}>
                Cancel Order & Restore Inventory
              </span>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>
              Cancelling this order will immediately release reserved inventory back into available stock. This action cannot be reversed.
            </p>
            <input
              type="text"
              placeholder="Reason for cancellation (e.g., Customer requested before dispatch)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
                fontSize: "0.85rem",
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelConfirm(false)}
                disabled={isUpdating}
              >
                Dismiss
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancel}
                isLoading={isUpdating}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        )}

        {/* State Machine Transition Actions */}
        {canManageOrders && !confirmingTransition && !showCancelConfirm && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <div>
              {allowedTransitions.includes("CANCELLED") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelConfirm(true)}
                  style={{ color: "#c92a2a", borderColor: "rgba(224, 49, 49, 0.4)" }}
                >
                  <XCircle size={14} style={{ marginRight: "0.35rem" }} />
                  Cancel Order
                </Button>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {allowedTransitions
                .filter((st) => st !== "CANCELLED")
                .map((nextStatus) => (
                  <Button
                    key={nextStatus}
                    variant="primary"
                    size="sm"
                    onClick={() => setConfirmingTransition(nextStatus)}
                  >
                    <span>Advance to {nextStatus}</span>
                    <ArrowRight size={14} style={{ marginLeft: "0.35rem" }} />
                  </Button>
                ))}
              {allowedTransitions.length === 0 && (
                <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                  Terminal status reached ({order.status}). No further transitions available.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
