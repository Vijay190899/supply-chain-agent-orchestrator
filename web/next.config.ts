import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone/server.js) so the
  // container image stays small. Required for the Cloud Run deploy.
  output: "standalone",
};

export default nextConfig;
