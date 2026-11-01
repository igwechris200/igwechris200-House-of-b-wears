import Link from "next/link";

type Cat = { id: number; name: string; slug: string; image: string | null };

/** Round category icons row, like the top category bar on large marketplaces. */
export function CategoryStrip({ categories }: { categories: Cat[] }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-5">
      <div className="no-scrollbar flex gap-4 overflow-x-auto sm:grid sm:grid-cols-6 sm:overflow-visible lg:grid-cols-12 sm:gap-x-3 sm:gap-y-5">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/shop?category=${c.slug}`}
            className="group flex w-20 shrink-0 flex-col items-center gap-2 text-center sm:w-auto"
          >
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-50 ring-2 ring-transparent transition group-hover:ring-accent-400 sm:h-[72px] sm:w-[72px]">
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
              ) : (
                <span className="font-serif text-xl font-bold text-brand-600">{c.name.charAt(0)}</span>
              )}
            </span>
            <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-neutral-800 transition group-hover:text-brand-600 sm:text-xs">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
