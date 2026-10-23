"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchProducts,
  updateProduct,
  SellerProduct,
} from "@/lib/sellerApi";
import {
  Boxes,
  Search,
  AlertTriangle,
  CheckCircle2,
  Edit,
  ArrowUpDown,
  Lock,
  Plus,
  Minus,
} from "lucide-react";

export default function SellerInventoryPage() {
  const { currentRole, activeTenantId } = useAuth();
  const isAuthorized = ["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"].includes(currentRole);
  const canUpdateStock = ["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"].includes(currentRole);

  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [search, setSearch] = useState("");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stock Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<SellerProduct | null>(null);
  const [newTotalStock, setNewTotalStock] = useState<string>("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [adjustModalError, setAdjustModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchProducts(
        {
          search: search.trim() || undefined,
          page,
          limit,
        },
        activeTenantId || undefined
      );

      let data = res.data;
      if (filterLowStockOnly) {
        data = data.filter((p) => p.stock <= (p.lowStockThreshold || 10));
      }
      setProducts(data);
      setTotal(filterLowStockOnly ? data.length : res.total);
    } catch (err: any) {
      setError(err.message || "Failed to load inventory levels.");
    } finally {
      setIsLoading(false);
    }
  }, [search, page, filterLowStockOnly, activeTenantId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const openAdjustModal = (product: SellerProduct) => {
    setAdjustingProduct(product);
    setNewTotalStock(product.stock.toString());
    setAdjustmentReason("Artisan warehouse physical restock audit");
    setAdjustModalError(null);
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    const parsed = parseInt(newTotalStock, 10);
    if (isNaN(parsed) || parsed < 0) {
      setAdjustModalError("Stock quantity cannot be negative.");
      return;
    }

    if (parsed < adjustingProduct.reservedStock) {
      setAdjustModalError(
        `Cannot reduce stock below active reserved quantity (${adjustingProduct.reservedStock} units). Existing orders require this stock.`
      );
      return;
    }

    setIsUpdating(true);
    setAdjustModalError(null);
    try {
      const updated = await updateProduct(
        adjustingProduct.id,
        { stock: parsed },
        activeTenantId || undefined
      );

      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSuccessToast(`Stock updated for "${adjustingProduct.name}" to ${parsed} units.`);
      setAdjustingProduct(null);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      setAdjustModalError(err.message || "Failed to update stock.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isAuthorized) {
    return (
      <AppShell title="Access Denied" breadcrumbs={[{ label: "Seller" }, { label: "Inventory" }]}>
        <AccessDenied requiredRole="STORE_OWNER, STORE_MANAGER, or STORE_STAFF" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Inventory Management"
      breadcrumbs={[
        { label: "Seller", href: "/seller/dashboard" },
        { label: "Inventory" },
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
            Inventory & Stock Control
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Real-time stock monitoring with atomic reservations and low-stock replenishment alerts.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--color-teal)",
              backgroundColor: "rgba(35, 185, 175, 0.1)",
              padding: "0.35rem 0.75rem",
              borderRadius: "var(--radius-pill)",
            }}
          >
            <Boxes size={14} /> Atomic Stock Reservation Active
          </span>
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

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "1rem",
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          marginBottom: "1.5rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "var(--color-bg)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border)",
            padding: "0.45rem 0.75rem",
            flex: "1 1 260px",
            maxWidth: "400px",
            gap: "0.5rem",
          }}
        >
          <Search size={15} style={{ color: "var(--color-text-secondary)" }} />
          <input
            type="text"
            placeholder="Search products by title or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "0.85rem",
              width: "100%",
            }}
          />
        </div>

        {/* Low Stock Toggle Button */}
        <Button
          variant={filterLowStockOnly ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setFilterLowStockOnly(!filterLowStockOnly);
            setPage(1);
          }}
        >
          <AlertTriangle size={14} style={{ marginRight: "0.35rem" }} />
          <span>Show Low Stock Only</span>
        </Button>
      </div>

      {/* Inventory Table Card */}
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
                  Product Listing
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  SKU Identifier
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Total On-Hand
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Reserved (Carts/Orders)
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Available to Sell
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Health Indicator
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    Loading stock levels...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem 1rem" }}>
                    <EmptyState
                      icon={<Boxes size={28} />}
                      title="No stock records found"
                      description="No items match your filter. Check that products are created in the catalog."
                    />
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const threshold = p.lowStockThreshold || 10;
                  const isLow = p.stock <= threshold;
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 700, color: "var(--color-text-main)" }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                          {p.category?.name || "Uncategorized"}
                        </div>
                      </td>

                      <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", fontSize: "0.82rem" }}>
                        {p.sku}
                      </td>

                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 700, color: "var(--color-text-main)" }}>
                        {p.stock}
                      </td>

                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", color: "var(--color-orange)", fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", justifyContent: "flex-end" }}>
                          <Lock size={12} /> {p.reservedStock}
                        </span>
                      </td>

                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 800, color: "var(--color-primary)" }}>
                        {p.availableStock}
                      </td>

                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        {isLow ? (
                          <Badge variant="orange">
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                              <AlertTriangle size={12} /> Low Stock (≤{threshold})
                            </span>
                          </Badge>
                        ) : (
                          <Badge variant="success">Healthy</Badge>
                        )}
                      </td>

                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        {canUpdateStock ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAdjustModal(p)}
                          >
                            <Edit size={13} style={{ marginRight: "0.35rem" }} />
                            <span>Adjust Stock</span>
                          </Button>
                        ) : (
                          <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                            Read only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
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

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <Modal
          isOpen={true}
          onClose={() => setAdjustingProduct(null)}
          title={`Adjust Inventory: ${adjustingProduct.name}`}
        >
          <form onSubmit={handleStockSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {adjustModalError && (
                <div
                  style={{
                    padding: "0.65rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(224, 49, 49, 0.08)",
                    color: "#c92a2a",
                    fontSize: "0.84rem",
                  }}
                >
                  {adjustModalError}
                </div>
              )}

              {/* Product Info Box */}
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "var(--color-bg)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.84rem",
                  lineHeight: 1.6,
                }}
              >
                <div>SKU: <strong>{adjustingProduct.sku}</strong></div>
                <div>Current Total: <strong>{adjustingProduct.stock} units</strong></div>
                <div>Reserved: <strong style={{ color: "var(--color-orange)" }}>{adjustingProduct.reservedStock} units</strong></div>
                <div>Available to Sell: <strong style={{ color: "var(--color-primary)" }}>{adjustingProduct.availableStock} units</strong></div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  New Total Stock On-Hand *
                </label>
                <input
                  type="number"
                  min={adjustingProduct.reservedStock}
                  value={newTotalStock}
                  onChange={(e) => setNewTotalStock(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "0.74rem", color: "var(--color-text-secondary)", marginTop: "0.25rem", display: "block" }}>
                  Must be at least {adjustingProduct.reservedStock} to satisfy outstanding customer orders.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received new shipment from Vrindavan artisan cluster"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Button variant="outline" type="button" onClick={() => setAdjustingProduct(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isUpdating}>
                  Apply Stock Update
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
