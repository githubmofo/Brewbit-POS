"use client";

import { trpc } from "@web/lib/trpc-client";
import { useSessionStore } from "@web/stores/session.store";
import { PosTopBar } from "@web/components/layout/PosTopBar";
import { useEffect, useState } from "react";
import { Coins, Lock, Loader2, AlertTriangle } from "lucide-react";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const { activeSession, setSession, clearSession } = useSessionStore();
  const [openingBalance, setOpeningBalance] = useState<number | "">(1000); // Default Rs 1000 starting cash
  const [closingBalance, setClosingBalance] = useState<number | "">(0);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [openRegisterError, setOpenRegisterError] = useState<string | null>(
    null,
  );
  const [closeRegisterError, setCloseRegisterError] = useState<string | null>(
    null,
  );

  // tRPC query to fetch active cash register shift for the employee
  const {
    data: serverSession,
    isLoading,
    refetch,
  } = trpc.session.getCurrent.useQuery();

  const openSessionMutation = trpc.session.open.useMutation({
    onSuccess: (session: any) => {
      setSession(session);
      refetch();
    },
    onError: (err) => setOpenRegisterError(err.message),
  });

  const closeSessionMutation = trpc.session.close.useMutation({
    onSuccess: () => {
      clearSession();
      setIsCloseModalOpen(false);
      window.location.href = "/reports";
    },
    onError: (err) => setCloseRegisterError(err.message),
  });

  // Sync server session to Zustand store
  useEffect(() => {
    if (serverSession) {
      setSession(serverSession);
    } else if (!isLoading) {
      clearSession();
    }
  }, [serverSession, isLoading, setSession, clearSession]);

  // Handle register opening
  const handleOpenRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setOpenRegisterError(null);
    openSessionMutation.mutate({ openingBalance: Number(openingBalance) || 0 });
  };

  // Handle register closing
  const handleCloseRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    setCloseRegisterError(null);
    closeSessionMutation.mutate({
      sessionId: activeSession.id,
      closingBalance: Number(closingBalance) || 0,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#12100F] text-[#EADED2]">
        <Loader2 className="h-8 w-8 animate-spin text-[#E28743] mb-2.5" />
        <span className="text-xs font-semibold text-[#8E7E72] uppercase tracking-widest">
          Resolving Register Drawer Status...
        </span>
      </div>
    );
  }

  // If no register session is open, block checkout and render "Open Register" wall
  if (!activeSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#12100F] px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-[#2C2724] bg-[#161312] p-6 sm:p-8 shadow-2xl text-center space-y-5 sm:space-y-6 animate-scale-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E28743]/10 border border-[#E28743]/20 text-[#E28743] shadow-md shadow-[#E28743]/5">
            <Lock className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#EADED2]">
              POS Terminal Locked
            </h2>
            <p className="text-[10px] sm:text-xs text-[#8E7E72] mt-1.5 leading-relaxed">
              No active register shift is open for your account. Please declare
              your starting cash drawer balance to unlock this cashier terminal
              workspace.
            </p>
          </div>

          {openRegisterError && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-xs font-semibold text-red-400 text-left">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
              {openRegisterError}
            </div>
          )}

          <form onSubmit={handleOpenRegister} className="space-y-4 text-left">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                Starting Cash Balance (₹)
              </label>
              <div className="relative">
                <Coins className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#8E7E72]" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={openingBalance}
                  onChange={(e) =>
                    setOpeningBalance(e.target.value === "" ? "" : parseFloat(e.target.value))
                  }
                  className="w-full rounded-xl border border-[#2C2724] bg-[#1E1A18] pl-11 pr-4 py-3 text-sm text-[#EADED2] focus:border-[#E28743] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={openSessionMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E28743] py-3 text-sm font-bold text-[#161312] shadow-lg shadow-[#E28743]/15 transition-all hover:bg-[#F49753] active:scale-98 disabled:opacity-50"
            >
              {openSessionMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-[#161312]" />
              )}
              Open Register Shift
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#12100F] text-[#EADED2]">
      {/* Top Header Navigation */}
      <PosTopBar
        onCloseRegister={() => {
          setClosingBalance(parseFloat(activeSession.openingBalance) || 0); // pre-fill with opening cash balance
          setIsCloseModalOpen(true);
        }}
      />

      {/* Main Terminal Viewport Workspace */}
      <main className="flex-1 flex flex-col min-h-0 min-w-0">{children}</main>

      {/* ─── CASHIER CLOSE REGISTER SHIFT MODAL ────────────────────────────── */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#2C2724] bg-[#161312] p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-[#EADED2] flex items-center gap-2 pb-4 border-b border-[#2C2724]/60">
              <Lock className="h-5 w-5 text-red-400" />
              Close Register Session
            </h3>

            {closeRegisterError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 text-xs font-semibold text-red-400">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                {closeRegisterError}
              </div>
            )}

            <form onSubmit={handleCloseRegister} className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                  Final Closed Cash Drawer (₹)
                </label>
                <div className="relative">
                  <Coins className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#8E7E72]" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={closingBalance}
                    onChange={(e) =>
                      setClosingBalance(e.target.value === "" ? "" : parseFloat(e.target.value))
                    }
                    className="w-full rounded-xl border border-[#2C2724] bg-[#1E1A18] pl-11 pr-4 py-3 text-sm text-[#EADED2] focus:border-[#E28743] focus:outline-none"
                  />
                </div>
                <p className="text-[9px] text-[#8E7E72] mt-1.5 leading-relaxed tracking-wide">
                  Ensure you count physical cash matching transactions to close
                  the register ledger shift.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#2C2724]/40">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="rounded-xl border border-[#2C2724] px-4 py-2.5 text-xs font-semibold text-[#8E7E72] hover:text-[#CBB9A8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closeSessionMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-red-500 hover:bg-red-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  {closeSessionMutation.isPending && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Finalize Register Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
