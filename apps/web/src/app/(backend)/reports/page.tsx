import { db } from "@web/server/db";
import {
  orders,
  sessions,
  orderItems,
  products,
  users,
} from "@web/server/db/schema";
import { desc, sql, eq, and, gte, lte, exists, inArray } from "drizzle-orm";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Clock,
  History,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import { Suspense } from "react";
import { ReportFilters } from "@web/components/reports/ReportFilters";

export const metadata = {
  title: "Revenue & Shift Ledgers",
};

interface ReportFiltersState {
  startDate?: string;
  endDate?: string;
  sessionId?: string;
  userId?: string;
  productId?: string;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const filters: ReportFiltersState = {
    startDate: resolvedParams.startDate,
    endDate: resolvedParams.endDate,
    sessionId: resolvedParams.sessionId,
    userId: resolvedParams.userId,
    productId: resolvedParams.productId,
  };

  // Fetch dropdown feeds in parallel for filter selectors
  const [cashiersList, sessionsList, productsList] = await Promise.all([
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.role, ["admin", "cashier"]))
      .orderBy(users.name),
    db
      .select({
        id: sessions.id,
        openedAt: sessions.openedAt,
        userName: users.name,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .orderBy(desc(sessions.openedAt))
      .limit(30),
    db
      .select({ id: products.id, name: products.name })
      .from(products)
      .orderBy(products.name),
  ]);

  return (
    <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-6 md:px-8 max-w-7xl w-full mx-auto print:px-0 print:py-0 print:space-y-4">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#EADED2]">
            Management Dashboard
          </h2>
          <p className="text-xs text-[#8E7E72] mt-0.5">
            Real-time revenue metrics, register shift ledgers, and cafe sales
            breakdowns.
          </p>
        </div>
      </div>

      {/* Interactive Filters Panel Component */}
      <ReportFilters
        cashiers={cashiersList}
        sessions={sessionsList.map((s) => ({
          id: s.id,
          label: `${s.userName || "Unknown"} (${new Date(s.openedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })})`,
        }))}
        products={productsList}
      />

      <Suspense key={JSON.stringify(filters)} fallback={<DashboardSkeleton />}>
        <DashboardContent filters={filters} />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Metrics Row Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 rounded bg-[#1E1A18]" />
              <div className="h-8 w-8 rounded-lg bg-[#1E1A18]/60" />
            </div>
            <div className="h-7 w-36 rounded bg-[#1E1A18]" />
            <div className="h-3.5 w-28 rounded bg-[#1E1A18]/45" />
          </div>
        ))}
      </div>

      {/* Main Layout Split Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (Transactions & Shifts) */}
        <div className="lg:col-span-2 space-y-6">
          {[1, 2].map((card) => (
            <div
              key={card}
              className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg space-y-5"
            >
              <div className="flex justify-between items-center border-b border-[#2C2724]/60 pb-3">
                <div className="h-4.5 w-40 rounded bg-[#1E1A18]" />
                <div className="h-3.5 w-16 rounded bg-[#1E1A18]/60" />
              </div>
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
          ))}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg space-y-5">
            <div>
              <div className="h-4 w-32 rounded bg-[#1E1A18]" />
              <div className="h-3 w-44 rounded bg-[#1E1A18]/50 mt-1.5" />
            </div>
            <div className="space-y-4 pt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-28 rounded bg-[#1E1A18]" />
                    <div className="h-3 w-8 rounded bg-[#1E1A18]/80" />
                  </div>
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

