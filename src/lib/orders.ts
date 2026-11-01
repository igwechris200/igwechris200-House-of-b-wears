import "server-only";
import { db } from "@/db";
import { orders, orderItems, payments, products, discountCodes, notifications } from "@/db/schema";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { getSettings, deliveryFeeFor } from "@/lib/settings";
import { effectivePrice, generateOrderNumber } from "@/lib/utils";

/** Drizzle transaction client type */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CheckoutInput = {
  items: { productId: number; size: string | null; color: string | null; quantity: number }[];
  customer: { name: string; email: string; phone: string; address: string; city: string; state: string; notes?: string };
  discountCode?: string;
  paymentMethod: "paystack" | "bank_transfer";
  userId?: number | null;
};

export async function validateDiscount(code: string, subtotal: number) {
  const row = (await db.select().from(discountCodes).where(eq(discountCodes.code, code.toUpperCase().trim())).limit(1))[0];
  if (!row || !row.active) return { ok: false as const, error: "Invalid discount code" };
  if (row.expiresAt && row.expiresAt < new Date()) return { ok: false as const, error: "This code has expired" };
  if (row.usageLimit != null && row.usedCount >= row.usageLimit) return { ok: false as const, error: "This code has been fully redeemed" };
  if (subtotal < row.minOrder) return { ok: false as const, error: `Minimum order of ₦${row.minOrder.toLocaleString()} required` };
  const amount = row.type === "percent" ? Math.round((subtotal * row.value) / 100) : Math.min(row.value, subtotal);
  return { ok: true as const, amount, code: row.code, type: row.type, value: row.value };
}

/**
 * Creates an order with a PENDING payment. Stock is NOT reduced here — it is
 * reduced only once a payment is confirmed (see markPaymentSuccessful).
 */
export async function createOrder(input: CheckoutInput) {
  const s = await getSettings();
  if (!input.items.length) throw new Error("Your cart is empty");

  const ids = [...new Set(input.items.map((i) => i.productId))];
  const rows = await db.select().from(products).where(and(eq(products.active, true), inArray(products.id, ids)));
  const byId = new Map(rows.map((r) => [r.id, r]));

  // Check combined quantities per product against available stock
  const needed = new Map<number, number>();
  for (const i of input.items) {
    if (!Number.isInteger(i.quantity) || i.quantity < 1) throw new Error("Invalid quantity");
    needed.set(i.productId, (needed.get(i.productId) ?? 0) + i.quantity);
  }
  for (const [pid, qty] of needed) {
    const p = byId.get(pid);
    if (!p) throw new Error("One of the products is no longer available");
    if (p.stock < qty) throw new Error(p.stock <= 0 ? `"${p.name}" is out of stock` : `Only ${p.stock} of "${p.name}" left in stock`);
  }

  let subtotal = 0;
  const lines = input.items.map((i) => {
    const p = byId.get(i.productId)!;
    const unitPrice = effectivePrice(p);
    subtotal += unitPrice * i.quantity;
    return { p, unitPrice, qty: i.quantity, size: i.size, color: i.color };
  });

  let discountAmount = 0;
  let discountCode: string | null = null;
  if (input.discountCode) {
    const d = await validateDiscount(input.discountCode, subtotal);
    if (!d.ok) throw new Error(d.error);
    discountAmount = d.amount;
    discountCode = d.code;
  }

  const deliveryFee = deliveryFeeFor(s, input.customer.state, subtotal - discountAmount);
  const total = Math.max(0, subtotal - discountAmount + deliveryFee);
  const orderNumber = generateOrderNumber();

  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        userId: input.userId ?? null,
        customerName: input.customer.name,
        customerEmail: input.customer.email.toLowerCase(),
        customerPhone: input.customer.phone,
        address: input.customer.address,
        city: input.customer.city,
        state: input.customer.state,
        notes: input.customer.notes || null,
        subtotal,
        discountCode,
        discountAmount,
        deliveryFee,
        total,
        paymentMethod: input.paymentMethod,
        paymentStatus: "pending",
        status: "pending",
      })
      .returning();

    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId: order.id,
        productId: l.p.id,
        productName: l.p.name,
        productImage: l.p.images[0] ?? null,
        size: l.size,
        color: l.color,
        quantity: l.qty,
        unitPrice: l.unitPrice,
      })),
    );

    await tx.insert(payments).values({
      orderId: order.id,
      reference: orderNumber,
      method: input.paymentMethod,
      amount: total,
      status: "pending",
    });

    if (discountCode) {
      await tx.update(discountCodes).set({ usedCount: sql`${discountCodes.usedCount} + 1` }).where(eq(discountCodes.code, discountCode));
    }

    await tx.insert(notifications).values({
      type: "order",
      message: `New order ${orderNumber} from ${input.customer.name} — ₦${total.toLocaleString()} (${input.paymentMethod === "paystack" ? "Paystack" : "bank transfer"})`,
      link: `/admin/orders/${order.id}`,
    });

    return order;
  });
}

