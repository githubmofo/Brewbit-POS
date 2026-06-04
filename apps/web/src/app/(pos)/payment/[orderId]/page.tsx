"use client";

import { useState, useEffect } from "react";
import { trpc } from "@web/lib/trpc-client";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Coins,
  CreditCard,
  QrCode,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "@web/lib/utils";

export default function PosPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const utils = trpc.useUtils();

  // Extract orderId safely in Next.js 15 App Router
  const orderId = params.orderId as string;

  // ─── QUERY & MUTATIONS ──────────────────────────────────────────────────────
  const { data: orderDetails, isLoading: loadingOrder } =
    trpc.order.getById.useQuery({ id: orderId });
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

  // ─── LOCAL STATE ────────────────────────────────────────────────────────────
  const [selectedMethod, setSelectedMethod] = useState<
    "cash" | "digital" | "upi_qr" | null
  >(null);

  // UPI QR specific states
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ─── UPI QR CODE PARAM GENERATION ───────────────────────────────────────────
  const upiConfig = paymentConfigs.find((c) => c.method === "upi_qr");
  const isUpiEnabled = upiConfig?.isEnabled ?? false;
  const storeUpiId = upiConfig?.upiId || "";

  // Generates standard NPCI UPI payload URL
  const getUpiPayload = () => {
    if (!orderDetails) return "";
    const total = parseFloat(orderDetails.total).toFixed(2);

    // NPCI UPI String Specification: upi://pay?pa=[VPA]&pn=[NAME]&am=[AMOUNT]&cu=INR
    return `upi://pay?pa=${encodeURIComponent(storeUpiId)}&pn=${encodeURIComponent("Brewbit POS")}&am=${total}&cu=INR`;
  };

  // Safe CDN QR generator endpoint mapping payload
  const getQrCodeImageUrl = () => {
    const payload = getUpiPayload();
    if (!payload) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(payload)}`;
  };

  // ─── ACTIONS ────────────────────────────────────────────────────────────────
  const handlePaymentSubmit = async (method: "cash" | "digital" | "upi_qr") => {
    if (!orderDetails) return;
    setProcessing(true);
    setError(null);

    const amountNum = parseFloat(orderDetails.total);

    try {
      if (method === "cash" || method === "digital") {
        // Auto-confirmed instant settlement
        await processPaymentMutation.mutateAsync({
          orderId,
          method,
          amount: amountNum,
        });

        setSuccess(true);
        setTimeout(() => {
          router.push("/floor");
        }, 1500);
      } else if (method === "upi_qr") {
        // Validation check for merchant credentials
        if (!isUpiEnabled || !storeUpiId) {
          throw new Error(
            "UPI payments are not configured or disabled by administrator.",
          );
        }

        // Initialize pending UPI payment record
        const paymentRecord = await processPaymentMutation.mutateAsync({
          orderId,
          method: "upi_qr",
          amount: amountNum,
          upiId: storeUpiId,
        });

        setActivePaymentId(paymentRecord.id);
        setIsUpiModalOpen(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process cashier payment.");
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmUpiPayment = async () => {
    if (!activePaymentId) return;
    setProcessing(true);
    setError(null);

    try {
      // Settle pending payment on cashier confirm
      await confirmPaymentMutation.mutateAsync({
        paymentId: activePaymentId,
      });

      setIsUpiModalOpen(false);
      setSuccess(true);
      setTimeout(() => {
        router.push("/floor");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to confirm UPI QR payment.");
    } finally {
      setProcessing(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#12100F]">
        <Loader2 className="h-7 w-7 animate-spin text-[#E28743] mb-2" />
        <span className="text-3xs uppercase font-bold text-[#8E7E72] tracking-widest">
          Loading Invoice details...
        </span>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#12100F] text-center p-6">
        <AlertTriangle className="h-9 w-9 text-red-400 mb-2" />
        <h4 className="text-sm font-bold text-[#EADED2]">Order Not Found</h4>
        <p className="text-xs text-[#8E7E72] mt-1">
          Please return to floor plans terminal.
        </p>
        <button
          onClick={() => router.push("/floor")}
          className="mt-4 rounded-xl border border-[#2C2724] bg-[#1E1A18] px-4 py-2 text-xs font-semibold text-[#E28743]"
        >
          POS Floor Terminal
        </button>
      </div>
    );
  }

  const subtotal = parseFloat(orderDetails.subtotal);
  const taxTotal = parseFloat(orderDetails.taxTotal);
  const total = parseFloat(orderDetails.total);

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-[#12100F] max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-10 gap-8 items-stretch overflow-y-auto">
      {/* ─── LEFT: INVOICE RECEIPT SUMMARY ───────────────────────────────────── */}
      <section className="flex-1 rounded-2xl border border-[#2C2724] bg-[#161312] p-4 sm:p-6 flex flex-col justify-between space-y-6 shrink-0 md:max-w-md">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-[#2C2724]/40">
            <button
              onClick={() => router.push(`/order/${orderDetails.tableId}`)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2C2724] bg-[#1E1A18] text-[#8E7E72] hover:text-[#EADED2] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h3 className="text-sm font-black text-[#EADED2] flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#E28743]" />
                Invoice Summary
              </h3>
              <span className="text-4xs text-[#8E7E72] uppercase font-bold tracking-wider block mt-0.5">
                {orderDetails.orderNumber} · {orderDetails.table?.label}
              </span>
            </div>
          </div>

          {/* Items lists */}
          <div className="space-y-3 overflow-y-auto max-h-56 pr-2 scrollbar-thin">
            {orderDetails.items.map((item: any) => {
              const itemUnitPrice = parseFloat(item.unitPrice);
              const lineTotal = parseFloat(item.lineTotal);

              return (
                <div
                  key={item.id}
                  className="flex justify-between items-start text-xs border-b border-[#2C2724]/10 pb-2"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[#CBB9A8] truncate">
                      {item.product.name}
                    </h4>
                    <span className="text-4xs font-semibold text-[#8E7E72] block mt-0.5">
                      {item.quantity} x {formatCurrency(itemUnitPrice)}
                      {item.variant && ` (${item.variant.attributeValue})`}
                    </span>
                  </div>
                  <span className="font-bold text-[#EADED2] shrink-0">
                    {formatCurrency(lineTotal)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing Subtotals summary */}
        <div className="border-t border-[#2C2724]/40 pt-4 space-y-2 text-xs">
          <div className="flex justify-between text-[#8E7E72]">
            <span>Subtotal</span>
            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-[#8E7E72]">
            <span>GST Taxes</span>
            <span className="font-semibold">{formatCurrency(taxTotal)}</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-[#EADED2] border-t border-[#2C2724]/20 pt-3">
            <span>Amount Due</span>
            <span className="text-[#E28743]">{formatCurrency(total)}</span>
          </div>
        </div>
      </section>

      {/* ─── RIGHT: BILLING PAYMENT ACTION PANEL ─────────────────────────────── */}
      <section className="flex-1 flex flex-col justify-center space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#EADED2]">
            Checkout Payment
          </h2>
          <p className="text-xs text-[#8E7E72] mt-0.5">
            Select a payment register option to settle the customer bill.
          </p>
        </div>

        {/* Success screen */}
        {success && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center space-y-3 animate-scale-in">
            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-emerald-400">
              Transaction Settled
            </h3>
            <p className="text-xs text-[#8E7E72] max-w-xs mx-auto leading-relaxed">
              Payment was processed successfully. Order is closed and dining
              table has been flagged as dirty. Redirecting...
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-semibold text-red-400 animate-slide-in">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Action Options Grid */}
        {!success && (
          <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
            {/* CASH PAYMENTS */}
            <button
              onClick={() => handlePaymentSubmit("cash")}
              disabled={processing}
              className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 flex flex-col items-center text-center justify-between min-h-40 cursor-pointer hover:border-[#10B981] hover:shadow-lg transition-all duration-200 active:scale-98 disabled:opacity-50"
            >
              <Coins className="h-8 w-8 text-[#10B981] mb-2" />
              <div>
                <h3 className="text-xs font-black text-[#EADED2]">
                  Cash payment
                </h3>
                <p className="text-4xs text-[#8E7E72] mt-1 leading-relaxed">
                  Drawer cash collections. Auto-settled instantly.
                </p>
              </div>
              <span className="text-4xs font-bold text-[#10B981] uppercase tracking-wider block mt-3">
                Settle Cash
              </span>
            </button>

            {/* CARD/DIGITAL PAYMENTS */}
            <button
              onClick={() => handlePaymentSubmit("digital")}
              disabled={processing}
              className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 flex flex-col items-center text-center justify-between min-h-40 cursor-pointer hover:border-[#3B82F6] hover:shadow-lg transition-all duration-200 active:scale-98 disabled:opacity-50"
            >
              <CreditCard className="h-8 w-8 text-[#3B82F6] mb-2" />
              <div>
                <h3 className="text-xs font-black text-[#EADED2]">
                  Card Swiping
                </h3>
                <p className="text-4xs text-[#8E7E72] mt-1 leading-relaxed">
                  Swipes or tap digital card terminals. Auto-settled.
                </p>
              </div>
              <span className="text-4xs font-bold text-[#3B82F6] uppercase tracking-wider block mt-3">
                Settle Card
              </span>
            </button>

            {/* UPI QR DYNAMIC GENERATOR */}
            <button
              onClick={() => handlePaymentSubmit("upi_qr")}
              disabled={processing || !isUpiEnabled}
              className={cn(
                "rounded-2xl border bg-[#161312] p-5 flex flex-col items-center text-center justify-between min-h-40 transition-all duration-200 select-none",
                isUpiEnabled
                  ? "border-[#2C2724] cursor-pointer hover:border-[#E28743] hover:shadow-lg active:scale-98"
                  : "border-[#2C2724]/20 opacity-30 cursor-not-allowed",
              )}
            >
              <QrCode className="h-8 w-8 text-[#E28743] mb-2" />
              <div>
                <h3 className="text-xs font-black text-[#EADED2]">
                  UPI QR Code
                </h3>
                <p className="text-4xs text-[#8E7E72] mt-1 leading-relaxed">
                  {isUpiEnabled
                    ? "Dynamic scan-and-pay VPA QR. Cashier verified."
                    : "UPI payments disabled by administrator."}
                </p>
              </div>
              <span className="text-4xs font-bold text-[#E28743] uppercase tracking-wider block mt-3">
                {isUpiEnabled ? "Generate QR" : "Disabled"}
              </span>
            </button>
          </div>
        )}
      </section>

      {/* ─── UPI QR PAYMENT MODAL OVERLAY ────────────────────────────────────── */}
      {isUpiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#2C2724] bg-[#161312] p-6 shadow-2xl text-center space-y-5 animate-scale-in">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-[#2C2724]/40">
              <span className="text-xs font-black text-[#EADED2]">
                UPI QR Code
              </span>
              <button
                onClick={() => setIsUpiModalOpen(false)}
                className="text-[#8E7E72] hover:text-[#EADED2] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* UPI QR Display Box */}
            <div className="mx-auto h-[260px] w-[260px] rounded-xl bg-white p-2.5 flex items-center justify-center border border-[#2C2724] shadow-inner">
              <img
                src={getQrCodeImageUrl()}
                alt="UPI Pay QR"
                className="h-full w-full object-contain select-none"
              />
            </div>

            {/* Billing details */}
            <div className="space-y-1 bg-[#1E1A18]/50 border border-[#2C2724]/30 rounded-xl p-3 text-xs">
              <div className="flex justify-between text-[#8E7E72]">
                <span>UPI ID:</span>
                <span className="font-bold text-[#EADED2]">{storeUpiId}</span>
              </div>
              <div className="flex justify-between text-[#8E7E72] pt-1">
                <span>Amount:</span>
                <span className="font-extrabold text-[#E28743]">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Cashier validation controls */}
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
                {processing && (
                  <Loader2 className="h-3 w-3 animate-spin text-[#161312]" />
                )}
                <CheckCircle2 className="h-4 w-4 text-[#161312]" />
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export type PosPaymentPage = typeof PosPaymentPage;
