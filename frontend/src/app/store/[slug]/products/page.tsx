"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Filter,
  X,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowLeft,
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

function ProductsCatalogueContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "ALL";
  const initialPage = Number(searchParams.get("page")) || 1;

  const [store, setStore] = useState<PublicStore | null>(null);
  const [categories, setCategories] = useState<PublicStoreCategory[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [meta, setMeta] = useState<{ total: number; page: number; limit: number; totalPages: number }>({
    total: 0,
    page: initialPage,
    limit: 12,
    totalPages: 1,
  });

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load store details & categories once
  useEffect(() => {
    let isMounted = true;
    async function loadMeta() {
      try {
        const storeData = await getPublicStore(slug);
        if (!isMounted) return;
        setStore(storeData);

        const catData = await getPublicStoreCategories(slug);
        if (!isMounted) return;
        setCategories(catData.data || []);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to load store.");
      }
    }
    loadMeta();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Load products whenever filters change
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getPublicStoreProducts(slug, {
          page: currentPage,
          limit: 12,
          categoryId: activeCategory !== "ALL" ? activeCategory : undefined,
          search: searchQuery.trim() || undefined,
        });

        if (!isMounted) return;

        let items = res.data || [];
        if (inStockOnly) {
          items = items.filter((p) => p.stock === undefined || p.stock > 0);
        }

        setProducts(items);
        setMeta(res.meta);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to load products.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, 250); // 250ms debounce for typing

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [slug, activeCategory, searchQuery, inStockOnly, currentPage]);

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setCurrentPage(1);
    updateUrl({ category: catId, page: 1 });
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    updateUrl({ search: val, page: 1 });
  };

  const clearAllFilters = () => {
    setActiveCategory("ALL");
    setSearchQuery("");
    setInStockOnly(false);
    setCurrentPage(1);
    router.push(`/store/${slug}/products`);
  };

  const updateUrl = (updates: { category?: string; search?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.category !== undefined) {
      if (updates.category === "ALL") params.delete("category");
      else params.set("category", updates.category);
    }
    if (updates.search !== undefined) {
      if (!updates.search.trim()) params.delete("search");
      else params.set("search", updates.search.trim());
    }
    if (updates.page !== undefined) {
      if (updates.page <= 1) params.delete("page");
      else params.set("page", String(updates.page));
    }
    router.replace(`/store/${slug}/products?${params.toString()}`);
  };

  if (!store && !isLoading && error) {
    return (
      <div style={{ minHeight: "100vh", padding: "4rem 2rem", textAlign: "center", backgroundColor: "var(--color-background)" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "1rem" }}>
          Store Not Found
        </h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "2rem" }}>{error}</p>
        <Link href="/">
          <Button variant="primary">Return Home</Button>
        </Link>
      </div>
    );
  }

  const hasActiveFilters = activeCategory !== "ALL" || searchQuery.trim() !== "" || inStockOnly;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
      {store && (
        <StorefrontHeader
          store={store}
          categories={categories}
          onOpenCart={() => setIsCartOpen(true)}
        />
      )}

      {store && (
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          storeSlug={store.storeSlug}
        />
      )}

      {/* Breadcrumb Header */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid var(--color-border)",
          padding: "1.5rem 0",
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
            <span style={{ color: "var(--color-text-main)", fontWeight: 600 }}>All Products</span>
          </div>

          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.02em" }}>
            Artisan Product Catalogue
          </h1>
        </div>
      </div>

      {/* Main Filter & Products Section */}
      <div className="container" style={{ padding: "2.5rem 1.5rem 5rem", flex: 1 }}>
        {/* Search & Filter Bar */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem 1.5rem",
            border: "1px solid var(--color-border)",
            marginBottom: "2rem",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            boxShadow: "0 2px 6px rgba(32, 35, 60, 0.03)",
          }}
        >
          {/* Search input */}
          <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
            <input
              type="text"
              placeholder="Search products by title, sku, or description..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 1rem 0.6rem 2.4rem",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface-muted)",
                fontSize: "0.88rem",
                outline: "none",
              }}
            />
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-secondary)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* In-stock toggle */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--color-text-main)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              style={{ accentColor: "var(--color-primary)", cursor: "pointer" }}
            />
            <span>In-Stock Only</span>
          </label>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#DC2626",
                background: "rgba(220, 38, 38, 0.08)",
                border: "none",
                padding: "0.45rem 0.85rem",
                borderRadius: "var(--radius-pill)",
                cursor: "pointer",
              }}
            >
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            paddingBottom: "1rem",
            marginBottom: "2rem",
            scrollbarWidth: "none",
          }}
        >
          <button
            type="button"
            onClick={() => handleCategoryChange("ALL")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              border: activeCategory === "ALL" ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
              backgroundColor: activeCategory === "ALL" ? "var(--color-primary)" : "#FFFFFF",
              color: activeCategory === "ALL" ? "#FFFFFF" : "var(--color-text-main)",
              transition: "all var(--transition-fast)",
            }}
          >
            All Categories
          </button>

          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id || activeCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                style={{
                  padding: "0.5rem 1rem",
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

        {/* Product Count & Active Status */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.85rem",
            color: "var(--color-text-secondary)",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            Showing <strong style={{ color: "var(--color-text-main)" }}>{products.length}</strong> of{" "}
            <strong style={{ color: "var(--color-text-main)" }}>{meta.total}</strong> products
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1.75rem",
            }}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "var(--radius-lg)",
                  padding: "1rem",
                  border: "1px solid var(--color-border)",
                }}
              >
                <Skeleton height="220px" style={{ marginBottom: "1rem", borderRadius: "var(--radius-md)" }} />
                <Skeleton width="40%" height="16px" style={{ marginBottom: "0.5rem" }} />
                <Skeleton width="90%" height="20px" style={{ marginBottom: "0.5rem" }} />
                <Skeleton width="60%" height="16px" style={{ marginBottom: "1rem" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Skeleton width="30%" height="24px" />
                  <Skeleton width="30%" height="32px" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
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
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
              }}
            >
              <Package size={28} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "0.5rem" }}>
              No Products Match Your Criteria
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: "1.75rem" }}>
              We could not find any products in {store?.businessName} matching your current filter settings.
            </p>
            <Button variant="primary" size="md" onClick={clearAllFilters}>
              Clear All Filters
            </Button>
          </div>
        ) : (
          /* Products Grid */
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

        {/* Pagination Controls */}
        {meta.totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.75rem",
              marginTop: "3.5rem",
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => {
                const prev = Math.max(1, currentPage - 1);
                setCurrentPage(prev);
                updateUrl({ page: prev });
              }}
              leftIcon={<ChevronLeft size={16} />}
            >
              Previous
            </Button>

            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-main)", padding: "0 0.5rem" }}>
              Page {meta.page} of {meta.totalPages}
            </span>

            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= meta.totalPages || isLoading}
              onClick={() => {
                const next = Math.min(meta.totalPages, currentPage + 1);
                setCurrentPage(next);
                updateUrl({ page: next });
              }}
              rightIcon={<ChevronRight size={16} />}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {store && <StorefrontFooter store={store} categories={categories} />}
    </div>
  );
}

export default function ProductsPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Loading product catalogue...
        </div>
      }
    >
      <ProductsPageWrapper params={params} />
    </Suspense>
  );
}

function ProductsPageWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading filters...</div>}>
      <ProductsCatalogueContent slug={unwrappedParams.slug} />
    </Suspense>
  );
}
