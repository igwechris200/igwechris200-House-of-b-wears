"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { ProductCard, type ProductCardData } from "@/components/store/product-card";

export default function WishlistPage() {
  const { wishlist, hydrated } = useCart();
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (wishlist.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    fetch(`/api/products?ids=${wishlist.join(",")}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, [wishlist, hydrated]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="eyebrow">Saved items</p>
      <h1 className="mt-2 font-serif text-3xl sm:text-4xl">Your wishlist</h1>
      {loading ? (
        <p className="py-20 text-center text-sm text-neutral-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="py-20 text-center">
          <Heart className="mx-auto h-12 w-12 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">Nothing saved yet. Tap the heart on any product to save it here.</p>
          <Link href="/shop" className="btn-primary mt-6">Browse products</Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
