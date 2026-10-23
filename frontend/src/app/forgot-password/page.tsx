"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { GauShilpLogo } from "@/components/brand/GauShilpLogo";
import { AuthCardFooterDiya } from "@/components/auth/AuthCardFooterDiya";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ToastProvider, useToast } from "@/context/ToastContext";
import { requestPasswordReset } from "@/lib/authApi";

function ForgotPasswordCard() {
  const { toast } = useToast();
  const [email, setEmail] = useState("you@example.com");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      await requestPasswordReset(email);
      setIsSubmitted(true);
      toast({
        type: "success",
        title: "Instructions Dispatched",
        message: "If an account exists, a secure reset email has been sent.",
      });
    } catch {
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Top Logo */}
      <div style={{ marginBottom: "1.75rem" }}>
        <GauShilpLogo size="md" withTagline={true} />
      </div>

      {/* Floating Security Envelope Illustration */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          margin: "1rem 0 1.5rem",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "90px",
            height: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Envelope Graphic */}
          <div
            style={{
              width: "74px",
              height: "54px",
              borderRadius: "10px",
              backgroundColor: "rgba(91, 92, 226, 0.12)",
              border: "1.5px solid rgba(91, 92, 226, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <Mail size={32} color="var(--color-primary)" opacity={0.8} />

            {/* Floating Lock Badge */}
            <div
              className="animate-scale-in"
              style={{
                position: "absolute",
                top: "-12px",
                right: "-12px",
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #6264EE 0%, #4445C8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                boxShadow: "0 4px 10px rgba(91, 92, 226, 0.35)",
              }}
            >
              <Lock size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Headings */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: "1.55rem",
            fontWeight: 800,
            color: "var(--color-text-main)",
            letterSpacing: "-0.02em",
            marginBottom: "0.45rem",
          }}
        >
          Reset your password
        </h1>
        <p
          style={{
            fontSize: "0.88rem",
            color: "var(--color-text-secondary)",
            lineHeight: 1.5,
            maxWidth: "340px",
            margin: "0 auto",
          }}
        >
          Enter your email address and we&apos;ll send you instructions to reset your password.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        <Input
          type="email"
          placeholder="you@example.com"
          leftIcon={<Mail size={18} />}
          value={email}
          error={error}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Button
          type="submit"
          size="lg"
          variant="primary"
          isLoading={isLoading}
          style={{ width: "100%" }}
        >
          Send reset link &rarr;
        </Button>

        {/* Confirmation Feedback Notice (Shown after submission or in reference preview) */}
        {isSubmitted && (
          <div
            className="animate-fade-up"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-success-light)",
              border: "1px solid rgba(24, 132, 90, 0.25)",
              color: "var(--color-success)",
              fontSize: "0.82rem",
              lineHeight: 1.45,
              fontWeight: 500,
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "var(--color-success)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: "1px",
              }}
            >
              <CheckCircle2 size={13} />
            </div>
            <span>
              If an account with this email exists, we&apos;ll send password reset instructions shortly.
            </span>
          </div>
        )}

        {/* Back to sign in link */}
        <div style={{ textAlign: "center", marginTop: "0.4rem" }}>
          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              color: "var(--color-primary)",
              fontWeight: 600,
              fontSize: "0.88rem",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={15} /> Back to Sign in
          </Link>
        </div>
      </form>

      {/* Bottom Card Diya Photography */}
      <AuthCardFooterDiya
        caption="1 Traditional Products for a Better Tomorrow"
        showDots={false}
      />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <ToastProvider>
      <AuthCardLayout maxWidth="460px">
        <ForgotPasswordCard />
      </AuthCardLayout>
    </ToastProvider>
  );
}
