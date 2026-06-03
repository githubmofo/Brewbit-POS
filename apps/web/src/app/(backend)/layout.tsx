import { BackendSidebar } from "@web/components/layout/BackendSidebar";

export default function BackendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#12100F] text-[#EADED2]">
      {/* Dynamic sidebar component for admin controls — hidden on paper prints */}
      <div className="print:hidden">
        <BackendSidebar />
      </div>

      {/* Main viewport workspace wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-10 max-w-7xl w-full mx-auto print:px-0 print:py-0 print:max-w-none print:w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
