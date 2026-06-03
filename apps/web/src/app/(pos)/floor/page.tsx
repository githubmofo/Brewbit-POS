"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@web/lib/trpc-client";
import { useRouter } from "next/navigation";
import {
  Coffee,
  Sparkles,
  Compass,
  RefreshCw,
  Trash2,
  Users,
  Layout,
  CheckCircle2,
  HelpCircle,
  Lock,
  Bell,
  BellOff,
} from "lucide-react";
import { cn } from "@web/lib/utils";
import { useSoundNotification } from "@web/hooks/useSoundNotification";

export default function PosFloorPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: user } = trpc.auth.me.useQuery();
  const { isMuted, toggleMute, playOrderReady } = useSoundNotification();

  // ─── QUERY & MUTATIONS ──────────────────────────────────────────────────────
  const { data: floors = [], isLoading: loadingFloors } =
    trpc.floor.list.useQuery();
  const { data: readyItemsCount = 0 } = trpc.order.checkReadyItems.useQuery(
    undefined,
    {
      refetchInterval: 10000, // Poll every 10 seconds
    },
  );

  const prevReadyCountRef = useRef(0);

  useEffect(() => {
    if (
      readyItemsCount > prevReadyCountRef.current &&
      prevReadyCountRef.current > 0
    ) {
      playOrderReady();
    }
    prevReadyCountRef.current = readyItemsCount;
  }, [readyItemsCount, playOrderReady]);

  const updateTableMutation = trpc.table.update.useMutation({
    onSuccess: () => utils.floor.list.invalidate(),
  });

  // ─── LOCAL STATE ────────────────────────────────────────────────────────────
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Load and persist cashier's view mode preference
  useEffect(() => {
    const savedMode = localStorage.getItem("brewbit_pos_view_mode") as
      | "map"
      | "list";
    if (savedMode === "map" || savedMode === "list") {
      setViewMode(savedMode);
    }
  }, []);

  const handleSetViewMode = (mode: "map" | "list") => {
    setViewMode(mode);
    localStorage.setItem("brewbit_pos_view_mode", mode);
  };

  // Set default floor on initial query completion
  useEffect(() => {
    if (floors.length > 0 && !selectedFloorId) {
      setSelectedFloorId(floors[0]?.id || null);
    }
  }, [floors, selectedFloorId]);

  // ─── ACTIONS ────────────────────────────────────────────────────────────────
  const handleTableClick = (table: any) => {
    // If table is dirty, force cleaning before opening new bills
    if (table.status === "dirty") return;

    // If table is locked by someone else, prevent access
    if (table.lockedByUserId && table.lockedByUserId !== user?.id) return;

    // Otherwise navigate cashier to product grids and shopping cart
    router.push(`/order/${table.id}`);
  };

  const handleCleanTable = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent card click navigation
    updateTableMutation.mutate({
      id,
      status: "free",
    });
  };

  const activeFloor = floors.find((f) => f.id === selectedFloorId);
  const tablesList = activeFloor?.tables || [];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#12100F] px-4 sm:px-6 py-4 sm:py-6 md:px-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Tab selection & Subheader info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#2C2724] pb-5 shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#EADED2]">
            POS Dining Tables
          </h2>
          <p className="text-xs text-[#8E7E72] mt-0.5">
            Select a table to open a shopping cart or manage register bills.
          </p>
        </div>

        {/* Dynamic floor tabs and Controls */}
        {loadingFloors ? (
          <div className="h-9 w-48 bg-[#161312] border border-[#2C2724] rounded-lg animate-pulse" />
        ) : (
          <div className="flex flex-wrap gap-3 items-center">
            {/* View Mode Toggle */}
            <div className="flex border border-[#2C2724] bg-[#1E1A18] rounded-xl p-1 gap-1 shrink-0 select-none">
              <button
                onClick={() => handleSetViewMode("map")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border border-transparent cursor-pointer",
                  viewMode === "map"
                    ? "bg-[#25201E] text-[#EADED2] border-[#E28743]/15 shadow-inner"
                    : "text-[#8E7E72] hover:text-[#CBB9A8]",
                )}
                title="Interactive 2D Map View"
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Floor Map</span>
              </button>
              <button
                onClick={() => handleSetViewMode("list")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border border-transparent cursor-pointer",
                  viewMode === "list"
                    ? "bg-[#25201E] text-[#EADED2] border-[#E28743]/15 shadow-inner"
                    : "text-[#8E7E72] hover:text-[#CBB9A8]",
                )}
                title="Compact Grid Cards View"
              >
                <Layout className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List Cards</span>
              </button>
            </div>

            <button
              onClick={toggleMute}
              className={cn(
                "p-2 rounded-lg border transition-all active:scale-95 shrink-0 cursor-pointer",
                isMuted
                  ? "bg-[#1E1A18] border-[#2C2724] text-[#8E7E72]"
                  : "bg-[#E28743]/10 border-[#E28743]/30 text-[#E28743]",
              )}
              title={isMuted ? "Unmute Notifications" : "Mute Notifications"}
            >
              {isMuted ? (
                <BellOff className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </button>

            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => setSelectedFloorId(floor.id)}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 border cursor-pointer",
                  selectedFloorId === floor.id
                    ? "bg-[#25201E] text-[#EADED2] border-[#E28743]/50 shadow-inner"
                    : "bg-[#1E1A18] text-[#8E7E72] border-[#2C2724] hover:text-[#CBB9A8]",
                )}
              >
                {floor.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Dining Tables View Canvas/Grid ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 min-w-0">
        {loadingFloors ? (
          /* Skeletons */
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-32 rounded-2xl bg-[#161312] border border-[#2C2724] animate-pulse"
              />
            ))}
          </div>
        ) : floors.length === 0 ? (
          /* Empty floors */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C2724] bg-[#161312] py-20 text-center">
            <Compass className="h-10 w-10 text-[#8E7E72] mb-3" />
            <h3 className="text-base font-semibold text-[#EADED2]">
              No Room Layouts Found
            </h3>
            <p className="text-sm text-[#8E7E72] mt-1 max-w-sm">
              Please visit the administrative Floor Plan setup tab to create
              dining floors and place tables.
            </p>
          </div>
        ) : tablesList.length === 0 ? (
          /* Empty tables list */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C2724] bg-[#161312] py-20 text-center">
            <Layout className="h-10 w-10 text-[#8E7E72] mb-3" />
            <h3 className="text-base font-semibold text-[#EADED2]">
              No Dining Tables Placed
            </h3>
            <p className="text-sm text-[#8E7E72] mt-1 max-w-sm">
              Use administrative Floor Plan setup to drag and place table seats
              on the floor blueprint map.
            </p>
          </div>
        ) : viewMode === "map" ? (
          /* ─── 2D FLOORS TABLE MAP CANVAS ────────────────────────────────────────── */
          <div
            className="relative h-[560px] w-full rounded-2xl border border-[#2C2724] bg-[#141211] overflow-hidden shadow-2xl select-none"
            style={{
              backgroundImage:
                "radial-gradient(#2C2724 1.2px, transparent 1.2px)",
              backgroundSize: "24px 24px",
            }}
          >
            {tablesList.map((table: any) => {
              const isFree = table.status === "free";
              const isOccupied = table.status === "occupied";
              const isReserved = table.status === "reserved";
              const isDirty = table.status === "dirty";
              const isLockedByOther =
                table.lockedByUserId && table.lockedByUserId !== user?.id;
              const isLockedByMe = table.lockedByUserId === user?.id;

              return (
                <div
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl flex flex-col items-center justify-between p-3.5 text-center border select-none transition-all duration-300 group",
                    !isDirty &&
                      !isLockedByOther &&
                      "cursor-pointer active:scale-95 hover:scale-105",
                    isLockedByOther &&
                      "opacity-70 cursor-not-allowed filter grayscale-[20%]",

                    // PREMIUM STATE GLOWS (OKLCH Design Science)
                    isFree &&
                      !isLockedByOther &&
                      "border-[#2C2724] bg-[#1E1A18] hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]",
                    isOccupied &&
                      !isLockedByOther &&
                      "border-[#E28743]/30 bg-[#1C1512] shadow-[inset_0_0_12px_rgba(226,135,67,0.03)] hover:border-[#E28743] hover:shadow-[0_0_25px_rgba(226,135,67,0.12)]",
                    isReserved &&
                      !isLockedByOther &&
                      "border-blue-500/20 bg-[#16171C] hover:border-blue-500/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.08)]",
                    isDirty &&
                      !isLockedByOther &&
                      "border-red-500/20 bg-[#1C1514] opacity-85 cursor-default",
                  )}
                  style={{
                    left: `${table.positionX}%`,
                    top: `${table.positionY}%`,
                    width: `${76 + table.seats * 8}px`,
                    height: `${76 + table.seats * 8}px`,
                  }}
                >
                  {/* Glowing Status Ring Accent */}
                  <span
                    className={cn(
                      "absolute top-0 left-1/2 -translate-x-1/2 h-1 w-10 rounded-b-full transition-all duration-300",
                      isFree && "bg-[#10B981] shadow-[0_1px_6px_#10B981]",
                      isOccupied &&
                        "bg-[#E28743] shadow-[0_1px_8px_#E28743] animate-pulse",
                      isReserved && "bg-[#3B82F6] shadow-[0_1px_6px_#3B82F6]",
                      isDirty && "bg-red-500 shadow-[0_1px_6px_#EF4444]",
                    )}
                  />

                  {/* Table Label & Locked state indicator */}
                  <div className="w-full mt-1.5 space-y-0.5">
                    <div className="flex items-center justify-center gap-1">
                      <h3 className="text-xs font-black text-[#EADED2] tracking-tight">
                        {table.label}
                      </h3>
                      {isLockedByMe && (
                        <Lock className="w-2.5 h-2.5 text-[#E28743]" />
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-[9px] text-[#8E7E72] font-semibold uppercase tracking-wider">
                      <Users className="h-2.5 w-2.5 text-[#8E7E72]/60 block" />
                      <span>{table.seats} Seats</span>
                    </div>
                  </div>

                  {/* Footer Actions / Locked tags / Clean Buttons */}
                  <div className="w-full flex items-center justify-center">
                    {isLockedByOther ? (
                      <div className="flex items-center gap-0.5 text-[8px] font-bold text-red-400 bg-red-400/5 border border-red-500/10 px-1.5 py-0.5 rounded-md truncate max-w-full">
                        <Lock className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">
                          {table.lockedByUser?.name?.split(" ")[0]}
                        </span>
                      </div>
                    ) : isDirty ? (
                      <button
                        onClick={(e) => handleCleanTable(e, table.id)}
                        disabled={updateTableMutation.isPending}
                        className="flex h-6 items-center justify-center gap-1 rounded bg-[#E28743] hover:bg-[#F49753] px-2 py-0.5 text-[9px] font-black text-[#161312] transition-colors active:scale-95 cursor-pointer"
                      >
                        {updateTableMutation.isPending ? (
                          <RefreshCw className="h-2.5 w-2.5 animate-spin text-[#161312]" />
                        ) : (
                          <CheckCircle2 className="h-2.5 w-2.5 text-[#161312]" />
                        )}
                        Clean
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "text-[9px] font-extrabold uppercase tracking-widest leading-none",
                          isFree &&
                            "text-emerald-400/80 group-hover:text-emerald-400 transition-colors",
                          isOccupied &&
                            "text-[#E28743]/80 group-hover:text-[#E28743] transition-colors",
                          isReserved &&
                            "text-blue-400/80 group-hover:text-blue-400 transition-colors",
                        )}
                      >
                        {table.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ─── 2D FLOORS TABLE GRID CARDS FALLBACK ───────────────────────────────── */
          <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 pb-6">
            {tablesList.map((table: any) => {
              const isFree = table.status === "free";
              const isOccupied = table.status === "occupied";
              const isReserved = table.status === "reserved";
              const isDirty = table.status === "dirty";
              const isLockedByOther =
                table.lockedByUserId && table.lockedByUserId !== user?.id;
              const isLockedByMe = table.lockedByUserId === user?.id;

              return (
                <div
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={cn(
                    "relative rounded-2xl border bg-[#161312] p-4.5 flex flex-col justify-between min-h-36 transition-all duration-200 group select-none",
                    !isDirty &&
                      !isLockedByOther &&
                      "cursor-pointer hover:shadow-lg active:scale-98",
                    isLockedByOther &&
                      "opacity-70 cursor-not-allowed filter grayscale-[30%]",
                    isFree &&
                      !isLockedByOther &&
                      "border-[#2C2724] hover:border-[#10B981]/50 hover:shadow-[#10B981]/3",
                    isOccupied &&
                      !isLockedByOther &&
                      "border-[#E28743]/40 shadow-inner bg-[#1A1614] hover:border-[#E28743]",
                    isReserved &&
                      !isLockedByOther &&
                      "border-[#3B82F6]/30 hover:border-[#3B82F6]/75",
                    isDirty &&
                      !isLockedByOther &&
                      "border-red-500/20 opacity-80 cursor-default bg-[#1C1514]",
                  )}
                >
                  {/* Status Ring Accent */}
                  <span
                    className={cn(
                      "absolute top-0 left-5 h-1 w-12 rounded-b-full",
                      isFree && "bg-[#10B981]",
                      isOccupied && "bg-[#E28743]",
                      isReserved && "bg-[#3B82F6]",
                      isDirty && "bg-red-500",
                    )}
                  />

                  {/* Table Label & Seats info */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-black text-[#EADED2]">
                        {table.label}
                      </h3>
                      {isLockedByOther && (
                        <div className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" />
                          <span className="truncate max-w-[60px]">
                            {table.lockedByUser?.name?.split(" ")[0]}
                          </span>
                        </div>
                      )}
                      {isLockedByMe && (
                        <Lock className="w-3 h-3 text-[#E28743]" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[#8E7E72] font-semibold text-3xs uppercase tracking-wider">
                      <Users className="h-3 w-3 text-[#8E7E72]/60" />
                      {table.seats} Seats
                    </div>
                  </div>

                  {/* Actions & Badge Footers */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#2C2724]/40 pt-3">
                    {/* Status Badge Text */}
                    <span
                      className={cn(
                        "text-3xs font-extrabold uppercase tracking-widest",
                        isFree && "text-emerald-400",
                        isOccupied && "text-[#E28743]",
                        isReserved && "text-[#3B82F6]",
                        isDirty && "text-red-400",
                      )}
                    >
                      {table.status}
                    </span>

                    {/* Dirty Table Clean Action Button */}
                    {isDirty && (
                      <button
                        onClick={(e) => handleCleanTable(e, table.id)}
                        disabled={updateTableMutation.isPending}
                        className="flex h-8 items-center justify-center gap-1 rounded bg-[#E28743] hover:bg-[#F49753] px-2 py-1 text-3xs font-black text-[#161312] transition-colors active:scale-95 cursor-pointer"
                      >
                        {updateTableMutation.isPending ? (
                          <RefreshCw className="h-3 w-3 animate-spin text-[#161312]" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-[#161312]" />
                        )}
                        Clean
                      </button>
                    )}
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
