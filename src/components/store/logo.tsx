import Link from "next/link";

/**
 * Brand wordmark for HOUSE B'WEARS.
 * Renders the uploaded logo when available (light/dark variants), otherwise a
 * distinctive two-line typographic wordmark: small-caps "HOUSE" + big italic serif "B'WEARS".
 */
export function Logo({
  name,
  logoUrl,
  logoDarkUrl,
  dark = false,
  href = "/",
  imgClassName = "h-10 w-auto object-contain sm:h-11",
}: {
  name: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  dark?: boolean;
  href?: string;
  imgClassName?: string;
}) {
  const src = dark ? logoDarkUrl || logoUrl : logoUrl;
  const parts = name.trim().split(/\s+/);
  // Last word becomes the big serif line, the preceding words the small-caps line
  // e.g. "HOUSE OF" (small caps) + "B'WEARS" (big italic serif)
  const first = parts.slice(0, -1).join(" ") || name;
  const rest = parts[parts.length - 1] || name;

  if (src) {
    return (
      <Link href={href} aria-label={`${name} home`} className="inline-flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className={imgClassName} />
      </Link>
    );
  }

  return (
    <Link href={href} aria-label={`${name} home`} className="inline-flex items-end gap-1.5 leading-none">
      <span className={`pb-0.5 text-[9px] font-extrabold uppercase tracking-[0.35em] sm:text-[10px] ${dark ? "text-accent-300" : "text-brand-600"}`}>
        {first}
      </span>
      <span className={`font-serif text-xl font-bold italic tracking-tight sm:text-2xl ${dark ? "text-white" : "text-brand-800"}`}>
        {rest}
        <span className="text-accent-500">.</span>
      </span>
    </Link>
  );
}
