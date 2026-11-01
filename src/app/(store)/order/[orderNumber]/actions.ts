"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { orders, payments, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { initializeTransaction } from "@/lib/paystack";
import { ensureBankTransferPayment } from "@/lib/orders";
import { revalidatePath } from "next/cache";

/**
 * Customer says "I have paid by bank transfer". This only records the customer's claim
 * for the admin to check. It NEVER marks the order as paid.
 */
export async function submitTransferNote(orderNumber: string, note: string) {
  const order = (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0];
  if (!order || order.paymentStatus === "successful") return;
  const pay = await ensureBankTransferPayment(order.id);
  await db
    .update(payments)
    .set({ customerNote: note.trim().slice(0, 500), updatedAt: new Date() })
    .where(eq(payments.id, pay.id));
  await db.insert(notifications).values({
    type: "payment",
    message: `Bank transfer claim for ${orderNumber} needs manual verification`,
    link: `/admin/payments`,
  });
  revalidatePath(`/order/${orderNumber}`);
}

export async function retryPaystack(orderNumber: string) {
  const order = (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0];
  if (!order) return { ok: false as const, error: "Order not found" };
  if (order.paymentStatus === "successful") return { ok: false as const, error: "Order already paid" };
  if (order.status === "cancelled") return { ok: false as const, error: "This order was cancelled" };

  // A fresh unique reference for each Paystack attempt
  const reference = `${orderNumber}-R${Date.now().toString(36).toUpperCase()}`;
  await db.insert(payments).values({ orderId: order.id, reference, method: "paystack", amount: order.total, status: "pending" });

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;
  const init = await initializeTransaction({
    email: order.customerEmail,
    amountNaira: order.total,
    reference,
    callbackUrl: `${origin}/checkout/verify?reference=${reference}`,
    metadata: { order_number: orderNumber },
  });
  if (!init.ok) return { ok: false as const, error: init.error };
  await db.update(orders).set({ paymentMethod: "paystack", paymentStatus: "pending", updatedAt: new Date() }).where(eq(orders.id, order.id));
  return { ok: true as const, url: init.authorizationUrl };
}
