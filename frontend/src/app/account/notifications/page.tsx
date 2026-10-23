"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/context/ToastContext";
import {
  Bell,
  CheckCheck,
  Check,
  Package,
  Truck,
  CreditCard,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  getCustomerNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  CustomerNotification,
  NotificationType,
} from "@/lib/customerApi";

type FilterTab = "ALL" | "UNREAD" | "ORDERS" | "SYSTEM";

export default function CustomerNotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadNotifications = async (targetPage = 1) => {
    setIsLoading(true);
    try {
      const data = await getCustomerNotifications({ page: targetPage, limit: 15 });
      setNotifications(data.notifications || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast({ type: "error", title: "Failed to retrieve notifications" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(1);
  }, []);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await markNotificationAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      toast({ type: "success", title: "Marked as read" });
    } catch {
      toast({ type: "error", title: "Failed to update notification state" });
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })),
      );
      toast({ type: "success", title: "All notifications marked as read" });
    } catch {
      toast({ type: "error", title: "Failed to mark all as read" });
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "ORDER_CREATED":
      case "ORDER_CONFIRMED":
        return <Package size={18} style={{ color: "var(--color-primary)" }} />;
      case "SHIPMENT_DISPATCHED":
      case "SHIPMENT_DELIVERED":
      case "ORDER_SHIPPED":
      case "ORDER_DELIVERED":
        return <Truck size={18} style={{ color: "var(--color-accent-teal)" }} />;
      case "PAYMENT_SUCCEEDED":
      case "PAYMENT_FAILED":
        return <CreditCard size={18} style={{ color: "var(--color-accent-orange)" }} />;
      case "SYSTEM_ALERT":
      case "ORDER_CANCELLED":
        return <AlertCircle size={18} style={{ color: "var(--color-danger)" }} />;
      default:
        return <Bell size={18} style={{ color: "var(--color-primary)" }} />;
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === "UNREAD") return notif.readAt === null;
    if (activeTab === "ORDERS") {
      return [
        "ORDER_CREATED",
        "ORDER_CONFIRMED",
        "ORDER_SHIPPED",
        "ORDER_DELIVERED",
        "ORDER_CANCELLED",
        "SHIPMENT_DISPATCHED",
        "SHIPMENT_DELIVERED",
      ].includes(notif.type);
    }
    if (activeTab === "SYSTEM") {
      return ["SYSTEM_ALERT", "PAYMENT_SUCCEEDED", "PAYMENT_FAILED"].includes(notif.type);
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  return (
    <AppShell
      title="Notifications"
      breadcrumbs={[
        { label: "GauShilp OS", href: "/" },
        { label: "My Account", href: "/account" },
        { label: "Notifications" },
      ]}
    >
      <div style={{ maxWidth: "960px", margin: "0 auto", width: "100%" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
                Notification Centre
              </h1>
              {unreadCount > 0 && (
                <Badge variant="indigo" withDot={false}>
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.92rem", margin: "0.3rem 0 0 0" }}>
              Real-time updates regarding order dispatch, payment verification, and artisan news
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck size={16} />}
              onClick={handleMarkAllRead}
              isLoading={isMarkingAll}
            >
              Mark All as Read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {[
            { label: "All Updates", value: "ALL" as const },
            { label: `Unread (${unreadCount})`, value: "UNREAD" as const },
            { label: "Order & Transit", value: "ORDERS" as const },
            { label: "System & Payments", value: "SYSTEM" as const },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "var(--radius-pill)",
                border: activeTab === tab.value ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                backgroundColor: activeTab === tab.value ? "var(--color-primary)" : "#FFFFFF",
                color: activeTab === tab.value ? "#FFFFFF" : "var(--color-text-main)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Skeleton height="80px" />
            <Skeleton height="80px" />
            <Skeleton height="80px" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card variant="elevated" style={{ padding: "3.5rem" }}>
            <EmptyState
              icon={<Bell size={40} />}
              title="No Notifications Found"
              description={
                activeTab === "UNREAD"
                  ? "You have read all your notifications! Great job staying up to date."
                  : "No notifications found in this category."
              }
              action={
                <Link href="/account">
                  <Button variant="primary">Back to Dashboard</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {filteredNotifications.map((notif) => {
              const isUnread = notif.readAt === null;

              return (
                <Card
                  key={notif.id}
                  variant="elevated"
                  style={{
                    padding: "1.25rem",
                    backgroundColor: isUnread ? "rgba(91, 92, 226, 0.03)" : "#FFFFFF",
                    border: isUnread ? "1.5px solid rgba(91, 92, 226, 0.35)" : "1px solid var(--color-border)",
                    boxShadow: isUnread ? "0 2px 10px rgba(91, 92, 226, 0.06)" : "none",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        backgroundColor: isUnread ? "rgba(91, 92, 226, 0.12)" : "var(--color-bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                          {notif.title}
                        </span>
                        {isUnread && (
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: "var(--color-primary)",
                              display: "inline-block",
                            }}
                            title="Unread"
                          />
                        )}
                      </div>

                      <p style={{ margin: "0.3rem 0 0.5rem 0", fontSize: "0.88rem", color: "var(--color-text-secondary)", lineHeight: 1.45 }}>
                        {notif.message}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Clock size={12} />
                          {new Date(notif.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {notif.data && typeof notif.data === "object" && "orderId" in notif.data && (
                          <Link
                            href={`/account/orders/${String(notif.data.orderId)}`}
                            style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}
                          >
                            View Order Details →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Check size={14} />}
                      onClick={() => handleMarkAsRead(notif.id)}
                      title="Mark as read"
                    >
                      Mark Read
                    </Button>
                  )}
                </Card>
              );
            })}

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: "1.25rem" }}>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={loadNotifications} />
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
