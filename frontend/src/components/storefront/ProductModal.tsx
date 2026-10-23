"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, Star, Heart, ShoppingBag, Plus, Minus, MapPin, Sparkles } from "lucide-react";
import { Product } from "@/types/store";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { addItem, wishlist, toggleWishlist } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const isWishlisted = wishlist.includes(product.id);

  const handleAddToCart = () => {
    addItem(product, quantity);
    toast({
      type: "success",
      title: "Added to Basket",
      message: `${quantity}x ${product.name} added.`,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(32, 35, 60, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
      onClick={onClose}
    >
      <div
        className="card-elevated animate-scale-in"
        style={{
          width: "100%",
          maxWidth: "860px",
          maxHeight: "90vh",
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 1.15fr",
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            zIndex: 10,
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
          }}
        >
          <X size={20} />
        </button>

        {/* Left Column: Product Photography */}
        <div
          style={{
            position: "relative",
            backgroundColor: "#F9FAFE",
            minHeight: "380px",
            height: "100%",
          }}
        >
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            style={{ objectFit: "cover" }}
          />
        </div>

        {/* Right Column: Information & Controls */}
        <div
          style={{
            padding: "2rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem",
          }}
        >
          {/* Gaushala Origin */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: "var(--color-primary)", fontWeight: 600 }}>
            <MapPin size={15} />
            <span>{product.artisan.gaushala} &bull; {product.artisan.location}</span>
          </div>

          {/* Title & Tagline */}
          <div>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--color-text-main)", lineHeight: 1.25, marginBottom: "0.3rem" }}>
              {product.name}
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--color-accent-orange)", fontWeight: 600 }}>
              {product.tagline}
            </p>
          </div>

          {/* Price & Rating */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--color-text-main)" }}>
                ₹{product.price}
              </span>
              {product.compareAtPrice && (
                <span style={{ fontSize: "1rem", textDecoration: "line-through", color: "var(--color-text-tertiary)" }}>
                  ₹{product.compareAtPrice}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <div style={{ display: "flex", color: "#FFB800" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#FFB800" />
                ))}
              </div>
              <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{product.rating}</span>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                ({product.reviewCount} reviews)
              </span>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--color-text-secondary)" }}>
            {product.description}
          </p>

          {/* Sacred Ingredients */}
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-main)", marginBottom: "0.5rem" }}>
              Sacred Vedic Ingredients
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {product.sacredIngredients.map((item, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.25rem 0.65rem",
                    borderRadius: "var(--radius-pill)",
                    backgroundColor: "var(--color-success-light)",
                    color: "var(--color-success)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={12} /> {item}
                </span>
              ))}
            </div>
          </div>

          {/* Artisan Credit Card */}
          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-surface-muted)",
              border: "1px solid var(--color-border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>Crafted by Hand:</div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                {product.artisan.name}
              </div>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
              Weight: <strong>{product.weight}</strong>
            </div>
          </div>

          {/* Quantity and Actions */}
          <div style={{ marginTop: "auto", display: "flex", gap: "1rem", alignItems: "center", paddingTop: "1rem" }}>
            {/* Quantity Stepper */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--color-border)",
                backgroundColor: "#FFFFFF",
                height: "46px",
              }}
            >
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                style={{
                  width: "38px",
                  height: "100%",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-text-secondary)",
                }}
              >
                <Minus size={16} />
              </button>
              <span style={{ width: "32px", textAlign: "center", fontWeight: 700, fontSize: "0.95rem" }}>
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                style={{
                  width: "38px",
                  height: "100%",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-text-secondary)",
                }}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Add Button */}
            <Button
              size="lg"
              variant="primary"
              style={{ flex: 1 }}
              leftIcon={<ShoppingBag size={18} />}
              onClick={handleAddToCart}
            >
              Add to Sacred Basket &bull; ₹{product.price * quantity}
            </Button>

            {/* Wishlist Toggle */}
            <button
              onClick={() => toggleWishlist(product.id)}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--color-border)",
                backgroundColor: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: isWishlisted ? "var(--color-accent-orange)" : "var(--color-text-secondary)",
              }}
            >
              <Heart size={20} fill={isWishlisted ? "var(--color-accent-orange)" : "none"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
