"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coffee,
  Layers,
  CreditCard,
  Map,
  History,
  LayoutDashboard,
  ArrowLeft,
  Menu,
  X,
  ChefHat,
  LogOut,
} from "lucide-react";
import { trpc } from "@web/lib/trpc-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function BackendSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      utils.auth.me.reset();
      router.push("/login");
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      name: "Dashboard",
      href: "/reports",
      icon: LayoutDashboard,
    },
    {
      name: "Products",
      href: "/products",
      icon: Coffee,
    },
    {
      name: "Payment Methods",
      href: "/payment-methods",
      icon: CreditCard,
    },
    {
      name: "Floor Plan Setup",
      href: "/floor-plan",
      icon: Map,
    },
    {
      name: "Register Sessions",
      href: "/sessions",
      icon: History,
    },
    {
      name: "Kitchen",
      href: "/kds",
      icon: ChefHat,
    },
  ];

  return (
    <>
      {/* Mobile Header Top-Bar */}
      <header className="flex h-16 items-center justify-between border-b border-[#2C2724] bg-[#1F1C1A] px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#E28743] to-[#B35C1E] shadow-lg shadow-[#E28743]/15">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-[#EADED2]">
            Brewbit Admin
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2C2724] bg-[#25201E] text-[#CBB9A8] transition-colors hover:text-[#EADED2]"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Backdrop for Mobile Drawer */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      {/* Main Navigation Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#2C2724] bg-[#161312] transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Logo Section */}
        <div className="flex h-20 items-center gap-3 border-b border-[#2C2724]/60 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E28743] to-[#B35C1E] shadow-lg shadow-[#E28743]/20">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#EADED2]">
              Brewbit POS
            </h1>
            <p className="text-xs text-[#8E7E72] font-medium uppercase tracking-widest">
              Management
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setIsOpen(false)}
                className={`group flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-medium tracking-wide transition-all duration-200 relative overflow-hidden ${
                  isActive
                    ? "text-[#EADED2] bg-[#25201E] border-l-3 border-[#E28743] shadow-md shadow-[#E28743]/5"
                    : "text-[#A39284] hover:bg-[#1C1816]/70 hover:text-[#EADED2]"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-[#E28743]" : "text-[#8E7E72]"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions (Return to POS + Clerk User Profile) */}
        <div className="mt-auto border-t border-[#2C2724]/60 p-4 space-y-3.5">
          {/* Quick Return to POS Terminal Button */}
          <div className="flex gap-2">
            <Link
              href="/floor"
              prefetch={false}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#2C2724] bg-[#1E1A18] px-4 py-3 text-sm font-semibold text-[#E28743] shadow-inner transition-all duration-200 hover:bg-[#E28743] hover:text-[#161312] active:scale-98"
            >
              <ArrowLeft className="h-4 w-4" />
              POS
            </Link>

            <button
              onClick={() => logoutMutation.mutate()}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#2C2724] bg-[#1E1A18] px-4 py-3 text-sm font-semibold text-[#8E7E72] shadow-inner transition-all duration-200 hover:bg-[#2C2724] hover:text-[#EADED2] active:scale-98"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Logged in User Profile Info */}
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between rounded-xl bg-[#1C1816] p-3.5 border border-[#2C2724]/40 hover:border-[#E28743]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col truncate max-w-[140px] pl-2">
                <span className="text-sm font-semibold text-[#EADED2] truncate leading-tight">
                  {user?.name || "Employee"}
                </span>
                <span className="text-2xs font-medium text-[#8E7E72] tracking-wider uppercase">
                  {user?.role === "admin" ? "Admin" : "Cashier"}
                </span>
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
