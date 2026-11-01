import { destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function htmlRedirect(url: string) {
  const safe = JSON.stringify(url);
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${url}"><script>window.location.replace(${safe});</script></head><body>Signing out…</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  await destroySession();
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    return Response.json({ ok: true, redirectTo: "/" });
  }
  return htmlRedirect("/");
}

export async function GET() {
  await destroySession();
  return htmlRedirect("/");
}
