import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Wallet,
  PackageX,
} from "lucide-react";
import { getDashboardData } from "@/lib/admin-queries";
import { getSettings } from "@/lib/settings";
import { formatNaira, formatDate, statusColor } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [d, s] = await Promise.all([getDashboardData(), getSettings()]);
  const max = Math.max(1, ...d.monthly.map((m) => m.revenue));
  const hour = new Date(Date.now() + 3600_000).getUTCHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const kpis = [
    { label: "Pending orders", value: d.pendingOrders, icon: Clock, sub: "Waiting to be processed", href: "/admin/orders?status=pending", tone: "amber" },
    { label: "Completed orders", value: d.completedOrders, icon: CheckCircle2, sub: "Delivered to customers", href: "/admin/orders?status=delivered", tone: "emerald" },
    { label: "Registered customers", value: d.customers, icon: Users, sub: "Customer accounts", href: "/admin/customers", tone: "neutral" },
    { label: "Active products", value: d.activeProducts, icon: Package, sub: `${d.outOfStock} out of stock`, href: "/admin/products", tone: "neutral" },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Dashboard overview</p>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl">{greeting}</h1>
          <p className="mt-1 text-sm text-neutral-500">Here&apos;s how {s.store_name} is performing today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/products/new" className="btn-primary !py-2.5 text-xs">
            <Plus className="h-4 w-4" /> Add product
          </a>
          <a href="/admin/orders?status=pending" className="btn-outline !py-2.5 text-xs">
            Pending orders
          </a>
        </div>
      </div>

      {/* Revenue hero + KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <a
          href="/admin/reports"
          className="relative col-span-2 block overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl xl:col-span-1"
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/20 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">Total revenue</p>
              <p className="mt-3 font-serif text-4xl text-brand-200 sm:text-5xl">{formatNaira(d.revenue)}</p>
              <p className="mt-2 text-xs text-neutral-400">Confirmed payments on non-cancelled orders</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
              <Wallet className="h-5 w-5" />
            </span>
          </div>
          <div className="relative mt-6 flex items-center gap-3 border-t border-white/10 pt-4 text-sm">
            <span className="text-neutral-400">This month</span>
            <span className="font-semibold">{formatNaira(d.thisMonth.revenue)}</span>
            {d.growthPct != null && (
              <span
                className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  d.growthPct >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                }`}
              >
                {d.growthPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(d.growthPct)}% vs last month
              </span>
            )}
          </div>
        </a>

        <a href="/admin/orders" className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total orders</p>
            <ShoppingCart className="h-5 w-5 text-brand-500" />
          </div>
          <p className="mt-3 font-serif text-3xl sm:text-4xl">{d.totalOrders}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
            All time <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
          </p>
        </a>

        {kpis.map((k) => (
          <a key={k.label} href={k.href} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{k.label}</p>
              <k.icon
                className={`h-5 w-5 ${
                  k.tone === "amber" ? "text-amber-500" : k.tone === "emerald" ? "text-emerald-600" : "text-brand-500"
                }`}
              />
            </div>
            <p className="mt-3 font-serif text-3xl sm:text-4xl">{k.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{k.sub}</p>
          </a>
        ))}
      </div>

      {/* Monthly analytics */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl">Monthly sales analytics</h2>
            <p className="text-xs text-neutral-500">Revenue per month, last 12 months</p>
          </div>
          <a href="/admin/reports" className="text-xs font-semibold text-brand-600 hover:underline">
            Full reports →
          </a>
        </div>
        <div className="mt-6 flex h-52 items-end gap-1.5 sm:gap-2.5">
          {d.monthly.map((m, i) => (
            <div key={m.key} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${
                  i === 11
                    ? "bg-gradient-to-t from-brand-600 to-brand-300"
                    : "bg-gradient-to-t from-neutral-800 to-neutral-500 group-hover:from-brand-600 group-hover:to-brand-300"
                }`}
                style={{ height: `${Math.max(m.revenue > 0 ? 4 : 1, (m.revenue / max) * 100)}%` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-black px-2.5 py-1.5 text-[11px] text-white shadow-lg group-hover:block">
                <p className="font-semibold">{m.label}</p>
                <p>
                  {formatNaira(m.revenue)} · {m.orders} order{m.orders === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 text-[10px] text-neutral-400 sm:gap-2.5">
          {d.monthly.map((m) => (
            <span key={m.key} className="flex-1 truncate text-center">
              {m.label.split(" ")[0]}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Recent orders */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3 sm:p-6 sm:pb-3">
            <h2 className="font-serif text-xl">Recent orders</h2>
            <a href="/admin/orders" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          {d.recentOrders.length === 0 ? (
            <p className="px-6 pb-8 text-sm text-neutral-400">No orders yet. They will appear here as soon as customers check out.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {d.recentOrders.map((o) => (
                <li key={o.id}>
                  <a href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-neutral-50 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{o.customerName}</p>
                      <p className="font-mono text-[11px] text-neutral-400">
                        {o.orderNumber} · {formatDate(o.createdAt)}
                      </p>
                    </div>
                    <div className="hidden flex-col items-end gap-1 sm:flex">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColor(o.paymentStatus)}`}>
                        {o.paymentStatus}
                      </span>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColor(o.status)}`}>
                      {o.status}
                    </span>
                    <p className="w-24 text-right text-sm font-semibold">{formatNaira(o.total)}</p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* Recent sales */}
          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl">Recent sales</h2>
                <p className="text-xs text-neutral-500">Confirmed payments</p>
              </div>
              <a href="/admin/payments" className="text-xs font-semibold text-brand-600 hover:underline">
                Payments →
              </a>
            </div>
            {d.recentSales.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-400">No confirmed payments yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {d.recentSales.map(({ p, o }) => (
                  <li key={p.id}>
                    <a href={`/admin/orders/${o.id}`} className="flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-neutral-50">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{o.customerName}</p>
                        <p className="truncate text-[11px] text-neutral-500 capitalize">
                          {p.method.replace("_", " ")} · {formatDate(p.updatedAt)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{formatNaira(p.amount)}</p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Low stock */}
          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-xl">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Low-stock alerts
              </h2>
              <a href="/admin/inventory" className="text-xs font-semibold text-brand-600 hover:underline">
                Inventory →
              </a>
            </div>
            <p className="text-xs text-neutral-500">Active products with {d.threshold} or fewer units</p>
            {d.outOfStock > 0 && (
              <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                <PackageX className="h-4 w-4" /> {d.outOfStock} product{d.outOfStock === 1 ? " is" : "s are"} out of stock
              </p>
            )}
            {d.lowStock.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-400">Every active product is well stocked.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {d.lowStock.map((p) => (
                  <li key={p.id}>
                    <a
                      href={`/admin/products/${p.id}/edit`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-neutral-100 p-2.5 text-sm transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <span className="truncate">{p.name}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          p.stock <= 0 ? "bg-red-600 text-white" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.stock <= 0 ? "Out" : `${p.stock} left`}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
