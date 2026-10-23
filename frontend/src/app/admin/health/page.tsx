"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SystemHealthPanel } from "@/components/dashboard/SystemHealthPanel";
import { fetchSystemHealth, SystemHealthData } from "@/lib/adminApi";

export default function AdminHealthPage() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHealth = useCallback(() => {
    setIsLoading(true);
    fetchSystemHealth().then((res) => {
      setHealth(res.data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchSystemHealth().then((res) => {
      if (!isMounted) return;
      setHealth(res.data);
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell
      title="System Health & Probes"
      breadcrumbs={[
        { label: "Administration", href: "/admin/overview" },
        { label: "System Health" },
      ]}
    >
      <div style={{ maxWidth: "780px" }}>
        <SystemHealthPanel
          health={health}
          isLoading={isLoading}
          onRefresh={loadHealth}
        />
      </div>
    </AppShell>
  );
}
