"use client";

import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
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
        backgroundColor: "#FFFFFF",
        borderRadius: "var(--radius-lg)",
        border: "1.5px dashed var(--color-border)",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "var(--color-primary-subtle)",
          color: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1rem",
        }}
      >
        {icon || <FolderOpen size={28} />}
      </div>

      <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
        {title}
      </h4>

      <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", maxWidth: "380px", marginBottom: action ? "1.5rem" : 0 }}>
        {description}
      </p>

      {action && <div>{action}</div>}
    </div>
  );
};
