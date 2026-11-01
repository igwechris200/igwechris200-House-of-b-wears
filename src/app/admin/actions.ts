"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin, hashPassword, verifyPassword } from "@/lib/auth";
import { saveSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { parseList } from "@/lib/utils";
import * as svc from "@/lib/admin-service";
import { db } from "@/db";
import { discountCodes, notifications, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

/*
 * Every exported action below calls assertAdmin() first. Server actions are
 * reachable by POST, so the page-level guard alone is not enough.
 */

export type ActionState = { error?: string; success?: string } | undefined;

function refreshStore() {
  revalidatePath("/", "layout");
}

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
    featured: fd.get("featured") === "on",
    bestSeller: fd.get("bestSeller") === "on",
    isNewArrival: fd.get("isNewArrival") === "on",
    active: fd.get("active") === "on",
  };
}

/* ───────────── Products ───────────── */

export async function createProductAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const res = await svc.createProduct(parseProductForm(fd));
  if (!res.ok) return { error: res.error };
  refreshStore();
  redirect(`/admin/products?created=${res.id}`);
}

export async function updateProductAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const res = await svc.updateProduct(Number(fd.get("id")), parseProductForm(fd));
  if (!res.ok) return { error: res.error };
  refreshStore();
  return { success: res.message };
}

export async function deleteProductAction(fd: FormData) {
  await assertAdmin();
  const res = await svc.deleteProduct(Number(fd.get("id")));
  refreshStore();
  redirect(res.ok ? `/admin/products?notice=${encodeURIComponent(res.message)}` : `/admin/products?error=${encodeURIComponent(res.error)}`);
}

export async function toggleProductFlagAction(fd: FormData) {
  await assertAdmin();
  await svc.setProductFlag(Number(fd.get("id")), String(fd.get("field")), fd.get("value") === "true");
  refreshStore();
}

export async function setStockAction(fd: FormData) {
  await assertAdmin();
  await svc.setProductStock(Number(fd.get("id")), Number(fd.get("value")));
  refreshStore();
}

/* ───────────── Categories ───────────── */

export async function saveCategoryAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const idRaw = String(fd.get("id") ?? "");
  const image = String(fd.get("image") ?? "").trim();
  const res = await svc.saveCategory({
    id: idRaw ? Number(idRaw) : undefined,
    name: String(fd.get("name") ?? ""),
    description: String(fd.get("description") ?? ""),
    image: image || null,
    sortOrder: Number(fd.get("sortOrder") ?? 0),
    active: fd.get("active") === "on",
  });
  if (!res.ok) return { error: res.error };
  refreshStore();
  return { success: res.message };
}

export async function deleteCategoryAction(fd: FormData) {
  await assertAdmin();
  await svc.deleteCategory(Number(fd.get("id")));
  refreshStore();
}

export async function toggleCategoryAction(fd: FormData) {
  await assertAdmin();
  await svc.setCategoryActive(Number(fd.get("id")), fd.get("value") === "true");
  refreshStore();
}

/* ───────────── Orders ───────────── */

export async function updateOrderStatusAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const res = await svc.updateOrderStatus(Number(fd.get("id")), String(fd.get("status")), admin.email);
  refreshStore();
  return res.ok ? { success: res.message } : { error: res.error };
}

/* ───────────── Payments ───────────── */

export async function reviewBankTransferAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const decision = fd.get("decision") === "reject" ? "reject" : "approve";
  const res = await svc.reviewBankTransfer(String(fd.get("reference")), decision, admin.email);
  refreshStore();
  return res.ok ? { success: res.message } : { error: res.error };
}

export async function syncPaystackAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const res = await svc.syncPaystackPayment(String(fd.get("reference")), admin.email);
  refreshStore();
  return res.ok ? { success: res.message } : { error: res.error };
}

/* ───────────── Discount codes ───────────── */

export async function saveDiscountAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const code = String(fd.get("code") || "").trim().toUpperCase();
  const type = String(fd.get("type")) === "fixed" ? "fixed" : "percent";
  const value = Number(fd.get("value"));
  if (!code || !Number.isFinite(value) || value <= 0) return { error: "Enter a code and a valid value" };
  if (type === "percent" && value > 100) return { error: "Percentage cannot exceed 100" };
  const minOrder = Number(fd.get("minOrder")) || 0;
  const usageLimit = fd.get("usageLimit") ? Number(fd.get("usageLimit")) : null;
  const expiresAt = fd.get("expiresAt") ? new Date(String(fd.get("expiresAt"))) : null;
  await db
    .insert(discountCodes)
    .values({ code, type, value, minOrder, usageLimit, expiresAt })
    .onConflictDoUpdate({ target: discountCodes.code, set: { type, value, minOrder, usageLimit, expiresAt, active: true } });
  revalidatePath("/admin/discounts");
  return { success: `Code ${code} saved` };
}

export async function toggleDiscountAction(fd: FormData) {
  await assertAdmin();
  await db.update(discountCodes).set({ active: sql`not ${discountCodes.active}` }).where(eq(discountCodes.id, Number(fd.get("id"))));
  revalidatePath("/admin/discounts");
}

export async function deleteDiscountAction(fd: FormData) {
  await assertAdmin();
  await db.delete(discountCodes).where(eq(discountCodes.id, Number(fd.get("id"))));
  revalidatePath("/admin/discounts");
}

/* ───────────── Store settings ───────────── */

const NUMERIC_SETTINGS = ["delivery_fee_lagos", "delivery_fee_other", "free_delivery_threshold", "low_stock_threshold"];

export async function saveSettingsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const values: Record<string, string> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (key === "paystack_enabled" || key === "bank_transfer_enabled") {
      values[key] = fd.get(key) === "on" ? "true" : "false";
      continue;
    }
    const v = fd.get(key);
    if (v != null) values[key] = String(v).trim();
  }
  if (!values.store_name) return { error: "Business name is required" };
  for (const k of NUMERIC_SETTINGS) {
    const n = Number(values[k] ?? 0);
    if (!Number.isFinite(n) || n < 0) return { error: `${k.replace(/_/g, " ")} must be a positive number` };
  }
  await saveSettings(values);
  refreshStore();
  return { success: "Settings saved — changes are live on your store" };
}

/* ───────────── Admin account ───────────── */

export async function changeAdminPasswordAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (next.length < 10) return { error: "The new password must be at least 10 characters" };
  if (next !== confirm) return { error: "The new passwords do not match" };
  const [row] = await db.select().from(users).where(eq(users.id, admin.id)).limit(1);
  if (!row || !verifyPassword(current, row.passwordHash)) return { error: "Your current password is incorrect" };
  await db.update(users).set({ passwordHash: hashPassword(next) }).where(eq(users.id, admin.id));
  return { success: "Password changed. Use the new password next time you sign in." };
}

/* ───────────── Notifications ───────────── */

export async function markNotificationsReadAction() {
  await assertAdmin();
  await db.update(notifications).set({ read: true }).where(eq(notifications.read, false));
  revalidatePath("/admin", "layout");
}
