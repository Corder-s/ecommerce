"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { GauShilpLogo } from "@/components/brand/GauShilpLogo";
import { AuthCardFooterDiya } from "@/components/auth/AuthCardFooterDiya";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ToastProvider, useToast } from "@/context/ToastContext";
import { loginUser } from "@/lib/authApi";

function LoginCard() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("you@example.com");
  const [password, setPassword] = useState("password123");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!email.trim() || !email.includes("@")) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password || password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const session = await loginUser({ email, password, rememberMe });
      toast({
        type: "success",
        title: "Welcome Back!",
        message: `Signed in as ${session.user.name}.`,
      });
      // Redirect to seller dashboard as shown in reference (Mitti Craft Studio)
      router.push("/dashboard");
    } catch {
      toast({
        type: "error",
        title: "Sign In Failed",
        message: "Please check your credentials and try again.",
      });
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

      {/* Headings */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: "1.65rem",
            fontWeight: 800,
            color: "var(--color-text-main)",
            letterSpacing: "-0.02em",
            marginBottom: "0.45rem",
          }}
        >
          Welcome back
        </h1>
        <p
          style={{
            fontSize: "0.88rem",
            color: "var(--color-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Sign in to manage your store or continue shopping beautiful handmade products from across India.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        <Input
          type="email"
          placeholder="you@example.com"
          leftIcon={<Mail size={18} />}
          value={email}
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          type="password"
          placeholder="••••••••••••"
          leftIcon={<Lock size={18} />}
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* Remember me and Forgot password row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onChange={setRememberMe}
            label="Remember me"
          />

          <Link
            href="/forgot-password"
            style={{
              color: "var(--color-primary)",
              fontWeight: 600,
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            Forgot password?
          </Link>
        </div>

        {/* Primary Action Button */}
        <Button
          type="submit"
          size="lg"
          variant="primary"
          isLoading={isLoading}
          style={{ width: "100%", marginTop: "0.25rem" }}
        >
          Sign in &rarr;
        </Button>

        {/* OR Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "0.4rem 0",
            gap: "0.75rem",
          }}
        >
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-border)" }} />
          <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.06em" }}>
            OR
          </span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-border)" }} />
        </div>

        {/* Secondary Action: Create an Account */}
        <Link href="/register" style={{ width: "100%", textDecoration: "none" }}>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            style={{ width: "100%" }}
          >
            Create an account
          </Button>
        </Link>
      </form>

      {/* Bottom Card Diya Photography */}
      <AuthCardFooterDiya
        caption="1 Traditional Products for a Better Tomorrow"
        showDots={true}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <ToastProvider>
      <AuthCardLayout maxWidth="460px">
        <LoginCard />
      </AuthCardLayout>
    </ToastProvider>
  );
}
