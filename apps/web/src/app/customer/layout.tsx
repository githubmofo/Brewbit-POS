"use client";

import { Coffee, UtensilsCrossed, ShoppingBag, User } from "lucide-react";
import { trpc } from "@web/lib/trpc-client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCustomerCartStore } from "@web/stores/customer-cart.store";

const navItems = [
  { label: "Tables", href: "/customer", icon: Coffee },
  { label: "Menu", href: "/customer/menu", icon: UtensilsCrossed },
  { label: "Cart", href: "/customer/cart", icon: ShoppingBag },
  { label: "Profile", href: "/customer/profile", icon: User },
] as const;

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const itemCount = useCustomerCartStore((s) => s.getItemCount());
  const { data: user } = trpc.auth.me.useQuery();

  // Check active nav — exact match for /customer, startsWith for sub-routes
  const isActive = (href: string): boolean => {
    if (href === "/customer") return pathname === "/customer";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#12100F] text-[#EADED2]">
      {/* ─── Top Header ──────────────────────────────────────────────── */}
      <header
        className="flex h-14 items-center justify-between border-b px-4 sm:px-6 shrink-0"
        style={{ borderColor: "oklch(22% 0.01 75)" }}
      >
        <Link href="/customer" className="flex items-center gap-2 group">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
            style={{
              background:
                "linear-gradient(135deg, oklch(65% 0.18 75), oklch(50% 0.16 75))",
              boxShadow: "0 3px 10px oklch(65% 0.18 75 / 0.2)",
            }}
          >
            <Coffee className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-[#EADED2]">
            Brewbit
          </span>
        </Link>

        <Link
          href="/customer/profile"
          className="rounded-full flex items-center justify-center h-8 w-8 text-xs font-bold text-white cursor-pointer transition-transform hover:scale-105 active:scale-95"
          style={{
            border: "1px solid oklch(22% 0.01 75)",
            background: "oklch(65% 0.18 75)",
          }}
          title="Go to Profile"
        >
          {user?.name?.[0]?.toUpperCase() || "U"}
        </Link>
      </header>

      {/* ─── Page Content ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0 pb-16 sm:pb-18 overflow-y-auto">
        {children}
      </main>

      {/* ─── Bottom Navigation Bar ───────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t"
        style={{
          borderColor: "oklch(22% 0.01 75)",
          background: "oklch(11% 0.006 75 / 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const isCart = item.label === "Cart";

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors duration-200 relative"
              style={{
                color: active ? "oklch(65% 0.18 75)" : "#6B5E54",
              }}
            >
              <div className="relative">
                <Icon
                  className="h-5 w-5 transition-transform duration-200"
                  style={{
                    transform: active ? "scale(1.1)" : "scale(1)",
                  }}
                />
                {/* Cart badge */}
                {isCart && itemCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                    style={{
                      background: "oklch(60% 0.22 25)",
                      boxShadow: "0 2px 6px oklch(60% 0.22 25 / 0.4)",
                    }}
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{ opacity: active ? 1 : 0.7 }}
              >
                {item.label}
              </span>
              {/* Active indicator dot */}
              {active && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full"
                  style={{ background: "oklch(65% 0.18 75)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
