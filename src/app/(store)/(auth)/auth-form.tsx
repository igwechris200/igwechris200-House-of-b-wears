"use client";

import { useState } from "react";

export function AuthForm({
  mode,
  next,
  admin = false,
  initialError,
  defaultEmail = "",
  defaultPassword = "",
}: {
  mode: "login" | "register";
  next?: string;
  admin?: boolean;
  initialError?: string;
  defaultEmail?: string;
  defaultPassword?: string;
}) {
  const [error, setError] = useState<string | undefined>(initialError);
  const [pending, setPending] = useState(false);
  const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    fd.forEach((v, k) => {
      if (typeof v === "string") payload[k] = v;
    });

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Could not sign in. Please try again.");
        setPending(false);
        return;
      }
      window.location.assign(data.redirectTo || (admin ? "/admin" : "/account"));
    } catch {
      setError("Network error. Please check your connection and try again.");
      setPending(false);
    }
  };

  return (
    <form action={endpoint} method="POST" onSubmit={handleSubmit} className="mt-8 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {admin && <input type="hidden" name="admin" value="1" />}
      {mode === "register" && (
        <>
          <div>
            <label className="label">Full name</label>
            <input name="name" required className="input" placeholder="Tunde Bakare" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="phone" className="input" placeholder="0801 234 5678" />
          </div>
        </>
      )}
      <div>
        <label className="label">Email</label>
        <input
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          className="input"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <div>
        <label className="label">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          defaultValue={defaultPassword}
          className="input"
          placeholder="••••••••"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={pending} className={`${admin ? "btn-gold" : "btn-primary"} w-full !py-4`}>
        {pending ? "Signing in…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
