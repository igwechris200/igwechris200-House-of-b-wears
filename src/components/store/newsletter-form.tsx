"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      setState("done");
      setMsg(json.message);
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (state === "done") {
    return (
      <div className="flex items-center gap-3 rounded-full border border-brand-500/40 bg-brand-500/10 px-5 py-4 text-sm text-brand-200">
        <Check className="h-5 w-5" /> {msg}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          className="flex-1 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-brand-500"
        />
        <button type="submit" disabled={state === "loading"} className="btn-gold">
          {state === "loading" ? "Subscribing…" : "Subscribe"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-xs text-red-400">{msg}</p>}
    </form>
  );
}
