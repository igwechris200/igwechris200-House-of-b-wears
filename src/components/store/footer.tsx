import Link from "next/link";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { InstagramIcon as Instagram, FacebookIcon as Facebook, XIcon as Twitter } from "@/components/icons";
import { getSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/utils";
import { NewsletterForm } from "./newsletter-form";
import { ShareStoreButton } from "./share-buttons";
import { BrandMark } from "@/components/brand";

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="mt-20 bg-ink text-neutral-300">
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow">Newsletter</p>
            <h3 className="mt-2 font-serif text-3xl text-white">Join the inner circle</h3>
            <p className="mt-2 text-sm text-neutral-400">
              Be the first to know about new drops, private sales and exclusive offers.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandMark name={s.store_name} size="lg" tone="on-dark" className="justify-start" />
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">{s.store_description || s.store_tagline}</p>
          <div className="mt-5 flex items-center gap-3">
            {s.instagram_url && (
              <a href={s.instagram_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 p-2.5 transition hover:border-brand-500 hover:text-brand-400" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {s.facebook_url && (
              <a href={s.facebook_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 p-2.5 transition hover:border-brand-500 hover:text-brand-400" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
            )}
            {s.twitter_url && (
              <a href={s.twitter_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 p-2.5 transition hover:border-brand-500 hover:text-brand-400" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
            )}
            {s.whatsapp_number && (
              <a href={whatsappLink(s.whatsapp_number)} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 p-2.5 transition hover:border-brand-500 hover:text-brand-400" aria-label="WhatsApp">
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="mt-5">
            <ShareStoreButton storeName={s.store_name} />
          </div>
        </div>
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">Shop</h5>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/shop" className="transition hover:text-white">All Products</Link></li>
            <li><Link href="/shop?sort=newest" className="transition hover:text-white">New Arrivals</Link></li>
            <li><Link href="/shop?sort=popular" className="transition hover:text-white">Best Sellers</Link></li>
            <li><Link href="/shop?deals=1" className="transition hover:text-white">Special Offers</Link></li>
            <li><Link href="/shop?category=native-wear" className="transition hover:text-white">Native Wear</Link></li>
            <li><Link href="/shop?category=shoes-sneakers" className="transition hover:text-white">Shoes &amp; Sneakers</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">Customer Care</h5>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><a href="/account" className="transition hover:text-white">My Account</a></li>
            <li><Link href="/track" className="transition hover:text-white">Track Your Order</Link></li>
            <li><Link href="/wishlist" className="transition hover:text-white">Wishlist</Link></li>
            <li><Link href="/cart" className="transition hover:text-white">Shopping Cart</Link></li>
            <li><Link href="/delivery" className="transition hover:text-white">Delivery &amp; Returns</Link></li>
            <li><a href="/admin/login" className="transition hover:text-white">Store Admin</a></li>
          </ul>
        </div>
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">Contact</h5>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />{s.address}</li>
            <li className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /><a href={`tel:${s.contact_phone}`} className="hover:text-white">{s.contact_phone}</a></li>
            <li className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /><a href={`mailto:${s.contact_email}`} className="hover:text-white">{s.contact_email}</a></li>
            <li className="flex gap-3"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /><a href={whatsappLink(s.whatsapp_number)} target="_blank" rel="noreferrer" className="hover:text-white">Chat on WhatsApp</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-neutral-500 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {s.store_name}. All rights reserved.</p>
          <p className="flex items-center gap-2">
            Secure payments powered by <span className="font-semibold text-neutral-300">Paystack</span> · Cards · Bank Transfer · USSD
          </p>
        </div>
      </div>
    </footer>
  );
}
