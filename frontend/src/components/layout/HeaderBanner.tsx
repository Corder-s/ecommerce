"use client";

import React from "react";
import { GauShilpLogo } from "@/components/brand/GauShilpLogo";
import { Sparkles, Users, TrendingUp, Heart } from "lucide-react";

export const HeaderBanner: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid var(--color-border)",
        padding: "0.85rem 1.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        zIndex: 50,
        position: "relative",
      }}
    >
      {/* Brand & Mission Tagline */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
        <GauShilpLogo size="sm" withTagline={false} />

        <div
          style={{
            width: "1.5px",
            height: "26px",
            backgroundColor: "var(--color-border)",
            display: "none",
          }}
          className="banner-divider"
        />

        <div style={{ display: "flex", flexDirection: "column" }} className="banner-text">
          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--color-text-main)" }}>
            Empowering Indian Artisans &bull; Gaushalas &bull; Handmade Businesses
          </span>
          <span style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>
            A Complete E-commerce Platform for Cow-Dung Products and Traditional Crafts
          </span>
        </div>
      </div>

      {/* Right Platform Pillar Badges */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        {/* Traditional Products */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.35rem 0.75rem",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "rgba(91, 92, 226, 0.08)",
            color: "var(--color-primary)",
            fontSize: "0.76rem",
            fontWeight: 700,
            border: "1px solid rgba(91, 92, 226, 0.15)",
          }}
        >
          <Sparkles size={14} />
          <span>Traditional Products</span>
        </div>

        {/* Sustainable Livelihoods */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.35rem 0.75rem",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "rgba(255, 156, 67, 0.12)",
            color: "var(--color-accent-orange)",
            fontSize: "0.76rem",
            fontWeight: 700,
            border: "1px solid rgba(255, 156, 67, 0.2)",
          }}
        >
          <Users size={14} />
          <span>Sustainable Livelihoods</span>
        </div>

        {/* Digital Growth */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.35rem 0.75rem",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "rgba(35, 185, 175, 0.1)",
            color: "var(--color-accent-teal)",
            fontSize: "0.76rem",
            fontWeight: 700,
            border: "1px solid rgba(35, 185, 175, 0.2)",
          }}
        >
          <TrendingUp size={14} />
          <span>Digital Growth</span>
        </div>

        {/* Stronger Communities */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.35rem 0.75rem",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "rgba(255, 156, 67, 0.1)",
            color: "#D96C17",
            fontSize: "0.76rem",
            fontWeight: 700,
            border: "1px solid rgba(255, 156, 67, 0.2)",
          }}
        >
          <Heart size={14} />
          <span>Stronger Communities</span>
        </div>
      </div>

      <style jsx>{`
        @media (min-width: 768px) {
          .banner-divider {
            display: block !important;
          }
        }
        @media (max-width: 640px) {
          .banner-text {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
