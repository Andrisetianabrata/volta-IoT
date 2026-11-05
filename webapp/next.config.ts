import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /* Isolasi cache dev dari output build: dev -> .next-dev (via
     NEXT_DIST_DIR di script "dev"), build/start -> .next. Tanpa ini,
     bergantian build lalu dev memakai .next yang sama dan dev memakan
     sisa chunk produksi -> "Cannot find module './548.js'". */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  async redirects() {
    return [
      { source: "/dashboard/:path*", destination: "/dashboards/:path*", permanent: false },
      { source: "/provision", destination: "/devices", permanent: false },
    ];
  },
};

export default nextConfig;
