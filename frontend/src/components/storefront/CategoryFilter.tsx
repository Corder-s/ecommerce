"use client";

import React from "react";
import { CATEGORIES } from "@/lib/artisanData";
import { Sparkles, Flame, Wind, Gift, Crown, Sun } from "lucide-react";

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (categorySlug: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Flame":
        return <Flame size={16} />;
      case "Wind":
        return <Wind size={16} />;
      case "Gift":
        return <Gift size={16} />;
      case "Crown":
        return <Crown size={16} />;
      case "Sun":
        return <Sun size={16} />;
      default:
        return <Sparkles size={16} />;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        overflowX: "auto",
        paddingBottom: "0.75rem",
        scrollbarWidth: "none",
      }}
    >
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.slug;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.slug)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1.15rem",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              border: isSelected ? "1.5px solid var(--color-primary)" : "1.5px solid var(--color-border)",
              backgroundColor: isSelected ? "var(--color-primary)" : "#FFFFFF",
              color: isSelected ? "#FFFFFF" : "var(--color-text-main)",
              boxShadow: isSelected ? "0 4px 12px var(--color-primary-glow)" : "var(--shadow-xs)",
              transition: "all var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.color = "var(--color-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.color = "var(--color-text-main)";
              }
            }}
          >
            <span>{getIcon(cat.iconName)}</span>
            <span>{cat.name}</span>
            <span
              style={{
                fontSize: "0.72rem",
                padding: "0.1rem 0.45rem",
                borderRadius: "var(--radius-pill)",
                backgroundColor: isSelected ? "rgba(255, 255, 255, 0.25)" : "var(--color-surface-muted)",
                color: isSelected ? "#FFFFFF" : "var(--color-text-secondary)",
              }}
            >
              {cat.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
