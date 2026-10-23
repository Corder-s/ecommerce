"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck } from "lucide-react";

interface AuthSplitLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthSplitLayout: React.FC<AuthSplitLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1.15fr",
        backgroundColor: "var(--color-bg)",
      }}
      className="auth-split-container"
    >
      {/* Left Column: Visual Brand Panel */}
      <div
        style={{
          position: "relative",
          backgroundColor: "var(--color-primary)",
          background: "linear-gradient(135deg, #4445C8 0%, #5B5CE2 60%, #FF9C43 140%)",
          color: "#FFFFFF",
          padding: "3.5rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
        className="auth-visual-panel"
      >
        {/* Ambient Overlay Pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.12,
            backgroundImage: "radial-gradient(#FFFFFF 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            pointerEvents: "none",
          }}
        />

        {/* Brand Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", zIndex: 2 }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
            }}
          >
            <Sparkles size={22} />
          </div>
          <span style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            GauShilp<span style={{ color: "var(--color-accent-orange)" }}>OS</span>
          </span>
        </Link>

        {/* Center Quote / Testimonial */}
        <div style={{ zIndex: 2, maxWidth: "460px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.25rem 0.65rem",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "rgba(255, 255, 255, 0.18)",
              fontSize: "0.78rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
            }}
          >
            <ShieldCheck size={15} />
            <span>Sacred Vedic Commerce Platform</span>
          </div>

          <blockquote
            style={{
              fontSize: "1.65rem",
              fontWeight: 700,
              lineHeight: 1.35,
              marginBottom: "1.5rem",
            }}
          >
            &ldquo;Empowering 68+ indigenous gaushalas and traditional artisans with fluid, high-converting digital storefronts.&rdquo;
          </blockquote>

          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "#FFFFFF",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.95rem",
              }}
            >
              VK
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Acharya Vivek Krishna</div>
              <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>Vrindavan Gaushala Federation</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ zIndex: 2, fontSize: "0.82rem", opacity: 0.75 }}>
          &copy; 2026 GauShilp OS &bull; Built for sacred craftsmanship
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 2rem",
          position: "relative",
        }}
      >
        <div
          className="card-elevated animate-fade-up"
          style={{
            width: "100%",
            maxWidth: "460px",
            backgroundColor: "#FFFFFF",
            padding: "2.75rem 2.5rem",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
              {title}
            </h2>
            <p style={{ fontSize: "0.92rem", color: "var(--color-text-secondary)" }}>
              {subtitle}
            </p>
          </div>

          {children}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .auth-split-container {
            grid-template-columns: 1fr !important;
          }
          .auth-visual-panel {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
