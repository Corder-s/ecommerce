"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/context/ToastContext";
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Home,
  Briefcase,
} from "lucide-react";
import {
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  CustomerAddress,
  CreateAddressDto,
} from "@/lib/customerApi";

export default function CustomerAddressesPage() {
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Address Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [addressToDelete, setAddressToDelete] = useState<CustomerAddress | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const initialFormState: CreateAddressDto = {
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "IN",
    landmark: "",
    isDefault: false,
    addressType: "HOME",
  };

  const [formData, setFormData] = useState<CreateAddressDto>(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadAddresses = async () => {
    setIsLoading(true);
    try {
      const data = await getCustomerAddresses();
      setAddresses(data);
    } catch {
      toast({ type: "error", title: "Failed to retrieve saved addresses" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const openAddModal = () => {
    setEditingAddressId(null);
    setFormData({
      ...initialFormState,
      isDefault: addresses.length === 0,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setFormData({
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || "",
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country || "IN",
      landmark: addr.landmark || "",
      isDefault: addr.isDefault,
      addressType: addr.addressType || "HOME",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.fullName || formData.fullName.trim().length < 2) {
      errors.fullName = "Recipient name must be between 2 and 100 characters";
    }

    if (!formData.phone || !/^\+?[0-9\s-]{10,15}$/.test(formData.phone.trim())) {
      errors.phone = "Phone must be a valid number between 10 and 15 digits";
    }

    if (!formData.addressLine1 || formData.addressLine1.trim().length < 3) {
      errors.addressLine1 = "Street address line 1 is required (min 3 characters)";
    }

    if (!formData.city || formData.city.trim().length < 2) {
      errors.city = "City is required";
    }

    if (!formData.state || formData.state.trim().length < 2) {
      errors.state = "State is required";
    }

    if (!formData.postalCode || !/^[A-Za-z0-9\s-]{3,10}$/.test(formData.postalCode.trim())) {
      errors.postalCode = "Enter a valid postal code (3-10 alphanumeric characters)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({ type: "error", title: "Please fix form validation errors" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAddressId) {
        await updateCustomerAddress(editingAddressId, formData);
        toast({ type: "success", title: "Address updated successfully" });
      } else {
        await createCustomerAddress(formData);
        toast({ type: "success", title: "Address created successfully" });
      }
      setIsModalOpen(false);
      await loadAddresses();
    } catch {
      toast({ type: "error", title: "Failed to save address. Please check inputs." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (addrId: string) => {
    try {
      await setDefaultCustomerAddress(addrId);
      toast({ type: "success", title: "Default delivery address updated" });
      await loadAddresses();
    } catch {
      toast({ type: "error", title: "Failed to set default address" });
    }
  };

  const confirmDelete = async () => {
    if (!addressToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomerAddress(addressToDelete.id);
      toast({ type: "success", title: "Address deleted successfully" });
      setAddressToDelete(null);
      await loadAddresses();
    } catch {
      toast({ type: "error", title: "Failed to delete address" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppShell
      title="Saved Addresses"
      breadcrumbs={[
        { label: "GauShilp OS", href: "/" },
        { label: "My Account", href: "/account" },
        { label: "Saved Addresses" },
      ]}
    >
      <div style={{ maxWidth: "1080px", margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.75rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
              Saved Delivery Addresses
            </h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.92rem", margin: "0.3rem 0 0 0" }}>
              Manage shipping destinations for your sacred handcrafted artisan orders
            </p>
          </div>

          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openAddModal}>
            Add New Address
          </Button>
        </div>

        {/* Addresses Grid */}
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            <Skeleton height="180px" />
            <Skeleton height="180px" />
          </div>
        ) : addresses.length === 0 ? (
          <Card variant="elevated" style={{ padding: "3rem" }}>
            <EmptyState
              icon={<MapPin size={40} />}
              title="No Saved Addresses"
              description="You have not added any delivery addresses yet. Add your home or workspace address to speed up checkout."
              action={
                <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openAddModal}>
                  Add First Address
                </Button>
              }
            />
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            {addresses.map((addr) => (
              <Card
                key={addr.id}
                variant="elevated"
                style={{
                  padding: "1.5rem",
                  border: addr.isDefault ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  {/* Top Bar with Badges */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "rgba(91, 92, 226, 0.1)",
                          color: "var(--color-primary)",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                        }}
                      >
                        {addr.addressType === "WORK" ? <Briefcase size={12} /> : <Home size={12} />}
                        {addr.addressType || "HOME"}
                      </span>

                      {addr.isDefault && (
                        <Badge variant="success" withDot={false}>
                          DEFAULT ADDRESS
                        </Badge>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        onClick={() => openEditModal(addr)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-text-secondary)",
                          padding: "0.3rem",
                          borderRadius: "var(--radius-sm)",
                        }}
                        title="Edit address"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setAddressToDelete(addr)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-danger)",
                          padding: "0.3rem",
                          borderRadius: "var(--radius-sm)",
                        }}
                        title="Delete address"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Recipient Details */}
                  <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                    {addr.fullName}
                  </h3>

                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem", lineHeight: 1.5 }}>
                    <div>{addr.addressLine1}</div>
                    {addr.addressLine2 && <div>{addr.addressLine2}</div>}
                    {addr.landmark && (
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
                        Landmark: {addr.landmark}
                      </div>
                    )}
                    <div style={{ fontWeight: 600, color: "var(--color-text-main)", marginTop: "0.3rem" }}>
                      {addr.city}, {addr.state} — {addr.postalCode}
                    </div>
                    <div style={{ marginTop: "0.4rem", color: "var(--color-text-main)", fontSize: "0.85rem" }}>
                      📞 {addr.phone}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div style={{ marginTop: "1.25rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
                  {!addr.isDefault ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(addr.id)}
                      style={{ paddingLeft: 0 }}
                    >
                      Set as Default
                    </Button>
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "var(--color-success)", fontWeight: 600 }}>
                      ✓ Used as primary shipping address
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingAddressId ? "Edit Delivery Address" : "Add New Delivery Address"}
          description="Enter verified delivery destination details adhering to Indian postal standards."
          maxWidth="640px"
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Input
                label="Recipient Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                error={formErrors.fullName}
                placeholder="Arjun Sharma"
                required
              />
              <Input
                label="Delivery Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                error={formErrors.phone}
                placeholder="+91 98765 43210"
                required
              />
            </div>

            <Input
              label="Street Address / Flat / Building"
              value={formData.addressLine1}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              error={formErrors.addressLine1}
              placeholder="Flat 402, Vrindavan Heights, Temple Road"
              required
            />

            <Input
              label="Address Line 2 (Optional)"
              value={formData.addressLine2 || ""}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              placeholder="Apartment suite, sector, or colony"
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Input
                label="City / Town"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                error={formErrors.city}
                placeholder="Mathura"
                required
              />
              <Input
                label="State / Province"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                error={formErrors.state}
                placeholder="Uttar Pradesh"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Input
                label="Postal PIN Code"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                error={formErrors.postalCode}
                placeholder="281001"
                required
              />
              <Input
                label="Landmark (Optional)"
                value={formData.landmark || ""}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                placeholder="Opposite Temple Gate 2"
              />
            </div>

            {/* Address Type Selection */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                Address Classification
              </label>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {(["HOME", "WORK", "OTHER"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, addressType: type })}
                    style={{
                      flex: 1,
                      padding: "0.6rem",
                      borderRadius: "var(--radius-md)",
                      border: formData.addressType === type ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      backgroundColor: formData.addressType === type ? "rgba(91, 92, 226, 0.08)" : "#FFFFFF",
                      color: formData.addressType === type ? "var(--color-primary)" : "var(--color-text-main)",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Address Checkbox */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                style={{ width: "16px", height: "16px", accentColor: "var(--color-primary)" }}
              />
              <label htmlFor="isDefault" style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--color-text-main)" }}>
                Make this my default delivery address
              </label>
            </div>

            {/* Form Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                {editingAddressId ? "Save Changes" : "Save Address"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={Boolean(addressToDelete)}
          onClose={() => setAddressToDelete(null)}
          title="Delete Saved Address"
          description="Are you sure you want to remove this delivery address? This action cannot be undone."
          maxWidth="460px"
        >
          {addressToDelete && (
            <div>
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "rgba(224, 62, 62, 0.06)",
                  border: "1px solid rgba(224, 62, 62, 0.2)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--color-text-main)" }}>{addressToDelete.fullName}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                  {addressToDelete.addressLine1}, {addressToDelete.city} — {addressToDelete.postalCode}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <Button variant="outline" onClick={() => setAddressToDelete(null)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting}>
                  Confirm Delete
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
