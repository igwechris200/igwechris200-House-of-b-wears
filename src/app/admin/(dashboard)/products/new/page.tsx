import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Add New Product" };

export default async function NewProductPage() {
  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder));
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Catalogue</p>
        <h1 className="mt-1 font-serif text-3xl">Add new product</h1>
        <p className="mt-1 text-sm text-neutral-500">Fill in the four steps, then publish. It will appear on the store immediately.</p>
      </div>
      <ProductForm categories={cats} />
    </div>
  );
}
