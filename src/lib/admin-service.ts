import "server-only";
import { db } from "@/db";
import { products, categories, orders, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { slugify, ORDER_STATUSES } from "@/lib/utils";
import { markPaymentSuccessful, markPaymentFailed, deductStockTx, restoreStockTx } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { verifyTransaction } from "@/lib/paystack";

/*
 * Business logic for the admin dashboard. Authorisation is checked by the
 * server-action wrappers in src/app/admin/actions.ts (assertAdmin) before these run.
 */

export type Result = { ok: true; message: string; id?: number } | { ok: false; error: string };
const ok = (message: string, id?: number): Result => ({ ok: true, message, id });
const fail = (error: string): Result => ({ ok: false, error });

export type ProductInput = {
  name: string;
  description: string;
  price: number;
  discountPrice: number | null;
  categoryId: number | null;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  featured: boolean;
  bestSeller: boolean;
  isNewArrival: boolean;
  active: boolean;
};

export type CategoryInput = {
  id?: number;
  name: string;
  description: string;
  image: string | null;
  sortOrder: number;
  active: boolean;
};

const SIZE_CANON: Record<string, string> = { xs: "XS", s: "S", m: "M", l: "L", xl: "XL", xxl: "XXL", xxxl: "XXXL" };

function cleanList(values: string[], mapper: (v: string) => string): string[] {
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim().replace(/\s+/g, " ");
    if (!v) continue;
    const c = mapper(v);
    if (!out.some((o) => o.toLowerCase() === c.toLowerCase())) out.push(c);
  }
  return out;
}

export const cleanSizes = (values: string[]) => cleanList(values, (v) => SIZE_CANON[v.toLowerCase()] ?? v);
export const cleanColors = (values: string[]) => cleanList(values, (v) => v.charAt(0).toUpperCase() + v.slice(1));

export function validateProduct(input: ProductInput): string | null {
  if (!input.name.trim()) return "Product name is required";
  if (!Number.isFinite(input.price) || input.price <= 0) return "Enter a valid selling price in Naira";
  if (input.discountPrice != null && (!Number.isFinite(input.discountPrice) || input.discountPrice <= 0 || input.discountPrice >= input.price)) {
    return "The discount price must be lower than the selling price";
  }
  if (!Number.isFinite(input.stock) || input.stock < 0) return "Stock quantity cannot be negative";
  if (input.images.length === 0) return "Upload at least one product photograph";
  if (input.categoryId != null && !Number.isInteger(input.categoryId)) return "Choose a valid category";
  return null;
}

async function uniqueSlug(table: "products" | "categories", base: string, excludeId?: number): Promise<string> {
  const root = slugify(base) || "item";
  let slug = root;
  let i = 1;
  for (;;) {
    const rows =
      table === "products"
        ? await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1)
        : await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1);
    if (!rows.length || rows[0].id === excludeId) return slug;
    i += 1;
    slug = `${root}-${i}`;
  }
}

function productValues(input: ProductInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    price: Math.round(input.price),
    discountPrice: input.discountPrice ? Math.round(input.discountPrice) : null,
    categoryId: input.categoryId,
    images: input.images,
    sizes: cleanSizes(input.sizes),
    colors: cleanColors(input.colors),
    stock: Math.max(0, Math.round(input.stock)),
    featured: input.featured,
    bestSeller: input.bestSeller,
    isNewArrival: input.isNewArrival,
    active: input.active,
    updatedAt: new Date(),
  };
}

/* ───────────────────────── Products ───────────────────────── */

export async function createProduct(input: ProductInput): Promise<Result> {
  const err = validateProduct(input);
  if (err) return fail(err);
  const values = productValues(input);
  const slug = await uniqueSlug("products", values.name);
  const [row] = await db.insert(products).values({ ...values, slug }).returning({ id: products.id });
  return ok(input.active ? "Product saved and published — it is now live on the store" : "Product saved as a draft (not visible to shoppers)", row.id);
}

export async function updateProduct(id: number, input: ProductInput): Promise<Result> {
  const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!current) return fail("Product not found");
  const err = validateProduct(input);
  if (err) return fail(err);
  const values = productValues(input);
  // The URL slug is never changed on edit, so links already shared on WhatsApp/Instagram keep working
  await db.update(products).set(values).where(eq(products.id, id));
  return ok("Product updated");
}

export async function deleteProduct(id: number): Promise<Result> {
  const [current] = await db.select({ name: products.name }).from(products).where(eq(products.id, id)).limit(1);
  if (!current) return fail("Product not found");
  await db.delete(products).where(eq(products.id, id));
  return ok(`"${current.name}" was deleted. Past orders keep their purchase record.`);
}

export async function setProductFlag(id: number, field: string, value: boolean): Promise<Result> {
  const patch =
    field === "featured" ? { featured: value }
    : field === "bestSeller" ? { bestSeller: value }
    : field === "active" ? { active: value }
    : field === "isNewArrival" ? { isNewArrival: value }
    : null;
  if (!patch) return fail("Unknown product setting");
  await db.update(products).set({ ...patch, updatedAt: new Date() }).where(eq(products.id, id));
  return ok("Saved");
}

export async function setProductStock(id: number, quantity: number): Promise<Result> {
  if (!Number.isFinite(quantity) || quantity < 0) return fail("Stock cannot be negative");
  await db.update(products).set({ stock: Math.floor(quantity), updatedAt: new Date() }).where(eq(products.id, id));
  return ok("Stock updated");
}

