import { createHmac, timingSafeEqual } from "crypto";
import { markPaymentSuccessful, markPaymentFailed } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * Paystack webhook. Configure in Paystack Dashboard → Settings → API Keys & Webhooks:
 *   https://<your-domain>/api/paystack/webhook
 * Paystack signs every event with HMAC SHA512 of the raw body using your secret key.
 */
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return new Response("Paystack not configured", { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  const data = event.data ?? {};
  const reference = String(data.reference ?? "");

  if (event.event === "charge.success" && reference) {
    await markPaymentSuccessful(reference, {
      verifiedBy: "paystack_webhook",
      channel: (data.channel as string) ?? null,
      gatewayResponse: (data.gateway_response as string) ?? null,
      paidAt: data.paid_at ? new Date(String(data.paid_at)) : new Date(),
      amountNaira: Number(data.amount ?? 0) / 100,
    });
  } else if ((event.event === "charge.failed" || event.event === "transfer.failed") && reference) {
    await markPaymentFailed(reference, (data.gateway_response as string) || event.event);
  }

  return new Response("ok", { status: 200 });
}
