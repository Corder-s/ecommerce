"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Award } from "lucide-react";

export const ArtisanImpactWidget: React.FC = () => {
  return (
    <Card variant="elevated" style={{ padding: "1.75rem", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-accent-orange-light)",
              color: "var(--color-accent-orange)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Award size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)" }}>
              Gaushala Vedic Impact Index
            </h4>
            <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
              Social & Ecological Footprint Tracker
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: "0.76rem",
            fontWeight: 700,
            color: "var(--color-primary)",
            backgroundColor: "var(--color-primary-subtle)",
            padding: "0.2rem 0.6rem",
            borderRadius: "var(--radius-pill)",
          }}
        >
          Grade A+ Vedic
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Metric 1 */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
            <span style={{ fontWeight: 600, color: "var(--color-text-main)" }}>Organic Dung Upcycled</span>
            <strong style={{ color: "var(--color-success)" }}>14,250 kg (94% target)</strong>
          </div>
          <div style={{ width: "100%", height: "8px", backgroundColor: "var(--color-border)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
            <div style={{ width: "94%", height: "100%", backgroundColor: "var(--color-success)", borderRadius: "var(--radius-pill)" }} />
          </div>
        </div>

        {/* Metric 2 */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
            <span style={{ fontWeight: 600, color: "var(--color-text-main)" }}>Cattle Fodder Days Funded</span>
            <strong style={{ color: "var(--color-primary)" }}>3,420 Days (88%)</strong>
          </div>
          <div style={{ width: "100%", height: "8px", backgroundColor: "var(--color-border)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
            <div style={{ width: "88%", height: "100%", backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-pill)" }} />
          </div>
        </div>

        {/* Metric 3 */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
            <span style={{ fontWeight: 600, color: "var(--color-text-main)" }}>Rural Women SHGs Employed</span>
            <strong style={{ color: "var(--color-accent-orange)" }}>68 Families</strong>
          </div>
          <div style={{ width: "100%", height: "8px", backgroundColor: "var(--color-border)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
            <div style={{ width: "100%", height: "100%", backgroundColor: "var(--color-accent-orange)", borderRadius: "var(--radius-pill)" }} />
          </div>
        </div>

        {/* Highlight quote */}
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-surface-muted)",
            border: "1px solid var(--color-border-subtle)",
            fontSize: "0.82rem",
            color: "var(--color-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          &ldquo;GauShilp OS has turned gaushala maintenance from an economic liability into a sustainable cottage economy for our Vrindavan artisans.&rdquo;
        </div>
      </div>
    </Card>
  );
};
