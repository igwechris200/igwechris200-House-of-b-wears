import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, eq, or } from "drizzle-orm";
import { formatNaira, formatDate, statusColor } from "@/lib/utils";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const myOrders = await db
    .select()
    .from(orders)
    .where(or(eq(orders.userId, user.id), eq(orders.customerEmail, user.email)))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl">Hello, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && <a href="/admin" className="btn-gold !py-2.5">Admin dashboard</a>}
          <form action="/api/auth/logout" method="POST"><button type="submit" className="btn-outline !py-2.5">Sign out</button></form>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="font-serif text-2xl">Order history</h2>
          {myOrders.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 p-12 text-center">
              <Package className="mx-auto h-10 w-10 text-neutral-300" />
              <p className="mt-3 text-sm text-neutral-500">You haven&apos;t placed any orders yet.</p>
              <Link href="/shop" className="btn-primary mt-6">Start shopping</Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
              {myOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/order/${o.orderNumber}`} className="flex items-center gap-4 p-4 transition hover:bg-neutral-50">
                    <div className="flex-1">
                      <p className="font-mono text-sm font-semibold">{o.orderNumber}</p>
                      <p className="text-xs text-neutral-500">{formatDate(o.createdAt)}</p>
                    </div>
                    <div className="hidden gap-2 sm:flex">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusColor(o.status)}`}>{o.status}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusColor(o.paymentStatus)}`}>{o.paymentStatus}</span>
                    </div>
                    <p className="text-sm font-semibold">{formatNaira(o.total)}</p>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="card h-fit p-6">
          <h2 className="font-serif text-xl">Profile &amp; delivery details</h2>
          <ProfileForm user={{ name: user.name, phone: user.phone ?? "", address: user.address ?? "", city: user.city ?? "", state: user.state ?? "" }} />
        </aside>
      </div>
    </div>
  );
}
