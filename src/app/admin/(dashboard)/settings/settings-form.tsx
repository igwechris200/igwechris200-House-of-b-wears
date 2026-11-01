"use client";

import { useState } from "react";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Switch } from "@/components/admin/switch";
import { postAdminAction } from "@/components/admin/admin-action-form";

function Field({
  s,
  k,
  label,
  type = "text",
  placeholder,
  hint,
}: {
  s: Record<string, string>;
  k: string;
  label: string;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={k}>
        {label}
      </label>
      <input
        id={k}
        name={k}
        type={type}
        defaultValue={s[k]}
        className="input"
        placeholder={placeholder}
        min={type === "number" ? 0 : undefined}
      />
      {hint && <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="font-serif text-xl">{title}</h2>
        {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function SettingsForm({
  settings: s,
  paystackConfigured,
  hasPublicKey,
}: {
  settings: Record<string, string>;
  paystackConfigured: boolean;
  hasPublicKey: boolean;
}) {
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
    setPending(false);
  };

  return (
    <form action="/api/admin/action" method="POST" onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-2">
      <input type="hidden" name="intent" value="saveSettings" />
      <Section title="Business identity" subtitle="Shown in the header, footer and browser tab.">
        <Field s={s} k="store_name" label="Business name" />
        <Field s={s} k="store_tagline" label="Tagline" />
        <div>
          <label className="label" htmlFor="store_description">
            Store description
          </label>
          <textarea id="store_description" name="store_description" rows={3} defaultValue={s.store_description} className="input" />
        </div>
        <ImageUploader
          name="logo_url"
          initial={s.logo_url ? [s.logo_url] : []}
          multiple={false}
          label="Business logo (PNG or SVG with transparent background works best)"
        />
        <Field s={s} k="announcement" label="Announcement bar (leave empty to hide)" />
      </Section>

      <Section title="Contact & social media">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field s={s} k="contact_phone" label="Contact phone number" />
          <Field s={s} k="whatsapp_number" label="WhatsApp number" placeholder="2348012345678" hint="Country code first, no + or spaces." />
        </div>
        <Field s={s} k="contact_email" label="Business email" type="email" />
        <Field s={s} k="address" label="Business address" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field s={s} k="instagram_url" label="Instagram link" placeholder="https://instagram.com/yourstore" />
          <Field s={s} k="facebook_url" label="Facebook link" placeholder="https://facebook.com/yourstore" />
          <Field s={s} k="twitter_url" label="X (Twitter) link" />
          <Field s={s} k="tiktok_url" label="TikTok link" />
        </div>
      </Section>

      <Section title="Delivery fees" subtitle="Applied automatically at checkout based on the customer's state.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field s={s} k="delivery_fee_lagos" label="Lagos (₦)" type="number" />
          <Field s={s} k="delivery_fee_other" label="Other states (₦)" type="number" />
          <Field s={s} k="free_delivery_threshold" label="Free above (₦)" type="number" hint="Set 0 to turn off." />
        </div>
        <Field
          s={s}
          k="low_stock_threshold"
          label="Low-stock warning level (units)"
          type="number"
          hint="You get an alert when a product drops to this quantity or below."
        />
      </Section>

      <Section title="Payments" subtitle="Keys are never stored in the database. Set them on the server.">
        <Switch
          name="paystack_enabled"
          label="Paystack online payments"
          hint="Card, bank transfer, USSD and QR"
          defaultChecked={s.paystack_enabled === "true"}
        />
        <div className={`rounded-xl p-3.5 text-xs leading-relaxed ${paystackConfigured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {paystackConfigured ? (
            <>
              ✓ Paystack secret key detected{hasPublicKey ? " · public key set" : ""}. Webhook URL:{" "}
              <code className="rounded bg-white px-1">/api/paystack/webhook</code>
            </>
          ) : (
            <>
              <strong>Paystack keys are not set.</strong> Add <code className="rounded bg-white px-1">PAYSTACK_SECRET_KEY</code> to the server environment, then register{" "}
              <code className="rounded bg-white px-1">https://your-domain/api/paystack/webhook</code> in your Paystack dashboard.
            </>
          )}
        </div>
        <Switch
          name="bank_transfer_enabled"
          label="Direct bank transfer"
          hint="Customers transfer manually; you confirm in Payments"
          defaultChecked={s.bank_transfer_enabled === "true"}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field s={s} k="bank_name" label="Bank name" />
          <Field s={s} k="bank_account_name" label="Account name" />
          <Field s={s} k="bank_account_number" label="Account number" />
        </div>
      </Section>

      <div className="xl:col-span-2 sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save store settings"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-700">{success}</p>}
        <a href="/admin/discounts" className="ml-auto text-sm font-semibold text-brand-700 hover:underline">
          Manage discount codes →
        </a>
      </div>
    </form>
  );
}
