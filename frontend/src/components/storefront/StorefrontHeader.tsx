"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Store as StoreIcon,
  Layers,
  Info,
} from "lucide-react";
import { PublicStore, PublicStoreCategory, getPublicCart } from "@/lib/storefrontApi";
import { useCart } from "@/context/CartContext";

interface StorefrontHeaderProps {
  store: PublicStore;
  categories?: PublicStoreCategory[];
  onOpenCart: () => void;
  cartItemCount?: number;
}

export function StorefrontHeader({
  store,
  categories = [],
  onOpenCart,
  cartItemCount: propCartCount,
}: StorefrontHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { wishlist } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(propCartCount ?? 0);
  const [userIsLoggedIn, setUserIsLoggedIn] = useState(false);

  // Sync cart count
  useEffect(() => {
    if (propCartCount !== undefined) {
      setCartCount(propCartCount);
      return;
    }
    const fetchCart = async () => {
      try {
        const summary = await getPublicCart();
        setCartCount(summary.totalItemsCount);
      } catch {
        // Fallback
      }
    };
    fetchCart();
  }, [propCartCount]);

  // Check login state
  useEffect(() => {
    try {
      const token = localStorage.getItem("gaushilp_auth_token");
      setUserIsLoggedIn(Boolean(token));
    } catch {
      setUserIsLoggedIn(false);
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/store/${store.storeSlug}/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { name: "Home", href: `/store/${store.storeSlug}` },
    { name: "All Products", href: `/store/${store.storeSlug}/products` },
  ];

  const isLinkActive = (href: string) => {
    if (href === `/store/${store.storeSlug}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        width: "100%",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-border)",
        boxShadow: "0 2px 12px rgba(91, 92, 226, 0.04)",
        transition: "all var(--transition-base)",
      }}
    >
      {/* Top micro-bar for Gaushala / Vedic Artisan branding */}
      <div
        style={{
          backgroundColor: "var(--color-primary-deep)",
          color: "#FFFFFF",
          fontSize: "0.75rem",
          fontWeight: 600,
          padding: "0.35rem 1rem",
          textAlign: "center",
          letterSpacing: "0.03em",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <Sparkles size={13} color="var(--color-accent-orange)" />
        <span>Vedic Artisan Storefront • 100% Desi Cow Dung Crafts & Pure Ayurvedic Samagri</span>
      </div>

      <div className="container">
        <div
          style={{
            height: "74px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
          }}
        >
          {/* Brand Logo & Name */}
          <Link
            href={`/store/${store.storeSlug}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textDecoration: "none",
              color: "inherit",
              flexShrink: 0,
            }}
          >
            {store.logoUrl ? (
              <div
                style={{
                  position: "relative",
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 2px 8px rgba(91, 92, 226, 0.12)",
                }}
              >
                <Image
                  src={store.logoUrl}
                  alt={store.businessName}
                  fill
                  sizes="44px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  boxShadow: "0 4px 12px var(--color-primary-glow)",
                }}
              >
                <StoreIcon size={22} />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "var(--color-text-main)",
                  lineHeight: 1.2,
                }}
              >
                {store.businessName}
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <span>Verified Artisan Gaushala</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: "none",
              alignItems: "center",
              gap: "1.75rem",
            }}
            className="desktop-nav"
          >
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize: "0.92rem",
                    fontWeight: active ? 700 : 500,
                    color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                    textDecoration: "none",
                    position: "relative",
                    padding: "0.4rem 0",
                    transition: "color var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.color = "var(--color-primary)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.color = "var(--color-text-secondary)";
                  }}
                >
                  {link.name}
                  {active && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: "2.5px",
                        backgroundColor: "var(--color-primary)",
                        borderRadius: "2px",
                      }}
                    />
                  )}
                </Link>
              );
            })}

            {/* Categories Dropdown */}
            {categories.length > 0 && (
              <div
                style={{ position: "relative" }}
                onMouseEnter={() => setCategoriesDropdownOpen(true)}
                onMouseLeave={() => setCategoriesDropdownOpen(false)}
              >
                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    background: "none",
                    border: "none",
                    fontSize: "0.92rem",
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                    padding: "0.4rem 0",
                  }}
                >
                  <span>Categories</span>
                  <ChevronDown
                    size={14}
                    style={{
                      transition: "transform var(--transition-fast)",
                      transform: categoriesDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>

                {categoriesDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "260px",
                      backgroundColor: "#FFFFFF",
                      borderRadius: "var(--radius-lg)",
                      boxShadow: "0 12px 32px rgba(32, 35, 60, 0.12)",
                      border: "1px solid var(--color-border)",
                      padding: "0.6rem",
                      zIndex: 50,
                      animation: "fadeIn 0.2s ease-in-out",
                    }}
                  >
                    <div
                      style={{
                        padding: "0.4rem 0.6rem 0.5rem",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--color-text-secondary)",
                        borderBottom: "1px solid var(--color-border-subtle)",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Store Catalog
                    </div>
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/store/${store.storeSlug}/categories/${cat.slug}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "var(--radius-md)",
                          textDecoration: "none",
                          fontSize: "0.85rem",
                          fontWeight: 500,
                          color: "var(--color-text-main)",
                          transition: "background-color var(--transition-fast)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--color-primary-subtle)";
                          e.currentTarget.style.color = "var(--color-primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--color-text-main)";
                        }}
                        onClick={() => setCategoriesDropdownOpen(false)}
                      >
                        <span>{cat.name}</span>
                        {cat._count?.products !== undefined && (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              backgroundColor: "var(--color-surface-muted)",
                              padding: "0.1rem 0.45rem",
                              borderRadius: "var(--radius-pill)",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            {cat._count.products}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Desktop Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: "none",
              position: "relative",
              width: "280px",
            }}
            className="desktop-search"
          >
            <input
              type="text"
              placeholder={`Search in ${store.businessName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 1rem 0.55rem 2.25rem",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface-muted)",
                fontSize: "0.85rem",
                color: "var(--color-text-main)",
                outline: "none",
                transition: "all var(--transition-fast)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.backgroundColor = "#FFFFFF";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(91, 92, 226, 0.12)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.backgroundColor = "var(--color-surface-muted)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-secondary)",
                pointerEvents: "none",
              }}
            />
          </form>

          {/* Header Action Icons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="mobile-search-btn"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "1px solid var(--color-border)",
                backgroundColor: isSearchOpen ? "var(--color-primary-subtle)" : "#FFFFFF",
                color: isSearchOpen ? "var(--color-primary)" : "var(--color-text-secondary)",
                cursor: "pointer",
              }}
              aria-label="Toggle Search"
            >
              <Search size={18} />
            </button>

            {/* Wishlist Icon */}
            <Link
              href="/account/wishlist"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "1px solid var(--color-border)",
                backgroundColor: "#FFFFFF",
                color: wishlist.length > 0 ? "var(--color-accent-orange)" : "var(--color-text-secondary)",
                textDecoration: "none",
                transition: "all var(--transition-fast)",
              }}
              aria-label={`Wishlist (${wishlist.length})`}
            >
              <Heart size={18} fill={wishlist.length > 0 ? "var(--color-accent-orange)" : "none"} />
              {wishlist.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    width: "18px",
                    height: "18px",
                    backgroundColor: "var(--color-accent-orange)",
                    color: "#FFFFFF",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #FFFFFF",
                  }}
                >
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Customer Account */}
            <Link
              href={userIsLoggedIn ? "/account" : "/login"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "1px solid var(--color-border)",
                backgroundColor: "#FFFFFF",
                color: "var(--color-text-secondary)",
                textDecoration: "none",
                transition: "all var(--transition-fast)",
              }}
              aria-label={userIsLoggedIn ? "Customer Account" : "Customer Login"}
              title={userIsLoggedIn ? "Customer Account" : "Sign In / Register"}
            >
              <User size={18} />
            </Link>

            {/* Shopping Cart Button */}
            <button
              type="button"
              onClick={onOpenCart}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.9rem",
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--color-primary)",
                color: "#FFFFFF",
                border: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: "0 4px 12px var(--color-primary-glow)",
                transition: "all var(--transition-fast)",
              }}
              aria-label={`Shopping Cart (${cartCount} items)`}
            >
              <ShoppingBag size={18} />
              <span className="cart-btn-label">Cart</span>
              <span
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "var(--color-primary)",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  padding: "0.1rem 0.45rem",
                  borderRadius: "var(--radius-pill)",
                  minWidth: "18px",
                  textAlign: "center",
                }}
              >
                {cartCount}
              </span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-hamburger-btn"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                backgroundColor: "#FFFFFF",
                color: "var(--color-text-main)",
                cursor: "pointer",
              }}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Search Row */}
        {isSearchOpen && (
          <div
            style={{
              padding: "0.75rem 0 1rem",
              borderTop: "1px solid var(--color-border-subtle)",
              animation: "fadeIn 0.2s ease-in-out",
            }}
          >
            <form onSubmit={handleSearchSubmit} style={{ position: "relative", width: "100%" }}>
              <input
                type="text"
                placeholder={`Search in ${store.businessName}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "0.65rem 1rem 0.65rem 2.5rem",
                  borderRadius: "var(--radius-pill)",
                  border: "1.5px solid var(--color-primary)",
                  backgroundColor: "#FFFFFF",
                  fontSize: "0.9rem",
                  color: "var(--color-text-main)",
                  outline: "none",
                }}
              />
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "0.95rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-primary)",
                }}
              />
            </form>
          </div>
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            top: "74px",
            zIndex: 99,
            backgroundColor: "rgba(18, 20, 38, 0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              width: "82%",
              maxWidth: "340px",
              height: "100%",
              boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-text-main)" }}>
                {store.businessName}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                {store.description?.slice(0, 80) || "Sacred Vedic Cow Dung Handcrafted Products"}...
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--color-text-secondary)",
                  marginBottom: "0.75rem",
                }}
              >
                Navigation
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <Link
                  href={`/store/${store.storeSlug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: "0.6rem 0.8rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isLinkActive(`/store/${store.storeSlug}`)
                      ? "var(--color-primary-subtle)"
                      : "transparent",
                    color: isLinkActive(`/store/${store.storeSlug}`)
                      ? "var(--color-primary)"
                      : "var(--color-text-main)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Storefront Home
                </Link>

                <Link
                  href={`/store/${store.storeSlug}/products`}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: "0.6rem 0.8rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isLinkActive(`/store/${store.storeSlug}/products`)
                      ? "var(--color-primary-subtle)"
                      : "transparent",
                    color: isLinkActive(`/store/${store.storeSlug}/products`)
                      ? "var(--color-primary)"
                      : "var(--color-text-main)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  All Products
                </Link>
              </div>
            </div>

            {categories.length > 0 && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.75rem",
                  }}
                >
                  Categories
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/store/${store.storeSlug}/categories/${cat.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.8rem",
                        borderRadius: "var(--radius-md)",
                        color: "var(--color-text-main)",
                        fontSize: "0.88rem",
                        textDecoration: "none",
                      }}
                    >
                      <span>{cat.name}</span>
                      {cat._count?.products !== undefined && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            backgroundColor: "var(--color-surface-muted)",
                            padding: "0.1rem 0.45rem",
                            borderRadius: "var(--radius-pill)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {cat._count.products}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: "auto", borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
              <Link
                href={userIsLoggedIn ? "/account" : "/login"}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-surface-muted)",
                  color: "var(--color-text-main)",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  textDecoration: "none",
                }}
              >
                <User size={18} color="var(--color-primary)" />
                <span>{userIsLoggedIn ? "Customer Dashboard" : "Sign In / Register"}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for desktop/mobile responsive header switching */}
      <style jsx global>{`
        @media (min-width: 900px) {
          .desktop-nav {
            display: flex !important;
          }
          .desktop-search {
            display: block !important;
          }
          .mobile-search-btn {
            display: none !important;
          }
          .mobile-hamburger-btn {
            display: none !important;
          }
        }
        @media (max-width: 899px) {
          .desktop-nav {
            display: none !important;
          }
          .desktop-search {
            display: none !important;
          }
          .cart-btn-label {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
