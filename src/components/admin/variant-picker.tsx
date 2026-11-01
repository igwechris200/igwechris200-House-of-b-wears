"use client";

import { useState } from "react";
import { X } from "lucide-react";

/**
 * Tap-to-select chips for sizes or colours, plus a box for anything not listed.
 * Writes a comma-separated hidden input so the server receives a simple list.
 */
export function VariantPicker({
  name,
  label,
  options,
  initial,
  swatches,
  placeholder,
  hint,
}: {
  name: string;
  label: string;
  options: string[];
  initial: string[];
  swatches?: Record<string, string>;
  placeholder: string;
  hint?: string;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [custom, setCustom] = useState("");

  const has = (list: string[], v: string) => list.some((x) => x.toLowerCase() === v.toLowerCase());
  const toggle = (v: string) =>
    setSelected((prev) => (has(prev, v) ? prev.filter((x) => x.toLowerCase() !== v.toLowerCase()) : [...prev, v]));
  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    setSelected((prev) => (has(prev, v) ? prev : [...prev, v]));
    setCustom("");
  };

  const extras = selected.filter((s) => !has(options, s));
  const all = [...options, ...extras];

  return (
    <div>
      <label className="label">{label}</label>
      <input type="hidden" name={name} value={selected.join(", ")} />
      <div className="flex flex-wrap gap-2">
        {all.map((v) => {
          const on = has(selected, v);
          const sw = swatches?.[v];
          return (
            <button
              type="button"
              key={v}
              onClick={() => toggle(v)}
              aria-pressed={on}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                on ? "border-black bg-black text-white" : "border-neutral-300 bg-white hover:border-black"
              }`}
            >
              {sw && <span className="h-3.5 w-3.5 rounded-full border border-black/20" style={{ background: sw }} />}
              {v}
              {on && extras.some((x) => x === v) && <X className="h-3 w-3 opacity-70" />}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          className="input !py-2 text-sm"
          placeholder={placeholder}
        />
        <button type="button" onClick={addCustom} className="btn-outline shrink-0 !px-4 !py-2 text-xs">
          Add
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-500">
        {selected.length ? `Selected: ${selected.join(", ")}` : "Nothing selected yet — shoppers will not see a choice."}
        {hint ? ` ${hint}` : ""}
      </p>
    </div>
  );
}
