"use client";

import { useState } from "react";
import { postAdminAction } from "@/components/admin/admin-action-form";

export function AdminPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(undefined);
    setSuccess(undefined);
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await postAdminAction(fd);
    if (!res.ok) {
      setError(res.error);
      setPending(false);
      return;
    }
    setSuccess(res.message);
    form.reset();
    setPending(false);
  };

  return (
    <form action="/api/admin/action" method="POST" onSubmit={handleSubmit} className="card space-y-4 p-5 sm:p-6">
      <input type="hidden" name="intent" value="changeAdminPassword" />
      <div>
        <h2 className="font-serif text-xl">Admin password</h2>
        <p className="text-xs text-neutral-500">Use at least 10 characters. Change the default password before going live.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="current">
            Current password
          </label>
          <input id="current" name="current" type="password" required autoComplete="current-password" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="next">
            New password
          </label>
          <input id="next" name="next" type="password" required minLength={10} autoComplete="new-password" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">
            Confirm new password
          </label>
          <input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className="input" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}
      <button type="submit" disabled={pending} className="btn-outline">
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
