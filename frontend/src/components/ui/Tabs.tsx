"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "pill" | "underline";
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = "pill",
  className = "",
}) => {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: variant === "pill" ? "0.4rem" : "1.5rem",
        backgroundColor: variant === "pill" ? "var(--color-surface-muted)" : "transparent",
        padding: variant === "pill" ? "0.3rem" : 0,
        borderRadius: variant === "pill" ? "var(--radius-md)" : 0,
        borderBottom: variant === "underline" ? "1px solid var(--color-border)" : "none",
      }}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (variant === "pill") {
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.45rem 0.95rem",
                borderRadius: "var(--radius-sm)",
                border: "none",
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: isActive ? "#FFFFFF" : "transparent",
                color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                boxShadow: isActive ? "var(--shadow-xs)" : "none",
                transition: "all var(--transition-fast)",
              }}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "0.1rem 0.45rem",
                    borderRadius: "var(--radius-pill)",
                    backgroundColor: isActive ? "var(--color-primary-subtle)" : "var(--color-border-subtle)",
                    color: isActive ? "var(--color-primary)" : "var(--color-text-tertiary)",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        }

        // Underline variant
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.75rem 0",
              border: "none",
              background: "transparent",
              fontSize: "0.92rem",
              fontWeight: isActive ? 700 : 500,
              cursor: "pointer",
              color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
              borderBottom: isActive ? "2.5px solid var(--color-primary)" : "2.5px solid transparent",
              marginBottom: "-1px",
              transition: "all var(--transition-fast)",
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "0.1rem 0.45rem",
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: "var(--color-surface-muted)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
