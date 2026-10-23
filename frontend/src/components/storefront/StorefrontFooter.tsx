"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  Heart,
  Leaf,
  Award,
} from "lucide-react";
import { PublicStore, PublicStoreCategory } from "@/lib/storefrontApi";

interface StorefrontFooterProps {
  store: PublicStore;
  categories?: PublicStoreCategory[];
}

export function StorefrontFooter({ store, categories = [] }: StorefrontFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        backgroundColor: "#181A2A",
        color: "#F4F5FF",
        borderTop: "1px solid rgba(228, 230, 244, 0.12)",
        marginTop: "auto",
      }}
    >
      {/* Trust & Artisan Commitment Banner */}
      <div
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "2.5rem 0",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "2rem",
            }}
          >
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(91, 92, 226, 0.15)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Leaf size={22} color="var(--color-accent-teal)" />
              </div>
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.25rem", color: "#FFFFFF" }}>
                  100% Biodegradable & Natural
                </h4>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  Crafted strictly from indigenous desi cow dung, organic herbs, and natural binder clays.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(255, 156, 67, 0.15)",
                  color: "var(--color-accent-orange)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Heart size={22} color="var(--color-accent-orange)" />
              </div>
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.25rem", color: "#FFFFFF" }}>
                  Direct Rural Gaushala Impact
                </h4>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  Every order directly sustains indigenous Gaushala cattle care and local rural artisans.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(35, 185, 175, 0.15)",
                  color: "var(--color-accent-teal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Award size={22} color="var(--color-accent-teal)" />
              </div>
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.25rem", color: "#FFFFFF" }}>
                  Vedic Tradition Authenticity
                </h4>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  Charcoal-free, chemical-free sacred formulations following classical Panchgavya traditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div style={{ padding: "3.5rem 0 2.5rem" }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "2.5rem",
              marginBottom: "3rem",
            }}
          >
            {/* Store Information Column */}
            <div style={{ maxWidth: "340px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                  }}
                >
                  <Sparkles size={16} />
                </div>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#FFFFFF" }}>
                  {store.businessName}
                </span>
              </div>

              <p
                style={{
                  fontSize: "0.86rem",
                  color: "#A2A6C4",
                  lineHeight: 1.6,
                  marginBottom: "1.5rem",
                }}
              >
                {store.description ||
                  "Verified Vedic Gaushala collective preserving sacred traditions through natural cow dung art, herbal dhoop, and handcrafted puja essentials."}
              </p>

              {/* Verified Contact Details if present */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.82rem", color: "#CBD0EB" }}>
                {store.address && (
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                    <MapPin size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <span>{store.address}</span>
                  </div>
                )}
                {store.contactEmail && (
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    <Mail size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                    <a
                      href={`mailto:${store.contactEmail}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {store.contactEmail}
                    </a>
                  </div>
                )}
                {store.contactPhone && (
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    <Phone size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                    <a
                      href={`tel:${store.contactPhone}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {store.contactPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#FFFFFF",
                  marginBottom: "1.25rem",
                }}
              >
                Explore Store
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <li>
                  <Link
                    href={`/store/${store.storeSlug}`}
                    style={{ fontSize: "0.86rem", color: "#A2A6C4", textDecoration: "none", transition: "color var(--transition-fast)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#A2A6C4")}
                  >
                    Storefront Home
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/store/${store.storeSlug}/products`}
                    style={{ fontSize: "0.86rem", color: "#A2A6C4", textDecoration: "none", transition: "color var(--transition-fast)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#A2A6C4")}
                  >
                    All Sacred Products
                  </Link>
                </li>
                <li>
                  <Link
                    href="/account/wishlist"
                    style={{ fontSize: "0.86rem", color: "#A2A6C4", textDecoration: "none", transition: "color var(--transition-fast)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#A2A6C4")}
                  >
                    Customer Wishlist
                  </Link>
                </li>
                <li>
                  <Link
                    href="/account"
                    style={{ fontSize: "0.86rem", color: "#A2A6C4", textDecoration: "none", transition: "color var(--transition-fast)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#A2A6C4")}
                  >
                    Customer Account
                  </Link>
                </li>
              </ul>
            </div>

            {/* Category Links */}
            <div>
              <h4
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#FFFFFF",
                  marginBottom: "1.25rem",
                }}
              >
                Categories
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {categories.slice(0, 6).map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/store/${store.storeSlug}/categories/${cat.slug}`}
                      style={{ fontSize: "0.86rem", color: "#A2A6C4", textDecoration: "none", transition: "color var(--transition-fast)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#A2A6C4")}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Platform & Vedic Trust */}
            <div>
              <h4
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#FFFFFF",
                  marginBottom: "1.25rem",
                }}
              >
                Platform Trust
              </h4>
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  fontSize: "0.82rem",
                  color: "#A2A6C4",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#FFFFFF", fontWeight: 700, marginBottom: "0.4rem" }}>
                  <ShieldCheck size={16} color="var(--color-accent-teal)" />
                  <span>Powered by GauShilp OS</span>
                </div>
                Decentralized e-commerce infrastructure powering indigenous artisans, self-help groups, and Gaushala producer organizations across India.
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Attribution Bar */}
          <div
            style={{
              paddingTop: "2rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              fontSize: "0.78rem",
              color: "#747894",
            }}
          >
            <div>
              © {currentYear} {store.businessName}. All rights reserved.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>Operating on</span>
              <span style={{ color: "#FFFFFF", fontWeight: 700 }}>GauShilp OS</span>
              <span>— The Digital Operating System for Vedic Crafts</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
