"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { trpc } from "@web/lib/trpc-client";
import {
  Bell,
  BellOff,
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@web/lib/utils";
import { useSoundNotification } from "@web/hooks/useSoundNotification";

export default function KDSPage() {
  const utils = trpc.useUtils();
  const { data: tickets = [], isLoading } =
    trpc.order.listKitchenTickets.useQuery();

  const updateKitchenStatus = trpc.order.updateKitchenStatus.useMutation({
    onSuccess: () => utils.order.listKitchenTickets.invalidate(),
  });

  const updateItemPriority = trpc.order.updateItemPriority.useMutation({
    onSuccess: () => utils.order.listKitchenTickets.invalidate(),
  });

  const { isMuted, toggleMute, playNewOrder } = useSoundNotification();

  // State for popover
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // State for filtering
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "preparing" | "done"
  >("all");

  // Previous ticket count to detect new orders and play sound
  const prevTicketCountRef = useRef(0);

  useEffect(() => {
    if (
      tickets.length > prevTicketCountRef.current &&
      prevTicketCountRef.current > 0
    ) {
      playNewOrder();
    }
    prevTicketCountRef.current = tickets.length;
  }, [tickets.length, playNewOrder]);

  // Set up auto-refresh polling every 10 seconds for KDS
  useEffect(() => {
    const interval = setInterval(() => {
      utils.order.listKitchenTickets.invalidate();
    }, 10000);
    return () => clearInterval(interval);
  }, [utils]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // If we are filtering by a specific item status, check if the ticket has any items matching
      if (filterStatus === "all") return true;
      return ticket.items.some((item) => {
        if (filterStatus === "pending")
          return (
            item.kitchenStatus === "pending" || item.kitchenStatus === "to_cook"
          );
        if (filterStatus === "preparing")
          return item.kitchenStatus === "preparing";
        if (filterStatus === "done") return item.kitchenStatus === "done";
        return true;
      });
    });
  }, [tickets, filterStatus]);

  const handleItemClick = (itemId: string) => {
    setActiveItemId((prev) => (prev === itemId ? null : itemId));
  };

  const handlePrioritySelect = (
    e: React.MouseEvent,
    itemId: string,
    priority: "important" | "normal" | "not_important",
  ) => {
    e.stopPropagation();
    updateItemPriority.mutate({ orderItemId: itemId, priority });
    setActiveItemId(null);
  };

  const handleMarkDone = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    updateKitchenStatus.mutate({
      orderItemId: itemId,
      kitchenStatus: "done",
    });
    setActiveItemId(null);
  };

  const handleMarkPreparing = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    updateKitchenStatus.mutate({
      orderItemId: itemId,
      kitchenStatus: "preparing",
    });
    setActiveItemId(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0A0A0A] px-4 sm:px-6 py-4 sm:py-6 md:px-8 w-full mx-auto space-y-6">
      {/* ─── KDS Header & Filter Bar ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#222] pb-5 shrink-0">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[#EAEAEA] flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-[#ccff00]" />
            Kitchen Display System
          </h2>
          <p className="text-sm text-[#888] mt-1 font-medium">
            Real-time order ticket management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mute Toggle */}
          <button
            onClick={toggleMute}
            className={cn(
              "flex items-center justify-center p-3 rounded-xl border transition-all active:scale-95",
              isMuted
                ? "bg-[#1A1A1A] border-[#333] text-[#888] hover:text-[#AAA]"
                : "bg-[#ccff00]/10 border-[#ccff00]/30 text-[#ccff00] hover:bg-[#ccff00]/20 shadow-[0_0_15px_rgba(204,255,0,0.1)]",
            )}
            title={isMuted ? "Unmute Notifications" : "Mute Notifications"}
          >
            {isMuted ? (
              <BellOff className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </button>

          {/* Filter Bar */}
          <div className="flex bg-[#161616] border border-[#333] rounded-xl p-1">
            {(["all", "pending", "preparing", "done"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "px-4 py-2 text-xs font-bold rounded-lg transition-all capitalize tracking-wide",
                    filterStatus === status
                      ? "bg-[#2A2A2A] text-white shadow-sm"
                      : "text-[#888] hover:text-[#BBB]",
                  )}
                >
                  {status}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* ─── Ticket Grid ─── */}
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 pb-6">
        {isLoading ? (
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-80 shrink-0 h-96 bg-[#161616] border border-[#222] rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-20 h-20 bg-[#161616] border border-[#333] rounded-2xl flex items-center justify-center transform rotate-12">
              <CheckCircle2 className="w-10 h-10 text-[#444]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#EAEAEA]">
                No active tickets
              </h3>
              <p className="text-[#888] max-w-sm mt-2">
                The kitchen is clear. Waiting for new orders to arrive.
              </p>
            </div>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 pb-6">
            {filteredTickets.map((ticket) => {
              // Calculate ticket age
              const ticketTime = new Date(ticket.createdAt);
              const isUrgent =
                new Date().getTime() - ticketTime.getTime() > 10 * 60 * 1000; // >10 mins old

              return (
                <div
                  key={ticket.id}
                  className={cn(
                    "w-full break-inside-avoid mb-5 flex flex-col rounded-2xl border bg-[#161616] shadow-xl overflow-hidden transition-all duration-300",
                    isUrgent
                      ? "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                      : "border-[#333]",
                  )}
                >
                  {/* Ticket Header */}
                  <div
                    className={cn(
                      "p-4 border-b",
                      isUrgent
                        ? "bg-red-500/10 border-red-500/20"
                        : "bg-[#1E1E1E] border-[#333]",
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-black text-white">
                        {ticket.orderNumber}
                      </h3>
                      <span className="text-xs font-bold px-2 py-1 bg-[#2A2A2A] rounded-md text-[#AAA]">
                        {ticket.table?.label || "Takeout"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#888]">
                      <Clock
                        className={cn(
                          "w-3.5 h-3.5",
                          isUrgent && "text-red-400",
                        )}
                      />
                      <span className={cn(isUrgent && "text-red-400")}>
                        {ticketTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isUrgent && (
                        <span className="flex items-center gap-1 text-red-400 ml-auto bg-red-400/10 px-1.5 py-0.5 rounded">
                          <Flame className="w-3 h-3" /> Urgent
                        </span>
                      )}
                    </div>
                    {ticket.notes && (
                      <div className="mt-3 text-xs bg-[#2A2A2A] text-[#EAEAEA] p-2 rounded border border-[#444]">
                        <span className="font-bold text-[#ccff00] mr-1">
                          Note:
                        </span>
                        {ticket.notes}
                      </div>
                    )}
                  </div>

                  {/* Ticket Items */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {ticket.items.map((item) => {
                      const isDone = item.kitchenStatus === "done";
                      const isPrep = item.kitchenStatus === "preparing";
                      const isPending =
                        item.kitchenStatus === "pending" ||
                        item.kitchenStatus === "to_cook";

                      // Hide items that don't match the active filter
                      if (filterStatus === "pending" && !isPending) return null;
                      if (filterStatus === "preparing" && !isPrep) return null;
                      if (filterStatus === "done" && !isDone) return null;

                      return (
                        <div
                          key={item.id}
                          className="relative"
                        >
                          <div
                            onClick={() => handleItemClick(item.id)}
                            className={cn(
                              "p-3 rounded-xl border transition-all cursor-pointer select-none active:scale-98 group",
                              isDone
                                ? "bg-[#111] border-[#222] opacity-50 hover:opacity-100"
                                : isPrep
                                  ? "bg-[#ccff00]/10 border-[#ccff00]/30 hover:bg-[#ccff00]/20"
                                  : "bg-[#1E1E1E] border-[#333] hover:border-[#555]",
                              item.priority === "important" && !isDone && "border-red-500/50 bg-red-500/10 shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]",
                              item.priority === "not_important" && !isDone && "opacity-60"
                            )}
                          >
                            <div className="flex gap-3">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 transition-colors",
                                  isDone
                                    ? "bg-[#222] text-[#666]"
                                    : isPrep
                                      ? "bg-[#ccff00] text-black shadow-[0_0_10px_rgba(204,255,0,0.4)]"
                                      : "bg-[#333] text-white",
                                  item.priority === "important" && !isDone && "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                                )}
                              >
                                {item.quantity}x
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4
                                  className={cn(
                                    "text-sm font-bold truncate transition-colors",
                                    isDone
                                      ? "text-[#666] line-through"
                                      : isPrep
                                        ? "text-[#ccff00]"
                                        : "text-white",
                                    item.priority === "important" && !isDone && "text-red-400"
                                  )}
                                >
                                  {item.product?.name}
                                </h4>
                                {item.variant && (
                                  <p className="text-xs text-[#888] font-medium mt-0.5 truncate">
                                    + {item.variant.attributeValue}
                                  </p>
                                )}
                                {item.notes && (
                                  <p className="text-xs text-red-400 font-bold mt-1.5 bg-red-400/10 inline-block px-1.5 py-0.5 rounded">
                                    {item.notes}
                                  </p>
                                )}
                                {item.priority === "important" && !isDone && (
                                  <p className="text-xs text-red-400 font-bold mt-1.5 bg-red-400/10 inline-block px-1.5 py-0.5 rounded ml-2">
                                    Fast Ready
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Popover Options */}
                          {activeItemId === item.id && (
                            <div className="mt-2 p-2 bg-[#222] border border-[#444] rounded-xl shadow-2xl z-10 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                              <button
                                onClick={(e) => handlePrioritySelect(e, item.id, "important")}
                                className="px-3 py-2 text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                              >
                                Important
                              </button>
                              <button
                                onClick={(e) => handlePrioritySelect(e, item.id, "normal")}
                                className="px-3 py-2 text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 transition-colors"
                              >
                                Medium
                              </button>
                              <button
                                onClick={(e) => handlePrioritySelect(e, item.id, "not_important")}
                                className="px-3 py-2 text-xs font-bold bg-[#333] text-[#888] border border-[#444] rounded-lg hover:bg-[#444] transition-colors"
                              >
                                Not Important
                              </button>
                              <button
                                onClick={(e) => isDone ? handleMarkPreparing(e, item.id) : handleMarkDone(e, item.id)}
                                className={cn(
                                  "px-3 py-2 text-xs font-bold rounded-lg transition-colors border",
                                  isDone 
                                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                                    : "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                                )}
                              >
                                {isDone ? "Reopen" : "Mark DONE"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
