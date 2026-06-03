export default function BackendLoading() {
  return (
    <div className="space-y-8 animate-pulse w-full max-w-7xl mx-auto px-4 py-6 md:px-8 lg:px-10">
      {/* ─── Header Skeleton ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#2C2724] pb-6 shrink-0">
        <div className="space-y-2.5">
          {/* Page Title skeleton */}
          <div className="h-7 w-52 rounded-lg bg-[#1E1A18]" />
          {/* Subtitle description skeleton */}
          <div className="h-4 w-80 rounded-lg bg-[#1E1A18]/60" />
        </div>
        {/* Buttons / Actions skeleton */}
        <div className="flex gap-3">
          <div className="h-10 w-28 rounded-xl bg-[#1E1A18]" />
          <div className="h-10 w-28 rounded-xl bg-[#1E1A18]/80" />
        </div>
      </div>

      {/* ─── Metric Cards Grid Skeleton ─── */}
      <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              {/* Metric title label */}
              <div className="h-3 w-24 rounded bg-[#1E1A18]" />
              {/* Metric icon frame */}
              <div className="h-8 w-8 rounded-lg bg-[#1E1A18]/60" />
            </div>
            {/* Metric numeric value */}
            <div className="h-7 w-36 rounded bg-[#1E1A18]" />
            {/* Metric growth subtext */}
            <div className="h-3.5 w-28 rounded bg-[#1E1A18]/45" />
          </div>
        ))}
      </div>

      {/* ─── Main Content Layout Grid Skeleton ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Double Columns (Ledger Logs / Tables / Lists) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg space-y-5">
            {/* List header label */}
            <div className="flex justify-between items-center border-b border-[#2C2724]/60 pb-3">
              <div className="h-4.5 w-40 rounded bg-[#1E1A18]" />
              <div className="h-3.5 w-16 rounded bg-[#1E1A18]/60" />
            </div>

            {/* List rows */}
            <div className="space-y-4 pt-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2 border-b border-[#2C2724]/10"
                >
                  <div className="flex gap-2">
                    <div className="h-3.5 w-8 rounded bg-[#1E1A18]" />
                    <div className="h-3.5 w-28 rounded bg-[#1E1A18]" />
                  </div>
                  <div className="h-3.5 w-20 rounded bg-[#1E1A18]/60" />
                  <div className="h-3.5 w-16 rounded bg-[#1E1A18]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Single Column (Analytics Breakdown / Details sidebars) */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg space-y-5">
            <div>
              {/* Analytics Header label */}
              <div className="h-4 w-32 rounded bg-[#1E1A18]" />
              <div className="h-3 w-44 rounded bg-[#1E1A18]/50 mt-1.5" />
            </div>

            {/* Analytics charts/bars */}
            <div className="space-y-4 pt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-28 rounded bg-[#1E1A18]" />
                    <div className="h-3 w-8 rounded bg-[#1E1A18]/80" />
                  </div>
                  {/* Progress bar line */}
                  <div className="h-2 w-full rounded bg-[#1E1A18]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
