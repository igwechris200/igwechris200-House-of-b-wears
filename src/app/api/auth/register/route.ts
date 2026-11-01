import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

function safeNext(n: unknown, fallback: string) {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

function htmlRedirect(url: string) {
  const safe = JSON.stringify(url);
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${url}"><script>window.location.replace(${safe});</script></head><body>Redirecting…</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isJson = ct.includes("application/json");

  let name = "";
  let email = "";
  let phone = "";
  let password = "";
  let next = "";

  try {
    if (isJson) {
      const body = await req.json();
      name = String(body.name || "").trim();
      email = String(body.email || "").trim().toLowerCase();
      phone = String(body.phone || "").trim();
      password = String(body.password || "");
      next = String(body.next || "");
    } else {
      const fd = await req.formData();
      name = String(fd.get("name") || "").trim();
      email = String(fd.get("email") || "").trim().toLowerCase();
      phone = String(fd.get("phone") || "").trim();
      password = String(fd.get("password") || "");
      next = String(fd.get("next") || "");
    }
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const backUrl = `/register${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  if (!name || !email || password.length < 6) {
    const msg = "Please fill all fields. Password must be at least 6 characters.";
    if (isJson) return Response.json({ ok: false, error: msg }, { status: 400 });
    return htmlRedirect(`${backUrl}${backUrl.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
  }

  try {
    const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (exists.length) {
      const msg = "An account with this email already exists. Please sign in.";
      if (isJson) return Response.json({ ok: false, error: msg }, { status: 409 });
      return htmlRedirect(`${backUrl}${backUrl.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
    }

    const [u] = await db
      .insert(users)
      .values({ name, email, phone, passwordHash: hashPassword(password), role: "customer" })
      .returning({ id: users.id });

    await createSession(u.id);
    const redirectTo = safeNext(next, "/account");

    if (isJson) {
      return Response.json({ ok: true, redirectTo });
    }
    return htmlRedirect(redirectTo);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create account.";
    if (isJson) return Response.json({ ok: false, error: msg }, { status: 500 });
    return htmlRedirect(`${backUrl}${backUrl.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
  }
}
