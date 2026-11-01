import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Phone, Mail, AlertTriangle } from "lucide-react";
import { db } from "@/db";
import { orders, orderItems, payments, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatNaira, formatDate, statusColor, whatsappLink } from "@/lib/utils";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { PaymentActions } from "@/components/admin/payment-actions";

export const metadata = { title: "Order detail" };
export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = (await db.select().from(orders).where(eq(orders.id, Number(id))).limit(1))[0];
  if (!order) notFound();
  const [items, pays, customer] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(payments).where(eq(payments.orderId, order.id)).orderBy(desc(payments.createdAt)),
    order.userId ? db.select().from(users).where(eq(users.id, order.userId)).limit(1) : Promise.resolve([]),
  ]);
  const paid = order.paymentStatus === "successful";

  return (
    <div className="space-y-6">
      <a href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-black">
        <ArrowLeft className="h-4 w-4" /> All orders
      </a>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Order</p>
          <h1 className="mt-1 font-mono text-2xl font-bold sm:text-3xl">{order.orderNumber}</h1>
          <p className="text-sm text-neutral-500">
            Placed {formatDate(order.createdAt)} · Last updated {formatDate(order.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusColor(order.paymentStatus)}`}>
            Payment: {order.paymentStatus}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusColor(order.status)}`}>
            {order.status}
          </span>
        </div>
      </div>

      {!paid && order.status !== "cancelled" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This order is <strong>not paid yet</strong>. Verify the payment in the section below before processing or shipping it.
          </p>
        </div>
      )}
      {order.status === "cancelled" && paid && (
        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>This order was cancelled after payment. Refund the customer from your Paystack or bank account.</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          {/* Items */}
          <section className="card overflow-hidden">
            <h2 className="p-5 pb-3 font-serif text-xl sm:p-6 sm:pb-3">Products purchased</h2>
            <ul className="divide-y divide-neutral-100">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  {it.productImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.productImage} alt="" className="h-16 w-12 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{it.productName}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Size: <span className="font-semibold text-neutral-800">{it.size || "—"}</span> · Colour:{" "}
                      <span className="font-semibold text-neutral-800">{it.color || "—"}</span>
                    </p>
                    <p className="text-xs text-neutral-500">{formatNaira(it.unitPrice)} each</p>
                    {it.productId && (
                      <a href={`/admin/products/${it.productId}/edit`} className="text-xs text-brand-600 hover:underline">
                        Open product
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500">Qty</p>
                    <p className="font-semibold">× {it.quantity}</p>
                    <p className="mt-1 text-sm font-semibold">{formatNaira(it.unitPrice * it.quantity)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-neutral-100 p-5 text-sm sm:p-6">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Subtotal</dt>
                <dd>{formatNaira(order.subtotal)}</dd>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount ({order.discountCode})</dt>
                  <dd>−{formatNaira(order.discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-neutral-500">Delivery</dt>
                <dd>{order.deliveryFee === 0 ? "Free" : formatNaira(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatNaira(order.total)}</dd>
              </div>
            </dl>
          </section>

          {/* Payments */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-serif text-xl">Payment records</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Paystack payments are checked against Paystack. Bank transfers are confirmed by you after checking your bank statement.
            </p>
            {pays.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-400">No payment attempts yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-neutral-100">
                {pays.map((p) => (
                  <li key={p.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-all font-mono text-xs font-semibold">{p.reference}</p>
                        <p className="mt-0.5 text-xs capitalize text-neutral-500">
                          {p.method.replace("_", " ")}
                          {p.channel && ` · ${p.channel}`} · {formatDate(p.createdAt)}
                        </p>
                        {p.verifiedBy && <p className="text-xs text-neutral-500">Verified by: {p.verifiedBy.replace(/_/g, " ")}</p>}
                        {p.gatewayResponse && <p className="text-xs text-neutral-500">Note: {p.gatewayResponse}</p>}
                        {p.customerNote && (
                          <p className="mt-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs text-brand-900">
                            Customer says: “{p.customerNote}”
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatNaira(p.amount)}</p>
                        <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                    <PaymentActions
                      reference={p.reference}
                      method={p.method}
                      status={p.status}
                      orderPaid={paid}
                      orderCancelled={order.status === "cancelled"}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="font-serif text-xl">Update order status</h2>
            <p className="mt-1 text-xs text-neutral-500">Processing, shipped and delivered require a confirmed payment.</p>
            <div className="mt-4">
              <OrderStatusForm orderId={order.id} current={order.status} />
            </div>
          </section>

          <section className="card p-5 text-sm sm:p-6">
            <h2 className="font-serif text-xl">Customer</h2>
            <p className="mt-3 font-semibold">{order.customerName}</p>
            {customer[0] ? (
              <a href={`/admin/customers/${customer[0].id}`} className="text-xs text-brand-600 hover:underline">
                Registered customer — view profile &amp; history
              </a>
            ) : (
              <p className="text-xs text-neutral-400">Guest checkout</p>
            )}
            <div className="mt-3 space-y-2 text-neutral-700">
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-neutral-400" />{" "}
                <a href={`tel:${order.customerPhone}`} className="hover:underline">
                  {order.customerPhone}
                </a>
              </p>
              <p className="flex items-center gap-2 break-all">
                <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-400" />{" "}
                <a href={`mailto:${order.customerEmail}`} className="hover:underline">
                  {order.customerEmail}
                </a>
              </p>
            </div>
            <a
              href={whatsappLink(order.customerPhone, `Hello ${order.customerName}, this is about your order ${order.orderNumber}.`)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-2.5 text-xs font-semibold text-white hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp customer
            </a>
            <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Delivery address</h3>
            <p className="mt-1 text-neutral-700">
              {order.address}
              <br />
              {order.city}, {order.state}
            </p>
            {order.notes && (
              <>
                <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Customer notes</h3>
                <p className="mt-1 text-neutral-700">{order.notes}</p>
              </>
            )}
            <a href={`/order/${order.orderNumber}`} className="mt-4 block text-xs text-brand-600 hover:underline">
              Open the customer&apos;s order page →
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