/** Reduce stock for every line of a paid order. Runs at most once per order. */
export async function deductStockTx(tx: Tx, orderId: number, lowStockThreshold: number) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.stockDeducted) return;

  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const pids = [...new Set(items.map((i) => i.productId).filter((x): x is number => x != null))];
  const prods = pids.length ? await tx.select().from(products).where(inArray(products.id, pids)) : [];
  const running = new Map(prods.map((p) => [p.id, p.stock]));

  for (const it of items) {
    if (it.productId == null) continue;
    const p = prods.find((x) => x.id === it.productId);
    if (!p) continue;
    const before = running.get(p.id) ?? 0;
    const after = Math.max(0, before - it.quantity);
    running.set(p.id, after);

    await tx
      .update(products)
      .set({
        stock: sql`greatest(${products.stock} - ${it.quantity}, 0)`,
        soldCount: sql`${products.soldCount} + ${it.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, p.id));

    if (before < it.quantity) {
      await tx.insert(notifications).values({
        type: "stock",
        message: `Oversold: "${p.name}" — ${it.quantity} sold on ${order.orderNumber} but only ${before} were in stock. Restock or contact the customer.`,
        link: "/admin/inventory",
      });
    } else if (after <= lowStockThreshold) {
      await tx.insert(notifications).values({
        type: "stock",
        message: `Low stock: "${p.name}" has ${after} left`,
        link: "/admin/inventory",
      });
    }
  }

  await tx.update(orders).set({ stockDeducted: true }).where(eq(orders.id, orderId));
}

/** Put stock back for a cancelled order that had already deducted stock. */
export async function restoreStockTx(tx: Tx, orderId: number) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || !order.stockDeducted) return;
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const it of items) {
    if (it.productId == null) continue;
    await tx
      .update(products)
      .set({
        stock: sql`${products.stock} + ${it.quantity}`,
        soldCount: sql`greatest(${products.soldCount} - ${it.quantity}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, it.productId));
  }
  await tx.update(orders).set({ stockDeducted: false }).where(eq(orders.id, orderId));
}

export type PaymentResult = { ok: true; alreadyProcessed: boolean; orderId: number } | { ok: false; error: string };

/**
 * Mark a payment as successful. Idempotent and race-safe (row locks).
 * Only place where stock is reduced for a purchase.
 */
