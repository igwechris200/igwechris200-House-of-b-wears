import { getSettings } from "@/lib/settings";
import { formatNaira } from "@/lib/utils";

export const metadata = { title: "Delivery & Returns" };

export default async function DeliveryPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="eyebrow">Help</p>
      <h1 className="mt-2 font-serif text-4xl">Delivery &amp; returns</h1>
      <div className="prose prose-neutral mt-8 max-w-none text-sm leading-relaxed text-neutral-700">
        <h2 className="font-serif text-2xl text-black">Delivery fees</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Within Lagos: <strong>{formatNaira(Number(s.delivery_fee_lagos))}</strong> (1–3 business days)</li>
          <li>Other states: <strong>{formatNaira(Number(s.delivery_fee_other))}</strong> (3–7 business days)</li>
          {Number(s.free_delivery_threshold) > 0 && <li>Free delivery on orders above <strong>{formatNaira(Number(s.free_delivery_threshold))}</strong></li>}
        </ul>
        <h2 className="mt-8 font-serif text-2xl text-black">Payments</h2>
        <p className="mt-3">We accept debit cards, bank transfers, USSD and QR via Paystack. Direct bank transfers are verified manually by our team before dispatch — please use your order number as narration.</p>
        <h2 className="mt-8 font-serif text-2xl text-black">Exchanges</h2>
        <p className="mt-3">Wrong size? Contact us on WhatsApp within 7 days of delivery to arrange an exchange. Items must be unworn with tags attached. Custom-made native wear is non-returnable.</p>
        <h2 className="mt-8 font-serif text-2xl text-black">Contact</h2>
        <p className="mt-3">{s.contact_phone} · {s.contact_email}<br />{s.address}</p>
      </div>
    </div>
  );
}
