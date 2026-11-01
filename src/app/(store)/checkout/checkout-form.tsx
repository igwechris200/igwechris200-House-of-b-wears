"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { CreditCard, Landmark, Lock, Tag, AlertTriangle } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { formatNaira, NIGERIAN_STATES } from "@/lib/utils";
import { applyDiscount, placeOrder, quoteDelivery } from "./actions";

type Config = { paystackEnabled: boolean; paystackConfigured: boolean; bankTransferEnabled: boolean; feeLagos: number; feeOther: number; freeThreshold: number };
type UserInfo = { name: string; email: string; phone: string; address: string; city: string; state: string } | null;

export function CheckoutForm({ user, config }: { user: UserInfo; config: Config }) {
  const { items, subtotal, clearCart, hydrated, toast } = useCart();
  const [form, setForm] = useState({
    name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "", address: user?.address ?? "",
    city: user?.city ?? "", state: user?.state || "Lagos", notes: "",
  });
  const [method, setMethod] = useState<"paystack" | "bank_transfer">(config.paystackEnabled ? "paystack" : "bank_transfer");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [codeErr, setCodeErr] = useState("");
  const [fee, setFee] = useState(0);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const discounted = subtotal - (discount?.amount ?? 0);
  useEffect(() => {
    quoteDelivery(form.state, discounted).then(setFee);
  }, [form.state, discounted]);
  const total = Math.max(0, discounted + fee);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const tryCode = async () => {
    setCodeErr("");
    if (!code.trim()) return;
    const r = await applyDiscount(code, subtotal);
    if (r.ok) {
      setDiscount({ code: r.code, amount: r.amount });
      toast(`Code ${r.code} applied`);
    } else {
      setDiscount(null);
      setCodeErr(r.error);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const r = await placeOrder({
        items: items.map((i) => ({ productId: i.productId, size: i.size, color: i.color, quantity: i.quantity })),
        customer: form,
        discountCode: discount?.code,
        paymentMethod: method,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      clearCart();
      window.location.href = r.redirect;
    });
  };

  if (!hydrated) return <p className="py-20 text-center text-sm text-neutral-500">Loading…</p>;
  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-neutral-500">Your cart is empty.</p>
        <Link href="/shop" className="btn-primary mt-6">Shop now</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
      <div className="space-y-8">
        {!user && (
          <div className="rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm">
            Checking out as guest. <Link href="/login?next=/checkout" className="font-semibold underline">Sign in</Link> to save your details and track orders in your account.
          </div>
        )}
        <section className="card p-6">
          <h2 className="font-serif text-xl">Contact information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className="label">Full name</label><input required value={form.name} onChange={upd("name")} className="input" placeholder="Tunde Bakare" /></div>
            <div><label className="label">Email</label><input required type="email" value={form.email} onChange={upd("email")} className="input" placeholder="you@example.com" /></div>
            <div className="sm:col-span-2"><label className="label">Phone (WhatsApp preferred)</label><input required value={form.phone} onChange={upd("phone")} className="input" placeholder="0801 234 5678" /></div>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="font-serif text-xl">Delivery address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label">Street address</label><input required value={form.address} onChange={upd("address")} className="input" placeholder="12 Admiralty Way, Lekki Phase 1" /></div>
            <div><label className="label">City / Area</label><input required value={form.city} onChange={upd("city")} className="input" placeholder="Lekki" /></div>
            <div>
              <label className="label">State</label>
              <select required value={form.state} onChange={upd("state")} className="input">
                {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className="label">Order notes (optional)</label><textarea value={form.notes} onChange={upd("notes")} className="input" rows={2} placeholder="Delivery instructions, custom sizing, etc." /></div>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="font-serif text-xl">Payment method</h2>
          <div className="mt-4 space-y-3">
            <label className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition ${method === "paystack" ? "border-black bg-neutral-50" : "border-neutral-200"} ${!config.paystackEnabled ? "opacity-60" : ""}`}>
              <input type="radio" name="method" disabled={!config.paystackEnabled} checked={method === "paystack"} onChange={() => setMethod("paystack")} className="mt-1 accent-black" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4" /> Pay online with Paystack</div>
                <p className="mt-1 text-xs text-neutral-500">Debit card, bank transfer, USSD or QR. Instant confirmation.</p>
                {!config.paystackConfigured && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Online payment is temporarily unavailable — the store owner needs to add Paystack keys.</p>
                )}
              </div>
            </label>
            {config.bankTransferEnabled && (
              <label className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition ${method === "bank_transfer" ? "border-black bg-neutral-50" : "border-neutral-200"}`}>
                <input type="radio" name="method" checked={method === "bank_transfer"} onChange={() => setMethod("bank_transfer")} className="mt-1 accent-black" />
                <div>
                  <div className="flex items-center gap-2 font-semibold"><Landmark className="h-4 w-4" /> Direct bank transfer</div>
                  <p className="mt-1 text-xs text-neutral-500">Transfer to our bank account. Your order is processed once we manually confirm your payment.</p>
                </div>
              </label>
            )}
          </div>
        </section>
      </div>

      <aside className="card h-fit p-6 lg:sticky lg:top-28">
        <h2 className="font-serif text-xl">Your order</h2>
        <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
          {items.map((it) => (
            <li key={it.key} className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.image} alt="" className="h-16 w-13 rounded-lg object-cover" />
              <div className="flex-1 text-sm">
                <p className="line-clamp-1 font-medium">{it.name}</p>
                <p className="text-xs text-neutral-500">{[it.size, it.color].filter(Boolean).join(" · ")} × {it.quantity}</p>
              </div>
              <p className="text-sm font-medium">{formatNaira(it.price * it.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <label className="label">Discount code</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="input pl-9 uppercase" placeholder="WELCOME10" />
            </div>
            <button type="button" onClick={tryCode} className="btn-outline !px-4 !py-2">Apply</button>
          </div>
          {codeErr && <p className="mt-1 text-xs text-red-600">{codeErr}</p>}
          {discount && <p className="mt-1 text-xs text-emerald-700">{discount.code} applied — you save {formatNaira(discount.amount)}</p>}
        </div>
        <dl className="mt-5 space-y-2 border-t border-neutral-200 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-neutral-500">Subtotal</dt><dd>{formatNaira(subtotal)}</dd></div>
          {discount && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>−{formatNaira(discount.amount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-neutral-500">Delivery ({form.state})</dt><dd>{fee === 0 ? <span className="font-semibold text-emerald-700">FREE</span> : formatNaira(fee)}</dd></div>
        </dl>
        {config.freeThreshold > 0 && discounted < config.freeThreshold && (
          <p className="mt-2 text-[11px] text-neutral-500">Add {formatNaira(config.freeThreshold - discounted)} more for free delivery.</p>
        )}
        <div className="mt-4 flex justify-between border-t border-neutral-200 pt-4 text-lg font-semibold">
          <span>Total</span><span>{formatNaira(total)}</span>
        </div>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={pending} className="btn-primary mt-6 w-full !py-4">
          <Lock className="h-4 w-4" /> {pending ? "Processing…" : method === "paystack" ? `Pay ${formatNaira(total)}` : "Place order"}
        </button>
        <p className="mt-3 text-center text-[11px] text-neutral-400">By placing your order you agree to our terms. Your payment is secured by Paystack.</p>
      </aside>
    </form>
  );
}
