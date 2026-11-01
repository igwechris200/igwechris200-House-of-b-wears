import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getCheckoutConfig } from "./actions";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [user, config] = await Promise.all([getCurrentUser(), getCheckoutConfig()]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl sm:text-4xl">Checkout</h1>
      <CheckoutForm
        user={user ? { name: user.name, email: user.email, phone: user.phone ?? "", address: user.address ?? "", city: user.city ?? "", state: user.state ?? "" } : null}
        config={config}
      />
    </div>
  );
}
