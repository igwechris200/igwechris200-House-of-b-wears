"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/store/logo";
import {
  LayoutDashboard,
  Package,
  Plus,
  Tags,
  ShoppingCart,
  CreditCard,
  Users,
  Boxes,
  TrendingUp,
  Settings,
  Ticket,
  LogOut,
  Menu,
  X,
  Store,
  type LucideIcon,
} from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: number; tone?: "gold" | "red" };

type Props = {
  storeName: string;
  logoUrl: string;
  logoDarkUrl?: string;
  adminName: string;
  adminEmail: string;
  pendingOrders: number;
  lowStock: number;
};

export function AdminSidebar({ storeName, logoUrl, logoDarkUrl, adminName, adminEmail, pendingOrders, lowStock }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items: Item[] = [
    { href: "/admin", label: "Dashboard Overview", icon: LayoutDashboard, exact: true },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/products/new", label: "Add New Product", icon: Plus, exact: true },
    { href: "/admin/categories", label: "Categories", icon: Tags },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart, badge: pendingOrders, tone: "gold" },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/admin/customers", label: "Customers", icon: Users },
    { href: "/admin/inventory", label: "Inventory", icon: Boxes, badge: lowStock, tone: "red" },
    { href: "/admin/reports", label: "Sales Reports", icon: TrendingUp },
    { href: "/admin/discounts", label: "Discount Codes", icon: Ticket },
    { href: "/admin/settings", label: "Store Settings", icon: Settings },
  ];

  const isActive = (it: Item) => {
    if (it.exact) return pathname === it.href;
    if (it.href === "/admin/products" && pathname === "/admin/products/new") return false;
    return pathname === it.href || pathname.startsWith(`${it.href}/`);
  };

  const brand = (
    <a href="/admin" className="flex items-center gap-3">
      <Logo name={storeName} logoUrl={logoUrl} logoDarkUrl={logoDarkUrl} dark imgClassName="h-11 w-auto object-contain" />
    </a>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-xl border border-neutral-200 p-2 hover:bg-neutral-50" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <a href="/admin" className="font-serif text-base">
          {storeName} <span className="text-xs font-sans font-semibold text-brand-600">Admin</span>
        </a>
        <a href="/" className="relative rounded-xl border border-neutral-200 p-2 hover:bg-neutral-50" aria-label="View storefront">
          {(pendingOrders > 0 || lowStock > 0) && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white" />}
          <Store className="h-5 w-5 text-neutral-600" />
        </a>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[86vw] flex-col bg-ink text-white shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          {brand}
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map((it) => {
            const active = isActive(it);
            return (
              <a
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" : "text-neutral-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <it.icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-neutral-400 group-hover:text-brand-300"}`} />
                <span className="truncate">{it.label}</span>
                {it.badge != null && it.badge > 0 && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      it.tone === "red" ? "bg-red-600 text-white" : active ? "bg-accent-400 text-black" : "bg-brand-500 text-white"
                    }`}
                  >
                    {it.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <div className="mb-2 rounded-xl bg-white/5 px-3 py-2.5">
            <p className="truncate text-sm font-medium">{adminName}</p>
            <p className="truncate text-xs text-neutral-400">{adminEmail}</p>
          </div>
          <a href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white">
            <Store className="h-4 w-4 text-neutral-400" /> View storefront
          </a>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-neutral-300 hover:bg-red-500/15 hover:text-red-300">
              <LogOut className="h-4 w-4 text-neutral-400" /> Logout
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
