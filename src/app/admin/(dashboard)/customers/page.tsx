import { Search, Phone, Mail } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { getAdminCustomers } from "@/lib/admin-queries";
import { formatNaira, formatDate } from "@/lib/utils";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const rows = await getAdminCustomers(q);
  const total = await getAdminCustomers();

  const guests = await db
    .select({
      email: orders.customerEmail,
      name: orders.customerName,
      phone: orders.customerPhone,
      count: sql<number>`count(*)::int`,
      spent: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'successful' and ${orders.status} <> 'cancelled' then ${orders.total} else 0 end),0)::int`,
    })
    .from(orders)
    .where(sql`${orders.userId} is null`)
    .groupBy(orders.customerEmail, orders.customerName, orders.customerPhone)
    .orderBy(desc(sql`count(*)`))
    .limit(30);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">People</p>
          <h1 className="mt-1 font-serif text-3xl">Customers</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {total.length} registered account{total.length === 1 ? "" : "s"} · {guests.length} guest shopper{guests.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <form action="/admin/customers" method="GET" className="card flex gap-2 p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input name="q" defaultValue={q} className="input pl-9" placeholder="Search by name, email or phone" />
        </div>
        <button type="submit" className="btn-outline !px-5">
          Search
        </button>
      </form>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.length === 0 && <p className="card p-8 text-center text-sm text-neutral-400">No registered customers match.</p>}
        {rows.map(({ u, orderCount, spent }) => (
          <a key={u.id} href={`/admin/customers/${u.id}`} className="card block p-4 transition hover:shadow-md">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{u.name}</p>
              <span className="text-xs font-semibold text-brand-700">
                {orderCount} order{orderCount === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-xs text-neutral-600">
              <Phone className="h-3 w-3" /> {u.phone || "No phone"}
            </p>
            <p className="mt-1 flex items-center gap-2 break-all text-xs text-neutral-600">
              <Mail className="h-3 w-3 shrink-0" /> {u.email}
            </p>
            <div className="mt-3 flex justify-between border-t border-neutral-100 pt-3 text-xs">
              <span className="text-neutral-500">Spent {formatNaira(spent)}</span>
              <span className="text-neutral-400">Joined {formatDate(u.createdAt)}</span>
            </div>
          </a>
        ))}
      </div>

      {/* Desktop table */}
      <div className="card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Location</th>
                <th className="px-3 py-3 text-center">Orders</th>
                <th className="px-3 py-3 text-right">Total spent</th>
                <th className="px-3 py-3">Joined</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map(({ u, orderCount, spent }) => (
                <tr key={u.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{u.phone || "—"}</td>
                  <td className="px-3 py-3 text-neutral-600">{u.email}</td>
                  <td className="px-3 py-3 text-neutral-600">{[u.city, u.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-3 py-3 text-center">{orderCount}</td>
                  <td className="px-3 py-3 text-right font-semibold">{formatNaira(spent)}</td>
                  <td className="px-3 py-3 text-xs text-neutral-500 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="px-3 py-3 text-right">
                    <a
                      href={`/admin/customers/${u.id}`}
                      className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold hover:bg-black hover:text-white"
                    >
                      View history
                    </a>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-400">
                    No registered customers match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {guests.length > 0 && (
        <section className="card overflow-hidden">
          <div className="p-5 pb-3 sm:p-6 sm:pb-3">
            <h2 className="font-serif text-xl">Guest shoppers</h2>
            <p className="text-xs text-neutral-500">Checked out without creating an account</p>
          </div>
          <ul className="divide-y divide-neutral-100">
            {guests.map((g) => (
              <li key={g.email} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3 text-sm sm:px-6">
                <span className="w-full font-medium sm:w-44">{g.name}</span>
                <span className="text-neutral-600">{g.phone}</span>
                <span className="text-neutral-600">{g.email}</span>
                <a href={`/admin/orders?q=${encodeURIComponent(g.email)}`} className="text-xs text-brand-700 hover:underline">
                  {g.count} order{g.count === 1 ? "" : "s"}
                </a>
                <span className="ml-auto font-semibold">{formatNaira(g.spent)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
