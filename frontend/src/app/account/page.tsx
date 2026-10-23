"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  User,
  ShoppingBag,
  MapPin,
  Heart,
  Bell,
  ArrowRight,
  Package,
  Truck,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  getCustomerProfile,
  getCustomerOrders,
  getCustomerAddresses,
  getCustomerWishlist,
  getCustomerNotifications,
  CustomerProfile,
  CustomerOrder,
  CustomerAddress,
  WishlistItem,
  CustomerNotification,
} from "@/lib/customerApi";

export default function CustomerDashboardPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profData, orderData, addrData, wishData, notifData] = await Promise.all([
          getCustomerProfile(),
          getCustomerOrders({ limit: 3 }),
          getCustomerAddresses(),
          getCustomerWishlist({ limit: 4 }),
          getCustomerNotifications({ limit: 3 }),
        ]);

        setProfile(profData);
        setOrders(orderData.orders || []);
        setAddresses(addrData || []);
        setWishlist(wishData.items || []);
        setNotifications(notifData.notifications || []);
      } catch (err) {
        console.error("Failed to load customer dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const calculateProfileCompletion = () => {
    if (!profile) return 0;
    const checks = [
      Boolean(profile.name && profile.name.trim().length > 0),
      Boolean(profile.email && profile.email.trim().length > 0),
      Boolean(profile.phone && profile.phone.trim().length > 0),
      Boolean(profile.avatarUrl && profile.avatarUrl.trim().length > 0),
      Boolean(profile.bio && profile.bio.trim().length > 0),
      Boolean(addresses.length > 0),
    ];
    const completedCount = checks.filter(Boolean).length;
    return Math.round((completedCount / checks.length) * 100);
  };

  const completionPercentage = calculateProfileCompletion();
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

  const getOrderStatusBadge = (status: CustomerOrder["status"]) => {
    switch (status) {
      case "DELIVERED":
        return <Badge variant="success">Delivered</Badge>;
      case "SHIPPED":
        return <Badge variant="teal">Shipped / In Transit</Badge>;
      case "PROCESSING":
        return <Badge variant="indigo">Artisan Preparing</Badge>;
      case "CONFIRMED":
        return <Badge variant="indigo">Confirmed</Badge>;
      case "PLACED":
        return <Badge variant="orange">Order Placed</Badge>;
      case "CANCELLED":
        return <Badge variant="danger">Cancelled</Badge>;
      case "RETURNED":
        return <Badge variant="muted">Returned</Badge>;
      default:
        return <Badge variant="muted">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: CustomerOrder["paymentStatus"]) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success" withDot={false}>Paid</Badge>;
      case "PENDING":
        return <Badge variant="orange" withDot={false}>Payment Pending</Badge>;
      case "FAILED":
        return <Badge variant="danger" withDot={false}>Payment Failed</Badge>;
      case "REFUNDED":
        return <Badge variant="muted" withDot={false}>Refunded</Badge>;
      default:
        return <Badge variant="muted" withDot={false}>{status}</Badge>;
    }
  };

  return (
    <AppShell title="Customer Portal" breadcrumbs={[{ label: "GauShilp OS", href: "/" }, { label: "My Account" }]}>
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        {/* Welcome Section */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(91, 92, 226, 0.08) 0%, rgba(68, 69, 200, 0.04) 100%)",
            borderRadius: "var(--radius-xl)",
            padding: "2rem 2.25rem",
            border: "1px solid rgba(91, 92, 226, 0.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--color-primary)",
                  backgroundColor: "rgba(91, 92, 226, 0.12)",
                  padding: "0.2rem 0.65rem",
                  borderRadius: "var(--radius-pill)",
                }}
              >
                <Sparkles size={13} />
                Sacred Vedic Patron
              </span>
            </div>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
              Namaste, {isLoading ? "Devotee" : profile?.name?.split(" ")[0] || "Valued Customer"}! 🙏
            </h1>
            <p style={{ color: "var(--color-text-secondary)", marginTop: "0.4rem", fontSize: "0.95rem", maxWidth: "560px", lineHeight: 1.5 }}>
              Welcome back to your sacred marketplace hub. Track your handcrafted desi cow dung creations, sacred puja kits, and manage your delivery addresses.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/account/orders">
              <Button variant="secondary" leftIcon={<ShoppingBag size={16} />}>
                My Orders
              </Button>
            </Link>
            <Link href="/account/wishlist">
              <Button variant="primary" leftIcon={<Heart size={16} />}>
                View Wishlist ({wishlist.length})
              </Button>
            </Link>
          </div>
        </div>

        {/* Profile Card & Overview Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {/* Profile Card */}
          <Card variant="elevated" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(91, 92, 226, 0.12)",
                    border: "2px solid var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-primary)",
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {profile?.avatarUrl ? (
                    <Image src={profile.avatarUrl} alt={profile.name} fill style={{ objectFit: "cover" }} />
                  ) : (
                    profile?.name?.charAt(0) || "U"
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                    {isLoading ? <Skeleton width="140px" height="20px" /> : profile?.name || "Customer Account"}
                  </h3>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                    {isLoading ? <Skeleton width="180px" height="16px" /> : profile?.email}
                  </div>
                </div>
              </div>
              <Link href="/account/profile">
                <Button variant="outline" size="sm">
                  Edit Profile
                </Button>
              </Link>
            </div>

            {/* Profile Completion Bar */}
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Profile Completeness</span>
                <span style={{ color: "var(--color-primary)" }}>{completionPercentage}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "7px",
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: "rgba(228, 230, 244, 0.8)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${completionPercentage}%`,
                    height: "100%",
                    borderRadius: "var(--radius-pill)",
                    backgroundColor: "var(--color-primary)",
                    transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </div>
              <p style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                {completionPercentage === 100
                  ? "🎉 Profile details are completely up to date."
                  : "Add contact details & delivery addresses to ensure seamless order delivery."}
              </p>
            </div>

            {/* Quick Details */}
            <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Phone Contact:</span>
                <span style={{ fontWeight: 600, color: "var(--color-text-main)" }}>
                  {profile?.phone || "Not configured"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Account Status:</span>
                <Badge variant={profile?.isActive ? "success" : "danger"} withDot={false}>
                  {profile?.isActive ? "Active Verified" : "Suspended"}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Primary Saved Address Preview */}
          <Card variant="elevated" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MapPin size={18} style={{ color: "var(--color-primary)" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                  Primary Delivery Address
                </h3>
              </div>
              <Link href="/account/addresses">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>
                  Manage
                </Button>
              </Link>
            </div>

            {defaultAddress ? (
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--color-text-main)", fontSize: "0.95rem" }}>
                    {defaultAddress.fullName}
                  </span>
                  <Badge variant="indigo" withDot={false}>
                    {defaultAddress.addressType || "HOME"} • DEFAULT
                  </Badge>
                </div>
                <div style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                  <div>{defaultAddress.addressLine1}</div>
                  {defaultAddress.addressLine2 && <div>{defaultAddress.addressLine2}</div>}
                  <div>
                    {defaultAddress.city}, {defaultAddress.state} — {defaultAddress.postalCode}
                  </div>
                  {defaultAddress.phone && <div style={{ marginTop: "0.4rem", fontWeight: 500 }}>📞 {defaultAddress.phone}</div>}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "1.5rem",
                  textAlign: "center",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-bg)",
                  border: "1px dashed var(--color-border)",
                }}
              >
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem", margin: "0 0 0.8rem 0" }}>
                  No saved addresses found.
                </p>
                <Link href="/account/addresses">
                  <Button variant="outline" size="sm" leftIcon={<MapPin size={14} />}>
                    Add New Address
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Recent Orders Section */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-text-main)", margin: 0 }}>
                Recent Sacred Orders
              </h2>
              <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
                Live updates and fulfillment tracking for your handcrafted purchases
              </p>
            </div>
            <Link href="/account/orders">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight size={14} />}>
                View All Orders ({orders.length})
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Skeleton height="90px" />
              <Skeleton height="90px" />
            </div>
          ) : orders.length === 0 ? (
            <Card variant="elevated" style={{ padding: "2.5rem" }}>
              <div style={{ textAlign: "center" }}>
                <Package size={40} style={{ color: "var(--color-text-secondary)", margin: "0 auto 1rem auto" }} />
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", fontWeight: 700 }}>No Orders Placed Yet</h3>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", margin: "0 0 1.25rem 0" }}>
                  Explore handcrafted cow dung diyas, authentic havan samagri, and herbal dhoop from verified Indian artisans.
                </p>
                <Link href="/account/wishlist">
                  <Button variant="primary">Explore Vedic Creations</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {orders.map((order) => {
                const firstItem = order.items?.[0];
                return (
                  <Card key={order.id} variant="elevated" style={{ padding: "1.25rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "1rem",
                      }}
                    >
                      {/* Left: Thumbnail & Order Info */}
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <div
                          style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--color-bg)",
                            border: "1px solid var(--color-border)",
                            overflow: "hidden",
                            position: "relative",
                            flexShrink: 0,
                          }}
                        >
                          {firstItem?.image ? (
                            <Image src={firstItem.image} alt={firstItem.productName} fill style={{ objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Package size={24} style={{ color: "var(--color-primary)" }} />
                            </div>
                          )}
                        </div>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <span style={{ fontWeight: 800, color: "var(--color-text-main)", fontSize: "0.98rem" }}>
                              {order.orderNumber}
                            </span>
                            {getOrderStatusBadge(order.status)}
                            {getPaymentStatusBadge(order.paymentStatus)}
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                            {firstItem?.productName || "Handcrafted creation"}
                            {order.items.length > 1 && ` + ${order.items.length - 1} more items`}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "0.2rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <Calendar size={13} />
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            <span>• Store: {order.storeName || "Mitti Craft Studio"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Price & Actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>Total Amount</div>
                          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-primary)" }}>
                            ₹{order.totalAmount.toLocaleString("en-IN")}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <Link href={`/account/orders/${order.id}`}>
                            <Button variant="secondary" size="sm">
                              View Order
                            </Button>
                          </Link>
                          {(order.status === "SHIPPED" || order.status === "DELIVERED") && (
                            <Link href={`/account/orders/${order.id}#tracking`}>
                              <Button variant="outline" size="sm" leftIcon={<Truck size={14} />}>
                                Track
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Lower Grid: Wishlist Preview & Notifications Preview */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
          {/* Wishlist Preview */}
          <Card variant="elevated" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Heart size={18} style={{ color: "var(--color-primary)" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                  Saved to Wishlist
                </h3>
              </div>
              <Link href="/account/wishlist">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>
                  View All ({wishlist.length})
                </Button>
              </Link>
            </div>

            {wishlist.length === 0 ? (
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem", margin: "1rem 0" }}>
                Your wishlist is empty. Save sacred artisan products to review them later!
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
                {wishlist.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      padding: "0.75rem",
                      backgroundColor: "var(--color-bg)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100px",
                        borderRadius: "var(--radius-sm)",
                        overflow: "hidden",
                        position: "relative",
                        backgroundColor: "#FFF",
                      }}
                    >
                      {item.product.images?.[0] ? (
                        <Image src={item.product.images[0]} alt={item.product.name} fill style={{ objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Package size={20} style={{ color: "var(--color-primary)" }} />
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "var(--color-text-main)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={item.product.name}
                    >
                      {item.product.name}
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-primary)" }}>
                      ₹{Number(item.product.price).toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Notifications Preview */}
          <Card variant="elevated" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Bell size={18} style={{ color: "var(--color-primary)" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                  Recent Notifications
                </h3>
              </div>
              <Link href="/account/notifications">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>
                  View All
                </Button>
              </Link>
            </div>

            {notifications.length === 0 ? (
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem", margin: "1rem 0" }}>
                No notifications right now. You are fully up to date!
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {notifications.slice(0, 3).map((notif) => (
                  <div
                    key={notif.id}
                    style={{
                      padding: "0.75rem 0.9rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: notif.readAt ? "var(--color-bg)" : "rgba(91, 92, 226, 0.06)",
                      border: "1px solid var(--color-border)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: notif.readAt ? "transparent" : "var(--color-primary)",
                        marginTop: "0.45rem",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--color-text-main)" }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.2rem", lineHeight: 1.4 }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", marginTop: "0.3rem" }}>
                        {new Date(notif.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
