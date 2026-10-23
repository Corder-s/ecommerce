"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Button } from "@/components/ui/Button";
import {
  fetchProductById,
  updateProduct,
  fetchCategories,
  ProductCategory,
  ProductStatus,
  SellerProduct,
} from "@/lib/sellerApi";
import {
  Package,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Save,
} from "lucide-react";

export default function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  return (
    <React.Suspense
      fallback={
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Loading product details...
        </div>
      }
    >
      <EditProductWrapper params={params} />
    </React.Suspense>
  );
}

function EditProductWrapper({ params }: { params: Promise<{ productId: string }> }) {
  const unwrappedParams = use(params);
  return <EditProductContent productId={unwrappedParams.productId} />;
}

function EditProductContent({ productId }: { productId: string }) {
  const router = useRouter();
  const { currentRole, activeTenantId } = useAuth();
  const isAuthorized = ["STORE_OWNER", "STORE_MANAGER"].includes(currentRole);

  const [product, setProduct] = useState<SellerProduct | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [compareAtPrice, setCompareAtPrice] = useState<string>("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState<string>("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductStatus>("PUBLISHED");

  useEffect(() => {
    Promise.all([
      fetchCategories(activeTenantId || undefined),
      fetchProductById(productId, activeTenantId || undefined),
    ])
      .then(([cats, prod]) => {
        setCategories(cats);
        setProduct(prod);
        setName(prod.name);
        setSlug(prod.slug);
        setDescription(prod.description || "");
        setPrice(prod.price.toString());
        setCompareAtPrice(prod.compareAtPrice ? prod.compareAtPrice.toString() : "");
        setSku(prod.sku);
        setStock(prod.stock.toString());
        setCategoryId(prod.categoryId || (cats.length > 0 ? cats[0].id : ""));
        setStatus(prod.status);
      })
      .catch((err) => {
        setError(err.message || "Failed to load product details");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [productId, activeTenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError("Please specify a valid product price (>= 0).");
      return;
    }

    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setError("Stock quantity must be a non-negative integer.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProduct(
        productId,
        {
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || undefined,
          price: parsedPrice,
          compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
          sku: sku.trim().toUpperCase(),
          stock: parsedStock,
          categoryId: categoryId || undefined,
          status,
        },
        activeTenantId || undefined
      );

      setSuccess(true);
      setTimeout(() => {
        router.push("/seller/products");
      }, 900);
    } catch (err: any) {
      setError(err.message || "Failed to update product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <AppShell title="Access Denied" breadcrumbs={[{ label: "Seller" }, { label: "Products" }, { label: "Edit" }]}>
        <AccessDenied requiredRole="STORE_OWNER or STORE_MANAGER" />
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell title="Loading Product..." breadcrumbs={[{ label: "Seller" }, { label: "Products" }]}>
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Loading product information...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Edit Product: ${product?.name || "Product"}`}
      breadcrumbs={[
        { label: "Seller", href: "/seller/dashboard" },
        { label: "Products", href: "/seller/products" },
        { label: "Edit Product" },
      ]}
    >
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        {/* Navigation & Title */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Link
            href="/seller/products"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.85rem",
              color: "var(--color-primary)",
              textDecoration: "none",
              marginBottom: "0.5rem",
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} /> Back to Products
          </Link>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--color-text-main)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Edit Product Listing
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Update pricing, stock availability, category assignment, and product description.
          </p>
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

        {success && (
          <div
            style={{
              marginBottom: "1.25rem",
              padding: "0.85rem 1rem",
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
            <span>Product updated successfully! Returning to catalog...</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Card 1: Core Details */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              padding: "1.5rem",
              marginBottom: "1.25rem",
            }}
          >
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "1rem" }}>
              General Information
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Product Title *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
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
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.85rem",
                      outline: "none",
                      backgroundColor: "#FFF",
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Product Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.88rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Pricing & Inventory */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              padding: "1.5rem",
              marginBottom: "1.25rem",
            }}
          >
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "1rem" }}>
              Pricing & Inventory
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Selling Price (₹ INR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Compare At Price (MRP ₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  SKU Code *
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.9rem",
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Total Stock Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
                {product && (
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                    Currently {product.reservedStock} reserved by active customer carts.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Publishing Status */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              padding: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "1rem" }}>
              Visibility & Publishing Status
            </h3>

            <div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                style={{
                  width: "100%",
                  maxWidth: "260px",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.85rem",
                  outline: "none",
                  backgroundColor: "#FFF",
                }}
              >
                <option value="PUBLISHED">Published (Visible in Storefront)</option>
                <option value="DRAFT">Draft (Hidden from Storefront)</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <Link href="/seller/products" style={{ textDecoration: "none" }}>
              <Button variant="outline" type="button" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              <Save size={14} style={{ marginRight: "0.35rem" }} />
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
