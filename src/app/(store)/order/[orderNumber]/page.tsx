import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle, Package, Truck, Home, Copy } from "lucide-react";
import { db } from "@/db";
import { orders, orderItems, payments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { formatNaira, formatDate, statusColor, whatsappLink } from "@/lib/utils";
import { BankTransferPanel, RetryPaystackButton } from "./order-client";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ paystack_error?: string }> }) {
  const { orderNumber } = await params;
  const { paystack_error } = await searchParams;
  const order = (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0];
  if (!order) notFound();
  const [items, pays, s] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(payments).where(eq(payments.orderId, order.id)).orderBy(desc(payments.createdAt)),
    getSettings(),
  ]);
  const pay = pays[0];
  const paid = order.paymentStatus === "successful";
  const failed = order.paymentStatus === "failed";

  const steps = [
    { key: "pending", label: "Order placed", icon: Clock },
    { key: "processing", label: "Processing", icon: Package },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: Home },
  ];
  const stepIndex = order.status === "cancelled" ? -1 : steps.findIndex((st) => st.key === order.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="text-center">
        {paid ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        ) : failed ? (
          <XCircle className="mx-auto h-14 w-14 text-red-600" />
        ) : (
          <Clock className="mx-auto h-14 w-14 text-brand-500" />
        )}
        <h1 className="mt-4 font-serif text-3xl sm:text-4xl">
          {paid ? "Thank you! Your order is confirmed." : failed ? "Payment was not successful" : "Order received — awaiting payment"}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Order number <span className="font-mono font-semibold text-black">{order.orderNumber}</span> · {formatDate(order.createdAt)}
        </p>
        <p className="mt-1 text-xs text-neutral-400">A confirmation has been recorded for {order.customerEmail}. Save your order number to track delivery.</p>
      </div>

      {paystack_error && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Online payment could not be started ({paystack_error}). You can pay via bank transfer below.
        </div>
      )}

      {/* Status tracker */}
      <div className="card mt-8 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl">Order status</h2>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusColor(order.status)}`}>{order.status}</span>
        </div>
        {order.status === "cancelled" ? (
          <p className="mt-4 text-sm text-red-700">This order has been cancelled. Contact us on WhatsApp if you have questions.</p>
        ) : (
          <ol className="mt-6 grid grid-cols-4 gap-2">
            {steps.map((st, i) => {
              const done = i <= stepIndex;
              return (
                <li key={st.key} className="flex flex-col items-center text-center">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${done ? "border-black bg-black text-brand-300" : "border-neutral-200 text-neutral-300"}`}>
                    <st.icon className="h-4 w-4" />
                  </div>
                  <p className={`mt-2 text-[11px] font-medium sm:text-xs ${done ? "text-black" : "text-neutral-400"}`}>{st.label}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Payment */}
      <div className="card mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl">Payment</h2>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusColor(order.paymentStatus)}`}>{order.paymentStatus}</span>
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-neutral-500">Method</dt><dd className="font-medium capitalize">{order.paymentMethod.replace("_", " ")}</dd></div>
          <div><dt className="text-neutral-500">Reference</dt><dd className="font-mono font-medium">{pay?.reference}</dd></div>
          {pay?.channel && <div><dt className="text-neutral-500">Channel</dt><dd className="font-medium capitalize">{pay.channel}</dd></div>}
          {pay?.paidAt && <div><dt className="text-neutral-500">Paid at</dt><dd className="font-medium">{formatDate(pay.paidAt)}</dd></div>}
        </dl>

        {!paid && order.status !== "cancelled" && (
          <div className="mt-6 space-y-4">
            {s.paystack_enabled === "true" && (
              <RetryPaystackButton orderNumber={order.orderNumber} amount={order.total} />
            )}
            {s.bank_transfer_enabled === "true" && (
              <BankTransferPanel
                orderNumber={order.orderNumber}
                amount={order.total}
                bankName={s.bank_name}
                accountName={s.bank_account_name}
                accountNumber={s.bank_account_number}
                whatsapp={whatsappLink(s.whatsapp_number, `Hello, I've made a bank transfer of ${formatNaira(order.total)} for order ${order.orderNumber}. Please confirm.`)}
                existingNote={pay?.customerNote ?? ""}
              />
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card mt-6 p-6">
        <h2 className="font-serif text-xl">Items</h2>
        <ul className="mt-4 divide-y divide-neutral-200">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-4 py-3">
              {it.productImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.productImage} alt="" className="h-16 w-13 rounded-lg object-cover" />
              )}
              <div className="flex-1 text-sm">
                <p className="font-medium">{it.productName}</p>
                <p className="text-xs text-neutral-500">{[it.size, it.color].filter(Boolean).join(" · ")} × {it.quantity}</p>
              </div>
              <p className="text-sm font-semibold">{formatNaira(it.unitPrice * it.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-neutral-200 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-neutral-500">Subtotal</dt><dd>{formatNaira(order.subtotal)}</dd></div>
          {order.discountAmount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount ({order.discountCode})</dt><dd>−{formatNaira(order.discountAmount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-neutral-500">Delivery</dt><dd>{order.deliveryFee === 0 ? "FREE" : formatNaira(order.deliveryFee)}</dd></div>
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatNaira(order.total)}</dd></div>
        </dl>
      </div>

      <div className="card mt-6 p-6 text-sm">
        <h2 className="font-serif text-xl">Delivery details</h2>
        <p className="mt-3 font-medium">{order.customerName}</p>
        <p className="text-neutral-600">{order.address}, {order.city}, {order.state}</p>
        <p className="text-neutral-600">{order.customerPhone} · {order.customerEmail}</p>
        {order.notes && <p className="mt-2 text-neutral-500">Note: {order.notes}</p>}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn-primary">Continue shopping</Link>
        <Link href="/track" className="btn-outline"><Copy className="h-4 w-4" /> Track another order</Link>
      </div>
    </div>
  );
}
