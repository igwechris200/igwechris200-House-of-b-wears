"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { formatNaira } from "@/lib/utils";

export function ShopFiltersPanel({ sizes, colors, maxPrice }: { sizes: string[]; colors: string[]; maxPrice: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);

  const set = (updates: Record<string, string | undefined>) => {
    const u = new URLSearchParams(sp.toString());
    Object.entries(updates).forEach(([k, v]) => (v ? u.set(k, v) : u.delete(k)));
    u.delete("page");
    router.push(`/shop?${u.toString()}`);
  };

  const sort = sp.get("sort") || "newest";
  const size = sp.get("size") || "";
  const color = sp.get("color") || "";
  const min = sp.get("min") || "";
  const max = sp.get("max") || "";
  const deals = sp.get("deals") === "1";
  const activeCount = [size, color, min, max, deals ? "1" : ""].filter(Boolean).length;

  const priceRanges = [
    { label: "Under ₦10,000", min: "", max: "10000" },
    { label: "₦10,000 – ₦20,000", min: "10000", max: "20000" },
    { label: "₦20,000 – ₦40,000", min: "20000", max: "40000" },
    { label: "₦40,000 – ₦80,000", min: "40000", max: "80000" },
    { label: `Above ₦80,000`, min: "80000", max: "" },
  ];

  const panel = (
    <div className="space-y-7">
      <div>
        <p className="label">Sort by</p>
        <select value={sort} onChange={(e) => set({ sort: e.target.value })} className="input">
          <option value="newest">Newest</option>
          <option value="popular">Most popular</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>
      <div>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={deals} onChange={(e) => set({ deals: e.target.checked ? "1" : undefined })} className="h-4 w-4 accent-black" />
          On sale only
        </label>
      </div>
      <div>
        <p className="label">Price</p>
        <div className="space-y-1.5">
          {priceRanges.map((r) => {
            const active = min === r.min && max === r.max;
            return (
              <button key={r.label} onClick={() => set(active ? { min: undefined, max: undefined } : { min: r.min || undefined, max: r.max || undefined })} className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${active ? "bg-black text-white" : "hover:bg-neutral-100"}`}>
                {r.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-neutral-400">Max in store: {formatNaira(maxPrice)}</p>
      </div>
      <div>
        <p className="label">Size</p>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button key={s} onClick={() => set({ size: size === s ? undefined : s })} className={`min-w-10 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${size === s ? "border-black bg-black text-white" : "border-neutral-300 hover:border-black"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">Colour</p>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <button key={c} onClick={() => set({ color: color === c ? undefined : c })} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${color === c ? "border-black bg-black text-white" : "border-neutral-300 hover:border-black"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {activeCount > 0 && (
        <button onClick={() => set({ size: undefined, color: undefined, min: undefined, max: undefined, deals: undefined })} className="text-sm font-medium text-brand-600 underline-offset-4 hover:underline">
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <button onClick={() => setOpen(true)} className="btn-outline w-full !py-2.5">
          <SlidersHorizontal className="h-4 w-4" /> Filters &amp; sort {activeCount > 0 && `(${activeCount})`}
        </button>
        {open && (
          <div className="fixed inset-0 z-[80] bg-black/50" onClick={() => setOpen(false)}>
            <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-serif text-xl">Filters</h3>
                <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
              </div>
              {panel}
              <button onClick={() => setOpen(false)} className="btn-primary mt-6 w-full">Show results</button>
            </div>
          </div>
        )}
      </div>
      <aside className="hidden lg:block">
        <div className="sticky top-28">{panel}</div>
      </aside>
    </>
  );
}
