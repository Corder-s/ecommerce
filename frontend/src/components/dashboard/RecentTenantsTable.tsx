"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { AdminTenantItem, updateTenantStatus } from "@/lib/adminApi";
import { Store, Search, CheckCircle, AlertTriangle } from "lucide-react";

export interface RecentTenantsTableProps {
  tenants: AdminTenantItem[];
  total: number;
  currentPage: number;
  limit: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onSearchChange: (query: string) => void;
  onTenantUpdated?: () => void;
  className?: string;
}

export const RecentTenantsTable: React.FC<RecentTenantsTableProps> = ({
  tenants = [],
  total = 0,
  currentPage = 1,
  limit = 10,
  isLoading = false,
  onPageChange,
  onSearchChange,
  onTenantUpdated,
  className = "",
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<AdminTenantItem | null>(null);
  const [actionStatus, setActionStatus] = useState<"ACTIVE" | "SUSPENDED">("SUSPENDED");
  const [actionReason, setActionReason] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const totalPages = Math.ceil(total / limit) || 1;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput.trim());
  };

  const openStatusModal = (tenant: AdminTenantItem) => {
    setSelectedTenant(tenant);
    setActionStatus(tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
    setActionReason("");
    setActionError(null);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedTenant) return;
    if (!actionReason.trim()) {
      setActionError("Please provide an administrative reason for this action.");
      return;
    }

    setIsSubmittingAction(true);
    setActionError(null);

    const res = await updateTenantStatus(selectedTenant.id, actionStatus, actionReason);

    setIsSubmittingAction(false);
    if (res.success) {
      setSelectedTenant(null);
      if (onTenantUpdated) onTenantUpdated();
    } else {
      setActionError(res.error || "Failed to update tenant status");
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
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
      {/* Table Header & Search Filter */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Store size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.01em" }}>
              Registered Businesses & Gaushalas
            </h3>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
            Total {total} stores onboarded across GauShilp OS
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem", maxWidth: "320px", width: "100%" }}>
          <Input
            placeholder="Search store name or slug..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            leftIcon={<Search size={16} />}
            style={{ fontSize: "0.84rem" }}
          />
        </form>
      </div>

      {/* Table Container */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height="48px" borderRadius="8px" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState
          title="No Stores Found"
          description="No registered tenants matched your query. Try refining your search keywords."
          icon={<Store size={32} />}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Store / Business Name</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Subscription Plan</TableHead>
              <TableHead>Catalog & Orders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead style={{ textAlign: "right" }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((t) => (
              <TableRow key={t.id}>
                {/* Store Name & Slug */}
                <TableCell>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 700, color: "var(--color-text-main)", fontSize: "0.88rem" }}>
                      {t.businessName}
                    </span>
                    <span style={{ fontSize: "0.74rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      /{t.storeSlug}
                      {t.isPublished && (
                        <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>• Live</span>
                      )}
                    </span>
                  </div>
                </TableCell>

                {/* Email */}
                <TableCell>
                  <span style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>
                    {t.contactEmail}
                  </span>
                </TableCell>

                {/* Subscription Plan */}
                <TableCell>
                  {t.subscription ? (
                    <Badge variant="indigo" withDot={false}>
                      {t.subscription.planName}
                    </Badge>
                  ) : (
                    <span style={{ fontSize: "0.78rem", color: "var(--color-text-tertiary, #94A3B8)" }}>
                      Trial / None
                    </span>
                  )}
                </TableCell>

                {/* Products & Orders count */}
                <TableCell>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-main)" }}>
                    {t.counts.products} items • {t.counts.orders} orders
                  </span>
                </TableCell>

                {/* Status Badge */}
                <TableCell>
                  <Badge
                    variant={
                      t.status === "ACTIVE"
                        ? "success"
                        : t.status === "SUSPENDED"
                        ? "danger"
                        : "orange"
                    }
                  >
                    {t.status === "ACTIVE" ? "Active" : t.status === "SUSPENDED" ? "Suspended" : "Pending"}
                  </Badge>
                </TableCell>

                {/* Joined Date */}
                <TableCell>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    {formatDate(t.createdAt)}
                  </span>
                </TableCell>

                {/* Authorized Actions */}
                <TableCell style={{ textAlign: "right" }}>
                  <Button
                    size="sm"
                    variant={t.status === "ACTIVE" ? "danger" : "secondary"}
                    onClick={() => openStatusModal(t)}
                    style={{ fontSize: "0.76rem", padding: "0.25rem 0.65rem" }}
                  >
                    {t.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            Showing page {currentPage} of {totalPages}
          </span>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}

      {/* Tenant Suspension / Reactivation Modal */}
      {selectedTenant && (
        <Modal
          isOpen={!!selectedTenant}
          onClose={() => setSelectedTenant(null)}
          title={actionStatus === "SUSPENDED" ? "Suspend Store Account" : "Reactivate Store Account"}
          maxWidth="540px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem 0" }}>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "0.85rem",
                borderRadius: "var(--radius-md)",
                backgroundColor:
                  actionStatus === "SUSPENDED" ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.08)",
                border:
                  actionStatus === "SUSPENDED"
                    ? "1px solid rgba(239, 68, 68, 0.2)"
                    : "1px solid rgba(34, 197, 94, 0.2)",
              }}
            >
              {actionStatus === "SUSPENDED" ? (
                <AlertTriangle size={20} color="var(--color-danger)" style={{ flexShrink: 0 }} />
              ) : (
                <CheckCircle size={20} color="var(--color-success)" style={{ flexShrink: 0 }} />
              )}
              <div style={{ fontSize: "0.84rem", color: "var(--color-text-main)" }}>
                You are about to change the status of <strong>{selectedTenant.businessName}</strong> to{" "}
                <span style={{ fontWeight: 800 }}>{actionStatus}</span>.
                {actionStatus === "SUSPENDED" && (
                  <p style={{ marginTop: "0.25rem", color: "var(--color-danger)" }}>
                    Suspending this store will immediately hide its public storefront and block seller logins.
                  </p>
                )}
              </div>
            </div>

            {/* Administrative Reason Field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                Administrative Reason (Required for Audit Log)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Violation of artisan handmade policy section 4.2..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.86rem",
                  fontFamily: "inherit",
                  outline: "none",
                  backgroundColor: "var(--color-surface-card)",
                }}
              />
            </div>

            {actionError && (
              <div style={{ color: "var(--color-danger)", fontSize: "0.82rem", fontWeight: 600 }}>
                {actionError}
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setSelectedTenant(null)}
                disabled={isSubmittingAction}
              >
                Cancel
              </Button>
              <Button
                variant={actionStatus === "SUSPENDED" ? "danger" : "primary"}
                size="md"
                onClick={handleConfirmStatusUpdate}
                isLoading={isSubmittingAction}
              >
                Confirm {actionStatus === "SUSPENDED" ? "Suspension" : "Reactivation"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};
