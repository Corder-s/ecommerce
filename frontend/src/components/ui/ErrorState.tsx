"use client";

import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message = "An unexpected error occurred while loading this section. Please try again.",
  onRetry,
  className = "",
}) => {
  return (
    <div
      className={`animate-fade-in ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "3.5rem 1.5rem",
        backgroundColor: "var(--color-danger-light)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(224, 62, 62, 0.2)",
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          color: "var(--color-danger)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1rem",
          boxShadow: "0 2px 8px var(--color-danger-glow)",
        }}
      >
        <AlertCircle size={28} />
      </div>

      <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-danger)", marginBottom: "0.35rem" }}>
        {title}
      </h4>

      <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", maxWidth: "380px", marginBottom: onRetry ? "1.5rem" : 0 }}>
        {message}
      </p>

      {onRetry && (
        <Button size="md" variant="secondary" onClick={onRetry} leftIcon={<RotateCcw size={15} />}>
          Retry
        </Button>
      )}
    </div>
  );
};
