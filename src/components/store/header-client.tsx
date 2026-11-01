"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  ChevronRight,
  LayoutDashboard,
  Truck,
  Package,
  HelpCircle,
} from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { Logo } from "./logo";

type Props = {
  storeName: string;
  logoUrl: string;
  logoDarkUrl?: string;
  topMessage: string;
  user: { name: string; role: string } | null;
  categories: { name: string; slug: string }[];
};

const NAV = [
  { label: "New Arrivals", href: "/shop?sort=newest" },
  { label: "Best Sellers", href: "/shop?sort=popular" },
  { label: "Special Offers", href: "/shop?deals=1" },
  { label: "Native Wear", href: "/shop?category=native-wear" },
];

export function HeaderClient({ storeName, logoUrl, logoDarkUrl, topMessage, user, categories }: Props) {
  const { count, wishlist, hydrated } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    setOpen(false);
  };

  const searchInput = (
    <form onSubmit={submitSearch} className="flex w-full items-stretch overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search jeans, senator, sneakers, belts…"
          aria-label="Search products"
          className="h-11 w-full bg-transparent pl-10 pr-3 text-sm text-black outline-none placeholder:text-neutral-400 sm:h-12"
        />
      </div>
      <button
        type="submit"
        className="flex h-11 shrink-0 items-center gap-2 bg-accent-400 px-4 text-sm font-bold text-black transition hover:bg-accent-500 sm:h-12 sm:px-6"
      >
        <Search className="h-4 w-4 sm:hidden" />
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );

  return (
    <header className={`sticky top-0 z-50 transition-shadow ${scrolled ? "shadow-lg" : ""}`}>
      {/* Utility bar */}
      <div className="hidden bg-brand-800 text-[12px] text-brand-100 lg:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6">
          <p className="flex items-center gap-2 font-medium">
            <Truck className="h-3.5 w-3.5 text-accent-300" />
            {topMessage || "Free delivery on qualifying orders · Pay securely with Paystack"}
          </p>
          <nav className="flex items-center gap-6">
            <Link href="/track" className="flex items-center gap-1.5 transition hover:text-white">
              <Package className="h-3.5 w-3.5" /> Track order
            </Link>
            <Link href="/delivery" className="flex items-center gap-1.5 transition hover:text-white">
              <HelpCircle className="h-3.5 w-3.5" /> Help &amp; returns
            </Link>
            <Link href="/wishlist" className="flex items-center gap-1.5 transition hover:text-white">
              <Heart className="h-3.5 w-3.5" /> Wishlist
            </Link>
            {user ? (
              <a href={user.role === "admin" ? "/admin" : "/account"} className="font-semibold text-white transition hover:text-accent-300">
                {user.role === "admin" ? "Admin dashboard" : `Hi, ${user.name.split(" ")[0]}`}
              </a>
            ) : (
              <a href="/login" className="font-semibold text-white transition hover:text-accent-300">
                Sign in / Register
              </a>
            )}
          </nav>
        </div>
      </div>

      {/* Main bar */}
      <div className="bg-brand-500">
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <div className="flex h-16 items-center gap-3 sm:gap-6 lg:h-[72px]">
            <button
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-lg p-2 text-white transition hover:bg-white/10 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="shrink-0">
              <Logo name={storeName} logoUrl={logoUrl} logoDarkUrl={logoDarkUrl} dark imgClassName="h-10 w-auto object-contain sm:h-11" />
            </div>

            <div className="hidden min-w-0 flex-1 lg:block">{searchInput}</div>

            <div className="ml-auto flex items-center gap-1 text-white sm:gap-3">
              <a
                href={user ? (user.role === "admin" ? "/admin" : "/account") : "/login"}
                className="flex items-center gap-2 rounded-lg p-2 transition hover:bg-white/10"
                aria-label="Account"
              >
                {user?.role === "admin" ? <LayoutDashboard className="h-5 w-5" /> : <User className="h-5 w-5" />}
                <span className="hidden text-left text-xs leading-tight xl:block">
                  <span className="block text-[11px] opacity-80">{user ? "Account" : "Hello, sign in"}</span>
                  <span className="font-bold">{user ? user.name.split(" ")[0] : "Account"}</span>
                </span>
              </a>
              <Link href="/wishlist" className="relative rounded-lg p-2 transition hover:bg-white/10 lg:hidden" aria-label="Wishlist">
                <Heart className="h-5 w-5" />
                {hydrated && wishlist.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-400 px-1 text-[10px] font-bold text-black">
                    {wishlist.length}
                  </span>
                )}
              </Link>
              <Link href="/cart" className="relative flex items-center gap-2 rounded-lg p-2 transition hover:bg-white/10" aria-label="Cart">
                <span className="relative">
                  <ShoppingCart className="h-6 w-6" />
                  {hydrated && count > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-400 px-1 text-[11px] font-bold text-black ring-2 ring-brand-500">
                      {count}
                    </span>
                  )}
                </span>
                <span className="hidden text-sm font-bold xl:block">Cart</span>
              </Link>
            </div>
          </div>
          <div className="pb-3 lg:hidden">{searchInput}</div>
        </div>
      </div>

      {/* Category row (desktop) */}
      <div className="hidden border-b border-neutral-200 bg-white lg:block">
        <nav className="no-scrollbar mx-auto flex max-w-7xl items-center gap-7 overflow-x-auto px-6 py-2.5 text-[13px] font-medium text-neutral-700">
          <Link href="/shop" className="flex shrink-0 items-center gap-1.5 font-bold text-brand-700 hover:text-brand-600">
            <Menu className="h-4 w-4" /> All categories
          </Link>
          {categories.slice(0, 9).map((c) => (
            <Link key={c.slug} href={`/shop?category=${c.slug}`} className="shrink-0 transition hover:text-brand-600">
              {c.name}
            </Link>
          ))}
          <span className="ml-auto flex shrink-0 items-center gap-6 border-l border-neutral-200 pl-6">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="shrink-0 font-semibold text-brand-700 transition hover:text-brand-600">
                {n.label}
              </Link>
            ))}
          </span>
        </nav>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex w-[85%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between bg-brand-500 p-4">
          <Logo name={storeName} logoUrl={logoUrl} logoDarkUrl={logoDarkUrl} dark imgClassName="h-10 w-auto object-contain sm:h-11" />
          <button onClick={() => setOpen(false)} className="rounded-full p-2 text-white hover:bg-white/10" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="eyebrow px-3">Shop</p>
          <div className="mt-2 space-y-0.5">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-3 text-base font-semibold hover:bg-brand-50">
                {n.label}
              </Link>
            ))}
          </div>
          <p className="eyebrow mt-6 px-3">Categories</p>
          <div className="mt-2 space-y-0.5">
            {categories.map((c) => (
              <Link key={c.slug} href={`/shop?category=${c.slug}`} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-neutral-700 hover:bg-brand-50">
                {c.name}
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              </Link>
            ))}
          </div>
          <div className="mt-6 space-y-1 border-t border-neutral-200 pt-4">
            <Link href="/wishlist" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-brand-50">Wishlist</Link>
            <Link href="/track" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-brand-50">Track order</Link>
            <Link href="/delivery" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-brand-50">Delivery &amp; returns</Link>
            {user ? (
              <a href={user.role === "admin" ? "/admin" : "/account"} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                {user.role === "admin" ? "Admin dashboard" : `My account (${user.name.split(" ")[0]})`}
              </a>
            ) : (
              <>
                <a href="/login" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Sign in</a>
                <a href="/register" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-brand-50">Create account</a>
              </>
            )}
          </div>
        </div>
      </aside>
    </header>
  );
}
