"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { formatNaira, effectivePrice, discountPercent } from "@/lib/utils";
import { ShareButton } from "./share-buttons";

export type ProductCardData = {
  id: number;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  images: string[];
  stock: number;
  sizes: string[];
  colors: string[];
  isNewArrival?: boolean;
  categoryName?: string | null;
  soldCount?: number;
};

export function ProductCard({ product, index = 0 }: { product: ProductCardData; index?: number }) {
  const { addItem, toggleWishlist, inWishlist, hydrated } = useCart();
  const price = effectivePrice(product);
  const pct = discountPercent(product);
  const out = product.stock <= 0;
  const img = product.images[0] || "/images/hero.jpg";
  const img2 = product.images[1];
  const needsOptions = product.sizes.length > 1 || product.colors.length > 1;

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (out) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: img,
      price,
      size: product.sizes[0] ?? null,
      color: product.colors[0] ?? null,
      quantity: 1,
      maxStock: product.stock,
    });
  };

  return (
    <div
      className="group animate-fade-up relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={product.name}
          loading="lazy"
          className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-105 ${img2 ? "group-hover:opacity-0" : ""}`}
        />
        {img2 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img2}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-all duration-700 group-hover:opacity-100"
          />
        )}
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {pct > 0 && (
            <span className="rounded-md bg-accent-400 px-2 py-0.5 text-[11px] font-extrabold text-black shadow-sm">-{pct}%</span>
          )}
          {product.isNewArrival && (
            <span className="rounded-md bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">New</span>
          )}
        </div>
        {out && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold text-white">Sold out</span>
          </div>
        )}
      </Link>

      <div className="absolute right-2 top-2 flex flex-col gap-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          className="rounded-full bg-white/95 p-2 shadow-sm transition hover:bg-accent-400"
          aria-label="Add to wishlist"
        >
          <Heart className={`h-4 w-4 ${hydrated && inWishlist(product.id) ? "fill-red-500 text-red-500" : ""}`} />
        </button>
        <div className="opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          <ShareButton
            title={product.name}
            text={`${product.name} — ${formatNaira(price)}`}
            path={`/product/${product.slug}`}
            image={img}
            variant="icon"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.categoryName && <p className="truncate text-[11px] font-medium uppercase tracking-wide text-neutral-500">{product.categoryName}</p>}
        <Link href={`/product/${product.slug}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-neutral-900 transition hover:text-brand-600">
          {product.name}
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-extrabold text-black">{formatNaira(price)}</span>
          {pct > 0 && <span className="text-xs text-neutral-400 line-through">{formatNaira(product.price)}</span>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-[11px]">
          {product.stock > 0 && product.stock <= 5 ? (
            <span className="font-semibold text-red-600">Only {product.stock} left</span>
          ) : product.soldCount && product.soldCount > 0 ? (
            <span className="text-neutral-500">{product.soldCount} sold</span>
          ) : (
            <span className="text-brand-700">✓ In stock</span>
          )}
        </div>
        <div className="pt-1">
          {needsOptions ? (
            <Link href={`/product/${product.slug}`} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-500 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-500 hover:text-white">
              <ShoppingBag className="h-3.5 w-3.5" /> Select options
            </Link>
          ) : (
            <button
              onClick={quickAdd}
              disabled={out}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 py-2 text-xs font-bold text-white transition hover:bg-brand-600 disabled:bg-neutral-300"
            >
              <ShoppingBag className="h-3.5 w-3.5" /> {out ? "Sold out" : "Add to cart"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
