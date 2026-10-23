"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Eye, Check, AlertCircle } from "lucide-react";
import { PublicProduct, addToCart } from "@/lib/storefrontApi";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";

interface StoreProductCardProps {
  product: PublicProduct;
  storeSlug: string;
  onAddToCartSuccess?: () => void;
}

export function StoreProductCard({
  product,
  storeSlug,
  onAddToCartSuccess,
}: StoreProductCardProps) {
  const { wishlist, toggleWishlist, addItem } = useCart();
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const isWishlisted = wishlist.includes(product.id);
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const isLowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 10;

  // Image source with fallback
  const imageSrc =
    product.images?.[0] ||
    (product.category?.slug?.includes("diya")
      ? "/images/product_diyas.jpg"
      : product.category?.slug?.includes("dhoop")
      ? "/images/product_dhoop.jpg"
      : product.category?.slug?.includes("statue")
      ? "/images/product_statue.jpg"
      : product.category?.slug?.includes("kit")
      ? "/images/product_puja_kit.jpg"
      : "/images/hero_artisans.jpg");

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
    toast({
      type: isWishlisted ? "info" : "success",
      title: isWishlisted ? "Removed from Wishlist" : "Saved to Wishlist",
      message: product.name,
    });
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || isAdding) return;

    setIsAdding(true);
    try {
      await addToCart(product.id, 1, storeSlug);

      // Also sync with CartContext for instantaneous badge update
      const clientProduct: any = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        tagline: product.name,
        price: product.price,
        description: product.description || "",
        category: (product.category?.slug as any) || "diyas",
        images: product.images?.length > 0 ? product.images : [imageSrc],
        inStock: !isOutOfStock,
        stockCount: product.stock ?? 10,
        rating: 4.9,
        reviewCount: 38,
        artisan: {
          name: "Vedic Artisan",
          location: "Vrindavan, UP",
          gaushala: product.store?.businessName || "Sacred Gaushala",
        },
        sacredIngredients: ["Desi Cow Dung", "Natural Herbs"],
        weight: "250g",
      };
      addItem(clientProduct, 1);

      toast({
        type: "success",
        title: "Added to Sacred Basket",
        message: `${product.name} has been added.`,
      });

      onAddToCartSuccess?.();
    } catch {
      toast({
        type: "error",
        title: "Failed to Add to Cart",
        message: "Please try again.",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className="card-elevated"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--color-border)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: isHovered
          ? "0 12px 28px rgba(91, 92, 226, 0.12)"
          : "0 2px 8px rgba(32, 35, 60, 0.04)",
        borderColor: isHovered ? "rgba(91, 92, 226, 0.3)" : "var(--color-border)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Container */}
      <Link
        href={`/store/${storeSlug}/products/${product.slug}`}
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "90%",
          overflow: "hidden",
          backgroundColor: "#F9FAFE",
          display: "block",
        }}
      >
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{
            objectFit: "cover",
            transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            transform: isHovered ? "scale(1.06)" : "scale(1)",
          }}
        />

        {/* Top Badges */}
        <div
          style={{
            position: "absolute",
            top: "0.75rem",
            left: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
            zIndex: 2,
          }}
        >
          {product.category?.name && (
            <span
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.94)",
                color: "var(--color-primary-deep)",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "0.2rem 0.6rem",
                borderRadius: "var(--radius-pill)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                border: "1px solid rgba(228, 230, 244, 0.8)",
                backdropFilter: "blur(4px)",
              }}
            >
              {product.category.name}
            </span>
          )}

          {isOutOfStock ? (
            <span
              style={{
                backgroundColor: "rgba(220, 38, 38, 0.9)",
                color: "#FFFFFF",
                fontSize: "0.68rem",
                fontWeight: 700,
                padding: "0.2rem 0.55rem",
                borderRadius: "var(--radius-pill)",
              }}
            >
              Out of Stock
            </span>
          ) : isLowStock ? (
            <span
              style={{
                backgroundColor: "rgba(255, 156, 67, 0.95)",
                color: "#FFFFFF",
                fontSize: "0.68rem",
                fontWeight: 700,
                padding: "0.2rem 0.55rem",
                borderRadius: "var(--radius-pill)",
              }}
            >
              Only {product.stock} left
            </span>
          ) : null}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlistClick}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(228, 230, 244, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: isWishlisted ? "var(--color-accent-orange)" : "var(--color-text-secondary)",
            transition: "transform 0.2s ease, color 0.2s ease",
            zIndex: 3,
            transform: isWishlisted ? "scale(1.08)" : "scale(1)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
        >
          <Heart size={17} fill={isWishlisted ? "var(--color-accent-orange)" : "none"} />
        </button>
      </Link>

      {/* Product Content */}
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", flex: 1 }}>
        <Link
          href={`/store/${storeSlug}/products/${product.slug}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              lineHeight: 1.35,
              marginBottom: "0.4rem",
              color: "var(--color-text-main)",
              transition: "color var(--transition-fast)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-main)")}
          >
            {product.name}
          </h3>
        </Link>

        {product.description && (
          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--color-text-secondary)",
              lineHeight: 1.45,
              marginBottom: "1rem",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.description}
          </p>
        )}

        {/* Price & Action Row */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "0.85rem",
            borderTop: "1px solid var(--color-border-subtle)",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "var(--color-text-main)",
                letterSpacing: "-0.02em",
              }}
            >
              ₹{product.price.toLocaleString("en-IN")}
            </span>
            <span
              style={{
                display: "block",
                fontSize: "0.68rem",
                color: "var(--color-text-secondary)",
              }}
            >
              Inclusive of taxes
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.4rem" }}>
            <Link href={`/store/${storeSlug}/products/${product.slug}`}>
              <Button
                size="sm"
                variant="secondary"
                aria-label={`View details of ${product.name}`}
                style={{ padding: "0.45rem 0.65rem" }}
              >
                <Eye size={15} />
              </Button>
            </Link>

            <Button
              size="sm"
              variant="primary"
              disabled={isOutOfStock || isAdding}
              onClick={handleAddToCart}
              leftIcon={<ShoppingBag size={15} />}
              style={{
                backgroundColor: isOutOfStock ? "#E4E6F4" : "var(--color-primary)",
                color: isOutOfStock ? "#747894" : "#FFFFFF",
                cursor: isOutOfStock ? "not-allowed" : "pointer",
              }}
            >
              {isOutOfStock ? "Sold Out" : isAdding ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
