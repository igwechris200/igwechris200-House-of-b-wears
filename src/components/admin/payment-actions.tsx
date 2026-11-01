"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, RefreshCw, Landmark } from "lucide-react";
import { postAdminAction } from "./admin-action-form";

/**
 * Admin controls for one payment attempt.
 * - Paystack: fetch the real status from Paystack's API (server-side) and record it.
 * - Bank transfer: a human confirms after checking the bank statement, or rejects.
 */
export function PaymentActions({
  reference,
  method,
  status,
  orderPaid,
  orderCancelled,
}: {
  reference: string;
  method: string;
  status: string;
  orderPaid: boolean;
  orderCancelled: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  if (status === "successful") return null;

  const runAction = async (intent: string, decision?: "approve" | "reject") => {
    setError(undefined);
    setSuccess(undefined);
    setPending(true);
    const fd = new FormData();
    fd.set("intent", intent);
    fd.set("reference", reference);
    if (decision) fd.set("decision", decision);
    const res = await postAdminAction(fd);
    if (!res.ok) {
      setError(res.error);
      setPending(false);
      return;
    }
    setSuccess(res.message);
    window.location.reload();
  };

  if (method === "paystack") {
    return (
      <div className="mt-3">
        <form
          action="/api/admin/action"
          method="POST"
          onSubmit={(e) => {
            e.preventDefault();
            runAction("syncPaystack");
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="intent" value="syncPaystack" />
          <input type="hidden" name="reference" value={reference} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-black px-3.5 py-1.5 text-xs font-semibold transition hover:bg-black hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />{" "}
            {pending ? "Checking Paystack…" : "Check with Paystack"}
          </button>
        </form>
        {success && <p className="mt-2 text-xs text-emerald-700">{success}</p>}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (method === "bank_transfer" && status === "pending") {
    return (
      <div className="mt-3 space-y-2">
        <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          <Landmark className="h-3 w-3" /> Only confirm after the money appears in your bank account.
        </p>
        <div className="flex flex-wrap gap-2">
          <form
            action="/api/admin/action"
            method="POST"
            onSubmit={(e) => {
              e.preventDefault();
              runAction("reviewBankTransfer", "approve");
            }}
          >
            <input type="hidden" name="intent" value="reviewBankTransfer" />
            <input type="hidden" name="reference" value={reference} />
            <input type="hidden" name="decision" value="approve" />
            <button
              type="submit"
              disabled={pending || orderPaid || orderCancelled}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirm payment received
            </button>
          </form>
          <form
            action="/api/admin/action"
            method="POST"
            onSubmit={(e) => {
              e.preventDefault();
              runAction("reviewBankTransfer", "reject");
            }}
          >
            <input type="hidden" name="intent" value="reviewBankTransfer" />
            <input type="hidden" name="reference" value={reference} />
            <input type="hidden" name="decision" value="reject" />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-600 hover:text-white disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
          </form>
        </div>
        {success && <p className="text-xs text-emerald-700">{success}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return null;
}
