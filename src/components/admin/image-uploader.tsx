"use client";

import { useRef, useState } from "react";
import { Upload, X, Link2, GripVertical, Star } from "lucide-react";

export function ImageUploader({ name, initial = [], multiple = true, label = "Images" }: { name: string; initial?: string[]; multiple?: boolean; label?: string }) {
  const [images, setImages] = useState<string[]>(initial);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addUrls = (urls: string[]) => setImages((prev) => (multiple ? [...prev, ...urls] : urls.slice(0, 1)));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      addUrls(json.urls);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  };

  return (
    <div>
      <label className="label">{label}</label>
      <input type="hidden" name={name} value={images.join("\n")} />
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-6 text-center transition hover:border-brand-500 hover:bg-brand-50"
      >
        <Upload className="h-6 w-6 text-neutral-400" />
        <p className="mt-2 text-sm font-medium">{busy ? "Uploading…" : "Click or drag images here"}</p>
        <p className="text-xs text-neutral-500">JPG, PNG, WEBP up to 6MB{multiple ? " · multiple allowed" : ""}</p>
        <input ref={inputRef} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(e) => upload(e.target.files)} />
      </div>
      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} className="input !py-2 pl-9 text-xs" placeholder="…or paste an image URL" />
        </div>
        <button
          type="button"
          onClick={() => {
            if (url.trim()) {
              addUrls([url.trim()]);
              setUrl("");
            }
          }}
          className="btn-outline !px-4 !py-2 text-xs"
        >
          Add URL
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      {images.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {images.map((img, i) => (
            <li key={img + i} className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full object-cover" />
              {i === 0 && multiple && <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-black"><Star className="h-2.5 w-2.5" /> MAIN</span>}
              <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-red-600" aria-label="Remove"><X className="h-3 w-3" /></button>
              {multiple && (
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 opacity-0 transition group-hover:opacity-100">
                  <button type="button" onClick={() => move(i, i - 1)} className="rounded px-1.5 text-[10px] text-white hover:bg-white/20">←</button>
                  <GripVertical className="h-3 w-3 text-white/60" />
                  <button type="button" onClick={() => move(i, i + 1)} className="rounded px-1.5 text-[10px] text-white hover:bg-white/20">→</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
