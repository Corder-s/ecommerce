"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchReadyOrders,
  fetchShipments,
  createShipment,
  dispatchShipment,
  ReadyToShipOrder,
  ShipmentRecord,
} from "@/lib/sellerApi";
import {
  Truck,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  MapPin,
  Send,
} from "lucide-react";

function generateDefaultTrackingNumber(): string {
  return `DLH-${Math.floor(10000000 + Math.random() * 90000000)}`;
}

export default function SellerShippingPage() {
  const { currentRole, activeTenantId } = useAuth();
  const isAuthorized = ["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"].includes(currentRole);

  const [readyOrders, setReadyOrders] = useState<ReadyToShipOrder[]>([]);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Shipment Modal
  const [activeOrderToShip, setActiveOrderToShip] = useState<ReadyToShipOrder | null>(null);
  const [carrier, setCarrier] = useState("Delhivery Surface");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [packageWeight, setPackageWeight] = useState("0.85");
  const [shipmentNotes, setShipmentNotes] = useState("");
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Dispatch Action
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadShippingData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ready, ships] = await Promise.all([
        fetchReadyOrders(activeTenantId || undefined),
        fetchShipments(),
      ]);
      setReadyOrders(ready);
      setShipments(ships);
    } catch (err: any) {
      setError(err.message || "Failed to load shipping data.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    loadShippingData();
  }, [loadShippingData]);

  const openCreateShipmentModal = (order: ReadyToShipOrder) => {
    setActiveOrderToShip(order);
    setCarrier("Delhivery Surface");
    setTrackingNumber(generateDefaultTrackingNumber());
    setPackageWeight("0.85");
    setShipmentNotes("Eco-friendly corrugated packaging with shredded sacred straw filler.");
    setModalError(null);
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrderToShip) return;

    setIsCreatingShipment(true);
    setModalError(null);
    try {
      const created = await createShipment(activeOrderToShip.orderId, {
        carrier,
        trackingNumber: trackingNumber.trim() || undefined,
        packageWeightKg: parseFloat(packageWeight) || 0.5,
        notes: shipmentNotes.trim() || undefined,
      });

      setSuccessToast(`Shipment created for Order ${activeOrderToShip.orderNumber}! Awaiting dispatch.`);
      setActiveOrderToShip(null);
      loadShippingData();
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      setModalError(err.message || "Failed to create shipment record.");
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleDispatch = async (shipmentId: string) => {
    setDispatchingId(shipmentId);
    try {
      const updated = await dispatchShipment(shipmentId);
      setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSuccessToast(`Shipment ${updated.trackingNumber} successfully marked as Dispatched!`);
      loadShippingData();
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to dispatch shipment.");
    } finally {
      setDispatchingId(null);
    }
  };

  if (!isAuthorized) {
    return (
      <AppShell title="Access Denied" breadcrumbs={[{ label: "Seller" }, { label: "Shipping" }]}>
        <AccessDenied requiredRole="STORE_OWNER, STORE_MANAGER, or STORE_STAFF" />
      </AppShell>
    );
  }

  const getShipmentStatusVariant = (st: string): "indigo" | "orange" | "teal" | "success" | "danger" | "muted" => {
    switch (st) {
      case "PENDING":
        return "orange";
      case "READY_TO_SHIP":
        return "teal";
      case "DISPATCHED":
      case "IN_TRANSIT":
        return "indigo";
      case "DELIVERED":
        return "success";
      default:
        return "muted";
    }
  };

  return (
    <AppShell
      title="Shipping & Fulfilment"
      breadcrumbs={[
        { label: "Seller", href: "/seller/dashboard" },
        { label: "Shipping" },
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
            Fulfillment & Logistics
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Pack ready orders, generate courier tracking references, and dispatch parcels to Indian logistics partners.
          </p>
        </div>

        {/* Carrier Sandbox Notice Badge */}
        <div
          style={{
            padding: "0.45rem 0.85rem",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "rgba(35, 185, 175, 0.1)",
            color: "var(--color-teal)",
            fontSize: "0.8rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <ShieldCheck size={14} />
          <span>Integrated Courier Sandbox Active</span>
        </div>
      </div>

      {successToast && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(24, 132, 90, 0.08)",
            border: "1px solid rgba(24, 132, 90, 0.25)",
            color: "var(--color-success)",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successToast}</span>
        </div>
      )}

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

      {/* SECTION 1: Orders Awaiting Fulfilment */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          padding: "1.5rem",
          marginBottom: "1.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)", margin: 0 }}>
              Orders Awaiting Fulfilment
            </h3>
            <p style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
              Paid customer orders verified and ready for courier packaging.
            </p>
          </div>
          <Badge variant={readyOrders.length > 0 ? "orange" : "success"}>
            {readyOrders.length} order{readyOrders.length === 1 ? "" : "s"} ready
          </Badge>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--color-bg)", borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Order #</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Customer</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Delivery Destination</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)" }}>Total Items</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>Total Value</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    Checking ready-to-fulfill orders...
                  </td>
                </tr>
              ) : readyOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    <CheckCircle2 size={24} style={{ color: "var(--color-success)", margin: "0 auto 0.5rem" }} />
                    <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>All caught up!</div>
                    <div style={{ fontSize: "0.82rem" }}>No pre-shipment orders awaiting fulfillment right now.</div>
                  </td>
                </tr>
              ) : (
                readyOrders.map((o) => (
                  <tr key={o.orderId} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--color-primary)" }}>
                      {o.orderNumber}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-main)" }}>
                      {o.customerName}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: "var(--color-text-secondary)", maxWidth: "280px" }}>
                      {o.shippingAddress}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 600 }}>
                      {o.totalItems} unit{o.totalItems > 1 ? "s" : ""}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 700, color: "var(--color-primary)" }}>
                      ₹{o.total.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openCreateShipmentModal(o)}
                      >
                        <Truck size={13} style={{ marginRight: "0.35rem" }} />
                        <span>Create Shipment</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Active Shipments & Tracking History */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)", margin: 0 }}>
              Active Shipments & Dispatch History
            </h3>
            <p style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
              Tracking references, courier carriers, and delivery status milestones.
            </p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--color-bg)", borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Tracking #</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Carrier</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Weight</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Status</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Packaging Notes</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    No shipment parcels registered yet.
                  </td>
                </tr>
              ) : (
                shipments.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)" }}>
                      {s.trackingNumber}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-main)" }}>
                      {s.carrier}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: "var(--color-text-secondary)" }}>
                      {s.packageWeightKg ? `${s.packageWeightKg} kg` : "—"}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge variant={getShipmentStatusVariant(s.status)}>
                        {s.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: "var(--color-text-secondary)", maxWidth: "260px" }}>
                      {s.notes || "Standard parcel"}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      {s.status === "READY_TO_SHIP" || s.status === "PENDING" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleDispatch(s.id)}
                          isLoading={dispatchingId === s.id}
                        >
                          <Send size={13} style={{ marginRight: "0.35rem" }} />
                          <span>Dispatch Parcel</span>
                        </Button>
                      ) : (
                        <span style={{ fontSize: "0.82rem", color: "var(--color-success)", fontWeight: 600 }}>
                          ✓ Dispatched
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Shipment Modal */}
      {activeOrderToShip && (
        <Modal
          isOpen={true}
          onClose={() => setActiveOrderToShip(null)}
          title={`Prepare Shipment: ${activeOrderToShip.orderNumber}`}
        >
          <form onSubmit={handleCreateShipment}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {modalError && (
                <div
                  style={{
                    padding: "0.65rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(224, 49, 49, 0.08)",
                    color: "#c92a2a",
                    fontSize: "0.84rem",
                  }}
                >
                  {modalError}
                </div>
              )}

              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "var(--color-bg)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.84rem",
                  lineHeight: 1.5,
                }}
              >
                <div>Customer: <strong>{activeOrderToShip.customerName}</strong></div>
                <div>Destination: <strong>{activeOrderToShip.shippingAddress}</strong></div>
                <div>Total Package Units: <strong>{activeOrderToShip.totalItems} items</strong></div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Select Logistics Carrier Partner
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.88rem",
                    outline: "none",
                    backgroundColor: "#FFF",
                  }}
                >
                  <option value="Delhivery Surface">Delhivery Surface (Eco Logistics)</option>
                  <option value="India Post Speed Post">India Post Speed Post (Rural & Gaushala Network)</option>
                  <option value="Blue Dart Express">Blue Dart Express (Air Cargo)</option>
                  <option value="Sandbox Carrier">Sandbox / Manual Self-Fulfillment</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                    Tracking AWB Number
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.85rem",
                      fontFamily: "monospace",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                    Gross Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={packageWeight}
                    onChange={(e) => setPackageWeight(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.88rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Packaging & Fragility Notes
                </label>
                <textarea
                  rows={2}
                  value={shipmentNotes}
                  onChange={(e) => setShipmentNotes(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.85rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Button variant="outline" type="button" onClick={() => setActiveOrderToShip(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isCreatingShipment}>
                  Issue Tracking & Create Parcel
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
