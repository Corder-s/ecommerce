"use client";

import React, { useState } from "react";
import { X, CheckCircle2, CreditCard, Smartphone, Banknote, ArrowRight, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const CheckoutModal: React.FC = () => {
  const { totalAmount, isCheckoutOpen, closeCheckout, clearCart } = useCart();
  const { toast } = useToast();

  const [step, setStep] = useState<"details" | "payment" | "confirmed">("details");
  const [formData, setFormData] = useState({
    fullName: "Pooja Sharma",
    phone: "9876543210",
    email: "pooja.sharma@example.com",
    address: "Flat 402, Vrinda Meadows, Civil Lines",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302006",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD" | "COD">("UPI");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState("");

  if (!isCheckoutOpen) return null;

  const validateDetails = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Please enter your full name";
    if (!formData.phone.trim() || formData.phone.length < 10) newErrors.phone = "Enter a valid 10-digit mobile number";
    if (!formData.address.trim()) newErrors.address = "Please enter your delivery street address";
    if (!formData.pincode.trim() || formData.pincode.length < 6) newErrors.pincode = "Enter a valid 6-digit Pincode";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateDetails()) {
      setStep("payment");
    }
  };

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    // Simulate real order submission to backend
    await new Promise((resolve) => setTimeout(resolve, 1400));
    setIsSubmitting(false);

    const generatedId = `GS-${Math.floor(10000 + Math.random() * 90000)}`;
    setConfirmedOrderId(generatedId);
    setStep("confirmed");
    clearCart();
    toast({
      type: "success",
      title: "Sacred Order Placed Successfully!",
      message: `Order #${generatedId} is being prepared at the Gaushala.`,
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        backgroundColor: "rgba(32, 35, 60, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
      onClick={closeCheckout}
    >
      <div
        className="card-elevated animate-scale-in"
        style={{
          width: "100%",
          maxWidth: "600px",
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-text-main)" }}>
              {step === "confirmed" ? "Order Confirmed!" : "Sacred Vedic Checkout"}
            </h3>
            {step !== "confirmed" && (
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                Step {step === "details" ? "1 of 2: Delivery Details" : "2 of 2: Payment Method"}
              </div>
            )}
          </div>

          <button
            onClick={closeCheckout}
            aria-label="Close checkout"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "var(--color-text-secondary)",
              display: "flex",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Delivery Details */}
        {step === "details" && (
          <form onSubmit={handleNextToPayment} style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Input
                  label="Full Name"
                  placeholder="e.g. Pooja Sharma"
                  value={formData.fullName}
                  error={errors.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
                <Input
                  label="Mobile Number"
                  placeholder="10-digit mobile"
                  value={formData.phone}
                  error={errors.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <Input
                label="Delivery Address"
                placeholder="Flat / House No, Building, Street"
                value={formData.address}
                error={errors.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                <Input
                  label="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
                <Input
                  label="Pincode"
                  value={formData.pincode}
                  error={errors.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Total: </span>
                <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text-main)" }}>₹{totalAmount}</span>
              </div>
              <Button type="submit" size="lg" variant="primary" rightIcon={<ArrowRight size={18} />}>
                Proceed to Payment
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Payment Method */}
        {step === "payment" && (
          <div style={{ padding: "1.75rem" }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "1rem" }}>
              Select Payment Option
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.75rem" }}>
              {/* UPI Option */}
              <div
                onClick={() => setPaymentMethod("UPI")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  borderRadius: "var(--radius-lg)",
                  border: paymentMethod === "UPI" ? "2px solid var(--color-primary)" : "1.5px solid var(--color-border)",
                  backgroundColor: paymentMethod === "UPI" ? "var(--color-primary-subtle)" : "#FFFFFF",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <Smartphone size={22} color="var(--color-primary)" />
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>Instant UPI (GPay, PhonePe, Paytm)</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>Zero transaction fee &bull; Instant confirmation</div>
                  </div>
                </div>
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "2px solid var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {paymentMethod === "UPI" && (
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--color-primary)" }} />
                  )}
                </div>
              </div>

              {/* Cards / Netbanking */}
              <div
                onClick={() => setPaymentMethod("CARD")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  borderRadius: "var(--radius-lg)",
                  border: paymentMethod === "CARD" ? "2px solid var(--color-primary)" : "1.5px solid var(--color-border)",
                  backgroundColor: paymentMethod === "CARD" ? "var(--color-primary-subtle)" : "#FFFFFF",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <CreditCard size={22} color="var(--color-accent-teal)" />
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>Credit / Debit Card</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>Visa, Mastercard, RuPay & All Major Banks</div>
                  </div>
                </div>
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "2px solid var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {paymentMethod === "CARD" && (
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--color-primary)" }} />
                  )}
                </div>
              </div>

              {/* Cash On Delivery */}
              <div
                onClick={() => setPaymentMethod("COD")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  borderRadius: "var(--radius-lg)",
                  border: paymentMethod === "COD" ? "2px solid var(--color-primary)" : "1.5px solid var(--color-border)",
                  backgroundColor: paymentMethod === "COD" ? "var(--color-primary-subtle)" : "#FFFFFF",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <Banknote size={22} color="var(--color-accent-orange)" />
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>Cash on Delivery</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>Pay when products arrive at your doorstep</div>
                  </div>
                </div>
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "2px solid var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {paymentMethod === "COD" && (
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--color-primary)" }} />
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button size="md" variant="ghost" onClick={() => setStep("details")}>
                Back to Address
              </Button>

              <Button
                size="lg"
                variant="primary"
                isLoading={isSubmitting}
                onClick={handlePlaceOrder}
              >
                Pay & Place Order &bull; ₹{totalAmount}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmed */}
        {step === "confirmed" && (
          <div style={{ padding: "2.5rem 2rem", textAlign: "center" }} className="animate-scale-in">
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                backgroundColor: "var(--color-success-light)",
                color: "var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <CheckCircle2 size={40} />
            </div>

            <h3 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "0.5rem" }}>
              Auspicious Blessings! Order Placed.
            </h3>
            <p style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)", maxWidth: "440px", margin: "0 auto 1.5rem", lineHeight: 1.6 }}>
              Thank you for supporting indigenous gaushalas and traditional artisans. Your Order ID is <strong>{confirmedOrderId}</strong>.
            </p>

            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "var(--color-surface-muted)",
                border: "1px solid var(--color-border-subtle)",
                marginBottom: "2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                color: "var(--color-primary)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              <Sparkles size={16} />
              <span>100% of proceeds directly fund cattle fodder and artisan families.</span>
            </div>

            <Button size="lg" variant="primary" onClick={closeCheckout}>
              Continue Exploring Sacred Crafts
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
