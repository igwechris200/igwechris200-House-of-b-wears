"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createSession, destroySession, hashPassword, verifyPassword, getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type AuthState = { error?: string } | undefined;

function safeNext(n: FormDataEntryValue | null, fallback: string) {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  if (!name || !email || password.length < 6) return { error: "Please fill all fields. Password must be at least 6 characters." };
  const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists.length) return { error: "An account with this email already exists. Please sign in." };
  const [u] = await db.insert(users).values({ name, email, phone, passwordHash: hashPassword(password), role: "customer" }).returning({ id: users.id });
  await createSession(u.id);
  redirect(safeNext(formData.get("next"), "/account"));
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const adminOnly = formData.get("admin") === "1";
  const u = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!u || !verifyPassword(password, u.passwordHash)) return { error: "Invalid email or password." };
  if (adminOnly && u.role !== "admin") return { error: "This account does not have administrator access." };
  await createSession(u.id);
  redirect(safeNext(formData.get("next"), u.role === "admin" ? "/admin" : "/account"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function updateProfileAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const password = String(formData.get("password") || "");
  if (!name) return { error: "Name is required" };
  await db.update(users).set({ name, phone, address, city, state, ...(password.length >= 6 ? { passwordHash: hashPassword(password) } : {}) }).where(eq(users.id, user.id));
  revalidatePath("/account");
  return { error: undefined };
}
