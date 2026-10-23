"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "warning" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (options: { type: ToastType; title: string; message?: string }) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, message }: { type: ToastType; title: string; message?: string }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message }]);

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        dismissToast(id);
      }, 4000);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}
      {/* Toast Render Container */}
      <div
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxWidth: "380px",
          width: "calc(100vw - 3rem)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="card-elevated animate-fade-up"
            style={{
              pointerEvents: "auto",
              padding: "0.9rem 1.1rem",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              background: "#FFFFFF",
              border: `1px solid ${
                t.type === "success"
                  ? "var(--color-success)"
                  : t.type === "warning"
                  ? "var(--color-accent-orange)"
                  : t.type === "error"
                  ? "var(--color-danger)"
                  : "var(--color-primary)"
              }`,
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ marginTop: "2px", flexShrink: 0 }}>
              {t.type === "success" && <CheckCircle2 size={18} color="var(--color-success)" />}
              {t.type === "warning" && <AlertTriangle size={18} color="var(--color-accent-orange)" />}
              {t.type === "error" && <AlertCircle size={18} color="var(--color-danger)" />}
              {t.type === "info" && <Info size={18} color="var(--color-primary)" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-main)" }}>
                {t.title}
              </div>
              {t.message && (
                <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                  {t.message}
                </div>
              )}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                color: "var(--color-text-tertiary)",
                display: "flex",
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
