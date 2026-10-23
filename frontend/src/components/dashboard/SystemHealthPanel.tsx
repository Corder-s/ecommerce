"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { SystemHealthData } from "@/lib/adminApi";
import { Activity, Database, Layers, Server, RefreshCw, Cpu } from "lucide-react";

export interface SystemHealthPanelProps {
  health: SystemHealthData | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({
  health,
  isLoading = false,
  onRefresh,
  className = "",
}) => {
  if (isLoading) {
    return (
      <Card variant="elevated" hoverable={false} className={`p-6 ${className}`} style={{ padding: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <Skeleton width="160px" height="20px" />
          <Skeleton width="28px" height="28px" borderRadius="8px" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Skeleton width="100%" height="45px" borderRadius="10px" />
          <Skeleton width="100%" height="45px" borderRadius="10px" />
          <Skeleton width="100%" height="45px" borderRadius="10px" />
          <Skeleton width="100%" height="45px" borderRadius="10px" />
        </div>
      </Card>
    );
  }

  const formatUptime = (seconds?: number) => {
    if (!seconds) return "0m";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Activity size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.01em" }}>
              System Health & Probes
            </h3>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
            Live infrastructure status & connection latency
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            aria-label="Refresh system health"
            title="Refresh operational health"
            style={{
              background: "none",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              padding: "0.35rem 0.5rem",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all var(--transition-fast)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Health Probes List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* 1. API Service Probe */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            backgroundColor: "var(--color-surface-muted)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Server size={18} color="var(--color-primary)" />
            <div>
              <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                API Service
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                Uptime: {formatUptime(health?.uptimeSeconds)} • {health?.environment || "development"}
              </div>
            </div>
          </div>
          <Badge
            variant={
              health?.serviceStatus === "HEALTHY"
                ? "success"
                : health?.serviceStatus === "DEGRADED"
                ? "orange"
                : "danger"
            }
          >
            {health?.serviceStatus || "Unknown"}
          </Badge>
        </div>

        {/* 2. PostgreSQL Database Connectivity */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            backgroundColor: "var(--color-surface-muted)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Database size={18} color="var(--color-accent-teal)" />
            <div>
              <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                PostgreSQL DB
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                Latency: {health?.database.responseTimeMs ?? "—"}ms • Schema: public
              </div>
            </div>
          </div>
          <Badge variant={health?.database.status === "UP" ? "success" : "danger"}>
            {health?.database.status === "UP" ? "Healthy" : "Unavailable"}
          </Badge>
        </div>

        {/* 3. Outbox & Background Job Queues */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            backgroundColor: "var(--color-surface-muted)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Layers size={18} color="var(--color-accent-orange)" />
            <div>
              <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                Job Queue & Outbox
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                Dead Letter: {health?.queues.deadLetterEventsCount ?? 0} • Pending: {health?.queues.pendingEventsCount ?? 0}
              </div>
            </div>
          </div>
          <Badge
            variant={
              health?.queues.status === "HEALTHY"
                ? "success"
                : health?.queues.status === "DEGRADED"
                ? "orange"
                : "danger"
            }
          >
            {health?.queues.status || "Healthy"}
          </Badge>
        </div>

        {/* 4. Redis Cache / Message Broker */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            backgroundColor: "var(--color-surface-muted)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Cpu size={18} color="var(--color-text-secondary)" />
            <div>
              <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                Redis Service
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                {health?.redis.note || "Standalone DB mode"}
              </div>
            </div>
          </div>
          <Badge
            variant={
              health?.redis.status === "HEALTHY"
                ? "success"
                : health?.redis.status === "NOT_CONFIGURED"
                ? "muted"
                : "orange"
            }
          >
            {health?.redis.status === "HEALTHY"
              ? "Healthy"
              : health?.redis.status === "NOT_CONFIGURED"
              ? "Optional / Off"
              : "Unknown"}
          </Badge>
        </div>
      </div>
    </Card>
  );
};
