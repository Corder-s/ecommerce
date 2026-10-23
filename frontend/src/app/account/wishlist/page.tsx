"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/context/ToastContext";
import {
  Heart,
  ShoppingCart,
  Trash2,
  ExternalLink,
  Package,
  Sparkles,
  Store,
  Tag,
} from "lucide-react";
import {
  getCustomerWishlist,
  removeFromWishlist,
  addItemToCart,
  WishlistItem,
} from "@/lib/customerApi";

export default function CustomerWishlistPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadWishlist = async () => {
    setIsLoading(true);
    try {
      const data = await getCustomerWishlist();
      setItems(data.items || []);
    } catch {
      toast({ type: "error", title: "Failed to retrieve wishlist items" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleRemove = async (itemId: string, productName: string) => {
    setRemovingId(itemId);
    try {
      await removeFromWishlist(itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId && item.productId !== itemId));
      toast({ type: "success", title: `Removed "${productName}" from wishlist` });
    } catch {
      toast({ type: "error", title: "Failed to remove item from wishlist" });
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    if (!item.isPurchasable) {
      toast({ type: "error", title: "This product is currently unavailable for purchase." });
      return;
    }

    setAddingToCartId(item.id);
    try {
      await addItemToCart(item.productId, 1);
      toast({ type: "success", title: `Added "${item.product.name}" to your shopping cart! 🛒` });
    } catch {
      toast({ type: "error", title: "Failed to add item to cart. Please try again." });
    } finally {
      setAddingToCartId(null);
    }
  };

  return (
    <AppShell
      title="Wishlist"
      breadcrumbs={[
        { label: "GauShilp OS", href: "/" },
        { label: "My Account", href: "/account" },
        { label: "Wishlist" },
      ]}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.75rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
              Sacred Wishlist
            </h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.92rem", margin: "0.3rem 0 0 0" }}>
              Your curated collection of handcrafted Vedic creations and artisan essentials ({items.length} items)
            </p>
          </div>
        </div>

        {/* Wishlist Grid */}
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
            <Skeleton height="320px" />
            <Skeleton height="320px" />
            <Skeleton height="320px" />
          </div>
        ) : items.length === 0 ? (
          <Card variant="elevated" style={{ padding: "3.5rem" }}>
            <EmptyState
              icon={<Heart size={44} />}
              title="Your Wishlist is Empty"
              description="Save items you adore while exploring our curated marketplace of Indian artisans, gaushalas, and sacred handicrafts."
              action={
                <Link href="/">
                  <Button variant="primary" leftIcon={<Sparkles size={16} />}>
                    Explore Vedic Creations
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {items.map((item) => {
              const product = item.product;
              const isPurchasable = item.isPurchasable;

              return (
                <Card
                  key={item.id}
                  variant="elevated"
                  style={{
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderRadius: "var(--radius-lg)",
                    position: "relative",
                    overflow: "hidden",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div>
                    {/* Product Image Container */}
                    <div
                      style={{
                        width: "100%",
                        height: "220px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--color-bg)",
                        position: "relative",
                        overflow: "hidden",
                        marginBottom: "1rem",
                      }}
                    >
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          style={{
                            objectFit: "cover",
                            transition: "transform 0.4s ease",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Package size={36} style={{ color: "var(--color-primary)" }} />
                        </div>
                      )}

                      {/* Remove from Wishlist Floating Button */}
                      <button
                        onClick={() => handleRemove(item.id, product.name)}
                        disabled={removingId === item.id}
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          border: "1px solid rgba(0, 0, 0, 0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "var(--color-danger)",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                          transition: "all 0.2s ease",
                        }}
                        title="Remove from wishlist"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Availability Overlay Badge */}
                      {!isPurchasable && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "8px",
                            left: "8px",
                            backgroundColor: "rgba(32, 35, 60, 0.88)",
                            color: "#FFFFFF",
                            padding: "0.25rem 0.65rem",
                            borderRadius: "var(--radius-pill)",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                          }}
                        >
                          Currently Unavailable
                        </div>
                      )}
                    </div>

                    {/* Category & Store Meta */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--color-text-secondary)", marginBottom: "0.4rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Tag size={12} />
                        {product.category?.name || "Vedic Craft"}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Store size={12} />
                        {product.store?.businessName || "Artisan Studio"}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h3
                      style={{
                        margin: "0 0 0.5rem 0",
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: "var(--color-text-main)",
                        lineHeight: 1.35,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                      title={product.name}
                    >
                      {product.name}
                    </h3>

                    {/* Price */}
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginBottom: "1rem" }}>
                      <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-primary)" }}>
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </span>
                      {product.sku && (
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          SKU: {product.sku}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<ShoppingCart size={15} />}
                      onClick={() => handleAddToCart(item)}
                      isLoading={addingToCartId === item.id}
                      disabled={!isPurchasable || removingId === item.id}
                      style={{ flex: 1 }}
                    >
                      {isPurchasable ? "Add to Cart" : "Unavailable"}
                    </Button>
                    <Link href={`/store/${product.store?.storeSlug || "mitti-craft-studio"}`}>
                      <Button variant="outline" size="sm" title="View Artisan Store">
                        <ExternalLink size={14} />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
