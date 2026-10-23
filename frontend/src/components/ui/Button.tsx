"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "orange" | "teal" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    // Determine dimensions based on size
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        padding: "0.45rem 0.85rem",
        fontSize: "0.82rem",
        borderRadius: "var(--radius-sm)",
        height: "36px",
      },
      md: {
        padding: "0.65rem 1.25rem",
        fontSize: "0.92rem",
        borderRadius: "var(--radius-md)",
        height: "44px",
      },
      lg: {
        padding: "0.85rem 1.65rem",
        fontSize: "1rem",
        borderRadius: "var(--radius-lg)",
        height: "52px",
      },
    };

    // Determine variant colors & styles
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: "var(--gradient-primary-btn, linear-gradient(135deg, #6264EE 0%, #4A4BCB 100%))",
        color: "#FFFFFF",
        border: "1px solid transparent",
        boxShadow: "0 4px 14px rgba(98, 100, 238, 0.32)",
      },
      secondary: {
        backgroundColor: "var(--color-surface-card)",
        color: "var(--color-text-main)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-xs)",
      },
      outline: {
        backgroundColor: "transparent",
        color: "var(--color-primary)",
        border: "1.5px solid var(--color-primary)",
      },
      orange: {
        backgroundColor: "var(--color-accent-orange)",
        color: "#FFFFFF",
        border: "1px solid transparent",
        boxShadow: "0 4px 14px var(--color-accent-orange-glow)",
      },
      teal: {
        backgroundColor: "var(--color-accent-teal)",
        color: "#FFFFFF",
        border: "1px solid transparent",
        boxShadow: "0 4px 14px var(--color-accent-teal-glow)",
      },
      ghost: {
        backgroundColor: "transparent",
        color: "var(--color-text-secondary)",
        border: "1px solid transparent",
      },
      danger: {
        backgroundColor: "var(--color-danger)",
        color: "#FFFFFF",
        border: "1px solid transparent",
        boxShadow: "0 4px 14px var(--color-danger-glow)",
      },
    };

    const baseStyle: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      fontWeight: 600,
      cursor: disabled || isLoading ? "not-allowed" : "pointer",
      opacity: disabled || isLoading ? 0.65 : 1,
      transition: "all var(--transition-fast)",
      position: "relative",
      userSelect: "none",
      textDecoration: "none",
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...style,
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={baseStyle}
        className={`btn-interactive ${className}`}
        onMouseDown={(e) => {
          if (!disabled && !isLoading) {
            e.currentTarget.style.transform = "scale(0.97)";
          }
        }}
        onMouseUp={(e) => {
          if (!disabled && !isLoading) {
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isLoading) {
            e.currentTarget.style.transform = "translateY(-1.5px)";
            if (variant === "primary") {
              e.currentTarget.style.backgroundColor = "var(--color-primary-deep)";
              e.currentTarget.style.boxShadow = "var(--shadow-glow-primary)";
            } else if (variant === "secondary") {
              e.currentTarget.style.borderColor = "var(--color-border-hover)";
              e.currentTarget.style.backgroundColor = "var(--color-surface-muted)";
            } else if (variant === "ghost") {
              e.currentTarget.style.backgroundColor = "var(--color-primary-subtle)";
              e.currentTarget.style.color = "var(--color-primary)";
            }
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          if (variant === "primary") {
            e.currentTarget.style.backgroundColor = "var(--color-primary)";
            e.currentTarget.style.boxShadow = "0 4px 14px var(--color-primary-glow)";
          } else if (variant === "secondary") {
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.backgroundColor = "var(--color-surface-card)";
          } else if (variant === "ghost") {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }
        }}
        {...props}
      >
        {isLoading && <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />}
        {!isLoading && leftIcon && <span style={{ display: "flex", alignItems: "center" }}>{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span style={{ display: "flex", alignItems: "center" }}>{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
