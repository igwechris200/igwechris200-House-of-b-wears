import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MAX = 6 * 1024 * 1024;

/** Admin-only image upload. Files are stored in /uploads and served via /api/uploads/<name>. */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user || user.role !== "admin") return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Serverless hosts (Vercel) have a read-only disk that is wiped between requests,
  // so files can't be kept there. Until image storage (e.g. Supabase Storage) is set up,
  // tell the admin to paste an image link instead of failing with a server error.
  if (process.env.VERCEL) {
    return Response.json(
      { error: "Photo uploads aren't available on this host yet. Paste an image link in the box below instead." },
      { status: 501 },
    );
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return Response.json({ error: "No files" }, { status: 400 });

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch {
    return Response.json({ error: "This server can't store uploaded files. Paste an image link instead." }, { status: 501 });
  }
  const urls: string[] = [];
  for (const file of files) {
    if (!ALLOWED.includes(file.type)) return Response.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
    if (file.size > MAX) return Response.json({ error: "Each image must be under 6MB" }, { status: 400 });
    const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1].replace("jpeg", "jpg");
    const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
    urls.push(`/api/uploads/${name}`);
  }
  return Response.json({ urls });
}
