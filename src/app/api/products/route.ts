import { NextRequest } from "next/server";
import { getProductsByIds } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") || "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 100);
  const items = await getProductsByIds(ids);
  return Response.json({ items });
}
