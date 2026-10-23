"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building,
  Banknote,
  Truck,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Lock,
  Sparkles,
  Plus,
  Check,
} from "lucide-react";
import {
  getPublicStore,
  getPublicCart,
  CartSummary,
  PublicStore,
} from "@/lib/storefrontApi";
import {
  validateCheckout,
  createOrder,
  initiateOrderPayment,
  CheckoutValidationResponse,
  CheckoutAddressSnapshot,
} from "@/lib/checkoutApi";
import { getCustomerAddresses, CustomerAddress } from "@/lib/customerApi";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";

interface CheckoutPageContentProps {
  slug: string;
}

type CheckoutStep = 1 | 2 | 3;

function CheckoutPageContent({ slug }: CheckoutPageContentProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<CheckoutStep>(1);
  const [store, setStore] = useState<PublicStore | null>(null);
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [isNewAddress, setIsNewAddress] = useState(false);

  // Inline address form state
  const [addressForm, setAddressForm] = useState({
    fullName: "Arjun Sharma",
    phone: "+91 98765 43210",
    addressLine1: "Plot 42, Vedic Marg, Govardhan Road",
    addressLine2: "",
    city: "Mathura",
    state: "Uttar Pradesh",
    postalCode: "281001",
    country: "IN",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [customerNote, setCustomerNote] = useState("");

  // Step 2 & 3 state
  const [validationData, setValidationData] = useState<CheckoutValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("upi");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial store, cart, and addresses
  useEffect(() => {
    let isMounted = true;
    async function initCheckout() {
      try {
        const [storeData, cartData] = await Promise.all([
          getPublicStore(slug),
          getPublicCart(),
        ]);
        if (!isMounted) return;
        setStore(storeData);
        setCart(cartData);

        // Load saved addresses if available
        try {
          const addrs = await getCustomerAddresses();
          if (isMounted && addrs.length > 0) {
            setSavedAddresses(addrs);
            const def = addrs.find((a) => a.isDefault) || addrs[0];
            setSelectedAddressId(def.id);
          } else {
            setIsNewAddress(true);
          }
        } catch {
          setIsNewAddress(true);
        }
      } catch (err: any) {
        toast({ type: "error", title: "Failed to initialize checkout" });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    initCheckout();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Validation for Step 1
  const validateAddressForm = (): boolean => {
    if (!isNewAddress && selectedAddressId) {
      return true;
    }

    const errors: Record<string, string> = {};
    if (!addressForm.fullName.trim()) errors.fullName = "Full name is required";
    if (!addressForm.phone.trim() || addressForm.phone.length < 10)
      errors.phone = "Valid 10-digit phone number is required";
    if (!addressForm.addressLine1.trim()) errors.addressLine1 = "Street address is required";
    if (!addressForm.city.trim()) errors.city = "City is required";
    if (!addressForm.state.trim()) errors.state = "State is required";
    if (!addressForm.postalCode.trim() || !/^\d{6}$/.test(addressForm.postalCode.trim()))
      errors.postalCode = "Valid 6-digit postal code is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Proceed from Step 1 to Step 2 (Runs server checkout/validate)
  const handleProceedToReview = async () => {
    if (!validateAddressForm()) {
      toast({ type: "error", title: "Please correct address errors before proceeding" });
      return;
    }

    setIsValidating(true);
    try {
      const payload = isNewAddress
        ? {
            tenantId: store?.id,
            shippingAddress: addressForm,
          }
        : {
            tenantId: store?.id,
            addressId: selectedAddressId,
          };

      const result = await validateCheckout(payload);
      setValidationData(result);
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast({
        type: "error",
        title: "Checkout Validation Failed",
        message: err.message || "Please check your cart items and address.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Proceed from Step 2 to Step 3
  const handleProceedToPayment = () => {
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Order & Payment Placement (Step 3)
  const handlePlaceOrderAndPay = async () => {
    if (isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const idempotencyKey = `idem-ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      // 1. Submit Order to Backend
      const orderPayload = isNewAddress
        ? {
            tenantId: store?.id,
            shippingAddress: addressForm,
            customerNote: customerNote.trim() || undefined,
            idempotencyKey,
          }
        : {
            tenantId: store?.id,
            addressId: selectedAddressId,
            customerNote: customerNote.trim() || undefined,
            idempotencyKey,
          };

      const createdOrder = await createOrder(orderPayload, idempotencyKey);

      // 2. Initiate Payment Session
      const paymentSession = await initiateOrderPayment(createdOrder.id, {
        paymentMethod,
        returnUrl: `${window.location.origin}/store/${slug}/checkout/confirmation?orderId=${createdOrder.id}`,
        idempotencyKey,
      });

      toast({
        type: "success",
        title: "Order Placed Successfully",
        message: `Order #${createdOrder.orderNumber} created.`,
      });

      // Redirect to Order Confirmation page
      router.push(`/store/${slug}/checkout/confirmation?orderId=${createdOrder.id}`);
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to Place Order",
        message: err.message || "An unexpected error occurred. Please try again.",
      });
      setIsSubmittingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
        <div style={{ height: "100px", borderBottom: "1px solid var(--color-border)", backgroundColor: "#FFFFFF" }} />
        <div className="container" style={{ padding: "4rem 1.5rem" }}>
          <Skeleton width="40%" height="32px" style={{ marginBottom: "2rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
            <Skeleton height="400px" />
            <Skeleton height="300px" />
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
        {store && <StorefrontHeader store={store} onOpenCart={() => {}} />}
        <div className="container" style={{ padding: "5rem 1.5rem", textAlign: "center", flex: 1 }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "0.5rem" }}>
            Your Cart is Empty
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "2rem" }}>
            Please add sacred Vedic crafts to your cart before proceeding to checkout.
          </p>
          <Link href={`/store/${slug}/products`}>
            <Button variant="primary">Browse Sacred Crafts</Button>
          </Link>
        </div>
        {store && <StorefrontFooter store={store} />}
      </div>
    );
  }

  const finalAmount = validationData?.pricing.total.amount ?? cart.subtotal;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
      {store && <StorefrontHeader store={store} onOpenCart={() => {}} />}

      {/* Progress Stepper Bar */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid var(--color-border)",
          padding: "1.25rem 0",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2rem",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            {/* Step 1 */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: step >= 1 ? "var(--color-primary)" : "var(--color-surface-muted)",
                  color: step >= 1 ? "#FFFFFF" : "var(--color-text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  boxShadow: step === 1 ? "0 0 0 3px rgba(91, 92, 226, 0.2)" : "none",
                }}
              >
                {step > 1 ? <Check size={16} /> : "1"}
              </div>
              <span
                style={{
                  fontSize: "0.88rem",
                  fontWeight: step === 1 ? 700 : 500,
                  color: step === 1 ? "var(--color-text-main)" : "var(--color-text-secondary)",
                }}
              >
                Delivery Address
              </span>
            </div>

            <div style={{ width: "40px", height: "2px", backgroundColor: step >= 2 ? "var(--color-primary)" : "var(--color-border)" }} />

            {/* Step 2 */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: step >= 2 ? "var(--color-primary)" : "var(--color-surface-muted)",
                  color: step >= 2 ? "#FFFFFF" : "var(--color-text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  boxShadow: step === 2 ? "0 0 0 3px rgba(91, 92, 226, 0.2)" : "none",
                }}
              >
                {step > 2 ? <Check size={16} /> : "2"}
              </div>
              <span
                style={{
                  fontSize: "0.88rem",
                  fontWeight: step === 2 ? 700 : 500,
                  color: step === 2 ? "var(--color-text-main)" : "var(--color-text-secondary)",
                }}
              >
                Order Review
              </span>
            </div>

            <div style={{ width: "40px", height: "2px", backgroundColor: step >= 3 ? "var(--color-primary)" : "var(--color-border)" }} />

            {/* Step 3 */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: step === 3 ? "var(--color-primary)" : "var(--color-surface-muted)",
                  color: step === 3 ? "#FFFFFF" : "var(--color-text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  boxShadow: step === 3 ? "0 0 0 3px rgba(91, 92, 226, 0.2)" : "none",
                }}
              >
                3
              </div>
              <span
                style={{
                  fontSize: "0.88rem",
                  fontWeight: step === 3 ? 700 : 500,
                  color: step === 3 ? "var(--color-text-main)" : "var(--color-text-secondary)",
                }}
              >
                Payment
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Checkout Area */}
      <div className="container" style={{ padding: "3rem 1.5rem 5rem", flex: 1 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "2.5rem",
            alignItems: "flex-start",
          }}
        >
          {/* Left Column: Multi-Step Forms */}
          <div>
            {/* ---------------- STEP 1: DELIVERY ADDRESS ---------------- */}
            {step === 1 && (
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--color-border)",
                  padding: "2rem",
                  boxShadow: "0 4px 16px rgba(32, 35, 60, 0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
                  <MapPin size={22} color="var(--color-primary)" />
                  <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
                    Step 1 — Delivery Address
                  </h2>
                </div>

                {/* Saved Addresses Selector (if available) */}
                {savedAddresses.length > 0 && !isNewAddress && (
                  <div style={{ marginBottom: "2rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-main)", display: "block", marginBottom: "0.75rem" }}>
                      Select Saved Address
                    </label>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => setSelectedAddressId(addr.id)}
                            style={{
                              padding: "1rem 1.25rem",
                              borderRadius: "var(--radius-lg)",
                              border: isSelected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                              backgroundColor: isSelected ? "var(--color-primary-subtle)" : "#FFFFFF",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              transition: "all var(--transition-fast)",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-main)", marginBottom: "0.25rem" }}>
                                {addr.fullName} • {addr.phone}
                              </div>
                              <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                                {addr.addressLine1}, {addr.city}, {addr.state} - {addr.postalCode}
                              </div>
                              {addr.isDefault && (
                                <span
                                  style={{
                                    display: "inline-block",
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    color: "var(--color-primary)",
                                    backgroundColor: "rgba(91, 92, 226, 0.12)",
                                    padding: "0.15rem 0.5rem",
                                    borderRadius: "var(--radius-pill)",
                                    marginTop: "0.4rem",
                                  }}
                                >
                                  Default Delivery Address
                                </span>
                              )}
                            </div>

                            <input
                              type="radio"
                              name="savedAddress"
                              checked={isSelected}
                              onChange={() => setSelectedAddressId(addr.id)}
                              style={{ accentColor: "var(--color-primary)", cursor: "pointer", marginTop: "4px" }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsNewAddress(true)}
                      style={{
                        marginTop: "1rem",
                        background: "none",
                        border: "none",
                        color: "var(--color-primary)",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <Plus size={16} /> Enter a different shipping address
                    </button>
                  </div>
                )}

                {/* Inline Address Form */}
                {isNewAddress && (
                  <div>
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsNewAddress(false)}
                        style={{
                          marginBottom: "1.25rem",
                          background: "none",
                          border: "none",
                          color: "var(--color-primary)",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        ← Back to saved addresses
                      </button>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-main)", display: "block", marginBottom: "0.35rem" }}>
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={addressForm.fullName}
                          onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            borderRadius: "var(--radius-md)",
                            border: formErrors.fullName ? "1.5px solid #DC2626" : "1px solid var(--color-border)",
                            outline: "none",
                            fontSize: "0.9rem",
                          }}
                        />
                        {formErrors.fullName && <span style={{ color: "#DC2626", fontSize: "0.75rem" }}>{formErrors.fullName}</span>}
                      </div>

                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-main)", display: "block", marginBottom: "0.35rem" }}>
                          Mobile Number *
                        </label>
                        <input
                          type="text"
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            borderRadius: "var(--radius-md)",
                            border: formErrors.phone ? "1.5px solid #DC2626" : "1px solid var(--color-border)",
                            outline: "none",
                            fontSize: "0.9rem",
                          }}
                        />
                        {formErrors.phone && <span style={{ color: "#DC2626", fontSize: "0.75rem" }}>{formErrors.phone}</span>}
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-main)", display: "block", marginBottom: "0.35rem" }}>
                          Street Address / Flat / Floor *
                        </label>
                        <input
                          type="text"
                          value={addressForm.addressLine1}
                          onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            borderRadius: "var(--radius-md)",
                            border: formErrors.addressLine1 ? "1.5px solid #DC2626" : "1px solid var(--color-border)",
                            outline: "none",
                            fontSize: "0.9rem",
                          }}
                        />
                        {formErrors.addressLine1 && <span style={{ color: "#DC2626", fontSize: "0.75rem" }}>{formErrors.addressLine1}</span>}
                      </div>

                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-main)", display: "block", marginBottom: "0.35rem" }}>
                          City *
                        </label>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            borderRadius: "var(--radius-md)",
                            border: formErrors.city ? "1.5px solid #DC2626" : "1px solid var(--color-border)",
                            outline: "none",
                            fontSize: "0.9rem",
                          }}
                        />
                        {formErrors.city && <span style={{ color: "#DC2626", fontSize: "0.75rem" }}>{formErrors.city}</span>}
                      </div>

                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-main)", display: "block", marginBottom: "0.35rem" }}>
                          State *
                        </label>
                        <input
                          type="text"
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            borderRadius: "var(--radius-md)",
                            border: formErrors.state ? "1.5px solid #DC2626" : "1px solid var(--color-border)",
                            outline: "none",
                            fontSize: "0.9rem",
                          }}
                        />
                        {formErrors.state && <span style={{ color: "#DC2626", fontSize: "0.75rem" }}>{formErrors.state}</span>}
                      </div>

                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-main)", display: "block", marginBottom: "0.35rem" }}>
                          Postal Code (PIN) *
                        </label>
                        <input
                          type="text"
                          value={addressForm.postalCode}
                          onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            borderRadius: "var(--radius-md)",
                            border: formErrors.postalCode ? "1.5px solid #DC2626" : "1px solid var(--color-border)",
                            outline: "none",
                            fontSize: "0.9rem",
                          }}
                        />
                        {formErrors.postalCode && <span style={{ color: "#DC2626", fontSize: "0.75rem" }}>{formErrors.postalCode}</span>}
                      </div>

                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-main)", display: "block", marginBottom: "0.35rem" }}>
                          Country
                        </label>
                        <input
                          type="text"
                          value="India (IN)"
                          disabled
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--color-border)",
                            backgroundColor: "var(--color-surface-muted)",
                            fontSize: "0.9rem",
                            color: "var(--color-text-secondary)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Continue to Step 2 Action */}
                <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={isValidating}
                    onClick={handleProceedToReview}
                    rightIcon={<ArrowRight size={18} />}
                  >
                    {isValidating ? "Verifying with Server..." : "Proceed to Order Review"}
                  </Button>
                </div>
              </div>
            )}

            {/* ---------------- STEP 2: ORDER REVIEW ---------------- */}
            {step === 2 && validationData && (
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--color-border)",
                  padding: "2rem",
                  boxShadow: "0 4px 16px rgba(32, 35, 60, 0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <ShieldCheck size={22} color="var(--color-primary)" />
                    <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
                      Step 2 — Verified Order Review
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-primary)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Edit Address
                  </button>
                </div>

                {/* Verified Shipping Address Preview */}
                <div
                  style={{
                    backgroundColor: "var(--color-surface-muted)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem 1.25rem",
                    border: "1px solid var(--color-border-subtle)",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                    Verified Delivery Address
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                    {validationData.shippingAddress.fullName} • {validationData.shippingAddress.phone}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                    {validationData.shippingAddress.addressLine1}, {validationData.shippingAddress.city}, {validationData.shippingAddress.state} - {validationData.shippingAddress.postalCode}
                  </div>
                </div>

                {/* Validated Items List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                    Products from {validationData.store.businessName} ({validationData.itemCount} items)
                  </div>

                  {validationData.items.map((item) => (
                    <div
                      key={item.productId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.75rem 0",
                        borderBottom: "1px solid var(--color-border-subtle)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          style={{
                            position: "relative",
                            width: "48px",
                            height: "48px",
                            borderRadius: "var(--radius-sm)",
                            overflow: "hidden",
                            backgroundColor: "var(--color-background)",
                          }}
                        >
                          <Image
                            src={item.image || "/images/product_diyas.jpg"}
                            alt={item.name}
                            fill
                            sizes="48px"
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                            Qty: {item.quantity} × {item.unitPrice.formatted}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                        {item.subtotal.formatted}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Customer Delivery Note */}
                <div style={{ marginBottom: "2rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-main)", display: "block", marginBottom: "0.4rem" }}>
                    Optional Delivery Instructions / Note
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Fragile Vedic terracotta craft. Please call upon arrival."
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Button variant="outline" onClick={() => setStep(1)} leftIcon={<ArrowLeft size={16} />}>
                    Back
                  </Button>
                  <Button variant="primary" size="lg" onClick={handleProceedToPayment} rightIcon={<ArrowRight size={18} />}>
                    Proceed to Payment
                  </Button>
                </div>
              </div>
            )}

            {/* ---------------- STEP 3: PAYMENT METHOD ---------------- */}
            {step === 3 && (
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--color-border)",
                  padding: "2rem",
                  boxShadow: "0 4px 16px rgba(32, 35, 60, 0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
                  <Lock size={22} color="var(--color-primary)" />
                  <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
                    Step 3 — Payment Method
                  </h2>
                </div>

                {/* Sandbox Gateway Notice */}
                <div
                  style={{
                    backgroundColor: "rgba(35, 185, 175, 0.08)",
                    border: "1px solid rgba(35, 185, 175, 0.25)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.85rem 1.1rem",
                    marginBottom: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <Sparkles size={20} color="var(--color-accent-teal)" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", lineHeight: 1.45 }}>
                    <strong style={{ color: "var(--color-text-main)" }}>Sandbox Payment Gateway (Test Mode):</strong>{" "}
                    No real financial charges will be incurred. All test payments are cryptographically verified in isolated database records.
                  </div>
                </div>

                {/* Payment Methods List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
                  {/* Method: UPI */}
                  <div
                    onClick={() => setPaymentMethod("upi")}
                    style={{
                      padding: "1rem 1.25rem",
                      borderRadius: "var(--radius-lg)",
                      border: paymentMethod === "upi" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      backgroundColor: paymentMethod === "upi" ? "var(--color-primary-subtle)" : "#FFFFFF",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: "#FFFFFF",
                          border: "1px solid var(--color-border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-primary)",
                        }}
                      >
                        <QrCode size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                          UPI (GPay / PhonePe / Paytm / BHIM)
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                          Instant remittance directly supporting rural Gaushala artisans
                        </div>
                      </div>
                    </div>
                    <input type="radio" checked={paymentMethod === "upi"} onChange={() => setPaymentMethod("upi")} style={{ accentColor: "var(--color-primary)" }} />
                  </div>

                  {/* Method: Card */}
                  <div
                    onClick={() => setPaymentMethod("card")}
                    style={{
                      padding: "1rem 1.25rem",
                      borderRadius: "var(--radius-lg)",
                      border: paymentMethod === "card" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      backgroundColor: paymentMethod === "card" ? "var(--color-primary-subtle)" : "#FFFFFF",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: "#FFFFFF",
                          border: "1px solid var(--color-border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-primary)",
                        }}
                      >
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                          Credit & Debit Cards (RuPay / Visa / Mastercard)
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                          Encrypted 256-bit SSL transaction gateway
                        </div>
                      </div>
                    </div>
                    <input type="radio" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} style={{ accentColor: "var(--color-primary)" }} />
                  </div>

                  {/* Method: Net Banking */}
                  <div
                    onClick={() => setPaymentMethod("netbanking")}
                    style={{
                      padding: "1rem 1.25rem",
                      borderRadius: "var(--radius-lg)",
                      border: paymentMethod === "netbanking" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      backgroundColor: paymentMethod === "netbanking" ? "var(--color-primary-subtle)" : "#FFFFFF",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: "#FFFFFF",
                          border: "1px solid var(--color-border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-primary)",
                        }}
                      >
                        <Building size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                          Net Banking (SBI / HDFC / ICICI / Axis)
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                          All major Indian scheduled commercial banks supported
                        </div>
                      </div>
                    </div>
                    <input type="radio" checked={paymentMethod === "netbanking"} onChange={() => setPaymentMethod("netbanking")} style={{ accentColor: "var(--color-primary)" }} />
                  </div>

                  {/* Method: COD */}
                  <div
                    onClick={() => setPaymentMethod("cod")}
                    style={{
                      padding: "1rem 1.25rem",
                      borderRadius: "var(--radius-lg)",
                      border: paymentMethod === "cod" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      backgroundColor: paymentMethod === "cod" ? "var(--color-primary-subtle)" : "#FFFFFF",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: "#FFFFFF",
                          border: "1px solid var(--color-border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-primary)",
                        }}
                      >
                        <Banknote size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                          Cash on Delivery (COD)
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                          Pay with cash or UPI QR upon courier doorstep delivery
                        </div>
                      </div>
                    </div>
                    <input type="radio" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} style={{ accentColor: "var(--color-primary)" }} />
                  </div>
                </div>

                {/* Final Submit Action */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Button variant="outline" onClick={() => setStep(2)} leftIcon={<ArrowLeft size={16} />}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={isSubmittingOrder}
                    onClick={handlePlaceOrderAndPay}
                    rightIcon={<Lock size={16} />}
                  >
                    {isSubmittingOrder ? "Confirming Order..." : `Pay ₹${finalAmount.toLocaleString("en-IN")} & Place Order`}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary Sidebar */}
          <div>
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--color-border)",
                padding: "1.75rem",
                boxShadow: "0 4px 16px rgba(32, 35, 60, 0.05)",
                position: "sticky",
                top: "100px",
              }}
            >
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "1.25rem" }}>
                Cart Summary
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Items Subtotal</span>
                  <strong style={{ color: "var(--color-text-main)" }}>₹{cart.subtotal.toLocaleString("en-IN")}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Vedic Craft Delivery</span>
                  <span style={{ color: "var(--color-success)", fontWeight: 700 }}>FREE</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Taxes (GST)</span>
                  <span style={{ color: "var(--color-text-secondary)", fontSize: "0.82rem" }}>Included in price</span>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--color-border)",
                  paddingTop: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "1.5rem",
                }}
              >
                <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-main)" }}>Total Amount</span>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-primary-deep)" }}>
                  ₹{finalAmount.toLocaleString("en-IN")}
                </span>
              </div>

              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.5, textAlign: "center" }}>
                🔒 100% Secure Transaction. Orders are protected by GauShilp OS Buyer Guarantee and rural artisan escrow protection.
              </div>
            </div>
          </div>
        </div>
      </div>

      {store && <StorefrontFooter store={store} />}
    </div>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Loading checkout session...
        </div>
      }
    >
      <CheckoutPageWrapper params={params} />
    </Suspense>
  );
}

function CheckoutPageWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <CheckoutPageContent slug={unwrappedParams.slug} />;
}
