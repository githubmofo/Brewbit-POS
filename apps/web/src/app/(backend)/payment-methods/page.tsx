"use client";

import { useState, useEffect } from "react";
import { trpc } from "@web/lib/trpc-client";
import {
  CreditCard,
  Coins,
  QrCode,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { updatePaymentMethodConfigSchema } from "@pos/validators";

export default function PaymentMethodsPage() {
  const utils = trpc.useUtils();

  // ─── QUERY & MUTATION ───────────────────────────────────────────────────────
  const { data: configs = [], isLoading } = trpc.payment.getConfigs.useQuery();

  const updateConfigMutation = trpc.payment.updateConfig.useMutation({
    onSuccess: () => {
      utils.payment.getConfigs.invalidate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err) => {
      setFormError(err.message);
      setTimeout(() => setFormError(null), 5000);
    },
  });

  // ─── LOCAL STATE ────────────────────────────────────────────────────────────
  const [upiId, setUpiId] = useState("");
  const [cashEnabled, setCashEnabled] = useState(true);
  const [digitalEnabled, setDigitalEnabled] = useState(true);
  const [upiEnabled, setUpiEnabled] = useState(true);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync server data to local form states on load
  useEffect(() => {
    if (configs && configs.length > 0) {
      const cash = configs.find((c) => c.method === "cash");
      const digital = configs.find((c) => c.method === "digital");
      const upi = configs.find((c) => c.method === "upi_qr");

      if (cash) setCashEnabled(cash.isEnabled);
      if (digital) setDigitalEnabled(digital.isEnabled);
      if (upi) {
        setUpiEnabled(upi.isEnabled);
        setUpiId(upi.upiId || "");
      }
    }
  }, [configs]);

  // ─── SAVE CONFIGS ───────────────────────────────────────────────────────────
  const handleSaveConfigs = async (method: "cash" | "digital" | "upi_qr") => {
    let isEnabled = true;
    let upi: string | undefined = undefined;

    if (method === "cash") isEnabled = cashEnabled;
    if (method === "digital") isEnabled = digitalEnabled;
    if (method === "upi_qr") {
      isEnabled = upiEnabled;
      upi = upiId;

      // Validate UPI ID format
      if (isEnabled && (!upi || !upi.includes("@"))) {
        setFormError(
          "A valid UPI ID is required to enable UPI QR payments (e.g., store@upi).",
        );
        return;
      }
    }

    const payload = {
      method,
      isEnabled,
      upiId: upi,
      settings: {},
    };

    const result = updatePaymentMethodConfigSchema.safeParse(payload);
    if (!result.success) {
      setFormError(
        result.error.errors[0]?.message || "Validation check failed.",
      );
      return;
    }

    updateConfigMutation.mutate(payload);
  };

  return (
    <div className="space-y-8">
      {/* Header Board */}
      <div className="border-b border-[#2C2724] pb-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#EADED2]">
          Payment Method Configurations
        </h2>
        <p className="text-sm text-[#8E7E72] mt-1">
          Configure cash counters, digital card terms, and store merchant UPI
          handles.
        </p>
      </div>

      {/* Success/Error Alerts */}
      {saveSuccess && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm font-semibold text-emerald-400 animate-slide-in">
          <CheckCircle className="h-5 w-5 shrink-0" />
          Payment method configurations updated successfully!
        </div>
      )}

      {formError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm font-semibold text-red-400 animate-slide-in">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {formError}
        </div>
      )}

      {isLoading ? (
        /* Skeletons */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 rounded-2xl bg-[#161312] border border-[#2C2724] animate-pulse"
            />
          ))}
        </div>
      ) : (
        /* Configuration Cards */
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* CARD 1: CASH */}
          <div
            className={`rounded-2xl border bg-[#161312] p-6 flex flex-col justify-between transition-all duration-300 ${
              cashEnabled
                ? "border-[#E28743]/20 shadow-md shadow-[#E28743]/3"
                : "border-[#2C2724]/40 opacity-70"
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="h-10 w-10 rounded-xl bg-[#25201E] border border-[#2C2724] flex items-center justify-center">
                  <Coins className="h-5 w-5 text-[#E28743]" />
                </span>
                {/* Toggle switch */}
                <button
                  onClick={() => setCashEnabled(!cashEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    cashEnabled ? "bg-[#E28743]" : "bg-[#25201E]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#161312] shadow ring-0 transition duration-200 ease-in-out ${
                      cashEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#EADED2]">
                  Cash Register
                </h3>
                <p className="text-xs text-[#8E7E72] mt-1.5 leading-relaxed">
                  Allows physical currency collections. Cash payments are
                  auto-confirmed and automatically balance register ledgers.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#2C2724]/30 flex justify-end">
              <button
                onClick={() => handleSaveConfigs("cash")}
                disabled={updateConfigMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[#25201E] hover:bg-[#2C2724] px-4.5 py-2 text-xs font-bold text-[#EADED2] transition-colors border border-[#2C2724]/60 active:scale-98"
              >
                {updateConfigMutation.isPending && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                <Save className="h-3.5 w-3.5" />
                Save Cash Config
              </button>
            </div>
          </div>

          {/* CARD 2: DIGITAL */}
          <div
            className={`rounded-2xl border bg-[#161312] p-6 flex flex-col justify-between transition-all duration-300 ${
              digitalEnabled
                ? "border-[#E28743]/20 shadow-md shadow-[#E28743]/3"
                : "border-[#2C2724]/40 opacity-70"
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="h-10 w-10 rounded-xl bg-[#25201E] border border-[#2C2724] flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-[#E28743]" />
                </span>
                {/* Toggle switch */}
                <button
                  onClick={() => setDigitalEnabled(!digitalEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    digitalEnabled ? "bg-[#E28743]" : "bg-[#25201E]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#161312] shadow ring-0 transition duration-200 ease-in-out ${
                      digitalEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#EADED2]">
                  Card Terminal
                </h3>
                <p className="text-xs text-[#8E7E72] mt-1.5 leading-relaxed">
                  Allows physical credit/debit card card swipes or NFC tap
                  transactions. Card payments are auto-confirmed by default.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#2C2724]/30 flex justify-end">
              <button
                onClick={() => handleSaveConfigs("digital")}
                disabled={updateConfigMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[#25201E] hover:bg-[#2C2724] px-4.5 py-2 text-xs font-bold text-[#EADED2] transition-colors border border-[#2C2724]/60 active:scale-98"
              >
                {updateConfigMutation.isPending && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                <Save className="h-3.5 w-3.5" />
                Save Card Config
              </button>
            </div>
          </div>

          {/* CARD 3: UPI QR */}
          <div
            className={`rounded-2xl border bg-[#161312] p-6 flex flex-col justify-between transition-all duration-300 md:col-span-2 lg:col-span-1 ${
              upiEnabled
                ? "border-[#E28743]/20 shadow-md shadow-[#E28743]/3"
                : "border-[#2C2724]/40 opacity-70"
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="h-10 w-10 rounded-xl bg-[#25201E] border border-[#2C2724] flex items-center justify-center">
                  <QrCode className="h-5 w-5 text-[#E28743]" />
                </span>
                {/* Toggle switch */}
                <button
                  onClick={() => setUpiEnabled(!upiEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    upiEnabled ? "bg-[#E28743]" : "bg-[#25201E]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#161312] shadow ring-0 transition duration-200 ease-in-out ${
                      upiEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#EADED2]">
                  Store UPI QR Codes
                </h3>
                <p className="text-xs text-[#8E7E72] mt-1.5 leading-relaxed">
                  Generates instant dynamic POS payment UPI QR codes. Payments
                  go pending and are manually verified by cashiers.
                </p>
              </div>

              {/* UPI Merchant ID Settings */}
              {upiEnabled && (
                <div className="pt-2 animate-fade-in">
                  <label className="text-3xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                    Merchant UPI ID (VPA)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. brewbit@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3 py-2 text-xs text-[#EADED2] placeholder-[#8E7E72] focus:border-[#E28743] focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-[#2C2724]/30 flex justify-end">
              <button
                onClick={() => handleSaveConfigs("upi_qr")}
                disabled={updateConfigMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[#E28743] hover:bg-[#F49753] px-4.5 py-2 text-xs font-bold text-[#161312] transition-colors active:scale-98"
              >
                {updateConfigMutation.isPending && (
                  <Loader2 className="h-3 w-3 animate-spin text-[#161312]" />
                )}
                <Save className="h-3.5 w-3.5" />
                Save UPI Config
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
