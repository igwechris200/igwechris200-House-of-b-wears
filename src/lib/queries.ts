import "server-only";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { and, asc, desc, eq, gt, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import type { ProductCardData } from "@/components/store/product-card";

export type ShopFilters = {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "popular";
  deals?: boolean;
  featured?: boolean;
  bestSeller?: boolean;
  limit?: number;
  offset?: number;
};

const cardSelect = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  price: products.price,
  discountPrice: products.discountPrice,
  images: products.images,
  stock: products.stock,
  sizes: products.sizes,
  colors: products.colors,
  isNewArrival: products.isNewArrival,
  categoryName: categories.name,
};

export async function listProducts(f: ShopFilters = {}): Promise<{ items: ProductCardData[]; total: number }> {
  const conds: SQL[] = [eq(products.active, true)];
  // Products in a hidden category are not shown on the storefront
  conds.push(or(isNull(products.categoryId), eq(categories.active, true))!);
  if (f.q) {
    const term = `%${f.q}%`;
    conds.push(or(ilike(products.name, term), ilike(products.description, term), ilike(categories.name, term))!);
  }
  if (f.category) conds.push(eq(categories.slug, f.category));
  const priceExpr = sql<number>`coalesce(nullif(${products.discountPrice}, 0), ${products.price})`;
  if (f.minPrice != null) conds.push(sql`${priceExpr} >= ${f.minPrice}`);
  if (f.maxPrice != null) conds.push(sql`${priceExpr} <= ${f.maxPrice}`);
  if (f.size) conds.push(sql`${products.sizes} @> ${JSON.stringify([f.size])}::jsonb`);
  if (f.color) conds.push(sql`${products.colors} @> ${JSON.stringify([f.color])}::jsonb`);
  if (f.deals) conds.push(and(sql`${products.discountPrice} is not null`, gt(products.discountPrice, 0), sql`${products.discountPrice} < ${products.price}`)!);
  if (f.featured) conds.push(eq(products.featured, true));
  if (f.bestSeller) conds.push(eq(products.bestSeller, true));

  const where = and(...conds);
  let order;
  switch (f.sort) {
    case "price_asc":
      order = [asc(priceExpr)];
      break;
    case "price_desc":
      order = [desc(priceExpr)];
      break;
    case "popular":
      order = [desc(products.bestSeller), desc(products.soldCount), desc(products.createdAt)];
      break;
    default:
      order = [desc(products.createdAt)];
  }

  const [items, countRows] = await Promise.all([
    db
      .select(cardSelect)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(...order)
      .limit(f.limit ?? 60)
      .offset(f.offset ?? 0),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where),
  ]);
  return { items, total: countRows[0]?.count ?? 0 };
}

export async function getProductBySlug(slug: string) {
  const rows = await db
    .select({ product: products, categoryName: categories.name, categorySlug: categories.slug })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.active, true), or(isNull(products.categoryId), eq(categories.active, true))))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProductsByIds(ids: number[]): Promise<ProductCardData[]> {
  if (!ids.length) return [];
  return db
    .select(cardSelect)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.active, true), inArray(products.id, ids)));
}

export async function getAllCategories() {
  return db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getFilterOptions() {
  const rows = await db
    .select({ sizes: products.sizes, colors: products.colors, price: products.price })
    .from(products)
    .where(eq(products.active, true));
  const sizes = new Set<string>();
  const colors = new Set<string>();
  let max = 0;
  for (const r of rows) {
    r.sizes.forEach((s) => sizes.add(s));
    r.colors.forEach((c) => colors.add(c));
    max = Math.max(max, r.price);
  }
  const sizeOrder = ["S", "M", "L", "XL", "XXL", "XXXL"];
  return {
    sizes: [...sizes].sort((a, b) => {
      const ia = sizeOrder.indexOf(a), ib = sizeOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    }),
    colors: [...colors].sort(),
    maxPrice: max,
  };
}
