"use client";

import { useState } from "react";

export function Switch({
  name,
  label,
  hint,
  defaultChecked = false,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-3.5 transition hover:border-brand-300">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-neutral-900">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-neutral-500">{hint}</span>}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          onChange={(e) => {
            setOn(e.target.checked);
            onChange?.(e.target.checked);
          }}
          className="peer sr-only"
        />
        <span className={`absolute inset-0 rounded-full transition ${on ? "bg-brand-500" : "bg-neutral-300"}`} />
        <span className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? "translate-x-5" : ""}`} />
      </span>
    </label>
  );
}
