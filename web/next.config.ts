import type { NextConfig } from "next";

// Output mode is host-dependent:
//   NEXT_OUTPUT=standalone -> self-contained server bundle (Cloud Run container)
//   unset                  -> default SSR build (AWS Amplify, Vercel)
const output = process.env.NEXT_OUTPUT as NextConfig["output"] | undefined;

const nextConfig: NextConfig = {
  ...(output ? { output } : {}),
};

export default nextConfig;
