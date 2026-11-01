import { redirect } from "next/navigation";
import { verifyTransaction } from "@/lib/paystack";
import { markPaymentSuccessful, markPaymentFailed } from "@/lib/orders";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const sp = await searchParams;
  const reference = sp.reference || sp.trxref;
  if (!reference) redirect("/");

  const pay = (await db.select().from(payments).where(eq(payments.reference, reference)).limit(1))[0];
  if (!pay) redirect("/");

  const res = await verifyTransaction(reference);
  if (res.ok) {
    if (res.status === "success") {
      await markPaymentSuccessful(reference, { verifiedBy: "paystack_verify", channel: res.channel, gatewayResponse: res.gatewayResponse, paidAt: res.paidAt, amountNaira: res.amountNaira });
    } else if (res.status === "failed" || res.status === "abandoned") {
      await markPaymentFailed(reference, res.gatewayResponse || res.status);
    }
  }
  redirect(`/order/${reference}`);
}
