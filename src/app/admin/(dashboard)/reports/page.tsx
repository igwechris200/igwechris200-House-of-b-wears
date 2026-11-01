import { Download, Trophy, ShoppingBag, CheckCircle2, Receipt, Wallet } from "lucide-react";
import { getSalesReport, type Period } from "@/lib/admin-queries";
import { formatNaira } from "@/lib/utils";

export const metadata = { title: "Sales Reports" };
export const dynamic = "force-dynamic";

const PERIODS: { key: Period; label: string; hint: string }[] = [
  { key: "daily", label: "Daily", hint: "Last 30 days" },
  { key: "weekly", label: "Weekly", hint: "Last 12 weeks" },
  { key: "monthly", label: "Monthly", hint: "Last 12 months" },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = (PERIODS.some((p) => p.key === sp.period) ? sp.period : "daily") as Period;
  const r = await getSalesReport(period);
  const max = Math.max(1, ...r.buckets.map((b) => b.revenue));
  const current = PERIODS.find((p) => p.key === period)!;

  const stats = [
    { label: "Revenue", value: formatNaira(r.summary.revenue), icon: Wallet, hint: current.hint },
    { label: "Paid orders", value: r.summary.paidOrders, icon: Receipt, hint: current.hint },
    { label: "Completed (delivered)", value: r.summary.completedOrders, icon: CheckCircle2, hint: current.hint },
    { label: "Average order", value: formatNaira(r.summary.averageOrderValue), icon: ShoppingBag, hint: "Per paid order" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1 className="mt-1 font-serif text-3xl">Sales reports</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Revenue counts confirmed payments on orders that were not cancelled. Times are Lagos time.
          </p>
        </div>
        <a href={`/api/admin/export/orders?period=${period}`} className="btn-outline !py-2.5 text-xs">
          <Download className="h-4 w-4" /> Export orders (CSV)
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-neutral-300 bg-white p-1">
          {PERIODS.map((p) => (
            <a
              key={p.key}
              href={`/admin/reports?period=${p.key}`}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                period === p.key ? "bg-brand-500 text-white" : "text-neutral-600 hover:text-black"
              }`}
            >
              {p.label}
            </a>
          ))}
        </div>
        <span className="text-xs text-neutral-500">{current.hint}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{s.label}</p>
              <s.icon className="h-4 w-4 text-brand-500" />
            </div>
            <p className="mt-2 font-serif text-2xl sm:text-3xl">{s.value}</p>
            <p className="mt-1 text-[11px] text-neutral-400">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-5 sm:p-6">
          <h2 className="font-serif text-xl">
            Sales by {period === "daily" ? "day" : period === "weekly" ? "week" : "month"}
          </h2>
          <div className="mt-6 flex h-56 items-end gap-1 sm:gap-2">
            {r.buckets.map((b) => (
              <div key={b.key} className="group relative flex h-full flex-1 flex-col justify-end">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-neutral-800 to-neutral-500 transition-all group-hover:from-brand-600 group-hover:to-brand-300"
                  style={{ height: `${Math.max(b.revenue > 0 ? 3 : 1, (b.revenue / max) * 100)}%` }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-black px-2.5 py-1.5 text-[11px] text-white shadow-lg group-hover:block">
                  <p className="font-semibold">{b.label}</p>
                  <p>
                    {formatNaira(b.revenue)} · {b.orders} order{b.orders === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-neutral-400">
            Hover a bar for details. Showing {r.buckets.length} {period === "daily" ? "days" : period === "weekly" ? "weeks" : "months"}.
          </p>

          <div className="mt-6 max-h-80 overflow-auto rounded-xl border border-neutral-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5">Period</th>
                  <th className="px-3 py-2.5 text-center">Orders</th>
                  <th className="px-4 py-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {[...r.buckets].reverse().map((b) => (
                  <tr key={b.key} className={b.revenue > 0 ? "" : "text-neutral-400"}>
                    <td className="px-4 py-2.5">{b.label}</td>
                    <td className="px-3 py-2.5 text-center">{b.orders}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatNaira(b.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-brand-500" />
            <h2 className="font-serif text-xl">Best-selling products</h2>
          </div>
          <p className="text-xs text-neutral-500">Ranked by units sold in this period</p>
          {r.bestSellers.length === 0 ? (
            <p className="mt-6 text-sm text-neutral-400">No sales in this period yet.</p>
          ) : (
            <ol className="mt-5 space-y-3">
              {r.bestSellers.map((b, i) => (
                <li key={`${b.name}-${i}`} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? "bg-brand-500 text-white" : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {b.image && <img src={b.image} alt="" className="h-10 w-8 shrink-0 rounded object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-neutral-500">
                      {b.units} sold · {formatNaira(b.revenue)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-6 rounded-xl bg-neutral-50 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">All time</p>
            <p className="mt-1 flex justify-between">
              <span>Revenue</span>
              <span className="font-semibold">{formatNaira(r.allTime.revenue)}</span>
            </p>
            <p className="flex justify-between">
              <span>Paid orders</span>
              <span className="font-semibold">{r.allTime.orders}</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
