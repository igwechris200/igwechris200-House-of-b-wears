import "server-only";
import { db } from "@/db";
import { orders, orderItems, payments, products, users, categories, type Order, type Product } from "@/db/schema";
import { and, asc, desc, eq, gte, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { getSettings } from "@/lib/settings";

/*
 * Read-side queries for the admin dashboard. All figures come from the database.
 * Revenue = payments confirmed as successful, on orders that are not cancelled.
 * Dates are bucketed in Lagos time (UTC+1, no DST).
 */

export const PAID_CONDITION = and(eq(orders.paymentStatus, "successful"), ne(orders.status, "cancelled"));

const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function lagos(d: Date) {
  return new Date(new Date(d).getTime() + LAGOS_OFFSET_MS);
}
export function dayKey(d: Date) {
  return lagos(d).toISOString().slice(0, 10);
}
export function monthKey(d: Date) {
  return dayKey(d).slice(0, 7);
}
export function weekKey(d: Date) {
  const x = lagos(d);
  const dow = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}
/** Start (Lagos midnight, as a real Date) of the day `daysAgo` days before today */
function startOfLagosDay(daysAgo: number) {
  const l = lagos(new Date());
  return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate() - daysAgo) - LAGOS_OFFSET_MS);
}
function startOfLagosMonth(monthsAgo: number) {
  const l = lagos(new Date());
  return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth() - monthsAgo, 1) - LAGOS_OFFSET_MS);
}
const monthLabel = (key: string) =>
  new Intl.DateTimeFormat("en-NG", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`));
const dayLabel = (key: string) =>
  new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));

export async function getDashboardData() {
  const s = await getSettings();
  const threshold = Number(s.low_stock_threshold) || 5;
  const monthStart = startOfLagosMonth(11);

  const [revenueRow, orderRow, customerRow, productRow, lowStock, recentOrders, recentSales, paidRows] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${orders.total}), 0)::int` }).from(orders).where(PAID_CONDITION),
    db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')::int`,
        completed: sql<number>`count(*) filter (where ${orders.status} = 'delivered')::int`,
      })
      .from(orders),
    db.select({ c: sql<number>`count(*)::int` }).from(users).where(eq(users.role, "customer")),
    db
      .select({
        active: sql<number>`count(*) filter (where ${products.active})::int`,
        outOfStock: sql<number>`count(*) filter (where ${products.active} and ${products.stock} <= 0)::int`,
      })
      .from(products),
    db
      .select()
      .from(products)
      .where(and(eq(products.active, true), sql`${products.stock} <= ${threshold}`))
      .orderBy(asc(products.stock))
      .limit(12),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
    db
      .select({ p: payments, o: orders })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .where(eq(payments.status, "successful"))
      .orderBy(desc(payments.updatedAt))
      .limit(8),
    db.select({ createdAt: orders.createdAt, total: orders.total }).from(orders).where(and(PAID_CONDITION, gte(orders.createdAt, monthStart))),
  ]);

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const key = monthKey(startOfLagosMonth(11 - i));
    return { key, label: monthLabel(key), revenue: 0, orders: 0 };
  });
  for (const r of paidRows) {
    const cell = monthly.find((m) => m.key === monthKey(r.createdAt));
    if (cell) {
      cell.revenue += r.total;
      cell.orders += 1;
    }
  }
  const thisMonth = monthly[11];
  const lastMonth = monthly[10];
  const growthPct = lastMonth.revenue > 0 ? Math.round(((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100) : null;

  return {
    threshold,
    revenue: revenueRow[0]?.total ?? 0,
    totalOrders: orderRow[0]?.total ?? 0,
    pendingOrders: orderRow[0]?.pending ?? 0,
    completedOrders: orderRow[0]?.completed ?? 0,
    customers: customerRow[0]?.c ?? 0,
    activeProducts: productRow[0]?.active ?? 0,
    outOfStock: productRow[0]?.outOfStock ?? 0,
    lowStock,
    recentOrders,
    recentSales,
    monthly,
    thisMonth,
    lastMonth,
    growthPct,
  };
}

export type Period = "daily" | "weekly" | "monthly";

export async function getSalesReport(period: Period) {
  const l = lagos(new Date());
  const dow = (l.getUTCDay() + 6) % 7;

  let start: Date;
  let starts: Date[];
  let keyOf: (d: Date) => string;
  let labelOf: (k: string) => string;
  if (period === "daily") {
    start = startOfLagosDay(29);
    starts = Array.from({ length: 30 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
    keyOf = dayKey;
    labelOf = dayLabel;
  } else if (period === "weekly") {
    start = startOfLagosDay(dow + 77); // Monday, 11 weeks ago
    starts = Array.from({ length: 12 }, (_, i) => new Date(start.getTime() + i * 7 * DAY_MS));
    keyOf = weekKey;
    labelOf = (k) => `Week of ${dayLabel(k)}`;
  } else {
    start = startOfLagosMonth(11);
    starts = Array.from({ length: 12 }, (_, i) => startOfLagosMonth(11 - i));
    keyOf = monthKey;
    labelOf = monthLabel;
  }

  const rows = await db
    .select({ id: orders.id, createdAt: orders.createdAt, total: orders.total, status: orders.status })
    .from(orders)
    .where(and(PAID_CONDITION, gte(orders.createdAt, start)));

  const map = new Map<string, { revenue: number; orders: number }>();
  for (const b of starts) map.set(keyOf(b), { revenue: 0, orders: 0 });
  for (const r of rows) {
    const cell = map.get(keyOf(r.createdAt));
    if (cell) {
      cell.revenue += r.total;
      cell.orders += 1;
    }
  }
  const buckets = [...map.entries()].map(([key, v]) => ({ key, label: labelOf(key), ...v }));

  const items = await db
    .select({
      productId: orderItems.productId,
      name: orderItems.productName,
      image: orderItems.productImage,
      qty: orderItems.quantity,
      unit: orderItems.unitPrice,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(PAID_CONDITION, gte(orders.createdAt, start)));

  const agg = new Map<string, { name: string; image: string | null; units: number; revenue: number }>();
  for (const it of items) {
    const key = it.productId != null ? `p${it.productId}` : `n${it.name}`;
    const cur = agg.get(key) ?? { name: it.name, image: it.image, units: 0, revenue: 0 };
    cur.units += it.qty;
    cur.revenue += it.qty * it.unit;
    agg.set(key, cur);
  }
  const bestSellers = [...agg.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 10);

  const [allTime] = await db
    .select({ revenue: sql<number>`coalesce(sum(${orders.total}),0)::int`, count: sql<number>`count(*)::int` })
    .from(orders)
    .where(PAID_CONDITION);

  const revenue = rows.reduce((n, r) => n + r.total, 0);
  return {
    period,
    buckets,
    bestSellers,
    summary: {
      revenue,
      paidOrders: rows.length,
      completedOrders: rows.filter((r) => r.status === "delivered").length,
      averageOrderValue: rows.length ? Math.round(revenue / rows.length) : 0,
    },
    allTime: { revenue: allTime?.revenue ?? 0, orders: allTime?.count ?? 0 },
  };
}

export type StockFilter = "all" | "low" | "out" | "in";

export async function getInventory(filter: StockFilter) {
  const s = await getSettings();
  const threshold = Number(s.low_stock_threshold) || 5;
  const rows = await db
    .select({ p: products, categoryName: categories.name })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.stock), asc(products.name));

  const withStatus = rows.map((r) => ({
    ...r,
    status: r.p.stock <= 0 ? ("out" as const) : r.p.stock <= threshold ? ("low" as const) : ("in" as const),
  }));
  const summary = {
    units: withStatus.reduce((n, r) => n + Math.max(0, r.p.stock), 0),
    inStock: withStatus.filter((r) => r.status === "in").length,
    low: withStatus.filter((r) => r.status === "low").length,
    out: withStatus.filter((r) => r.status === "out").length,
    value: withStatus.reduce((n, r) => n + Math.max(0, r.p.stock) * (r.p.discountPrice ?? r.p.price), 0),
    threshold,
  };
  const items = filter === "all" ? withStatus : withStatus.filter((r) => r.status === filter);
  return { items, summary };
}

export async function getAdminProducts(f: { q?: string; category?: number; status?: string }) {
  const conds: SQL[] = [];
  if (f.q) conds.push(or(ilike(products.name, `%${f.q}%`), ilike(products.description, `%${f.q}%`))!);
  if (f.category) conds.push(eq(products.categoryId, f.category));
  if (f.status === "published") conds.push(eq(products.active, true));
  if (f.status === "draft") conds.push(eq(products.active, false));
  if (f.status === "featured") conds.push(eq(products.featured, true));
  if (f.status === "bestseller") conds.push(eq(products.bestSeller, true));
  return db
    .select({ p: products, categoryName: categories.name })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(products.createdAt));
}

export async function getAdminCategories() {
  return db
    .select({ c: categories })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name))
    .then(async (rows) => {
      const counts = await db
        .select({ categoryId: products.categoryId, n: sql<number>`count(*)::int` })
        .from(products)
        .groupBy(products.categoryId);
      const map = new Map(counts.map((c) => [c.categoryId, c.n]));
      return rows.map((r) => ({ ...r.c, count: map.get(r.c.id) ?? 0 }));
    });
}

