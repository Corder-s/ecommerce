"use client";

import React, { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, type = "text", id, className = "", style, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isPasswordType = type === "password";
    const actualType = isPasswordType ? (showPassword ? "text" : "password") : type;
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className={className} style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: "100%" }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: "0.86rem",
              fontWeight: 600,
              color: error ? "var(--color-danger)" : "var(--color-text-main)",
              transition: "color var(--transition-fast)",
            }}
          >
            {label}
          </label>
        )}

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            width: "100%",
            borderRadius: "var(--radius-md)",
            border: `1.5px solid ${
              error
                ? "var(--color-danger)"
                : isFocused
                ? "var(--color-primary)"
                : "var(--color-border)"
            }`,
            backgroundColor: "#FFFFFF",
            boxShadow: isFocused
              ? error
                ? "0 0 0 3px var(--color-danger-glow)"
                : "0 0 0 3px var(--color-primary-glow)"
              : "none",
            transition: "all var(--transition-fast)",
          }}
        >
          {leftIcon && (
            <div
              style={{
                paddingLeft: "0.85rem",
                display: "flex",
                alignItems: "center",
                color: error ? "var(--color-danger)" : isFocused ? "var(--color-primary)" : "var(--color-text-tertiary)",
                transition: "color var(--transition-fast)",
              }}
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={actualType}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: "100%",
              height: "44px",
              padding: leftIcon ? "0.6rem 0.85rem 0.6rem 0.5rem" : "0.6rem 0.85rem",
              paddingRight: isPasswordType ? "2.5rem" : "0.85rem",
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "0.92rem",
              color: "var(--color-text-main)",
              fontFamily: "inherit",
              ...style,
            }}
            {...props}
          />

          {isPasswordType && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: "0.75rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                color: "var(--color-text-secondary)",
                transition: "color var(--transition-fast)",
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>

        {error ? (
          <div
            className="animate-fade-in"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.78rem",
              color: "var(--color-danger)",
              fontWeight: 500,
            }}
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
            {helperText}
          </div>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
