"use client";

import React from "react";
import { DASHBOARD_KPIS } from "@/lib/artisanData";
import { TrendingUp, ShoppingBag, Users, Leaf, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/Card";

export const KpiCards: React.FC = () => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "TrendingUp":
        return <TrendingUp size={22} color="var(--color-primary)" />;
      case "ShoppingBag":
        return <ShoppingBag size={22} color="var(--color-accent-teal)" />;
      case "Users":
        return <Users size={22} color="var(--color-accent-orange)" />;
      default:
        return <Leaf size={22} color="var(--color-success)" />;
    }
  };

  const getIconBg = (iconName: string) => {
    switch (iconName) {
      case "TrendingUp":
        return "var(--color-primary-subtle)";
      case "ShoppingBag":
        return "var(--color-accent-teal-light)";
      case "Users":
        return "var(--color-accent-orange-light)";
      default:
        return "var(--color-success-light)";
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1.25rem",
      }}
    >
      {DASHBOARD_KPIS.map((kpi, idx) => (
        <Card
          key={kpi.id}
          variant="elevated"
          className="animate-fade-up"
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            animationDelay: `${idx * 80}ms`,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
              {kpi.label}
            </span>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "var(--radius-md)",
                backgroundColor: getIconBg(kpi.icon),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {getIcon(kpi.icon)}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "1.85rem",
                fontWeight: 800,
                color: "var(--color-text-main)",
                letterSpacing: "-0.02em",
                marginBottom: "0.5rem",
              }}
            >
              {kpi.value}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.8rem" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.2rem",
                  fontWeight: 700,
                  color: kpi.isPositive ? "var(--color-success)" : "var(--color-danger)",
                  backgroundColor: kpi.isPositive ? "var(--color-success-light)" : "var(--color-danger-light)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "var(--radius-pill)",
                }}
              >
                <ArrowUpRight size={13} /> {kpi.change}
              </span>
              <span style={{ color: "var(--color-text-secondary)" }}>{kpi.subtitle}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
