import type { NextConfig } from "next";

/**
 * __NEXT_PRIVATE_ORIGIN is the origin Next.js uses for internal server-side
 * fetches (for example, replaying a redirect issued by a Server Action).
 *
 * - Local development: nothing sets it, so default to loopback.
 * - Sandbox preview (E2B_SANDBOX): the public preview hostname can't be reached
 *   from inside the container, so always use loopback there.
 * - Vercel / any real production host: never override it. A localhost value
 *   would make production redirects fetch http://127.0.0.1:3000 instead of the real site.
 */
if (
  process.env.E2B_SANDBOX === "true" ||
  (!process.env.__NEXT_PRIVATE_ORIGIN && process.env.NODE_ENV !== "production")
) {
  process.env.__NEXT_PRIVATE_ORIGIN = "http://127.0.0.1:3000";
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow the Vercel deployment domain, the sandbox preview and local dev.
      allowedOrigins: ["*.vercel.app", "*.e2b.app", "localhost:3000", "127.0.0.1:3000"],
    },
  },
};

export default nextConfig;
