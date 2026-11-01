"use client";

import { useState } from "react";
import { postAdminAction } from "./admin-action-form";
import { ORDER_STATUSES } from "@/lib/utils";

const LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function OrderStatusForm({ orderId, current, compact = false }: { orderId: number; current: string; compact?: boolean }) {
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
    <form action="/api/admin/action" method="POST" onSubmit={handleSubmit} className={compact ? "min-w-40" : "space-y-3"}>
      <input type="hidden" name="intent" value="updateOrderStatus" />
      <input type="hidden" name="id" value={orderId} />
      <div className="flex gap-2">
        <select name="status" defaultValue={current} className="input !py-2 text-xs" aria-label="Order status">
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{LABELS[s]}</option>
          ))}
        </select>
        <button type="submit" disabled={pending} className="shrink-0 rounded-full bg-brand-500 px-4 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">
          {pending ? "…" : "Update"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {success && <p className="mt-1.5 text-xs text-emerald-700">{success}</p>}
    </form>
  );
}
