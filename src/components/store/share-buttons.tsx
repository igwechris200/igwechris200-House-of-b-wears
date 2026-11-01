"use client";

import { useEffect, useState } from "react";
import { Share2, Link2, Check, X, Mail } from "lucide-react";
import { WhatsAppIcon, FacebookIcon, XIcon, TelegramIcon, InstagramIcon } from "@/components/icons";

type Props = {
  title: string;
  text: string;
  path: string; // relative path, e.g. /product/slug
  image?: string;
  variant?: "button" | "icon" | "link";
  label?: string;
};

export function ShareButton({ title, text, path, image, variant = "button", label = "Share" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  const fullText = `${text}\n${url}`;

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        // Try to include the image where supported
        let files: File[] | undefined;
        if (image && navigator.canShare) {
          try {
            const blob = await fetch(image).then((r) => r.blob());
            const file = new File([blob], "product.jpg", { type: blob.type || "image/jpeg" });
            if (navigator.canShare({ files: [file] })) files = [file];
          } catch {}
        }
        await navigator.share({ title, text, url, ...(files ? { files } : {}) });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const links = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(fullText)}`,
      icon: <WhatsAppIcon className="h-5 w-5" />,
      color: "bg-[#25D366]",
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
      icon: <FacebookIcon className="h-5 w-5" />,
      color: "bg-[#1877F2]",
    },
    {
      name: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      icon: <TelegramIcon className="h-5 w-5" />,
      color: "bg-[#229ED9]",
    },
    {
      name: "X / Twitter",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      icon: <XIcon className="h-5 w-5" />,
      color: "bg-black",
    },
    {
      name: "Email",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(fullText)}`,
      icon: <Mail className="h-5 w-5" />,
      color: "bg-neutral-600",
    },
  ];

  const trigger =
    variant === "icon" ? (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-neutral-200 bg-white p-2.5 text-neutral-700 transition hover:border-brand-500 hover:text-brand-600"
        aria-label="Share"
      >
        <Share2 className="h-4 w-4" />
      </button>
    ) : variant === "link" ? (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 text-sm font-medium text-brand-300 transition hover:text-white">
        <Share2 className="h-4 w-4" /> {label}
      </button>
    ) : (
      <button onClick={() => setOpen(true)} className="btn-outline">
        <Share2 className="h-4 w-4" /> {label}
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            className="animate-fade-up w-full max-w-md rounded-t-3xl bg-white p-6 text-black shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">Share</p>
                <h3 className="mt-1 font-serif text-xl">{title}</h3>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-neutral-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {image && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-neutral-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <p className="line-clamp-2 text-sm text-neutral-600">{text}</p>
              </div>
            )}
            <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {links.map((l) => (
                <a
                  key={l.name}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center gap-2 text-center text-[11px] font-medium text-neutral-600"
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition hover:scale-105 ${l.color}`}>{l.icon}</span>
                  {l.name}
                </a>
              ))}
              <button
                onClick={async () => {
                  const ok = await nativeShare();
                  if (!ok) copy();
                }}
                className="flex flex-col items-center gap-2 text-center text-[11px] font-medium text-neutral-600"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white transition hover:scale-105">
                  <InstagramIcon className="h-5 w-5" />
                </span>
                Instagram
              </button>
              <button
                onClick={async () => {
                  const ok = await nativeShare();
                  if (!ok) copy();
                }}
                className="flex flex-col items-center gap-2 text-center text-[11px] font-medium text-neutral-600"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-black transition hover:scale-105">
                  <Share2 className="h-5 w-5" />
                </span>
                More
              </button>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-neutral-200 p-2">
              <Link2 className="ml-2 h-4 w-4 shrink-0 text-neutral-400" />
              <input readOnly value={url} className="min-w-0 flex-1 bg-transparent text-xs text-neutral-600 outline-none" />
              <button onClick={copy} className="rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-500 hover:text-black">
                {copied ? <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Copied</span> : "Copy"}
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-neutral-400">
              Instagram doesn&apos;t support direct web sharing — use the native share sheet on mobile or paste the copied link in your story or bio.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export function ShareStoreButton({ storeName }: { storeName: string }) {
  return (
    <ShareButton
      title={storeName}
      text={`Check out ${storeName} — premium men's fashion delivered across Nigeria.`}
      path="/"
      image="/images/hero.jpg"
      variant="link"
      label="Share this store"
    />
  );
}
