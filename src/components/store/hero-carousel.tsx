"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  cta: string;
};

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = () => setIndex((i) => (i - 1 + count) % count);

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setInterval(next, 5500);
    return () => clearInterval(t);
  }, [count, paused, next]);

  if (count === 0) return null;

  return (
    <div
      className="group relative h-[360px] overflow-hidden rounded-xl bg-ink sm:h-[420px] lg:h-full lg:min-h-[400px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-hidden={i !== index}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.image}
            alt=""
            className={`h-full w-full object-cover transition-transform duration-[6000ms] ease-out ${i === index ? "scale-105" : "scale-100"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/90 via-brand-950/55 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14">
            <div className={`max-w-lg ${i === index ? "animate-slide-in" : ""}`}>
              <p className="inline-block rounded-md bg-accent-400 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.15em] text-black">
                {s.eyebrow}
              </p>
              <h2 className="mt-4 font-serif text-3xl leading-[1.1] text-white sm:text-5xl">{s.title}</h2>
              <p className="mt-3 max-w-md text-sm text-brand-100 sm:text-base">{s.subtitle}</p>
              <Link href={s.href} className="btn-gold mt-6">
                {s.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ))}

      {count > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow transition hover:bg-white sm:flex sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow transition hover:bg-white sm:flex sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-7 bg-accent-400" : "w-1.5 bg-white/60 hover:bg-white"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
