"use client";

import Link from "next/link";
import { Coffee, Shield, LogOut, Clock, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { useSessionStore } from "@web/stores/session.store";
import { trpc } from "@web/lib/trpc-client";
import { useRouter } from "next/navigation";

interface PosTopBarProps {
  onCloseRegister?: () => void;
}

export function PosTopBar({ onCloseRegister }: PosTopBarProps) {
  const router = useRouter();
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      utils.auth.me.reset();
      router.push("/login");
    }
  });
  const { activeSession } = useSessionStore();
  const [time, setTime] = useState("");

  // Live POS clock update loop
  useEffect(() => {
    const updateClock = () => {
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-[#2C2724] bg-[#161312] px-4 sm:px-6 shadow-md shadow-black/10">
      {/* Brand Logo & Session Status */}
      <div className="flex items-center gap-4">
        <Link href="/floor" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#E28743] to-[#B35C1E] shadow-md shadow-[#E28743]/15">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-[#EADED2]">
            Brewbit POS
          </span>
        </Link>

        {activeSession && (
          <div className="hidden sm:flex items-center gap-2 border-l border-[#2C2724] pl-4">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-[#8E7E72] uppercase tracking-wider">
              Drawer Open (₹
              {parseFloat(activeSession.openingBalance).toFixed(2)})
            </span>
          </div>
        )}
      </div>

      {/* Dynamic Clock & Admin quick-links */}
      <div className="flex items-center gap-2 sm:gap-4.5">
        {/* Dynamic clock */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3 py-1.5 text-xs font-semibold text-[#CBB9A8]">
          <Clock className="h-3.5 w-3.5 text-[#E28743]" />
          {time || "Loading..."}
        </div>

        {/* Link to Admin Modules */}
        <Link
          href="/reports"
          className="flex items-center gap-1.5 rounded-lg border border-[#2C2724] bg-[#1E1A18] px-2 py-1.5 sm:px-3.5 text-xs font-bold text-[#A39284] hover:text-[#EADED2] hover:bg-[#25201E] transition-all"
        >
          <Shield className="h-3.5 w-3.5 text-[#E28743]" />
          <span className="hidden sm:inline">Admin Portal</span>
        </Link>

        {/* Close Register Trigger Button */}
        {onCloseRegister && activeSession && (
          <button
            onClick={onCloseRegister}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-2 py-1.5 sm:px-3.5 text-xs font-bold text-red-400 transition-all active:scale-98"
          >
            <LogOut className="h-3.5 w-3.5 text-red-400" />
            <span className="hidden sm:inline">Close Register</span>
          </button>
        )}

        {/* User / Logout */}
        <div className="flex items-center gap-3 border border-[#2C2724] rounded-full px-3 py-1.5 bg-[#25201E]">
          <span className="text-sm font-semibold text-[#EADED2]">{user?.name}</span>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-[#8E7E72] hover:text-red-400 transition-colors"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
export type PosTopBar = typeof PosTopBar;
