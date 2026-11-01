import { AlertTriangle, PackageX, PackageCheck, Boxes, Wallet } from "lucide-react";
import { getInventory, type StockFilter } from "@/lib/admin-queries";
import { formatNaira, formatDate } from "@/lib/utils";
import { AdminActionForm } from "@/components/admin/admin-action-form";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

const FILTERS: { key: StockFilter; label: string }[] = [
  { key: "all", label: "All products" },
  { key: "low", label: "Low stock" },
  { key: "out", label: "Out of stock" },
  { key: "in", label: "In stock" },
];

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ filter?: string; notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const filter = (["all", "low", "out", "in"].includes(sp.filter ?? "") ? sp.filter : "all") as StockFilter;
  const { items, summary } = await getInventory(filter);

  const cards = [
    { label: "Units in stock", value: summary.units.toLocaleString("en-NG"), icon: Boxes, tone: "text-brand-600" },
    { label: "Healthy products", value: summary.inStock, icon: PackageCheck, tone: "text-emerald-600" },
    { label: `Low stock (≤ ${summary.threshold})`, value: summary.low, icon: AlertTriangle, tone: "text-amber-600" },
    { label: "Out of stock", value: summary.out, icon: PackageX, tone: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Stock control</p>
          <h1 className="mt-1 font-serif text-3xl">Inventory</h1>
          <p className="mt-1 text-sm text-neutral-500">Stock drops automatically when a payment is confirmed. Restock here any time.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm">
          <Wallet className="h-4 w-4 text-brand-600" />
          <span className="text-neutral-500">Stock value</span>
          <span className="font-semibold">{formatNaira(summary.value)}</span>
        </div>
      </div>

      {sp.notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{sp.notice}</p>}
      {sp.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{c.label}</p>
              <c.icon className={`h-4 w-4 ${c.tone}`} />
            </div>
            <p className="mt-2 font-serif text-2xl sm:text-3xl">{c.value}</p>
          </div>
        ))}
      </div>

      {summary.out > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <PackageX className="h-5 w-5 shrink-0" />
          <p>
            <strong>{summary.out}</strong> product{summary.out === 1 ? " is" : "s are"} out of stock and hidden from shoppers&apos; “add to cart”. Restock to sell again.
          </p>
        </div>
      )}

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={f.key === "all" ? "/admin/inventory" : `/admin/inventory?filter=${f.key}`}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              filter === f.key ? "border-black bg-black text-white" : "border-neutral-300 bg-white hover:border-black"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {items.length === 0 && <p className="card p-8 text-center text-sm text-neutral-400">Nothing to show for this filter.</p>}
        {items.map(({ p, categoryName, status }) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images[0] || "/images/hero.jpg"} alt="" className="h-16 w-12 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <a href={`/admin/products/${p.id}/edit`} className="line-clamp-2 font-medium leading-snug">
                  {p.name}
                </a>
                <p className="text-xs text-neutral-500">
                  {categoryName ?? "Uncategorised"} {!p.active && "· Draft"}
                </p>
                <StatusBadge status={status} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
              <span>
                {p.soldCount} sold · updated {formatDate(p.updatedAt)}
              </span>
            </div>
            <AdminActionForm intent="setStock" className="mt-3 flex gap-2">
              <input type="hidden" name="id" value={p.id} />
              <input name="value" type="number" min={0} defaultValue={p.stock} className="input !py-2" aria-label="Stock quantity" />
              <button type="submit" className="btn-primary !py-2 !px-5 text-xs">
                Update
              </button>
            </AdminActionForm>
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3 text-right">Price</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3 text-center">Sold</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map(({ p, categoryName, status }) => (
                <tr key={p.id} className={`hover:bg-neutral-50 ${status === "out" ? "bg-red-50/40" : status === "low" ? "bg-amber-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.images[0] || "/images/hero.jpg"} alt="" className="h-11 w-9 rounded-md object-cover" />
                      <div>
                        <a href={`/admin/products/${p.id}/edit`} className="font-medium hover:text-brand-600">
                          {p.name}
                        </a>
                        {!p.active && <span className="ml-2 text-[10px] font-semibold uppercase text-neutral-400">Draft</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-neutral-600">{categoryName ?? "—"}</td>
                  <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">{formatNaira(p.discountPrice ?? p.price)}</td>
                  <td className="px-3 py-3">
                    <AdminActionForm intent="setStock" className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="value"
                        type="number"
                        min={0}
                        defaultValue={p.stock}
                        className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
                        aria-label={`Stock for ${p.name}`}
                      />
                      <button type="submit" className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-black hover:text-white">
                        Save
                      </button>
                    </AdminActionForm>
                  </td>
                  <td className="px-3 py-3 text-center">{p.soldCount}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-3 py-3 text-xs text-neutral-500 whitespace-nowrap">{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-neutral-400">
                    Nothing to show for this filter.
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

function StatusBadge({ status }: { status: "in" | "low" | "out" }) {
  if (status === "out") return <span className="inline-flex rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white">Out of stock</span>;
  if (status === "low") return <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">Low stock</span>;
  return <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">In stock</span>;
}
