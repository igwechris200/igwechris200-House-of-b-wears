import { useId } from "react";

/**
 * HOUSE OF B'WEARS brand identity.
 *
 * Mark: a house-shaped badge (a boutique doorway / rooftop) with a gold
 * clothes hanger hanging from the ridge — the "house of menswear".
 *
 * Lockup: every word of the business name except the last is set as a small
 * tracked eyebrow, and the last word becomes the display wordmark. So
 * "HOUSE OF B'WEARS" locks up as HOUSE OF / B❖WEARS, and any apostrophe in
 * the wordmark is replaced by a gold lozenge (B'WEARS → B❖WEARS).
 *
 * The name stays editable from Store Settings — the lockup derives from it.
 */

type Tone = "on-light" | "on-dark";
type Size = "sm" | "lg";

const SIZE = {
  sm: { badge: "h-10 w-10", eyebrow: "text-[9px]", word: "text-[21px] sm:text-[23px]", gap: "gap-2.5" },
  lg: { badge: "h-14 w-14 sm:h-16 sm:w-16", eyebrow: "text-[11px]", word: "text-[34px] sm:text-[40px]", gap: "gap-4" },
};

export function BrandBadge({ size = "sm", className = "" }: { size?: Size; className?: string }) {
  const gid = useId().replace(/:/g, "");
  const green = `hb-g-${gid}`;
  const gold = `hb-a-${gid}`;
  const s = SIZE[size];

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="HOUSE OF B'WEARS"
      className={`${s.badge} shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={green} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b3d24" />
          <stop offset="1" stopColor="#04261a" />
        </linearGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe886" />
          <stop offset="0.55" stopColor="#ffc90f" />
          <stop offset="1" stopColor="#d69700" />
        </linearGradient>
      </defs>
      {/* House / boutique doorway */}
      <path
        d="M24 4.2 L43.2 19.2 V38.8 A4.4 4.4 0 0 1 38.8 43.2 H9.2 A4.4 4.4 0 0 1 4.8 38.8 V19.2 Z"
        fill={`url(#${green})`}
        stroke={`url(#${gold})`}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Clothes hanger hanging from the ridge */}
      <g stroke={`url(#${gold})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="12.6" r="2.4" strokeWidth="1.9" />
        <path d="M24 15 V23.6" strokeWidth="2.1" />
        <path d="M24 23.6 L9.4 35.6 H38.6 Z" strokeWidth="2.6" />
      </g>
    </svg>
  );
}

/** The gold lozenge that replaces the apostrophe in B'WEARS. */
function Lozenge({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden className={`inline-block h-[0.42em] w-[0.42em] -translate-y-[0.36em] ${className}`}>
      <polygon points="5,0 10,5 5,10 0,5" fill="currentColor" />
    </svg>
  );
}

function splitName(name: string): { eyebrow: string; word: string } {
  const clean = name.trim() || "HOUSE OF B'WEARS";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return { eyebrow: "", word: parts[0] };
  return { eyebrow: parts.slice(0, -1).join(" "), word: parts[parts.length - 1] };
}

/** Renders a word with gold lozenges in place of apostrophes. */
function WordWithLozenge({ word, className, accentClass }: { word: string; className: string; accentClass: string }) {
  const pieces = word.split(/(['’])/);
  return (
    <span className={className}>
      {pieces.map((p, i) =>
        p === "'" || p === "’" ? (
          <Lozenge key={i} className={accentClass} />
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

export function BrandMark({
  name,
  size = "sm",
  tone = "on-light",
  showBadge = true,
  className = "",
}: {
  name: string;
  size?: Size;
  tone?: Tone;
  showBadge?: boolean;
  className?: string;
}) {
  const s = SIZE[size];
  const { eyebrow, word } = splitName(name);
  const dark = tone === "on-dark";
  const wordClass = dark ? "text-white" : "text-brand-950";
  const eyebrowClass = dark ? "text-accent-300" : "text-brand-700";
  const ruleClass = dark ? "bg-accent-300/50" : "bg-brand-500/40";
  const accentClass = dark ? "text-accent-400" : "text-accent-500";

  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`} aria-label={name}>
      {showBadge && <BrandBadge size={size} />}
      <span className="flex min-w-0 flex-col leading-none">
        {eyebrow && (
          <span className="flex items-center gap-2">
            <span className={`h-px w-4 ${ruleClass} sm:w-6`} />
            <span className={`font-semibold uppercase tracking-[0.45em] ${s.eyebrow} ${eyebrowClass}`}>{eyebrow}</span>
            <span className={`h-px w-4 ${ruleClass} sm:w-6`} />
          </span>
        )}
        <WordWithLozenge
          word={word}
          className={`font-display block font-bold tracking-tight ${s.word} ${wordClass}`}
          accentClass={accentClass}
        />
      </span>
    </span>
  );
}
