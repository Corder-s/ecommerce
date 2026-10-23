"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck, HeartHandshake, Leaf, ArrowUpRight } from "lucide-react";

export const StoreFooter: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: "#FFFFFF",
        borderTop: "1px solid var(--color-border)",
        marginTop: "auto",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Heritage Trust Badges */}
      <div style={{ borderBottom: "1px solid var(--color-border-subtle)", padding: "2.5rem 0" }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "2rem",
            }}
          >
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Leaf size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: "0.98rem", fontWeight: 700 }}>100% Vedic & Panchgavya</h4>
                <p style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>
                  Crafted strictly from indigenous desi cow dung & natural herbs.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-accent-orange-light)",
                  color: "var(--color-accent-orange)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <HeartHandshake size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: "0.98rem", fontWeight: 700 }}>Empowering Rural Artisans</h4>
                <p style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>
                  Direct fair-wage compensation to gaushala self-help groups.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-accent-teal-light)",
                  color: "var(--color-accent-teal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: "0.98rem", fontWeight: 700 }}>Chemical & Charcoal Free</h4>
                <p style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>
                  Clean temple aroma tested safe for indoor puja & home meditation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div style={{ padding: "4rem 0 3rem" }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "3rem",
            }}
          >
            {/* Brand Story */}
            <div style={{ gridColumn: "span 2", maxWidth: "420px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                  GauShilp<span style={{ color: "var(--color-primary)" }}>OS</span>
                </span>
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                The dedicated e-commerce operating system bridging India’s sacred gaushalas and traditional artisans
                with global conscious households seeking authentic, pure Vedic craft products.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h5 style={{ fontSize: "0.92rem", fontWeight: 700, marginBottom: "1.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Sacred Crafts
              </h5>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.7rem", fontSize: "0.9rem" }}>
                <li><Link href="/#catalog" style={{ color: "var(--color-text-secondary)" }}>Vedic Cow Dung Diyas</Link></li>
                <li><Link href="/#catalog" style={{ color: "var(--color-text-secondary)" }}>Natural Herbal Dhoop Cups</Link></li>
                <li><Link href="/#catalog" style={{ color: "var(--color-text-secondary)" }}>Eco Ganesha Statues</Link></li>
                <li><Link href="/#catalog" style={{ color: "var(--color-text-secondary)" }}>Artisan Puja Gift Sets</Link></li>
              </ul>
            </div>

            {/* Platform & OS */}
            <div>
              <h5 style={{ fontSize: "0.92rem", fontWeight: 700, marginBottom: "1.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Gaushala SaaS
              </h5>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.7rem", fontSize: "0.9rem" }}>
                <li>
                  <Link href="/dashboard" style={{ color: "var(--color-primary)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    Seller Dashboard <ArrowUpRight size={14} />
                  </Link>
                </li>
                <li><Link href="/login" style={{ color: "var(--color-text-secondary)" }}>Artisan Portal Login</Link></li>
                <li><Link href="/register" style={{ color: "var(--color-text-secondary)" }}>Register Gaushala</Link></li>
                <li><Link href="/#impact" style={{ color: "var(--color-text-secondary)" }}>Sustainability Metrics</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright Sub-bar */}
          <div
            style={{
              borderTop: "1px solid var(--color-border)",
              marginTop: "3rem",
              paddingTop: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              fontSize: "0.84rem",
              color: "var(--color-text-tertiary)",
            }}
          >
            <span>&copy; 2026 GauShilp OS. Built with pride for sacred Indian artisan crafts.</span>
            <span>Vedic Eco-Sustainability &bull; Panchgavya Certified</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
