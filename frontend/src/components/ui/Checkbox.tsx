"use client";

import React from "react";
import { Check } from "lucide-react";

export interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
}) => {
  const checkboxId = id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <label
      htmlFor={checkboxId}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.55rem",
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        fontSize: "0.86rem",
        color: "var(--color-text-secondary)",
      }}
    >
      <input
        type="checkbox"
        id={checkboxId}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
      />

      <div
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "5px",
          border: checked ? "1.5px solid var(--color-primary)" : "1.5px solid var(--color-border)",
          backgroundColor: checked ? "var(--color-primary)" : "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          transition: "all var(--transition-fast)",
          flexShrink: 0,
        }}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </div>

      {label && <span>{label}</span>}
    </label>
  );
};
