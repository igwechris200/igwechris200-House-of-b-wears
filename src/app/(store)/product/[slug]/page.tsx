import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, listProducts } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { ProductCard } from "@/components/store/product-card";
import { ProductDetail } from "./product-detail";
import { effectivePrice, formatNaira } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const row = await getProductBySlug(slug);
  if (!row) return { title: "Product not found" };
  const p = row.product;
  const price = formatNaira(effectivePrice(p));
  return {
    title: p.name,
    description: `${p.name} — ${price}. ${p.description.slice(0, 140)}`,
    openGraph: {
      title: `${p.name} — ${price}`,
      description: p.description.slice(0, 200),
      images: p.images.slice(0, 1),
      type: "website",
    },
    twitter: { card: "summary_large_image", title: `${p.name} — ${price}`, images: p.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const row = await getProductBySlug(slug);
  if (!row) notFound();
  const s = await getSettings();
  const related = await listProducts({ category: row.categorySlug ?? undefined, limit: 5 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <nav className="text-xs text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>
        <Link href="/shop" className="hover:text-black">Shop</Link>
        {row.categoryName && (<><span className="mx-1">/</span><Link href={`/shop?category=${row.categorySlug}`} className="hover:text-black">{row.categoryName}</Link></>)}
        <span className="mx-1">/</span><span className="text-black">{row.product.name}</span>
      </nav>
      <ProductDetail
        product={{
          id: row.product.id,
          name: row.product.name,
          slug: row.product.slug,
          description: row.product.description,
          price: row.product.price,
          discountPrice: row.product.discountPrice,
          images: row.product.images,
          sizes: row.product.sizes,
          colors: row.product.colors,
          stock: row.product.stock,
          categoryName: row.categoryName,
          soldCount: row.product.soldCount,
        }}
        whatsapp={s.whatsapp_number}
        storeName={s.store_name}
      />
      {related.items.filter((p) => p.id !== row.product.id).length > 0 && (
        <section className="mt-20">
          <p className="eyebrow">You may also like</p>
          <h2 className="mt-2 font-serif text-3xl">Complete the look</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.items.filter((p) => p.id !== row.product.id).slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}
