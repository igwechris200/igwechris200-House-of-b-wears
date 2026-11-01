import "server-only";

const BASE = "https://api.paystack.co";

export function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

export type PaystackInitResult =
  | { ok: true; authorizationUrl: string; accessCode: string; reference: string }
  | { ok: false; error: string };

export async function initializeTransaction(params: {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitResult> {
  if (!paystackConfigured()) {
    return { ok: false, error: "Paystack is not configured. Add PAYSTACK_SECRET_KEY to your environment." };
  }
  try {
    const res = await fetch(`${BASE}/transaction/initialize`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amountNaira * 100), // kobo
        reference: params.reference,
        currency: "NGN",
        callback_url: params.callbackUrl,
        channels: ["card", "bank", "bank_transfer", "ussd", "qr"],
        metadata: params.metadata,
      }),
      cache: "no-store",
    });
    const json = await res.json();
    if (!json.status) {
      return { ok: false, error: json.message || "Could not initialize payment" };
    }
    return {
      ok: true,
      authorizationUrl: json.data.authorization_url,
      accessCode: json.data.access_code,
      reference: json.data.reference,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export type PaystackVerifyResult =
  | {
      ok: true;
      status: "success" | "failed" | "abandoned" | string;
      amountNaira: number;
      channel: string | null;
      gatewayResponse: string | null;
      paidAt: Date | null;
      reference: string;
    }
  | { ok: false; error: string };

export async function verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
  if (!paystackConfigured()) {
    return { ok: false, error: "Paystack is not configured" };
  }
  try {
    const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: headers(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!json.status) {
      return { ok: false, error: json.message || "Verification failed" };
    }
    const d = json.data;
    return {
      ok: true,
      status: d.status,
      amountNaira: Number(d.amount) / 100,
      channel: d.channel ?? null,
      gatewayResponse: d.gateway_response ?? null,
      paidAt: d.paid_at ? new Date(d.paid_at) : null,
      reference: d.reference,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
