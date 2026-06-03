"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@web/lib/trpc-client";

function AuthRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");

  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const isAdmin = user.role === "admin";
    const isCashier = user.role === "cashier";
    const isKitchen = user.role === "kitchen";

    // Enforce proper portal access
    if (source === "staff") {
      if (isAdmin) {
        router.replace("/reports"); // Dashboard
      } else if (isCashier) {
        router.replace("/floor"); // POS
      } else if (isKitchen) {
        router.replace("/kds"); // Kitchen Display
      } else {
        // Redirect customers trying to access staff portal
        logoutMutation.mutate(undefined, {
          onSuccess: () => {
            utils.auth.me.reset();
            router.replace("/login?error=unauthorized_staff");
          }
        });
      }
    } else if (source === "customer") {
      // Allow all users (including staff) to access the customer portal
      router.replace("/customer/menu");
    } else {
      // Fallback if no source is provided
      if (isAdmin) {
        router.replace("/reports");
      } else if (isCashier) {
        router.replace("/floor");
      } else if (isKitchen) {
        router.replace("/kds");
      } else {
        router.replace("/customer/menu");
      }
    }
  }, [isLoading, user, router, source, logoutMutation]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#12100F]">
      <Loader2 className="h-8 w-8 animate-spin text-[oklch(65%_0.18_75)]" />
    </div>
  );
}

export default function AuthRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[#12100F]">
          <Loader2 className="h-8 w-8 animate-spin text-[oklch(65%_0.18_75)]" />
        </div>
      }
    >
      <AuthRedirectContent />
    </Suspense>
  );
}
