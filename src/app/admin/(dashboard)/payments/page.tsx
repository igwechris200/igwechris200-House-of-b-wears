import { Search } from "lucide-react";
import { getAdminPayments, getPaymentTotals } from "@/lib/admin-queries";
import { formatNaira, formatDate, statusColor } from "@/lib/utils";
import { paystackConfigured } from "@/lib/paystack";
import { PaymentActions } from "@/components/admin/payment-actions";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

type SP = { status?: string; method?: string; q?: string; notice?: string; error?: string };

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [rows, totals] = await Promise.all([
    getAdminPayments({ status: sp.status, method: sp.method, q: sp.q }),
    getPaymentTotals(),
  ]);
  const get = (s: string) => totals.find((t) => t.status === s) ?? { total: 0, count: 0 };

  const qs = (o: Partial<SP>) => {
    const u = new URLSearchParams();
    Object.entries({ ...sp, ...o }).forEach(([k, v]) => {
      if (v && !["notice", "error"].includes(k)) u.set(k, v);
    });
    const s = u.toString();
    return s ? `/admin/payments?${s}` : "/admin/payments";
  };
  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
      on ? "border-black bg-black text-white" : "border-neutral-300 bg-white hover:border-black"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Finance</p>
        <h1 className="mt-1 font-serif text-3xl">Payments</h1>
        <p className="mt-1 text-sm text-neutral-500">Every transaction, its reference and verification status.</p>
      </div>

      {sp.notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{sp.notice}</p>}
      {sp.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}

      {!paystackConfigured() && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Paystack is not connected yet.</strong> Add <code className="rounded bg-white px-1">PAYSTACK_SECRET_KEY</code> to the server environment to enable card and transfer payments and automatic verification. Until then, customers can pay by bank transfer and you confirm each one here.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Successful", key: "successful", color: "text-emerald-700", ring: "ring-emerald-500" },
          { label: "Pending", key: "pending", color: "text-amber-700", ring: "ring-amber-500" },
          { label: "Failed", key: "failed", color: "text-red-700", ring: "ring-red-500" },
        ].map((c) => (
          <a
            key={c.key}
            href={qs({ status: sp.status === c.key ? undefined : c.key })}
            className={`card flex items-center justify-between p-5 transition hover:shadow-md ${
              sp.status === c.key ? `ring-2 ${c.ring}` : ""
            }`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{c.label}</p>
              <p className="mt-1.5 text-xs text-neutral-500">
                {get(c.key).count} transaction{get(c.key).count === 1 ? "" : "s"}
              </p>
            </div>
            <p className={`font-serif text-2xl ${c.color}`}>{formatNaira(get(c.key).total)}</p>
          </a>
        ))}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        <a href={qs({ method: undefined, status: undefined })} className={chip(!sp.method && !sp.status)}>
          All
        </a>
        <a href={qs({ method: "paystack" })} className={chip(sp.method === "paystack")}>
          Paystack
        </a>
        <a href={qs({ method: "bank_transfer" })} className={chip(sp.method === "bank_transfer")}>
          Bank transfer
        </a>
      </div>

      <form action="/admin/payments" method="GET" className="card flex gap-2 p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input name="q" defaultValue={sp.q} className="input pl-9" placeholder="Transaction reference, customer or order ID" />
        </div>
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        {sp.method && <input type="hidden" name="method" value={sp.method} />}
        <button type="submit" className="btn-outline !px-5">
          Search
        </button>
      </form>

      {/* Mobile cards */}
      <div className="space-y-3 xl:hidden">
        {rows.length === 0 && <p className="card p-8 text-center text-sm text-neutral-400">No payments found.</p>}
        {rows.map(({ p, o }) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all font-mono text-xs font-semibold">{p.reference}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{formatDate(p.createdAt)}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor(p.status)}`}>
                {p.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-neutral-500">Customer</p>
                <p className="font-medium">{o.customerName}</p>
              </div>
              <div>
                <p className="text-neutral-500">Amount</p>
                <p className="font-semibold">{formatNaira(p.amount)}</p>
              </div>
              <div>
                <p className="text-neutral-500">Method</p>
                <p className="capitalize">{p.method.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-neutral-500">Order</p>
                <a href={`/admin/orders/${o.id}`} className="font-mono font-semibold hover:text-brand-600">
                  {o.orderNumber}
                </a>
              </div>
            </div>
            {p.customerNote && (
              <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-900">Customer says: “{p.customerNote}”</p>
            )}
            <PaymentActions
              reference={p.reference}
              method={p.method}
              status={p.status}
              orderPaid={o.paymentStatus === "successful"}
              orderCancelled={o.status === "cancelled"}
            />
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="card hidden overflow-hidden xl:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Transaction reference</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Order ID</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Method</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Verification &amp; actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 align-top">
              {rows.map(({ p, o }) => (
                <tr key={p.id} className="hover:bg-neutral-50/60">
                  <td className="max-w-56 px-4 py-3">
                    <p className="break-all font-mono text-xs font-semibold">{p.reference}</p>
                    {p.gatewayResponse && <p className="mt-1 text-[11px] text-neutral-400">{p.gatewayResponse}</p>}
                  </td>
                  <td className="px-3 py-3 font-medium">{o.customerName}</td>
                  <td className="px-3 py-3">
                    <a href={`/admin/orders/${o.id}`} className="font-mono text-xs font-semibold hover:text-brand-600">
                      {o.orderNumber}
                    </a>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">{formatNaira(p.amount)}</td>
                  <td className="px-3 py-3">
                    <span className="capitalize">{p.method.replace("_", " ")}</span>
                    {p.channel && <p className="text-[11px] capitalize text-neutral-400">{p.channel}</p>}
                  </td>
                  <td className="px-3 py-3 text-xs text-neutral-500 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="w-72 px-3 py-3">
                    {p.verifiedBy && <p className="mb-1 text-[11px] text-neutral-500">By: {p.verifiedBy.replace(/_/g, " ")}</p>}
                    {p.customerNote && (
                      <p className="mb-2 rounded-lg bg-brand-50 px-2.5 py-1.5 text-[11px] text-brand-900">
                        Customer says: “{p.customerNote}”
                      </p>
                    )}
                    <PaymentActions
                      reference={p.reference}
                      method={p.method}
                      status={p.status}
                      orderPaid={o.paymentStatus === "successful"}
                      orderCancelled={o.status === "cancelled"}
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-neutral-400">
                    No payments found.
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
