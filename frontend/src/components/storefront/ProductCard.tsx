"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Heart, Star, ShoppingBag, Eye, MapPin } from "lucide-react";
import { Product } from "@/types/store";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView }) => {
  const { addItem, wishlist, toggleWishlist } = useCart();
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const isWishlisted = wishlist.includes(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product, 1);
    toast({
      type: "success",
      title: "Added to Sacred Basket",
      message: `${product.name} has been added.`,
    });
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
    toast({
      type: isWishlisted ? "info" : "success",
      title: isWishlisted ? "Removed from Wishlist" : "Saved to Wishlist",
      message: product.name,
    });
  };

  return (
    <div
      className="card-elevated"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        cursor: "pointer",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
      }}
      onClick={() => onQuickView(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "100%", // 1:1 Aspect Ratio
          overflow: "hidden",
          backgroundColor: "#F9FAFE",
        }}
      >
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{
            objectFit: "cover",
            transition: "transform var(--transition-smooth)",
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
            gap: "0.4rem",
            zIndex: 2,
          }}
        >
          {product.badge && (
            <span
              style={{
                backgroundColor: "var(--color-primary)",
                color: "#FFFFFF",
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.25rem 0.65rem",
                borderRadius: "var(--radius-pill)",
                boxShadow: "0 2px 6px var(--color-primary-glow)",
              }}
            >
              {product.badge}
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(228, 230, 244, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: isWishlisted ? "var(--color-accent-orange)" : "var(--color-text-secondary)",
            transition: "transform var(--transition-fast), color var(--transition-fast)",
            zIndex: 3,
            transform: isWishlisted ? "scale(1.08)" : "scale(1)",
          }}
        >
          <Heart size={18} fill={isWishlisted ? "var(--color-accent-orange)" : "none"} />
        </button>

        {/* Quick View Overlay Button on Hover */}
        <div
          style={{
            position: "absolute",
            bottom: "0.75rem",
            left: "0.75rem",
            right: "0.75rem",
            zIndex: 3,
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "translateY(0)" : "translateY(8px)",
            transition: "all var(--transition-base)",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            style={{
              width: "100%",
              padding: "0.55rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(6px)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-main)",
              fontSize: "0.82rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Eye size={15} /> Quick View Details
          </button>
        </div>
      </div>

      {/* Product Content */}
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Artisan & Gaushala Location */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.75rem",
            color: "var(--color-text-secondary)",
            marginBottom: "0.4rem",
          }}
        >
          <MapPin size={13} color="var(--color-primary)" />
          <span style={{ fontWeight: 600 }}>{product.artisan.gaushala}</span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            lineHeight: 1.35,
            marginBottom: "0.4rem",
            color: "var(--color-text-main)",
          }}
        >
          {product.name}
        </h3>

        {/* Ratings */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", color: "#FFB800" }}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill="#FFB800" />
            ))}
          </div>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-main)" }}>
            {product.rating}
          </span>
          <span style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>
            ({product.reviewCount})
          </span>
        </div>

        {/* Sacred Ingredients Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1.1rem" }}>
          {product.sacredIngredients.slice(0, 2).map((ing, idx) => (
            <span
              key={idx}
              style={{
                fontSize: "0.7rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--color-surface-muted)",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              {ing}
            </span>
          ))}
        </div>

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
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.45rem" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text-main)" }}>
                ₹{product.price}
              </span>
              {product.compareAtPrice && (
                <span
                  style={{
                    fontSize: "0.86rem",
                    textDecoration: "line-through",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  ₹{product.compareAtPrice}
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--color-success)", fontWeight: 600 }}>
              Inclusive of all taxes
            </div>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={handleAddToCart}
            leftIcon={<ShoppingBag size={14} />}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};
