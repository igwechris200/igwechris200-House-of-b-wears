"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { formatNaira } from "@/lib/utils";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, hydrated } = useCart();

  if (!hydrated) return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-neutral-500">Loading your cart…</div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-neutral-300" />
        <h1 className="mt-4 font-serif text-3xl">Your cart is empty</h1>
        <p className="mt-2 text-sm text-neutral-500">Looks like you haven&apos;t added anything yet.</p>
        <Link href="/shop" className="btn-primary mt-8">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl sm:text-4xl">Shopping cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
          {items.map((it) => (
            <div key={it.key} className="flex gap-4 p-4 sm:p-5">
              <Link href={`/product/${it.slug}`} className="h-28 w-22 shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:h-32 sm:w-26">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/product/${it.slug}`} className="text-sm font-semibold hover:text-brand-600">{it.name}</Link>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {[it.size && `Size: ${it.size}`, it.color && `Colour: ${it.color}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <button onClick={() => removeItem(it.key)} className="rounded-full p-2 text-neutral-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="inline-flex items-center rounded-full border border-neutral-300">
                    <button onClick={() => updateQuantity(it.key, it.quantity - 1)} className="p-2" aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center text-sm font-semibold">{it.quantity}</span>
                    <button onClick={() => updateQuantity(it.key, it.quantity + 1)} className="p-2" aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <p className="text-sm font-semibold">{formatNaira(it.price * it.quantity)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <aside className="card h-fit p-6 lg:sticky lg:top-28">
          <h2 className="font-serif text-xl">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-neutral-500">Subtotal</dt><dd className="font-medium">{formatNaira(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">Delivery</dt><dd className="text-neutral-500">Calculated at checkout</dd></div>
          </dl>
          <div className="mt-4 flex justify-between border-t border-neutral-200 pt-4 text-base font-semibold">
            <span>Total</span><span>{formatNaira(subtotal)}</span>
          </div>
          <Link href="/checkout" className="btn-primary mt-6 w-full !py-4">Proceed to checkout <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/shop" className="mt-3 block text-center text-sm text-neutral-500 underline-offset-4 hover:underline">Continue shopping</Link>
          <p className="mt-5 text-center text-[11px] text-neutral-400">Secure checkout · Paystack · Bank transfer</p>
        </aside>
      </div>
    </div>
  );
}
