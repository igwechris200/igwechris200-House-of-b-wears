import { getAdminCategories } from "@/lib/admin-queries";
import { CategoryManager } from "./category-manager";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const rows = await getAdminCategories();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Catalogue</p>
        <h1 className="mt-1 font-serif text-3xl">Categories</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Create, rename and upload images for categories. Hidden categories disappear from the store menu, shop and homepage.
          Assign products to a category from the product form.
        </p>
      </div>
      <CategoryManager categories={rows} />
    </div>
  );
}
