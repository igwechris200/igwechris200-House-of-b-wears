import "server-only";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { cache } from "react";
import { ensureSeeded } from "@/lib/seed";

export const DEFAULT_SETTINGS: Record<string, string> = {
  store_name: "HOUSE OF B'WEARS",
  store_tagline: "Quality menswear for the modern Nigerian man.",
  store_description: "Premium jeans, senator wear, sneakers and everyday essentials, curated for the modern Nigerian gentleman and delivered nationwide.",
  logo_url: "",
  contact_email: "hello@noirgold.ng",
  contact_phone: "+234 801 234 5678",
  whatsapp_number: "2348012345678",
  address: "12 Admiralty Way, Lekki Phase 1, Lagos, Nigeria",
  instagram_url: "https://instagram.com",
  facebook_url: "https://facebook.com",
  twitter_url: "",
  tiktok_url: "",
  delivery_fee_lagos: "2500",
  delivery_fee_other: "5000",
  free_delivery_threshold: "150000",
  paystack_enabled: "true",
  bank_transfer_enabled: "true",
  bank_name: "GTBank",
  bank_account_name: "HOUSE OF B'WEARS",
  bank_account_number: "0123456789",
  announcement: "Free delivery on orders above ₦150,000 · Pay securely with Paystack",
  low_stock_threshold: "5",
};

export type StoreSettings = typeof DEFAULT_SETTINGS;

export const getSettings = cache(async (): Promise<StoreSettings> => {
  try {
    await ensureSeeded();
    const rows = await db.select().from(settings);
    const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const r of rows) merged[r.key] = r.value;
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
});

export async function saveSettings(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}

export function deliveryFeeFor(
  s: StoreSettings,
  state: string,
  subtotal: number,
): number {
  const threshold = Number(s.free_delivery_threshold || 0);
  if (threshold > 0 && subtotal >= threshold) return 0;
  const isLagos = state.toLowerCase().includes("lagos");
  return Number(isLagos ? s.delivery_fee_lagos : s.delivery_fee_other) || 0;
}
