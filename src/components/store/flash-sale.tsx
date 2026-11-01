"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Zap, ChevronRight } from "lucide-react";
import { ProductCard, type ProductCardData } from "./product-card";

/** Milliseconds until the next midnight in Lagos (UTC+1). */
function msUntilLagosMidnight(now: number) {
  const offset = 60 * 60 * 1000;
  const lagos = new Date(now + offset);
  const nextMidnightLagosUtc = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate() + 1) - offset;
  return Math.max(0, nextMidnightLagosUtc - now);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Countdown() {
  // Rendered only after mount so server and client markup never disagree
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(msUntilLagosMidnight(Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  if (left === null) {
    return <div className="h-8 w-40 animate-pulse rounded bg-brand-100" aria-hidden />;
  }
  const s = Math.floor(left / 1000);
  const parts = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  return (
    <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-white">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-100">Ends in</span>
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="rounded-md bg-black/25 px-2 py-1 tabular-nums">{pad(p)}</span>
          {i < 2 && <span className="text-accent-300">:</span>}
        </span>
      ))}
    </div>
  );
}

export function FlashSale({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-500 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-400 text-black">
            <Zap className="h-4 w-4 fill-black" />
          </span>
          <div>
            <h2 className="font-serif text-lg leading-tight text-white sm:text-xl">Flash Sales</h2>
            <p className="text-[11px] text-brand-100">Discounted pieces while stocks last</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Countdown />
          <Link href="/shop?deals=1" className="hidden items-center gap-1 text-sm font-bold text-accent-300 hover:text-white sm:flex">
            See all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto p-3 sm:gap-4 sm:p-5">
        {products.map((p, i) => (
          <div key={p.id} className="w-[46vw] shrink-0 snap-start sm:w-56">
            <ProductCard product={p} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
