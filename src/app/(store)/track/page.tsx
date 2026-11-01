import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata = { title: "Track your order" };

async function track(formData: FormData) {
  "use server";
  const ref = String(formData.get("ref") || "").trim().toUpperCase();
  const o = (await db.select({ n: orders.orderNumber }).from(orders).where(eq(orders.orderNumber, ref)).limit(1))[0];
  redirect(o ? `/order/${o.n}` : `/track?notfound=${encodeURIComponent(ref)}`);
}

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ notfound?: string }> }) {
  const { notfound } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="eyebrow">Order tracking</p>
      <h1 className="mt-2 font-serif text-3xl">Track your order</h1>
      <p className="mt-2 text-sm text-neutral-500">Enter the order number from your confirmation page (e.g. MF2604-AB12CD).</p>
      <form action={track} className="mt-8 flex gap-2">
        <input name="ref" required className="input uppercase" placeholder="MF2604-XXXXXX" />
        <button className="btn-primary !px-5"><Search className="h-4 w-4" /></button>
      </form>
      {notfound && <p className="mt-4 text-sm text-red-600">We couldn&apos;t find an order with number {notfound}.</p>}
    </div>
  );
}
