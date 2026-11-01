import { Plus, Pencil, Search, Star, Flame, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import { formatNaira } from "@/lib/utils";
import { getAdminProducts } from "@/lib/admin-queries";
import { AdminActionForm } from "@/components/admin/admin-action-form";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

type SP = { q?: string; category?: string; status?: string; created?: string; notice?: string; error?: string };

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [rows, cats] = await Promise.all([
    getAdminProducts({ q: sp.q, category: sp.category ? Number(sp.category) : undefined, status: sp.status }),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
  ]);

  const tabs = [
    { key: "", label: "All" },
    { key: "published", label: "Published" },
    { key: "draft", label: "Drafts" },
    { key: "featured", label: "Featured" },
    { key: "bestseller", label: "Best sellers" },
  ];
  const qs = (overrides: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { ...sp, ...overrides } as Record<string, string | undefined>;
    Object.entries(merged).forEach(([k, v]) => {
      if (v && !["created", "notice", "error"].includes(k)) u.set(k, v);
    });
    const s = u.toString();
    return s ? `/admin/products?${s}` : "/admin/products";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="mt-1 font-serif text-3xl">
            Products <span className="text-base text-neutral-400">({rows.length})</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Published products appear on your store straight away.</p>
        </div>
        <a href="/admin/products/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Add new product
        </a>
      </div>

      {sp.created && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> Product saved. It&apos;s listed below.
        </p>
      )}
      {sp.notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{sp.notice}</p>}
      {sp.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}

      {/* Filters */}
      <form action="/admin/products" method="GET" className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input name="q" defaultValue={sp.q} className="input pl-9" placeholder="Search by name or description…" />
        </div>
        <select name="category" defaultValue={sp.category ?? ""} className="input sm:w-56">
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <button type="submit" className="btn-outline">
          Search
        </button>
      </form>
      <div className="no-scrollbar -mt-3 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={qs({ status: t.key || undefined })}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              (sp.status ?? "") === t.key ? "border-black bg-black text-white" : "border-neutral-300 bg-white hover:border-black"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.length === 0 && (
          <p className="card p-8 text-center text-sm text-neutral-400">
            No products match.{" "}
            <a href="/admin/products/new" className="text-brand-600 underline">
              Add one
            </a>
            .
          </p>
        )}
        {rows.map(({ p, categoryName }) => (
          <div key={p.id} className={`card p-4 ${!p.active ? "opacity-70" : ""}`}>
            <div className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images[0] || "/images/hero.jpg"} alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <a href={`/admin/products/${p.id}/edit`} className="line-clamp-2 font-medium leading-snug">
                  {p.name}
                </a>
                <p className="text-xs text-neutral-500">{categoryName ?? "Uncategorised"}</p>
                <p className="mt-1 text-sm font-semibold">
                  {p.discountPrice ? (
                    <>
                      {formatNaira(p.discountPrice)}{" "}
                      <span className="text-xs font-normal text-neutral-400 line-through">{formatNaira(p.price)}</span>
                    </>
                  ) : (
                    formatNaira(p.price)
                  )}
                </p>
                <p className={`text-xs font-semibold ${p.stock <= 0 ? "text-red-600" : p.stock <= 5 ? "text-amber-700" : "text-emerald-700"}`}>
                  {p.stock <= 0 ? "Out of stock" : `${p.stock} in stock`} · {p.soldCount} sold
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <FlagButton id={p.id} field="active" value={p.active} onLabel="Published" offLabel="Draft" />
              <FlagButton id={p.id} field="featured" value={p.featured} onLabel="Featured" offLabel="Not featured" icon="star" />
              <FlagButton id={p.id} field="bestSeller" value={p.bestSeller} onLabel="Best seller" offLabel="Not best seller" icon="flame" />
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-neutral-100 pt-3">
              <a
                href={`/admin/products/${p.id}/edit`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-neutral-300 py-2 text-xs font-semibold hover:bg-black hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </a>
              <AdminActionForm intent="deleteProduct" confirmMessage={`Delete “${p.name}” permanently?`}>
                <input type="hidden" name="id" value={p.id} />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-600 hover:text-white"
                >
                  Delete
                </button>
              </AdminActionForm>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3">Sold</th>
                <th className="px-3 py-3">Status &amp; badges</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map(({ p, categoryName }) => (
                <tr key={p.id} className={`align-middle hover:bg-neutral-50 ${!p.active ? "bg-neutral-50/60 text-neutral-500" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.images[0] || "/images/hero.jpg"} alt="" className="h-14 w-11 shrink-0 rounded-md object-cover" />
                      <div className="min-w-0">
                        <a href={`/admin/products/${p.id}/edit`} className="block max-w-xs truncate font-medium text-neutral-900 hover:text-brand-600">
                          {p.name}
                        </a>
                        <p className="text-xs text-neutral-400">
                          {p.images.length} photo{p.images.length === 1 ? "" : "s"} · {p.sizes.length} sizes · {p.colors.length} colours
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-neutral-600">{categoryName ?? "—"}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {p.discountPrice ? (
                      <>
                        <span className="font-semibold text-neutral-900">{formatNaira(p.discountPrice)}</span>
                        <br />
                        <span className="text-xs text-neutral-400 line-through">{formatNaira(p.price)}</span>
                      </>
                    ) : (
                      <span className="font-semibold text-neutral-900">{formatNaira(p.price)}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <AdminActionForm intent="setStock" className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="value"
                        type="number"
                        min={0}
                        defaultValue={p.stock}
                        className={`w-20 rounded-lg border px-2 py-1.5 text-xs ${
                          p.stock <= 5 ? "border-red-300 bg-red-50 text-red-700" : "border-neutral-200"
                        }`}
                      />
                      <button type="submit" className="rounded-lg border border-neutral-200 px-2 py-1.5 text-[11px] font-semibold hover:bg-black hover:text-white">
                        Save
                      </button>
                    </AdminActionForm>
                  </td>
                  <td className="px-3 py-3 text-neutral-600">{p.soldCount}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <FlagButton id={p.id} field="active" value={p.active} onLabel="Published" offLabel="Draft" />
                      <FlagButton id={p.id} field="featured" value={p.featured} onLabel="Featured" offLabel="Featured?" icon="star" />
                      <FlagButton id={p.id} field="bestSeller" value={p.bestSeller} onLabel="Best seller" offLabel="Best seller?" icon="flame" />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/admin/products/${p.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold hover:bg-black hover:text-white"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </a>
                      <AdminActionForm intent="deleteProduct" confirmMessage={`Delete “${p.name}” permanently?`}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white">
                          Delete
                        </button>
                      </AdminActionForm>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-neutral-400">
                    No products match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FlagButton({
  id,
  field,
  value,
  onLabel,
  offLabel,
  icon,
}: {
  id: number;
  field: string;
  value: boolean;
  onLabel: string;
  offLabel: string;
  icon?: "star" | "flame";
}) {
  const Icon = field === "active" ? (value ? Eye : EyeOff) : icon === "flame" ? Flame : Star;
  return (
    <AdminActionForm intent="toggleProductFlag">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={String(!value)} />
      <button
        type="submit"
        title={value ? `Turn off: ${onLabel}` : `Turn on: ${onLabel}`}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
          value
            ? field === "active"
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-brand-500 bg-brand-100 text-brand-800"
            : "border-neutral-200 text-neutral-400 hover:border-black hover:text-black"
        }`}
      >
        {value ? onLabel : offLabel}
        <Icon className="h-3 w-3" />
      </button>
    </AdminActionForm>
  );
}