export type AdminOrderRow = Order & { items: (typeof orderItems.$inferSelect)[] };

export async function getAdminOrders(f: { status?: string; payment?: string; q?: string }): Promise<AdminOrderRow[]> {
  const conds: SQL[] = [];
  if (f.status) conds.push(eq(orders.status, f.status));
  if (f.payment) conds.push(eq(orders.paymentStatus, f.payment));
  if (f.q) {
    const t = `%${f.q}%`;
    conds.push(or(ilike(orders.orderNumber, t), ilike(orders.customerName, t), ilike(orders.customerEmail, t), ilike(orders.customerPhone, t))!);
  }
  const rows = await db
    .select()
    .from(orders)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(300);
  if (!rows.length) return [];
  const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((r) => r.id)));
  return rows.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

export async function getAdminPayments(f: { status?: string; method?: string; q?: string }) {
  const conds: SQL[] = [];
  if (f.status) conds.push(eq(payments.status, f.status));
  if (f.method) conds.push(eq(payments.method, f.method));
  if (f.q) {
    const t = `%${f.q}%`;
    conds.push(or(ilike(payments.reference, t), ilike(orders.customerName, t), ilike(orders.orderNumber, t))!);
  }
  return db
    .select({ p: payments, o: orders })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(payments.createdAt))
    .limit(300);
}

export async function getPaymentTotals() {
  return db
    .select({
      status: payments.status,
      total: sql<number>`coalesce(sum(${payments.amount}),0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .groupBy(payments.status);
}

export async function getAdminCustomers(q?: string) {
  const rows = await db
    .select({
      u: users,
      orderCount: sql<number>`count(${orders.id})::int`,
      spent: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'successful' and ${orders.status} <> 'cancelled' then ${orders.total} else 0 end), 0)::int`,
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .where(eq(users.role, "customer"))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));
  if (!q) return rows;
  const t = q.toLowerCase();
  return rows.filter((r) => [r.u.name, r.u.email, r.u.phone ?? ""].some((v) => v.toLowerCase().includes(t)));
}

export type { Product };
