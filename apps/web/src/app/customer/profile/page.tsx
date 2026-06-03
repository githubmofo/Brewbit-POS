"use client";

import { trpc } from "@web/lib/trpc-client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  X,
  Clock,
  ChefHat,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Utensils,
} from "lucide-react";

const kitchenStatusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  pending: {
    label: "Pending Receipt",
    color: "oklch(65% 0.02 75)",
    bg: "oklch(65% 0.02 75 / 0.1)",
    icon: Clock,
  },
  to_cook: {
    label: "In Queue",
    color: "oklch(75% 0.15 65)",
    bg: "oklch(75% 0.15 65 / 0.1)",
    icon: Clock,
  },
  preparing: {
    label: "Cooking...",
    color: "oklch(68% 0.18 25)",
    bg: "oklch(68% 0.18 25 / 0.1)",
    icon: ChefHat,
  },
  done: {
    label: "Ready!",
    color: "oklch(70% 0.18 155)",
    bg: "oklch(70% 0.18 155 / 0.1)",
    icon: CheckCircle2,
  },
};

export default function CustomerProfilePage() {
  const router = useRouter();
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      utils.auth.me.reset();
      router.push("/login");
    }
  });
  
  const { data: orders, isLoading } = trpc.order.listCustomerOrders.useQuery(
    undefined,
    {
      refetchInterval: 5000, // Live auto-refresh every 5 seconds for order status tracking
    }
  );

  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  
  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditEmail(user.email);
    }
  }, [user]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setIsEditing(false);
    }
  });

  const handleSaveProfile = () => {
    if (!editName.trim() || !editEmail.trim()) return;
    updateProfileMutation.mutate({ name: editName, email: editEmail });
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const getOrderPreparedStatus = (items: any[]) => {
    if (!items || items.length === 0) return "pending";
    const statuses = items.map((i) => i.kitchenStatus);

    if (statuses.every((s) => s === "done")) return "done";
    if (statuses.some((s) => s === "preparing")) return "preparing";
    if (statuses.some((s) => s === "to_cook")) return "to_cook";
    return "pending";
  };

  const formatOrderDate = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex flex-1 flex-col items-center px-4 sm:px-6 py-5">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-lg font-bold tracking-tight"
              style={{ color: "#EADED2", letterSpacing: "-0.02em" }}
            >
              Your Profile
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#8E7E72" }}>
              Manage your account settings and preferences.
            </p>
          </div>
          <button
            onClick={() => router.push("/customer/menu")}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:bg-[oklch(22%_0.01_75_/_0.3)] active:scale-95 border"
            style={{
              borderColor: "oklch(22% 0.01 75)",
              background: "transparent",
              color: "#EADED2",
            }}
            title="Close Profile"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Settings Card */}
        <div className="w-full rounded-xl p-6 mb-8 border"
             style={{
               background: "oklch(13% 0.008 75)",
               borderColor: "oklch(22% 0.01 75)",
             }}
        >
          {isEditing ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[#8E7E72] font-semibold text-xs tracking-wide uppercase">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="p-2.5 rounded-lg border border-[#3A342E] bg-[#262220] text-[#EADED2] focus:outline-none focus:border-[oklch(65%_0.18_75)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[#8E7E72] font-semibold text-xs tracking-wide uppercase">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="p-2.5 rounded-lg border border-[#3A342E] bg-[#262220] text-[#EADED2] focus:outline-none focus:border-[oklch(65%_0.18_75)]"
                />
              </div>
              {updateProfileMutation.error && (
                <p className="text-xs text-[oklch(60%_0.22_25)]">{updateProfileMutation.error.message}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-[oklch(65%_0.18_75)] text-white font-bold text-sm hover:bg-[oklch(70%_0.18_75)] transition-colors disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={updateProfileMutation.isPending}
                  className="px-4 py-2 rounded-lg border border-[oklch(22%_0.01_75)] text-[#EADED2] font-bold text-sm hover:bg-[oklch(22%_0.01_75_/_0.3)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                   <div className="h-16 w-16 rounded-full bg-[oklch(65%_0.18_75)] flex items-center justify-center text-xl font-bold text-white">
                      {user?.name?.[0]?.toUpperCase() || "U"}
                   </div>
                   <div>
                      <h2 className="text-lg font-bold text-[#EADED2]">{user?.name}</h2>
                      <p className="text-sm text-[#8E7E72]">{user?.email}</p>
                   </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-lg border border-[oklch(22%_0.01_75)] text-[#EADED2] font-bold text-sm hover:bg-[oklch(22%_0.01_75_/_0.3)] transition-colors"
                >
                  Edit Profile
                </button>
              </div>
              
              <button 
                 onClick={() => logoutMutation.mutate()}
                 className="flex items-center gap-2 text-[oklch(60%_0.22_25)] font-semibold hover:opacity-80 transition-opacity"
              >
                 <LogOut className="h-4 w-4" />
                 Log Out
              </button>
            </>
          )}
        </div>

        {/* Order History ledger */}
        <div className="mt-8 mb-12">
          <div className="mb-4">
            <h2
              className="text-base font-bold tracking-tight"
              style={{ color: "#EADED2", letterSpacing: "-0.01em" }}
            >
              Order History
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#8E7E72" }}>
              Track preparation status of your recent self-orders.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {isLoading ? (
              // Pulse skeletons
              Array.from({ length: 2 }).map((_, idx) => (
                <div
                  key={idx}
                  className="w-full rounded-xl p-5 border animate-pulse flex flex-col gap-4"
                  style={{
                    background: "oklch(13% 0.008 75)",
                    borderColor: "oklch(22% 0.01 75)",
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-[oklch(22%_0.01_75)] rounded w-28" />
                    <div className="h-4 bg-[oklch(22%_0.01_75)] rounded w-16" />
                  </div>
                  <div className="h-px bg-[oklch(22%_0.01_75)]" />
                  <div className="flex justify-between items-center">
                    <div className="h-3 bg-[oklch(22%_0.01_75)] rounded w-36" />
                    <div className="h-3 bg-[oklch(22%_0.01_75)] rounded w-10" />
                  </div>
                </div>
              ))
            ) : !orders || orders.length === 0 ? (
              // Empty State
              <div
                className="w-full rounded-xl p-8 border text-center flex flex-col items-center gap-3"
                style={{
                  background: "oklch(13% 0.008 75 / 0.4)",
                  borderColor: "oklch(22% 0.01 75 / 0.6)",
                }}
              >
                <ChefHat className="h-8 w-8" style={{ color: "#5A4F47" }} />
                <div>
                  <h3 className="text-sm font-bold" style={{ color: "#EADED2" }}>
                    No Orders Placed Yet
                  </h3>
                  <p className="text-xs mt-1" style={{ color: "#8E7E72" }}>
                    Your placed orders will show up here in real time.
                  </p>
                </div>
              </div>
            ) : (
              // Orders list
              orders.map((order) => {
                const preparedStatus = getOrderPreparedStatus(order.items);
                const statusCfg =
                  kitchenStatusConfig[preparedStatus] ??
                  kitchenStatusConfig.pending!;
                const StatusIcon = statusCfg.icon;
                const isExpanded = !!expandedOrders[order.id];

                return (
                  <div
                    key={order.id}
                    className="w-full rounded-xl border transition-all duration-200 overflow-hidden flex flex-col"
                    style={{
                      background: "oklch(13% 0.008 75)",
                      borderColor: "oklch(22% 0.01 75)",
                    }}
                  >
                    {/* Header trigger block */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(order.id)}
                      className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold tracking-tight"
                            style={{ color: "oklch(65% 0.18 75)" }}
                          >
                            {order.orderNumber}
                          </span>
                          <span
                            className="text-[10px] font-semibold rounded-full px-2 py-0.5 flex items-center gap-1"
                            style={{
                              background: statusCfg.bg,
                              color: statusCfg.color,
                            }}
                          >
                            <StatusIcon className="h-2.5 w-2.5" />
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]" style={{ color: "#8E7E72" }}>
                          <span>{formatOrderDate(order.createdAt)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            {order.table?.label ?? "Table"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 mt-1 sm:mt-0">
                        <span className="text-sm font-bold" style={{ color: "#EADED2" }}>
                          ₹{parseFloat(order.total).toFixed(2)}
                        </span>
                        <div
                          className="h-7 w-7 rounded-full flex items-center justify-center border transition-colors group-hover:bg-[oklch(22%_0.01_75_/_0.2)]"
                          style={{ borderColor: "oklch(22% 0.01 75)" }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-[#8E7E72]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[#8E7E72]" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expandable items section */}
                    {isExpanded && (
                      <div
                        className="px-4 pb-4 sm:px-5 sm:pb-5 border-t flex flex-col gap-3.5 pt-4"
                        style={{ borderColor: "oklch(22% 0.01 75 / 0.5)" }}
                      >
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#6B5E54]">
                          Items Ordered ({order.items.length})
                        </h4>
                        <div className="flex flex-col gap-2.5">
                          {order.items.map((item) => {
                            const lineStatusCfg =
                              kitchenStatusConfig[item.kitchenStatus] ??
                              kitchenStatusConfig.pending!;
                            const LineIcon = lineStatusCfg.icon;

                            return (
                              <div
                                key={item.id}
                                className="flex items-start justify-between gap-3 text-xs"
                              >
                                <div className="flex items-start gap-2.5">
                                  <span
                                    className="font-bold tabular-nums min-w-[1.25rem] mt-0.5"
                                    style={{ color: "oklch(65% 0.18 75)" }}
                                  >
                                    {item.quantity}x
                                  </span>
                                  <div>
                                    <p className="font-semibold" style={{ color: "#EADED2" }}>
                                      {item.product?.name}
                                    </p>
                                    {item.variant && (
                                      <p className="text-[10px] mt-0.5" style={{ color: "#8E7E72" }}>
                                        {item.variant.attributeValue}
                                      </p>
                                    )}
                                    {/* Line item kitchen status */}
                                    <span
                                      className="inline-flex items-center gap-1 text-[9px] font-medium rounded px-1.5 py-0.5 mt-1 border"
                                      style={{
                                        borderColor: `${lineStatusCfg.color}25`,
                                        background: lineStatusCfg.bg,
                                        color: lineStatusCfg.color,
                                      }}
                                    >
                                      <LineIcon className="h-2 w-2" />
                                      {lineStatusCfg.label}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-medium tabular-nums" style={{ color: "#EADED2" }}>
                                  ₹{parseFloat(item.lineTotal).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Financial Receipt Summary */}
                        <div
                          className="border-t pt-3 mt-1 flex flex-col gap-1.5 text-[11px]"
                          style={{ borderColor: "oklch(22% 0.01 75 / 0.4)" }}
                        >
                          <div className="flex items-center justify-between">
                            <span style={{ color: "#8E7E72" }}>Amount (Subtotal)</span>
                            <span className="font-medium tabular-nums" style={{ color: "#EADED2" }}>
                              ₹{parseFloat(order.subtotal).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span style={{ color: "#8E7E72" }}>GST Added</span>
                            <span className="font-medium tabular-nums" style={{ color: "#EADED2" }}>
                              ₹{parseFloat(order.taxTotal).toFixed(2)}
                            </span>
                          </div>
                          <div
                            className="flex items-center justify-between font-bold pt-2 mt-1"
                            style={{ borderTop: "1px dashed oklch(22% 0.01 75 / 0.5)" }}
                          >
                            <span style={{ color: "#EADED2" }}>Final Amount</span>
                            <span className="tabular-nums" style={{ color: "oklch(65% 0.18 75)" }}>
                              ₹{parseFloat(order.total).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

