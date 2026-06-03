"use client";

import { trpc } from "@web/lib/trpc-client";
import {
  History,
  User,
  Calendar,
  Coins,
  CircleDot,
  Lock,
  Unlock,
  Loader2,
} from "lucide-react";

export default function SessionsLedgerPage() {
  // ─── QUERY FOR REGISTER LEDGERS ─────────────────────────────────────────────
  const { data: ledgerHistory = [], isLoading } = trpc.session.list.useQuery();

  // Helper to format date strings cleanly
  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "--";
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header Board */}
      <div className="border-b border-[#2C2724] pb-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#EADED2]">
          Register Sessions
        </h2>
        <p className="text-sm text-[#8E7E72] mt-1">
          Review past registers, check opening cash drawer balances, and track
          cashier sessions.
        </p>
      </div>

      {isLoading ? (
        /* Skeletons */
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-[#161312] border border-[#2C2724] animate-pulse"
            />
          ))}
        </div>
      ) : ledgerHistory.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C2724] bg-[#161312] py-16 text-center">
          <History className="h-10 w-10 text-[#8E7E72] mb-3" />
          <h3 className="text-base font-semibold text-[#EADED2]">
            No Active Sessions Recorded
          </h3>
          <p className="text-sm text-[#8E7E72] mt-1">
            Drawer records appear here once a cashier opens a POS terminal
            register.
          </p>
        </div>
      ) : (
        /* Session List Container */
        <div className="space-y-4">
          {ledgerHistory.map((session: any) => {
            const isOpen = session.status === "open";

            return (
              <div
                key={session.id}
                className={`rounded-2xl border bg-[#161312] p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all duration-300 hover:border-[#8E7E72]/45 ${
                  isOpen
                    ? "border-[#E28743]/30 shadow-md shadow-[#E28743]/2"
                    : "border-[#2C2724]"
                }`}
              >
                {/* Employee User & Status section */}
                <div className="flex items-center gap-4 min-w-[200px]">
                  <span
                    className={`h-11 w-11 rounded-xl flex items-center justify-center border ${
                      isOpen
                        ? "bg-[#E28743]/10 border-[#E28743]/20 text-[#E28743]"
                        : "bg-[#25201E] border-[#2C2724] text-[#8E7E72]"
                    }`}
                  >
                    {isOpen ? (
                      <Unlock className="h-5 w-5" />
                    ) : (
                      <Lock className="h-5 w-5" />
                    )}
                  </span>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#EADED2]">
                        {session.user?.name || "POS Cashier"}
                      </h4>
                      {isOpen ? (
                        <span className="flex items-center gap-1 text-3xs font-bold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10 uppercase tracking-widest animate-pulse">
                          <CircleDot className="h-2 w-2 text-emerald-400" />
                          Open
                        </span>
                      ) : (
                        <span className="text-3xs font-semibold text-[#8E7E72] bg-[#25201E] px-2 py-0.5 rounded-full border border-[#2C2724] uppercase tracking-widest">
                          Closed
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#8E7E72] flex items-center gap-1.5 font-medium">
                      <User className="h-3.5 w-3.5 text-[#8E7E72]/60" />
                      {session.user?.email || "employee@brewbit.internal"}
                    </span>
                  </div>
                </div>

                {/* Balance sheet summaries */}
                <div className="grid grid-cols-2 gap-6 md:gap-10 border-t md:border-t-0 pt-4 md:pt-0 border-[#2C2724]/40">
                  {/* Opening */}
                  <div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-[#8E7E72] block">
                      Opening Balance
                    </span>
                    <span className="text-sm font-bold text-[#CBB9A8] mt-1.5 flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-[#8E7E72]/60" />₹
                      {parseFloat(session.openingBalance).toFixed(2)}
                    </span>
                  </div>
                  {/* Closing */}
                  <div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-[#8E7E72] block">
                      Closing Balance
                    </span>
                    <span
                      className={`text-sm font-bold mt-1.5 flex items-center gap-1.5 ${
                        isOpen ? "text-[#8E7E72] italic" : "text-[#E28743]"
                      }`}
                    >
                      <Coins className="h-4 w-4 text-[#8E7E72]/60" />
                      {session.closingBalance
                        ? `₹${parseFloat(session.closingBalance).toFixed(2)}`
                        : "Active Drawer"}
                    </span>
                  </div>
                </div>

                {/* Timestamps ledger */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 border-t md:border-t-0 pt-4 md:pt-0 border-[#2C2724]/40 min-w-[280px]">
                  <div className="space-y-1">
                    <span className="text-3xs font-bold uppercase tracking-wider text-[#8E7E72] block">
                      Opened Register At
                    </span>
                    <span className="text-xs text-[#CBB9A8] font-medium flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#8E7E72]/60" />
                      {formatDateTime(session.openedAt)}
                    </span>
                  </div>
                  {!isOpen && (
                    <div className="space-y-1">
                      <span className="text-3xs font-bold uppercase tracking-wider text-[#8E7E72] block">
                        Closed Register At
                      </span>
                      <span className="text-xs text-[#CBB9A8] font-medium flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#8E7E72]/60" />
                        {formatDateTime(session.closedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
