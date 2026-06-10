import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone only for Docker builds — Vercel injects VERCEL=1 so this is skipped on Vercel
  ...(process.env.VERCEL !== "1" && { output: "standalone" }),
};

export default nextConfig;
