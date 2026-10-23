"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import {
  fetchProducts,
  fetchCategories,
  updateProduct,
  deleteProduct,
  SellerProduct,
  ProductCategory,
  ProductStatus,
} from "@/lib/sellerApi";
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowUpDown,
  Archive,
} from "lucide-react";

export default function SellerProductsPage() {
  const { currentRole, activeTenantId } = useAuth();
  const canManage = ["STORE_OWNER", "STORE_MANAGER"].includes(currentRole);
  const isAuthorized = ["STORE_OWNER", "STORE_MANAGER", "STORE_STAFF"].includes(currentRole);

  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion confirmation state
  const [deletingProduct, setDeletingProduct] = useState<SellerProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cats, prods] = await Promise.all([
        fetchCategories(activeTenantId || undefined),
        fetchProducts(
          {
            search: search.trim() || undefined,
            categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
            status: selectedStatus !== "ALL" ? (selectedStatus as ProductStatus) : undefined,
            page,
            limit,
          },
          activeTenantId || undefined
        ),
      ]);
      setCategories(cats);
      setProducts(prods.data);
      setTotal(prods.total);
    } catch (err: any) {
      setError(err.message || "Failed to load product catalog");
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategory, selectedStatus, page, activeTenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTogglePublish = async (product: SellerProduct) => {
    try {
      const nextStatus: ProductStatus = product.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
      const updated = await updateProduct(product.id, { status: nextStatus }, activeTenantId || undefined);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      alert(err.message || "Failed to update product status");
    }
  };

  const handleArchiveConfirm = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deletingProduct.id, activeTenantId || undefined);
      setDeletingProduct(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to archive product");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <AppShell title="Access Denied" breadcrumbs={[{ label: "Seller" }, { label: "Products" }]}>
        <AccessDenied requiredRole="STORE_OWNER, STORE_MANAGER, or STORE_STAFF" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Product Management"
      breadcrumbs={[
        { label: "Seller", href: "/seller/dashboard" },
        { label: "Products" },
      ]}
    >
      {/* Top Header & Action */}
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
            Product Catalog
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Manage listings, prices, SKU codes, and inventory levels across your store.
          </p>
        </div>

        {canManage && (
          <Link href="/seller/products/new" style={{ textDecoration: "none" }}>
            <Button variant="primary">
              <Plus size={16} style={{ marginRight: "0.4rem" }} />
              <span>Create Product</span>
            </Button>
          </Link>
        )}
      </div>

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
            flex: "1 1 240px",
            gap: "0.5rem",
          }}
        >
          <Search size={15} style={{ color: "var(--color-text-secondary)" }} />
          <input
            type="text"
            placeholder="Search by product name, SKU..."
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

        {/* Category Filter */}
        <div style={{ minWidth: "180px" }}>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-bg)",
              fontSize: "0.85rem",
              outline: "none",
            }}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.productCount})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ minWidth: "150px" }}>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-bg)",
              fontSize: "0.85rem",
              outline: "none",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Delete / Archive Confirmation Dialog */}
      {deletingProduct && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(224, 49, 49, 0.08)",
            border: "1px solid rgba(224, 49, 49, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={18} style={{ color: "#c92a2a" }} />
            <div>
              <strong style={{ fontSize: "0.9rem", color: "#c92a2a" }}>
                Archive Product &quot;{deletingProduct.name}&quot;?
              </strong>
              <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                This product will be archived and hidden from public customers.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingProduct(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleArchiveConfirm}
              isLoading={isDeleting}
            >
              Confirm Archive
            </Button>
          </div>
        </div>
      )}

      {/* Products Table Card */}
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
                  Product
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Category
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  SKU
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Price
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Stock Status
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Status
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    Loading product catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem 1rem" }}>
                    <EmptyState
                      icon={<Package size={28} />}
                      title="No products found"
                      description="No products match your current search or category filter. Try clearing your filters or create a new product listing."
                    />
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isLowStock = product.stock <= (product.lowStockThreshold || 10);
                  return (
                    <tr
                      key={product.id}
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      {/* Product Name & Slug */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 700, color: "var(--color-text-main)" }}>
                          {product.name}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                          /{product.slug}
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: "0.85rem 1rem", color: "var(--color-text-secondary)" }}>
                        {product.category?.name || "Uncategorized"}
                      </td>

                      {/* SKU */}
                      <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", fontSize: "0.82rem" }}>
                        {product.sku}
                      </td>

                      {/* Price */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "var(--color-text-main)" }}>
                          ₹{product.price.toLocaleString("en-IN")}
                        </div>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)", textDecoration: "line-through" }}>
                            ₹{product.compareAtPrice.toLocaleString("en-IN")}
                          </div>
                        )}
                      </td>

                      {/* Stock Details */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                          <span
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              color: isLowStock ? "var(--color-orange)" : "var(--color-success)",
                            }}
                          >
                            {product.stock} units
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                            ({product.reservedStock} reserved)
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        <Badge
                          variant={
                            product.status === "PUBLISHED"
                              ? "success"
                              : product.status === "DRAFT"
                              ? "muted"
                              : "danger"
                          }
                        >
                          {product.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                          {canManage && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTogglePublish(product)}
                                title={product.status === "PUBLISHED" ? "Unpublish listing" : "Publish listing"}
                              >
                                {product.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                              </Button>

                              <Link href={`/seller/products/${product.id}/edit`} style={{ textDecoration: "none" }}>
                                <Button variant="outline" size="sm" title="Edit product">
                                  <Edit size={13} />
                                </Button>
                              </Link>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingProduct(product)}
                                title="Archive product"
                                style={{ color: "#c92a2a" }}
                              >
                                <Archive size={13} />
                              </Button>
                            </>
                          )}
                          {!canManage && (
                            <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                              View only (Staff)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
    </AppShell>
  );
}
