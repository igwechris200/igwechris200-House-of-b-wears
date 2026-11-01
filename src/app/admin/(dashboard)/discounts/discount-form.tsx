"use client";

import { useState } from "react";
import { postAdminAction } from "@/components/admin/admin-action-form";

export function DiscountForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(undefined);
    setSuccess(undefined);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await postAdminAction(fd);
    if (!res.ok) {
      setError(res.error);
      setPending(false);
      return;
    }
    setSuccess(res.message);
    window.location.reload();
  };

  return (
    <form action="/api/admin/action" method="POST" onSubmit={handleSubmit} className="card h-fit space-y-4 p-6">
      <input type="hidden" name="intent" value="saveDiscount" />
      <h2 className="font-serif text-xl">Create / update code</h2>
      <div>
        <label className="label">Code</label>
        <input name="code" required className="input uppercase" placeholder="SUMMER20" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select name="type" className="input">
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed (₦)</option>
          </select>
        </div>
        <div>
          <label className="label">Value</label>
          <input name="value" type="number" min={1} required className="input" placeholder="10" />
        </div>
      </div>
      <div>
        <label className="label">Minimum order (₦)</label>
        <input name="minOrder" type="number" min={0} className="input" placeholder="0" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Usage limit</label>
          <input name="usageLimit" type="number" min={1} className="input" placeholder="Unlimited" />
        </div>
        <div>
          <label className="label">Expires</label>
          <input name="expiresAt" type="date" className="input" />
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save code"}
      </button>
    </form>
  );
}
