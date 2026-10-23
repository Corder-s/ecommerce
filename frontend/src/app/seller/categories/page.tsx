"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  ProductCategory,
} from "@/lib/sellerApi";
import {
  Tags,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Package,
} from "lucide-react";

export default function SellerCategoriesPage() {
  const { currentRole, activeTenantId } = useAuth();
  const isAuthorized = ["STORE_OWNER", "STORE_MANAGER"].includes(currentRole);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCategories(activeTenantId || undefined);
      setCategories(data);
    } catch (err: any) {
      setError(err.message || "Failed to load product categories.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: ProductCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description || "");
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError("Category name is required.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      if (editingCategory) {
        await updateCategory(
          editingCategory.id,
          { name: formName.trim(), description: formDescription.trim() },
          activeTenantId || undefined
        );
      } else {
        await createCategory(
          {
            name: formName.trim(),
            slug: formSlug.trim() || undefined,
            description: formDescription.trim(),
          },
          activeTenantId || undefined
        );
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      setModalError(err.message || "Failed to save category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteCategory(deletingCategory.id, activeTenantId || undefined);
      setDeletingCategory(null);
      loadCategories();
    } catch (err: any) {
      setDeleteError(err.message || "Cannot delete category referenced by products.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <AppShell title="Access Denied" breadcrumbs={[{ label: "Seller" }, { label: "Categories" }]}>
        <AccessDenied requiredRole="STORE_OWNER or STORE_MANAGER" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Category Management"
      breadcrumbs={[
        { label: "Seller", href: "/seller/dashboard" },
        { label: "Categories" },
      ]}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--color-text-main)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Product Categories
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Organise your artisan catalogue into structured collections for customer navigation.
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal}>
          <Plus size={16} style={{ marginRight: "0.4rem" }} />
          <span>New Category</span>
        </Button>
      </div>

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

      {/* Delete Error Notification Banner */}
      {deleteError && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(224, 49, 49, 0.08)",
            border: "1px solid rgba(224, 49, 49, 0.3)",
            color: "#c92a2a",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={16} />
            <span>{deleteError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDeleteError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Delete Category Confirmation Dialog */}
      {deletingCategory && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(224, 49, 49, 0.08)",
            border: "1px solid rgba(224, 49, 49, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={18} style={{ color: "#c92a2a" }} />
            <div>
              <strong style={{ fontSize: "0.9rem", color: "#c92a2a" }}>
                Delete Category &quot;{deletingCategory.name}&quot;?
              </strong>
              <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                Categories can only be deleted if they contain 0 associated products.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeletingCategory(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
            >
              Confirm Deletion
            </Button>
          </div>
        </div>
      )}

      {/* Categories Table Card */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--color-bg)",
                  borderBottom: "1px solid var(--color-border)",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Category Name
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  URL Slug
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Description
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Associated Products
                </th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    No categories created yet. Click &quot;New Category&quot; to add your first collection.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr
                    key={cat.id}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Tags size={15} style={{ color: "var(--color-primary)" }} />
                        <span>{cat.name}</span>
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                      /{cat.slug}
                    </td>

                    <td style={{ padding: "0.85rem 1rem", color: "var(--color-text-secondary)", maxWidth: "340px" }}>
                      {cat.description || "—"}
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          color: "var(--color-primary)",
                          backgroundColor: "rgba(91, 92, 226, 0.08)",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "var(--radius-pill)",
                        }}
                      >
                        <Package size={12} /> {cat.productCount} products
                      </span>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(cat)}
                          title="Edit Category"
                        >
                          <Edit size={13} />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeleteError(null);
                            setDeletingCategory(cat);
                          }}
                          title="Delete Category"
                          style={{ color: "#c92a2a" }}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Category"}
      >
        <form onSubmit={handleSaveCategory}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {modalError && (
              <div
                style={{
                  padding: "0.65rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(224, 49, 49, 0.08)",
                  color: "#c92a2a",
                  fontSize: "0.84rem",
                }}
              >
                {modalError}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                Category Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Vedic Cow Dung Diyas"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!editingCategory && (!formSlug || formSlug === "")) {
                    setFormSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "")
                    );
                  }
                }}
                required
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              />
            </div>

            {!editingCategory && (
              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                  URL Slug
                </label>
                <input
                  type="text"
                  placeholder="e.g. vedic-cow-dung-diyas"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.35rem" }}>
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief description for customer catalog browsing..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.88rem",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                {editingCategory ? "Save Changes" : "Create Category"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
