"use client";

import { useState, useMemo } from "react";
import { trpc } from "@web/lib/trpc-client";
import { useParams, useRouter } from "next/navigation";
import { useSessionStore } from "@web/stores/session.store";
import {
  Coffee,
  ArrowLeft,
  CreditCard,
  Loader2,
  AlertTriangle,
  Coins,
  QrCode,
  CheckCircle,
  UtensilsCrossed,
  ClipboardList,
  Plus,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "@web/lib/utils";

export default function PosOrderPage() {
  const params = useParams();
  const router = useRouter();
  const utils = trpc.useUtils();
  const tableId = params.tableId as string;

  const { activeSession } = useSessionStore();

  // ─── LOCAL STATE ────────────────────────────────────────────────────────────
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isBillOpen, setIsBillOpen] = useState(false);

  // ─── QUERIES & MUTATIONS ────────────────────────────────────────────────────
  const { data: tableDetails } = trpc.table.getById.useQuery({ id: tableId });

  // Fetch ALL active orders for this table
  const { data: tableOrders = [], isLoading: loadingOrders } =
    trpc.order.listByTable.useQuery({ tableId });

  const { data: paymentConfigs = [] } = trpc.payment.getConfigs.useQuery();

  const processPaymentMutation = trpc.payment.process.useMutation({
    onSuccess: () => {
      utils.floor.list.invalidate();
    },
  });
  const confirmPaymentMutation = trpc.payment.confirm.useMutation({
    onSuccess: () => {
      utils.floor.list.invalidate();
    },
  });

  // UPI config
  const upiConfig = paymentConfigs.find((c) => c.method === "upi_qr");
  const isUpiEnabled = upiConfig?.isEnabled ?? false;
  const storeUpiId = upiConfig?.upiId || "";

  // UPI QR modal state
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  // ─── CONSOLIDATED BILL CALCULATIONS ─────────────────────────────────────────
  const consolidatedBill = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    let totalItems = 0;

    tableOrders.forEach((order: any) => {
      subtotal += parseFloat(order.subtotal || "0");
      taxTotal += parseFloat(order.taxTotal || "0");
      order.items?.forEach((item: any) => {
        totalItems += item.quantity;
      });
    });

    const total = subtotal + taxTotal;
    return { subtotal, taxTotal, total, totalItems };
  }, [tableOrders]);

  // ─── UPI QR CODE GENERATION ─────────────────────────────────────────────────
  const getUpiPayload = (): string => {
    const total = consolidatedBill.total.toFixed(2);
    return `upi://pay?pa=${encodeURIComponent(storeUpiId)}&pn=${encodeURIComponent("Brewbit POS")}&am=${total}&cu=INR`;
  };

  const getQrCodeImageUrl = (): string => {
    const payload = getUpiPayload();
    if (!payload) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(payload)}`;
  };

  // ─── PAYMENT HANDLERS ──────────────────────────────────────────────────────
  const handlePaymentSubmit = async (method: "cash" | "digital" | "upi_qr") => {
    if (tableOrders.length === 0) return;
    setProcessing(true);
    setError(null);

    try {
      if (method === "cash" || method === "digital") {
        // Process payment for each order on this table
        for (const order of tableOrders) {
          const orderTotal = parseFloat(order.total || "0");
          if (orderTotal > 0) {
            await processPaymentMutation.mutateAsync({
              orderId: order.id,
              method,
              amount: orderTotal,
            });
          }
        }
        setSuccess(true);
        setTimeout(() => router.push("/floor"), 1500);
      } else if (method === "upi_qr") {
        if (!isUpiEnabled || !storeUpiId) {
          throw new Error("UPI payments are not configured or disabled by administrator.");
        }
        // Use the first order for UPI record
        const primaryOrder = tableOrders[0];
        const paymentRecord = await processPaymentMutation.mutateAsync({
          orderId: primaryOrder.id,
          method: "upi_qr",
          amount: consolidatedBill.total,
          upiId: storeUpiId,
        });
        setActivePaymentId(paymentRecord.id);
        setIsUpiModalOpen(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process payment.");
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmUpiPayment = async () => {
    if (!activePaymentId) return;
    setProcessing(true);
    setError(null);
    try {
      await confirmPaymentMutation.mutateAsync({ paymentId: activePaymentId });
      // Process remaining orders with cash to mark them complete
      for (let i = 1; i < tableOrders.length; i++) {
        const orderTotal = parseFloat(tableOrders[i].total || "0");
        if (orderTotal > 0) {
          await processPaymentMutation.mutateAsync({
            orderId: tableOrders[i].id,
            method: "cash",
            amount: orderTotal,
          });
        }
      }
      setIsUpiModalOpen(false);
      setSuccess(true);
      setTimeout(() => router.push("/floor"), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to confirm UPI payment.");
    } finally {
      setProcessing(false);
    }
  };

  // ─── LOADING STATE ──────────────────────────────────────────────────────────
  if (loadingOrders) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#12100F]">
        <Loader2 className="h-7 w-7 animate-spin text-[#E28743] mb-2" />
        <span className="text-3xs uppercase font-bold text-[#8E7E72] tracking-widest">
          Loading table orders...
        </span>
      </div>
    );
  }

  // ─── RENDER: CONSOLIDATED BILL PANEL ────────────────────────────────────────
  const renderBillPanel = (isMobileView = false) => (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Bill Header */}
      <div className="flex h-14 items-center justify-between px-5 border-b border-[#2C2724] shrink-0">
        <h2 className="text-xs font-black tracking-wider uppercase text-[#EADED2]">
          Consolidated Bill
        </h2>
        {isMobileView && (
          <button
            onClick={() => setIsBillOpen(false)}
            className="text-[#8E7E72] hover:text-[#EADED2] transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Bill Items summary */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
        {tableOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
            <Coffee className="h-8 w-8 text-[#8E7E72] mb-2" />
            <h4 className="text-xs font-bold text-[#EADED2]">No Orders</h4>
            <p className="text-4xs text-[#8E7E72]">No items ordered for this table yet.</p>
          </div>
        ) : (
          tableOrders.map((order: any, orderIdx: number) => (
            <div key={order.id} className="space-y-2">
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#8E7E72] flex items-center gap-2">
                <span className="h-px flex-1 bg-[#2C2724]/40" />
                Order {orderIdx + 1} · {order.orderNumber}
                <span className="h-px flex-1 bg-[#2C2724]/40" />
              </div>
              {order.items?.map((item: any) => {
                const unitPrice = parseFloat(item.unitPrice || item.product?.price || "0");
                const lineTotal = parseFloat(item.lineTotal || "0") || unitPrice * item.quantity;
                return (
                  <div
                    key={item.id}
                    className="flex justify-between items-start text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-[#CBB9A8] truncate block">
                        {item.product?.name}
                      </span>
                      <span className="text-4xs text-[#8E7E72]">
                        {item.quantity} × {formatCurrency(unitPrice)}
                        {item.variant && ` (${item.variant.attributeValue})`}
                      </span>
                    </div>
                    <span className="font-bold text-[#EADED2] shrink-0 ml-3">
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Bill Totals + Payment Actions */}
      <div className="border-t border-[#2C2724] p-5 bg-[#1E1A18]/25 space-y-4 shrink-0">
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-[#8E7E72]">
            <span>Subtotal</span>
            <span className="font-semibold">{formatCurrency(consolidatedBill.subtotal)}</span>
          </div>
          <div className="flex justify-between text-[#8E7E72]">
            <span>Tax (GST)</span>
            <span className="font-semibold">{formatCurrency(consolidatedBill.taxTotal)}</span>
          </div>
          <div className="flex justify-between text-[#EADED2] font-extrabold pt-2.5 border-t border-[#2C2724]/40 text-sm">
            <span>Total Bill</span>
            <span className="text-[#E28743]">{formatCurrency(consolidatedBill.total)}</span>
          </div>
        </div>

        {/* Payment Buttons */}
        {success ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center space-y-1">
            <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-emerald-400">Payment Settled</p>
            <p className="text-4xs text-[#8E7E72]">Redirecting to floor...</p>
          </div>
        ) : tableOrders.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handlePaymentSubmit("cash")}
              disabled={processing}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[#2C2724] bg-[#161312] p-3 text-center hover:border-emerald-500/40 transition-all active:scale-98 disabled:opacity-50"
            >
              <Coins className="h-5 w-5 text-emerald-400" />
              <span className="text-[9px] font-bold text-[#CBB9A8]">Cash</span>
            </button>
            <button
              onClick={() => handlePaymentSubmit("digital")}
              disabled={processing}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[#2C2724] bg-[#161312] p-3 text-center hover:border-blue-500/40 transition-all active:scale-98 disabled:opacity-50"
            >
              <CreditCard className="h-5 w-5 text-blue-400" />
              <span className="text-[9px] font-bold text-[#CBB9A8]">Card</span>
            </button>
            <button
              onClick={() => handlePaymentSubmit("upi_qr")}
              disabled={processing || !isUpiEnabled}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border bg-[#161312] p-3 text-center transition-all active:scale-98",
                isUpiEnabled
                  ? "border-[#2C2724] hover:border-[#E28743]/40"
                  : "border-[#2C2724]/20 opacity-30 cursor-not-allowed"
              )}
            >
              <QrCode className="h-5 w-5 text-[#E28743]" />
              <span className="text-[9px] font-bold text-[#CBB9A8]">UPI</span>
            </button>
          </div>
        ) : null}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-[10px] font-semibold text-red-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 bg-[#12100F] flex-col lg:flex-row pb-20 lg:pb-0">
      {/* ─── LEFT PANEL: DINING ITEMS ────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col min-w-0 border-r border-[#2C2724] px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/floor")}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2C2724] bg-[#1E1A18] text-[#8E7E72] hover:text-[#EADED2] transition-colors"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-[#EADED2] flex items-center gap-2">
                <UtensilsCrossed className="h-4.5 w-4.5 text-[#E28743]" />
                Dining — {tableDetails?.label || "Table"}
              </h2>
              <span className="text-3xs text-[#8E7E72] uppercase font-bold tracking-wider">
                {tableDetails?.seats || 2} Seats · {tableOrders.length} Order{tableOrders.length !== 1 ? "s" : ""} Active
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push("/floor")}
            className="flex items-center gap-2 rounded-lg border border-[#E28743]/30 bg-[#E28743]/5 px-4 py-2 text-xs font-bold text-[#E28743] hover:bg-[#E28743]/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Order
          </button>
        </div>

        {/* Dining Items - Grouped by Order */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-4 space-y-5">
          {tableOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-[#161312] rounded-2xl border border-[#2C2724]">
              <ClipboardList className="h-10 w-10 text-[#8E7E72] mb-3 opacity-50" />
              <h4 className="text-sm font-bold text-[#EADED2]">
                No Active Orders
              </h4>
              <p className="text-xs text-[#8E7E72] mt-1 max-w-xs">
                This table has no active dining orders. Go back to the floor plan and place a new order.
              </p>
            </div>
          ) : (
            tableOrders.map((order: any, orderIdx: number) => {
              const orderSubtotal = parseFloat(order.subtotal || "0");
              const orderTax = parseFloat(order.taxTotal || "0");
              const orderTotal = parseFloat(order.total || "0");
              const orderTime = new Date(order.createdAt);

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-[#2C2724] bg-[#161312] overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-[#1E1A18]/50 border-b border-[#2C2724]/60">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#E28743]/10 border border-[#E28743]/20 flex items-center justify-center">
                        <span className="text-xs font-black text-[#E28743]">
                          {orderIdx + 1}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#EADED2]">
                          {order.orderNumber}
                        </h3>
                        <span className="text-[10px] text-[#8E7E72]">
                          {orderTime.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border",
                        order.status === "draft"
                          ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                          : order.status === "confirmed" || order.status === "sent_to_kitchen"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-neutral-500/5 border-neutral-500/20 text-[#8E7E72]"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          order.status === "draft"
                            ? "bg-yellow-400"
                            : order.status === "confirmed" || order.status === "sent_to_kitchen"
                              ? "bg-emerald-400 animate-pulse"
                              : "bg-[#8E7E72]"
                        )}
                      />
                      {order.status === "sent_to_kitchen" ? "In Kitchen" : order.status}
                    </span>
                  </div>

                  {/* Order Items */}
                  <div className="divide-y divide-[#2C2724]/20">
                    {order.items?.map((item: any) => {
                      const unitPrice = parseFloat(item.unitPrice || item.product?.price || "0");
                      const lineTotal = parseFloat(item.lineTotal || "0") || unitPrice * item.quantity;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#1E1A18]/30 transition-colors"
                        >
                          {/* Quantity badge */}
                          <div className="h-8 w-8 rounded-lg bg-[#2C2724]/50 border border-[#2C2724] flex items-center justify-center shrink-0">
                            <span className="text-xs font-black text-[#EADED2]">
                              {item.quantity}×
                            </span>
                          </div>

                          {/* Item details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-[#EADED2] truncate">
                              {item.product?.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.variant && (
                                <span className="text-[10px] font-bold text-[#E28743] uppercase tracking-wider">
                                  {item.variant.attributeValue}
                                </span>
                              )}
                              <span className="text-[10px] text-[#8E7E72]">
                                @ {formatCurrency(unitPrice)} each
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-[10px] text-red-400/80 mt-1 italic">
                                "{item.notes}"
                              </p>
                            )}
                          </div>

                          {/* Kitchen status */}
                          <div className="text-right shrink-0 space-y-1">
                            <span className="text-xs font-bold text-[#EADED2] block">
                              {formatCurrency(lineTotal)}
                            </span>
                            <span
                              className={cn(
                                "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
                                item.kitchenStatus === "done"
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                  : item.kitchenStatus === "preparing"
                                    ? "bg-[#ccff00]/10 border-[#ccff00]/20 text-[#ccff00]"
                                    : "bg-[#2C2724]/30 border-[#2C2724]/40 text-[#8E7E72]"
                              )}
                            >
                              {item.kitchenStatus === "done"
                                ? "Ready"
                                : item.kitchenStatus === "preparing"
                                  ? "Cooking"
                                  : "Pending"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order Sub-footer */}
                  <div className="flex items-center justify-between px-5 py-2.5 bg-[#1E1A18]/30 border-t border-[#2C2724]/30 text-[10px] text-[#8E7E72]">
                    <span>
                      Subtotal: {formatCurrency(orderSubtotal)} · Tax: {formatCurrency(orderTax)}
                    </span>
                    <span className="font-bold text-[#EADED2] text-xs">
                      {formatCurrency(orderTotal)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ─── RIGHT PANEL: CONSOLIDATED BILL (Desktop) ─────────────────────────── */}
      <section className="hidden lg:flex w-88 flex-col bg-[#161312] shrink-0 border-l border-[#2C2724]">
        {renderBillPanel(false)}
      </section>

      {/* ─── MOBILE BILL DRAWER OVERLAY ──────────────────────────────────────── */}
      {isBillOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in">
          <section className="w-full sm:max-w-md h-full flex flex-col bg-[#161312] animate-slide-in shadow-2xl">
            {renderBillPanel(true)}
          </section>
        </div>
      )}

      {/* ─── BOTTOM FLOATING BAR (Mobile/Tablet) ─────────────────────────────── */}
      {tableOrders.length > 0 && (
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
          <button
            onClick={() => setIsBillOpen(true)}
            className="flex w-full items-center justify-between gap-2 rounded-2xl bg-[#E28743] hover:bg-[#F49753] px-6 py-4 text-xs font-black text-[#161312] shadow-xl shadow-black/40 transition-all active:scale-98"
          >
            <span className="flex items-center gap-2">
              <CreditCard className="h-4.5 w-4.5 text-[#161312]" />
              <span>
                View Bill ({consolidatedBill.totalItems} items)
              </span>
            </span>
            <span className="font-extrabold">{formatCurrency(consolidatedBill.total)}</span>
          </button>
        </div>
      )}

      {/* ─── UPI QR PAYMENT MODAL OVERLAY ────────────────────────────────────── */}
      {isUpiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#2C2724] bg-[#161312] p-6 shadow-2xl text-center space-y-5 animate-scale-in">
            <div className="flex justify-between items-center pb-3 border-b border-[#2C2724]/40">
              <span className="text-xs font-black text-[#EADED2]">UPI QR Code</span>
              <button
                onClick={() => setIsUpiModalOpen(false)}
                className="text-[#8E7E72] hover:text-[#EADED2] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mx-auto h-[260px] w-[260px] rounded-xl bg-white p-2.5 flex items-center justify-center border border-[#2C2724] shadow-inner">
              <img
                src={getQrCodeImageUrl()}
                alt="UPI Pay QR"
                className="h-full w-full object-contain select-none"
              />
            </div>
            <div className="space-y-1 bg-[#1E1A18]/50 border border-[#2C2724]/30 rounded-xl p-3 text-xs">
              <div className="flex justify-between text-[#8E7E72]">
                <span>UPI ID:</span>
                <span className="font-bold text-[#EADED2]">{storeUpiId}</span>
              </div>
              <div className="flex justify-between text-[#8E7E72] pt-1">
                <span>Amount:</span>
                <span className="font-extrabold text-[#E28743]">
                  {formatCurrency(consolidatedBill.total)}
                </span>
              </div>
            </div>
            <div className="pt-2 flex justify-stretch gap-3">
              <button
                type="button"
                onClick={() => setIsUpiModalOpen(false)}
                className="flex-1 rounded-xl border border-[#2C2724] py-3.5 text-xs font-semibold text-[#8E7E72] hover:text-[#CBB9A8] transition-colors active:scale-98"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpiPayment}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#E28743] hover:bg-[#F49753] py-3.5 text-xs font-black text-[#161312] transition-colors active:scale-98 disabled:opacity-50"
              >
                {processing && <Loader2 className="h-3 w-3 animate-spin text-[#161312]" />}
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export type PosOrderPage = typeof PosOrderPage;
