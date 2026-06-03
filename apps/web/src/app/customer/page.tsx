"use client";

import { trpc } from "@web/lib/trpc-client";
import { useCustomerCartStore } from "@web/stores/customer-cart.store";
import { useRouter } from "next/navigation";
import { MapPin, Users, Loader2, Check } from "lucide-react";

const statusConfig: Record<
  string,
  { label: string; color: string; glow: string; selectable: boolean }
> = {
  free: {
    label: "Available",
    color: "oklch(70% 0.18 155)",
    glow: "0 0 16px oklch(70% 0.18 155 / 0.25)",
    selectable: true,
  },
  occupied: {
    label: "In Use",
    color: "oklch(72% 0.16 65)",
    glow: "0 0 16px oklch(72% 0.16 65 / 0.2)",
    selectable: false,
  },
  reserved: {
    label: "Reserved",
    color: "oklch(68% 0.15 250)",
    glow: "0 0 16px oklch(68% 0.15 250 / 0.2)",
    selectable: false,
  },
  dirty: {
    label: "Cleaning",
    color: "oklch(65% 0.18 25)",
    glow: "0 0 16px oklch(65% 0.18 25 / 0.2)",
    selectable: false,
  },
};

export default function CustomerTablesPage() {
  const router = useRouter();
  const { data: floors, isLoading } = trpc.floor.list.useQuery();
  const selectedTableId = useCustomerCartStore((s) => s.selectedTableId);
  const selectedTableLabel = useCustomerCartStore((s) => s.selectedTableLabel);
  const selectedFloorName = useCustomerCartStore((s) => s.selectedFloorName);
  const setSelectedTable = useCustomerCartStore((s) => s.setSelectedTable);
  const clearSelectedTable = useCustomerCartStore((s) => s.clearSelectedTable);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2
          className="h-7 w-7 animate-spin"
          style={{ color: "oklch(65% 0.18 75)" }}
        />
      </div>
    );
  }

  // Seat Selection Lock Card: If they already have an active seat, lock their view and show options.
  if (selectedTableId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 max-w-md mx-auto w-full">
        <div
          className="relative w-full rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center gap-6 overflow-hidden border"
          style={{
            background: "oklch(13% 0.008 75)",
            borderColor: "oklch(22% 0.01 75)",
          }}
        >
          {/* Subtle radial warm glow in background */}
          <div
            className="absolute -inset-10 opacity-10 pointer-events-none rounded-full blur-[80px]"
            style={{
              background: "radial-gradient(circle, oklch(65% 0.18 75) 0%, transparent 70%)",
            }}
          />

          {/* Table Badge Icon */}
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold tracking-tight animate-pulse"
            style={{
              background: "oklch(65% 0.18 75 / 0.12)",
              border: "2px solid oklch(65% 0.18 75)",
              color: "oklch(65% 0.18 75)",
              boxShadow: "0 0 32px oklch(65% 0.18 75 / 0.25)",
            }}
          >
            {selectedTableLabel || "Seat"}
          </div>

          <div className="space-y-2">
            <h2
              className="text-xl font-black tracking-tight"
              style={{ color: "#EADED2", letterSpacing: "-0.03em" }}
            >
              You Have Selected a Table
            </h2>
            <p className="text-xs px-4 leading-relaxed animate-fade-in" style={{ color: "#8E7E72" }}>
              Your order will be served at <strong style={{ color: "#EADED2" }}>{selectedTableLabel}</strong> on the <strong style={{ color: "#EADED2" }}>{selectedFloorName}</strong>. There is no need to select a table again.
            </p>
          </div>

          <div className="flex flex-col w-full gap-3 mt-2">
            <button
              type="button"
              onClick={() => router.push("/customer/menu")}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, oklch(65% 0.18 75), oklch(55% 0.16 75))",
                boxShadow: "0 8px 24px oklch(65% 0.18 75 / 0.3)",
              }}
            >
              Continue to Menu
            </button>

            <button
              type="button"
              onClick={() => clearSelectedTable()}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all duration-200 hover:bg-[oklch(22%_0.01_75_/_0.2)] active:scale-[0.98]"
              style={{
                background: "transparent",
                border: "1px solid oklch(22% 0.01 75)",
                color: "oklch(65% 0.18 75)",
              }}
            >
              Release Seat & Change Table
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!floors || floors.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <MapPin
            className="h-10 w-10 mx-auto mb-3"
            style={{ color: "#5A4F47" }}
          />
          <h2 className="text-base font-bold mb-1" style={{ color: "#EADED2" }}>
            No Floors Available
          </h2>
          <p className="text-xs" style={{ color: "#8E7E72" }}>
            The cafe hasn&apos;t set up any dining areas yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 sm:px-6 py-5 gap-6">
      {/* Header */}
      <div>
        <h1
          className="text-lg font-bold tracking-tight"
          style={{ color: "#EADED2", letterSpacing: "-0.02em" }}
        >
          Select Your Table
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "#8E7E72" }}>
          Choose an available table to start your order.
        </p>
      </div>

      {/* Floor Sections */}
      {floors.map((floor) => {
        const activeTables = floor.tables.filter((t: any) => t.isActive);
        if (activeTables.length === 0) return null;

        return (
          <section key={floor.id}>
            {/* Floor label */}
            <div className="flex items-center gap-2 mb-3">
              <MapPin
                className="h-3.5 w-3.5"
                style={{ color: "oklch(65% 0.18 75)" }}
              />
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "oklch(65% 0.18 75)" }}
              >
                {floor.name}
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: "oklch(22% 0.01 75)" }}
              />
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {activeTables.map((table: any) => {
                const cfg = statusConfig[table.status] ?? statusConfig.free!;
                const isSelected = selectedTableId === table.id;

                return (
                  <button
                    key={table.id}
                    type="button"
                    disabled={!cfg.selectable}
                    onClick={() => {
                      if (cfg.selectable) {
                        setSelectedTable(table.id, table.label, floor.name);
                      }
                    }}
                    className="relative flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200 group"
                    style={{
                      background: isSelected
                        ? "oklch(65% 0.18 75 / 0.08)"
                        : "oklch(13% 0.008 75)",
                      border: isSelected
                        ? "2px solid oklch(65% 0.18 75)"
                        : `1px solid oklch(22% 0.01 75)`,
                      boxShadow: isSelected ? cfg.glow : "none",
                      opacity: cfg.selectable ? 1 : 0.55,
                      cursor: cfg.selectable ? "pointer" : "not-allowed",
                    }}
                  >
                    {/* Selection check */}
                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full"
                        style={{ background: "oklch(65% 0.18 75)" }}
                      >
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}

                    {/* Table icon circle */}
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold transition-transform duration-200"
                      style={{
                        background: `${cfg.color}15`,
                        border: `2px solid ${cfg.color}40`,
                        color: cfg.color,
                        transform: isSelected ? "scale(1.08)" : "scale(1)",
                      }}
                    >
                      {table.label}
                    </div>

                    {/* Seats count */}
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" style={{ color: "#6B5E54" }} />
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: "#8E7E72" }}
                      >
                        {table.seats} seats
                      </span>
                    </div>

                    {/* Status badge */}
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5"
                      style={{
                        background: `${cfg.color}12`,
                        color: cfg.color,
                      }}
                    >
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Spacer to prevent overlap of sticky bottom continue button */}
      <div className="h-24 sm:h-28 shrink-0" />

      {/* Continue Button */}
      {selectedTableId && (
        <div className="sticky bottom-18 sm:bottom-20 z-30 pt-2">
          <button
            type="button"
            onClick={() => router.push("/customer/menu")}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, oklch(65% 0.18 75), oklch(55% 0.16 75))",
              boxShadow: "0 8px 24px oklch(65% 0.18 75 / 0.3)",
            }}
          >
            Continue to Menu →
          </button>
        </div>
      )}
    </div>
  );
}
