"use client";

import React, { useState } from "react";
import { Order, OrderStatus } from "@/types/store";
import { INITIAL_ORDERS } from "@/lib/artisanData";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Search, CheckCircle, Package } from "lucide-react";

export const OrdersTable: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === "ALL" || order.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  return (
    <Card variant="elevated" style={{ width: "100%", overflow: "hidden" }}>
      {/* Table Toolbar */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
            Recent Sacred Orders
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
            Managing direct dispatch for gaushala self-help artisan units
          </p>
        </div>

        {/* Search & Status Filters */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Search Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.45rem 0.85rem",
              borderRadius: "var(--radius-md)",
              border: "1.5px solid var(--color-border)",
              backgroundColor: "#FFFFFF",
            }}
          >
            <Search size={16} color="var(--color-text-tertiary)" />
            <input
              type="text"
              placeholder="Search order or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "0.85rem",
                color: "var(--color-text-main)",
                width: "180px",
              }}
            />
          </div>

          {/* Status Filter Dropdown / Pills */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: "0.5rem 0.85rem",
              borderRadius: "var(--radius-md)",
              border: "1.5px solid var(--color-border)",
              backgroundColor: "#FFFFFF",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--color-text-main)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
          <thead>
            <tr
              style={{
                backgroundColor: "var(--color-surface-muted)",
                borderBottom: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <th style={{ padding: "0.85rem 1.5rem" }}>Order</th>
              <th style={{ padding: "0.85rem 1rem" }}>Customer</th>
              <th style={{ padding: "0.85rem 1rem" }}>Destination</th>
              <th style={{ padding: "0.85rem 1rem" }}>Items</th>
              <th style={{ padding: "0.85rem 1rem" }}>Amount</th>
              <th style={{ padding: "0.85rem 1rem" }}>Status</th>
              <th style={{ padding: "0.85rem 1.5rem", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                  No orders match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  style={{
                    borderBottom: "1px solid var(--color-border-subtle)",
                    transition: "background-color var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td style={{ padding: "1.1rem 1.5rem", fontWeight: 700, color: "var(--color-primary)" }}>
                    {order.orderNumber}
                    <div style={{ fontSize: "0.74rem", color: "var(--color-text-tertiary)", fontWeight: 500 }}>
                      {order.createdAt}
                    </div>
                  </td>

                  <td style={{ padding: "1.1rem 1rem" }}>
                    <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>{order.customerName}</div>
                    <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>{order.customerEmail}</div>
                  </td>

                  <td style={{ padding: "1.1rem 1rem", color: "var(--color-text-secondary)" }}>
                    {order.city}
                  </td>

                  <td style={{ padding: "1.1rem 1rem", fontWeight: 600 }}>
                    {order.itemCount} item{order.itemCount > 1 ? "s" : ""}
                  </td>

                  <td style={{ padding: "1.1rem 1rem", fontWeight: 800, color: "var(--color-text-main)" }}>
                    ₹{order.totalAmount}
                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-tertiary)", fontWeight: 500 }}>
                      via {order.paymentMethod}
                    </div>
                  </td>

                  <td style={{ padding: "1.1rem 1rem" }}>
                    <Badge status={order.status} />
                  </td>

                  <td style={{ padding: "1.1rem 1.5rem", textAlign: "right" }}>
                    {order.status === "PROCESSING" && (
                      <Button
                        size="sm"
                        variant="teal"
                        onClick={() => handleUpdateStatus(order.id, "SHIPPED")}
                        leftIcon={<Package size={13} />}
                      >
                        Dispatch
                      </Button>
                    )}
                    {order.status === "SHIPPED" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUpdateStatus(order.id, "COMPLETED")}
                        leftIcon={<CheckCircle size={13} />}
                      >
                        Complete
                      </Button>
                    )}
                    {order.status === "COMPLETED" && (
                      <span style={{ fontSize: "0.76rem", color: "var(--color-success)", fontWeight: 600 }}>
                        Fulfilled
                      </span>
                    )}
                    {order.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="orange"
                        onClick={() => handleUpdateStatus(order.id, "PROCESSING")}
                      >
                        Accept
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
