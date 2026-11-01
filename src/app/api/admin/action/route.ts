import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes, notifications, users } from "@/db/schema";
import { getAdminUser, hashPassword, verifyPassword } from "@/lib/auth";
import { saveSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { parseList } from "@/lib/utils";
import * as svc from "@/lib/admin-service";

export const dynamic = "force-dynamic";

const NUMERIC_SETTINGS = [
  "delivery_fee_lagos",
  "delivery_fee_other",
  "free_delivery_threshold",
  "low_stock_threshold",
];

function parseProductForm(fd: FormData): svc.ProductInput {
  const discountRaw = String(fd.get("discountPrice") ?? "").trim();
  const categoryRaw = String(fd.get("categoryId") ?? "").trim();
  return {
    name: String(fd.get("name") ?? ""),
    description: String(fd.get("description") ?? ""),
    price: Number(fd.get("price")),
    discountPrice: discountRaw === "" ? null : Number(discountRaw),
    categoryId: categoryRaw === "" ? null : Number(categoryRaw),
    images: parseList(String(fd.get("images") ?? "")),
    sizes: parseList(String(fd.get("sizes") ?? "")),
    colors: parseList(String(fd.get("colors") ?? "")),
    stock: Number(fd.get("stock") ?? 0),
    featured: fd.get("featured") === "on" || fd.get("featured") === "true",
    bestSeller: fd.get("bestSeller") === "on" || fd.get("bestSeller") === "true",
    isNewArrival: fd.get("isNewArrival") === "on" || fd.get("isNewArrival") === "true",
    active: fd.get("active") === "on" || fd.get("active") === "true",
  };
}

function htmlRedirect(url: string) {
  const safe = JSON.stringify(url);
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${url}"><script>window.location.replace(${safe});</script></head><body>Redirecting…</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

function safeBackUrl(req: Request, fd: FormData): string {
  const returnTo = String(fd.get("returnTo") || "").trim();
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      return `${u.pathname}${u.search}`;
    } catch {}
  }
  return "/admin";
}

