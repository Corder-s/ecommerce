"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Heart, LayoutDashboard, Sparkles, Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";

export const StoreHeader: React.FC = () => {
  const { itemCount, openCart, wishlist } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Artisan Catalog", href: "/#catalog" },
    { name: "Sacred Gaushalas", href: "/#gaushalas" },
    { name: "Artisan Heritage", href: "/#story" },
    { name: "Vedic Impact", href: "/#impact" },
  ];

  return (
    <header
      className="glass-panel"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        borderBottom: "1px solid var(--color-border)",
        transition: "all var(--transition-base)",
      }}
    >
      <div
        className="container"
        style={{
          height: "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              boxShadow: "0 4px 14px var(--color-primary-glow)",
            }}
          >
            <Sparkles size={22} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "var(--color-text-main)",
                lineHeight: 1.15,
              }}
            >
              GauShilp<span style={{ color: "var(--color-primary)" }}>OS</span>
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--color-accent-orange)",
              }}
            >
              Sacred Vedic Handcrafted
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: "none",
            alignItems: "center",
            gap: "2rem",
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              style={{
                fontSize: "0.92rem",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                transition: "color var(--transition-fast)",
                position: "relative",
                padding: "0.25rem 0",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Right Action Icons & Dashboard Link */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Dashboard Entry Link */}
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.45rem 0.85rem",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--color-primary-subtle)",
              color: "var(--color-primary)",
              fontSize: "0.84rem",
              fontWeight: 600,
              transition: "all var(--transition-fast)",
              border: "1px solid rgba(91, 92, 226, 0.15)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-primary)";
              e.currentTarget.style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-primary-subtle)";
              e.currentTarget.style.color = "var(--color-primary)";
            }}
          >
            <LayoutDashboard size={15} />
            <span className="hidden-mobile">Seller OS</span>
          </Link>

          {/* Wishlist Pill */}
          <button
            onClick={() => {}}
            aria-label={`Wishlist (${wishlist.length})`}
            style={{
              position: "relative",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "1px solid var(--color-border)",
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: wishlist.length > 0 ? "var(--color-accent-orange)" : "var(--color-text-secondary)",
              transition: "all var(--transition-fast)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          >
            <Heart size={18} fill={wishlist.length > 0 ? "var(--color-accent-orange)" : "none"} />
            {wishlist.length > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  backgroundColor: "var(--color-accent-orange)",
                  color: "#FFFFFF",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Cart Button with Animated Badge */}
          <button
            onClick={openCart}
            aria-label={`Shopping cart with ${itemCount} items`}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.55rem 1rem",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--color-primary)",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.88rem",
              boxShadow: "0 4px 14px var(--color-primary-glow)",
              transition: "transform var(--transition-fast), background-color var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-primary-deep)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-primary)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <ShoppingBag size={18} />
            <span>Cart</span>
            <span
              style={{
                backgroundColor: "#FFFFFF",
                color: "var(--color-primary-deep)",
                fontSize: "0.74rem",
                fontWeight: 700,
                padding: "0.1rem 0.5rem",
                borderRadius: "var(--radius-pill)",
                minWidth: "20px",
                textAlign: "center",
                transition: "transform var(--transition-spring)",
              }}
            >
              {itemCount}
            </span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile navigation menu"
            className="mobile-nav-toggle"
            style={{
              display: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-main)",
              padding: "6px",
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div
          className="animate-fade-up"
          style={{
            padding: "1rem 1.5rem 1.5rem",
            backgroundColor: "#FFFFFF",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--color-text-main)",
                padding: "0.5rem 0",
              }}
            >
              {link.name}
            </Link>
          ))}
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-primary)",
              color: "#FFFFFF",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            Open Seller Dashboard
          </Link>
        </div>
      )}

      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-nav-toggle {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .mobile-nav-toggle {
            display: flex !important;
          }
          .hidden-mobile {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};
