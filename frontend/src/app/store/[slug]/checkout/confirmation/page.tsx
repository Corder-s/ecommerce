"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  MapPin,
  Calendar,
  CreditCard,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  getPublicStore,
  PublicStore,
} from "@/lib/storefrontApi";
import {
  getOrderDetails,
  initiateOrderPayment,
  simulateSandboxPaymentSuccess,
  CreatedOrderResponse,
} from "@/lib/checkoutApi";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";

interface ConfirmationContentProps {
  slug: string;
}

function ConfirmationContent({ slug }: ConfirmationContentProps) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "ord_mock_101";
  const { toast } = useToast();

  const [store, setStore] = useState<PublicStore | null>(null);
  const [order, setOrder] = useState<CreatedOrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);

  const fetchStatus = async () => {
    try {
      const [storeData, orderData] = await Promise.all([
        getPublicStore(slug),
        getOrderDetails(orderId),
      ]);
      setStore(storeData);
      setOrder(orderData);
    } catch {
      toast({ type: "error", title: "Could not retrieve order confirmation details" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [slug, orderId]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchStatus();
    toast({ type: "info", title: "Refreshed order & payment status" });
  };

  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    try {
      await simulateSandboxPaymentSuccess(orderId);
      await fetchStatus();
      toast({
        type: "success",
        title: "Sandbox Payment Succeeded",
        message: "Order marked as PAID and CONFIRMED.",
      });
    } catch {
      toast({ type: "error", title: "Simulation failed" });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRetryPayment = async () => {
    setIsRetryingPayment(true);
    try {
      await initiateOrderPayment(orderId, { paymentMethod: "upi" });
      await fetchStatus();
      toast({
        type: "info",
        title: "Payment Retried",
        message: "New payment session initiated for this existing order.",
      });
    } catch {
      toast({ type: "error", title: "Failed to retry payment" });
    } finally {
      setIsRetryingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
        <div style={{ height: "100px", borderBottom: "1px solid var(--color-border)", backgroundColor: "#FFFFFF" }} />
        <div className="container" style={{ padding: "4rem 1.5rem", maxWidth: "680px" }}>
          <Skeleton height="350px" style={{ borderRadius: "var(--radius-xl)" }} />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
        {store && <StorefrontHeader store={store} onOpenCart={() => {}} />}
        <div className="container" style={{ padding: "5rem 1.5rem", textAlign: "center", flex: 1 }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "0.5rem" }}>
            Order Not Found
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "2rem" }}>
            We could not find order details for reference ID: {orderId}.
          </p>
          <Link href={`/store/${slug}`}>
            <Button variant="primary">Return to Storefront</Button>
          </Link>
        </div>
        {store && <StorefrontFooter store={store} />}
      </div>
    );
  }

  const isPaid = order.paymentStatus === "PAID";
  const isFailed = order.paymentStatus === "FAILED";
  const isPending = order.paymentStatus === "PENDING";
  const totalAmountNum =
    typeof order.totalAmount === "object" && "amount" in order.totalAmount
      ? order.totalAmount.amount
      : Number(order.totalAmount);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
      {store && <StorefrontHeader store={store} onOpenCart={() => {}} />}

      <div className="container" style={{ padding: "3.5rem 1.5rem 5rem", maxWidth: "780px", flex: 1 }}>
        {/* Status Card */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--color-border)",
            padding: "2.5rem 2rem",
            boxShadow: "0 8px 30px rgba(32, 35, 60, 0.06)",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          {/* Status Icon */}
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              backgroundColor: isPaid
                ? "rgba(24, 132, 90, 0.12)"
                : isPending
                ? "rgba(255, 156, 67, 0.12)"
                : "rgba(220, 38, 38, 0.12)",
              color: isPaid
                ? "var(--color-success)"
                : isPending
                ? "var(--color-accent-orange)"
                : "#DC2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            {isPaid ? <CheckCircle2 size={36} /> : isPending ? <Clock size={36} /> : <XCircle size={36} />}
          </div>

          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: isPaid
                ? "var(--color-success)"
                : isPending
                ? "var(--color-accent-orange)"
                : "#DC2626",
              display: "block",
              marginBottom: "0.35rem",
            }}
          >
            {isPaid ? "Payment Verified & Order Confirmed" : isPending ? "Order Placed • Payment Pending" : "Payment Incomplete / Failed"}
          </span>

          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
            {isPaid ? "Thank You for Your Sacred Order!" : isPending ? "Order Placed — Awaiting Payment" : "Payment Could Not Be Completed"}
          </h1>

          <p style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)", maxWidth: "560px", margin: "0 auto 1.5rem", lineHeight: 1.55 }}>
            {isPaid
              ? "Your payment has been cryptographically confirmed. Desi cow dung crafts and sacred samagri are now reserved and will be handcrafted with devotion."
              : isPending
              ? "Your order has been recorded. Once your transaction is confirmed through the gateway, your artisan consignment will be prepared."
              : "We could not confirm receipt of your transaction. You can safely retry payment without creating a duplicate order."}
          </p>

          {/* Order Reference Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--color-surface-muted)",
              border: "1px solid var(--color-border)",
              fontSize: "0.88rem",
              fontWeight: 700,
              color: "var(--color-text-main)",
              marginBottom: "1.5rem",
            }}
          >
            <span>Order Number:</span>
            <span style={{ color: "var(--color-primary-deep)", letterSpacing: "0.02em" }}>{order.orderNumber}</span>
          </div>

          {/* Sandbox Test Mode Simulation Trigger */}
          {isPending && (
            <div
              style={{
                backgroundColor: "rgba(91, 92, 226, 0.06)",
                border: "1px dashed var(--color-primary)",
                borderRadius: "var(--radius-lg)",
                padding: "1rem 1.25rem",
                maxWidth: "520px",
                margin: "0 auto 1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", color: "var(--color-primary)", fontWeight: 700, fontSize: "0.85rem" }}>
                <Sparkles size={16} />
                <span>Sandbox Test Gateway Controls</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.45 }}>
                In this test environment, you can simulate verified webhook confirmation from the sandbox gateway.
              </p>
              <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center" }}>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSimulating}
                  onClick={handleSimulatePayment}
                >
                  {isSimulating ? "Simulating Webhook..." : "Simulate Sandbox Payment Success"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isRefreshing}
                  onClick={handleManualRefresh}
                  leftIcon={<RefreshCw size={14} />}
                >
                  Refresh Status
                </Button>
              </div>
            </div>
          )}

          {/* Payment Failed Controls */}
          {isFailed && (
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginBottom: "1.5rem" }}>
              <Button
                variant="primary"
                size="md"
                disabled={isRetryingPayment}
                onClick={handleRetryPayment}
              >
                {isRetryingPayment ? "Retrying..." : "Retry Payment"}
              </Button>
            </div>
          )}

          {/* Navigation Links */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem" }}>
            <Link href={`/account/orders/${order.id}`}>
              <Button variant="secondary" size="md" rightIcon={<ExternalLink size={15} />}>
                View Order in Customer Portal
              </Button>
            </Link>
            <Link href={`/store/${slug}`}>
              <Button variant="outline" size="md">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>

        {/* Order Details Breakdown Card */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--color-border)",
            padding: "2rem",
            boxShadow: "0 4px 16px rgba(32, 35, 60, 0.04)",
          }}
        >
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "1.25rem" }}>
            Summary of Purchased Items
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {order.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--color-text-main)" }}>
                    {item.name || item.productName || "Sacred Craft"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                    Quantity: {item.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                  ₹{(item.subtotal || item.price * item.quantity).toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-main)" }}>Amount Total</span>
            <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--color-primary-deep)" }}>
              ₹{totalAmountNum.toLocaleString("en-IN")} INR
            </span>
          </div>

          {/* Delivery Address Summary */}
          {order.shippingAddress && (
            <div style={{ marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid var(--color-border)" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "0.4rem" }}>
                Delivery Destination
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                <strong>{order.shippingAddress.fullName}</strong> • {order.shippingAddress.phone}
                <br />
                {order.shippingAddress.addressLine1}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
              </div>
            </div>
          )}
        </div>
      </div>

      {store && <StorefrontFooter store={store} />}
    </div>
  );
}

export default function ConfirmationPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Loading order status...
        </div>
      }
    >
      <ConfirmationPageWrapper params={params} />
    </Suspense>
  );
}

function ConfirmationPageWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Verifying order...</div>}>
      <ConfirmationContent slug={unwrappedParams.slug} />
    </Suspense>
  );
}
