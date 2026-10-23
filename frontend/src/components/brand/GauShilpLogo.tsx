"use client";

import React from "react";
import Link from "next/link";

interface GauShilpLogoProps {
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
  href?: string;
  className?: string;
}

export const GauShilpLogo: React.FC<GauShilpLogoProps> = ({
  size = "md",
  withTagline = true,
  href = "/",
  className = "",
}) => {
  const iconDimensions = {
    sm: { width: 28, height: 28, fontSize: "1.1rem", taglineSize: "0.62rem" },
    md: { width: 38, height: 38, fontSize: "1.35rem", taglineSize: "0.7rem" },
    lg: { width: 48, height: 48, fontSize: "1.75rem", taglineSize: "0.82rem" },
  }[size];

  const content = (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? "0.55rem" : "0.75rem",
        textDecoration: "none",
        userSelect: "none",
      }}
    >
      {/* Stylized Lotus SVG Emblem */}
      <svg
        width={iconDimensions.width}
        height={iconDimensions.height}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="lotusCenterGrad" x1="22" y1="6" x2="22" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6E70F8" />
            <stop offset="1" stopColor="#4445C8" />
          </linearGradient>
          <linearGradient id="lotusSideGrad" x1="10" y1="14" x2="34" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5B5CE2" />
            <stop offset="1" stopColor="#3B3CAE" />
          </linearGradient>
        </defs>

        {/* Central Lotus Petal */}
        <path
          d="M22 6C20.2 12.8 17 21.5 17 28.5C17 33.2 19.2 36.5 22 37.5C24.8 36.5 27 33.2 27 28.5C27 21.5 23.8 12.8 22 6Z"
          fill="url(#lotusCenterGrad)"
        />

        {/* Left Inner Petal */}
        <path
          d="M17 14C13.5 18 10 24.2 10 29C10 33.2 12.5 35.8 16 36.8C16.8 32.5 18 25.8 19 20C18.2 17.8 17.5 15.8 17 14Z"
          fill="url(#lotusSideGrad)"
          opacity="0.92"
        />

        {/* Right Inner Petal */}
        <path
          d="M27 14C30.5 18 34 24.2 34 29C34 33.2 31.5 35.8 28 36.8C27.2 32.5 26 25.8 25 20C25.8 17.8 26.5 15.8 27 14Z"
          fill="url(#lotusSideGrad)"
          opacity="0.92"
        />

        {/* Left Outer Wing Petal */}
        <path
          d="M10 22C6.8 25.5 4.5 29.5 4.5 33C4.5 35.8 6.5 37.2 9.5 37C11.5 34.2 13 29.5 14 25.5C12.5 24.2 11.2 23 10 22Z"
          fill="#5B5CE2"
          opacity="0.75"
        />

        {/* Right Outer Wing Petal */}
        <path
          d="M34 22C37.2 25.5 39.5 29.5 39.5 33C39.5 35.8 37.5 37.2 34.5 37C32.5 34.2 31 29.5 30 25.5C31.5 24.2 32.8 23 34 22Z"
          fill="#5B5CE2"
          opacity="0.75"
        />

        {/* Auspicious Base Arc */}
        <path
          d="M14 38C18 39.5 26 39.5 30 38C27.5 39.8 16.5 39.8 14 38Z"
          fill="#4445C8"
        />
      </svg>

      {/* Brand Name & Tagline */}
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <div
          style={{
            fontSize: iconDimensions.fontSize,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: "var(--color-text-main)",
          }}
        >
          GauShilp <span style={{ color: "var(--color-primary)" }}>OS</span>
        </div>
        {withTagline && (
          <div
            style={{
              fontSize: iconDimensions.taglineSize,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              letterSpacing: "0.01em",
              marginTop: "2px",
            }}
          >
            Handmade with Purpose
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} style={{ textDecoration: "none" }}>{content}</Link>;
  }

  return content;
};
