"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "flat" | "glass" | "subtle";
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = "elevated", hoverable = true, className = "", style, ...props }, ref) => {
    const variantStyles: Record<string, React.CSSProperties> = {
      elevated: {
        backgroundColor: "var(--color-surface-card)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      },
      flat: {
        backgroundColor: "var(--color-surface-card)",
        border: "1px solid var(--color-border)",
        boxShadow: "none",
      },
      glass: {
        backgroundColor: "var(--color-surface-glass)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(228, 230, 244, 0.8)",
        boxShadow: "var(--shadow-sm)",
      },
      subtle: {
        backgroundColor: "var(--color-surface-muted)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow: "none",
      },
    };

    const baseStyle: React.CSSProperties = {
      borderRadius: "var(--radius-lg)",
      transition: hoverable
        ? "transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base)"
        : "none",
      overflow: "hidden",
      ...variantStyles[variant],
      ...style,
    };

    return (
      <div
        ref={ref}
        style={baseStyle}
        className={`card-component ${className}`}
        onMouseEnter={(e) => {
          if (hoverable) {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "var(--shadow-md)";
            e.currentTarget.style.borderColor = "var(--color-border-hover)";
          }
        }}
        onMouseLeave={(e) => {
          if (hoverable) {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              variant === "flat" || variant === "subtle" ? "none" : "var(--shadow-sm)";
            e.currentTarget.style.borderColor =
              variant === "subtle" ? "var(--color-border-subtle)" : "var(--color-border)";
          }
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
