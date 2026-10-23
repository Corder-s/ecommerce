"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const HeroSection: React.FC = () => {
  return (
    <section
      style={{
        position: "relative",
        padding: "4rem 0 3rem",
        overflow: "hidden",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "3.5rem",
            alignItems: "center",
          }}
          className="hero-grid"
        >
          {/* Left Column: Hero Copy & Value Props */}
          <div className="animate-fade-up">
            {/* Pill Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0.85rem",
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--color-primary-subtle)",
                border: "1px solid rgba(91, 92, 226, 0.2)",
                color: "var(--color-primary)",
                fontSize: "0.82rem",
                fontWeight: 700,
                marginBottom: "1.25rem",
              }}
            >
              <Sparkles size={15} color="var(--color-accent-orange)" />
              <span>Sacred Gaushala & Indian Artisan Heritage</span>
            </div>

            <h1
              style={{
                fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)",
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                color: "var(--color-text-main)",
                marginBottom: "1.25rem",
              }}
            >
              Pure Vedic Crafts.{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Handmade
              </span>{" "}
              with Devotion.
            </h1>

            <p
              style={{
                fontSize: "1.1rem",
                lineHeight: 1.65,
                color: "var(--color-text-secondary)",
                marginBottom: "2rem",
                maxWidth: "520px",
              }}
            >
              Discover sacred cow dung diyas, charcoal-free herbal dhoop, and artisan puja kits.
              Every purchase directly sustains rural women artisans and Indian indigenous gaushalas.
            </p>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
              <Link href="#catalog">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight size={18} />}>
                  Explore Sacred Catalog
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="secondary">
                  Seller Dashboard
                </Button>
              </Link>
            </div>

            {/* Impact Highlights */}
            <div
              style={{
                display: "flex",
                gap: "2.5rem",
                paddingTop: "1.5rem",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--color-primary)" }}>
                  68+
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  Artisan Guilds
                </div>
              </div>

              <div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--color-accent-orange)" }}>
                  100%
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  Vedic & Eco-Soluble
                </div>
              </div>

              <div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--color-accent-teal)" }}>
                  14.2T
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  Cow Dung Upcycled
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Layered Product Hero Visual */}
          <div
            className="animate-fade-up"
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Background Glow Ring */}
            <div
              style={{
                position: "absolute",
                width: "90%",
                height: "90%",
                borderRadius: "var(--radius-xl)",
                background: "linear-gradient(135deg, rgba(91, 92, 226, 0.18) 0%, rgba(255, 156, 67, 0.12) 100%)",
                filter: "blur(24px)",
                zIndex: -1,
              }}
            />

            {/* Main Featured Photo Card */}
            <div
              className="card-elevated"
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "540px",
                aspectRatio: "16 / 10",
                overflow: "hidden",
                borderRadius: "var(--radius-xl)",
                border: "2px solid rgba(255, 255, 255, 0.9)",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              <Image
                src="/images/hero_artisans.jpg"
                alt="Indian artisan crafting sacred cow dung diyas at gaushala"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 540px"
                style={{ objectFit: "cover" }}
              />

              {/* Floating Trust Badge */}
              <div
                className="glass-panel"
                style={{
                  position: "absolute",
                  bottom: "1.25rem",
                  left: "1.25rem",
                  right: "1.25rem",
                  padding: "0.85rem 1.15rem",
                  borderRadius: "var(--radius-lg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "var(--color-text-main)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-success)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700 }}>
                      Vedic Panchgavya Certified
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>
                      Direct from Vrindavan & Pushkar Gaushalas
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--color-accent-orange)",
                    color: "#FFFFFF",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    padding: "0.3rem 0.65rem",
                    borderRadius: "var(--radius-pill)",
                  }}
                >
                  Direct Fair Wage
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
        }
      `}</style>
    </section>
  );
};
