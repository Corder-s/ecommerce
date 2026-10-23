"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import {
  Package,
  Layers,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
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

interface CategoryListingContentProps {
  slug: string;
  categorySlug: string;
}

function CategoryListingContent({ slug, categorySlug }: CategoryListingContentProps) {
  const [store, setStore] = useState<PublicStore | null>(null);
  const [categories, setCategories] = useState<PublicStoreCategory[]>([]);
  const [category, setCategory] = useState<PublicStoreCategory | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [storeData, catData] = await Promise.all([
          getPublicStore(slug),
          getPublicStoreCategories(slug),
        ]);

        if (!isMounted) return;
        setStore(storeData);
        setCategories(catData.data || []);

        const matchedCat = catData.data?.find(
          (c) => c.slug === categorySlug || c.id === categorySlug,
        );
        setCategory(
          matchedCat || {
            id: categorySlug,
            name: categorySlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            slug: categorySlug,
          },
        );

        const prodsRes = await getPublicStoreProducts(slug, {
          categoryId: matchedCat?.id || categorySlug,
          limit: 24,
        });

        if (!isMounted) return;
        setProducts(prodsRes.data || []);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to load category products.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [slug, categorySlug]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
        <div style={{ height: "100px", borderBottom: "1px solid var(--color-border)", backgroundColor: "#FFFFFF" }} />
        <div className="container" style={{ padding: "3rem 1.5rem" }}>
          <Skeleton width="40%" height="32px" style={{ marginBottom: "1rem" }} />
          <Skeleton width="60%" height="20px" style={{ marginBottom: "3rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.75rem" }}>
            <Skeleton height="320px" />
            <Skeleton height="320px" />
            <Skeleton height="320px" />
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
          <AlertTriangle size={36} color="#DC2626" style={{ margin: "0 auto 1.25rem" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "0.5rem" }}>
            Category Unavailable
          </h2>
          <p style={{ fontSize: "0.92rem", color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: "2rem" }}>
            {error || "The requested category could not be found."}
          </p>
          <Link href={`/store/${slug}/products`}>
            <Button variant="primary" size="md">
              Browse All Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
      <StorefrontHeader
        store={store}
        categories={categories}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        storeSlug={store.storeSlug}
      />

      {/* Category Banner */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid var(--color-border)",
          padding: "2.5rem 0 2rem",
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
              marginBottom: "1rem",
            }}
          >
            <Link
              href={`/store/${slug}`}
              style={{ color: "inherit", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
            >
              {store.businessName}
            </Link>
            <span>/</span>
            <Link
              href={`/store/${slug}/products`}
              style={{ color: "inherit", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
            >
              Categories
            </Link>
            <span>/</span>
            <span style={{ color: "var(--color-text-main)", fontWeight: 600 }}>{category?.name}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Layers size={22} />
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.02em" }}>
              {category?.name}
            </h1>
          </div>

          {category?.description && (
            <p style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)", maxWidth: "600px", lineHeight: 1.5 }}>
              {category.description}
            </p>
          )}
        </div>
      </div>

      {/* Product Listing */}
      <div className="container" style={{ padding: "3rem 1.5rem 5rem", flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.85rem",
            color: "var(--color-text-secondary)",
            marginBottom: "2rem",
          }}
        >
          <div>
            Showing <strong style={{ color: "var(--color-text-main)" }}>{products.length}</strong> items in this category
          </div>

          <Link href={`/store/${slug}/products`}>
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--color-primary)",
                cursor: "pointer",
              }}
            >
              View All Store Products →
            </span>
          </Link>
        </div>

        {products.length === 0 ? (
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-xl)",
              padding: "4rem 2rem",
              textAlign: "center",
              border: "1px dashed var(--color-border)",
              maxWidth: "540px",
              margin: "2rem auto",
            }}
          >
            <Package size={36} color="var(--color-text-secondary)" style={{ margin: "0 auto 1.25rem" }} />
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "0.5rem" }}>
              No Products in this Category
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: "1.75rem" }}>
              The artisans have not listed any items under &ldquo;{category?.name}&rdquo; yet.
            </p>
            <Link href={`/store/${slug}/products`}>
              <Button variant="primary" size="md">
                Browse Other Products
              </Button>
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1.75rem",
            }}
          >
            {products.map((product) => (
              <StoreProductCard
                key={product.id}
                product={product}
                storeSlug={slug}
                onAddToCartSuccess={() => setIsCartOpen(true)}
              />
            ))}
          </div>
        )}
      </div>

      <StorefrontFooter store={store} categories={categories} />
    </div>
  );
}

export default function CategoryListingPage({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Loading category collection...
        </div>
      }
    >
      <CategoryListingWrapper params={params} />
    </Suspense>
  );
}

function CategoryListingWrapper({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}) {
  const unwrappedParams = use(params);
  return (
    <CategoryListingContent
      slug={unwrappedParams.slug}
      categorySlug={unwrappedParams.categorySlug}
    />
  );
}
