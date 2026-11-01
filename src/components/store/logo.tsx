import Link from "next/link";
import { BrandMark } from "@/components/brand";

/**
 * Store logo lockup. Falls back to the HOUSE OF B'WEARS brand mark when the
 * owner has not uploaded a custom logo in Store Settings.
 */
export function Logo({ name, logoUrl, dark = false }: { name: string; logoUrl?: string; dark?: boolean }) {
  return (
    <Link href="/" aria-label={`${name} — home`} className="flex items-center">
      {logoUrl ? (
        <span className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={name} className="h-9 w-auto object-contain sm:h-10" />
          <span
            className={`font-display text-lg font-bold tracking-tight sm:text-xl ${
              dark ? "text-white" : "text-brand-950"
            }`}
          >
            {name}
          </span>
        </span>
      ) : (
        <BrandMark name={name} size="sm" tone={dark ? "on-dark" : "on-light"} />
      )}
    </Link>
  );
}
