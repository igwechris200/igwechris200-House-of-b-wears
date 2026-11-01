import { db } from "@/db";
import { discountCodes } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatNaira, formatDate } from "@/lib/utils";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { DiscountForm } from "./discount-form";

export const metadata = { title: "Discount Codes" };
export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  const rows = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Marketing</p>
        <h1 className="mt-1 font-serif text-3xl">Discount codes</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-3 py-3">Value</th>
                  <th className="px-3 py-3">Min order</th>
                  <th className="px-3 py-3">Usage</th>
                  <th className="px-3 py-3">Expires</th>
                  <th className="px-3 py-3">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((d) => (
                  <tr key={d.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-mono font-semibold">{d.code}</td>
                    <td className="px-3 py-3">{d.type === "percent" ? `${d.value}% off` : `${formatNaira(d.value)} off`}</td>
                    <td className="px-3 py-3 text-neutral-600">{d.minOrder ? formatNaira(d.minOrder) : "—"}</td>
                    <td className="px-3 py-3 text-neutral-600">
                      {d.usedCount}
                      {d.usageLimit ? ` / ${d.usageLimit}` : ""}
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-500">{d.expiresAt ? formatDate(d.expiresAt) : "Never"}</td>
                    <td className="px-3 py-3">
                      <AdminActionForm intent="toggleDiscount">
                        <input type="hidden" name="id" value={d.id} />
                        <button
                          type="submit"
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                            d.active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-neutral-200 text-neutral-400"
                          }`}
                        >
                          {d.active ? "Active" : "Inactive"}
                        </button>
                      </AdminActionForm>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <AdminActionForm intent="deleteDiscount" confirmMessage={`Delete discount code ${d.code}?`}>
                        <input type="hidden" name="id" value={d.id} />
                        <button type="submit" className="text-xs text-red-600 hover:underline">
                          Delete
                        </button>
                      </AdminActionForm>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                      No discount codes yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <DiscountForm />
      </div>
    </div>
  );
}
