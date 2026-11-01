import { Search, Phone, MapPin, CalendarDays } from "lucide-react";
import { getAdminOrders } from "@/lib/admin-queries";
import { formatNaira, formatDate, statusColor, ORDER_STATUSES } from "@/lib/utils";
import { OrderStatusForm } from "@/components/admin/order-status-form";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

type SP = { status?: string; payment?: string; q?: string; notice?: string; error?: string };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const rows = await getAdminOrders({ status: sp.status, payment: sp.payment, q: sp.q });

  const qs = (o: Partial<SP>) => {
    const u = new URLSearchParams();
    const m = { ...sp, ...o };
    Object.entries(m).forEach(([k, v]) => {
      if (v && !["notice", "error"].includes(k)) u.set(k, v);
    });
    const s = u.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition ${
      active ? "border-black bg-black text-white" : "border-neutral-300 bg-white hover:border-black"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Sales</p>
          <h1 className="mt-1 font-serif text-3xl">
            Orders <span className="text-base text-neutral-400">({rows.length})</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Confirm payment first, then move each order through processing, shipping and delivery.</p>
        </div>
        <a href={`/api/admin/export/orders${sp.status ? `?status=${sp.status}` : ""}`} className="btn-outline !py-2.5 text-xs">
          Export CSV
        </a>
      </div>

      {sp.notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{sp.notice}</p>}
      {sp.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <a href={qs({ status: undefined, payment: undefined })} className={chip(!sp.status && !sp.payment)}>
          All
        </a>
        {ORDER_STATUSES.map((st) => (
          <a key={st} href={qs({ status: st, payment: undefined })} className={chip(sp.status === st)}>
            {st}
          </a>
        ))}
        <a href={qs({ status: undefined, payment: "pending" })} className={chip(sp.payment === "pending")}>
          Awaiting payment
        </a>
        <a href={qs({ status: undefined, payment: "successful" })} className={chip(sp.payment === "successful")}>
          Paid
        </a>
      </div>

      <form action="/admin/orders" method="GET" className="card flex gap-2 p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input name="q" defaultValue={sp.q} className="input pl-9" placeholder="Order ID, customer name, phone or email" />
        </div>
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        {sp.payment && <input type="hidden" name="payment" value={sp.payment} />}
        <button type="submit" className="btn-outline !px-5">
          Search
        </button>
      </form>

      {/* Mobile cards */}
      <div className="space-y-4 xl:hidden">
        {rows.length === 0 && <p className="card p-8 text-center text-sm text-neutral-400">No orders match these filters.</p>}
        {rows.map((o) => (
          <article key={o.id} className="card overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 p-4">
              <div>
                <a href={`/admin/orders/${o.id}`} className="font-mono text-sm font-bold hover:text-brand-600">
                  {o.orderNumber}
                </a>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
                  <CalendarDays className="h-3 w-3" /> {formatDate(o.createdAt)}
                </p>
              </div>
              <p className="text-right font-serif text-lg">{formatNaira(o.total)}</p>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div>
                <p className="font-semibold">{o.customerName}</p>
                <a href={`tel:${o.customerPhone}`} className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <Phone className="h-3 w-3" /> {o.customerPhone}
                </a>
                <p className="mt-1 flex items-start gap-1.5 text-xs text-neutral-500">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {o.address}, {o.city}, {o.state}
                </p>
              </div>
              <ul className="space-y-2 rounded-xl bg-neutral-50 p-3">
                {o.items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-2 text-xs">
                    <span className="min-w-0">
                      <span className="font-medium text-neutral-900">{it.productName}</span>
                      <span className="block text-neutral-500">
                        Size: {it.size || "—"} · Colour: {it.color || "—"}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold">× {it.quantity}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusColor(o.paymentStatus)}`}>
                  Payment: {o.paymentStatus}
                </span>
                <span className="text-[11px] capitalize text-neutral-500">{o.paymentMethod.replace("_", " ")}</span>
                <a href={`/admin/orders/${o.id}`} className="ml-auto text-xs font-semibold text-brand-600 hover:underline">
                  View details →
                </a>
              </div>
              <div className="border-t border-neutral-100 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Order status</p>
                <OrderStatusForm orderId={o.id} current={o.status} />
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div className="card hidden overflow-hidden xl:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Products · size · colour · qty</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3">Payment</th>
                <th className="px-3 py-3">Delivery address</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 align-top">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50/60">
                  <td className="px-4 py-3">
                    <a href={`/admin/orders/${o.id}`} className="font-mono text-xs font-bold hover:text-brand-600">
                      {o.orderNumber}
                    </a>
                    <a href={`/admin/orders/${o.id}`} className="mt-1 block text-[11px] font-semibold text-brand-600 hover:underline">
                      Open order →
                    </a>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{o.customerName}</p>
                    <a href={`tel:${o.customerPhone}`} className="text-xs text-neutral-500 hover:underline">
                      {o.customerPhone}
                    </a>
                  </td>
                  <td className="px-3 py-3">
                    <ul className="space-y-1.5">
                      {o.items.map((it) => (
                        <li key={it.id} className="text-xs">
                          <span className="font-medium text-neutral-900">{it.productName}</span>
                          <span className="block text-neutral-500">
                            Size {it.size || "—"} · {it.color || "—"} · <span className="font-semibold text-neutral-800">×{it.quantity}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">{formatNaira(o.total)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor(o.paymentStatus)}`}>
                      {o.paymentStatus}
                    </span>
                    <p className="mt-1 text-[11px] capitalize text-neutral-500">{o.paymentMethod.replace("_", " ")}</p>
                  </td>
                  <td className="max-w-56 px-3 py-3 text-xs text-neutral-600">
                    {o.address}, {o.city}, {o.state}
                  </td>
                  <td className="px-3 py-3 text-xs text-neutral-500 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                  <td className="px-3 py-3">
                    <OrderStatusForm orderId={o.id} current={o.status} compact />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-neutral-400">
                    No orders match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
