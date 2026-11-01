"use client";

import { useState } from "react";
import { Trash2, Eye } from "lucide-react";
import { ImageUploader } from "./image-uploader";
import { VariantPicker } from "./variant-picker";
import { Switch } from "./switch";
import { postAdminAction } from "./admin-action-form";
import { formatNaira } from "@/lib/utils";

export type FormProduct = {
  id?: number;
  name: string;
  description: string;
  price: number;
  discountPrice: number | null;
  categoryId: number | null;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  featured: boolean;
  bestSeller: boolean;
  isNewArrival: boolean;
  active: boolean;
};

export const SIZE_OPTIONS = ["S", "M", "L", "XL", "XXL", "Custom"];

export const COLOR_SWATCHES: Record<string, string> = {
  Black: "#0a0a0a",
  White: "#ffffff",
  Navy: "#1e2a44",
  Grey: "#8a8a8a",
  Charcoal: "#36454f",
  Brown: "#6b4226",
  Tan: "#d2b48c",
  Beige: "#e8dcc4",
  Cream: "#fffdd0",
  Khaki: "#c3b091",
  Blue: "#2563eb",
  "Sky Blue": "#87ceeb",
  Olive: "#6b7d3a",
  Green: "#166534",
  Maroon: "#6d1f2b",
  Burgundy: "#800020",
  Red: "#b91c1c",
  Gold: "#c19a2e",
};

export function ProductForm({ product, categories }: { product?: FormProduct; categories: { id: number; name: string }[] }) {
  const isEdit = Boolean(product?.id);
  const [price, setPrice] = useState<number | "">(product?.price ?? "");
  const [discount, setDiscount] = useState<number | "">(product?.discountPrice ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const priceNum = Number(price) || 0;
  const discountNum = Number(discount) || 0;
  const onSale = discountNum > 0 && discountNum < priceNum;
  const pct = onSale ? Math.round(((priceNum - discountNum) / priceNum) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(undefined);
    setSuccess(undefined);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await postAdminAction(fd);
    if (!res.ok) {
      setError(res.error);
      setPending(false);
      return;
    }
    if (res.redirectTo) {
      window.location.assign(res.redirectTo);
      return;
    }
    setSuccess(res.message || "Product updated");
    setPending(false);
  };

  const handleDelete = async () => {
    if (!product?.id) return;
    if (!window.confirm(`Delete “${name || product.name}” permanently?`)) return;
    setPending(true);
    const fd = new FormData();
    fd.set("intent", "deleteProduct");
    fd.set("id", String(product.id));
    const res = await postAdminAction(fd);
    if (!res.ok) {
      setError(res.error);
      setPending(false);
      return;
    }
    window.location.assign(res.redirectTo || "/admin/products");
  };

  return (
    <form action="/api/admin/action" method="POST" onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <input type="hidden" name="intent" value={isEdit ? "updateProduct" : "createProduct"} />
      {product?.id && <input type="hidden" name="id" value={product.id} />}

      <div className="min-w-0 space-y-6">
        {/* Basics */}
        <section className="card p-5 sm:p-6">
          <h2 className="font-serif text-xl">1. Product details</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Product name</label>
              <input name="name" required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Midnight Slim-Fit Jeans" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea name="description" rows={5} defaultValue={product?.description} className="input" placeholder="Fabric, fit, care and styling notes…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Category</label>
                <select name="categoryId" defaultValue={product?.categoryId ?? ""} className="input">
                  <option value="">Uncategorised</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Quantity in stock</label>
                <input name="stock" type="number" min={0} step={1} required defaultValue={product?.stock ?? 10} className="input" />
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="card p-5 sm:p-6">
          <h2 className="font-serif text-xl">2. Pricing (₦ Naira)</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Selling price (₦)</label>
              <input name="price" type="number" min={1} step={1} required value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} className="input" placeholder="25000" />
            </div>
            <div>
              <label className="label">Discount price (₦) — optional</label>
              <input name="discountPrice" type="number" min={1} step={1} value={discount} onChange={(e) => setDiscount(e.target.value === "" ? "" : Number(e.target.value))} className="input" placeholder="Leave empty for no discount" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-neutral-50 p-4 text-sm">
            <Eye className="h-4 w-4 text-neutral-400" />
            <span className="text-neutral-500">Shoppers will see</span>
            <span className="font-semibold">{formatNaira(onSale ? discountNum : priceNum)}</span>
            {onSale && (
              <>
                <span className="text-neutral-400 line-through">{formatNaira(priceNum)}</span>
                <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">-{pct}% OFF</span>
              </>
            )}
          </div>
        </section>

        {/* Photos */}
        <section className="card p-5 sm:p-6">
          <h2 className="font-serif text-xl">3. Product photographs</h2>
          <p className="mt-1 text-xs text-neutral-500">The first photo is the main image. Add several angles — reorder with the arrows.</p>
          <div className="mt-5">
            <ImageUploader name="images" initial={product?.images ?? []} label="Photos" />
          </div>
        </section>

        {/* Variants */}
        <section className="card space-y-6 p-5 sm:p-6">
          <h2 className="font-serif text-xl">4. Sizes &amp; colours</h2>
          <VariantPicker
            name="sizes"
            label="Available sizes"
            options={SIZE_OPTIONS}
            initial={product?.sizes ?? []}
            placeholder="Other size, e.g. 3XL or 34"
            hint="Tap the sizes you stock."
          />
          <VariantPicker
            name="colors"
            label="Available colours"
            options={Object.keys(COLOR_SWATCHES)}
            swatches={COLOR_SWATCHES}
            initial={product?.colors ?? []}
            placeholder="Other colour, e.g. Mint"
          />
        </section>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-24 xl:h-fit">
        <section className="card space-y-3 p-5 sm:p-6">
          <h2 className="font-serif text-xl">Visibility &amp; badges</h2>
          <Switch name="active" label="Published" hint="Live on the store. Off = saved as a draft." defaultChecked={product?.active ?? true} />
          <Switch name="featured" label="Featured" hint="Appears in the Featured section on the homepage." defaultChecked={product?.featured ?? false} />
          <Switch name="bestSeller" label="Best seller" hint="Appears in the Best Sellers section." defaultChecked={product?.bestSeller ?? false} />
          <Switch name="isNewArrival" label="New arrival badge" hint="Shows a “New” tag on the product card." defaultChecked={product?.isNewArrival ?? true} />
        </section>

        <section className="card p-5 sm:p-6">
          {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {success && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
          <button type="submit" disabled={pending} className="btn-primary w-full !py-3.5">
            {pending ? "Saving…" : isEdit ? "Save changes" : "Publish product"}
          </button>
          <a href="/admin/products" className="mt-2 block text-center text-sm text-neutral-500 hover:text-black hover:underline">
            Back to products
          </a>
          {!isEdit && <p className="mt-3 text-center text-[11px] text-neutral-400">Tip: untick “Published” to save as a draft.</p>}
        </section>

        {isEdit && (
          <section className="card border-red-200 p-5 sm:p-6">
            <h2 className="font-serif text-lg text-red-700">Delete product</h2>
            <p className="mt-1 text-xs text-neutral-500">Removes it from the store permanently. Past orders keep their records.</p>
            <button
              type="button"
              disabled={pending}
              onClick={handleDelete}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Delete product
            </button>
          </section>
        )}
      </aside>
    </form>
  );
}
