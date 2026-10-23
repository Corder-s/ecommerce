"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  fetchCurrentSubscription,
  fetchSubscriptionPlans,
  checkoutSubscription,
  cancelSubscription,
  CurrentSubscription,
  SubscriptionPlan,
} from "@/lib/sellerApi";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Zap,
  ArrowUpRight,
  Shield,
  Clock,
  Layers,
  XCircle,
} from "lucide-react";

export default function SellerSubscriptionPage() {
  const { currentRole, activeTenantId } = useAuth();
  const isOwner = currentRole === "STORE_OWNER";

  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("YEARLY");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upgrade Modal
  const [upgradingPlan, setUpgradingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Cancel Confirmation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadSubscriptionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sub, allPlans] = await Promise.all([
        fetchCurrentSubscription(activeTenantId || undefined),
        fetchSubscriptionPlans(),
      ]);
      setSubscription(sub);
      setPlans(allPlans);
      setBillingCycle(sub.billingCycle);
    } catch (err: any) {
      setError(err.message || "Failed to load subscription information.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  const handleCheckout = async (plan: SubscriptionPlan) => {
    setUpgradingPlan(plan);
    setIsCheckingOut(true);
    try {
      await checkoutSubscription(plan.id, billingCycle, activeTenantId || undefined);
      setSuccessToast(`Plan successfully updated to ${plan.name}!`);
      loadSubscriptionData();
      setUpgradingPlan(null);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to initiate subscription checkout.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCancelSub = async () => {
    if (!cancelReason.trim()) {
      alert("Please provide a reason for cancellation.");
      return;
    }
    setIsCancelling(true);
    try {
      await cancelSubscription(cancelReason, activeTenantId || undefined);
      setSuccessToast("Subscription scheduled for cancellation at the end of the current billing period.");
      setShowCancelModal(false);
      loadSubscriptionData();
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to cancel subscription.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (!isOwner) {
    return (
      <AppShell title="Access Denied" breadcrumbs={[{ label: "Seller" }, { label: "Subscription" }]}>
        <AccessDenied requiredRole="STORE_OWNER" />
      </AppShell>
    );
  }

  const productUsagePercent = subscription
    ? Math.min(100, Math.round((subscription.usage.productCount / subscription.usage.maxProducts) * 100))
    : 0;

  const orderUsagePercent = subscription
    ? Math.min(100, Math.round((subscription.usage.monthlyOrderCount / subscription.usage.maxMonthlyOrders) * 100))
    : 0;

  return (
    <AppShell
      title="SaaS Subscription"
      breadcrumbs={[
        { label: "Seller", href: "/seller/dashboard" },
        { label: "Subscription" },
      ]}
    >
      <div style={{ maxWidth: "980px", margin: "0 auto" }}>
        {/* Top Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "var(--color-text-main)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Subscription & Plan Management
            </h1>
            <Badge variant="indigo">Owner Only</Badge>
          </div>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Manage GauShilp OS subscription tier, artisan quotas, and recurring billing.
          </p>
        </div>

        {successToast && (
          <div
            style={{
              marginBottom: "1.25rem",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(24, 132, 90, 0.08)",
              border: "1px solid rgba(24, 132, 90, 0.25)",
              color: "var(--color-success)",
              fontSize: "0.88rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successToast}</span>
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: "1.25rem",
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(224, 49, 49, 0.08)",
              border: "1px solid rgba(224, 49, 49, 0.25)",
              color: "#c92a2a",
              fontSize: "0.88rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Current Active Plan Card */}
        {subscription && (
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              padding: "1.75rem",
              marginBottom: "2rem",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                backgroundColor: "var(--color-primary)",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Sparkles size={18} style={{ color: "var(--color-primary)" }} />
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase" }}>
                    Current Store Plan
                  </span>
                  <Badge variant={subscription.status === "ACTIVE" ? "success" : "orange"}>
                    {subscription.status}
                  </Badge>
                  {subscription.cancelAtPeriodEnd && (
                    <Badge variant="danger">Cancels at Period End</Badge>
                  )}
                </div>

                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text-main)", margin: "0.4rem 0 0.2rem" }}>
                  {subscription.planName}
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                  Billing cycle: <strong>{subscription.billingCycle}</strong> (₹{subscription.price.toLocaleString("en-IN")}/
                  {subscription.billingCycle === "YEARLY" ? "year" : "month"})
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                  Current Billing Period Ends
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-main)", marginTop: "0.2rem" }}>
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                {!subscription.cancelAtPeriodEnd && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelModal(true)}
                    style={{ marginTop: "0.5rem", color: "#c92a2a", borderColor: "rgba(224, 49, 49, 0.3)" }}
                  >
                    Cancel Plan
                  </Button>
                )}
              </div>
            </div>

            {/* Resource Usage Meters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1.5rem",
                paddingTop: "1.25rem",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              {/* Product Quota */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                  <span style={{ fontWeight: 600, color: "var(--color-text-main)" }}>Active Product Listings</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    <strong>{subscription.usage.productCount}</strong> / {subscription.usage.maxProducts} ({productUsagePercent}%)
                  </span>
                </div>
                <div style={{ height: "8px", backgroundColor: "var(--color-bg)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${productUsagePercent}%`,
                      height: "100%",
                      backgroundColor: "var(--color-primary)",
                      borderRadius: "var(--radius-pill)",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>

              {/* Monthly Orders Quota */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                  <span style={{ fontWeight: 600, color: "var(--color-text-main)" }}>Monthly Orders Processed</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    <strong>{subscription.usage.monthlyOrderCount}</strong> / {subscription.usage.maxMonthlyOrders} ({orderUsagePercent}%)
                  </span>
                </div>
                <div style={{ height: "8px", backgroundColor: "var(--color-bg)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${orderUsagePercent}%`,
                      height: "100%",
                      backgroundColor: "var(--color-teal)",
                      borderRadius: "var(--radius-pill)",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Subscription Plans Section */}
        <div style={{ marginBottom: "1.25rem", textAlign: "center" }}>
          <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-text-main)" }}>
            Available GauShilp OS Tiers
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Select an upgraded tier to increase your product catalogue limits and enable multi-warehouse fulfillment.
          </p>

          {/* Billing Cycle Switcher */}
          <div style={{ display: "inline-flex", padding: "0.25rem", backgroundColor: "#FFFFFF", borderRadius: "var(--radius-pill)", border: "1px solid var(--color-border)", marginTop: "1rem" }}>
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "var(--radius-pill)",
                border: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                backgroundColor: billingCycle === "MONTHLY" ? "var(--color-primary)" : "transparent",
                color: billingCycle === "MONTHLY" ? "#FFFFFF" : "var(--color-text-secondary)",
                transition: "all 0.15s ease",
              }}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("YEARLY")}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "var(--radius-pill)",
                border: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                backgroundColor: billingCycle === "YEARLY" ? "var(--color-primary)" : "transparent",
                color: billingCycle === "YEARLY" ? "#FFFFFF" : "var(--color-text-secondary)",
                transition: "all 0.15s ease",
              }}
            >
              Yearly (Save ~17%)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
            marginBottom: "2rem",
          }}
        >
          {plans.map((p) => {
            const isCurrent = subscription?.planId === p.id;
            const price = billingCycle === "YEARLY" ? p.priceYearly : p.priceMonthly;

            return (
              <div
                key={p.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "var(--radius-lg)",
                  border: isCurrent ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  boxShadow: isCurrent ? "0 8px 24px rgba(91, 92, 226, 0.12)" : "none",
                }}
              >
                {isCurrent && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-12px",
                      right: "1.5rem",
                      backgroundColor: "var(--color-primary)",
                      color: "#FFFFFF",
                      padding: "0.2rem 0.65rem",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    Active Tier
                  </div>
                )}

                <h4 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
                  {p.name}
                </h4>

                <div style={{ margin: "1rem 0" }}>
                  <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--color-text-main)" }}>
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginLeft: "0.35rem" }}>
                    /{billingCycle === "YEARLY" ? "yr" : "mo"}
                  </span>
                </div>

                <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
                  Limit: <strong>{p.maxProducts} products</strong> • {p.maxMonthlyOrders} monthly orders
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem 0", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                  {p.features.map((f, i) => (
                    <li key={i} style={{ fontSize: "0.82rem", color: "var(--color-text-main)", display: "flex", alignItems: "flex-start", gap: "0.45rem" }}>
                      <CheckCircle2 size={14} style={{ color: "var(--color-success)", marginTop: "0.15rem", flexShrink: 0 }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isCurrent ? "outline" : "primary"}
                  disabled={isCurrent || isCheckingOut}
                  onClick={() => handleCheckout(p)}
                  isLoading={upgradingPlan?.id === p.id && isCheckingOut}
                  style={{ width: "100%" }}
                >
                  {isCurrent ? "Current Plan" : `Switch to ${p.name}`}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Cancel Subscription Modal */}
        {showCancelModal && (
          <Modal
            isOpen={true}
            onClose={() => setShowCancelModal(false)}
            title="Cancel SaaS Subscription"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ fontSize: "0.86rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                Your subscription will remain active until the end of your current period (
                <strong>
                  {subscription &&
                    new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN")}
                </strong>
                ). Afterward, your store will revert to the Artisan Free tier.
              </p>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Please share why you are cancelling:
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Seasonal pause in artisan production..."
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.85rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                  Keep Subscription
                </Button>
                <Button variant="danger" onClick={handleCancelSub} isLoading={isCancelling}>
                  Confirm Cancellation
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
