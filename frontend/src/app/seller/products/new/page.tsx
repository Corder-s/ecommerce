"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Button } from "@/components/ui/Button";
import {
  createProduct,
  fetchCategories,
  ProductCategory,
  ProductStatus,
} from "@/lib/sellerApi";
import {
  Package,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";

export default function NewProductPage() {
  const router = useRouter();
  const { currentRole, activeTenantId } = useAuth();
  const isAuthorized = ["STORE_OWNER", "STORE_MANAGER"].includes(currentRole);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
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
  const [stock, setStock] = useState<string>("50");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductStatus>("PUBLISHED");
  const [selectedImage, setSelectedImage] = useState("/images/product_diyas.jpg");

  const sampleGalleryImages = [
    { label: "Vedic Cow Dung Diyas", url: "/images/product_diyas.jpg" },
    { label: "Herbal Dhoop Cups", url: "/images/product_dhoop.jpg" },
    { label: "Panchgavya Puja Kit", url: "/images/product_puja_kit.jpg" },
    { label: "Sacred Clay Statue", url: "/images/product_statue.jpg" },
    { label: "Artisan Craft Studio", url: "/images/hero_artisans_craft.jpg" },
  ];

  useEffect(() => {
    fetchCategories(activeTenantId || undefined).then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    });
  }, [activeTenantId]);

  // Auto-generate slug from name if empty
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === "") {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend validations matching backend contract
    if (!name.trim()) {
      setError("Product title is required.");
      return;
    }

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

    if (!sku.trim()) {
      setError("SKU (Stock Keeping Unit) identifier is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createProduct(
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
          images: [selectedImage],
        },
        activeTenantId || undefined
      );

      setSuccess(true);
      setTimeout(() => {
        router.push("/seller/products");
      }, 900);
    } catch (err: any) {
      setError(err.message || "Failed to create product listing. Please check inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <AppShell title="Access Denied" breadcrumbs={[{ label: "Seller" }, { label: "Products" }, { label: "New" }]}>
        <AccessDenied requiredRole="STORE_OWNER or STORE_MANAGER" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Create New Product"
      breadcrumbs={[
        { label: "Seller", href: "/seller/dashboard" },
        { label: "Products", href: "/seller/products" },
        { label: "New Product" },
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
            Create New Product Listing
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Add an authentic handcrafted item to your store catalogue with inventory and pricing details.
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
            <span>Product created successfully! Redirecting to catalog...</span>
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
                  placeholder="e.g. Handcrafted Vedic Cow Dung Diyas (Pack of 12)"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
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
                    placeholder="e.g. handcrafted-vedic-cow-dung-diyas"
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
                  Product Story & Ingredients
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe the artisan background, Panchgavya sacred ingredients, holy rituals, and benefits..."
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
                  placeholder="349.00"
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
                  placeholder="499.00"
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
                  placeholder="DIYA-12PK-VDC"
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
                  Initial Stock Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="50"
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
              </div>
            </div>
          </div>

          {/* Card 3: Product Imagery & Publishing Status */}
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
              Visual Asset & Status
            </h3>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.5rem" }}>
                Select Product Imagery Reference
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {sampleGalleryImages.map((img) => (
                  <div
                    key={img.url}
                    onClick={() => setSelectedImage(img.url)}
                    style={{
                      border: selectedImage === img.url ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.5rem",
                      cursor: "pointer",
                      backgroundColor: selectedImage === img.url ? "rgba(91, 92, 226, 0.05)" : "var(--color-bg)",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.25rem" }}>
                      {img.label}
                    </div>
                    <span style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                      {img.url.replace("/images/", "")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                Publishing Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                style={{
                  width: "100%",
                  maxWidth: "240px",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.85rem",
                  outline: "none",
                  backgroundColor: "#FFF",
                }}
              >
                <option value="PUBLISHED">Published (Visible in Storefront)</option>
                <option value="DRAFT">Draft (Save without publishing)</option>
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
              Create Product Listing
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
