"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  fetchCurrentStore,
  updateCurrentStore,
  publishStore,
  unpublishStore,
  StoreDetails,
} from "@/lib/sellerApi";
import {
  Settings,
  Store,
  Globe,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Save,
  Power,
  Shield,
  Sparkles,
} from "lucide-react";

export default function SellerSettingsPage() {
  const { currentRole, activeTenantId } = useAuth();
  const isOwner = currentRole === "STORE_OWNER";

  const [store, setStore] = useState<StoreDetails | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentStore(activeTenantId || undefined)
      .then((data) => {
        setStore(data);
        setName(data.name);
        setDescription(data.description || "");
        setContactEmail(data.contactEmail);
        setContactPhone(data.contactPhone || "");
        setLogoUrl(data.logoUrl || "");
        setBannerUrl(data.bannerUrl || "");
      })
      .catch((err) => {
        setError(err.message || "Failed to load store settings.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [activeTenantId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Store name cannot be empty.");
      return;
    }
    if (!contactEmail.trim()) {
      setError("Contact email is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateCurrentStore(
        {
          name: name.trim(),
          description: description.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          logoUrl: logoUrl.trim() || undefined,
          bannerUrl: bannerUrl.trim() || undefined,
        },
        activeTenantId || undefined
      );

      setStore(updated);
      setSuccessToast("Store settings saved successfully!");
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to update store settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!store) return;
    setIsTogglingPublish(true);
    setError(null);
    try {
      let updated: StoreDetails;
      if (store.isPublished) {
        updated = await unpublishStore(activeTenantId || undefined);
        setSuccessToast("Store unpublished. Storefront is now offline for maintenance.");
      } else {
        updated = await publishStore(activeTenantId || undefined);
        setSuccessToast("Store published! Your storefront is now live to the public.");
      }
      setStore(updated);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to toggle publishing state.");
    } finally {
      setIsTogglingPublish(false);
    }
  };

  if (!isOwner) {
    return (
      <AppShell title="Access Denied" breadcrumbs={[{ label: "Seller" }, { label: "Settings" }]}>
        <AccessDenied requiredRole="STORE_OWNER" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Store Settings"
      breadcrumbs={[
        { label: "Seller", href: "/seller/dashboard" },
        { label: "Settings" },
      ]}
    >
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
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
              Store Profile & Branding
            </h1>
            <Badge variant="indigo">Owner Only</Badge>
          </div>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Manage public store details, contact channels, and storefront availability.
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

        {/* Storefront Publishing Status Box */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Globe size={18} style={{ color: "var(--color-primary)" }} />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)", margin: 0 }}>
                Storefront Availability
              </h3>
              <Badge variant={store?.isPublished ? "success" : "orange"}>
                {store?.isPublished ? "LIVE TO PUBLIC" : "OFFLINE / DRAFT"}
              </Badge>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)", marginTop: "0.3rem" }}>
              {store?.isPublished
                ? "Your store is currently visible to online customers and accepting orders."
                : "Your store is currently hidden from public browsing. Only authenticated staff can view it."}
            </p>
          </div>

          <Button
            variant={store?.isPublished ? "outline" : "primary"}
            onClick={handleTogglePublish}
            isLoading={isTogglingPublish}
          >
            <Power size={14} style={{ marginRight: "0.35rem" }} />
            <span>{store?.isPublished ? "Unpublish Store" : "Publish Store Live"}</span>
          </Button>
        </div>

        {/* Store Profile Form */}
        <form onSubmit={handleSaveSettings}>
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              padding: "1.5rem",
              marginBottom: "1.25rem",
            }}
          >
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "1rem" }}>
              Business Profile
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Store Business Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Store URL Handle (Slug)
                </label>
                <input
                  type="text"
                  value={store?.slug || ""}
                  disabled
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                    backgroundColor: "var(--color-bg)",
                    color: "var(--color-text-secondary)",
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "0.74rem", color: "var(--color-text-secondary)", marginTop: "0.2rem", display: "block" }}>
                  Public address: gaushilp.in/store/{store?.slug}
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Store Bio & Artisan Mission
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.88rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Contact Details Card */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              padding: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "1rem" }}>
              Customer Support Contact
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Support Email Address *
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  Support Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              <Save size={14} style={{ marginRight: "0.35rem" }} />
              <span>Save Store Settings</span>
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
