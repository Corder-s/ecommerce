"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "540px",
  className = "",
}) => {
  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        backgroundColor: "rgba(32, 35, 60, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
      }}
      onClick={onClose}
    >
      <div
        className={`animate-scale-in ${className}`}
        style={{
          width: "100%",
          maxWidth,
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-card, 20px)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          position: "relative",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || description) && (
          <div
            style={{
              padding: "1.5rem 1.75rem 1rem",
              borderBottom: "1px solid var(--color-border-subtle)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div>
              {title && (
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-text-main)" }}>
                  {title}
                </h3>
              )}
              {description && (
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
                  {description}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: "var(--color-text-secondary)",
                display: "flex",
              }}
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: "1.5rem 1.75rem", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
};
