import type { NextConfig } from "next";

process.env.__NEXT_PRIVATE_ORIGIN = "http://127.0.0.1:3000";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["*.e2b.app", "localhost:3000", "127.0.0.1:3000"],
    },
  },
};

export default nextConfig;
