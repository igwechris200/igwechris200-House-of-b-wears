import "server-only";
import { cookies, headers } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { eq, and, gt, lt, desc } from "drizzle-orm";
import { db } from "@/db";
import { sessions, settings, users, type User } from "@/db/schema";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ensureSeeded } from "@/lib/seed";

process.env.__NEXT_PRIVATE_ORIGIN ??= "http://127.0.0.1:3000";

export const SESSION_COOKIE = "mf_session";
export const ADMIN_SESSION_COOKIE = "mf_admin_session";
const SESSION_DAYS = 30;

/**
 * Development-only escape hatch for cookie-less preview iframes.
 *
 * When false (the default), a request with no valid session cookie is treated
 * as signed out — which is correct for production. When explicitly set to "1",
 * the last active session is used as a fallback so the admin dashboard can be
 * previewed inside a cross-site iframe that blocks cookies.
 *
 * Never set this to 1 in production: it would let any visitor without a cookie
 * be treated as an administrator.
 */
const COOKIELESS_SESSION_FALLBACK = process.env.ALLOW_COOKIELESS_ADMIN === "1";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  return candidate.length === original.length && timingSafeEqual(candidate, original);
}

async function isHttpsRequest(): Promise<boolean> {
  try {
    const h = await headers();
    const origin = (h.get("origin") || h.get("referer") || "").toLowerCase();
    if (origin.startsWith("https://")) return true;
    const host = (h.get("x-forwarded-host") || h.get("host") || "").toLowerCase();
    if (host.endsWith(".e2b.app")) return true;
    const proto = (h.get("x-forwarded-proto") || "").toLowerCase();
    if (proto.includes("https")) return true;
    if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return false;
    return process.env.NODE_ENV === "production";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

export async function createSession(userId: number) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.insert(sessions).values({ id, userId, expiresAt });

  const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (u?.role === "admin") {
    await db
      .insert(settings)
      .values({ key: "admin_logged_out", value: "false" })
      .onConflictDoUpdate({ target: settings.key, set: { value: "false" } });
  }

  const cookieStore = await cookies();
  const https = await isHttpsRequest();
  const opts = {
    httpOnly: true,
    sameSite: (https ? "none" : "lax") as "none" | "lax",
    secure: https,
    ...(https ? ({ partitioned: true } as Record<string, unknown>) : {}),
    expires: expiresAt,
    path: "/",
  };
  cookieStore.set(SESSION_COOKIE, id, opts);
  if (u?.role === "admin") {
    cookieStore.set(ADMIN_SESSION_COOKIE, id, opts);
  }
  return { id, expiresAt };
}

export async function destroySession() {
  const cookieStore = await cookies();
  const id = cookieStore.get(SESSION_COOKIE)?.value;
  const adminId = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  if (adminId) await db.delete(sessions).where(eq(sessions.id, adminId));
  await db.delete(sessions);
  await db
    .insert(settings)
    .values({ key: "admin_logged_out", value: "true" })
    .onConflictDoUpdate({ target: settings.key, set: { value: "true" } });

  const https = await isHttpsRequest();
  const clearOpts = {
    httpOnly: true,
    sameSite: (https ? "none" : "lax") as "none" | "lax",
    secure: https,
    ...(https ? ({ partitioned: true } as Record<string, unknown>) : {}),
    expires: new Date(0),
    maxAge: 0,
    path: "/",
  };
  cookieStore.set(SESSION_COOKIE, "", clearOpts);
  cookieStore.set(ADMIN_SESSION_COOKIE, "", clearOpts);
}

export type SafeUser = Omit<User, "passwordHash">;

const userSelect = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  role: users.role,
  address: users.address,
  city: users.city,
  state: users.state,
  createdAt: users.createdAt,
};

export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  try {
    await ensureSeeded();
    const cookieStore = await cookies();
    const candidates = [
      cookieStore.get(SESSION_COOKIE)?.value,
      cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    ].filter((v): v is string => Boolean(v));

    for (const id of candidates) {
      const rows = await db
        .select(userSelect)
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
        .limit(1);
      if (rows[0]) return rows[0];
    }

    // Session-less fallback is a development aid for cross-site preview iframes
    // that block cookies. It must NEVER be enabled in production, because it
    // would let a visitor without a cookie be treated as the most recent user.
    if (COOKIELESS_SESSION_FALLBACK) {
      const fallbackRows = await db
        .select(userSelect)
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(gt(sessions.expiresAt, new Date()))
        .orderBy(desc(sessions.createdAt))
        .limit(1);
      return fallbackRows[0] ?? null;
    }
    return null;
  } catch {
    return null;
  }
});

export const getAdminUser = cache(async (): Promise<SafeUser | null> => {
  try {
    await ensureSeeded();
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

    // 1. Check dedicated admin cookie first
    if (adminCookie) {
      const rows = await db
        .select(userSelect)
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.id, adminCookie), eq(users.role, "admin"), gt(sessions.expiresAt, new Date())))
        .limit(1);
      if (rows[0]) return rows[0];
    }

    // 2. Check main session cookie if present in DB
    if (sessionCookie) {
      const rows = await db
        .select(userSelect)
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.id, sessionCookie), gt(sessions.expiresAt, new Date())))
        .limit(1);
      if (rows[0]) {
        return rows[0].role === "admin" ? rows[0] : null;
      }
    }

    // Steps 3 and 4 are development-only fallbacks for cross-site preview
    // iframes that block cookies. In production (fallback disabled) a request
    // without a valid admin session cookie is simply not an administrator.
    if (COOKIELESS_SESSION_FALLBACK) {
      // Reuse the most recent active admin session, if one exists
      const fallbackAdmin = await db
        .select(userSelect)
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(users.role, "admin"), gt(sessions.expiresAt, new Date())))
        .orderBy(desc(sessions.createdAt))
        .limit(1);
      if (fallbackAdmin[0]) return fallbackAdmin[0];

      // Otherwise create one, unless the admin has signed out on purpose
      const [loggedOutFlag] = await db
        .select()
        .from(settings)
        .where(eq(settings.key, "admin_logged_out"))
        .limit(1);
      if (loggedOutFlag?.value !== "true") {
        const [adminRow] = await db.select(userSelect).from(users).where(eq(users.role, "admin")).limit(1);
        if (adminRow) {
          const id = randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
          await db.insert(sessions).values({ id, userId: adminRow.id, expiresAt });
          return adminRow;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
});

export async function requireUser(next = "/account"): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<SafeUser> {
  const user = await getAdminUser();
  if (!user || user.role !== "admin") redirect("/admin/login");
  return user;
}

export async function assertAdmin(): Promise<SafeUser> {
  const user = await getAdminUser();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return user;
}
