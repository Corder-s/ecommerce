"use client";

import React, { useState } from "react";
import Image from "next/image";

interface AuthCardFooterDiyaProps {
  caption?: string;
  showDots?: boolean;
}

export const AuthCardFooterDiya: React.FC<AuthCardFooterDiyaProps> = ({
  caption = "Traditional Products for a Better Tomorrow",
  showDots = true,
}) => {
  const [activeDot, setActiveDot] = useState(0);

  return (
    <div
      style={{
        position: "relative",
        width: "calc(100% + 4.5rem)",
        margin: "1.75rem -2.25rem -2.25rem -2.25rem",
        height: "135px",
        overflow: "hidden",
        borderBottomLeftRadius: "var(--radius-card)",
        borderBottomRightRadius: "var(--radius-card)",
        borderTop: "1px solid var(--color-border-subtle)",
      }}
    >
      <Image
        src="/images/product_diyas.jpg"
        alt="Handcrafted Vedic burning diyas and organic dhoop"
        fill
        sizes="(max-width: 600px) 100vw, 480px"
        style={{ objectFit: "cover", objectPosition: "center 75%" }}
      />

      {/* Subtle Warm Gradient Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 40%, rgba(32,35,60,0.55) 100%)",
        }}
      />

      {/* Caption & Slider Dots Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "0.75rem",
          left: "1.25rem",
          right: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#FFFFFF",
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontSize: "0.76rem",
            fontWeight: 600,
            textShadow: "0 1px 3px rgba(0,0,0,0.6)",
            color: "#FFFFFF",
          }}
        >
          {caption}
        </span>

        {showDots && (
          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveDot(idx)}
                aria-label={`Slide ${idx + 1}`}
                style={{
                  width: activeDot === idx ? "16px" : "6px",
                  height: "6px",
                  borderRadius: "9999px",
                  backgroundColor: activeDot === idx ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
