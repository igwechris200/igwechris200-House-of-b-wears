import { getAdminUser } from "@/lib/auth";
import { saveImage, supabaseStorageEnabled } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Admin-only image upload for product and category photos.
 * Stores in Supabase Storage when configured, otherwise on local disk.
 */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Unauthorized — please sign in as admin." }, { status: 401 });
  }

  let files: File[];
  try {
    const form = await req.formData();
    files = form.getAll("files").filter((f): f is File => f instanceof File);
  } catch {
    return Response.json({ error: "Could not read the upload." }, { status: 400 });
  }

  if (!files.length) return Response.json({ error: "No files were selected." }, { status: 400 });
  if (files.length > 10) return Response.json({ error: "Please upload at most 10 images at a time." }, { status: 400 });

  const urls: string[] = [];
  for (const file of files) {
    const result = await saveImage(file);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    urls.push(result.url);
  }

  return Response.json({
    urls,
    backend: supabaseStorageEnabled() ? "supabase" : "local",
  });
}
