import { getSettings } from "@/lib/settings";
import { paystackConfigured } from "@/lib/paystack";
import { supabaseStorageEnabled, SUPABASE_STORAGE_BUCKET } from "@/lib/storage";
import { SettingsForm } from "./settings-form";
import { AdminPasswordForm } from "./password-form";
import { HardDrive, CheckCircle2 } from "lucide-react";

export const metadata = { title: "Store Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const s = await getSettings();
  const storageSupabase = supabaseStorageEnabled();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Configuration</p>
        <h1 className="mt-1 font-serif text-3xl">Store settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Changes go live on the storefront as soon as you save.</p>
      </div>

      {storageSupabase ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Supabase Storage is active</strong> — product photos are stored in the{" "}
            <code className="rounded bg-white px-1">{SUPABASE_STORAGE_BUCKET}</code> bucket and survive redeploys.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Product photos are stored on this server&apos;s disk</strong> and will be lost if the server is
            redeployed. Add <code className="rounded bg-white px-1">SUPABASE_URL</code> and{" "}
            <code className="rounded bg-white px-1">SUPABASE_SERVICE_ROLE_KEY</code> to your environment to store them
            permanently in Supabase Storage instead.
          </p>
        </div>
      )}

      <SettingsForm settings={s} paystackConfigured={paystackConfigured()} hasPublicKey={Boolean(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY)} />
      <AdminPasswordForm />
    </div>
  );
}
