"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Heart,
  Leaf,
  Layers,
  Store as StoreIcon,
  AlertTriangle,
  Package,
} from "lucide-react";
import {
  getPublicStore,
  getPublicStoreCategories,
  getPublicStoreProducts,
  PublicStore,
  PublicStoreCategory,
  PublicProduct,
} from "@/lib/storefrontApi";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";
import { StoreProductCard } from "@/components/storefront/StoreProductCard";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

function StorefrontHomeContent({ slug }: { slug: string }) {
  const [store, setStore] = useState<PublicStore | null>(null);
  const [categories, setCategories] = useState<PublicStoreCategory[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadStorefront() {
      setIsLoading(true);
      setError(null);
      try {
        const storeData = await getPublicStore(slug);
        if (!isMounted) return;
        setStore(storeData);

        const [catData, prodData] = await Promise.all([
          getPublicStoreCategories(slug),
          getPublicStoreProducts(slug, { limit: 8 }),
        ]);

        if (!isMounted) return;
        setCategories(catData.data || []);
        setProducts(prodData.data || []);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to load storefront");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStorefront();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
        <div style={{ height: "100px", borderBottom: "1px solid var(--color-border)", backgroundColor: "#FFFFFF" }} />
        <div className="container" style={{ padding: "4rem 1.5rem" }}>
          <Skeleton width="60%" height="48px" style={{ marginBottom: "1.5rem" }} />
          <Skeleton width="40%" height="24px" style={{ marginBottom: "3rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
            <Skeleton height="340px" />
            <Skeleton height="340px" />
            <Skeleton height="340px" />
            <Skeleton height="340px" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--color-background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            width: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: "var(--radius-xl)",
            padding: "3rem 2rem",
            textAlign: "center",
            boxShadow: "0 12px 36px rgba(32, 35, 60, 0.08)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "rgba(220, 38, 38, 0.1)",
              color: "#DC2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <AlertTriangle size={32} />
          </div>

          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "0.75rem" }}>
            Storefront Unavailable
          </h2>

          <p style={{ fontSize: "0.92rem", color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: "2rem" }}>
            {error || `The store "${slug}" is currently unpublished, suspended, or does not exist.`}
          </p>

          <Link href="/">
            <Button variant="primary" size="md">
              Return to GauShilp Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filter products by selected category tab
  const displayedProducts =
    selectedCategory === "ALL"
      ? products
      : products.filter(
          (p) => p.category.id === selectedCategory || p.category.slug === selectedCategory,
        );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-background)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Store Header */}
      <StorefrontHeader
        store={store}
        categories={categories}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        storeSlug={store.storeSlug}
      />

      {/* Hero Section */}
      <section
        style={{
          position: "relative",
          padding: "4rem 0 3.5rem",
          background: "linear-gradient(180deg, #FFFFFF 0%, #F4F5FF 100%)",
          borderBottom: "1px solid var(--color-border)",
          overflow: "hidden",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "3.5rem",
              alignItems: "center",
            }}
          >
            {/* Hero Copy */}
            <div>
              {/* Badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.4rem 0.9rem",
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: "var(--color-primary-subtle)",
                  border: "1px solid rgba(91, 92, 226, 0.2)",
                  color: "var(--color-primary)",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  marginBottom: "1.25rem",
                }}
              >
                <Sparkles size={15} color="var(--color-accent-orange)" />
                <span>Verified Gaushala Collective</span>
              </div>

              <h1
                style={{
                  fontSize: "clamp(2.2rem, 4vw, 3.4rem)",
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  color: "var(--color-text-main)",
                  marginBottom: "1.25rem",
                }}
              >
                Pure Traditions.{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Handmade
                </span>{" "}
                with Purpose.
              </h1>

              <p
                style={{
                  fontSize: "1.05rem",
                  lineHeight: 1.65,
                  color: "var(--color-text-secondary)",
                  marginBottom: "2rem",
                  maxWidth: "520px",
                }}
              >
                {store.description ||
                  "Discover traditional handmade products and support the artisans and indigenous Gaushalas behind them. Every purchase directly sustains rural self-help groups."}
              </p>

              {/* Call to Actions */}
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
                <Link href={`/store/${store.storeSlug}/products`}>
                  <Button size="lg" variant="primary" rightIcon={<ArrowRight size={18} />}>
                    Shop Collection
                  </Button>
                </Link>

                {categories.length > 0 && (
                  <a href="#categories" style={{ textDecoration: "none" }}>
                    <Button size="lg" variant="secondary" leftIcon={<Layers size={18} />}>
                      Explore Categories
                    </Button>
                  </a>
                )}
              </div>

              {/* Trust Indicators */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.75rem",
                  flexWrap: "wrap",
                  fontSize: "0.82rem",
                  color: "var(--color-text-secondary)",
                  fontWeight: 600,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Leaf size={16} color="var(--color-accent-teal)" />
                  <span>100% Biodegradable</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Heart size={16} color="var(--color-accent-orange)" />
                  <span>Rural Artisan Direct</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <ShieldCheck size={16} color="var(--color-primary)" />
                  <span>Authentic Vedic Quality</span>
                </div>
              </div>
            </div>

            {/* Hero Visual Presentation */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "380px",
                borderRadius: "var(--radius-xl)",
                overflow: "hidden",
                boxShadow: "0 20px 48px rgba(91, 92, 226, 0.16)",
                border: "1px solid var(--color-border)",
              }}
            >
              <Image
                src={store.bannerUrl || "/images/hero_artisans.jpg"}
                alt={store.businessName}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "cover" }}
              />

              {/* Floating artisan badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: "1.25rem",
                  left: "1.25rem",
                  right: "1.25rem",
                  backgroundColor: "rgba(255, 255, 255, 0.94)",
                  backdropFilter: "blur(8px)",
                  padding: "0.9rem 1.25rem",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(228, 230, 244, 0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-primary-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-primary)",
                    }}
                  >
                    <StoreIcon size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                      {store.businessName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                      {store.address ? store.address.slice(0, 36) + "..." : "Desi Cow Dung Products & Herbal Incense"}
                    </div>
                  </div>
                </div>

                <Link href={`/store/${store.storeSlug}/products`}>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    Browse <ArrowRight size={14} />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section
          id="categories"
          style={{
            padding: "4rem 0",
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="container">
            <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 2.5rem" }}>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--color-primary)",
                  display: "block",
                  marginBottom: "0.4rem",
                }}
              >
                Handmade Collections
              </span>
              <h2
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "var(--color-text-main)",
                  letterSpacing: "-0.02em",
                  marginBottom: "0.5rem",
                }}
              >
                Explore Sacred Categories
              </h2>
              <p style={{ fontSize: "0.92rem", color: "var(--color-text-secondary)" }}>
                Authentic, natural crafts created from indigenous cow dung and organic ayurvedic herbs.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/store/${store.storeSlug}/categories/${cat.slug}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    className="card-elevated"
                    style={{
                      padding: "1.75rem 1.5rem",
                      borderRadius: "var(--radius-lg)",
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.75rem",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.borderColor = "var(--color-primary)";
                      e.currentTarget.style.boxShadow = "0 10px 24px rgba(91, 92, 226, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "var(--color-border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        backgroundColor: "var(--color-primary-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-primary)",
                      }}
                    >
                      <Layers size={26} />
                    </div>

                    <div>
                      <h3
                        style={{
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          color: "var(--color-text-main)",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                          {cat.description}
                        </p>
                      )}
                    </div>

                    {cat._count?.products !== undefined && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--color-primary)",
                          backgroundColor: "rgba(91, 92, 226, 0.08)",
                          padding: "0.2rem 0.65rem",
                          borderRadius: "var(--radius-pill)",
                          marginTop: "auto",
                        }}
                      >
                        {cat._count.products} {cat._count.products === 1 ? "Product" : "Products"}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      <section
        style={{
          padding: "4rem 0",
          backgroundColor: "var(--color-background)",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "1.5rem",
              marginBottom: "2.5rem",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--color-primary)",
                  display: "block",
                  marginBottom: "0.4rem",
                }}
              >
                Artisan Catalogue
              </span>
              <h2
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "var(--color-text-main)",
                  letterSpacing: "-0.02em",
                }}
              >
                Featured Sacred Creations
              </h2>
            </div>

            <Link href={`/store/${store.storeSlug}/products`}>
              <Button variant="secondary" size="md" rightIcon={<ArrowRight size={16} />}>
                View All Products
              </Button>
            </Link>
          </div>

          {/* Filter Pills */}
          {categories.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "0.6rem",
                overflowX: "auto",
                paddingBottom: "1.25rem",
                marginBottom: "1.5rem",
                scrollbarWidth: "none",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                style={{
                  padding: "0.55rem 1.1rem",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: selectedCategory === "ALL" ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
                  backgroundColor: selectedCategory === "ALL" ? "var(--color-primary)" : "#FFFFFF",
                  color: selectedCategory === "ALL" ? "#FFFFFF" : "var(--color-text-main)",
                  transition: "all var(--transition-fast)",
                }}
              >
                All Products ({products.length})
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id || selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: "0.55rem 1.1rem",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: isSelected ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
                      backgroundColor: isSelected ? "var(--color-primary)" : "#FFFFFF",
                      color: isSelected ? "#FFFFFF" : "var(--color-text-main)",
                      transition: "all var(--transition-fast)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Products Grid */}
          {displayedProducts.length === 0 ? (
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "var(--radius-lg)",
                padding: "3.5rem 2rem",
                textAlign: "center",
                border: "1px dashed var(--color-border)",
              }}
            >
              <Package size={42} color="var(--color-text-secondary)" style={{ margin: "0 auto 1rem" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "0.4rem" }}>
                No Products Available in this Category
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.25rem" }}>
                Check back soon or explore our complete catalog.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setSelectedCategory("ALL")}>
                View All Categories
              </Button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "1.75rem",
              }}
            >
              {displayedProducts.map((product) => (
                <StoreProductCard
                  key={product.id}
                  product={product}
                  storeSlug={store.storeSlug}
                  onAddToCartSuccess={() => setIsCartOpen(true)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Store Footer */}
      <StorefrontFooter store={store} categories={categories} />
    </div>
  );
}

export default function StorefrontHomePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Loading storefront...
        </div>
      }
    >
      <StorefrontHomeWrapper params={params} />
    </Suspense>
  );
}

function StorefrontHomeWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <StorefrontHomeContent slug={unwrappedParams.slug} />;
}