/* ───────────────────────── Categories ───────────────────────── */

export async function saveCategory(input: CategoryInput): Promise<Result> {
  const name = input.name.trim();
  if (!name) return fail("Category name is required");
  const values = {
    name,
    description: input.description.trim(),
    image: input.image,
    sortOrder: Number.isFinite(input.sortOrder) ? Math.round(input.sortOrder) : 0,
    active: input.active,
  };
  if (input.id) {
    // Slug is intentionally not changed on rename so existing category links keep working
    const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, input.id)).limit(1);
    if (!existing) return fail("Category not found");
    await db.update(categories).set(values).where(eq(categories.id, input.id));
    return ok("Category updated");
  }
  const slug = await uniqueSlug("categories", name);
  const [row] = await db.insert(categories).values({ ...values, slug }).returning({ id: categories.id });
  return ok("Category created", row.id);
}

export async function deleteCategory(id: number): Promise<Result> {
  const [current] = await db.select({ name: categories.name }).from(categories).where(eq(categories.id, id)).limit(1);
  if (!current) return fail("Category not found");
  await db.delete(categories).where(eq(categories.id, id)); // products become uncategorised (FK set null)
  return ok(`"${current.name}" deleted. Its products are now uncategorised.`);
}

export async function setCategoryActive(id: number, active: boolean): Promise<Result> {
  await db.update(categories).set({ active }).where(eq(categories.id, id));
  return ok(active ? "Category is now shown on the store" : "Category hidden from the store");
}

/* ───────────────────────── Orders ───────────────────────── */

const PAID_STATUSES = ["processing", "shipped", "delivered"] as const;

/**
 * Update an order's fulfilment status.
 * - Processing / shipped / delivered require a confirmed payment.
 * - Cancelling returns reserved stock; reinstating a paid order deducts it again.
 */
export async function updateOrderStatus(orderId: number, status: string, actor: string): Promise<Result> {
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return fail("Invalid order status");
  const s = await getSettings();
  const threshold = Number(s.low_stock_threshold) || 5;

  return db.transaction(async (tx): Promise<Result> => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1).for("update");
    if (!order) return fail("Order not found");
    if (order.status === status) return ok(`Order is already ${status}`);

    const paid = order.paymentStatus === "successful";
    if ((PAID_STATUSES as readonly string[]).includes(status) && !paid) {
      return fail(`Confirm the payment before marking this order as ${status}. Use the Payments page to verify it.`);
    }

    if (status === "cancelled" && order.stockDeducted) await restoreStockTx(tx, orderId);
    if (order.status === "cancelled" && status !== "cancelled" && paid && !order.stockDeducted) {
      await deductStockTx(tx, orderId, threshold);
    }

    await tx.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, orderId));
    const note = status === "cancelled" && paid ? " Refund the customer if the money was taken." : "";
    return ok(`${order.orderNumber} updated to ${status} by ${actor}.${note}`);
  });
}

/* ───────────────────────── Payments ───────────────────────── */

/** Manually confirm or reject a BANK TRANSFER. Paystack payments cannot be approved by hand. */
export async function reviewBankTransfer(reference: string, decision: "approve" | "reject", actor: string): Promise<Result> {
  const [pay] = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
  if (!pay) return fail("Payment not found");
  if (pay.method !== "bank_transfer") {
    return fail("Only bank transfers can be verified by hand. For Paystack payments use “Check with Paystack”.");
  }
  if (pay.status !== "pending") return fail(`This payment is already ${pay.status}`);

  const [order] = await db.select().from(orders).where(eq(orders.id, pay.orderId)).limit(1);
  if (decision === "approve") {
    if (order.status === "cancelled") return fail("This order was cancelled. Reject the payment instead.");
    const res = await markPaymentSuccessful(reference, {
      verifiedBy: `admin:${actor}`,
      channel: "bank_transfer",
      gatewayResponse: "Bank transfer confirmed manually by admin after checking the bank statement",
    });
    if (!res.ok) return fail(res.error);
    return ok(`Transfer ${reference} confirmed. Order ${order.orderNumber} is now paid.`);
  }
  await markPaymentFailed(reference, `Rejected by ${actor}: transfer not found or amount incorrect`);
  return ok(`Payment ${reference} rejected.`);
}

/** Ask Paystack for the real status of a Paystack payment and record it. */
export async function syncPaystackPayment(reference: string, actor: string): Promise<Result> {
  const [pay] = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
  if (!pay) return fail("Payment not found");
  if (pay.method !== "paystack") return fail("This payment was not made through Paystack");
  if (pay.status === "successful") return ok("Already confirmed as successful");

  const res = await verifyTransaction(reference);
  if (!res.ok) return fail(res.error);

  if (res.status === "success") {
    const r = await markPaymentSuccessful(reference, {
      verifiedBy: "paystack_verify",
      channel: res.channel,
      gatewayResponse: `${res.gatewayResponse ?? "Approved"} (checked by ${actor})`,
      paidAt: res.paidAt,
      amountNaira: res.amountNaira,
    });
    if (!r.ok) return fail(r.error);
    return ok("Paystack confirms this payment as successful. Order updated.");
  }
  if (res.status === "failed") {
    await markPaymentFailed(reference, res.gatewayResponse || "Failed on Paystack");
    return ok("Paystack reports this payment as failed.");
  }
  return ok(`Paystack status is “${res.status}”. Not successful yet — check again later.`);
}
