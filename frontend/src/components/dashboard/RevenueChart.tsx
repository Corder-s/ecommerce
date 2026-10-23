"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";

type Timeframe = "7D" | "30D" | "90D" | "1Y";

interface DataPoint {
  label: string;
  revenue: number;
  orders: number;
}

const TIMEFRAME_DATA: Record<Timeframe, { total: string; points: DataPoint[] }> = {
  "7D": {
    total: "₹ 58,400",
    points: [
      { label: "Mon", revenue: 6400, orders: 18 },
      { label: "Tue", revenue: 8200, orders: 24 },
      { label: "Wed", revenue: 7800, orders: 22 },
      { label: "Thu", revenue: 9400, orders: 29 },
      { label: "Fri", revenue: 11200, orders: 36 },
      { label: "Sat", revenue: 8900, orders: 27 },
      { label: "Sun", revenue: 6500, orders: 20 },
    ],
  },
  "30D": {
    total: "₹ 2,48,920",
    points: [
      { label: "Week 1", revenue: 54000, orders: 190 },
      { label: "Week 2", revenue: 68000, orders: 245 },
      { label: "Week 3", revenue: 59000, orders: 215 },
      { label: "Week 4", revenue: 67920, orders: 242 },
    ],
  },
  "90D": {
    total: "₹ 7,12,400",
    points: [
      { label: "Month 1", revenue: 210000, orders: 740 },
      { label: "Month 2", revenue: 253480, orders: 890 },
      { label: "Month 3", revenue: 248920, orders: 875 },
    ],
  },
  "1Y": {
    total: "₹ 28,45,000",
    points: [
      { label: "Q1", revenue: 560000, orders: 1980 },
      { label: "Q2", revenue: 680000, orders: 2410 },
      { label: "Q3", revenue: 745000, orders: 2650 },
      { label: "Q4", revenue: 860000, orders: 3050 },
    ],
  },
};

export const RevenueChart: React.FC = () => {
  const [timeframe, setTimeframe] = useState<Timeframe>("30D");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const currentData = TIMEFRAME_DATA[timeframe];
  const points = currentData.points;
  const maxRevenue = Math.max(...points.map((p) => p.revenue)) * 1.15;

  // Chart dimensions
  const width = 640;
  const height = 220;
  const paddingX = 40;
  const paddingY = 25;

  const getCoordinates = (index: number, val: number) => {
    const x = paddingX + (index / (points.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - (val / maxRevenue) * (height - paddingY * 2);
    return { x, y };
  };

  const pathCoordinates = points.map((p, idx) => getCoordinates(idx, p.revenue));
  const svgPath = pathCoordinates.reduce(
    (acc, coord, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${coord.x} ${coord.y}`,
    ""
  );

  const areaPath = `${svgPath} L ${pathCoordinates[pathCoordinates.length - 1].x} ${
    height - paddingY
  } L ${pathCoordinates[0].x} ${height - paddingY} Z`;

  return (
    <Card variant="elevated" style={{ padding: "1.75rem", width: "100%" }}>
      {/* Chart Top Header & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)" }}>
              Revenue Performance & Sales Volume
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--color-success)",
                backgroundColor: "var(--color-success-light)",
                padding: "0.15rem 0.5rem",
                borderRadius: "var(--radius-pill)",
              }}
            >
              Live Sync
            </span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text-main)", marginTop: "0.25rem" }}>
            {currentData.total}
          </div>
        </div>

        {/* Timeframe Switcher Buttons */}
        <div
          style={{
            display: "flex",
            backgroundColor: "var(--color-surface-muted)",
            padding: "0.25rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          {(["7D", "30D", "90D", "1Y"] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setTimeframe(tf);
                setHoveredIndex(null);
              }}
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "var(--radius-sm)",
                border: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                backgroundColor: timeframe === tf ? "var(--color-primary)" : "transparent",
                color: timeframe === tf ? "#FFFFFF" : "var(--color-text-secondary)",
                boxShadow: timeframe === tf ? "0 2px 6px var(--color-primary-glow)" : "none",
                transition: "all var(--transition-fast)",
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive SVG Chart Canvas */}
      <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "auto", overflow: "visible" }}
          aria-label={`Revenue chart for ${timeframe}`}
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5B5CE2" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#5B5CE2" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#E4E6F4"
            strokeWidth="1.5"
          />
          <line
            x1={paddingX}
            y1={(height - paddingY) / 2}
            x2={width - paddingX}
            y2={(height - paddingY) / 2}
            stroke="#EEF0FA"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Area Fill */}
          <path d={areaPath} fill="url(#revenueGradient)" />

          {/* Line Stroke */}
          <path
            d={svgPath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & Interactive Nodes */}
          {points.map((p, idx) => {
            const coord = getCoordinates(idx, p.revenue);
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Invisible hover trigger hit area */}
                <circle cx={coord.x} cy={coord.y} r="18" fill="transparent" />

                {/* Point dot */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isHovered ? 6 : 4}
                  fill="#FFFFFF"
                  stroke="var(--color-primary)"
                  strokeWidth={isHovered ? 3 : 2}
                  style={{ transition: "all 0.15s ease-out" }}
                />

                {/* X-Axis Label */}
                <text
                  x={coord.x}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--color-text-secondary)"
                  fontWeight="600"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {hoveredIndex !== null && (
          <div
            className="card-elevated animate-fade-in"
            style={{
              position: "absolute",
              top: `${Math.max(10, getCoordinates(hoveredIndex, points[hoveredIndex].revenue).y - 65)}px`,
              left: `${getCoordinates(hoveredIndex, points[hoveredIndex].revenue).x}px`,
              transform: "translateX(-50%)",
              padding: "0.5rem 0.85rem",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-text-main)",
              color: "#FFFFFF",
              fontSize: "0.78rem",
              pointerEvents: "none",
              zIndex: 10,
              boxShadow: "var(--shadow-md)",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ fontWeight: 700 }}>₹{points[hoveredIndex].revenue.toLocaleString()}</div>
            <div style={{ color: "#D0D3EB", fontSize: "0.72rem" }}>
              {points[hoveredIndex].orders} orders &bull; {points[hoveredIndex].label}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
