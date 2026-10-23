"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PRODUCTS } from "@/lib/artisanData";
import { Product } from "@/types/store";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import { StoreHeader } from "@/components/layout/StoreHeader";
import { StoreFooter } from "@/components/layout/StoreFooter";
import { HeroSection } from "@/components/storefront/HeroSection";
import { CategoryFilter } from "@/components/storefront/CategoryFilter";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductModal } from "@/components/storefront/ProductModal";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { CheckoutModal } from "@/components/storefront/CheckoutModal";
import { Sparkles, Heart, Leaf, ShieldCheck, ArrowRight, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";

function StorefrontContent() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts =
    selectedCategory === "all"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === selectedCategory);

  return (
    <>
      <StoreHeader />

      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <HeroSection />

        {/* Catalog Section */}
        <section id="catalog" style={{ padding: "4rem 0 5rem" }}>
          <div className="container">
            {/* Header & Filter Controls */}
            <div style={{ marginBottom: "2.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1.25rem", marginBottom: "1.5rem" }}>
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "var(--color-primary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <Sparkles size={14} color="var(--color-accent-orange)" />
                    Pure Indigenous Sacred Crafts
                  </div>
                  <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.02em" }}>
                    Handcrafted Artisan Collection
                  </h2>
                </div>

                <div style={{ fontSize: "0.92rem", color: "var(--color-text-secondary)" }}>
                  Showing <strong>{filteredProducts.length}</strong> authenticated Vedic products
                </div>
              </div>

              {/* Category Pills */}
              <CategoryFilter
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            {/* Products Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.75rem",
              }}
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={(p) => setSelectedProduct(p)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Artisan Heritage & Gaushala Story Section */}
        <section
          id="story"
          style={{
            padding: "5rem 0",
            backgroundColor: "#FFFFFF",
            borderTop: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="container">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4rem",
                alignItems: "center",
              }}
              className="story-grid"
            >
              {/* Left Column: Image with Decorative Elements */}
              <div style={{ position: "relative" }}>
                <div
                  className="card-elevated"
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "4 / 3",
                    borderRadius: "var(--radius-xl)",
                    overflow: "hidden",
                    boxShadow: "var(--shadow-xl)",
                  }}
                >
                  <Image
                    src="/images/hero_artisans.jpg"
                    alt="Rural artisan molding sacred items"
                    fill
                    sizes="(max-width: 768px) 100vw, 560px"
                    style={{ objectFit: "cover" }}
                  />
                </div>

                {/* Overlaid Impact Pill */}
                <div
                  className="glass-panel"
                  style={{
                    position: "absolute",
                    bottom: "-1.5rem",
                    right: "-1.5rem",
                    padding: "1.25rem 1.5rem",
                    borderRadius: "var(--radius-lg)",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    boxShadow: "var(--shadow-lg)",
                    maxWidth: "280px",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-primary)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Heart size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-text-main)" }}>
                      100% Direct
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                      Fair wages paid to rural women artisans without intermediaries
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Mission Text */}
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "var(--color-accent-orange)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "0.75rem",
                  }}
                >
                  <Award size={15} />
                  Reviving Vedic Dignity
                </div>

                <h2
                  style={{
                    fontSize: "2.25rem",
                    fontWeight: 800,
                    lineHeight: 1.25,
                    color: "var(--color-text-main)",
                    marginBottom: "1.25rem",
                  }}
                >
                  Connecting Sacred Gaushalas with Conscious Households
                </h2>

                <p
                  style={{
                    fontSize: "1rem",
                    lineHeight: 1.7,
                    color: "var(--color-text-secondary)",
                    marginBottom: "1.5rem",
                  }}
                >
                  For centuries, indigenous cow dung (Gomaya) was celebrated as a sacred purifying element in Indian culture.
                  GauShilp OS provides rural self-help groups and gaushala trusts with modern digital infrastructure
                  to market their handcrafted diyas, sambrani cups, and organic statues directly to devotees across the world.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.92rem", fontWeight: 600 }}>
                    <ShieldCheck size={18} color="var(--color-success)" />
                    <span>Pure indigenous Gir and Sahiwal cow ingredients only</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.92rem", fontWeight: 600 }}>
                    <Leaf size={18} color="var(--color-accent-teal)" />
                    <span>Completely biodegradable & enriched with soil nutrients</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.92rem", fontWeight: 600 }}>
                    <Sparkles size={18} color="var(--color-primary)" />
                    <span>Zero harmful chemical additives, synthetic colors, or charcoal</span>
                  </div>
                </div>

                <Link href="/dashboard">
                  <Button size="lg" variant="primary" rightIcon={<ArrowRight size={18} />}>
                    Join as a Gaushala Partner
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modals & Slide-ins */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <CartDrawer />
      <CheckoutModal />

      <StoreFooter />

      <style jsx>{`
        @media (max-width: 900px) {
          .story-grid {
            grid-template-columns: 1fr !important;
            gap: 3rem !important;
          }
        }
      `}</style>
    </>
  );
}

export default function HomePage() {
  return (
    <ToastProvider>
      <CartProvider>
        <StorefrontContent />
      </CartProvider>
    </ToastProvider>
  );
}
