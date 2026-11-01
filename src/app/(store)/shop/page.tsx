import Link from "next/link";
import type { Metadata } from "next";
import { listProducts, getAllCategories, getFilterOptions, type ShopFilters } from "@/lib/queries";
import { ProductCard } from "@/components/store/product-card";
import { ShopFiltersPanel } from "./filters";

export const metadata: Metadata = { title: "Shop" };

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(str(sp.page)) || 1);
  const perPage = 24;
  const filters: ShopFilters = {
    q: str(sp.q),
    category: str(sp.category),
    minPrice: str(sp.min) ? Number(str(sp.min)) : undefined,
    maxPrice: str(sp.max) ? Number(str(sp.max)) : undefined,
    size: str(sp.size),
    color: str(sp.color),
    sort: (str(sp.sort) as ShopFilters["sort"]) || "newest",
    deals: str(sp.deals) === "1",
    limit: perPage,
    offset: (page - 1) * perPage,
  };

  const [{ items, total }, cats, opts] = await Promise.all([listProducts(filters), getAllCategories(), getFilterOptions()]);
  const activeCat = cats.find((c) => c.slug === filters.category);
  const pages = Math.ceil(total / perPage);

  const title = filters.q
    ? `Results for “${filters.q}”`
    : activeCat?.name || (filters.deals ? "Special offers" : filters.sort === "popular" ? "Best sellers" : filters.sort === "newest" && !filters.category ? "All products" : "All products");

  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => {
      const s = str(v);
      if (s && k !== "page") u.set(k, s);
    });
    u.set("page", String(p));
    return `/shop?${u.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="text-xs text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span> <Link href="/shop" className="hover:text-black">Shop</Link>
        {activeCat && (<><span className="mx-1">/</span> <span className="text-black">{activeCat.name}</span></>)}
      </nav>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl">{title}</h1>
          {activeCat?.description && <p className="mt-1 text-sm text-neutral-500">{activeCat.description}</p>}
        </div>
        <p className="text-sm text-neutral-500">{total} product{total === 1 ? "" : "s"}</p>
      </div>

      {/* Category chips */}
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
        <Link href="/shop" className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition ${!filters.category ? "border-black bg-black text-white" : "border-neutral-300 hover:border-black"}`}>All</Link>
        {cats.map((c) => (
          <Link key={c.id} href={`/shop?category=${c.slug}`} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition ${filters.category === c.slug ? "border-black bg-black text-white" : "border-neutral-300 hover:border-black"}`}>
            {c.name}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <ShopFiltersPanel sizes={opts.sizes} colors={opts.colors} maxPrice={opts.maxPrice} />
        <div>
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 p-16 text-center">
              <p className="font-serif text-2xl">No products found</p>
              <p className="mt-2 text-sm text-neutral-500">Try adjusting your filters or search term.</p>
              <Link href="/shop" className="btn-primary mt-6">Clear filters</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3">
              {items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
          {pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link key={p} href={pageHref(p)} className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm ${p === page ? "border-black bg-black text-white" : "border-neutral-300 hover:border-black"}`}>
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
