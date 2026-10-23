"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
      }}
      aria-label="Pagination"
    >
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--color-border)",
          backgroundColor: "#FFFFFF",
          color: "var(--color-text-main)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: currentPage <= 1 ? "not-allowed" : "pointer",
          opacity: currentPage <= 1 ? 0.45 : 1,
        }}
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p) => {
        const isCurrent = p === currentPage;
        return (
          <button
            key={p}
            type="button"
            aria-current={isCurrent ? "page" : undefined}
            onClick={() => onPageChange(p)}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "var(--radius-sm)",
              border: isCurrent ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
              backgroundColor: isCurrent ? "var(--color-primary)" : "#FFFFFF",
              color: isCurrent ? "#FFFFFF" : "var(--color-text-main)",
              fontSize: "0.85rem",
              fontWeight: isCurrent ? 700 : 500,
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            {p}
          </button>
        );
      })}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--color-border)",
          backgroundColor: "#FFFFFF",
          color: "var(--color-text-main)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
          opacity: currentPage >= totalPages ? 0.45 : 1,
        }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};
