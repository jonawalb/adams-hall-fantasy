import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for GitHub Pages — no server, auth is Supabase client-side + RLS.
  output: "export",
  trailingSlash: true,
  // Set when serving from https://<user>.github.io/<repo>/ (unset once custom domain is live).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: { unoptimized: true },
};

export default nextConfig;