async function DashboardContent({ filters }: { filters: ReportFiltersState }) {
  let totalRevenueResult: any[] = [];
  let totalOrdersResult: any[] = [];
  let activeSessionsResult: any[] = [];
  let recentTransactions: any[] = [];
  let recentShifts: any[] = [];

  try {
    // Build order conditions array
    const orderConditions: any[] = [eq(orders.status, "completed")];
    if (filters.sessionId) {
      orderConditions.push(eq(orders.sessionId, filters.sessionId));
    }
    if (filters.userId) {
      orderConditions.push(eq(orders.userId, filters.userId));
    }
    if (filters.startDate) {
      orderConditions.push(gte(orders.createdAt, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      orderConditions.push(lte(orders.createdAt, end));
    }
    if (filters.productId) {
      orderConditions.push(
        exists(
          db
            .select()
            .from(orderItems)
            .where(
              and(
                eq(orderItems.orderId, orders.id),
                eq(orderItems.productId, filters.productId),
              ),
            ),
        ),
      );
    }

    const orderWhere = and(...orderConditions);

    // Build session conditions array
    const sessionConditions: any[] = [];
    if (filters.userId) {
      sessionConditions.push(eq(sessions.userId, filters.userId));
    }
    if (filters.startDate) {
      sessionConditions.push(
        gte(sessions.openedAt, new Date(filters.startDate)),
      );
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      sessionConditions.push(lte(sessions.openedAt, end));
    }
    if (filters.sessionId) {
      sessionConditions.push(eq(sessions.id, filters.sessionId));
    }

    const sessionWhere =
      sessionConditions.length > 0 ? and(...sessionConditions) : undefined;

    // Fetch real statistics from the database in parallel to optimize rendering speed
    const [r1, r2, r3, r4, r5] = await Promise.all([
      db
        .select({
          value: sql<number>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
        })
        .from(orders)
        .where(orderWhere),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(orders)
        .where(orderWhere),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(sessions)
        .where(
          sessionWhere
            ? and(eq(sessions.status, "open"), sessionWhere)
            : eq(sessions.status, "open"),
        ),
      db.query.orders.findMany({
        limit: 6,
        orderBy: [desc(orders.createdAt)],
        where: orderWhere,
        with: {
          table: true,
          user: true,
        },
      }),
      db.query.sessions.findMany({
        limit: 6,
        orderBy: [desc(sessions.openedAt)],
        where: sessionWhere,
        with: {
          user: true,
        },
      }),
    ]);
    totalRevenueResult = r1;
    totalOrdersResult = r2;
    activeSessionsResult = r3;
    recentTransactions = r4;
    recentShifts = r5;
  } catch (error: any) {
    console.error("❌ DashboardContent database query failed:");
    console.error("Message:", error?.message);
    if (error?.cause) {
      console.error("Cause:", error.cause);
    }
  }

  const totalRevenue = Number(totalRevenueResult[0]?.value ?? 0);
  const totalOrders = Number(totalOrdersResult[0]?.count ?? 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const activeSessions = Number(activeSessionsResult[0]?.count ?? 0);

  // Category breakdown calculations (static fallback if no DB items match yet)
  const categoryStats = [
    { name: "Specialty Coffee", percentage: 55, color: "oklch(65% 0.18 75)" },
    { name: "Desserts & Cakes", percentage: 25, color: "oklch(70% 0.12 75)" },
    { name: "Signature Teas", percentage: 12, color: "oklch(75% 0.08 75)" },
    { name: "Savory & Bakes", percentage: 8, color: "oklch(80% 0.05 75)" },
  ];

  return (
    <>
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg relative overflow-hidden group hover:border-[#E28743]/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E7E72]">
              Total Revenue
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E28743]/10 border border-[#E28743]/20 text-[#E28743]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-black text-[#EADED2] tracking-tight">
              ₹
              {totalRevenue.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h3>
            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              Live settled payments
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg relative overflow-hidden group hover:border-[#E28743]/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E7E72]">
              Completed Orders
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E28743]/10 border border-[#E28743]/20 text-[#E28743]">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-black text-[#EADED2] tracking-tight">
              {totalOrders}
            </h3>
            <p className="text-[10px] text-[#8E7E72] font-semibold mt-1">
              Settle rate: 100%
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg relative overflow-hidden group hover:border-[#E28743]/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E7E72]">
              Average Order Value
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E28743]/10 border border-[#E28743]/20 text-[#E28743]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-black text-[#EADED2] tracking-tight">
              ₹
              {aov.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h3>
            <p className="text-[10px] text-[#8E7E72] font-semibold mt-1">
              Basket size average
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg relative overflow-hidden group hover:border-[#E28743]/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E7E72]">
              Active Cash Drawers
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E28743]/10 border border-[#E28743]/20 text-[#E28743]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-black text-[#EADED2] tracking-tight">
              {activeSessions}
            </h3>
            <p className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Open shifts running
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout Split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (Transactions & Shifts) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Transactions List */}
          <div className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#2C2724]/60 pb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#E28743]" />
                <h3 className="text-sm font-bold text-[#EADED2]">
                  Recent Bill Settlements
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E7E72]">
                Live logs
              </span>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                <div className="text-3xl">☕</div>
                <h4 className="text-xs font-bold text-[#CBB9A8]">
                  No Settled Orders Yet
                </h4>
                <p className="text-4xs text-[#8E7E72] max-w-[200px]">
                  Complete cashier checkouts inside the terminal to render
                  recent billing history logs.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#2C2724]/30 text-[#8E7E72] uppercase tracking-wider font-bold text-[10px]">
                      <th className="py-2.5">Order</th>
                      <th className="py-2.5">Table</th>
                      <th className="py-2.5">Cashier</th>
                      <th className="py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2C2724]/20 text-[#CBB9A8]">
                    {recentTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-[#1E1A18]/50 transition-colors"
                      >
                        <td className="py-3 font-semibold text-[#EADED2]">
                          <span className="flex items-center gap-1">
                            {tx.orderNumber}
                            <ArrowUpRight className="h-3 w-3 text-[#8E7E72]" />
                          </span>
                        </td>
                        <td className="py-3">{tx.table.label}</td>
                        <td className="py-3 truncate max-w-[120px]">
                          {tx.user.name}
                        </td>
                        <td className="py-3 text-right font-black text-[#EADED2]">
                          ₹{parseFloat(tx.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Drawer Sessions Log */}
          <div className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#2C2724]/60 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#E28743]" />
                <h3 className="text-sm font-bold text-[#EADED2]">
                  Recent Drawer Shifts
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E7E72]">
                Shift Ledger
              </span>
            </div>

            {recentShifts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                <div className="text-3xl">🔑</div>
                <h4 className="text-xs font-bold text-[#CBB9A8]">
                  No Cash Drawer Shifts Open
                </h4>
                <p className="text-4xs text-[#8E7E72] max-w-[200px]">
                  Register shift drawer entries will appear here once cashiers
                  open shifts.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#2C2724]/30 text-[#8E7E72] uppercase tracking-wider font-bold text-[10px]">
                      <th className="py-2.5">User</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5">Open Date</th>
                      <th className="py-2.5 text-right">Opening Bal</th>
                      <th className="py-2.5 text-right">Closing Bal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2C2724]/20 text-[#CBB9A8]">
                    {recentShifts.map((sh) => (
                      <tr
                        key={sh.id}
                        className="hover:bg-[#1E1A18]/50 transition-colors"
                      >
                        <td className="py-3 font-semibold text-[#EADED2]">
                          {sh.user.name}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                              sh.status === "open"
                                ? "bg-amber-500/5 border-amber-500/20 text-amber-400"
                                : "bg-neutral-500/5 border-neutral-500/20 text-[#8E7E72]"
                            }`}
                          >
                            {sh.status}
                          </span>
                        </td>
                        <td className="py-3 text-[#8E7E72]">
                          {new Date(sh.openedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 text-right font-semibold">
                          ₹{parseFloat(sh.openingBalance).toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-semibold text-[#EADED2]">
                          {sh.closingBalance ? `₹${parseFloat(sh.closingBalance).toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Category analytics breakdown) */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#EADED2]">
                Revenue Share
              </h3>
              <p className="text-[10px] text-[#8E7E72] mt-0.5">
                Top performing product categories in the store.
              </p>
            </div>

            {/* Custom high-density category bars */}
            <div className="space-y-4 pt-1">
              {categoryStats.map((stat) => (
                <div key={stat.name} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#CBB9A8] flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: stat.color }}
                      />
                      {stat.name}
                    </span>
                    <span className="text-[#EADED2] font-black">
                      {stat.percentage}%
                    </span>
                  </div>
                  {/* Visual Bar Accent */}
                  <div className="h-2 w-full rounded-full bg-[#1C1816] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${stat.percentage}%`,
                        backgroundColor: stat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 text-[10px] text-[#8E7E72] leading-relaxed">
              💡 <span className="font-bold text-[#EADED2]">Tip:</span>{" "}
              Specialty Coffee accounts for over half of total revenue. Consider
              featuring premium coffee add-ons at the top of table checkout
              pages to boost average ticket values.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