export async function markPaymentSuccessful(
  reference: string,
  info: { verifiedBy: string; channel?: string | null; gatewayResponse?: string | null; paidAt?: Date | null; amountNaira?: number },
): Promise<PaymentResult> {
  const s = await getSettings();
  const threshold = Number(s.low_stock_threshold) || 5;

  return db.transaction(async (tx): Promise<PaymentResult> => {
    const [pay] = await tx.select().from(payments).where(eq(payments.reference, reference)).limit(1).for("update");
    if (!pay) return { ok: false, error: "Payment reference not found" };
    if (pay.status === "successful") return { ok: true, alreadyProcessed: true, orderId: pay.orderId };

    const [order] = await tx.select().from(orders).where(eq(orders.id, pay.orderId)).limit(1).for("update");

    if (info.amountNaira != null && Math.round(info.amountNaira) < pay.amount) {
      await tx
        .update(payments)
        .set({ status: "failed", gatewayResponse: `Amount mismatch: paid ₦${info.amountNaira}, expected ₦${pay.amount}`, updatedAt: new Date() })
        .where(eq(payments.id, pay.id));
      return { ok: false, error: "Amount paid does not match order total" };
    }

    const now = new Date();
    await tx
      .update(payments)
      .set({
        status: "successful",
        verifiedBy: info.verifiedBy,
        channel: info.channel ?? pay.channel,
        gatewayResponse: info.gatewayResponse ?? pay.gatewayResponse,
        paidAt: info.paidAt ?? now,
        updatedAt: now,
      })
      .where(eq(payments.id, pay.id));

    // Other open attempts for the same order are superseded by this successful payment
    await tx
      .update(payments)
      .set({ status: "failed", gatewayResponse: "Superseded — this order was paid through another payment", updatedAt: now })
      .where(and(eq(payments.orderId, order.id), eq(payments.status, "pending"), ne(payments.id, pay.id)));

    const cancelled = order.status === "cancelled";
    await tx
      .update(orders)
      .set({
        paymentStatus: "successful",
        paymentMethod: pay.method,
        status: !cancelled && order.status === "pending" ? "processing" : order.status,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    await tx.insert(notifications).values({
      type: "payment",
      message: `Payment confirmed for ${order.orderNumber} — ₦${pay.amount.toLocaleString()} (${info.verifiedBy.replace(/_/g, " ")})`,
      link: `/admin/orders/${order.id}`,
    });

    if (cancelled) {
      await tx.insert(notifications).values({
        type: "payment",
        message: `Payment received for CANCELLED order ${order.orderNumber}. Refund the customer or reopen the order.`,
        link: `/admin/orders/${order.id}`,
      });
    } else {
      await deductStockTx(tx, order.id, threshold);
    }

    return { ok: true, alreadyProcessed: false, orderId: order.id };
  });
}

/** Mark one payment attempt as failed. The order stays payable if another attempt is open. */
export async function markPaymentFailed(reference: string, reason: string): Promise<boolean> {
  const [pay] = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
  if (!pay || pay.status === "successful") return false;
  const now = new Date();
  await db.update(payments).set({ status: "failed", gatewayResponse: reason, updatedAt: now }).where(eq(payments.id, pay.id));

  const [order] = await db.select().from(orders).where(eq(orders.id, pay.orderId)).limit(1);
  if (order && order.paymentStatus !== "successful") {
    const open = await db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.orderId, pay.orderId), eq(payments.status, "pending")))
      .limit(1);
    await db
      .update(orders)
      .set({ paymentStatus: open.length ? "pending" : "failed", updatedAt: now })
      .where(eq(orders.id, pay.orderId));
  }
  return true;
}

/**
 * Returns the open bank-transfer payment attempt for an order, creating one if needed.
 * Customers who choose bank transfer (or fall back to it) get a pending attempt that the
 * admin must verify manually. This never marks anything as paid.
 */
export async function ensureBankTransferPayment(orderId: number) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found");

  const open = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.method, "bank_transfer"), eq(payments.status, "pending")))
    .limit(1);

  let pay = open[0];
  if (!pay) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    [pay] = await db
      .insert(payments)
      .values({ orderId, reference: `${order.orderNumber}-BT${suffix}`, method: "bank_transfer", amount: order.total, status: "pending" })
      .returning();
  }

  if (order.paymentStatus !== "successful") {
    await db
      .update(orders)
      .set({ paymentMethod: "bank_transfer", paymentStatus: "pending", updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  }
  return pay;
}
