import Link from "next/link";
import { ArrowRight, Truck, ShieldCheck, RefreshCcw, Headphones } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { listProducts, getAllCategories } from "@/lib/queries";
import { ProductCard } from "@/components/store/product-card";
import { ShareButton } from "@/components/store/share-buttons";
import { HeroCarousel, type HeroSlide } from "@/components/store/hero-carousel";
import { BrandMark } from "@/components/brand";
import { CategoryStrip } from "@/components/store/category-strip";
import { FlashSale } from "@/components/store/flash-sale";
import { formatNaira, whatsappLink, effectivePrice, discountPercent } from "@/lib/utils";

export default async function HomePage() {
  const s = await getSettings();
  const [cats, newArrivals, bestSellers, deals, featured] = await Promise.all([
    getAllCategories(),
    listProducts({ sort: "newest", limit: 12 }),
    listProducts({ bestSeller: true, sort: "popular", limit: 12 }),
    listProducts({ deals: true, sort: "popular", limit: 12 }),
    listProducts({ featured: true, limit: 6 }),
  ]);

  // Best sellers: products flagged by the admin, falling back to top sellers by units sold
  const bestList = bestSellers.items.length ? bestSellers : await listProducts({ sort: "popular", limit: 12 });
  const featuredPick = featured.items[0];
  const maxDiscount = deals.items.reduce((m, p) => Math.max(m, discountPercent(p)), 0);

  // Hero slides are built from real store data
  const slides: HeroSlide[] = [
    {
      id: "new-season",
      eyebrow: "New season",
      title: "Dress like the man you're becoming",
      subtitle: s.store_tagline,
      image: "/images/hero.jpg",
      href: "/shop?sort=newest",
      cta: "Shop new arrivals",
    },
  ];
  if (deals.items[0] && maxDiscount > 0) {
    slides.push({
      id: "deals",
      eyebrow: "Special offers",
      title: `Save up to ${maxDiscount}% today`,
      subtitle: "Discounted jeans, tees, shoes and more — while stocks last.",
      image: deals.items[0].images[0] || "/images/hero.jpg",
      href: "/shop?deals=1",
      cta: "Grab the deals",
    });
  }
  if (featuredPick) {
    slides.push({
      id: `featured-${featuredPick.id}`,
      eyebrow: "Featured pick",
      title: featuredPick.name,
      subtitle: `${formatNaira(effectivePrice(featuredPick))} · Secure checkout with Paystack`,
      image: featuredPick.images[0] || "/images/hero.jpg",
      href: `/product/${featuredPick.slug}`,
      cta: "Shop this piece",
    });
  }
  const nativeCat = cats.find((c) => c.slug === "native-wear" && c.image);
  if (nativeCat?.image) {
    slides.push({
      id: "native",
      eyebrow: "Native & Senator",
      title: "Owambe-ready outfits",
      subtitle: "Tailored senators, kaftans and agbada. Custom sizing on request.",
      image: nativeCat.image,
      href: "/shop?category=native-wear",
      cta: "Shop native wear",
    });
  }

  // Side promo tiles: two categories that have photos
  const sideCats = [...cats.filter((c) => c.image && ["jeans", "shoes-sneakers", "t-shirts", "accessories"].includes(c.slug))]
    .slice(0, 2);
  if (sideCats.length < 2) sideCats.push(...cats.filter((c) => c.image && !sideCats.includes(c)).slice(0, 2 - sideCats.length));

  const departments = cats.filter((c) => c.image).slice(0, 6);

  return (
    <div className="pb-10">
      {/* Hero banner + side tiles */}
      <section className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
          <HeroCarousel slides={slides} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:grid-rows-2">
            {sideCats.map((c) => (
              <Link key={c.id} href={`/shop?category=${c.slug}`} className="group relative h-40 overflow-hidden rounded-xl bg-ink sm:h-48 lg:h-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image!} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950/85 via-brand-950/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="font-serif text-lg leading-tight text-white sm:text-xl">{c.name}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-accent-300">
                    Shop now <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Category icons */}
      <section className="mx-auto mt-3 max-w-7xl px-3 sm:mt-4 sm:px-6">
        <CategoryStrip categories={cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, image: c.image }))} />
      </section>

      {/* Brand statement */}
      <section className="relative mt-6 overflow-hidden bg-ink text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, #ffc90f 0 2px, transparent 2px 16px)" }}
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 py-14 text-center sm:py-16">
          <BrandMark name={s.store_name} size="lg" tone="on-dark" />
          <p className="max-w-xl text-sm leading-relaxed text-neutral-400 sm:text-base">{s.store_tagline}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/shop" className="btn-gold">Shop the collection</Link>
            <ShareButton
              title={s.store_name}
              text={`Check out ${s.store_name} — premium men's fashion delivered across Nigeria.`}
              path="/"
              image="/images/hero.jpg"
              label="Share store"
            />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto mt-3 max-w-7xl px-3 sm:px-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: Truck, t: "Nationwide delivery", d: s.free_delivery_threshold && Number(s.free_delivery_threshold) > 0 ? `Free above ${formatNaira(Number(s.free_delivery_threshold))}` : "Fast, reliable delivery" },
            { icon: ShieldCheck, t: "Secure payments", d: "Cards, transfer & USSD" },
            { icon: RefreshCcw, t: "Easy exchanges", d: "7-day size exchange" },
            { icon: Headphones, t: "WhatsApp support", d: "Chat with our team" },
          ].map((f) => (
            <div key={f.t} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-neutral-200">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-neutral-900 sm:text-sm">{f.t}</p>
                <p className="truncate text-[11px] text-neutral-500">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Flash sales */}
      {deals.items.length > 0 && (
        <section className="mx-auto mt-6 max-w-7xl px-3 sm:px-6">
          <FlashSale products={deals.items} />
        </section>
      )}

      {/* New arrivals */}
      <section className="mx-auto mt-10 max-w-7xl px-3 sm:px-6">
        <SectionHeader eyebrow="Just landed" title="New arrivals" href="/shop?sort=newest" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {newArrivals.items.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
        {newArrivals.items.length === 0 && <EmptyNote text="New products will appear here as soon as they are published." />}
      </section>

      {/* Collection banner */}
      {featuredPick && (
        <section className="mx-auto mt-10 max-w-7xl px-3 sm:px-6">
          <div className="grid overflow-hidden rounded-xl bg-brand-600 text-white md:grid-cols-2">
            <div className="relative aspect-[4/3] md:aspect-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={featuredPick.images[0] || "/images/hero.jpg"} alt="" loading="lazy" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <p className="inline-block w-fit rounded-md bg-accent-400 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-black">Featured collection</p>
              <h3 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl">The Native &amp; Senator Edit</h3>
              <p className="mt-4 max-w-md text-sm text-brand-100 sm:text-base">
                Tailored senators, kaftans and agbada in premium fabrics with hand-finished detail. Custom sizing available on request.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/shop?category=native-wear" className="btn-gold">Shop native wear</Link>
                <a
                  href={whatsappLink(s.whatsapp_number, "Hello, I'd like to order a custom-sized native outfit.")}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-white/50 px-6 py-3 text-sm font-semibold transition hover:bg-white hover:text-brand-700"
                >
                  Request custom size
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Shop by department */}
      {departments.length > 0 && (
        <section className="mx-auto mt-10 max-w-7xl px-3 sm:px-6">
          <SectionHeader eyebrow="Browse" title="Shop by department" href="/shop" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            {departments.map((c) => (
              <Link key={c.id} href={`/shop?category=${c.slug}`} className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-neutral-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image!} alt={c.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <p className="absolute inset-x-3 bottom-3 font-serif text-base leading-tight text-white sm:text-lg">{c.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Best sellers */}
      <section className="mx-auto mt-10 max-w-7xl px-3 sm:px-6">
        <SectionHeader eyebrow="Customer favourites" title="Best sellers" href="/shop?sort=popular" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {bestList.items.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
        {bestList.items.length === 0 && <EmptyNote text="Best sellers appear here once products start selling." />}
      </section>

      {/* Featured pieces */}
      {featured.items.length > 1 && (
        <section className="mx-auto mt-10 max-w-7xl px-3 sm:px-6">
          <SectionHeader eyebrow="Hand-picked" title="Featured pieces" href="/shop?sort=newest" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            {featured.items.slice(0, 6).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Share store CTA */}
      <section className="mx-auto mt-12 max-w-7xl px-3 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-5 rounded-xl border border-accent-300 bg-accent-50 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl">Love what you see? Share {s.store_name}.</h3>
            <p className="mt-1 text-sm text-neutral-600">Send our store to a friend on WhatsApp, Instagram or Facebook.</p>
          </div>
          <ShareButton
            title={s.store_name}
            text={`Check out ${s.store_name} — premium men's fashion delivered across Nigeria.`}
            path="/"
            image="/images/hero.jpg"
            label="Share store"
          />
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ eyebrow, title, href }: { eyebrow: string; title: string; href: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-3">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 font-serif text-2xl text-neutral-900 sm:text-3xl">{title}</h2>
      </div>
      <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-bold text-brand-600 transition hover:text-brand-800">
        See all <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="mt-6 rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">{text}</p>;
}
