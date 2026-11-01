"use client";

import { useEffect, useState } from "react";
import { Heart, Minus, Plus, ShoppingBag, Truck, ShieldCheck, MessageCircle, Check } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { ShareButton } from "@/components/store/share-buttons";
import { formatNaira, effectivePrice, discountPercent, whatsappLink } from "@/lib/utils";

type P = {
  id: number; name: string; slug: string; description: string; price: number; discountPrice: number | null;
  images: string[]; sizes: string[]; colors: string[]; stock: number; categoryName: string | null; soldCount: number;
};

export function ProductDetail({ product, whatsapp, storeName }: { product: P; whatsapp: string; storeName: string }) {
  const { addItem, toggleWishlist, inWishlist, hydrated } = useCart();
  const [active, setActive] = useState(0);
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0] : null);
  const [color, setColor] = useState<string | null>(product.colors.length === 1 ? product.colors[0] : null);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState("");
  const [added, setAdded] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  useEffect(() => setPageUrl(window.location.href), []);

  const price = effectivePrice(product);
  const pct = discountPercent(product);
  const out = product.stock <= 0;
  const images = product.images.length ? product.images : ["/images/hero.jpg"];

  const add = () => {
    if (product.sizes.length && !size) return setErr("Please select a size");
    if (product.colors.length && !color) return setErr("Please select a colour");
    setErr("");
    addItem({ productId: product.id, slug: product.slug, name: product.name, image: images[0], price, size, color, quantity: qty, maxStock: product.stock });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const shareText = `${product.name} — ${formatNaira(price)} at ${storeName}`;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
      {/* Gallery */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={active} src={images[active]} alt={product.name} className="animate-fade-in h-full w-full object-cover" />
          {pct > 0 && <span className="absolute left-4 top-4 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-black">-{pct}%</span>}
          <div className="absolute right-4 top-4 flex flex-col gap-2">
            <button onClick={() => toggleWishlist(product.id)} className="rounded-full bg-white p-3 shadow transition hover:bg-brand-500" aria-label="Wishlist">
              <Heart className={`h-5 w-5 ${hydrated && inWishlist(product.id) ? "fill-red-500 text-red-500" : ""}`} />
            </button>
          </div>
          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden">
              {images.map((_, i) => (
                <button key={i} onClick={() => setActive(i)} className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-white" : "w-1.5 bg-white/60"}`} />
              ))}
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto">
            {images.map((img, i) => (
              <button key={i} onClick={() => setActive(i)} className={`h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${i === active ? "border-black" : "border-transparent opacity-70 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        {product.categoryName && <p className="eyebrow">{product.categoryName}</p>}
        <h1 className="mt-2 font-serif text-3xl sm:text-4xl">{product.name}</h1>
        <div className="mt-4 flex items-end gap-3">
          <span className="text-2xl font-semibold">{formatNaira(price)}</span>
          {pct > 0 && <span className="pb-0.5 text-base text-neutral-400 line-through">{formatNaira(product.price)}</span>}
          {pct > 0 && <span className="pb-1 text-xs font-semibold text-brand-600">You save {formatNaira(product.price - price)}</span>}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs">
          {out ? (
            <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700">Out of stock</span>
          ) : product.stock <= 5 ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">Only {product.stock} left — order soon</span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">In stock</span>
          )}
          {product.soldCount > 20 && <span className="text-neutral-500">{product.soldCount}+ sold</span>}
        </div>

        <p className="mt-6 text-sm leading-relaxed text-neutral-600">{product.description}</p>

        {product.sizes.length > 0 && (
          <div className="mt-7">
            <div className="flex items-center justify-between">
              <p className="label !mb-0">Size {size && <span className="text-black">— {size}</span>}</p>
              <a href={whatsappLink(whatsapp, `Hi, I need help choosing a size for ${product.name}`)} target="_blank" rel="noreferrer" className="text-xs text-neutral-500 underline-offset-4 hover:underline">Size guide / custom</a>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button key={s} onClick={() => setSize(s)} className={`min-w-12 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${size === s ? "border-black bg-black text-white" : "border-neutral-300 hover:border-black"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {product.colors.length > 0 && (
          <div className="mt-6">
            <p className="label">Colour {color && <span className="text-black">— {color}</span>}</p>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${color === c ? "border-black bg-black text-white" : "border-neutral-300 hover:border-black"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="label">Quantity</p>
          <div className="inline-flex items-center rounded-full border border-neutral-300">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-3 hover:text-brand-600" aria-label="Decrease"><Minus className="h-4 w-4" /></button>
            <span className="w-10 text-center text-sm font-semibold">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))} className="p-3 hover:text-brand-600" aria-label="Increase"><Plus className="h-4 w-4" /></button>
          </div>
        </div>

        {err && <p className="mt-4 text-sm font-medium text-red-600">{err}</p>}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={add} disabled={out} className="btn-primary flex-1 !py-4">
            {added ? <><Check className="h-5 w-5" /> Added to cart</> : <><ShoppingBag className="h-5 w-5" /> {out ? "Sold out" : `Add to cart — ${formatNaira(price * qty)}`}</>}
          </button>
          <ShareButton title={product.name} text={shareText} path={`/product/${product.slug}`} image={images[0]} />
        </div>
        <a href={whatsappLink(whatsapp, `Hello ${storeName}, I'm interested in "${product.name}" (${formatNaira(price)}). ${pageUrl}`)} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-full border border-[#25D366] py-3 text-sm font-semibold text-[#1da851] transition hover:bg-[#25D366] hover:text-white">
          <MessageCircle className="h-4 w-4" /> Order via WhatsApp
        </a>

        <div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl bg-neutral-50 p-5 text-xs text-neutral-600">
          <div className="flex gap-2"><Truck className="h-4 w-4 shrink-0 text-brand-500" /> Delivery in 1–3 days within Lagos, 3–7 days nationwide.</div>
          <div className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" /> Secure checkout with Paystack. Pay by card, transfer or USSD.</div>
        </div>
      </div>
    </div>
  );
}
