import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { db } from "@/db";
import { users, orders } from "@/db/schema";
import { desc, eq, or } from "drizzle-orm";
import { formatNaira, formatDate, statusColor, whatsappLink } from "@/lib/utils";

export const metadata = { title: "Customer detail" };
export const dynamic = "force-dynamic";

export default async function AdminCustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = (await db.select().from(users).where(eq(users.id, Number(id))).limit(1))[0];
  if (!u) notFound();
  const myOrders = await db
    .select()
    .from(orders)
    .where(or(eq(orders.userId, u.id), eq(orders.customerEmail, u.email)))
    .orderBy(desc(orders.createdAt));
  const spent = myOrders.filter((o) => o.paymentStatus === "successful").reduce((n, o) => n + o.total, 0);

  return (
    <div className="space-y-6">
      <a href="/admin/customers" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-black">
        <ArrowLeft className="h-4 w-4" /> All customers
      </a>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="card h-fit p-6 text-sm">
          <p className="eyebrow">Customer</p>
          <h1 className="mt-1 font-serif text-2xl">{u.name}</h1>
          <p className="text-xs text-neutral-500">Joined {formatDate(u.createdAt)}</p>
          <dl className="mt-5 space-y-2">
            <div>
              <dt className="text-xs text-neutral-500">Email</dt>
              <dd>
                <a href={`mailto:${u.email}`} className="hover:underline">
                  {u.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Phone</dt>
              <dd>{u.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Address</dt>
              <dd>{[u.address, u.city, u.state].filter(Boolean).join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Total spent</dt>
              <dd className="font-serif text-xl">{formatNaira(spent)}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Orders</dt>
              <dd>{myOrders.length}</dd>
            </div>
          </dl>
          {u.phone && (
            <a
              href={whatsappLink(u.phone, `Hello ${u.name},`)}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-2.5 text-xs font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
        </section>
        <section className="card overflow-hidden">
          <h2 className="p-6 pb-3 font-serif text-xl">Order history</h2>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-6 py-2">Order</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {myOrders.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-3">
                    <a href={`/admin/orders/${o.id}`} className="font-mono text-xs font-semibold hover:text-brand-600">
                      {o.orderNumber}
                    </a>
                    <p className="text-[11px] text-neutral-400">{formatDate(o.createdAt)}</p>
                  </td>
                  <td className="px-3 py-3 font-semibold">{formatNaira(o.total)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor(o.paymentStatus)}`}>
                      {o.paymentStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {myOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-neutral-400">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
