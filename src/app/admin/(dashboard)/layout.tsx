import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { db } from "@/db";
import { notifications, orders, products } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const s = await getSettings();
  const threshold = Number(s.low_stock_threshold) || 5;

  const [pending, lowStock, unread, notes] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "pending")),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(products)
      .where(and(eq(products.active, true), sql`${products.stock} <= ${threshold}`)),
    db.select({ c: sql<number>`count(*)::int` }).from(notifications).where(eq(notifications.read, false)),
    db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(10),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 lg:flex">
      <AdminSidebar
        storeName={s.store_name}
        logoUrl={s.logo_url}
        adminName={admin.name}
        adminEmail={admin.email}
        pendingOrders={pending[0]?.c ?? 0}
        lowStock={lowStock[0]?.c ?? 0}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 hidden items-center justify-between border-b border-neutral-200 bg-white/90 px-8 py-4 backdrop-blur lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Signed in as</p>
            <p className="text-sm font-semibold">
              {admin.name} <span className="font-normal text-neutral-500">· {admin.email}</span>
            </p>
          </div>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium hover:border-brand-400 hover:bg-brand-50">
              <Bell className="h-4 w-4" /> Notifications
              {(unread[0]?.c ?? 0) > 0 && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">{unread[0].c}</span>
              )}
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-96 rounded-2xl border border-neutral-200 bg-white p-2 shadow-2xl">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Recent activity</p>
                <AdminActionForm intent="markNotificationsRead">
                  <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                    Mark all read
                  </button>
                </AdminActionForm>
              </div>
              <ul className="max-h-96 divide-y divide-neutral-100 overflow-y-auto">
                {notes.length === 0 && <li className="px-3 py-6 text-center text-sm text-neutral-400">No notifications yet</li>}
                {notes.map((n) => (
                  <li key={n.id}>
                    <a
                      href={n.link || "/admin"}
                      className={`block px-3 py-2.5 text-sm hover:bg-neutral-50 ${n.read ? "text-neutral-500" : "font-medium text-black"}`}
                    >
                      <span
                        className={`mr-2 inline-block h-2 w-2 rounded-full ${
                          n.type === "order" ? "bg-brand-500" : n.type === "payment" ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      {n.message}
                      <span className="mt-0.5 block text-[11px] text-neutral-400">{formatDate(n.createdAt)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
