"use client";

import React from "react";
import { OrderStatus } from "@/types/store";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: OrderStatus | "active" | "custom";
  variant?: "success" | "indigo" | "teal" | "orange" | "danger" | "muted";
  withDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  status,
  variant,
  withDot = true,
  className = "",
  style,
  ...props
}) => {
  // Map OrderStatus to style variant
  let resolvedVariant = variant || "muted";
  let label = children;

  if (status) {
    switch (status) {
      case "COMPLETED":
        resolvedVariant = "success";
        label = label || "Completed";
        break;
      case "PROCESSING":
        resolvedVariant = "indigo";
        label = label || "Processing";
        break;
      case "SHIPPED":
        resolvedVariant = "teal";
        label = label || "Dispatched";
        break;
      case "PENDING":
        resolvedVariant = "orange";
        label = label || "Awaiting Action";
        break;
      case "CANCELLED":
        resolvedVariant = "danger";
        label = label || "Cancelled";
        break;
      case "active":
        resolvedVariant = "success";
        label = label || "Active";
        break;
    }
  }

  const variantStyles: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    success: {
      bg: "var(--color-success-light)",
      text: "var(--color-success)",
      dot: "var(--color-success)",
      border: "rgba(24, 132, 90, 0.2)",
    },
    indigo: {
      bg: "var(--color-primary-subtle)",
      text: "var(--color-primary)",
      dot: "var(--color-primary)",
      border: "rgba(91, 92, 226, 0.2)",
    },
    teal: {
      bg: "var(--color-accent-teal-light)",
      text: "var(--color-accent-teal)",
      dot: "var(--color-accent-teal)",
      border: "rgba(35, 185, 175, 0.2)",
    },
    orange: {
      bg: "var(--color-accent-orange-light)",
      text: "var(--color-accent-orange)",
      dot: "var(--color-accent-orange)",
      border: "rgba(255, 156, 67, 0.25)",
    },
    danger: {
      bg: "var(--color-danger-light)",
      text: "var(--color-danger)",
      dot: "var(--color-danger)",
      border: "rgba(224, 62, 62, 0.2)",
    },
    muted: {
      bg: "var(--color-surface-muted)",
      text: "var(--color-text-secondary)",
      dot: "var(--color-text-tertiary)",
      border: "var(--color-border)",
    },
  };

  const currentTheme = variantStyles[resolvedVariant] || variantStyles.muted;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.25rem 0.65rem",
        borderRadius: "var(--radius-pill)",
        fontSize: "0.76rem",
        fontWeight: 600,
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
        border: `1px solid ${currentTheme.border}`,
        userSelect: "none",
        ...style,
      }}
      className={className}
      {...props}
    >
      {withDot && (
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: currentTheme.dot,
            display: "inline-block",
          }}
        />
      )}
      {label}
    </span>
  );
};
