"use client";

import React, { useState } from "react";
import { Bell, ChevronDown, Check } from "lucide-react";

export const DashboardNavbar: React.FC = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState("Shri Krishna Gaushala (Vrindavan)");

  const stores = [
    "Shri Krishna Gaushala (Vrindavan)",
    "Surabhi Vedic Gaushala (Pushkar)",
    "Kamdhenu Seva Dham (Ujjain)",
  ];

  return (
    <header
      className="glass-panel"
      style={{
        height: "72px",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        position: "sticky",
        top: 0,
        zIndex: 30,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
      }}
    >
      {/* Store Switcher */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setStoreMenuOpen(!storeMenuOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.5rem 0.95rem",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--color-border)",
            backgroundColor: "#FFFFFF",
            cursor: "pointer",
            fontSize: "0.88rem",
            fontWeight: 700,
            color: "var(--color-text-main)",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "var(--color-success)",
            }}
          />
          <span>{selectedStore}</span>
          <ChevronDown size={15} color="var(--color-text-secondary)" />
        </button>

        {storeMenuOpen && (
          <div
            className="card-elevated animate-fade-up"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              width: "280px",
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem",
              boxShadow: "var(--shadow-lg)",
              zIndex: 50,
            }}
          >
            {stores.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSelectedStore(s);
                  setStoreMenuOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor: selectedStore === s ? "var(--color-primary-subtle)" : "transparent",
                  color: selectedStore === s ? "var(--color-primary)" : "var(--color-text-main)",
                  fontSize: "0.84rem",
                  fontWeight: selectedStore === s ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{s}</span>
                {selectedStore === s && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View notifications"
            style={{
              position: "relative",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "1px solid var(--color-border)",
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
            }}
          >
            <Bell size={18} />
            <span
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--color-accent-orange)",
              }}
            />
          </button>

          {showNotifications && (
            <div
              className="card-elevated animate-fade-up"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "320px",
                backgroundColor: "#FFFFFF",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-xl)",
                padding: "1rem",
                zIndex: 50,
              }}
            >
              <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                Gaushala Activity
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.82rem" }}>
                <div style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--color-surface-muted)" }}>
                  <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>New order #GS-89021 placed</div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.74rem" }}>3x Vedic Cow Dung Diyas &bull; 14:22</div>
                </div>
                <div style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--color-surface-muted)" }}>
                  <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>Artisan payout processed</div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.74rem" }}>₹14,800 sent to Vrindavan SHG &bull; Yesterday</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            padding: "0.35rem 0.75rem",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--color-border)",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "var(--color-primary)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.82rem",
              fontWeight: 700,
            }}
          >
            VR
          </div>
          <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--color-text-main)" }}>
            Vrindavan Admin
          </span>
        </div>
      </div>
    </header>
  );
};
