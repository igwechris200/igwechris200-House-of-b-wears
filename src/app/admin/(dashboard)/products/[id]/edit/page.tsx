import { notFound } from "next/navigation";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Edit Product" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, cats] = await Promise.all([
    db.select().from(products).where(eq(products.id, Number(id))).limit(1),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(categories.sortOrder),
  ]);
  if (!p[0]) notFound();
  const product = p[0];
  return (
    <div className="space-y-6">
      <a href="/admin/products" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-black">
        <ArrowLeft className="h-4 w-4" /> All products
      </a>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="mt-1 font-serif text-3xl">Edit product</h1>
        </div>
        <a href={`/product/${product.slug}`} className="btn-outline !py-2 text-xs">
          <ExternalLink className="h-3.5 w-3.5" /> View in store
        </a>
      </div>
      <ProductForm product={product} categories={cats} />
    </div>
  );
}
