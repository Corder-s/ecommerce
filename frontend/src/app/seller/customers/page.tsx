"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchSellerCustomers,
  SellerCustomer,
} from "@/lib/sellerApi";
import {
  Users,
  Search,
  ShoppingBag,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function SellerCustomersPage() {
  const { currentRole, activeTenantId } = useAuth();
  const isAuthorized = ["STORE_OWNER", "STORE_MANAGER"].includes(currentRole);

  const [customers, setCustomers] = useState<SellerCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSellerCustomers(activeTenantId || undefined);
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load store customers.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  if (!isAuthorized) {
    return (
      <AppShell title="Access Denied" breadcrumbs={[{ label: "Seller" }, { label: "Customers" }]}>
        <AccessDenied requiredRole="STORE_OWNER or STORE_MANAGER" />
      </AppShell>
    );
  }

  const filteredCustomers = search
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          (c.phone && c.phone.includes(search))
      )
    : customers;

  const totalRevenueFromCustomers = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  return (
    <AppShell
      title="Customer Management"
      breadcrumbs={[
        { label: "Seller", href: "/seller/dashboard" },
        { label: "Customers" },
      ]}
    >
      {/* Top Header */}
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
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--color-text-main)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Customer Relationships
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Direct customer directory derived strictly from your verified store orders.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "rgba(91, 92, 226, 0.08)",
              color: "var(--color-primary)",
              fontSize: "0.84rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Users size={14} />
            <span>{customers.length} Verified Buyers</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            padding: "1.25rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--color-border)",
          }}
        >
          <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
            Total Store Buyers
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-main)", marginTop: "0.25rem" }}>
            {customers.length}
          </div>
        </div>

        <div
          style={{
            padding: "1.25rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--color-border)",
          }}
        >
          <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
            Cumulative Customer Spend
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-primary)", marginTop: "0.25rem" }}>
            ₹{totalRevenueFromCustomers.toLocaleString("en-IN")}
          </div>
        </div>

        <div
          style={{
            padding: "1.25rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--color-border)",
          }}
        >
          <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
            Average Spend / Buyer
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-teal)", marginTop: "0.25rem" }}>
            ₹{customers.length > 0 ? Math.round(totalRevenueFromCustomers / customers.length).toLocaleString("en-IN") : "0"}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          padding: "0.65rem 1rem",
          marginBottom: "1.25rem",
          gap: "0.75rem",
        }}
      >
        <Search size={16} style={{ color: "var(--color-text-secondary)" }} />
        <input
          type="text"
          placeholder="Search customer by name, email, or contact number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: "0.88rem",
            width: "100%",
          }}
        />
      </div>

      {/* Customer Directory Table */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--color-bg)",
                  borderBottom: "1px solid var(--color-border)",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Customer Name
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Contact Information
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Primary Location
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Total Orders
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Total Spend
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Latest Purchase
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    Loading customer directory...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem 1rem" }}>
                    <EmptyState
                      icon={<Users size={28} />}
                      title="No customers found"
                      description="No customer records match your query."
                    />
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: "var(--color-text-main)" }}>
                        {c.name}
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontSize: "0.82rem", color: "var(--color-text-main)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Mail size={12} style={{ color: "var(--color-text-secondary)" }} />
                        <span>{c.email}</span>
                      </div>
                      {c.phone && (
                        <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.15rem" }}>
                          <Phone size={11} />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "0.85rem 1rem", color: "var(--color-text-secondary)" }}>
                      {c.city && c.state ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <MapPin size={12} style={{ color: "var(--color-primary)" }} />
                          <span>{c.city}, {c.state}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          color: "var(--color-primary)",
                          backgroundColor: "rgba(91, 92, 226, 0.08)",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "var(--radius-pill)",
                        }}
                      >
                        <ShoppingBag size={12} /> {c.totalOrders} order{c.totalOrders > 1 ? "s" : ""}
                      </span>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 700, color: "var(--color-primary)" }}>
                      ₹{c.totalSpent.toLocaleString("en-IN")}
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", color: "var(--color-text-secondary)", fontSize: "0.82rem" }}>
                      {new Date(c.lastOrderDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
