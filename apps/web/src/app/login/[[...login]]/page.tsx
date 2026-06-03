import AuthGateway from "@web/components/auth/AuthGateway";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#12100F] text-[#8E7E72] text-sm">
          Loading...
        </div>
      }
    >
      <AuthGateway initialMode="signin" />
    </Suspense>
  );
}
