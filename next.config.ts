import type { NextConfig } from "next";

/**
 * __NEXT_PRIVATE_ORIGIN is the origin Next.js uses for internal server-side
 * fetches (for example, replaying a redirect issued by a Server Action).
 *
 * Locally nothing sets it, so default to loopback. On Vercel it is provided
 * automatically by the platform, and we must not override it — overriding it
 * here with a localhost URL would make production redirects fetch
 * http://127.0.0.1:3000 instead of the real site.
 */
if (!process.env.__NEXT_PRIVATE_ORIGIN && process.env.NODE_ENV !== "production") {
  process.env.__NEXT_PRIVATE_ORIGIN = "http://127.0.0.1:3000";
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow the Vercel deployment domain and preview URLs.
      allowedOrigins: ["*.vercel.app", "*.e2b.app", "localhost:3000", "127.0.0.1:3000"],
    },
  },
};

export default nextConfig;
