import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, verifyPassword } from "@/lib/auth";

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

  let email = "";
  let password = "";
  let next = "";
  let adminOnly = false;

  try {
    if (isJson) {
      const body = await req.json();
      email = String(body.email || "").trim().toLowerCase();
      password = String(body.password || "");
      next = String(body.next || "");
      adminOnly = body.admin === true || body.admin === "1";
    } else {
      const fd = await req.formData();
      email = String(fd.get("email") || "").trim().toLowerCase();
      password = String(fd.get("password") || "");
      next = String(fd.get("next") || "");
      adminOnly = fd.get("admin") === "1";
    }
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const backUrl = adminOnly ? "/admin/login" : `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  try {
    const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!u || !verifyPassword(password, u.passwordHash)) {
      if (isJson) return Response.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
      return htmlRedirect(`${backUrl}${backUrl.includes("?") ? "&" : "?"}error=${encodeURIComponent("Invalid email or password.")}`);
    }
    if (adminOnly && u.role !== "admin") {
      const msg = "This account does not have administrator access.";
      if (isJson) return Response.json({ ok: false, error: msg }, { status: 403 });
      return htmlRedirect(`${backUrl}${backUrl.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
    }

    await createSession(u.id);
    const redirectTo =
      u.role === "admin"
        ? next && next.startsWith("/admin")
          ? safeNext(next, "/admin")
          : "/admin"
        : safeNext(next, "/account");

    if (isJson) {
      return Response.json({ ok: true, redirectTo, role: u.role });
    }
    return htmlRedirect(redirectTo);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not sign in.";
    if (isJson) return Response.json({ ok: false, error: msg }, { status: 500 });
    return htmlRedirect(`${backUrl}${backUrl.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
  }
}
