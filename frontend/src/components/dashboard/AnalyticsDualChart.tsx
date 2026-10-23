"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { TimeSeriesPoint } from "@/lib/adminApi";
import { BarChart3 } from "lucide-react";

export interface AnalyticsDualChartProps {
  data: TimeSeriesPoint[];
  isLoading?: boolean;
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
  className?: string;
}

export const AnalyticsDualChart: React.FC<AnalyticsDualChartProps> = ({
  data = [],
  isLoading = false,
  selectedRange = "30D",
  onRangeChange,
  className = "",
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card variant="elevated" hoverable={false} className={`p-6 ${className}`} style={{ padding: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <Skeleton width="180px" height="20px" />
          <Skeleton width="120px" height="28px" borderRadius="16px" />
        </div>
        <Skeleton width="100%" height="220px" borderRadius="12px" />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card variant="elevated" hoverable={false} className={`p-6 ${className}`} style={{ padding: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
              Revenue & Order Trends
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
              Historical performance over the selected timeframe
            </p>
          </div>
        </div>
        <EmptyState
          title="No Time-Series Data Available"
          description="The backend returned aggregate metrics only for this period. Time-series data will populate as orders are recorded."
          icon={<BarChart3 size={28} />}
        />
      </Card>
    );
  }

  // Calculate scales
  const maxRevenue = Math.max(...data.map((d) => d.orderValue), 10000);
  const maxOrders = Math.max(...data.map((d) => d.orderCount), 10);

  const width = 640;
  const height = 230;
  const paddingLeft = 45;
  const paddingRight = 45;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + chartW / 2;
    return paddingLeft + (index / (data.length - 1)) * chartW;
  };

  const getRevenueY = (val: number) => {
    return paddingTop + chartH - (val / maxRevenue) * chartH;
  };

  const getOrderY = (val: number) => {
    return paddingTop + chartH - (val / maxOrders) * chartH;
  };

  // Build SVG path for smooth Revenue curve
  let revenuePath = "";
  let revenueAreaPath = "";

  if (data.length > 0) {
    const points = data.map((d, i) => ({ x: getX(i), y: getRevenueY(d.orderValue) }));
    revenuePath = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      revenuePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    revenueAreaPath = `${revenuePath} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${paddingTop + chartH} Z`;
  }

  // Format currency helpers
  const formatCurrencyK = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${Math.round(val / 1000)}k`;
    return `₹${val}`;
  };

  const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <Card
      variant="elevated"
      hoverable={false}
      className={`animate-fade-up ${className}`}
      style={{
        padding: "1.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* Header with Title & Legend & Range Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.01em" }}>
            Revenue & Order Trends
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
            Daily revenue collections (₹) and order volumes across all gaushalas
          </p>
        </div>

        {/* Legend + Timeframe Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.8rem", fontWeight: 600 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "var(--color-text-main)" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--color-primary)" }} />
              Revenue
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "var(--color-text-main)" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--color-accent-orange)" }} />
              Orders
            </span>
          </div>

          {/* Timeframe Toggles */}
          {onRangeChange && (
            <div
              style={{
                display: "inline-flex",
                backgroundColor: "var(--color-surface-muted)",
                padding: "0.2rem",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--color-border)",
              }}
            >
              {["7D", "30D", "90D"].map((range) => {
                const isActive = selectedRange === range;
                return (
                  <button
                    key={range}
                    onClick={() => onRangeChange(range)}
                    style={{
                      padding: "0.25rem 0.65rem",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "0.75rem",
                      fontWeight: isActive ? 700 : 500,
                      backgroundColor: isActive ? "var(--color-surface-card)" : "transparent",
                      color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                      border: "none",
                      boxShadow: isActive ? "var(--shadow-sm)" : "none",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    {range}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div style={{ position: "relative", width: "100%", height: "230px" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "100%", overflow: "visible" }}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5B5CE2" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#5B5CE2" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + chartH * ratio;
            return (
              <line
                key={i}
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="var(--color-border)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Left Y-axis labels (Revenue) */}
          <text x={paddingLeft - 8} y={paddingTop + 4} textAnchor="end" fontSize="10" fill="var(--color-text-secondary)" fontWeight="600">
            {formatCurrencyK(maxRevenue)}
          </text>
          <text x={paddingLeft - 8} y={paddingTop + chartH / 2 + 3} textAnchor="end" fontSize="10" fill="var(--color-text-secondary)" fontWeight="600">
            {formatCurrencyK(maxRevenue / 2)}
          </text>
          <text x={paddingLeft - 8} y={paddingTop + chartH + 3} textAnchor="end" fontSize="10" fill="var(--color-text-secondary)" fontWeight="600">
            ₹0
          </text>

          {/* Right Y-axis labels (Orders) */}
          <text x={width - paddingRight + 8} y={paddingTop + 4} textAnchor="start" fontSize="10" fill="var(--color-accent-orange)" fontWeight="600">
            {maxOrders}
          </text>
          <text x={width - paddingRight + 8} y={paddingTop + chartH / 2 + 3} textAnchor="start" fontSize="10" fill="var(--color-accent-orange)" fontWeight="600">
            {Math.round(maxOrders / 2)}
          </text>
          <text x={width - paddingRight + 8} y={paddingTop + chartH + 3} textAnchor="start" fontSize="10" fill="var(--color-accent-orange)" fontWeight="600">
            0
          </text>

          {/* Area Fill for Revenue */}
          <path d={revenueAreaPath} fill="url(#revenueGrad)" />

          {/* Revenue Smooth Curve */}
          <path d={revenuePath} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" />

          {/* Order Volume Series (Orange Line + Nodes) */}
          {data.map((d, i) => {
            if (i === 0) return null;
            const prevX = getX(i - 1);
            const prevY = getOrderY(data[i - 1].orderCount);
            const currX = getX(i);
            const currY = getOrderY(d.orderCount);
            return (
              <line
                key={`order-line-${i}`}
                x1={prevX}
                y1={prevY}
                x2={currX}
                y2={currY}
                stroke="var(--color-accent-orange)"
                strokeWidth="2.5"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Nodes and Hover Triggers */}
          {data.map((d, i) => {
            const cx = getX(i);
            const revY = getRevenueY(d.orderValue);
            const ordY = getOrderY(d.orderCount);
            const isHovered = hoveredIndex === i;

            return (
              <g key={i} onMouseEnter={() => setHoveredIndex(i)} style={{ cursor: "pointer" }}>
                {/* Invisible hover target bar */}
                <rect
                  x={cx - chartW / (data.length * 2)}
                  y={paddingTop}
                  width={chartW / data.length}
                  height={chartH}
                  fill="transparent"
                />

                {/* Vertical Crosshair Line */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingTop}
                    x2={cx}
                    y2={paddingTop + chartH}
                    stroke="var(--color-primary)"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Revenue Circle Node */}
                <circle
                  cx={cx}
                  cy={revY}
                  r={isHovered ? 6 : 4}
                  fill="#FFFFFF"
                  stroke="var(--color-primary)"
                  strokeWidth="2.5"
                />

                {/* Order Circle Node */}
                <circle
                  cx={cx}
                  cy={ordY}
                  r={isHovered ? 6 : 4}
                  fill="#FFFFFF"
                  stroke="var(--color-accent-orange)"
                  strokeWidth="2.5"
                />

                {/* X-axis date label */}
                <text
                  x={cx}
                  y={paddingTop + chartH + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill={isHovered ? "var(--color-primary)" : "var(--color-text-secondary)"}
                  fontWeight={isHovered ? 700 : 500}
                >
                  {d.date}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Interactive Tooltip */}
        {hoveredData && hoveredIndex !== null && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: `${Math.min(Math.max(10, (getX(hoveredIndex) / width) * 100), 80)}%`,
              transform: "translateX(-50%)",
              backgroundColor: "rgba(32, 35, 60, 0.94)",
              backdropFilter: "blur(6px)",
              color: "#FFFFFF",
              padding: "0.6rem 0.85rem",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
              pointerEvents: "none",
              fontSize: "0.78rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              zIndex: 10,
              minWidth: "140px",
            }}
          >
            <div style={{ fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: "0.2rem" }}>
              {hoveredData.date}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              <span style={{ color: "#A5B4FC" }}>Revenue:</span>
              <span style={{ fontWeight: 700 }}>₹{hoveredData.orderValue.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              <span style={{ color: "#FDBA74" }}>Orders:</span>
              <span style={{ fontWeight: 700 }}>{hoveredData.orderCount}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
