"use client";

import React from "react";
import { HeaderBanner } from "@/components/layout/HeaderBanner";

interface AuthCardLayoutProps {
  children: React.ReactNode;
  maxWidth?: string;
}

export const AuthCardLayout: React.FC<AuthCardLayoutProps> = ({
  children,
  maxWidth = "460px",
}) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--gradient-bg-lavender, linear-gradient(135deg, #F7F8FF 0%, #ECEEFF 50%, #F5F3FF 100%))",
      }}
    >
      {/* Top Reference Platform Banner */}
      <HeaderBanner />

      {/* Main Centered Container */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 1.25rem",
        }}
      >
        <div
          className="animate-fade-up"
          style={{
            width: "100%",
            maxWidth,
            backgroundColor: "#FFFFFF",
            borderRadius: "var(--radius-card, 20px)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 10px 32px -4px rgba(32, 35, 60, 0.08), 0 2px 6px rgba(32, 35, 60, 0.04)",
            padding: "2.25rem 2.25rem 2.25rem 2.25rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
};
