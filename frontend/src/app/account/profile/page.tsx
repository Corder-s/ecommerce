"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import {
  User,
  Mail,
  Phone,
  FileText,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Save,
  X,
  Edit2,
} from "lucide-react";
import {
  getCustomerProfile,
  updateCustomerProfile,
  CustomerProfile,
  UpdateCustomerProfileDto,
} from "@/lib/customerApi";

export default function CustomerProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [formData, setFormData] = useState<UpdateCustomerProfileDto>({
    name: "",
    phone: "",
    avatarUrl: "",
    bio: "",
    dateOfBirth: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getCustomerProfile();
        setProfile(data);
        setFormData({
          name: data.name || "",
          phone: data.phone || "",
          avatarUrl: data.avatarUrl || "",
          bio: data.bio || "",
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split("T")[0] : "",
        });
      } catch (err) {
        toast({ type: "error", title: "Failed to retrieve customer profile" });
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [toast]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = "Full name must be at least 2 characters long";
    } else if (formData.name.trim().length > 100) {
      errors.name = "Full name cannot exceed 100 characters";
    }

    if (formData.phone && formData.phone.trim().length > 0) {
      const phoneRegex = /^\+?[0-9\s-]{10,15}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errors.phone = "Phone must be a valid number between 10 and 15 digits";
      }
    }

    if (formData.avatarUrl && formData.avatarUrl.trim().length > 0) {
      try {
        new URL(formData.avatarUrl.trim());
      } catch {
        errors.avatarUrl = "Avatar URL must be a valid HTTPS or HTTP URL";
      }
    }

    if (formData.bio && formData.bio.length > 500) {
      errors.bio = "Bio cannot exceed 500 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({ type: "error", title: "Please correct the highlighted validation errors." });
      return;
    }

    setIsSaving(true);
    try {
      const payload: UpdateCustomerProfileDto = {
        name: formData.name?.trim(),
        phone: formData.phone?.trim() || undefined,
        avatarUrl: formData.avatarUrl?.trim() || undefined,
        bio: formData.bio?.trim() || undefined,
        dateOfBirth: formData.dateOfBirth
          ? new Date(formData.dateOfBirth).toISOString()
          : undefined,
      };

      const updated = await updateCustomerProfile(payload);
      setProfile(updated);
      setIsEditing(false);
      toast({ type: "success", title: "Profile updated successfully!" });
    } catch (err) {
      toast({ type: "error", title: "Failed to save profile changes. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
        avatarUrl: profile.avatarUrl || "",
        bio: profile.bio || "",
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "",
      });
    }
    setFormErrors({});
    setIsEditing(false);
  };

  return (
    <AppShell
      title="Profile Settings"
      breadcrumbs={[
        { label: "GauShilp OS", href: "/" },
        { label: "My Account", href: "/account" },
        { label: "Profile Settings" },
      ]}
    >
      <div style={{ maxWidth: "860px", margin: "0 auto", width: "100%" }}>
        {/* Header Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
              Customer Profile Settings
            </h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.92rem", margin: "0.3rem 0 0 0" }}>
              Manage your personal identity, contact details, and spiritual artisan preferences
            </p>
          </div>

          {!isEditing && (
            <Button
              variant="primary"
              leftIcon={<Edit2 size={16} />}
              onClick={() => setIsEditing(true)}
              disabled={isLoading}
            >
              Edit Profile
            </Button>
          )}
        </div>

        {isLoading ? (
          <Card variant="elevated" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <Skeleton height="60px" />
              <Skeleton height="45px" />
              <Skeleton height="45px" />
              <Skeleton height="100px" />
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSave}>
            <Card variant="elevated" style={{ padding: "2.25rem" }}>
              {/* Profile Avatar & Identity Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                  paddingBottom: "1.75rem",
                  borderBottom: "1px solid var(--color-border)",
                  marginBottom: "1.75rem",
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(91, 92, 226, 0.12)",
                    border: "2px solid var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-primary)",
                    fontSize: "2rem",
                    fontWeight: 700,
                    overflow: "hidden",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  {formData.avatarUrl ? (
                    <Image src={formData.avatarUrl} alt={formData.name || "Avatar"} fill style={{ objectFit: "cover" }} />
                  ) : (
                    formData.name?.charAt(0) || "U"
                  )}
                </div>

                <div>
                  <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
                    {profile?.name || "Customer Account"}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
                    <Badge variant="success">Active Account</Badge>
                    <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                      Customer ID: {profile?.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Input Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
                {/* Full Name */}
                <div>
                  <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    disabled={!isEditing || isSaving}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={formErrors.name}
                    helperText="Your official name for delivery consignments."
                  />
                </div>

                {/* Email (Readonly Protected Identity Field) */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--color-text-main)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Email Address <Lock size={12} style={{ display: "inline", verticalAlign: "middle", marginLeft: "4px" }} />
                  </label>
                  <input
                    type="text"
                    value={profile?.email || ""}
                    disabled
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.9rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "rgba(228, 230, 244, 0.45)",
                      color: "var(--color-text-secondary)",
                      fontSize: "0.9rem",
                      cursor: "not-allowed",
                    }}
                  />
                  <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "0.35rem" }}>
                    Protected identity field. Managed via authentication credentials.
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <Input
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    disabled={!isEditing || isSaving}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    error={formErrors.phone}
                    helperText="Required for shipping tracking and courier delivery updates."
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--color-text-main)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    disabled={!isEditing || isSaving}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.9rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      backgroundColor: isEditing ? "#FFFFFF" : "var(--color-bg)",
                      color: "var(--color-text-main)",
                      fontSize: "0.9rem",
                    }}
                  />
                  <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "0.35rem" }}>
                    Used for festive auspicious blessings and birthday rewards.
                  </div>
                </div>
              </div>

              {/* Avatar URL */}
              <div style={{ marginTop: "1.5rem" }}>
                <Input
                  label="Avatar Image URL"
                  name="avatarUrl"
                  value={formData.avatarUrl}
                  disabled={!isEditing || isSaving}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  error={formErrors.avatarUrl}
                  helperText="Direct public URL to your profile photo or avatar."
                />
              </div>

              {/* Biography / Notes */}
              <div style={{ marginTop: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--color-text-main)",
                    marginBottom: "0.4rem",
                  }}
                >
                  Personal Bio & Artisan Interests
                </label>
                <textarea
                  rows={4}
                  value={formData.bio}
                  disabled={!isEditing || isSaving}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about your love for sacred temple incense, desi cow crafts, and traditional puja traditions..."
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "var(--radius-md)",
                    border: formErrors.bio ? "1px solid var(--color-danger)" : "1px solid var(--color-border)",
                    backgroundColor: isEditing ? "#FFFFFF" : "var(--color-bg)",
                    color: "var(--color-text-main)",
                    fontSize: "0.9rem",
                    resize: "vertical",
                  }}
                />
                {formErrors.bio && (
                  <div style={{ color: "var(--color-danger)", fontSize: "0.78rem", marginTop: "0.3rem" }}>
                    {formErrors.bio}
                  </div>
                )}
                <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "0.35rem" }}>
                  Max 500 characters. Visible to verified master artisans packaging your customized orders.
                </div>
              </div>

              {/* Action Buttons in Edit Mode */}
              {isEditing && (
                <div
                  style={{
                    marginTop: "2rem",
                    paddingTop: "1.5rem",
                    borderTop: "1px solid var(--color-border)",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "0.75rem",
                  }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    leftIcon={<X size={16} />}
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    leftIcon={<Save size={16} />}
                    isLoading={isSaving}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </Card>
          </form>
        )}
      </div>
    </AppShell>
  );
}
