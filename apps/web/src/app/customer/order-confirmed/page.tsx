"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, UtensilsCrossed, MapPin, ArrowLeft } from "lucide-react";

interface OrderInfo {
  orderNumber: string;
  subtotal?: string;
  taxTotal?: string;
  total: string;
  tableLabel: string;
  floorName: string;
  itemCount: number;
}

export default function OrderConfirmedPage() {
  const router = useRouter();
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("brewbit_last_order");
    if (stored) {
      try {
        setOrderInfo(JSON.parse(stored));
      } catch {
        // If parsing fails, just show generic confirmation
      }
    }

    // Trigger check animation after mount
    const timer = setTimeout(() => setShowCheck(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      {/* Background celebration glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(ellipse at 50% 30%, oklch(65% 0.18 75 / 0.1), transparent 55%),
              radial-gradient(ellipse at 50% 70%, oklch(70% 0.18 155 / 0.06), transparent 50%),
              #12100F
            `,
          }}
        />
      </div>

      {/* Animated Checkmark */}
      <div
        className="relative mb-6 transition-all duration-700 ease-out"
        style={{
          transform: showCheck ? "scale(1)" : "scale(0.3)",
          opacity: showCheck ? 1 : 0,
        }}
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: "oklch(70% 0.18 155 / 0.1)",
            border: "3px solid oklch(70% 0.18 155 / 0.3)",
            boxShadow: "0 0 40px oklch(70% 0.18 155 / 0.15)",
          }}
        >
          <CheckCircle
            className="h-10 w-10"
            style={{ color: "oklch(70% 0.18 155)" }}
          />
        </div>
      </div>

      {/* Title */}
      <h1
        className="text-xl font-bold tracking-tight mb-2"
        style={{ color: "#EADED2", letterSpacing: "-0.03em" }}
      >
        Order Placed Successfully!
      </h1>

      <p
        className="text-sm max-w-xs leading-relaxed mb-6"
        style={{ color: "#8E7E72" }}
      >
        Your order has been sent to the kitchen. Sit back, relax, and we&apos;ll
        bring your food to your table.
      </p>

      {/* Order Details Card */}
      {orderInfo && (
        <div
          className="w-full max-w-sm rounded-xl p-5 mb-6"
          style={{
            background: "oklch(13% 0.008 75)",
            border: "1px solid oklch(22% 0.01 75)",
          }}
        >
          {/* Order Number */}
          <div className="mb-4">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: "#8E7E72" }}
            >
              Order Number
            </p>
            <p
              className="text-lg font-bold tracking-tight"
              style={{ color: "oklch(65% 0.18 75)", letterSpacing: "-0.02em" }}
            >
              {orderInfo.orderNumber}
            </p>
          </div>

          <div
            className="h-px mb-4"
            style={{ background: "oklch(22% 0.01 75)" }}
          />

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <MapPin
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: "#6B5E54" }}
              />
              <div>
                <p
                  className="text-[9px] font-semibold uppercase tracking-widest"
                  style={{ color: "#6B5E54" }}
                >
                  Table
                </p>
                <p className="text-xs font-bold" style={{ color: "#EADED2" }}>
                  {orderInfo.floorName} · {orderInfo.tableLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UtensilsCrossed
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: "#6B5E54" }}
              />
              <div>
                <p
                  className="text-[9px] font-semibold uppercase tracking-widest"
                  style={{ color: "#6B5E54" }}
                >
                  Items
                </p>
                <p className="text-xs font-bold" style={{ color: "#EADED2" }}>
                  {orderInfo.itemCount}{" "}
                  {orderInfo.itemCount === 1 ? "item" : "items"}
                </p>
              </div>
            </div>
          </div>

          <div
            className="h-px my-4"
            style={{ background: "oklch(22% 0.01 75)" }}
          />

          {/* Detailed Bill Summary */}
          <div className="space-y-1.5 text-left mb-2">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "#8E7E72" }}>Amount (Subtotal)</span>
              <span style={{ color: "#EADED2" }}>
                ₹{parseFloat(orderInfo.subtotal || "0").toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "#8E7E72" }}>GST Added</span>
              <span style={{ color: "#EADED2" }}>
                ₹{parseFloat(orderInfo.taxTotal || "0").toFixed(2)}
              </span>
            </div>
            <div
              className="flex items-center justify-between text-sm font-bold pt-2 mt-2"
              style={{ borderTop: "1px dashed oklch(22% 0.01 75)" }}
            >
              <span style={{ color: "#EADED2" }}>Final Amount</span>
              <span style={{ color: "oklch(65% 0.18 75)" }}>
                ₹{parseFloat(orderInfo.total).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5 w-full max-w-sm">
        <button
          type="button"
          onClick={() => router.push("/customer/menu")}
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, oklch(65% 0.18 75), oklch(55% 0.16 75))",
            boxShadow: "0 6px 20px oklch(65% 0.18 75 / 0.25)",
          }}
        >
          <UtensilsCrossed className="h-4 w-4" />
          Order More
        </button>
        <button
          type="button"
          onClick={() => router.push("/customer/menu")}
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200"
          style={{
            background: "oklch(18% 0.01 75)",
            border: "1px solid oklch(25% 0.01 75)",
            color: "#EADED2",
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Go to Menu
        </button>
      </div>
    </div>
  );
}
