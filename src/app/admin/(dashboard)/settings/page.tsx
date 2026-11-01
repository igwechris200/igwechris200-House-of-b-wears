import { getSettings } from "@/lib/settings";
import { paystackConfigured } from "@/lib/paystack";
import { SettingsForm } from "./settings-form";
import { AdminPasswordForm } from "./password-form";

export const metadata = { title: "Store Settings" };

export default async function AdminSettingsPage() {
  const s = await getSettings();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Configuration</p>
        <h1 className="mt-1 font-serif text-3xl">Store settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Changes go live on the storefront as soon as you save.</p>
      </div>
      <SettingsForm settings={s} paystackConfigured={paystackConfigured()} hasPublicKey={Boolean(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY)} />
      <AdminPasswordForm />
    </div>
  );
}
