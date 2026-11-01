"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  key: string;
  productId: number;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string | null;
  color: string | null;
  quantity: number;
  maxStock: number;
};

type Toast = { id: number; message: string; type: "success" | "error" | "info" };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "key">) => void;
  updateQuantity: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  wishlist: number[];
  toggleWishlist: (productId: number) => void;
  inWishlist: (productId: number) => boolean;
  toast: (message: string, type?: Toast["type"]) => void;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_KEY = "mf_cart_v1";
const WISH_KEY = "mf_wishlist_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem(CART_KEY);
      if (c) setItems(JSON.parse(c));
      const w = localStorage.getItem(WISH_KEY);
      if (w) setWishlist(JSON.parse(w));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist, hydrated]);

  const toast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "key">) => {
      const key = `${item.productId}|${item.size ?? ""}|${item.color ?? ""}`;
      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          const qty = Math.min(existing.quantity + item.quantity, item.maxStock);
          return prev.map((i) => (i.key === key ? { ...i, quantity: qty } : i));
        }
        return [...prev, { ...item, key, quantity: Math.min(item.quantity, item.maxStock) }];
      });
      toast(`${item.name} added to cart`);
    },
    [toast],
  );

  const updateQuantity = useCallback((key: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: Math.max(1, Math.min(qty, i.maxStock)) } : i))
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const toggleWishlist = useCallback(
    (productId: number) => {
      setWishlist((prev) => {
        const has = prev.includes(productId);
        toast(has ? "Removed from wishlist" : "Saved to wishlist", "info");
        return has ? prev.filter((id) => id !== productId) : [...prev, productId];
      });
    },
    [toast],
  );

  const inWishlist = useCallback((id: number) => wishlist.includes(id), [wishlist]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      wishlist,
      toggleWishlist,
      inWishlist,
      toast,
      hydrated,
    }),
    [items, addItem, updateQuantity, removeItem, clearCart, wishlist, toggleWishlist, inWishlist, toast, hydrated],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-up pointer-events-auto rounded-full px-5 py-3 text-sm font-medium shadow-xl ${
              t.type === "error"
                ? "bg-red-600 text-white"
                : t.type === "info"
                  ? "bg-neutral-800 text-white"
                  : "bg-black text-brand-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
