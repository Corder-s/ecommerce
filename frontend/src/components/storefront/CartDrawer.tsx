"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getPublicCart,
  updateCartItemQuantity,
  removeCartItem,
  CartSummary,
  CartItem,
} from "@/lib/storefrontApi";

import { useCart } from "@/context/CartContext";

interface CartDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  storeSlug?: string;
}

export function CartDrawer({ isOpen, onClose, storeSlug }: CartDrawerProps) {
  const { isCartOpen, closeCart } = useCart();
  const effectiveIsOpen = isOpen !== undefined ? isOpen : isCartOpen;
  const effectiveOnClose = onClose || closeCart;
  const effectiveSlug = storeSlug || "mitti-craft-studio";

  const [cart, setCart] = useState<CartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadCart = async () => {
    setIsLoading(true);
    try {
      const summary = await getPublicCart();
      setCart(summary);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveIsOpen) {
      loadCart();
    }
  }, [effectiveIsOpen]);

  const handleQuantity = async (item: CartItem, delta: number) => {
    const newQty = item.quantity + delta;
    await updateCartItemQuantity(item.id, newQty);
    await loadCart();
  };

  const handleRemove = async (itemId: string) => {
    await removeCartItem(itemId);
    await loadCart();
  };

  if (!effectiveIsOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={effectiveOnClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(18, 20, 38, 0.65)",
          backdropFilter: "blur(4px)",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Drawer Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "440px",
          height: "100%",
          backgroundColor: "#FFFFFF",
          boxShadow: "-8px 0 30px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          zIndex: 1001,
          animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShoppingBag size={20} style={{ color: "var(--color-primary)" }} />
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
              Your Sacred Cart
            </h2>
            {cart && cart.totalItemsCount > 0 && (
              <Badge variant="indigo" withDot={false}>
                {cart.totalItemsCount}
              </Badge>
            )}
          </div>

          <button
            onClick={effectiveOnClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              padding: "0.4rem",
              borderRadius: "var(--radius-sm)",
            }}
            title="Close Cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
          {!cart || cart.items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <Package size={48} style={{ color: "var(--color-text-secondary)", margin: "0 auto 1rem auto" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>Your Cart is Empty</h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem", margin: "0 0 1.5rem 0" }}>
                Add handmade cow dung diyas, authentic havan sticks, and herbal dhoop to proceed with your spiritual rituals.
              </p>
              <Button variant="primary" onClick={onClose}>
                Explore Creations
              </Button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: "1rem",
                    paddingBottom: "1rem",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      width: "68px",
                      height: "68px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--color-bg)",
                      position: "relative",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {item.image ? (
                      <Image src={item.image} alt={item.productName} fill style={{ objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Package size={24} style={{ color: "var(--color-primary)" }} />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "var(--color-text-main)", lineHeight: 1.3 }}>
                        {item.productName}
                      </h4>
                      <button
                        onClick={() => handleRemove(item.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--color-danger)",
                          cursor: "pointer",
                          padding: "0.2rem",
                        }}
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-primary)", marginTop: "0.25rem" }}>
                      ₹{item.price.toLocaleString("en-IN")}
                    </div>

                    {/* Quantity Selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.5rem" }}>
                      <button
                        onClick={() => handleQuantity(item, -1)}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--color-border)",
                          backgroundColor: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: "0.88rem", fontWeight: 700, minWidth: "18px", textAlign: "center" }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantity(item, 1)}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--color-border)",
                          backgroundColor: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Subtotal & Actions */}
        {cart && cart.items.length > 0 && (
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderTop: "1px solid var(--color-border)",
              backgroundColor: "var(--color-bg)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                Estimated Subtotal
              </span>
              <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-primary)" }}>
                ₹{cart.subtotal.toLocaleString("en-IN")}
              </span>
            </div>

            <p style={{ margin: "0 0 1rem 0", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
              Taxes and fragile packaging fees calculated at checkout.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <Link href={`/store/${effectiveSlug}/checkout`} onClick={effectiveOnClose} style={{ width: "100%" }}>
                <Button variant="primary" style={{ width: "100%" }} rightIcon={<ArrowRight size={16} />}>
                  Proceed to Checkout
                </Button>
              </Link>
              <Button variant="outline" onClick={effectiveOnClose} style={{ width: "100%" }}>
                Continue Shopping
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
