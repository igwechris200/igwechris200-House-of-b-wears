"use client";

import { useState, useTransition } from "react";
import { Copy, Check, CreditCard, MessageCircle } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { submitTransferNote, retryPaystack } from "./actions";

export function BankTransferPanel(props: { orderNumber: string; amount: number; bankName: string; accountName: string; accountNumber: string; whatsapp: string; existingNote: string }) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(props.existingNote);
  const [saved, setSaved] = useState(Boolean(props.existingNote));
  const [pending, start] = useTransition();

  const copy = () => {
    navigator.clipboard.writeText(props.accountNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-2xl border border-brand-300 bg-brand-50 p-5">
      <h3 className="font-semibold">Pay by bank transfer</h3>
      <p className="mt-1 text-xs text-neutral-600">Transfer exactly <strong>{formatNaira(props.amount)}</strong> to the account below and use <strong>{props.orderNumber}</strong> as the narration.</p>
      <dl className="mt-4 grid gap-3 rounded-xl bg-white p-4 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-neutral-500">Bank</dt><dd className="font-semibold">{props.bankName}</dd></div>
        <div><dt className="text-xs text-neutral-500">Account name</dt><dd className="font-semibold">{props.accountName}</dd></div>
        <div>
          <dt className="text-xs text-neutral-500">Account number</dt>
          <dd className="flex items-center gap-2 font-mono text-base font-semibold">
            {props.accountNumber}
            <button onClick={copy} className="rounded-md p-1 hover:bg-neutral-100" aria-label="Copy">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button>
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        <label className="label">After paying, tell us (sender name / transfer reference)</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="e.g. Paid from GTB – Tunde Bakare, ref 00123" />
          <button
            disabled={pending || !note.trim()}
            onClick={() => start(async () => { await submitTransferNote(props.orderNumber, note); setSaved(true); })}
            className="btn-primary !py-3 sm:!px-5"
          >
            {pending ? "Saving…" : saved ? "Update" : "I have paid"}
          </button>
        </div>
        {saved && <p className="mt-2 text-xs text-emerald-700">Thanks! Our team will verify your transfer and confirm your order. Payment is only marked successful after manual verification.</p>}
      </div>
      <a href={props.whatsapp} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#1da851] hover:underline">
        <MessageCircle className="h-4 w-4" /> Send proof of payment on WhatsApp
      </a>
    </div>
  );
}

export function RetryPaystackButton({ orderNumber, amount }: { orderNumber: string; amount: number }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <div>
      <button
        disabled={pending}
        onClick={() => start(async () => {
          const r = await retryPaystack(orderNumber);
          if (r.ok) window.location.href = r.url;
          else setErr(r.error);
        })}
        className="btn-gold w-full !py-4"
      >
        <CreditCard className="h-4 w-4" /> {pending ? "Redirecting…" : `Pay ${formatNaira(amount)} online with Paystack`}
      </button>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}
