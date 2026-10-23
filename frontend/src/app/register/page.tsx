"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Store, Mail, Lock } from "lucide-react";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { GauShilpLogo } from "@/components/brand/GauShilpLogo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ToastProvider, useToast } from "@/context/ToastContext";
import { registerSeller } from "@/lib/authApi";

function RegisterCard() {
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fullName: "Rahul Sharma",
    businessName: "Mitti Craft Studio",
    email: "you@example.com",
    phone: "98765 43210",
    password: "",
    confirmPassword: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Please enter your full name";
    if (!formData.businessName.trim()) newErrors.businessName = "Please enter business/gaushala name";
    if (!formData.email.trim() || !formData.email.includes("@")) newErrors.email = "Enter a valid email address";
    if (!formData.phone.trim() || formData.phone.length < 10) newErrors.phone = "Enter a valid phone number";
    if (!formData.password || formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!agreedToTerms) newErrors.terms = "You must agree to the Terms and Privacy Policy";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const session = await registerSeller({
        fullName: formData.fullName,
        businessName: formData.businessName,
        email: formData.email,
        phone: `+91 ${formData.phone}`,
        password: formData.password,
      });

      toast({
        type: "success",
        title: "Account Created Successfully!",
        message: `Welcome, ${session.user.name}. Your store has been provisioned.`,
      });

      router.push("/dashboard");
    } catch {
      toast({
        type: "error",
        title: "Registration Failed",
        message: "An error occurred while creating your account. Please try again.",
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
          Create your account
        </h1>
        <p
          style={{
            fontSize: "0.88rem",
            color: "var(--color-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Join thousands of artisans and gaushalas across India.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Row 1: Full name & Business name */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.3rem", display: "block" }}>
              Full name
            </label>
            <Input
              placeholder="Rahul Sharma"
              leftIcon={<User size={16} />}
              value={formData.fullName}
              error={errors.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.3rem", display: "block" }}>
              Business name
            </label>
            <Input
              placeholder="Mitti Craft Studio"
              leftIcon={<Store size={16} />}
              value={formData.businessName}
              error={errors.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Row 2: Email */}
        <div>
          <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.3rem", display: "block" }}>
            Email
          </label>
          <Input
            type="email"
            placeholder="you@example.com"
            leftIcon={<Mail size={16} />}
            value={formData.email}
            error={errors.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        {/* Row 3: Phone number with +91 Flag */}
        <div>
          <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.3rem", display: "block" }}>
            Phone number
          </label>
          <Input
            placeholder="+91 98765 43210"
            leftIcon={
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.88rem" }}>
                <span>🇮🇳</span>
                <span style={{ fontWeight: 600, color: "var(--color-text-main)", fontSize: "0.85rem" }}>+91</span>
              </span>
            }
            value={formData.phone}
            error={errors.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>

        {/* Row 4: Password */}
        <div>
          <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.3rem", display: "block" }}>
            Password
          </label>
          <Input
            type="password"
            placeholder="Create a password"
            leftIcon={<Lock size={16} />}
            value={formData.password}
            error={errors.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
        </div>

        {/* Row 5: Confirm Password */}
        <div>
          <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.3rem", display: "block" }}>
            Confirm password
          </label>
          <Input
            type="password"
            placeholder="Confirm your password"
            leftIcon={<Lock size={16} />}
            value={formData.confirmPassword}
            error={errors.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />
        </div>

        {/* Terms Agreement Checkbox */}
        <div style={{ marginTop: "0.2rem" }}>
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onChange={setAgreedToTerms}
            label={
              <span>
                I agree to the{" "}
                <Link href="#" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                  Privacy Policy
                </Link>
              </span>
            }
          />
          {errors.terms && (
            <div style={{ fontSize: "0.78rem", color: "var(--color-danger)", marginTop: "0.25rem" }}>
              {errors.terms}
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <Button
          type="submit"
          size="lg"
          variant="primary"
          isLoading={isLoading}
          style={{ width: "100%", marginTop: "0.5rem" }}
        >
          Create account &rarr;
        </Button>

        {/* Already have an account link */}
        <div style={{ textAlign: "center", fontSize: "0.86rem", color: "var(--color-text-secondary)", marginTop: "0.5rem" }}>
          Already have an account?{" "}
          <Link
            href="/login"
            style={{
              color: "var(--color-primary)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <ToastProvider>
      <AuthCardLayout maxWidth="500px">
        <RegisterCard />
      </AuthCardLayout>
    </ToastProvider>
  );
}
