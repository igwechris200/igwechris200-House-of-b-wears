import type { NextConfig } from "next";

// Sandbox preview only: route Next.js' internal server-to-server requests over
// loopback, because the preview's public hostname can't be reached from inside
// the container. Never set on Vercel or any real host.
if (process.env.E2B_SANDBOX === "true") {
  process.env.__NEXT_PRIVATE_ORIGIN = "http://127.0.0.1:3000";
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Same-origin requests are always allowed; these cover the sandbox preview and local dev.
      allowedOrigins: ["*.e2b.app", "localhost:3000", "127.0.0.1:3000"],
    },
  },
};

export default nextConfig;
