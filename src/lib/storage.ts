import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

/**
 * Product image storage.
 *
 * Two backends, chosen automatically:
 *
 *   1. Supabase Storage (persistent) — used when SUPABASE_URL and
 *      SUPABASE_SERVICE_ROLE_KEY are both set. Images live in a bucket and are
 *      served from Supabase's CDN, so they survive redeploys.
 *
 *   2. Local disk (fallback) — used in development and when Supabase is not
 *      configured. Files are written to ./uploads and served from
 *      /api/uploads/<name>. WARNING: on a host with an ephemeral filesystem
 *      (Vercel, Heroku free tier) these are lost on redeploy, so configure
 *      Supabase Storage for production.
 *
 * The service role key is only ever read on the server and is never sent to
 * the browser.
 */

export const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, "") || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

/** True when Supabase Storage is configured and should be used. */
export function supabaseStorageEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

export type UploadResult =
  | { ok: true; url: string; backend: "supabase" | "local" }
  | { ok: false; error: string };

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MAX_BYTES = 6 * 1024 * 1024;

function extensionFor(type: string): string {
  if (type === "image/svg+xml") return "svg";
  if (type === "image/jpeg") return "jpg";
  return type.split("/")[1] || "jpg";
}

export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return `Unsupported file type: ${file.type || "unknown"}`;
  if (file.size > MAX_BYTES) return "Each image must be under 6MB";
  if (file.size === 0) return "That file appears to be empty";
  return null;
}

/**
 * Creates the storage bucket if it does not already exist.
 * Called once per upload attempt; a 409 (already exists) is treated as success.
 */
async function ensureBucket(): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      id: SUPABASE_STORAGE_BUCKET,
      name: SUPABASE_STORAGE_BUCKET,
      public: true,
    }),
    cache: "no-store",
  });
  if (res.ok) return null;
  // 409 = bucket already exists, which is the normal case after the first upload
  if (res.status === 409) return null;
  let detail = "";
  try {
    detail = (await res.json())?.message ?? "";
  } catch {}
  return `Could not prepare the Supabase storage bucket "${SUPABASE_STORAGE_BUCKET}" (${res.status}${detail ? `: ${detail}` : ""})`;
}

/** Uploads one image, returning its public URL. */
export async function saveImage(file: File): Promise<UploadResult> {
  const invalid = validateImage(file);
  if (invalid) return { ok: false, error: invalid };

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${extensionFor(file.type)}`;

  if (supabaseStorageEnabled()) {
    const bucketError = await ensureBucket();
    if (bucketError) return { ok: false, error: bucketError };

    const objectPath = `products/${name}`;
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${objectPath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "true",
        },
        body: new Uint8Array(buffer),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      let detail = "";
      try {
        detail = (await res.json())?.message ?? "";
      } catch {}
      return { ok: false, error: `Upload to Supabase Storage failed (${res.status}${detail ? `: ${detail}` : ""})` };
    }

    return {
      ok: true,
      backend: "supabase",
      url: `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${objectPath}`,
    };
  }

  // Local disk fallback (development, or a host with a persistent disk).
  // On a read-only/ephemeral filesystem this fails with a clear message rather
  // than a crash, telling the owner to configure Supabase Storage.
  if (process.env.VERCEL && !supabaseStorageEnabled()) {
    return {
      ok: false,
      error:
        "Image uploads need Supabase Storage on this host. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your environment variables, or paste an image URL instead of uploading.",
    };
  }

  try {
    const uploadDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, name), buffer);
  } catch (e) {
    return {
      ok: false,
      error: `Could not write to the server's disk (${e instanceof Error ? e.message : "unknown error"}). Configure Supabase Storage with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.` ,
    };
  }
  return { ok: true, backend: "local", url: `/api/uploads/${name}` };
}