export async function POST(req: Request) {
  const wantsJson = (req.headers.get("accept") || "").includes("application/json");
  const admin = await getAdminUser();
  if (!admin || admin.role !== "admin") {
    if (wantsJson) return Response.json({ ok: false, error: "Unauthorized — please sign in as admin." }, { status: 401 });
    return htmlRedirect("/admin/login");
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return Response.json({ ok: false, error: "Invalid form data" }, { status: 400 });
  }

  const intent = String(fd.get("intent") || "").trim();
  const backUrl = safeBackUrl(req, fd);

  const respond = (result: { ok: boolean; message?: string; error?: string; redirectTo?: string }, status = 200) => {
    try {
      revalidatePath("/", "layout");
      revalidatePath("/admin", "layout");
    } catch {}
    if (wantsJson) {
      return Response.json(result, { status: result.ok ? status : status === 200 ? 400 : status });
    }
    if (result.redirectTo) {
      return htmlRedirect(result.redirectTo);
    }
    const u = new URL(backUrl, "http://localhost");
    if (result.ok && result.message) u.searchParams.set("notice", result.message);
    if (!result.ok && result.error) u.searchParams.set("error", result.error);
    return htmlRedirect(`${u.pathname}${u.search}`);
  };

  try {
    switch (intent) {
      case "createProduct": {
        const res = await svc.createProduct(parseProductForm(fd));
        if (!res.ok) return respond({ ok: false, error: res.error });
        return respond({ ok: true, message: res.message, redirectTo: `/admin/products?created=${res.id}` });
      }
      case "updateProduct": {
        const res = await svc.updateProduct(Number(fd.get("id")), parseProductForm(fd));
        if (!res.ok) return respond({ ok: false, error: res.error });
        return respond({ ok: true, message: res.message });
      }
      case "deleteProduct": {
        const res = await svc.deleteProduct(Number(fd.get("id")));
        if (!res.ok) return respond({ ok: false, error: res.error });
        return respond({
          ok: true,
          message: res.message,
          redirectTo: `/admin/products?notice=${encodeURIComponent(res.message)}`,
        });
      }
      case "toggleProductFlag": {
        const res = await svc.setProductFlag(
          Number(fd.get("id")),
          String(fd.get("field")),
          fd.get("value") === "true",
        );
        if (!res.ok) return respond({ ok: false, error: res.error });
        return respond({ ok: true, message: res.message });
      }
      case "setStock": {
        const res = await svc.setProductStock(Number(fd.get("id")), Number(fd.get("value")));
        if (!res.ok) return respond({ ok: false, error: res.error });
        return respond({ ok: true, message: res.message });
      }
      case "saveCategory": {
        const idRaw = String(fd.get("id") ?? "").trim();
        const image = String(fd.get("image") ?? "").trim();
        const res = await svc.saveCategory({
          id: idRaw ? Number(idRaw) : undefined,
          name: String(fd.get("name") ?? ""),
          description: String(fd.get("description") ?? ""),
          image: image || null,
          sortOrder: Number(fd.get("sortOrder") ?? 0),
          active: fd.get("active") === "on" || fd.get("active") === "true",
        });
        if (!res.ok) return respond({ ok: false, error: res.error });
        return respond({ ok: true, message: res.message });
      }
      case "deleteCategory": {
        const res = await svc.deleteCategory(Number(fd.get("id")));
        if (!res.ok) return respond({ ok: false, error: res.error });
        return respond({ ok: true, message: res.message });
      }
      case "toggleCategory": {
        const res = await svc.setCategoryActive(Number(fd.get("id")), fd.get("value") === "true");
        if (!res.ok) return respond({ ok: false, error: res.error });
        return respond({ ok: true, message: res.message });
      }
      case "updateOrderStatus": {
        const res = await svc.updateOrderStatus(Number(fd.get("id")), String(fd.get("status")), admin.email);
        if (!res.ok) return respond({ ok: false, error: res.error });
        return respond({ ok: true, message: res.message });
      }
      case "reviewBankTransfer": {
        const decision = fd.get("decision") === "reject" ? "reject" : "approve";
        const res = await svc.reviewBankTransfer(String(fd.get("reference")), decision, admin.email);
        if (!res.ok) return respond({ ok: false, error: res.error });
        return respond({ ok: true, message: res.message });
      }
      case "syncPaystack": {
        const res = await svc.syncPaystackPayment(String(fd.get("reference")), admin.email);
        if (!res.ok) return respond({ ok: false, error: res.error });
        return respond({ ok: true, message: res.message });
      }
      case "saveDiscount": {
        const code = String(fd.get("code") || "").trim().toUpperCase();
        const type = String(fd.get("type")) === "fixed" ? "fixed" : "percent";
        const value = Number(fd.get("value"));
        if (!code || !Number.isFinite(value) || value <= 0) {
          return respond({ ok: false, error: "Enter a code and a valid value" });
        }
        if (type === "percent" && value > 100) {
          return respond({ ok: false, error: "Percentage cannot exceed 100" });
        }
        const minOrder = Number(fd.get("minOrder")) || 0;
        const usageLimit = fd.get("usageLimit") ? Number(fd.get("usageLimit")) : null;
        const expiresAt = fd.get("expiresAt") ? new Date(String(fd.get("expiresAt"))) : null;
        await db
          .insert(discountCodes)
          .values({ code, type, value, minOrder, usageLimit, expiresAt })
          .onConflictDoUpdate({
            target: discountCodes.code,
            set: { type, value, minOrder, usageLimit, expiresAt, active: true },
          });
        return respond({ ok: true, message: `Code ${code} saved` });
      }
      case "toggleDiscount": {
        await db
          .update(discountCodes)
          .set({ active: sql`not ${discountCodes.active}` })
          .where(eq(discountCodes.id, Number(fd.get("id"))));
        return respond({ ok: true, message: "Discount code updated" });
      }
      case "deleteDiscount": {
        await db.delete(discountCodes).where(eq(discountCodes.id, Number(fd.get("id"))));
        return respond({ ok: true, message: "Discount code deleted" });
      }
      case "saveSettings": {
        const values: Record<string, string> = {};
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
          if (key === "paystack_enabled" || key === "bank_transfer_enabled") {
            values[key] = fd.get(key) === "on" || fd.get(key) === "true" ? "true" : "false";
            continue;
          }
          const v = fd.get(key);
          if (v != null) values[key] = String(v).trim();
        }
        if (!values.store_name) return respond({ ok: false, error: "Business name is required" });
        for (const k of NUMERIC_SETTINGS) {
          const n = Number(values[k] ?? 0);
          if (!Number.isFinite(n) || n < 0) {
            return respond({ ok: false, error: `${k.replace(/_/g, " ")} must be a positive number` });
          }
        }
        await saveSettings(values);
        return respond({ ok: true, message: "Settings saved — changes are live on your store" });
      }
      case "changeAdminPassword": {
        const current = String(fd.get("current") ?? "");
        const next = String(fd.get("next") ?? "");
        const confirm = String(fd.get("confirm") ?? "");
        if (next.length < 10) return respond({ ok: false, error: "The new password must be at least 10 characters" });
        if (next !== confirm) return respond({ ok: false, error: "The new passwords do not match" });
        const [row] = await db.select().from(users).where(eq(users.id, admin.id)).limit(1);
        if (!row || !verifyPassword(current, row.passwordHash)) {
          return respond({ ok: false, error: "Your current password is incorrect" });
        }
        await db.update(users).set({ passwordHash: hashPassword(next) }).where(eq(users.id, admin.id));
        return respond({ ok: true, message: "Password changed. Use the new password next time you sign in." });
      }
      case "markNotificationsRead": {
        await db.update(notifications).set({ read: true }).where(eq(notifications.read, false));
        return respond({ ok: true, message: "Notifications marked read" });
      }
      default:
        return respond({ ok: false, error: `Unknown admin action: ${intent}` });
    }
  } catch (e) {
    return respond({ ok: false, error: e instanceof Error ? e.message : "Action failed" }, 500);
  }
}
