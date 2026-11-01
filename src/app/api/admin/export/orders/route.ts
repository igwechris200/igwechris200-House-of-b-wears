import { NextRequest } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getAdminOrders } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Admin-only CSV export of orders (with product lines). */
export async function GET(req: NextRequest) {
  const user = await getAdminUser();
  if (!user || user.role !== "admin") return new Response("Unauthorized", { status: 401 });

  const status = req.nextUrl.searchParams.get("status") || undefined;
  const orders = await getAdminOrders({ status });

  const header = [
    "Order ID", "Date", "Customer", "Phone", "Email", "Products", "Sizes", "Colours", "Quantities",
    "Subtotal", "Discount", "Delivery", "Total", "Payment status", "Payment method", "Order status", "Address", "City", "State",
  ];
  const lines = [header.join(",")];
  for (const o of orders) {
    lines.push(
      [
        o.orderNumber,
        new Date(o.createdAt).toISOString(),
        o.customerName,
        o.customerPhone,
        o.customerEmail,
        o.items.map((i) => i.productName).join(" | "),
        o.items.map((i) => i.size ?? "").join(" | "),
        o.items.map((i) => i.color ?? "").join(" | "),
        o.items.map((i) => i.quantity).join(" | "),
        o.subtotal,
        o.discountAmount,
        o.deliveryFee,
        o.total,
        o.paymentStatus,
        o.paymentMethod,
        o.status,
        o.address,
        o.city,
        o.state,
      ]
        .map(esc)
        .join(","),
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
