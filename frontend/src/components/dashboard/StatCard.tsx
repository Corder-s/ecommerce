"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface StatCardProps {
  label: string;
  value?: string | number | null;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  isLoading?: boolean;
  isUnavailable?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  trend,
  trendValue,
  icon,
  iconBg = "rgba(91, 92, 226, 0.12)",
  iconColor = "var(--color-primary)",
  isLoading = false,
  isUnavailable = false,
  className = "",
}) => {
  if (isLoading) {
    return (
      <Card variant="elevated" hoverable={false} className={`p-6 ${className}`} style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "60%" }}>
            <Skeleton width="70%" height="14px" />
            <Skeleton width="90%" height="28px" />
          </div>
          <Skeleton width="44px" height="44px" borderRadius="12px" />
        </div>
        <Skeleton width="50%" height="12px" />
      </Card>
    );
  }

  return (
    <Card
      variant="elevated"
      hoverable={true}
      className={`animate-fade-up ${className}`}
      style={{
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "135px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top Section: Label + Icon */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            {isUnavailable ? (
              <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                Unavailable
              </span>
            ) : (
              <span
                style={{
                  fontSize: "1.85rem",
                  fontWeight: 800,
                  color: "var(--color-text-main)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                }}
              >
                {value ?? "—"}
              </span>
            )}
          </div>
        </div>

        {/* Icon Pill */}
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "var(--radius-md)",
            backgroundColor: iconBg,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>

      {/* Bottom Section: Trend / Subtext */}
      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.78rem",
          color: "var(--color-text-secondary)",
        }}
      >
        {trend && trendValue && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.2rem",
              fontWeight: 700,
              padding: "0.15rem 0.45rem",
              borderRadius: "var(--radius-pill)",
              backgroundColor:
                trend === "up"
                  ? "var(--color-success-light)"
                  : trend === "down"
                  ? "var(--color-danger-light)"
                  : "var(--color-surface-muted)",
              color:
                trend === "up"
                  ? "var(--color-success)"
                  : trend === "down"
                  ? "var(--color-danger)"
                  : "var(--color-text-secondary)",
            }}
          >
            {trend === "up" ? (
              <TrendingUp size={12} />
            ) : trend === "down" ? (
              <TrendingDown size={12} />
            ) : (
              <Minus size={12} />
            )}
            {trendValue}
          </span>
        )}
        {subtext && <span>{subtext}</span>}
      </div>
    </Card>
  );
};
