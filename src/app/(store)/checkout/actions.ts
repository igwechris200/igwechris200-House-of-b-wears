"use server";

import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { createOrder, validateDiscount, markPaymentFailed, ensureBankTransferPayment, type CheckoutInput } from "@/lib/orders";
import { initializeTransaction, paystackConfigured } from "@/lib/paystack";
import { getSettings, deliveryFeeFor } from "@/lib/settings";

export async function getCheckoutConfig() {
  const s = await getSettings();
  return {
    paystackEnabled: s.paystack_enabled === "true" && paystackConfigured(),
    paystackConfigured: paystackConfigured(),
    bankTransferEnabled: s.bank_transfer_enabled === "true",
    feeLagos: Number(s.delivery_fee_lagos),
    feeOther: Number(s.delivery_fee_other),
    freeThreshold: Number(s.free_delivery_threshold),
  };
}

export async function quoteDelivery(state: string, subtotal: number) {
  const s = await getSettings();
  return deliveryFeeFor(s, state, subtotal);
}

export async function applyDiscount(code: string, subtotal: number) {
  return validateDiscount(code, subtotal);
}

export async function placeOrder(input: Omit<CheckoutInput, "userId">) {
  try {
    const user = await getCurrentUser();
    const order = await createOrder({ ...input, userId: user?.id ?? null });

    if (input.paymentMethod === "paystack") {
      const h = await headers();
      const proto = h.get("x-forwarded-proto") ?? "http";
      const host = h.get("x-forwarded-host") ?? h.get("host");
      const origin = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;
      const init = await initializeTransaction({
        email: order.customerEmail,
        amountNaira: order.total,
        reference: order.orderNumber,
        callbackUrl: `${origin}/checkout/verify?reference=${order.orderNumber}`,
        metadata: { order_number: order.orderNumber, customer_name: order.customerName, phone: order.customerPhone },
      });
      if (!init.ok) {
        // The Paystack attempt failed to start: record it, and offer bank transfer as a fallback
        await markPaymentFailed(order.orderNumber, init.error);
        await ensureBankTransferPayment(order.id);
        return { ok: true as const, orderNumber: order.orderNumber, redirect: `/order/${order.orderNumber}?paystack_error=${encodeURIComponent(init.error)}` };
      }
      return { ok: true as const, orderNumber: order.orderNumber, redirect: init.authorizationUrl };
    }

    await ensureBankTransferPayment(order.id);
    return { ok: true as const, orderNumber: order.orderNumber, redirect: `/order/${order.orderNumber}` };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Could not place order" };
  }
}
