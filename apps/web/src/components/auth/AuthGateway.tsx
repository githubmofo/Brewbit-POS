"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Coffee, Shield, User, Loader2 } from "lucide-react";
import { trpc } from "@web/lib/trpc-client";

type AuthTab = "staff" | "customer";
type AuthMode = "signin" | "signup";

interface AuthGatewayProps {
  initialMode: AuthMode;
}

export default function AuthGateway({ initialMode }: AuthGatewayProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const tabParam = searchParams.get("tab");
  const sourceParam = searchParams.get("source");

  const [activeTab, setActiveTab] = useState<AuthTab>(() => {
    if (initialMode === "signup") return "customer";
    if (tabParam === "customer" || sourceParam === "customer") return "customer";
    return "staff";
  });
  
  const [mode, setMode] = useState<AuthMode>(initialMode);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.refetch();
      router.push(`/auth-redirect?source=${activeTab}`);
    }
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.refetch();
      router.push(`/auth-redirect?source=${activeTab}`);
    }
  });

  useEffect(() => {
    if (initialMode === "signup") {
      setActiveTab("customer");
      setMode("signup");
    } else if (tabParam === "customer" || sourceParam === "customer") {
      setActiveTab("customer");
      setMode("signin");
    } else {
      setActiveTab("staff");
      setMode("signin");
    }
  }, [initialMode, tabParam, sourceParam]);

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    setMode("signin");
    router.replace(tab === "staff" ? "/login" : "/login?tab=customer");
    setEmail("");
    setPassword("");
    setName("");
    loginMutation.reset();
    registerMutation.reset();
  };

  const handleSignUpClick = () => {
    setMode("signup");
    router.push("/signup");
    loginMutation.reset();
    registerMutation.reset();
  };

  const handleSignInClick = () => {
    setMode("signin");
    router.push("/login?tab=customer");
    loginMutation.reset();
    registerMutation.reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ name, email, password, role: activeTab === "staff" ? "admin" : "customer" });
    }
  };
  
  const errorMsg = loginMutation.error?.message || registerMutation.error?.message;
  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      {/* Background atmosphere */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 40% 25%, oklch(65% 0.18 75 / 0.1), transparent 65%),
              radial-gradient(ellipse at 60% 75%, oklch(70% 0.18 155 / 0.04), transparent 50%),
              #12100F
            `,
          }}
        />
      </div>

      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        {/* ─── Logo + Branding ──────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, oklch(65% 0.18 75), oklch(50% 0.16 75))",
              boxShadow: "0 6px 20px oklch(65% 0.18 75 / 0.3)",
            }}
          >
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#EADED2]">
            Brewbit POS
          </span>
        </div>
        <p className="text-xs font-medium tracking-wide uppercase mb-8 text-[#8E7E72]">
          Smart Cafe Management
        </p>

        {/* ─── Auth Card Container ──────────────────────────────── */}
        <div
          className="w-full rounded-2xl p-6 sm:p-8"
          style={{
            background: "oklch(13% 0.008 75)",
            border: "1px solid oklch(22% 0.01 75)",
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)",
          }}
        >
          {errorParam && (
            <div className="mb-6 p-4 rounded-xl border border-[oklch(60%_0.22_25)] bg-[oklch(60%_0.22_25_/_0.1)] text-[oklch(70%_0.18_25)] text-sm font-medium">
              {errorParam === "unauthorized_staff" 
                ? "You must be an admin to access the Staff portal." 
                : "Admins cannot access the Customer portal from here."}
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl border border-[oklch(60%_0.22_25)] bg-[oklch(60%_0.22_25_/_0.1)] text-[#ff6b6b] text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {/* ─── Tab Switcher ────────────────────────────────── */}
          <div
            className="flex rounded-xl p-1 mb-6 sm:mb-8"
            style={{
              background: "oklch(9% 0.005 75)",
              border: "1px solid oklch(18% 0.008 75)",
            }}
          >
            <button
              type="button"
              onClick={() => handleTabChange("staff")}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200"
              style={{
                background: activeTab === "staff" ? "oklch(18% 0.01 75)" : "transparent",
                color: activeTab === "staff" ? "oklch(65% 0.18 75)" : "#8E7E72",
                boxShadow: activeTab === "staff" ? "0 2px 8px rgba(0, 0, 0, 0.15)" : "none",
              }}
            >
              <Shield className="h-4 w-4" />
              Staff / Admin
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("customer")}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200"
              style={{
                background: activeTab === "customer" ? "oklch(18% 0.01 75)" : "transparent",
                color: activeTab === "customer" ? "oklch(70% 0.18 155)" : "#8E7E72",
                boxShadow: activeTab === "customer" ? "0 2px 8px rgba(0, 0, 0, 0.15)" : "none",
              }}
            >
              <User className="h-4 w-4" />
              Customer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="mb-2">
              <h2 className="text-lg font-bold tracking-tight text-[#EADED2]">
                {activeTab === "customer" 
                  ? "Customer Sign In" 
                  : mode === "signin" ? "Staff Sign In" : "Register Admin"}
              </h2>
              <p className="text-xs mt-1 text-[#8E7E72]">
                {activeTab === "customer" 
                  ? "Sign in to view your orders and place orders." 
                  : mode === "signin"
                    ? "Enter your admin email to access the POS terminal."
                    : "Create a new admin account."}
              </p>
            </div>

            {mode === "signup" && activeTab === "staff" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[#8E7E72] font-semibold text-xs tracking-wide uppercase">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="p-2.5 rounded-lg border border-[#3A342E] bg-[#262220] text-[#EADED2] focus:outline-none focus:border-[oklch(65%_0.18_75)]"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[#8E7E72] font-semibold text-xs tracking-wide uppercase">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-2.5 rounded-lg border border-[#3A342E] bg-[#262220] text-[#EADED2] focus:outline-none focus:border-[oklch(65%_0.18_75)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[#8E7E72] font-semibold text-xs tracking-wide uppercase">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-2.5 rounded-lg border border-[#3A342E] bg-[#262220] text-[#EADED2] focus:outline-none focus:border-[oklch(65%_0.18_75)]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 p-3 rounded-lg bg-[oklch(65%_0.18_75)] hover:bg-[oklch(70%_0.18_75)] text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === "signin" ? "Sign In" : "Sign Up")}
            </button>
          </form>

          {activeTab === "customer" ? (
             <p className="text-center text-[10px] mt-4 text-[#5A4F47]">
               Customer sign in. View your orders and place orders.
             </p>
          ) : (
            <div className="mt-5 pt-4 text-center text-xs border-t border-[#3A342E] text-[#8E7E72]">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an admin account?{" "}
                  <button type="button" onClick={handleSignUpClick} className="font-semibold text-[oklch(70%_0.18_155)]">
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already have an admin account?{" "}
                  <button type="button" onClick={handleSignInClick} className="font-semibold text-[oklch(65%_0.18_75)]">
                    Sign In
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer Status ────────────────────────────────── */}
        <div className="flex items-center justify-center gap-3 mt-8 text-[0.7rem] text-[#5A4F47]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[oklch(70%_0.18_155)]" />
            System Online
          </span>
          <span>·</span>
          <span>Brewbit POS v5.0</span>
        </div>
      </div>
    </main>
  );
}
