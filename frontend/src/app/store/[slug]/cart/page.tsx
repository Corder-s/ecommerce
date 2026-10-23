"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Package,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  getPublicStore,
  getPublicStoreCategories,
  getPublicCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  CartSummary,
  CartItem,
  PublicStore,
  PublicStoreCategory,
} from "@/lib/storefrontApi";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";

interface CartPageContentProps {
  slug: string;
}

function CartPageContent({ slug }: CartPageContentProps) {
  const { toast } = useToast();
  const [store, setStore] = useState<PublicStore | null>(null);
  const [categories, setCategories] = useState<PublicStoreCategory[]>([]);
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [storeData, catData, cartData] = await Promise.all([
        getPublicStore(slug),
        getPublicStoreCategories(slug),
        getPublicCart(),
      ]);
      setStore(storeData);
      setCategories(catData.data || []);
      setCart(cartData);
    } catch (err: any) {
      setError(err.message || "Failed to load shopping cart.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug]);

  const handleQuantity = async (item: CartItem, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    setIsUpdatingId(item.id);
    try {
      await updateCartItemQuantity(item.id, newQty);
      const updated = await getPublicCart();
      setCart(updated);
      toast({
        type: "success",
        title: "Cart Updated",
        message: `${item.productName} quantity updated to ${newQty}.`,
      });
    } catch {
      toast({
        type: "error",
        title: "Update Failed",
        message: "Could not update item quantity.",
      });
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleRemove = async (itemId: string, itemName: string) => {
    setIsUpdatingId(itemId);
    try {
      await removeCartItem(itemId);
      const updated = await getPublicCart();
      setCart(updated);
      toast({
        type: "info",
        title: "Item Removed",
        message: `Removed ${itemName} from your cart.`,
      });
    } catch {
      toast({
        type: "error",
        title: "Removal Failed",
        message: "Could not remove item from cart.",
      });
    } finally {
      setIsUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
        <div style={{ height: "100px", borderBottom: "1px solid var(--color-border)", backgroundColor: "#FFFFFF" }} />
        <div className="container" style={{ padding: "4rem 1.5rem" }}>
          <Skeleton width="40%" height="36px" style={{ marginBottom: "2rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
            <Skeleton height="350px" />
            <Skeleton height="280px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
      {store && (
        <StorefrontHeader
          store={store}
          categories={categories}
          onOpenCart={() => setIsDrawerOpen(true)}
          cartItemCount={cart?.totalItemsCount ?? 0}
        />
      )}

      {store && (
        <CartDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          storeSlug={store.storeSlug}
        />
      )}

      {/* Breadcrumbs & Header */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid var(--color-border)",
          padding: "1.75rem 0",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.82rem",
              color: "var(--color-text-secondary)",
              marginBottom: "0.5rem",
            }}
          >
            <Link
              href={`/store/${slug}`}
              style={{ color: "inherit", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
            >
              {store?.businessName || "Store"}
            </Link>
            <span>/</span>
            <span style={{ color: "var(--color-text-main)", fontWeight: 600 }}>Sacred Basket</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShoppingBag size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.02em", margin: 0 }}>
                Shopping Cart
              </h1>
              <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                {cart?.totalItemsCount ?? 0} item{cart?.totalItemsCount === 1 ? "" : "s"} from {store?.businessName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Cart Content */}
      <div className="container" style={{ padding: "3rem 1.5rem 5rem", flex: 1 }}>
        {!cart || cart.items.length === 0 ? (
          /* Empty Cart State */
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-xl)",
              padding: "4.5rem 2rem",
              textAlign: "center",
              border: "1px dashed var(--color-border)",
              maxWidth: "560px",
              margin: "2rem auto",
              boxShadow: "0 4px 20px rgba(32, 35, 60, 0.04)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <Package size={32} />
            </div>

            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "0.5rem" }}>
              Your Sacred Basket is Empty
            </h2>

            <p style={{ fontSize: "0.92rem", color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: "2rem" }}>
              Explore our handmade cow dung diyas, herbal dhoop, and Vedic puja kits to empower rural Gaushalas.
            </p>

            <Link href={`/store/${slug}/products`}>
              <Button variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
                Explore Artisan Catalog
              </Button>
            </Link>
          </div>
        ) : (
          /* Active Cart with Items */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "2.5rem",
              alignItems: "flex-start",
            }}
          >
            {/* Cart Items List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--color-border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "1rem 1.5rem",
                    borderBottom: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-surface-muted)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                    Crafted Items ({cart.totalItemsCount})
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                    Prices verified from database
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {cart.items.map((item, idx) => {
                    const isMutating = isUpdatingId === item.id;
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: "1.5rem",
                          borderBottom: idx === cart.items.length - 1 ? "none" : "1px solid var(--color-border-subtle)",
                          display: "flex",
                          gap: "1.25rem",
                          alignItems: "center",
                          opacity: isMutating ? 0.5 : 1,
                          transition: "opacity 0.2s ease",
                        }}
                      >
                        {/* Thumbnail */}
                        <div
                          style={{
                            position: "relative",
                            width: "84px",
                            height: "84px",
                            borderRadius: "var(--radius-md)",
                            overflow: "hidden",
                            backgroundColor: "#F4F5FF",
                            border: "1px solid var(--color-border)",
                            flexShrink: 0,
                          }}
                        >
                          <Image
                            src={item.image || "/images/product_diyas.jpg"}
                            alt={item.productName}
                            fill
                            sizes="84px"
                            style={{ objectFit: "cover" }}
                          />
                        </div>

                        {/* Title & Price Details */}
                        <div style={{ flex: 1 }}>
                          <h3
                            style={{
                              fontSize: "1rem",
                              fontWeight: 700,
                              color: "var(--color-text-main)",
                              margin: "0 0 0.35rem 0",
                              lineHeight: 1.3,
                            }}
                          >
                            {item.productName}
                          </h3>

                          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.75rem" }}>
                            <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--color-text-main)" }}>
                              ₹{item.price.toLocaleString("en-IN")}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>each</span>
                          </div>

                          {/* Quantity Controls & Remove */}
                          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                border: "1.5px solid var(--color-border)",
                                borderRadius: "var(--radius-pill)",
                                backgroundColor: "#FFFFFF",
                                padding: "0.15rem 0.35rem",
                              }}
                            >
                              <button
                                type="button"
                                disabled={item.quantity <= 1 || isMutating}
                                onClick={() => handleQuantity(item, -1)}
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "50%",
                                  border: "none",
                                  background: "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: item.quantity <= 1 || isMutating ? "not-allowed" : "pointer",
                                  color: "var(--color-text-main)",
                                }}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={13} />
                              </button>

                              <span
                                style={{
                                  minWidth: "28px",
                                  textAlign: "center",
                                  fontSize: "0.88rem",
                                  fontWeight: 700,
                                  color: "var(--color-text-main)",
                                }}
                              >
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() => handleQuantity(item, 1)}
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "50%",
                                  border: "none",
                                  background: "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: isMutating ? "not-allowed" : "pointer",
                                  color: "var(--color-text-main)",
                                }}
                                aria-label="Increase quantity"
                              >
                                <Plus size={13} />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemove(item.id, item.productName)}
                              disabled={isMutating}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#DC2626",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                cursor: "pointer",
                              }}
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          </div>
                        </div>

                        {/* Item Total */}
                        <div style={{ textAlign: "right", alignSelf: "flex-start" }}>
                          <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-primary-deep)" }}>
                            ₹{item.subtotal.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Continue Shopping Link */}
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "0.5rem" }}>
                <Link href={`/store/${slug}/products`}>
                  <Button variant="secondary" size="md" leftIcon={<ArrowLeft size={16} />}>
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </div>

            {/* Order Summary Card */}
            <div>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--color-border)",
                  padding: "1.75rem",
                  boxShadow: "0 4px 16px rgba(32, 35, 60, 0.05)",
                  position: "sticky",
                  top: "100px",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "var(--color-text-main)",
                    marginBottom: "1.25rem",
                  }}
                >
                  Order Summary
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Items Subtotal</span>
                    <strong style={{ color: "var(--color-text-main)" }}>₹{cart.subtotal.toLocaleString("en-IN")}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Standard Delivery</span>
                    <span style={{ color: "var(--color-success)", fontWeight: 700 }}>FREE</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Taxes</span>
                    <span style={{ color: "var(--color-text-secondary)", fontSize: "0.82rem" }}>Included in price</span>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    paddingTop: "1rem",
                    marginBottom: "1.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                    Estimated Total
                  </span>
                  <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--color-primary-deep)" }}>
                    ₹{cart.subtotal.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Checkout CTA */}
                <Link href={`/store/${slug}/checkout`} style={{ width: "100%", textDecoration: "none" }}>
                  <Button variant="primary" size="lg" style={{ width: "100%" }} rightIcon={<ArrowRight size={18} />}>
                    Proceed to Checkout
                  </Button>
                </Link>

                {/* Trust Badges */}
                <div
                  style={{
                    marginTop: "1.5rem",
                    paddingTop: "1.25rem",
                    borderTop: "1px solid var(--color-border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                    fontSize: "0.78rem",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <ShieldCheck size={16} color="var(--color-accent-teal)" />
                    <span>Secure Encrypted Checkout</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Sparkles size={16} color="var(--color-accent-orange)" />
                    <span>Direct Gaushala & Rural Artisan Remittance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {store && <StorefrontFooter store={store} categories={categories} />}
    </div>
  );
}

export default function CartPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Loading shopping cart...
        </div>
      }
    >
      <CartPageWrapper params={params} />
    </Suspense>
  );
}

function CartPageWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <CartPageContent slug={unwrappedParams.slug} />;
}
