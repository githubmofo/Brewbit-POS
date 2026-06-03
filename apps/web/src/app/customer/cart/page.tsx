"use client";

import { useCustomerCartStore } from "@web/stores/customer-cart.store";
import { trpc } from "@web/lib/trpc-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Minus,
  Plus,
  Trash2,
  MapPin,
  ShoppingBag,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function CustomerCartPage() {
  const router = useRouter();
  const cartItems = useCustomerCartStore((s) => s.cartItems);
  const updateQuantity = useCustomerCartStore((s) => s.updateQuantity);
  const removeItem = useCustomerCartStore((s) => s.removeItem);
  const getTotals = useCustomerCartStore((s) => s.getTotals);
  const selectedTableId = useCustomerCartStore((s) => s.selectedTableId);
  const selectedTableLabel = useCustomerCartStore((s) => s.selectedTableLabel);
  const selectedFloorName = useCustomerCartStore((s) => s.selectedFloorName);

  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeOrderMutation = trpc.order.customerPlace.useMutation();

  const totals = getTotals();
  const isEmpty = cartItems.length === 0;

  const handlePlaceOrder = async () => {
    if (!selectedTableId || isEmpty) return;

    setIsPlacing(true);
    setError(null);

    try {
      const result = await placeOrderMutation.mutateAsync({
        tableId: selectedTableId,
        items: cartItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })),
      });

      // Store order info in sessionStorage for the confirmation page
      sessionStorage.setItem(
        "brewbit_last_order",
        JSON.stringify({
          orderNumber: result.orderNumber,
          subtotal: result.subtotal,
          taxTotal: result.taxTotal,
          total: result.total,
          tableLabel: selectedTableLabel,
          floorName: selectedFloorName,
          itemCount: cartItems.reduce((sum, i) => sum + i.quantity, 0),
        }),
      );

      // Clear the cart
      useCustomerCartStore.getState().clearCart();

      router.push("/customer/order-confirmed");
    } catch (err: any) {
      setError(err?.message ?? "Failed to place order. Please try again.");
      setIsPlacing(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4">
        <h1
          className="text-lg font-bold tracking-tight"
          style={{ color: "#EADED2", letterSpacing: "-0.02em" }}
        >
          Your Cart
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "#8E7E72" }}>
          Review your items and place your order.
        </p>
      </div>

      {/* Selected Table */}
      {selectedTableLabel && (
        <div
          className="flex items-center gap-2 mx-4 sm:mx-6 rounded-lg px-3 py-2 mb-3"
          style={{
            background: "oklch(65% 0.18 75 / 0.06)",
            border: "1px solid oklch(65% 0.18 75 / 0.12)",
          }}
        >
          <MapPin
            className="h-3.5 w-3.5"
            style={{ color: "oklch(65% 0.18 75)" }}
          />
          <span
            className="text-xs font-semibold"
            style={{ color: "oklch(65% 0.18 75)" }}
          >
            {selectedFloorName} · Table {selectedTableLabel}
          </span>
        </div>
      )}

      {/* Empty State */}
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <ShoppingBag
            className="h-12 w-12 mb-4"
            style={{ color: "#5A4F47" }}
          />
          <h2 className="text-base font-bold mb-1" style={{ color: "#EADED2" }}>
            Your cart is empty
          </h2>
          <p className="text-xs mb-6" style={{ color: "#8E7E72" }}>
            Browse the menu and add your favorite items.
          </p>
          <button
            type="button"
            onClick={() => router.push("/customer/menu")}
            className="rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all"
            style={{
              background:
                "linear-gradient(135deg, oklch(65% 0.18 75), oklch(55% 0.16 75))",
            }}
          >
            Browse Menu
          </button>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-2">
            {cartItems.map((item) => {
              const unitPrice = item.price + (item.extraPrice ?? 0);
              const lineTotal = unitPrice * item.quantity;

              return (
                <div
                  key={`${item.productId}-${item.variantId ?? "base"}`}
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{
                    background: "oklch(13% 0.008 75)",
                    border: "1px solid oklch(22% 0.01 75)",
                  }}
                >
                  {/* Color dot */}
                  <div
                    className="w-2 h-2 shrink-0 rounded-full"
                    style={{
                      background: item.categoryColor ?? "oklch(65% 0.18 75)",
                    }}
                  />

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-bold truncate"
                      style={{ color: "#EADED2" }}
                    >
                      {item.name}
                    </p>
                    {item.variantName && (
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: "#8E7E72" }}
                      >
                        {item.variantName}
                      </p>
                    )}
                    <p
                      className="text-xs mt-0.5 font-semibold"
                      style={{ color: "oklch(65% 0.18 75)" }}
                    >
                      ₹{unitPrice.toFixed(2)} × {item.quantity} = ₹
                      {lineTotal.toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div
                    className="flex items-center gap-0.5 rounded-lg shrink-0"
                    style={{
                      background: "oklch(18% 0.01 75)",
                      border: "1px solid oklch(25% 0.01 75)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity - 1,
                        )
                      }
                      className="p-1.5 transition-colors"
                      style={{ color: "#8E7E72" }}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span
                      className="text-xs font-bold min-w-5 text-center"
                      style={{ color: "#EADED2" }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity + 1,
                        )
                      }
                      className="p-1.5 transition-colors"
                      style={{ color: "oklch(65% 0.18 75)" }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="p-1.5 rounded-lg transition-colors shrink-0"
                    style={{ color: "oklch(65% 0.18 25)" }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}

            {/* Spacer to prevent layout overlap of sticky bottom order summary block */}
            <div className="h-48 sm:h-52 shrink-0" />
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mx-4 sm:mx-6 mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                background: "oklch(60% 0.22 25 / 0.1)",
                border: "1px solid oklch(60% 0.22 25 / 0.2)",
                color: "oklch(60% 0.22 25)",
              }}
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Order Summary + Place Order */}
          <div
            className="sticky bottom-16 sm:bottom-18 z-30 mx-4 sm:mx-6 mb-2 rounded-xl p-4"
            style={{
              background: "oklch(13% 0.008 75)",
              border: "1px solid oklch(22% 0.01 75)",
              boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* Totals */}
            <div className="space-y-1.5 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "#8E7E72" }}>Subtotal</span>
                <span style={{ color: "#EADED2" }}>
                  ₹{totals.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "#8E7E72" }}>Tax</span>
                <span style={{ color: "#EADED2" }}>
                  ₹{totals.taxTotal.toFixed(2)}
                </span>
              </div>
              <div
                className="flex items-center justify-between text-sm font-bold pt-1.5"
                style={{ borderTop: "1px solid oklch(22% 0.01 75)" }}
              >
                <span style={{ color: "#EADED2" }}>Total</span>
                <span style={{ color: "oklch(65% 0.18 75)" }}>
                  ₹{totals.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isPlacing || !selectedTableId}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  "linear-gradient(135deg, oklch(65% 0.18 75), oklch(55% 0.16 75))",
                boxShadow: "0 8px 24px oklch(65% 0.18 75 / 0.3)",
              }}
            >
              {isPlacing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Placing Order...
                </>
              ) : !selectedTableId ? (
                "Select a Table First"
              ) : (
                "Place Order"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
